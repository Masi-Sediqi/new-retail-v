import { useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  Eye,
  History,
  Plus,
  Printer,
  ReceiptText,
  RefreshCcw,
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
import "./SalesBills.css";

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getGregorianLabel = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getShamsiShortLabel = (isoDate) => {
  if (!isoDate) return "-";
  try {
    return new Intl.DateTimeFormat("en-CA-u-ca-persian", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${isoDate}T12:00:00`));
  } catch {
    return isoDate;
  }
};

const getSaleDiscountTotal = (sale) =>
  parseNumber(sale.discountTotal) ||
  parseNumber(sale.itemDiscountTotal) + parseNumber(sale.discount);

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function SalesBills() {
  const [sales, setSales] = useJsonCollection("billingInvoices");
  const [settings] = useJsonCollection("settings");
  const [, setTransactions] = useJsonCollection("transactions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [viewSale, setViewSale] = useState(null);
  const [paymentSale, setPaymentSale] = useState(null);
  const [historySale, setHistorySale] = useState(null);
  const [refundSale, setRefundSale] = useState(null);
  const [deleteSale, setDeleteSale] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");

  const company = settings[0] || {};

  const normalizedSales = useMemo(
    () =>
      sales.map((sale, originalIndex) => ({
        ...sale,
        originalIndex,
        items: Array.isArray(sale.items) ? sale.items : [],
        paidAmount: parseNumber(sale.paidAmount),
        balance: parseNumber(sale.balance),
        total: parseNumber(sale.total),
        subtotal: parseNumber(sale.subtotal),
        currency: sale.currency || "AFN",
      })),
    [sales]
  );

  const stats = useMemo(() => {
    const paid = normalizedSales.filter((sale) => sale.paymentStatus === "paid");
    const loan = normalizedSales.filter((sale) => sale.paymentStatus !== "paid");
    const refunded = normalizedSales.filter((sale) => parseNumber(sale.refundTotal) > 0);
    return {
      invoices: normalizedSales.length,
      revenue: normalizedSales.reduce((sum, sale) => sum + parseNumber(sale.total), 0),
      paid: paid.reduce((sum, sale) => sum + parseNumber(sale.paidAmount || sale.total), 0),
      pending: loan.reduce((sum, sale) => sum + parseNumber(sale.balance), 0),
      refunds: refunded.reduce((sum, sale) => sum + parseNumber(sale.refundTotal), 0),
    };
  }, [normalizedSales]);

  const filteredSales = normalizedSales.filter((sale) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      [
        sale.invoiceNumber,
        sale.customerName,
        sale.paymentMethod,
        sale.paymentStatus,
        ...sale.items.map((item) => `${item.name} ${item.code}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && sale.paymentStatus === "paid") ||
      (statusFilter === "loan" && sale.paymentStatus !== "paid") ||
      (statusFilter === "refunded" && parseNumber(sale.refundTotal) > 0);
    const matchesDate =
      (!dateRange.from || sale.date >= dateRange.from) &&
      (!dateRange.to || sale.date <= dateRange.to);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const pagination = useTablePagination(filteredSales, `${search}-${statusFilter}-${dateRange.from}-${dateRange.to}`);

  const updateSale = async (targetSale, updater) => {
    const saved = await setSales((currentSales) =>
      currentSales.map((sale) =>
        String(sale.id) === String(targetSale.id) ? updater(sale) : sale
      )
    );
    return saved;
  };

  const printInvoice = (sale) => {
    const rows = sale.items
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.code)}</td>
            <td>${escapeHtml(item.quantity)} ${escapeHtml(item.unit || "pcs")}</td>
            <td>${formatCurrencyAmount(item.price, sale.currency)}</td>
            <td><strong>${formatCurrencyAmount(item.lineTotal, sale.currency)}</strong></td>
          </tr>
        `
      )
      .join("");

    const logo = company.logo
      ? `<img class="invoice-logo" src="${escapeHtml(company.logo)}" alt="" />`
      : `<div class="invoice-logo">${escapeHtml((company.companyName || "R").slice(0, 1))}</div>`;

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(sale.invoiceNumber)}</title>
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; background: #e5e7eb; font-family: Arial, sans-serif; color: #111827; }
            .invoice-paper { width: 190mm; min-height: 270mm; margin: 0 auto; background: #fff; overflow: hidden; }
            .invoice-ribbon { height: 62px; background: linear-gradient(100deg, #252525, #4338ca); border-bottom-left-radius: 58% 22px; }
            .invoice-head { display: flex; justify-content: space-between; gap: 24px; padding: 22px 38px 12px; }
            .invoice-brand { display: flex; align-items: center; gap: 16px; }
            .invoice-logo { width: 58px; height: 58px; border-radius: 16px; object-fit: contain; background: #f8fafc; display:grid;place-items:center;font-weight:900; }
            .invoice-title-box { border: 1px solid #c7d2fe; background: #eef2ff; border-radius: 8px; padding: 12px 18px; text-align: right; }
            .invoice-title-box h1 { margin: 0; color: #3730a3; letter-spacing: 3px; font-size: 18px; }
            .invoice-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 28px; margin: 20px 38px 8px; font-size: 12px; }
            table { width: calc(100% - 76px); margin: 16px 38px; border-collapse: collapse; }
            th, td { padding: 11px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 12px; }
            th { background: #f8fafc; color: #475569; }
            .summary { width: 300px; margin: 18px 38px 0 auto; display: grid; gap: 7px; font-size: 12px; }
            .summary div { display: flex; justify-content: space-between; gap: 20px; }
            .summary .grand { border-top: 1px solid #cbd5e1; padding-top: 8px; font-weight: 900; }
            @media print { body { background:#fff; } .invoice-paper { width:190mm; min-height:auto; } }
          </style>
        </head>
        <body>
          <article class="invoice-paper">
            <div class="invoice-ribbon"></div>
            <header class="invoice-head">
              <div class="invoice-brand">${logo}<div><h2>${escapeHtml(company.companyName || "Smart Office")}</h2><p>${escapeHtml(company.systemSubtitle || "Business Management System")}</p></div></div>
              <div class="invoice-title-box"><h1>INVOICE</h1><span>#${escapeHtml(sale.invoiceNumber)}</span></div>
            </header>
            <section class="invoice-meta">
              <span>Bill To: <strong>${escapeHtml(sale.customerName)}</strong></span>
              <span>Status: <strong>${escapeHtml(sale.paymentStatus === "paid" ? "Paid" : "Loan")}</strong></span>
              <span>Date: <strong>${escapeHtml(getGregorianLabel(sale.date))}</strong> / ${escapeHtml(getShamsiShortLabel(sale.date))}</span>
              <span>Total: <strong>${formatCurrencyAmount(sale.total, sale.currency)}</strong></span>
            </section>
            <table><thead><tr><th>Item</th><th>Code</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="summary">
              <div><span>Subtotal</span><strong>${formatCurrencyAmount(sale.subtotal, sale.currency)}</strong></div>
              <div><span>Discount</span><strong>${formatCurrencyAmount(getSaleDiscountTotal(sale), sale.currency)}</strong></div>
              <div><span>Paid</span><strong>${formatCurrencyAmount(sale.paidAmount, sale.currency)}</strong></div>
              <div><span>Remaining</span><strong>${formatCurrencyAmount(sale.balance, sale.currency)}</strong></div>
              <div class="grand"><span>Total</span><strong>${formatCurrencyAmount(sale.total, sale.currency)}</strong></div>
            </div>
          </article>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  const addPayment = async () => {
    if (!paymentSale) return;
    const amount = roundMoney(paymentAmount);
    if (amount <= 0) {
      notify("Please enter a valid payment amount.", "error");
      return;
    }
    if (amount > parseNumber(paymentSale.balance)) {
      notify("Payment cannot exceed remaining balance.", "error");
      return;
    }

    const saved = await updateSale(paymentSale, (sale) => {
      const nextPaid = roundMoney(parseNumber(sale.paidAmount) + amount);
      const nextBalance = roundMoney(Math.max(0, parseNumber(sale.total) - nextPaid));
      return {
        ...sale,
        paidAmount: nextPaid,
        balance: nextBalance,
        paymentStatus: nextBalance <= 0 ? "paid" : "loan",
        paymentHistory: [
          ...(sale.paymentHistory || []),
          {
            id: `pay-${Date.now()}`,
            amount,
            note: paymentNote.trim(),
            date: formatDateInput(new Date()),
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
    if (!saved) return;

    await setTransactions((current) => [
      {
        id: `payment-${paymentSale.id}-${Date.now()}`,
        type: "income",
        title: `Payment ${paymentSale.invoiceNumber}`,
        amount,
        date: formatDateInput(new Date()),
        description: paymentNote.trim() || paymentSale.customerName,
        source: "billing-payment",
        category: "sales",
        referenceId: paymentSale.id,
        currency: paymentSale.currency,
      },
      ...current,
    ]);

    notify("Payment added successfully.");
    setPaymentSale(null);
    setPaymentAmount("");
    setPaymentNote("");
  };

  const markAsPaid = async (sale) => {
    const remaining = roundMoney(sale.balance);
    if (remaining <= 0) return;
    setPaymentSale(sale);
    setPaymentAmount(String(remaining));
    setPaymentNote("Marked as paid");
  };

  const addRefund = async () => {
    if (!refundSale) return;
    const amount = roundMoney(refundAmount);
    if (amount <= 0) {
      notify("Please enter a valid refund amount.", "error");
      return;
    }
    if (amount > parseNumber(refundSale.paidAmount)) {
      notify("Refund cannot exceed paid amount.", "error");
      return;
    }

    const saved = await updateSale(refundSale, (sale) => {
      const nextPaid = roundMoney(Math.max(0, parseNumber(sale.paidAmount) - amount));
      const nextBalance = roundMoney(Math.max(0, parseNumber(sale.total) - nextPaid));
      return {
        ...sale,
        paidAmount: nextPaid,
        balance: nextBalance,
        paymentStatus: nextBalance <= 0 ? "paid" : "loan",
        refundTotal: roundMoney(parseNumber(sale.refundTotal) + amount),
        refundHistory: [
          ...(sale.refundHistory || []),
          {
            id: `refund-${Date.now()}`,
            amount,
            note: refundNote.trim(),
            date: formatDateInput(new Date()),
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
    if (!saved) return;

    await setTransactions((current) => [
      {
        id: `refund-${refundSale.id}-${Date.now()}`,
        type: "expense",
        title: `Refund ${refundSale.invoiceNumber}`,
        amount,
        date: formatDateInput(new Date()),
        description: refundNote.trim() || refundSale.customerName,
        source: "billing-refund",
        category: "refund",
        referenceId: refundSale.id,
        currency: refundSale.currency,
      },
      ...current,
    ]);

    notify("Refund recorded successfully.");
    setRefundSale(null);
    setRefundAmount("");
    setRefundNote("");
  };

  const confirmDelete = async () => {
    if (!deleteSale) return;
    const saved = await setSales((current) =>
      current.filter((sale) => String(sale.id) !== String(deleteSale.id))
    );
    if (!saved) return;
    notify("Invoice deleted successfully.");
    setDeleteSale(null);
  };

  const statusOptions = [
    { value: "all", label: "All bills" },
    { value: "paid", label: "Paid" },
    { value: "loan", label: "Loan" },
    { value: "refunded", label: "Refunded" },
  ];

  return (
    <div className="sales-bills-page">
      <div className="sales-bills-header">
        <div>
          <h1>Sales / Bills</h1>
          <p>Review invoices, print bills, collect remaining payments and record refunds.</p>
        </div>
      </div>

      <section className="sales-bills-stats">
        <StatCard icon={ReceiptText} label="Invoices" value={stats.invoices} />
        <StatCard icon={DollarSign} label="Revenue" value={formatCurrencyAmount(stats.revenue, "AFN")} />
        <StatCard icon={WalletCards} label="Paid" value={formatCurrencyAmount(stats.paid, "AFN")} />
        <StatCard icon={CreditCard} label="Pending" value={formatCurrencyAmount(stats.pending, "AFN")} tone="warning" />
        <StatCard icon={RefreshCcw} label="Refunds" value={formatCurrencyAmount(stats.refunds, "AFN")} tone="danger" />
      </section>

      <section className="sales-bills-card">
        <div className="sales-bills-toolbar">
          <label className="sales-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, customer, item..."
            />
          </label>

          <CustomSelect
            ariaLabel="Status filter"
            className="sales-filter-select"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />

          <label className="sales-date-input">
            <CalendarDays size={15} />
            <input
              type="date"
              value={dateRange.from}
              onChange={(event) => setDateRange((current) => ({ ...current, from: event.target.value }))}
            />
          </label>

          <label className="sales-date-input">
            <CalendarDays size={15} />
            <input
              type="date"
              value={dateRange.to}
              onChange={(event) => setDateRange((current) => ({ ...current, to: event.target.value }))}
            />
          </label>
        </div>

        <div className="sales-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((sale) => (
                <tr key={sale.id || sale.invoiceNumber}>
                  <td className="sales-strong">{sale.invoiceNumber || "-"}</td>
                  <td>{sale.customerName || "Walk-in customer"}</td>
                  <td>
                    <strong>{getGregorianLabel(sale.date)}</strong>
                    <span>{getShamsiShortLabel(sale.date)}</span>
                  </td>
                  <td>{sale.items.length}</td>
                  <td>{formatCurrencyAmount(sale.total, sale.currency)}</td>
                  <td>{formatCurrencyAmount(sale.paidAmount, sale.currency)}</td>
                  <td className={sale.balance > 0 ? "sales-warning-text" : ""}>
                    {formatCurrencyAmount(sale.balance, sale.currency)}
                  </td>
                  <td>
                    <StatusBadge sale={sale} />
                  </td>
                  <td>
                    <FloatingActionMenu
                      ariaLabel="Sales bill actions"
                      width={210}
                      actions={[
                        { icon: <Eye size={15} />, label: "View Details", onClick: () => setViewSale(sale) },
                        { icon: <Printer size={15} />, label: "Print Invoice", onClick: () => printInvoice(sale) },
                        { icon: <History size={15} />, label: "Payment History", onClick: () => setHistorySale(sale) },
                        ...(sale.balance > 0
                          ? [
                              { icon: <Plus size={15} />, label: "Add Payment", onClick: () => setPaymentSale(sale) },
                              { icon: <DollarSign size={15} />, label: "Mark as Paid", onClick: () => markAsPaid(sale) },
                            ]
                          : []),
                        { icon: <RefreshCcw size={15} />, label: "Refund", onClick: () => setRefundSale(sale) },
                        { danger: true, icon: <Trash2 size={15} />, label: "Delete", onClick: () => setDeleteSale(sale) },
                      ]}
                    />
                  </td>
                </tr>
              ))}

              {!filteredSales.length && (
                <tr>
                  <td colSpan="9" className="sales-empty">
                    No sales bill has been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={filteredSales.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
        />
      </section>

      {viewSale && (
        <InvoiceDetailsModal
          sale={viewSale}
          onClose={() => setViewSale(null)}
          onPrint={() => printInvoice(viewSale)}
        />
      )}

      {historySale && (
        <HistoryModal sale={historySale} onClose={() => setHistorySale(null)} />
      )}

      {paymentSale && (
        <PaymentModal
          sale={paymentSale}
          amount={paymentAmount}
          note={paymentNote}
          setAmount={setPaymentAmount}
          setNote={setPaymentNote}
          onClose={() => {
            setPaymentSale(null);
            setPaymentAmount("");
            setPaymentNote("");
          }}
          onSave={addPayment}
        />
      )}

      {refundSale && (
        <RefundModal
          sale={refundSale}
          amount={refundAmount}
          note={refundNote}
          setAmount={setRefundAmount}
          setNote={setRefundNote}
          onClose={() => {
            setRefundSale(null);
            setRefundAmount("");
            setRefundNote("");
          }}
          onSave={addRefund}
        />
      )}

      {deleteSale && (
        <ConfirmModal
          title="Delete Invoice"
          message={`Delete invoice ${deleteSale.invoiceNumber}? This cannot be undone.`}
          confirmText="Delete"
          danger
          onClose={() => setDeleteSale(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "" }) {
  return (
    <div className={`sales-stat-card ${tone}`.trim()}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={20} />
    </div>
  );
}

function StatusBadge({ sale }) {
  if (parseNumber(sale.refundTotal) > 0) {
    return <span className="sales-status refunded">Refunded</span>;
  }
  if (sale.paymentStatus === "paid" || parseNumber(sale.balance) <= 0) {
    return <span className="sales-status paid">Paid</span>;
  }
  return <span className="sales-status loan">Loan</span>;
}

function InvoiceDetailsModal({ sale, onClose, onPrint }) {
  return (
    <div className="sales-modal-backdrop">
      <div className="sales-detail-modal">
        <div className="sales-modal-title">
          <div>
            <h2>Invoice #{sale.invoiceNumber}</h2>
            <p>{sale.customerName} · {getGregorianLabel(sale.date)}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="sales-detail-head">
          <DetailBox label="Total" value={formatCurrencyAmount(sale.total, sale.currency)} />
          <DetailBox label="Paid" value={formatCurrencyAmount(sale.paidAmount, sale.currency)} />
          <DetailBox label="Balance" value={formatCurrencyAmount(sale.balance, sale.currency)} />
          <DetailBox label="Discount" value={formatCurrencyAmount(getSaleDiscountTotal(sale), sale.currency)} />
        </div>

        <div className="sales-detail-table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Code</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td>{item.code}</td>
                  <td>{item.quantity} {item.unit || "pcs"}</td>
                  <td>{formatCurrencyAmount(item.price, sale.currency)}</td>
                  <td><strong>{formatCurrencyAmount(item.lineTotal, sale.currency)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sales-modal-actions">
          <button type="button" className="sales-light-btn" onClick={onClose}>Close</button>
          <button type="button" className="sales-primary-btn" onClick={onPrint}><Printer size={15} /> Print</button>
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="sales-detail-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HistoryModal({ sale, onClose }) {
  const payments = sale.paymentHistory || [];
  const refunds = sale.refundHistory || [];
  return (
    <div className="sales-modal-backdrop">
      <div className="sales-history-modal">
        <div className="sales-modal-title">
          <div>
            <h2>Payment History</h2>
            <p>{sale.invoiceNumber}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="sales-history-list">
          {[...payments.map((item) => ({ ...item, kind: "Payment" })), ...refunds.map((item) => ({ ...item, kind: "Refund" }))].map((item) => (
            <div className={item.kind === "Refund" ? "refund" : ""} key={item.id}>
              <span>{item.kind} · {item.date}</span>
              <strong>{formatCurrencyAmount(item.amount, sale.currency)}</strong>
              {item.note && <p>{item.note}</p>}
            </div>
          ))}
          {!payments.length && !refunds.length && <p className="sales-empty-note">No payment history yet.</p>}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ sale, amount, note, setAmount, setNote, onClose, onSave }) {
  return (
    <FormModal
      title="Add Payment"
      subtitle={`${sale.invoiceNumber} · Remaining ${formatCurrencyAmount(sale.balance, sale.currency)}`}
      amount={amount}
      note={note}
      setAmount={setAmount}
      setNote={setNote}
      onClose={onClose}
      onSave={onSave}
      saveText="Add Payment"
    />
  );
}

function RefundModal({ sale, amount, note, setAmount, setNote, onClose, onSave }) {
  return (
    <FormModal
      title="Record Refund"
      subtitle={`${sale.invoiceNumber} · Paid ${formatCurrencyAmount(sale.paidAmount, sale.currency)}`}
      amount={amount}
      note={note}
      setAmount={setAmount}
      setNote={setNote}
      onClose={onClose}
      onSave={onSave}
      saveText="Record Refund"
      danger
    />
  );
}

function FormModal({ title, subtitle, amount, note, setAmount, setNote, onClose, onSave, saveText, danger = false }) {
  return (
    <div className="sales-modal-backdrop">
      <div className="sales-form-modal">
        <div className="sales-modal-title">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <label className="sales-form-field">
          <span>Amount</span>
          <input value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus />
        </label>
        <label className="sales-form-field">
          <span>Note</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="sales-modal-actions">
          <button type="button" className="sales-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className={danger ? "sales-danger-btn" : "sales-primary-btn"} onClick={onSave}>
            {saveText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmText, danger = false, onClose, onConfirm }) {
  return (
    <div className="sales-modal-backdrop">
      <div className="sales-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="sales-modal-actions">
          <button type="button" className="sales-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className={danger ? "sales-danger-btn" : "sales-primary-btn"} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SalesBills;
