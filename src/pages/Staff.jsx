import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  CreditCard,
  DollarSign,
  Eye,
  FileDown,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import CustomFormFields from "../components/CustomFormFields";
import FloatingActionMenu from "../components/FloatingActionMenu";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { currencyMatchesFilter, useBusinessCurrencyFilter } from "../hooks/useBusinessCurrencyFilter";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { convertCurrencyAmount, currencies, formatCurrencyAmount } from "../utils/currencyExchange";
import { createRecycleEntry } from "../utils/recycleBin";
import { normalizePrintSettings } from "../utils/printStudio";
import defaultLogo from "../assets/logo.jpeg";
import { limitPhoneValue, normalizePhoneRules } from "../utils/phoneRules";
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
  joiningDate: "",
  salaryType: "fixed",
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
  const navigate = useNavigate();
  const [staffMembers, setStaffMembers] = useJsonCollection("staff");
  const [settings] = useJsonCollection("settings");
  const [, setTransactions] = useJsonCollection("transactions");
  const [, setDeletedItems] = useJsonCollection("deletedItems");
  const businessCurrencyFilter = useBusinessCurrencyFilter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [payrollStaff, setPayrollStaff] = useState(null);
  const [profileStaff, setProfileStaff] = useState(null);
  const [deleteStaff, setDeleteStaff] = useState(null);
  const [deletePayrollEntry, setDeletePayrollEntry] = useState(null);
  const [printReportOpen, setPrintReportOpen] = useState(false);
  const staffCustomFields = settings[0]?.customFields?.staffMembers || [];
  const phoneRules = normalizePhoneRules(settings[0] || {});

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

  const currencyFilteredStaff = useMemo(
    () =>
      normalizedStaff.filter(
        (staff) =>
          currencyMatchesFilter(staff.currency, businessCurrencyFilter) ||
          staff.payrollHistory.some((entry) =>
            currencyMatchesFilter(entry.currency || staff.currency, businessCurrencyFilter)
          )
      ),
    [businessCurrencyFilter, normalizedStaff]
  );

  const filteredStaff = currencyFilteredStaff.filter((staff) => {
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
    const active = currencyFilteredStaff.filter((staff) => staff.status === "Active").length;
    const monthlySalary = currencyFilteredStaff.reduce((sum, staff) => sum + parseNumber(staff.salary), 0);
    const paid = currencyFilteredStaff.reduce(
      (sum, staff) => sum + getPayrollPaidTotal(staff.payrollHistory),
      0
    );
    const payable = currencyFilteredStaff.reduce(
      (sum, staff) => sum + getPayrollPayableTotal(staff.payrollHistory),
      0
    );
    return { total: currencyFilteredStaff.length, active, monthlySalary, paid, payable };
  }, [currencyFilteredStaff]);
  const statCurrency = businessCurrencyFilter === "all" ? "AFN" : businessCurrencyFilter;

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
      joiningDate: staff.joiningDate || "",
      salaryType: staff.salaryType || "fixed",
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

  return (
    <div className="staff-page">
      <div className="staff-header">
        <div>
          <h1>Staff</h1>
          <p>Manage staff profiles, monthly salary, payroll payments and payable balances.</p>
        </div>
        <div className="staff-header-actions">
          <button type="button" className="staff-light-btn" onClick={() => setPrintReportOpen(true)}>
            <Printer size={16} />
            Print Report
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
        <StatCard icon={DollarSign} label="Monthly Salary" value={formatCurrencyAmount(stats.monthlySalary, statCurrency)} />
        <StatCard icon={CreditCard} label="Paid Payroll" value={formatCurrencyAmount(stats.paid, statCurrency)} />
        <StatCard icon={WalletIcon} label="Payable" value={formatCurrencyAmount(stats.payable, statCurrency)} tone="warning" />
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
                <tr
                  key={staff.id || staff.name}
                  className="staff-click-row"
                  onClick={() => navigate(`/staff/${encodeURIComponent(String(staff.id || staff.staffId || staff.name))}`)}
                >
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
                  <td onClick={(event) => event.stopPropagation()}>
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
          customFields={staffCustomFields}
          initialStaff={editingStaff}
          phoneRules={phoneRules}
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
          settings={settings[0] || {}}
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

      {printReportOpen && (
        <StaffPrintStudio
          company={settings[0] || {}}
          staffMembers={filteredStaff}
          stats={stats}
          statCurrency={statCurrency}
          onClose={() => setPrintReportOpen(false)}
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

function StaffPrintStudio({ company, staffMembers, stats, statCurrency = "AFN", onClose }) {
  const reportRef = useRef(null);
  const saved = normalizePrintSettings(company.printSettings || {}, company);
  const [paper, setPaper] = useState(saved.paperSize || "A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState("normal");
  const [rowsPerPage, setRowsPerPage] = useState(Number(saved.rowsPerPage || 25));
  const [scale, setScale] = useState(73);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sizes, setSizes] = useState({ title: saved.titleSize, subtitle: saved.subtitleSize, header: saved.headerTextSize, body: saved.bodyTextSize, footer: saved.footerTextSize });
  const marginSize = { narrow: 7, normal: 14, wide: 22 }[margin];
  const basePaperSize = { A4: [210, 297], A5: [148, 210], Letter: [216, 279], Legal: [216, 356], T80: [80, 220], T58: [58, 190], Custom: [210, 297] }[paper] || [210, 297];
  const isThermal = paper === "T80" || paper === "T58";
  const paperSize = orientation === "landscape" && !isThermal ? [basePaperSize[1], basePaperSize[0]] : basePaperSize;
  const reportRows = staffMembers.slice(0, Math.max(1, rowsPerPage));
  const printNow = () => window.print();
  const exportPdf = async () => {
    if (!reportRef.current) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const originalScale = reportRef.current.style.getPropertyValue("--report-scale");
    reportRef.current.style.setProperty("--report-scale", "1");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const canvas = await html2canvas(reportRef.current, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
    reportRef.current.style.setProperty("--report-scale", originalScale || String(scale / 100));
    const pdf = new jsPDF({ orientation, unit: "mm", format: [paperSize[0], paperSize[1]], compress: true });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, paperSize[0], paperSize[1]);
    pdf.save("staff-report.pdf");
  };
  const exportExcel = () => {
    const headers = ["Name", "Role", "Department", "Type", "Salary", "Paid", "Payable", "Status"];
    const rows = staffMembers.map((staff) => [staff.name, staff.role, staff.department, staff.employmentType, formatCurrencyAmount(staff.salary, staff.currency), formatCurrencyAmount(getPayrollPaidTotal(staff.payrollHistory), staff.currency), formatCurrencyAmount(getPayrollPayableTotal(staff.payrollHistory), staff.currency), staff.status || "Active"]);
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const blob = new Blob([`\ufeff${[headers, ...rows].map((row) => row.map(quote).join(",")).join("\n")}`], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "staff-report.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="standard-print-backdrop">
      <style>{`@media print { @page { size: ${paperSize[0]}mm ${paperSize[1]}mm; margin: 0; } }`}</style>
      <section className="standard-print-studio">
        <header className="standard-print-toolbar">
          <div className="standard-print-titlebar">
            <button type="button" className={`standard-print-settings-toggle${settingsOpen ? " active" : ""}`} onClick={() => setSettingsOpen((current) => !current)} title="Print settings"><SlidersHorizontal size={17} /></button>
            <strong><Printer size={16} /> Staff Report</strong>
          </div>
          <div className="standard-print-toolbar-actions">
            <button type="button" onClick={() => setScale((value) => Math.max(55, value - 8))}>-</button><span>{scale}%</span><button type="button" onClick={() => setScale((value) => Math.min(110, value + 8))}>+</button>
            <button type="button" onClick={exportPdf}><FileDown size={15} /> PDF</button>
            <button type="button" onClick={exportExcel}><FileSpreadsheet size={15} /> Excel</button>
            <button type="button" className="primary" onClick={printNow}><Printer size={15} /> Print</button>
            <button type="button" className="close" onClick={onClose}><X size={17} /></button>
          </div>
        </header>
        <div className="standard-print-body">
          <aside className={`standard-print-controls${settingsOpen ? " open" : ""}`}>
            <div className="standard-print-controls-head"><strong>Print setup</strong><button type="button" onClick={() => setSettingsOpen(false)}><X size={15} /></button></div>
            <StandardControl title="Paper" values={["A4", "A5", "Letter", "Legal", "T80", "T58", "Custom"]} value={paper} onChange={setPaper} />
            <StandardControl title="Orientation" values={["Portrait", "Landscape"]} value={orientation === "portrait" ? "Portrait" : "Landscape"} onChange={(value) => setOrientation(value.toLowerCase())} />
            <StandardControl title="Page Margin" values={["Narrow", "Normal", "Wide"]} value={margin[0].toUpperCase() + margin.slice(1)} onChange={(value) => setMargin(value.toLowerCase())} />
            <h4>Rows / Page</h4><input type="number" min="5" max="100" value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value) || 5)} />
            <h4>Live Typography</h4>{Object.entries(sizes).map(([key, value]) => <label className="standard-print-range" key={key}><span>{key}<b>{value}px</b></span><input type="range" min="7" max={key === "title" ? 34 : 20} value={value} onChange={(event) => setSizes((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}
            <small>{paper} - {orientation} - {marginSize}mm</small>
          </aside>
          <main className="standard-print-canvas">
            <article ref={reportRef} className={`standard-report-paper ${orientation}${isThermal ? " thermal" : ""}`} style={{ width: `${paperSize[0]}mm`, minHeight: `${paperSize[1]}mm`, "--report-scale": scale / 100, "--report-margin": `${isThermal ? Math.min(marginSize, 5) : marginSize}mm`, "--report-primary": saved.primaryColor, "--report-accent": saved.accentColor, "--report-title": `${sizes.title}px`, "--report-subtitle": `${sizes.subtitle}px`, "--report-header": `${sizes.header}px`, "--report-body": `${sizes.body}px`, "--report-footer": `${sizes.footer}px` }}>
              <div className="standard-report-header">{saved.showLogo && saved.logo ? <img src={saved.logo} alt="" /> : <div className="standard-report-logo"><BriefcaseBusiness size={28} /></div>}<div><strong>{saved.businessNameEn}</strong><span>{saved.subtitleEn}</span></div><p>{[saved.phone, saved.email, saved.address].filter(Boolean).join(" - ")}</p></div>
              {(saved.watermark || saved.logo || defaultLogo) && <img className="standard-report-watermark" src={saved.watermark || saved.logo || defaultLogo} alt="" style={{ opacity: saved.watermark ? Number(saved.watermarkOpacity || 0) / 100 : 0.055 }} />}
              <div className="standard-report-heading"><div><small>REPORT</small><h1>Staff Report</h1><p>All filtered staff records</p></div><div><b>{new Date().toLocaleString()}</b><span>Records {staffMembers.length}</span><span>Page 1 of 1</span></div></div>
              <div className="standard-report-stats"><div><span>TOTAL STAFF</span><b>{stats.total}</b></div><div><span>PAID PAYROLL</span><b>{formatCurrencyAmount(stats.paid, statCurrency)}</b></div><div><span>PAYABLE</span><b>{formatCurrencyAmount(stats.payable, statCurrency)}</b></div></div>
              <p className="standard-report-contents">Contents: <span>1 - {Math.min(reportRows.length, staffMembers.length)} Records</span></p>
              <table data-table-enhancer="off"><thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Type</th><th>Salary</th><th>Paid</th><th>Payable</th><th>Status</th></tr></thead><tbody>{reportRows.map((staff) => <tr key={staff.id || staff.name}><td>{staff.name}</td><td>{staff.role || "-"}</td><td>{staff.department || "-"}</td><td>{staff.employmentType || "-"}</td><td>{formatCurrencyAmount(staff.salary, staff.currency)}</td><td>{formatCurrencyAmount(getPayrollPaidTotal(staff.payrollHistory), staff.currency)}</td><td>{formatCurrencyAmount(getPayrollPayableTotal(staff.payrollHistory), staff.currency)}</td><td>{staff.status || "Active"}</td></tr>)}</tbody></table>
              <footer><span>{saved.footerText || "Powered by Smart Office"}</span>{saved.showTimestamp && <span>{new Date().toLocaleString()}</span>}</footer>
            </article>
          </main>
        </div>
      </section>
    </div>
  );
}

function StandardControl({ title, values, value, onChange }) {
  return <><h4>{title}</h4><div className="standard-print-choices">{values.map((item) => <button type="button" className={value === item ? "active" : ""} key={item} onClick={() => onChange(item)}>{item}</button>)}</div></>;
}

function StaffModal({ customFields = [], initialStaff, onClose, onSave, phoneRules }) {
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
            <input inputMode="numeric" maxLength={phoneRules?.enabled ? phoneRules.maxLength : undefined} value={form.phone} onChange={(event) => update("phone", limitPhoneValue(event.target.value, phoneRules))} />
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
          <Field label="Joining Date">
            <input type="date" value={form.joiningDate || ""} onChange={(event) => update("joiningDate", event.target.value)} />
          </Field>
          <Field label="Salary Type">
            <CustomSelect
              ariaLabel="Salary type"
              options={[
                { value: "fixed", label: "Fixed Salary" },
                { value: "percentage", label: "Percentage Per Purchase" },
              ]}
              value={form.salaryType || "fixed"}
              onChange={(value) => update("salaryType", value)}
            />
          </Field>
          <Field label={(form.salaryType || "fixed") === "percentage" ? "Percentage Per Purchase" : "Monthly Salary"}>
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
          <CustomFormFields
            fields={customFields}
            values={form.customFields}
            fieldClassName="staff-form-field"
            onChange={(key, value) =>
              update("customFields", {
                ...(form.customFields || {}),
                [key]: value,
              })
            }
          />
        </div>

        <div className="staff-modal-actions">
          <button type="button" className="staff-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="staff-primary-btn">{initialStaff ? "Save Changes" : "Add Staff"}</button>
        </div>
      </form>
    </div>
  );
}

function PayrollModal({ staff, onClose, onSave, settings = {} }) {
  const today = new Date();
  const staffSalaryType = staff.salaryType || "fixed";
  const baseCurrency = settings.baseCurrency || "AFN";
  const exchangeRates = settings.exchangeRates || {};
  const [period, setPeriod] = useState("monthly");
  const [start, setStart] = useState(getMonthStart(today));
  const [end, setEnd] = useState(getMonthEnd(today));
  const [baseSalary, setBaseSalary] = useState(String(staff.salary || ""));
  const [saleAmount, setSaleAmount] = useState("");
  const [saleCurrency, setSaleCurrency] = useState(staff.currency || "AFN");
  const [currency, setCurrency] = useState(staff.currency || "AFN");
  const [todayRate, setTodayRate] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

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
  const suggested =
    earningCurrency === currency
      ? grossEarning
      : activeRate > 0
        ? grossEarning * activeRate
        : 0;
  const paidInEarningCurrency =
    earningCurrency === currency
      ? parseNumber(paidAmount)
      : activeRate > 0
        ? parseNumber(paidAmount) / activeRate
        : 0;
  const alreadyPaid = (staff.payrollHistory || [])
    .filter((entry) => entry.start === start && entry.end === end)
    .reduce((sum, entry) => sum + parseNumber(entry.paidAmountBase ?? entry.paidAmount), 0);
  const maxPayable = Math.max(0, suggested - (earningCurrency === currency ? alreadyPaid : alreadyPaid * activeRate));
  const paidValue = parseNumber(paidAmount);
  const paidTooHigh = paidValue > maxPayable;
  const canSave = paidValue > 0 && !paidTooHigh && suggested > 0;

  useEffect(() => {
    setPaidAmount(String(roundMoney(suggested)));
  }, [suggested]);

  useEffect(() => {
    if (earningCurrency !== currency && configuredRate > 0) {
      setTodayRate(String(roundMoney(configuredRate)));
    }
  }, [configuredRate, currency, earningCurrency]);

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
            salaryType: staffSalaryType,
            percentageRate: staffSalaryType === "percentage" ? percentageRate : 0,
            saleAmount: roundMoney(saleAmount),
            saleCurrency,
            earningCurrency,
            exchangeRate: earningCurrency === currency ? 1 : activeRate,
            currency,
            suggested: roundMoney(suggested),
            paidAmount: roundMoney(paidAmount),
            paidAmountBase: roundMoney(paidInEarningCurrency),
            staffCurrency: earningCurrency,
            payable: roundMoney(Math.max(0, (grossEarning - alreadyPaid) - paidInEarningCurrency)),
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
          <Field label={staffSalaryType === "percentage" ? "Percentage Per Purchase" : "Base Salary"}>
            <input value={baseSalary} onChange={(event) => setBaseSalary(event.target.value)} />
          </Field>
          {staffSalaryType === "percentage" && (
            <>
              <Field label="Sales Amount">
                <input value={saleAmount} onChange={(event) => setSaleAmount(event.target.value)} />
              </Field>
              <Field label="Sales Currency">
                <CustomSelect
                  ariaLabel="Sales currency"
                  options={currencies.map((item) => ({ value: item.code, label: `${item.symbol} ${item.code}` }))}
                  value={saleCurrency}
                  onChange={setSaleCurrency}
                />
              </Field>
            </>
          )}
          <Field label="Payment Currency">
            <CustomSelect
              ariaLabel="Currency"
              options={currencies.map((item) => ({ value: item.code, label: `${item.symbol} ${item.code}` }))}
              value={currency}
              onChange={setCurrency}
            />
          </Field>
          {earningCurrency !== currency && (
            <Field label={`Today Rate (1 ${earningCurrency} = ? ${currency})`} invalid={activeRate <= 0}>
              <input value={todayRate} onChange={(event) => setTodayRate(event.target.value)} />
            </Field>
          )}
          <Field label="Staff Share">
            <input readOnly value={formatCurrencyAmount(grossEarning, earningCurrency)} />
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
          <div><span>{staffSalaryType === "percentage" ? "Sales Amount" : "Suggested"}</span><strong>{staffSalaryType === "percentage" ? formatCurrencyAmount(parseNumber(saleAmount), saleCurrency) : formatCurrencyAmount(suggested, currency)}</strong></div>
          <div><span>Staff Right</span><strong>{formatCurrencyAmount(suggested, currency)}</strong></div>
          <div><span>Already Paid</span><strong>{formatCurrencyAmount(earningCurrency === currency ? alreadyPaid : alreadyPaid * activeRate, currency)}</strong></div>
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
