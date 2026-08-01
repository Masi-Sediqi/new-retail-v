import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CreditCard,
  DollarSign,
  Eye,
  Plus,
  Printer,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import FloatingActionMenu from "../components/FloatingActionMenu";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { currencies, formatCurrencyAmount } from "../utils/currencyExchange";
import { createRecycleEntry } from "../utils/recycleBin";
import "./Staff.css";

const employmentTypes = ["Full-time", "Part-time", "Contract"];
const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "creditCard", label: "Credit Card" },
  { value: "bankTransfer", label: "Bank Transfer" },
  { value: "onlinePayment", label: "Online Payment" },
];

const emptyStaff = {
  name: "",
  phone: "",
  email: "",
  role: "",
  department: "",
  employmentType: "Full-time",
  salary: "",
  currency: "AFN",
  status: "Active",
  payrollHistory: [],
  notes: "",
  customFields: {},
};

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthStart = (date = new Date()) =>
  formatDateInput(new Date(date.getFullYear(), date.getMonth(), 1));

const getMonthEnd = (date = new Date()) =>
  formatDateInput(new Date(date.getFullYear(), date.getMonth() + 1, 0));

const parseDateInput = (value) => (value ? new Date(`${value}T12:00:00`) : null);

const getDateLabel = (isoDate) => {
  const date = parseDateInput(isoDate);
  return date
    ? date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
};

const getDaysInclusive = (start, end) => {
  const startDate = parseDateInput(start);
  const endDate = parseDateInput(end);
  if (!startDate || !endDate || endDate < startDate) return 1;
  return Math.max(1, Math.round((endDate - startDate) / 86400000) + 1);
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const payrollPeriodKey = (entry) => `${entry.start || ""}__${entry.end || ""}`;

const getPayrollPaidTotal = (history = []) =>
  history.reduce((sum, entry) => sum + parseNumber(entry.paidAmountBase ?? entry.paidAmount), 0);

const getPayrollPayableTotal = (history = []) => {
  const latestPayableByPeriod = new Map();
  history.forEach((entry) => {
    latestPayableByPeriod.set(payrollPeriodKey(entry), parseNumber(entry.payable));
  });
  return [...latestPayableByPeriod.values()].reduce((sum, amount) => sum + amount, 0);
};

function Staff() {
  const [staffMembers, setStaffMembers] = useJsonCollection("staff");
  const [, setTransactions] = useJsonCollection("transactions");
  const [, setDeletedItems] = useJsonCollection("deletedItems");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [payrollStaff, setPayrollStaff] = useState(null);
  const [profileStaff, setProfileStaff] = useState(null);
  const [deleteStaff, setDeleteStaff] = useState(null);
  const [deletePayrollEntry, setDeletePayrollEntry] = useState(null);

  const normalizedStaff = useMemo(
    () =>
      staffMembers.map((staff, originalIndex) => ({
        ...emptyStaff,
        ...staff,
        originalIndex,
        payrollHistory: Array.isArray(staff.payrollHistory) ? staff.payrollHistory : [],
      })),
    [staffMembers]
  );

  const filteredStaff = normalizedStaff.filter((staff) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      [staff.name, staff.phone, staff.email, staff.role, staff.department, staff.employmentType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    const paid = getPayrollPaidTotal(staff.payrollHistory);
    const payable = getPayrollPayableTotal(staff.payrollHistory);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && staff.status === "Active") ||
      (statusFilter === "payable" && payable > 0) ||
      (statusFilter === "paid" && paid > 0);
    return matchesSearch && matchesStatus;
  });

  const pagination = useTablePagination(filteredStaff, `${search}-${statusFilter}`);

  const stats = useMemo(() => {
    const active = normalizedStaff.filter((staff) => staff.status === "Active").length;
    const monthlySalary = normalizedStaff.reduce((sum, staff) => sum + parseNumber(staff.salary), 0);
    const paid = normalizedStaff.reduce(
      (sum, staff) => sum + getPayrollPaidTotal(staff.payrollHistory),
      0
    );
    const payable = normalizedStaff.reduce(
      (sum, staff) => sum + getPayrollPayableTotal(staff.payrollHistory),
      0
    );
    return { total: normalizedStaff.length, active, monthlySalary, paid, payable };
  }, [normalizedStaff]);

  const openCreate = () => {
    setEditingStaff(null);
    setShowStaffModal(true);
  };

  const openEdit = (staff) => {
    setEditingStaff(staff);
    setShowStaffModal(true);
  };

  const saveStaff = async (staff) => {
    const nextStaff = {
      ...staff,
      id: staff.id || `staff-${Date.now()}`,
      name: staff.name.trim(),
      role: staff.role.trim(),
      salary: roundMoney(staff.salary),
      updatedAt: new Date().toISOString(),
      createdAt: staff.createdAt || new Date().toISOString(),
    };

    if (!nextStaff.name) {
      notify("Please enter staff full name.", "error");
      return;
    }

    if (!nextStaff.role) {
      notify("Please enter staff role.", "error");
      return;
    }

    const saved = await setStaffMembers((current) => {
      const exists = current.some((item) => String(item.id) === String(nextStaff.id));
      return exists
        ? current.map((item) => (String(item.id) === String(nextStaff.id) ? nextStaff : item))
        : [nextStaff, ...current];
    });

    if (!saved) return;
    notify(editingStaff ? "Staff member updated successfully." : "Staff member added successfully.");
    setShowStaffModal(false);
    setEditingStaff(null);
  };

  const savePayroll = async (staff, entry) => {
    const payrollEntry = {
      ...entry,
      id: entry.id || `payroll-${Date.now()}`,
    };
    const saved = await setStaffMembers((current) =>
      current.map((item) =>
        String(item.id) === String(staff.id)
          ? {
              ...item,
              payrollHistory: [payrollEntry, ...(item.payrollHistory || [])],
              updatedAt: new Date().toISOString(),
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
        date: payrollEntry.createdAt.slice(0, 10),
        createdAt: payrollEntry.createdAt,
        updatedAt: payrollEntry.createdAt,
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

    const transactionSaved = await setTransactions((current) => [
      walletTransaction,
      ...current,
    ]);
    if (transactionSaved) {
      window.dispatchEvent(
        new CustomEvent("cash-wallet-updated", {
          detail: walletTransaction,
        })
      );
    }

    notify("Payroll payment saved successfully.");
    setPayrollStaff(null);
  };

  const removeStaff = async () => {
    if (!deleteStaff) return;
    const archived = await setDeletedItems((current) => [
      createRecycleEntry("staffMembers", deleteStaff, deleteStaff.name || deleteStaff.fullName),
      ...current,
    ]);
    if (!archived) return;

    const saved = await setStaffMembers((current) =>
      current.filter((staff) => String(staff.id) !== String(deleteStaff.id))
    );
    if (!saved) return;
    notify("Staff member deleted successfully.");
    setDeleteStaff(null);
  };

  const removePayroll = async () => {
    if (!deletePayrollEntry) return;
    const { staff, entry } = deletePayrollEntry;
    const saved = await setStaffMembers((current) =>
      current.map((item) =>
        String(item.id) === String(staff.id)
          ? {
              ...item,
              payrollHistory: (item.payrollHistory || []).filter(
                (historyEntry) => String(historyEntry.id) !== String(entry.id)
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
          String(transaction.payrollEntryId || "") !== String(entry.id) &&
          String(transaction.id || "") !== `salary-${staff.id}-${entry.id}`
      )
    );
    notify("Payroll entry deleted.");
    setDeletePayrollEntry(null);
  };

  const printStaffReport = () => {
    const rows = filteredStaff
      .map(
        (staff) => `
          <tr>
            <td>${staff.name}</td>
            <td>${staff.role || "-"}</td>
            <td>${staff.department || "-"}</td>
            <td>${formatCurrencyAmount(staff.salary, staff.currency)}</td>
            <td>${formatCurrencyAmount(getPayrollPaidTotal(staff.payrollHistory), staff.currency)}</td>
            <td>${formatCurrencyAmount(getPayrollPayableTotal(staff.payrollHistory), staff.currency)}</td>
          </tr>
        `
      )
      .join("");
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html><head><title>Staff Report</title><style>
      body{font-family:Arial,sans-serif;margin:30px;color:#111827} h1{margin:0 0 16px}
      table{width:100%;border-collapse:collapse} th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:12px}
      th{background:#f8fafc;color:#475569}
      </style></head><body><h1>Staff Report</h1><table><thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Salary</th><th>Paid</th><th>Payable</th></tr></thead><tbody>${rows}</tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="staff-page">
      <div className="staff-header">
        <div>
          <h1>Staff</h1>
          <p>Manage staff profiles, monthly salary, payroll payments and payable balances.</p>
        </div>
        <div className="staff-header-actions">
          <button type="button" className="staff-light-btn" onClick={printStaffReport}>
            <Printer size={16} />
            Print
          </button>
          <button type="button" className="staff-primary-btn" onClick={openCreate}>
            <UserPlus size={16} />
            Add Staff
          </button>
        </div>
      </div>

      <section className="staff-stats">
        <StatCard icon={BriefcaseBusiness} label="Total Staff" value={stats.total} />
        <StatCard icon={UserPlus} label="Active Staff" value={stats.active} />
        <StatCard icon={DollarSign} label="Monthly Salary" value={formatCurrencyAmount(stats.monthlySalary, "AFN")} />
        <StatCard icon={CreditCard} label="Paid Payroll" value={formatCurrencyAmount(stats.paid, "AFN")} />
        <StatCard icon={WalletIcon} label="Payable" value={formatCurrencyAmount(stats.payable, "AFN")} tone="warning" />
      </section>

      <section className="staff-card">
        <div className="staff-toolbar">
          <label className="staff-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff..."
            />
          </label>
          <CustomSelect
            ariaLabel="Staff filter"
            className="staff-filter-select"
            options={[
              { value: "all", label: "All staff" },
              { value: "active", label: "Active" },
              { value: "paid", label: "Paid payroll" },
              { value: "payable", label: "Has payable" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <div className="staff-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Type</th>
                <th>Salary</th>
                <th>Paid</th>
                <th>Payable</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((staff) => (
                <tr key={staff.id || staff.name}>
                  <td className="staff-name-cell">
                    <strong>{staff.name}</strong>
                    <span>{staff.phone || staff.email || "No contact"}</span>
                  </td>
                  <td>{staff.role || "-"}</td>
                  <td>{staff.department || "-"}</td>
                  <td>{staff.employmentType || "-"}</td>
                  <td>{formatCurrencyAmount(staff.salary, staff.currency)}</td>
                  <td>{formatCurrencyAmount(getPayrollPaidTotal(staff.payrollHistory), staff.currency)}</td>
                  <td className="staff-warning-text">
                    {formatCurrencyAmount(getPayrollPayableTotal(staff.payrollHistory), staff.currency)}
                  </td>
                  <td>
                    <span className={staff.status === "Active" ? "staff-status active" : "staff-status"}>
                      {staff.status || "Active"}
                    </span>
                  </td>
                  <td>
                    <FloatingActionMenu
                      ariaLabel="Staff actions"
                      actions={[
                        { icon: <Eye size={15} />, label: "View Profile", onClick: () => setProfileStaff(staff) },
                        { icon: <DollarSign size={15} />, label: "Pay Salary", onClick: () => setPayrollStaff(staff) },
                        { icon: <Plus size={15} />, label: "Edit", onClick: () => openEdit(staff) },
                        { danger: true, icon: <Trash2 size={15} />, label: "Delete", onClick: () => setDeleteStaff(staff) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {!filteredStaff.length && (
                <tr>
                  <td colSpan="9" className="staff-empty">No staff member has been registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={filteredStaff.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
        />
      </section>

      {showStaffModal && (
        <StaffModal
          initialStaff={editingStaff}
          onClose={() => {
            setShowStaffModal(false);
            setEditingStaff(null);
          }}
          onSave={saveStaff}
        />
      )}

      {payrollStaff && (
        <PayrollModal
          staff={payrollStaff}
          staffMembers={normalizedStaff}
          onClose={() => setPayrollStaff(null)}
          onSave={savePayroll}
        />
      )}

      {profileStaff && (
        <ProfileModal
          staff={profileStaff}
          onClose={() => setProfileStaff(null)}
          onDeletePayroll={(entry) => setDeletePayrollEntry({ staff: profileStaff, entry })}
        />
      )}

      {deleteStaff && (
        <ConfirmModal
          title="Delete Staff"
          message={`Delete ${deleteStaff.name}? Payroll history for this staff member will also be removed.`}
          confirmText="Delete"
          danger
          onClose={() => setDeleteStaff(null)}
          onConfirm={removeStaff}
        />
      )}

      {deletePayrollEntry && (
        <ConfirmModal
          title="Delete Payroll Entry"
          message="Delete this payroll entry?"
          confirmText="Delete"
          danger
          onClose={() => setDeletePayrollEntry(null)}
          onConfirm={removePayroll}
        />
      )}
    </div>
  );
}

function WalletIcon(props) {
  return <CreditCard {...props} />;
}

function StatCard({ icon: Icon, label, value, tone = "" }) {
  return (
    <div className={`staff-stat-card ${tone}`.trim()}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={20} />
    </div>
  );
}

function StaffModal({ initialStaff, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...emptyStaff,
    ...(initialStaff || {}),
  }));
  const [submitted, setSubmitted] = useState(false);

  const currencyOptions = currencies.map((item) => ({
    value: item.code,
    label: `${item.symbol} ${item.code}`,
  }));

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="staff-modal-backdrop">
      <form
        className="staff-modal"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (!form.name.trim() || !form.role.trim()) return;
          onSave(form);
        }}
      >
        <div className="staff-modal-title">
          <div>
            <h2>{initialStaff ? "Edit Staff" : "Add New Staff"}</h2>
            <p>Enter staff identity, role and salary details.</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="staff-form-grid">
          <Field label="Full Name" required invalid={submitted && !form.name.trim()}>
            <input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} />
          </Field>
          <Field label="Phone Number">
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(event) => update("email", event.target.value)} />
          </Field>
          <Field label="Role" required invalid={submitted && !form.role.trim()}>
            <input value={form.role} onChange={(event) => update("role", event.target.value)} />
          </Field>
          <Field label="Department">
            <input value={form.department} onChange={(event) => update("department", event.target.value)} />
          </Field>
          <Field label="Employment Type">
            <CustomSelect
              ariaLabel="Employment type"
              options={employmentTypes.map((item) => ({ value: item, label: item }))}
              value={form.employmentType}
              onChange={(value) => update("employmentType", value)}
            />
          </Field>
          <Field label="Monthly Salary">
            <input value={form.salary} onChange={(event) => update("salary", event.target.value)} />
          </Field>
          <Field label="Currency">
            <CustomSelect
              ariaLabel="Currency"
              options={currencyOptions}
              value={form.currency}
              onChange={(value) => update("currency", value)}
            />
          </Field>
          <Field label="Status">
            <CustomSelect
              ariaLabel="Status"
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
              ]}
              value={form.status}
              onChange={(value) => update("status", value)}
            />
          </Field>
          <Field label="Notes" className="full">
            <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>
        </div>

        <div className="staff-modal-actions">
          <button type="button" className="staff-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="staff-primary-btn">{initialStaff ? "Save Changes" : "Add Staff"}</button>
        </div>
      </form>
    </div>
  );
}

function PayrollModal({ staff, onClose, onSave }) {
  const today = new Date();
  const [period, setPeriod] = useState("monthly");
  const [start, setStart] = useState(getMonthStart(today));
  const [end, setEnd] = useState(getMonthEnd(today));
  const [baseSalary, setBaseSalary] = useState(String(staff.salary || ""));
  const [currency, setCurrency] = useState(staff.currency || "AFN");
  const [paidAmount, setPaidAmount] = useState("0");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const days = getDaysInclusive(start, end);
  const monthlySalary = parseNumber(baseSalary || staff.salary);
  const suggested = period === "monthly" ? monthlySalary : (monthlySalary / 30) * days;
  const alreadyPaid = (staff.payrollHistory || [])
    .filter((entry) => entry.start === start && entry.end === end)
    .reduce((sum, entry) => sum + parseNumber(entry.paidAmountBase ?? entry.paidAmount), 0);
  const maxPayable = Math.max(0, suggested - alreadyPaid);
  const paidValue = parseNumber(paidAmount);
  const paidTooHigh = paidValue > maxPayable;
  const canSave = paidValue > 0 && !paidTooHigh;

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
            notify(paidTooHigh ? "Paid amount cannot exceed payable amount." : "Please enter a payment amount.", "error");
            return;
          }
          onSave(staff, {
            period,
            start,
            end,
            baseSalary: monthlySalary,
            currency,
            suggested: roundMoney(suggested),
            paidAmount: roundMoney(paidAmount),
            paidAmountBase: roundMoney(paidAmount),
            staffCurrency: staff.currency || currency,
            payable: roundMoney(Math.max(0, maxPayable - paidValue)),
            method,
            notes: notes.trim(),
            createdAt: new Date().toISOString(),
          });
        }}
      >
        <div className="staff-modal-title">
          <div>
            <h2>Pay Salary - {staff.name}</h2>
            <p>Suggested payable: {formatCurrencyAmount(maxPayable, currency)}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="staff-form-grid">
          <Field label="Period">
            <CustomSelect
              ariaLabel="Payroll period"
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "custom", label: "Custom" },
              ]}
              value={period}
              onChange={setPeriodRange}
            />
          </Field>
          <Field label="Start Date">
            <input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
          </Field>
          <Field label="End Date">
            <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
          </Field>
          <Field label="Base Salary">
            <input value={baseSalary} onChange={(event) => setBaseSalary(event.target.value)} />
          </Field>
          <Field label="Currency">
            <CustomSelect
              ariaLabel="Currency"
              options={currencies.map((item) => ({ value: item.code, label: `${item.symbol} ${item.code}` }))}
              value={currency}
              onChange={setCurrency}
            />
          </Field>
          <Field label="Paid Amount" invalid={paidTooHigh}>
            <input value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
          </Field>
          <Field label="Payment Method">
            <CustomSelect ariaLabel="Payment method" options={paymentMethods} value={method} onChange={setMethod} />
          </Field>
          <Field label="Notes" className="full">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </div>

        <div className="payroll-summary">
          <div><span>Days</span><strong>{days}</strong></div>
          <div><span>Suggested</span><strong>{formatCurrencyAmount(suggested, currency)}</strong></div>
          <div><span>Already Paid</span><strong>{formatCurrencyAmount(alreadyPaid, currency)}</strong></div>
          <div><span>Remaining After Payment</span><strong>{formatCurrencyAmount(Math.max(0, maxPayable - paidValue), currency)}</strong></div>
        </div>

        <div className="staff-modal-actions">
          <button type="button" className="staff-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="staff-primary-btn">Save Payroll</button>
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

function ProfileModal({ staff, onClose, onDeletePayroll }) {
  return (
    <div className="staff-modal-backdrop">
      <div className="staff-profile-modal">
        <div className="staff-modal-title">
          <div>
            <h2>{staff.name}</h2>
            <p>{staff.role || "Staff profile"} / {staff.department || "No department"}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="staff-profile-grid">
          <ProfileBox label="Phone" value={staff.phone || "-"} />
          <ProfileBox label="Email" value={staff.email || "-"} />
          <ProfileBox label="Employment Type" value={staff.employmentType || "-"} />
          <ProfileBox label="Salary" value={formatCurrencyAmount(staff.salary, staff.currency)} />
          <ProfileBox label="Paid" value={formatCurrencyAmount(getPayrollPaidTotal(staff.payrollHistory), staff.currency)} />
          <ProfileBox label="Payable" value={formatCurrencyAmount(getPayrollPayableTotal(staff.payrollHistory), staff.currency)} />
        </div>

        <div className="staff-history">
          <h3>Payroll History</h3>
          {(staff.payrollHistory || []).map((entry) => (
            <div className="staff-history-row" key={entry.id}>
              <div>
                <strong>{formatCurrencyAmount(entry.paidAmount, entry.currency)}</strong>
                <span>{getDateLabel(entry.start)} - {getDateLabel(entry.end)} / {entry.method}</span>
                {entry.notes && <p>{entry.notes}</p>}
              </div>
              <button type="button" onClick={() => onDeletePayroll(entry)}><Trash2 size={15} /></button>
            </div>
          ))}
          {!staff.payrollHistory?.length && <p className="staff-empty-note">No payroll history yet.</p>}
        </div>
      </div>
    </div>
  );
}

function ProfileBox({ label, value }) {
  return (
    <div className="staff-profile-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ConfirmModal({ title, message, confirmText, danger = false, onClose, onConfirm }) {
  return (
    <div className="staff-modal-backdrop">
      <div className="staff-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="staff-modal-actions">
          <button type="button" className="staff-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className={danger ? "staff-danger-btn" : "staff-primary-btn"} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Staff;
