import { useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  Eye,
  Printer,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import FloatingActionMenu from "../components/FloatingActionMenu";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import "./Loans.css";

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;
const todayInput = () => new Date().toISOString().slice(0, 10);
const parseDateInput = (value) => (value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : null);

const getDateLabel = (value) => {
  const date = parseDateInput(value);
  return date
    ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "-";
};

const getShamsiLabel = (value) => {
  try {
    const date = parseDateInput(value);
    return date
      ? new Intl.DateTimeFormat("en-CA-u-ca-persian", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(date)
      : "";
  } catch {
    return value || "";
  }
};

const getLoanStatus = (loan) => {
  if (parseNumber(loan.balance) <= 0) return "paid";
  const date = parseDateInput(loan.date);
  if (!date) return "pending";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysOld = Math.floor((today - date) / 86400000);
  return daysOld > 30 ? "overdue" : "pending";
};

const getDateMatches = (dateValue, filter, customStartDate, customEndDate) => {
  if (filter === "all") return true;
  const date = parseDateInput(dateValue);
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysOld = Math.floor((today - date) / 86400000);
  const rangeStart = customStartDate ? new Date(`${customStartDate}T00:00:00`) : null;
  const rangeEnd = customEndDate ? new Date(`${customEndDate}T23:59:59`) : null;
  return (
    (filter === "today" && daysOld === 0) ||
    (filter === "weekly" && daysOld >= 0 && daysOld <= 7) ||
    (filter === "monthly" && daysOld >= 0 && daysOld <= 31) ||
    (filter === "annual" && daysOld >= 0 && daysOld <= 366) ||
    (filter === "custom" && (!rangeStart || date >= rangeStart) && (!rangeEnd || date <= rangeEnd))
  );
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function Loans() {
  const [sales, setSales] = useJsonCollection("billingInvoices");
  const [, setCustomers] = useJsonCollection("customers");
  const [settings] = useJsonCollection("settings");
  const [, setTransactions] = useJsonCollection("transactions");

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [viewLoan, setViewLoan] = useState(null);
  const [paymentLoan, setPaymentLoan] = useState(null);
  const [deleteLoan, setDeleteLoan] = useState(null);

  const loans = useMemo(
    () =>
      sales
        .map((sale) => {
          const total = parseNumber(sale.total);
          const paidAmount = parseNumber(sale.paidAmount);
          const balance = Math.max(0, parseNumber(sale.balance || total - paidAmount));
          return {
            ...sale,
            total,
            paidAmount,
            balance,
            status: getLoanStatus({ ...sale, balance }),
            currency: sale.currency || baseCurrency,
          };
        })
        .filter((sale) => sale.balance > 0 || sale.paymentStatus === "loan" || (sale.paymentHistory || []).length > 0),
    [baseCurrency, sales]
  );

  const filteredLoans = useMemo(
    () =>
      loans.filter((loan) => {
        const needle = search.trim().toLowerCase();
        const matchesSearch =
          !needle ||
          [loan.invoiceNumber, loan.customerName, loan.customerId].join(" ").toLowerCase().includes(needle);
        const matchesStatus = statusFilter === "all" || loan.status === statusFilter;
        const matchesDate = getDateMatches(loan.date, dateFilter, customStartDate, customEndDate);
        return matchesSearch && matchesStatus && matchesDate;
      }),
    [customEndDate, customStartDate, dateFilter, loans, search, statusFilter]
  );

  const pagination = useTablePagination(filteredLoans, `${search}-${statusFilter}-${dateFilter}-${customStartDate}-${customEndDate}`);

  const stats = useMemo(
    () => ({
      active: filteredLoans.reduce((sum, loan) => sum + parseNumber(loan.balance), 0),
      paid: filteredLoans.reduce((sum, loan) => sum + parseNumber(loan.paidAmount), 0),
      pending: filteredLoans.filter((loan) => loan.status === "pending").reduce((sum, loan) => sum + parseNumber(loan.balance), 0),
      overdue: filteredLoans.filter((loan) => loan.status === "overdue").length,
    }),
    [filteredLoans]
  );

  const adjustCustomerPending = async (loan, amount, removeSale = false) => {
    if (!loan.customerId) return;
    await setCustomers((current) =>
      current.map((customer) => {
        if (String(customer.id || customer.customerId) !== String(loan.customerId)) return customer;
        const pendingDelta = removeSale ? parseNumber(loan.balance) : parseNumber(amount);
        const purchasesDelta = removeSale ? parseNumber(loan.total) : 0;
        return {
          ...customer,
          purchases: roundMoney(Math.max(0, parseNumber(customer.purchases) - purchasesDelta)),
          pending: roundMoney(Math.max(0, parseNumber(customer.pending) - pendingDelta)),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const recordPayment = async (loan, amount, notes = "") => {
    const paymentAmount = Math.min(parseNumber(loan.balance), parseNumber(amount));
    if (paymentAmount <= 0) {
      notify("Please enter a valid payment amount.", "error");
      return;
    }

    const payment = {
      id: `loan-payment-${crypto.randomUUID()}`,
      amount: roundMoney(paymentAmount),
      currency: loan.currency,
      invoice: loan.invoiceNumber,
      notes: notes.trim(),
      date: todayInput(),
      createdAt: new Date().toISOString(),
    };

    const salesSaved = await setSales((current) =>
      current.map((sale) => {
        if (String(sale.id) !== String(loan.id)) return sale;
        const nextPaid = roundMoney(Math.min(parseNumber(sale.total), parseNumber(sale.paidAmount) + paymentAmount));
        const nextBalance = roundMoney(Math.max(0, parseNumber(sale.total) - nextPaid));
        return {
          ...sale,
          paidAmount: nextPaid,
          balance: nextBalance,
          paymentStatus: nextBalance <= 0 ? "paid" : "loan",
          paymentHistory: [...(sale.paymentHistory || []), payment],
          updatedAt: new Date().toISOString(),
        };
      })
    );
    if (!salesSaved) return;

    await setTransactions((current) => [
      {
        id: `loan-${payment.id}`,
        type: "income",
        title: `Loan payment ${loan.invoiceNumber}`,
        amount: payment.amount,
        date: payment.date,
        description: payment.notes || loan.customerName,
        source: "loan-payment",
        category: "sales",
        referenceId: loan.id,
        currency: loan.currency,
      },
      ...current,
    ]);

    await adjustCustomerPending(loan, paymentAmount);
    notify("Payment recorded successfully.");
    setPaymentLoan(null);
    setViewLoan(null);
  };

  const markPaid = (loan) => {
    if (parseNumber(loan.balance) <= 0) return;
    setPaymentLoan({ ...loan, markPaidAmount: String(loan.balance), markPaidNote: "Marked as paid" });
    setViewLoan(null);
  };

  const deleteSelectedLoan = async () => {
    if (!deleteLoan) return;
    const saved = await setSales((current) => current.filter((sale) => String(sale.id) !== String(deleteLoan.id)));
    if (!saved) return;
    await adjustCustomerPending(deleteLoan, 0, true);
    notify("Loan record deleted successfully.");
    setDeleteLoan(null);
    setViewLoan(null);
  };

  const printReport = () => {
    printRows(
      "Loan Report",
      filteredLoans.map((loan) => ({
        Invoice: loan.invoiceNumber,
        Customer: loan.customerName,
        Total: formatCurrencyAmount(loan.total, loan.currency),
        Paid: formatCurrencyAmount(loan.paidAmount, loan.currency),
        Remaining: formatCurrencyAmount(loan.balance, loan.currency),
        Status: loan.status,
        Date: getDateLabel(loan.date),
      }))
    );
  };

  return (
    <section className="loans-page">
      <div className="loans-header">
        <div>
          <h1>Loans</h1>
          <p>Track customer loan invoices, balances, overdue records and payments.</p>
        </div>
        <button className="loan-primary-btn" type="button" onClick={printReport}>
          <Printer size={16} />
          Print
        </button>
      </div>

      <section className="loan-stats">
        <StatCard icon={CreditCard} label="Active Loans" value={formatCurrencyAmount(stats.active, baseCurrency)} />
        <StatCard icon={DollarSign} label="Paid Loans" value={formatCurrencyAmount(stats.paid, baseCurrency)} tone="success" />
        <StatCard icon={CalendarDays} label="Pending Loans" value={formatCurrencyAmount(stats.pending, baseCurrency)} tone="warning" />
        <StatCard icon={WalletCards} label="Overdue Loans" value={stats.overdue} tone="danger" />
      </section>

      <section className="loan-card">
        <div className="loan-toolbar">
          <label className="loan-search">
            <Search size={16} />
            <input placeholder="Search invoice or customer..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <CustomSelect
            ariaLabel="Status"
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "paid", label: "Paid" },
              { value: "overdue", label: "Overdue" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <CustomSelect
            ariaLabel="Date filter"
            options={[
              { value: "all", label: "All time" },
              { value: "today", label: "Today" },
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
              { value: "annual", label: "Annual" },
              { value: "custom", label: "Custom" },
            ]}
            value={dateFilter}
            onChange={setDateFilter}
          />
          {dateFilter === "custom" && (
            <div className="loan-inline-dates">
              <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
              <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
            </div>
          )}
        </div>

        <div className="loan-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((loan) => (
                <tr key={loan.id}>
                  <td><strong>{loan.invoiceNumber || "-"}</strong></td>
                  <td>{loan.customerName || "Walk-in customer"}</td>
                  <td><strong>{formatCurrencyAmount(loan.total, loan.currency)}</strong></td>
                  <td className="loan-success-text">{formatCurrencyAmount(loan.paidAmount, loan.currency)}</td>
                  <td className="loan-danger-text">{formatCurrencyAmount(loan.balance, loan.currency)}</td>
                  <td><span className={`loan-status ${loan.status}`}>{loan.status}</span></td>
                  <td>{getDateLabel(loan.date)}<small>{getShamsiLabel(loan.date)}</small></td>
                  <td>
                    <FloatingActionMenu
                      ariaLabel="Loan actions"
                      width={186}
                      actions={[
                        { icon: <Eye size={15} />, label: "View", onClick: () => setViewLoan(loan) },
                        { icon: <DollarSign size={15} />, label: "Make Payment", onClick: () => setPaymentLoan(loan) },
                        { icon: <CreditCard size={15} />, label: "Mark as Paid", onClick: () => markPaid(loan) },
                        { danger: true, icon: <Trash2 size={15} />, label: "Delete", onClick: () => setDeleteLoan(loan) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {!filteredLoans.length && (
                <tr><td className="loan-empty" colSpan="8">No loans found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={filteredLoans.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
        />
      </section>

      {viewLoan && (
        <LoanDetailsModal
          loan={viewLoan}
          onClose={() => setViewLoan(null)}
          onDelete={() => setDeleteLoan(viewLoan)}
          onMarkPaid={() => markPaid(viewLoan)}
          onPayment={() => {
            setPaymentLoan(viewLoan);
            setViewLoan(null);
          }}
        />
      )}
      {paymentLoan && (
        <LoanPaymentModal
          loan={paymentLoan}
          onClose={() => setPaymentLoan(null)}
          onRecord={(amount, notes) => recordPayment(paymentLoan, amount, notes)}
        />
      )}
      {deleteLoan && (
        <ConfirmModal
          title="Delete Loan Record"
          message={`Delete ${deleteLoan.invoiceNumber}? The related invoice will be removed.`}
          onClose={() => setDeleteLoan(null)}
          onConfirm={deleteSelectedLoan}
        />
      )}
    </section>
  );
}

function LoanDetailsModal({ loan, onClose, onDelete, onMarkPaid, onPayment }) {
  const total = parseNumber(loan.total);
  const paid = parseNumber(loan.paidAmount);
  const remaining = parseNumber(loan.balance);
  const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <div className="loan-modal-backdrop">
      <section className="loan-details-modal">
        <div className="loan-modal-title">
          <div>
            <h2>Loan Details</h2>
            <p>{loan.invoiceNumber || "Loan record"}</p>
          </div>
          <span className={`loan-status ${loan.status}`}>{loan.status}</span>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="loan-detail-grid">
          <DetailBox label="Invoice" value={loan.invoiceNumber || "-"} />
          <DetailBox label="Customer" value={loan.customerName || "-"} />
          <DetailBox label="Created" value={getDateLabel(loan.date)} />
          <DetailBox label="Currency" value={loan.currency || "AFN"} />
        </div>

        <div className="loan-progress-card">
          <div><span>Payment Progress</span><strong>{progress}%</strong></div>
          <div className="loan-progress-track"><span style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="loan-amount-grid">
          <DetailBox label="Total Amount" value={formatCurrencyAmount(total, loan.currency)} />
          <DetailBox label="Paid" value={formatCurrencyAmount(paid, loan.currency)} tone="success" />
          <DetailBox label="Remaining" value={formatCurrencyAmount(remaining, loan.currency)} tone="danger" />
        </div>

        <div className="loan-modal-actions">
          <button className="loan-primary-btn" type="button" onClick={onPayment}><DollarSign size={15} /> Record Payment</button>
          <button className="loan-light-btn" type="button" disabled={remaining <= 0} onClick={onMarkPaid}><CreditCard size={15} /> Mark as Paid</button>
          <button className="loan-danger-btn" type="button" onClick={onDelete}><Trash2 size={15} /> Delete</button>
        </div>
      </section>
    </div>
  );
}

function LoanPaymentModal({ loan, onClose, onRecord }) {
  const [amount, setAmount] = useState(loan.markPaidAmount || "");
  const [notes, setNotes] = useState(loan.markPaidNote || "");
  const remaining = parseNumber(loan.balance);
  const amountValue = parseNumber(amount);
  const invalid = amountValue <= 0 || amountValue > remaining;

  return (
    <div className="loan-modal-backdrop">
      <form
        className="loan-payment-modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) onRecord(amountValue, notes);
        }}
      >
        <div className="loan-modal-title">
          <div><h2>Record Payment</h2><p>{loan.invoiceNumber || "Loan payment"}</p></div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="loan-detail-grid">
          <DetailBox label="Total" value={formatCurrencyAmount(loan.total, loan.currency)} />
          <DetailBox label="Already Paid" value={formatCurrencyAmount(loan.paidAmount, loan.currency)} tone="success" />
          <DetailBox label="Remaining" value={formatCurrencyAmount(remaining, loan.currency)} tone="danger" />
        </div>
        <div className="loan-form-grid">
          <label className={invalid && amount ? "invalid" : ""}>
            <span>Payment Amount</span>
            <input autoFocus inputMode="decimal" placeholder={`Max: ${remaining}`} value={amount} onChange={(event) => setAmount(event.target.value)} />
            {amountValue > remaining && <small>Payment cannot exceed the remaining balance.</small>}
          </label>
          <label>
            <span>Notes</span>
            <textarea placeholder="Payment reference..." value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        </div>
        <div className="loan-modal-actions">
          <button className="loan-light-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="loan-primary-btn" disabled={invalid} type="submit"><DollarSign size={15} /> Record Payment</button>
        </div>
      </form>
    </div>
  );
}

function DetailBox({ label, tone = "", value }) {
  return (
    <div className={`loan-detail-box ${tone}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatCard({ icon: Icon, label, tone = "", value }) {
  return (
    <article className={`loan-stat-card ${tone}`.trim()}>
      <div><span>{label}</span><strong>{value}</strong></div>
      <Icon size={21} />
    </article>
  );
}

function ConfirmModal({ message, onClose, onConfirm, title }) {
  return (
    <div className="loan-modal-backdrop">
      <div className="loan-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="loan-modal-actions">
          <button className="loan-light-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="loan-danger-btn" type="button" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function printRows(title, rows) {
  const columns = Object.keys(rows[0] || {});
  const tableRows = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`)
    .join("");
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html>
    <html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;margin:30px;color:#111827} h1{margin:0 0 16px}
    table{width:100%;border-collapse:collapse} th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:12px}
    th{background:#f8fafc;color:#475569}
    </style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${tableRows || `<tr><td colspan="${columns.length || 1}">No records found.</td></tr>`}</tbody></table></body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
}

export default Loans;
