import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, CreditCard, DollarSign, Pencil, Printer, Trash2, UserPlus, X } from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import StandardPrintStudio from "../components/StandardPrintStudio";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { convertCurrencyAmount, currencies, formatCurrencyAmount } from "../utils/currencyExchange";
import { LedgerAmount } from "../utils/ledgerDisplay";
import { notify } from "../utils/notify";
import "./Staff.css";

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "creditCard", label: "Credit Card" },
  { value: "bankTransfer", label: "Bank Transfer" },
  { value: "onlinePayment", label: "Online Payment" },
];

const parseNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const getPayrollPaidTotal = (history = []) =>
  history.reduce((sum, entry) => sum + parseNumber(entry.paidAmountBase ?? entry.paidAmount ?? entry.amount), 0);

const getPayrollPayableTotal = (history = []) =>
  history.reduce((sum, entry) => {
    const paid = parseNumber(entry.paidAmountBase ?? entry.paidAmount ?? entry.amount);
    return sum + parseNumber(entry.payable ?? Math.max(0, parseNumber(entry.salary) - paid));
  }, 0);

const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;
const formatDateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const getMonthStart = (date = new Date()) => formatDateInput(new Date(date.getFullYear(), date.getMonth(), 1));
const getMonthEnd = (date = new Date()) => formatDateInput(new Date(date.getFullYear(), date.getMonth() + 1, 0));
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const getDaysInclusive = (start, end) => {
  const startDate = start ? new Date(`${start}T12:00:00`) : null;
  const endDate = end ? new Date(`${end}T12:00:00`) : null;
  if (!startDate || !endDate || endDate < startDate) return 1;
  return Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
};

function StaffDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staffMembers, setStaffMembers, , loaded] = useJsonCollection("staff");
  const [, setTransactions] = useJsonCollection("transactions");
  const [settings] = useJsonCollection("settings");
  const [payrollDraft, setPayrollDraft] = useState(null);
  const [deleteEntry, setDeleteEntry] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  const staff = staffMembers.find(
    (member) => String(member.id || member.staffId || member.name) === String(id)
  );

  if (!loaded) {
    return <div className="staff-page staff-detail-page"><p className="staff-empty-note">Loading staff ledger...</p></div>;
  }

  if (!staff) {
    return (
      <div className="staff-page staff-detail-page">
        <section className="staff-header">
          <div>
            <button type="button" className="staff-light-btn" onClick={() => navigate("/staff")}>
              <ChevronLeft size={16} /> Back
            </button>
            <h1>Staff not found</h1>
            <p>This staff record may have been deleted.</p>
          </div>
        </section>
      </div>
    );
  }

  const history = Array.isArray(staff.payrollHistory) ? staff.payrollHistory : [];
  const currency = staff.currency || "AFN";
  const paidTotal = getPayrollPaidTotal(history);
  const payableTotal = getPayrollPayableTotal(history);
  const isPercentageSalary = staff.salaryType === "percentage";
  const company = settings[0] || {};

  const savePayroll = async (entry) => {
    const now = new Date().toISOString();
    const payrollEntry = {
      ...entry,
      id: entry.id || `payroll-${Date.now()}`,
      createdAt: entry.createdAt || now,
      updatedAt: now,
    };
    const isEditing = Boolean(entry.id);
    const saved = await setStaffMembers((current) =>
      current.map((item) =>
        String(item.id) === String(staff.id)
          ? {
              ...item,
              payrollHistory: isEditing
                ? (item.payrollHistory || []).map((historyEntry) =>
                    String(historyEntry.id) === String(payrollEntry.id) ? payrollEntry : historyEntry
                  )
                : [payrollEntry, ...(item.payrollHistory || [])],
              updatedAt: now,
            }
          : item
      )
    );
    if (!saved) return;

    const walletTransaction = {
      id: `salary-${staff.id}-${payrollEntry.id}`,
      transactionType: "withdraw",
      type: "expense",
      title: `Salary paid to ${staff.name}`,
      amount: payrollEntry.paidAmount,
      date: (payrollEntry.createdAt || now).slice(0, 10),
      createdAt: payrollEntry.createdAt || now,
      updatedAt: now,
      description: payrollEntry.notes || `${payrollEntry.start} to ${payrollEntry.end}`,
      note: payrollEntry.notes || `${payrollEntry.start} to ${payrollEntry.end}`,
      source: "cash-wallet",
      category: "Cash Wallet",
      module: "staff-payroll",
      payrollEntryId: payrollEntry.id,
      referenceId: staff.id,
      staffId: staff.id,
      staffName: staff.name,
      currency: payrollEntry.currency,
    };

    await setTransactions((current) => {
      const exists = current.some(
        (transaction) =>
          String(transaction.payrollEntryId || "") === String(payrollEntry.id) ||
          String(transaction.id || "") === walletTransaction.id
      );
      return exists
        ? current.map((transaction) =>
            String(transaction.payrollEntryId || "") === String(payrollEntry.id) ||
            String(transaction.id || "") === walletTransaction.id
              ? { ...transaction, ...walletTransaction, createdAt: transaction.createdAt || walletTransaction.createdAt }
              : transaction
          )
        : [walletTransaction, ...current];
    });

    window.dispatchEvent(new CustomEvent("cash-wallet-updated", { detail: walletTransaction }));
    notify(isEditing ? "Payroll entry updated." : "Payroll payment saved successfully.");
    setPayrollDraft(null);
  };

  const removePayroll = async () => {
    if (!deleteEntry) return;
    const saved = await setStaffMembers((current) =>
      current.map((item) =>
        String(item.id) === String(staff.id)
          ? {
              ...item,
              payrollHistory: (item.payrollHistory || []).filter(
                (entry) => String(entry.id) !== String(deleteEntry.id)
              ),
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
    if (!saved) return;
    await setTransactions((current) =>
      current.filter(
        (transaction) =>
          String(transaction.payrollEntryId || "") !== String(deleteEntry.id) &&
          String(transaction.id || "") !== `salary-${staff.id}-${deleteEntry.id}`
      )
    );
    notify("Payroll entry deleted.");
    setDeleteEntry(null);
  };

  const reportRows = history.map((entry) => {
    const salary = parseNumber(entry.salary || entry.baseSalary || staff.salary);
    const paid = parseNumber(entry.paidAmountBase ?? entry.paidAmount ?? entry.amount);
    const remaining = parseNumber(entry.payable ?? Math.max(0, salary - paid));
    const rowCurrency = entry.staffCurrency || entry.earningCurrency || entry.currency || currency;
    return {
      Date: formatDate(entry.date || entry.createdAt),
      Period: entry.period || entry.month || "-",
      Method: entry.method || entry.paymentMethod || "-",
      Debit: formatCurrencyAmount(salary, rowCurrency),
      Credit: formatCurrencyAmount(paid, rowCurrency),
      Remaining: formatCurrencyAmount(remaining, rowCurrency),
      Notes: entry.notes || entry.description || "-",
    };
  });

  return (
    <div className="staff-page staff-detail-page">
      <section className="staff-detail-hero">
        <div className="staff-detail-topbar">
          <Link className="staff-light-btn staff-detail-back" to="/staff">
            <ChevronLeft size={16} /> Back to Staff
          </Link>
          <div className="staff-detail-actions">
            <button type="button" className="staff-light-btn" onClick={() => setPrintOpen(true)}>
              <Printer size={16} /> Print Report
            </button>
            <button type="button" className="staff-primary-btn" onClick={() => setPayrollDraft({})}>
              <CreditCard size={16} /> Pay Salary
            </button>
          </div>
        </div>
        <div className="staff-detail-identity">
          <div className="staff-detail-name">
            <div className="staff-detail-avatar">{String(staff.name || "S").charAt(0).toUpperCase()}</div>
            <div>
              <h1>{staff.name}</h1>
              <p>{staff.role || "Staff member"} / {staff.department || "No department"} / {staff.phone || staff.email || "No contact"}</p>
            </div>
          </div>
          <div className="staff-detail-badges">
            <span className="staff-detail-badge"><CalendarDays size={14} /> Joined {formatDate(staff.joiningDate)}</span>
            <span className="staff-detail-badge">{isPercentageSalary ? "Percentage salary" : "Fixed salary"}</span>
          </div>
        </div>
      </section>

      <section className="staff-stats staff-detail-stats">
        <StatCard
          icon={UserPlus}
          label={isPercentageSalary ? "Percentage Per Purchase" : "Monthly Salary"}
          value={isPercentageSalary ? `${parseNumber(staff.salary).toFixed(2)}%` : formatCurrencyAmount(staff.salary, currency)}
        />
        <StatCard icon={CreditCard} label="Paid Payroll" value={formatCurrencyAmount(paidTotal, currency)} />
        <StatCard icon={DollarSign} label="Payable" value={formatCurrencyAmount(payableTotal, currency)} />
      </section>

      <section className="staff-ledger-card">
        <div className="staff-ledger-header">
          <div>
            <h3>Staff Ledger</h3>
            <p>Payroll payments and remaining salary for this staff member.</p>
          </div>
          <span className="staff-ledger-count">{history.length} record{history.length === 1 ? "" : "s"}</span>
        </div>
        <div className="staff-table-wrap staff-ledger-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Period</th>
                <th>Method</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Remaining</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const salary = parseNumber(entry.salary || entry.baseSalary || staff.salary);
                const paid = parseNumber(entry.paidAmountBase ?? entry.paidAmount ?? entry.amount);
                const remaining = parseNumber(entry.payable ?? Math.max(0, salary - paid));
                const rowCurrency = entry.staffCurrency || entry.earningCurrency || entry.currency || currency;
                return (
                  <tr key={entry.id || `${entry.date}-${entry.period}`}>
                    <td>{formatDate(entry.date || entry.createdAt)}</td>
                    <td>{entry.period || entry.month || "-"}</td>
                    <td>{entry.method || entry.paymentMethod || "-"}</td>
                    <td><LedgerAmount type="debit" value={salary} currency={rowCurrency} /></td>
                    <td><LedgerAmount type="credit" value={paid} currency={rowCurrency} /></td>
                    <td className={remaining > 0 ? "staff-warning-text" : "staff-success-text"}>
                      {formatCurrencyAmount(remaining, rowCurrency)}
                    </td>
                    <td>{entry.notes || entry.description || "-"}</td>
                    <td>
                      <div className="staff-row-actions">
                        <button type="button" onClick={() => setPayrollDraft(entry)} title="Edit payroll" aria-label="Edit payroll">
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="danger" onClick={() => setDeleteEntry(entry)} title="Delete payroll" aria-label="Delete payroll">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!history.length && (
                <tr>
                  <td colSpan="8" className="staff-empty">No payroll history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {payrollDraft && (
        <PayrollModal
          initialEntry={payrollDraft.id ? payrollDraft : null}
          settings={company}
          staff={staff}
          onClose={() => setPayrollDraft(null)}
          onSave={savePayroll}
        />
      )}
      {deleteEntry && (
        <ConfirmModal
          title="Delete Payroll"
          message="Delete this payroll entry? The linked Cash Wallet record will also be removed."
          onClose={() => setDeleteEntry(null)}
          onConfirm={removePayroll}
        />
      )}
      {printOpen && (
        <StandardPrintStudio
          columns={["Date", "Period", "Method", "Debit", "Credit", "Remaining", "Notes"]}
          company={company}
          filename={`${staff.name || "staff"}-ledger-report`}
          Icon={Printer}
          rows={reportRows}
          stats={[
            { label: "Records", value: history.length },
            { label: "Paid Payroll", value: formatCurrencyAmount(paidTotal, currency) },
            { label: "Payable", value: formatCurrencyAmount(payableTotal, currency) },
          ]}
          subtitle="Payroll payments and remaining salary for this staff member"
          title={`${staff.name} Staff Ledger`}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="staff-stat-card">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={22} />
    </div>
  );
}

function PayrollModal({ initialEntry, staff, settings = {}, onClose, onSave }) {
  const today = new Date();
  const staffSalaryType = staff.salaryType || "fixed";
  const baseCurrency = settings.baseCurrency || "AFN";
  const exchangeRates = settings.exchangeRates || {};
  const [period, setPeriod] = useState(initialEntry?.period || "monthly");
  const [start, setStart] = useState(initialEntry?.start || getMonthStart(today));
  const [end, setEnd] = useState(initialEntry?.end || getMonthEnd(today));
  const [baseSalary, setBaseSalary] = useState(String(initialEntry?.baseSalary || staff.salary || ""));
  const [saleAmount, setSaleAmount] = useState(String(initialEntry?.saleAmount || ""));
  const [saleCurrency, setSaleCurrency] = useState(initialEntry?.saleCurrency || staff.currency || "AFN");
  const [currency, setCurrency] = useState(initialEntry?.currency || staff.currency || "AFN");
  const [todayRate, setTodayRate] = useState(String(initialEntry?.exchangeRate && initialEntry.exchangeRate !== 1 ? initialEntry.exchangeRate : ""));
  const [paidAmount, setPaidAmount] = useState(String(initialEntry?.paidAmount || "0"));
  const [method, setMethod] = useState(initialEntry?.method || "cash");
  const [notes, setNotes] = useState(initialEntry?.notes || "");

  const days = getDaysInclusive(start, end);
  const monthlySalary = parseNumber(baseSalary || staff.salary);
  const percentageRate = parseNumber(baseSalary || staff.salary);
  const earningCurrency = staffSalaryType === "percentage" ? saleCurrency : staff.currency || currency;
  const grossEarning =
    staffSalaryType === "percentage"
      ? (parseNumber(saleAmount) * percentageRate) / 100
      : period === "monthly"
        ? monthlySalary
        : (monthlySalary / 30) * days;
  const configuredRate = useMemo(() => {
    if (!earningCurrency || earningCurrency === currency) return 1;
    const converted = convertCurrencyAmount(1, {
      baseCurrency,
      exchangeRates,
      fromCurrency: earningCurrency,
      targetCurrency: currency,
    });
    return converted === null ? 0 : converted;
  }, [baseCurrency, currency, earningCurrency, exchangeRates]);
  const activeRate = earningCurrency === currency ? 1 : parseNumber(todayRate || configuredRate);
  const suggested = earningCurrency === currency ? grossEarning : activeRate > 0 ? grossEarning * activeRate : 0;
  const paidInEarningCurrency =
    earningCurrency === currency ? parseNumber(paidAmount) : activeRate > 0 ? parseNumber(paidAmount) / activeRate : 0;
  const canSave = parseNumber(paidAmount) > 0 && suggested > 0;

  useEffect(() => {
    if (!initialEntry) setPaidAmount(String(roundMoney(suggested)));
  }, [initialEntry, suggested]);

  useEffect(() => {
    if (!initialEntry && earningCurrency !== currency && configuredRate > 0) {
      setTodayRate(String(roundMoney(configuredRate)));
    }
  }, [configuredRate, currency, earningCurrency, initialEntry]);

  const setPeriodRange = (nextPeriod) => {
    setPeriod(nextPeriod);
    if (nextPeriod === "daily") {
      setStart(formatDateInput(today));
      setEnd(formatDateInput(today));
    } else if (nextPeriod === "weekly") {
      setStart(formatDateInput(today));
      setEnd(formatDateInput(addDays(today, 6)));
    } else if (nextPeriod === "monthly") {
      setStart(getMonthStart(today));
      setEnd(getMonthEnd(today));
    }
  };

  return (
    <div className="staff-modal-backdrop">
      <form
        className="payroll-modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) {
            notify("Please enter a valid payroll amount.", "error");
            return;
          }
          onSave({
            ...(initialEntry || {}),
            period,
            start,
            end,
            baseSalary: monthlySalary,
            salaryType: staffSalaryType,
            percentageRate: staffSalaryType === "percentage" ? percentageRate : 0,
            saleAmount: roundMoney(saleAmount),
            saleCurrency,
            earningCurrency,
            exchangeRate: earningCurrency === currency ? 1 : activeRate,
            currency,
            suggested: roundMoney(suggested),
            salary: roundMoney(grossEarning),
            paidAmount: roundMoney(paidAmount),
            paidAmountBase: roundMoney(paidInEarningCurrency),
            staffCurrency: earningCurrency,
            payable: roundMoney(Math.max(0, grossEarning - paidInEarningCurrency)),
            method,
            notes: notes.trim(),
          });
        }}
      >
        <div className="staff-modal-title">
          <div>
            <h2>{initialEntry ? "Edit Payroll" : "Pay Salary"} - {staff.name}</h2>
            <p>Staff right: {formatCurrencyAmount(suggested, currency)}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="staff-form-grid">
          <Field label="Period">
            <CustomSelect ariaLabel="Payroll period" options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }, { value: "custom", label: "Custom" }]} value={period} onChange={setPeriodRange} />
          </Field>
          <Field label="Start Date"><input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></Field>
          <Field label="End Date"><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
          <Field label={staffSalaryType === "percentage" ? "Percentage Per Purchase" : "Base Salary"}><input value={baseSalary} onChange={(event) => setBaseSalary(event.target.value)} /></Field>
          {staffSalaryType === "percentage" && (
            <>
              <Field label="Sales Amount"><input value={saleAmount} onChange={(event) => setSaleAmount(event.target.value)} /></Field>
              <Field label="Sales Currency"><CustomSelect ariaLabel="Sales currency" options={currencies.map((item) => ({ value: item.code, label: `${item.symbol} ${item.code}` }))} value={saleCurrency} onChange={setSaleCurrency} /></Field>
            </>
          )}
          <Field label="Payment Currency"><CustomSelect ariaLabel="Currency" options={currencies.map((item) => ({ value: item.code, label: `${item.symbol} ${item.code}` }))} value={currency} onChange={setCurrency} /></Field>
          {earningCurrency !== currency && <Field label={`Today Rate (1 ${earningCurrency} = ? ${currency})`}><input value={todayRate} onChange={(event) => setTodayRate(event.target.value)} /></Field>}
          <Field label="Paid Amount"><input value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} /></Field>
          <Field label="Payment Method"><CustomSelect ariaLabel="Payment method" options={paymentMethods} value={method} onChange={setMethod} /></Field>
          <Field label="Notes" className="full"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        </div>
        <div className="payroll-summary">
          <div><span>Days</span><strong>{days}</strong></div>
          <div><span>Staff Right</span><strong>{formatCurrencyAmount(suggested, currency)}</strong></div>
          <div><span>Paid Now</span><strong>{formatCurrencyAmount(parseNumber(paidAmount), currency)}</strong></div>
          <div><span>Remaining</span><strong>{formatCurrencyAmount(Math.max(0, suggested - parseNumber(paidAmount)), currency)}</strong></div>
        </div>
        <div className="staff-modal-actions">
          <button type="button" className="staff-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="staff-primary-btn">{initialEntry ? "Save Changes" : "Save Payroll"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, required = false, invalid = false, className = "" }) {
  return (
    <label className={`staff-form-field ${className} ${invalid ? "invalid" : ""}`.trim()}>
      <span>{label}{required && <em>*</em>}</span>
      {children}
      {invalid && <small>This field is required.</small>}
    </label>
  );
}

function ConfirmModal({ message, onClose, onConfirm, title }) {
  return (
    <div className="staff-modal-backdrop">
      <div className="staff-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="staff-modal-actions">
          <button type="button" className="staff-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="staff-danger-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default StaffDetails;
