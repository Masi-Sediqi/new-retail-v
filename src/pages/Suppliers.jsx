import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  DollarSign,
  Eye,
  History,
  MinusCircle,
  Plus,
  PlusCircle,
  Printer,
  ReceiptText,
  Search,
  SquarePen,
  Trash2,
  Truck,
  WalletCards,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import CustomFormFields from "../components/CustomFormFields";
import FloatingActionMenu from "../components/FloatingActionMenu";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import { createRecycleEntry } from "../utils/recycleBin";
import "./Suppliers.css";

const emptySupplier = {
  accountType: "supplier",
  name: "",
  supplierName: "",
  phone: "",
  email: "",
  businessType: "",
  address: "",
  currency: "AFN",
  items: [],
  partnerContribution: "",
  partnerPercent: "",
  monthlyInvestment: "",
  investmentReturnPercent: "",
  notes: "",
  balance: "",
  status: "Active",
  customFields: {},
};

const currencyCodes = ["AFN", "USD", "EUR", "GBP", "SAR", "PKR", "INR", "IRR", "AED", "CNY"];

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;
const todayInput = () => new Date().toISOString().slice(0, 10);
const parseDateInput = (value) => (value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : null);

const getSupplierName = (supplier) =>
  supplier.name ||
  supplier.supplierName ||
  supplier.companyName ||
  supplier.contactPerson ||
  "Unnamed Supplier";

const getSupplierKey = (supplier) => String(supplier.id || supplier.supplierId || getSupplierName(supplier));

const getDateLabel = (value) => {
  const date = parseDateInput(value);
  return date
    ? date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
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

const getDateMatches = (dateValue, filter, start, end) => {
  if (filter === "all" || !dateValue) return true;
  const date = parseDateInput(dateValue);
  if (!date) return true;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const daysOld = Math.floor((now - target) / 86400000);

  if (filter === "today") return daysOld === 0;
  if (filter === "weekly") return daysOld >= 0 && daysOld <= 7;
  if (filter === "monthly") return daysOld >= 0 && daysOld <= 31;
  if (filter === "annual") return daysOld >= 0 && daysOld <= 366;
  if (filter === "custom") {
    const startDate = parseDateInput(start);
    const endDate = end ? new Date(`${end}T23:59:59`) : null;
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  }
  return true;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function Suppliers() {
  const [suppliers, setSuppliers] = useJsonCollection("suppliers");
  const [godownEntries, setGodownEntries] = useJsonCollection("godownEntries");
  const [products] = useJsonCollection("products");
  const [settings] = useJsonCollection("settings");
  const [, setTransactions] = useJsonCollection("transactions");
  const [, setDeletedItems] = useJsonCollection("deletedItems");

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";
  const supplierCustomFields = company.customFields?.suppliers || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);
  const [portalSupplierId, setPortalSupplierId] = useState("");
  const [portalTab, setPortalTab] = useState("ledger");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [portalDateFilter, setPortalDateFilter] = useState("all");
  const [portalCustomStart, setPortalCustomStart] = useState("");
  const [portalCustomEnd, setPortalCustomEnd] = useState("");
  const [editingLedgerRow, setEditingLedgerRow] = useState(null);
  const [deletingLedgerRow, setDeletingLedgerRow] = useState(null);

  const normalizedSuppliers = useMemo(
    () =>
      suppliers.map((supplier) => {
        const items = Array.isArray(supplier.items)
          ? supplier.items
          : String(supplier.items || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        return {
          ...emptySupplier,
          ...supplier,
          id: supplier.id || supplier.supplierId || `supplier-${getSupplierName(supplier)}`,
          name: getSupplierName(supplier),
          supplierName: getSupplierName(supplier),
          accountType: supplier.accountType || "supplier",
          currency: supplier.currency || baseCurrency,
          items,
        };
      }),
    [baseCurrency, suppliers]
  );

  const supplierRows = useMemo(
    () =>
      godownEntries.flatMap((entry) => {
        const rows = Array.isArray(entry.rows) ? entry.rows : [];
        return rows.map((row) => {
          const total = parseNumber(row.total) || parseNumber(row.quantity) * parseNumber(row.purchase);
          const paidShare = row.paid !== undefined
            ? parseNumber(row.paid)
            : parseNumber(entry.paid) / Math.max(1, rows.length);
          const product = products.find((item) => String(item.id) === String(row.productId));
          const stockLeft = parseNumber(product?.quantity ?? row.quantity);
          const sold = Math.max(0, parseNumber(row.quantity) - stockLeft);
          return {
            ...row,
            currency: row.currency || entry.currency || baseCurrency,
            date: row.date || entry.date || entry.createdAt || todayInput(),
            entryId: entry.id,
            id: `${entry.id}-${row.id || row.productId || row.code || row.name}`,
            rowId: row.id || row.productId || row.code || row.name,
            paid: Math.min(total, paidShare),
            remaining: Math.max(0, total - paidShare),
            sold,
            supplierId: row.supplierId || entry.supplierId || "",
            total,
          };
        });
      }),
    [baseCurrency, godownEntries, products]
  );

  const supplierAdjustments = useMemo(
    () =>
      godownEntries.flatMap((entry) =>
        (entry.adjustments || []).map((adjustment) => ({
          ...adjustment,
          date: adjustment.date || entry.date || entry.createdAt?.slice(0, 10) || todayInput(),
        }))
      ),
    [godownEntries]
  );

  const supplierStats = useMemo(() => {
    const stats = new Map();
    normalizedSuppliers.forEach((supplier) => {
      stats.set(getSupplierKey(supplier), {
        adjustmentBalance: 0,
        balance: parseNumber(supplier.balance),
        entries: [],
        lastDate: supplier.createdAt?.slice(0, 10) || supplier.date || todayInput(),
        profit: 0,
        purchaseValue: 0,
        supplier,
      });
    });

    supplierRows.forEach((row) => {
      const stat = stats.get(String(row.supplierId));
      if (!stat) return;
      stat.entries.push(row);
      stat.purchaseValue += parseNumber(row.total);
      stat.profit += Math.max(0, parseNumber(row.selling) - parseNumber(row.purchase)) * parseNumber(row.quantity);
      if (String(row.date) > String(stat.lastDate)) stat.lastDate = row.date;
    });

    supplierAdjustments.forEach((adjustment) => {
      const stat = stats.get(String(adjustment.supplierId));
      if (!stat) return;
      stat.adjustmentBalance += Number.isFinite(Number(adjustment.balanceDelta))
        ? parseNumber(adjustment.balanceDelta)
        : adjustment.type === "debit"
          ? -parseNumber(adjustment.amount)
          : parseNumber(adjustment.amount);
      if (String(adjustment.date) > String(stat.lastDate)) stat.lastDate = adjustment.date;
    });

    stats.forEach((stat) => {
      const entryBalance = stat.entries.reduce((sum, row) => sum + parseNumber(row.remaining), 0);
      stat.balance = parseNumber(stat.supplier.balance) + entryBalance + stat.adjustmentBalance;
      stat.statusKey = stat.balance > 0 ? "payable" : stat.balance < 0 ? "receivable" : "settled";
    });

    return stats;
  }, [normalizedSuppliers, supplierAdjustments, supplierRows]);

  const typedSuppliers = normalizedSuppliers.filter(
    (supplier) =>
      !supplier.accountType ||
      supplier.accountType === "supplier"
  );
  const filteredSuppliers = typedSuppliers.filter((supplier) => {
    const stat = supplierStats.get(getSupplierKey(supplier));
    const query = search.trim().toLowerCase();
    const text = [
      supplier.name,
      supplier.phone,
      supplier.email,
      supplier.address,
      supplier.currency,
      supplier.businessType,
      supplier.items.join(" "),
      supplier.partnerContribution,
      supplier.partnerPercent,
      supplier.monthlyInvestment,
      supplier.investmentReturnPercent,
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query || text.includes(query);
    const matchesBalance = balanceFilter === "all" || stat?.statusKey === balanceFilter;
    const matchesDate = getDateMatches(stat?.lastDate, dateFilter, customStart, customEnd);
    return matchesSearch && matchesBalance && matchesDate;
  });

  const pagination = useTablePagination(
    filteredSuppliers,
    `${search}-${balanceFilter}-${dateFilter}-${customStart}-${customEnd}`
  );
  const portalSupplier = normalizedSuppliers.find((supplier) => String(supplier.id) === String(portalSupplierId));
  const activeStats = typedSuppliers.map((supplier) => supplierStats.get(getSupplierKey(supplier))).filter(Boolean);
  const totalPayables = activeStats.reduce((sum, stat) => sum + Math.max(0, stat.balance), 0);
  const totalReceivables = activeStats.reduce((sum, stat) => sum + Math.max(0, -stat.balance), 0);
  const purchaseValue = activeStats.reduce((sum, stat) => sum + stat.purchaseValue, 0);
  const netBalance = totalPayables - totalReceivables;

  const saveSupplier = async (supplier) => {
    const cleanSupplier = {
      ...supplier,
      id: supplier.id || `supplier-${crypto.randomUUID()}`,
      name: supplier.name.trim(),
      supplierName: supplier.name.trim(),
      phone: supplier.phone.trim(),
      email: supplier.email.trim(),
      address: supplier.address.trim(),
      businessType: supplier.businessType.trim(),
      balance: roundMoney(supplier.balance),
      openingBalance: roundMoney(supplier.openingBalance ?? supplier.balance),
      status: supplier.status || "Active",
      updatedAt: new Date().toISOString(),
      createdAt: supplier.createdAt || new Date().toISOString(),
    };

    if (!cleanSupplier.name) {
      notify("Please enter supplier name.", "error");
      return;
    }

    const saved = await setSuppliers((current) => {
      const exists = current.some((item) => String(item.id || item.supplierId) === String(cleanSupplier.id));
      return exists
        ? current.map((item) => (String(item.id || item.supplierId) === String(cleanSupplier.id) ? cleanSupplier : item))
        : [cleanSupplier, ...current];
    });

    if (!saved) return;
    notify(editingSupplier ? "Supplier updated successfully." : "Supplier saved successfully.");
    setModalOpen(false);
    setEditingSupplier(null);
  };

  const removeSupplier = async () => {
    if (!deleteSupplier) return;
    const archived = await setDeletedItems((current) => [
      createRecycleEntry("suppliers", deleteSupplier, deleteSupplier.name || deleteSupplier.supplierName),
      ...current,
    ]);
    if (!archived) return;

    const saved = await setSuppliers((current) =>
      current.filter((supplier) => String(supplier.id || supplier.supplierId) !== String(deleteSupplier.id))
    );
    if (!saved) return;
    notify("Supplier deleted successfully.");
    setDeleteSupplier(null);
    if (portalSupplierId === deleteSupplier.id) setPortalSupplierId("");
  };

  const saveAdjustment = async (adjustment) => {
    if (!portalSupplier) return;
    const record = {
      ...adjustment,
      balanceDelta: adjustment.type === "debit" ? -parseNumber(adjustment.amount) : parseNumber(adjustment.amount),
      createdAt: new Date().toISOString(),
      date: todayInput(),
      id: `adjustment-${crypto.randomUUID()}`,
      supplierId: portalSupplier.id,
    };

    const entrySaved = await setGodownEntries((current) => [
      {
        adjustments: [record],
        createdAt: record.createdAt,
        currency: record.currency,
        date: record.date,
        id: `supplier-adjustment-${record.id}`,
        paid: 0,
        remaining: 0,
        rows: [],
        supplierId: portalSupplier.id,
        total: 0,
        type: "supplier-adjustment",
      },
      ...current,
    ]);
    if (!entrySaved) return;

    await setTransactions((current) => [
      {
        id: `supplier-${record.id}`,
        type: record.type === "debit" ? "expense" : "income",
        transactionType: record.type === "debit" ? "withdraw" : "deposit",
        title: `${record.type === "debit" ? "Supplier debit" : "Supplier credit"} - ${portalSupplier.name}`,
        amount: roundMoney(record.amount),
        date: record.date,
        description: record.reason,
        source: "cash-wallet",
        referenceSource: "supplier-adjustment",
        category: "Cash Wallet",
        referenceId: portalSupplier.id,
        currency: record.currency,
      },
      ...current,
    ]);

    notify("Adjustment saved successfully.");
    setAdjustmentOpen(false);
  };

  const saveLedgerRow = async (form) => {
    if (!editingLedgerRow) return;
    const paidAmount = roundMoney(form.paid);
    const amount = roundMoney(form.amount);
    if (paidAmount < 0 || amount < 0) {
      notify("Amount cannot be negative.", "error");
      return;
    }
    if (editingLedgerRow.kind === "purchase" && paidAmount > amount) {
      notify("Paid amount cannot be greater than total amount.", "error");
      return;
    }

    const saved = await setGodownEntries((current) =>
      current.map((entry) => {
        if (editingLedgerRow.kind === "adjustment") {
          const adjustments = (entry.adjustments || []).map((adjustment) =>
            String(adjustment.id) === String(editingLedgerRow.sourceId)
              ? {
                  ...adjustment,
                  amount,
                  balanceDelta:
                    adjustment.type === "debit" ? -amount : amount,
                  currency: form.currency,
                  date: form.date,
                  reason: form.description.trim(),
                  updatedAt: new Date().toISOString(),
                }
              : adjustment
          );
          return adjustments === entry.adjustments ? entry : { ...entry, adjustments };
        }

        if (String(entry.id) !== String(editingLedgerRow.entryId)) return entry;
        const rows = Array.isArray(entry.rows) ? entry.rows : [];
        const nextRows = rows.map((row) => {
          const rowId = row.id || row.productId || row.code || row.name;
          if (String(rowId) !== String(editingLedgerRow.rowId)) return row;
          return {
            ...row,
            currency: form.currency,
            date: form.date,
            name: form.description.trim() || row.name,
            paid: paidAmount,
            remaining: Math.max(0, amount - paidAmount),
            total: amount,
          };
        });
        return {
          ...entry,
          paid: nextRows.reduce((sum, row) => sum + parseNumber(row.paid), 0),
          remaining: nextRows.reduce((sum, row) => sum + parseNumber(row.remaining), 0),
          rows: nextRows,
          total: nextRows.reduce((sum, row) => sum + parseNumber(row.total), 0),
          updatedAt: new Date().toISOString(),
        };
      })
    );
    if (!saved) return;

    if (editingLedgerRow.kind === "adjustment") {
      await setTransactions((current) =>
        current.map((transaction) =>
          String(transaction.id) === `supplier-${editingLedgerRow.sourceId}`
            ? {
                ...transaction,
                amount,
                currency: form.currency,
                date: form.date,
                description: form.description.trim(),
                updatedAt: new Date().toISOString(),
              }
            : transaction
        )
      );
    }

    notify("Ledger record updated successfully.");
    setEditingLedgerRow(null);
  };

  const deleteLedgerRow = async () => {
    if (!deletingLedgerRow) return;
    const saved = await setGodownEntries((current) =>
      current
        .map((entry) => {
          if (deletingLedgerRow.kind === "adjustment") {
            const adjustments = (entry.adjustments || []).filter(
              (adjustment) =>
                String(adjustment.id) !== String(deletingLedgerRow.sourceId)
            );
            return { ...entry, adjustments };
          }
          if (String(entry.id) !== String(deletingLedgerRow.entryId)) return entry;
          const rows = (entry.rows || []).filter((row) => {
            const rowId = row.id || row.productId || row.code || row.name;
            return String(rowId) !== String(deletingLedgerRow.rowId);
          });
          return {
            ...entry,
            paid: rows.reduce((sum, row) => sum + parseNumber(row.paid), 0),
            remaining: rows.reduce((sum, row) => sum + parseNumber(row.remaining), 0),
            rows,
            total: rows.reduce((sum, row) => sum + parseNumber(row.total), 0),
            updatedAt: new Date().toISOString(),
          };
        })
        .filter((entry) =>
          deletingLedgerRow.kind === "adjustment"
            ? (entry.adjustments || []).length || (entry.rows || []).length
            : (entry.rows || []).length || (entry.adjustments || []).length
        )
    );
    if (!saved) return;

    if (deletingLedgerRow.kind === "adjustment") {
      await setTransactions((current) =>
        current.filter(
          (transaction) =>
            String(transaction.id) !== `supplier-${deletingLedgerRow.sourceId}`
        )
      );
    }

    notify("Ledger record deleted successfully.");
    setDeletingLedgerRow(null);
  };

  const printReport = () => {
    printRows(
      "Supplier Report",
      filteredSuppliers.map((supplier) => {
        const stat = supplierStats.get(getSupplierKey(supplier));
        return {
          Name: supplier.name,
          Phone: supplier.phone || "-",
          Currency: supplier.currency,
          Purchases: formatCurrencyAmount(stat?.purchaseValue || 0, supplier.currency),
          Payable: formatCurrencyAmount(Math.max(0, stat?.balance || 0), supplier.currency),
          Receivable: formatCurrencyAmount(Math.max(0, -(stat?.balance || 0)), supplier.currency),
          Status: stat?.statusKey || "settled",
        };
      })
    );
  };

  if (portalSupplier) {
    return (
      <SupplierPortal
        adjustments={supplierAdjustments}
        baseCurrency={baseCurrency}
        dateFilter={portalDateFilter}
        entries={supplierStats.get(getSupplierKey(portalSupplier))?.entries || []}
        onAdjust={() => setAdjustmentOpen(true)}
        onBack={() => setPortalSupplierId("")}
        onDateFilter={setPortalDateFilter}
        onEdit={() => {
          setEditingSupplier(portalSupplier);
          setModalOpen(true);
        }}
        onDeleteLedgerRow={setDeletingLedgerRow}
        onEditLedgerRow={setEditingLedgerRow}
        onRangeChange={({ start, end }) => {
          setPortalCustomStart(start);
          setPortalCustomEnd(end);
        }}
        portalCustomEnd={portalCustomEnd}
        portalCustomStart={portalCustomStart}
        portalTab={portalTab}
        setPortalTab={setPortalTab}
        stat={supplierStats.get(getSupplierKey(portalSupplier))}
        supplier={portalSupplier}
      >
        {modalOpen && (
          <SupplierModal
            customFields={supplierCustomFields}
            initialSupplier={editingSupplier}
            onClose={() => {
              setModalOpen(false);
              setEditingSupplier(null);
            }}
            onSave={saveSupplier}
          />
        )}
        {adjustmentOpen && (
          <AdjustmentModal
            baseCurrency={baseCurrency}
            onClose={() => setAdjustmentOpen(false)}
            onSave={saveAdjustment}
            supplier={portalSupplier}
          />
        )}
        {editingLedgerRow && (
          <LedgerRecordModal
            initialRow={editingLedgerRow}
            onClose={() => setEditingLedgerRow(null)}
            onSave={saveLedgerRow}
          />
        )}
        {deletingLedgerRow && (
          <ConfirmModal
            title="Delete Ledger Record"
            message={`Delete ${deletingLedgerRow.description}? This record will be removed from the supplier ledger.`}
            onClose={() => setDeletingLedgerRow(null)}
            onConfirm={deleteLedgerRow}
          />
        )}
      </SupplierPortal>
    );
  }

  return (
    <div className="suppliers-page">
      <div className="suppliers-header">
        <div>
          <h1>Suppliers</h1>
          <p>
  Manage supplier accounts, purchases, balances and ledgers.
</p>
        </div>
        <div className="suppliers-header-actions">
          <button type="button" className="supplier-light-btn" onClick={printReport}>
            <Printer size={16} />
            Print
          </button>
          <button type="button" className="supplier-primary-btn" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Create Account
          </button>
        </div>
      </div>

      <section className="supplier-stats">
        <StatCard icon={Truck} label="Accounts" value={typedSuppliers.length} />
        <StatCard icon={ReceiptText} label="Purchase Value" value={formatCurrencyAmount(purchaseValue, baseCurrency)} />
        <StatCard icon={WalletCards} label="Payables" value={formatCurrencyAmount(totalPayables, baseCurrency)} tone="warning" />
        <StatCard icon={DollarSign} label="Receivables" value={formatCurrencyAmount(totalReceivables, baseCurrency)} tone="success" />
        <StatCard icon={BarChart3} label="Net Balance" value={formatCurrencyAmount(netBalance, baseCurrency)} />
      </section>

      <section className="supplier-card">
        <div className="supplier-toolbar">
          <label className="supplier-search">
            <Search size={16} />
            <input placeholder="Search suppliers..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <CustomSelect
            ariaLabel="Balance filter"
            options={[
              { value: "all", label: "All balances" },
              { value: "payable", label: "Payable" },
              { value: "receivable", label: "Receivable" },
              { value: "settled", label: "Settled" },
            ]}
            value={balanceFilter}
            onChange={setBalanceFilter}
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
            <div className="supplier-inline-dates">
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
            </div>
          )}
        </div>

        <div className="supplier-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Items</th>
                <th>Purchases</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((supplier) => {
                const stat = supplierStats.get(getSupplierKey(supplier));
                return (
                  <tr key={supplier.id}>
                    <td className="supplier-name-cell">
                      <strong>{supplier.name}</strong>
                      <span>{supplier.businessType || "Supplier"}</span>
                    </td>
                    <td><span>{supplier.phone || "-"}</span><small>{supplier.email || supplier.address || "No contact"}</small></td>
                    <td>{supplier.items?.length ? supplier.items.slice(0, 2).join(", ") : "-"}</td>
                    <td>{formatCurrencyAmount(stat?.purchaseValue || 0, supplier.currency)}</td>
                    <td className={stat?.balance > 0 ? "supplier-warning-text" : stat?.balance < 0 ? "supplier-success-text" : ""}>
                      {formatCurrencyAmount(Math.abs(stat?.balance || 0), supplier.currency)}
                    </td>
                    <td><span className={`supplier-status ${stat?.statusKey || "settled"}`}>{stat?.statusKey || "settled"}</span></td>
                    <td>{getDateLabel(stat?.lastDate)}</td>
                    <td>
                      <FloatingActionMenu
                        ariaLabel="Supplier actions"
                        actions={[
                          { icon: <Eye size={15} />, label: "View Profile", onClick: () => setPortalSupplierId(supplier.id) },
                          {
                            icon: <SquarePen size={15} />,
                            label: "Edit",
                            onClick: () => {
                              setEditingSupplier(supplier);
                              setModalOpen(true);
                            },
                          },
                          { danger: true, icon: <Trash2 size={15} />, label: "Delete", onClick: () => setDeleteSupplier(supplier) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
              {!filteredSuppliers.length && (
                <tr>
                  <td className="supplier-empty" colSpan="8">No supplier account has been registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={filteredSuppliers.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
        />
      </section>

      {modalOpen && (
        <SupplierModal
          customFields={supplierCustomFields}
          initialSupplier={editingSupplier}
          onClose={() => {
            setModalOpen(false);
            setEditingSupplier(null);
          }}
          onSave={saveSupplier}
        />
      )}
      {deleteSupplier && (
        <ConfirmModal
          title="Delete Supplier"
          message={`Delete ${deleteSupplier.name}? Ledger history will remain in purchase records.`}
          onClose={() => setDeleteSupplier(null)}
          onConfirm={removeSupplier}
        />
      )}
    </div>
  );
}

function SupplierPortal({
  adjustments,
  baseCurrency,
  children,
  dateFilter,
  entries,
  onAdjust,
  onBack,
  onDeleteLedgerRow,
  onDateFilter,
  onEdit,
  onEditLedgerRow,
  onRangeChange,
  portalCustomEnd,
  portalCustomStart,
  portalTab,
  setPortalTab,
  stat,
  supplier,
}) {
  const filteredEntries = entries.filter((entry) => getDateMatches(entry.date, dateFilter, portalCustomStart, portalCustomEnd));
  const filteredAdjustments = adjustments
    .filter((adjustment) => String(adjustment.supplierId) === String(supplier.id))
    .filter((adjustment) => getDateMatches(adjustment.date, dateFilter, portalCustomStart, portalCustomEnd));
  const openingBalance = parseNumber(supplier.openingBalance ?? supplier.balance);
  const openingCurrency = supplier.currency || baseCurrency;

  const ledgerRows = [
    ...(openingBalance
      ? [
        {
          id: "opening",
          date: getDateLabel(supplier.createdAt?.slice(0, 10) || todayInput()),
          rawDate: supplier.createdAt?.slice(0, 10) || todayInput(),
          description: "Opening Balance",
          deposit: openingBalance < 0 ? formatCurrencyAmount(Math.abs(openingBalance), openingCurrency) : "-",
          withdraw: openingBalance > 0 ? formatCurrencyAmount(openingBalance, openingCurrency) : "-",
          balance: formatCurrencyAmount(openingBalance, openingCurrency),
          currency: openingCurrency,
          paid: "-",
        },
      ]
      : []),
    ...filteredEntries.map((entry) => ({
      id: entry.id,
      date: getDateLabel(entry.date),
      rawDate: entry.date,
      description: `${entry.name} (${entry.quantity} ${entry.unit || "Piece"})`,
      deposit: "-",
      withdraw: formatCurrencyAmount(entry.total, entry.currency || openingCurrency),
      paid: formatCurrencyAmount(entry.paid, entry.currency || openingCurrency),
      balance: formatCurrencyAmount(entry.remaining, entry.currency || openingCurrency),
      currency: entry.currency || openingCurrency,
      kind: "purchase",
      amount: entry.total,
      paidAmount: entry.paid,
      entryId: entry.entryId,
      rowId: entry.rowId,
      sourceId: entry.id,
    })),
    ...filteredAdjustments.map((adjustment) => ({
      id: adjustment.id,
      date: getDateLabel(adjustment.date),
      rawDate: adjustment.date,
      description: adjustment.reason,
      deposit: adjustment.type === "credit" ? formatCurrencyAmount(adjustment.amount, adjustment.currency || openingCurrency) : "-",
      withdraw: adjustment.type === "debit" ? formatCurrencyAmount(adjustment.amount, adjustment.currency || openingCurrency) : "-",
      paid: adjustment.type === "debit" ? formatCurrencyAmount(adjustment.amount, adjustment.currency || openingCurrency) : "-",
      balance: formatCurrencyAmount(adjustment.balanceDelta || 0, adjustment.currency || openingCurrency),
      currency: adjustment.currency || openingCurrency,
      kind: "adjustment",
      amount: adjustment.amount,
      paidAmount: adjustment.type === "debit" ? adjustment.amount : 0,
      sourceId: adjustment.id,
    })),
  ].sort((a, b) => String(a.rawDate).localeCompare(String(b.rawDate)));

  const purchaseValue = filteredEntries.reduce((sum, entry) => sum + parseNumber(entry.total), 0);
  const paid = filteredEntries.reduce((sum, entry) => sum + parseNumber(entry.paid), 0);
  const adjustmentBalance = filteredAdjustments.reduce(
    (sum, adjustment) => sum + (Number.isFinite(Number(adjustment.balanceDelta))
      ? parseNumber(adjustment.balanceDelta)
      : adjustment.type === "debit"
        ? -parseNumber(adjustment.amount)
        : parseNumber(adjustment.amount)),
    0
  );
  const remaining = parseNumber(supplier.balance) +
    filteredEntries.reduce((sum, entry) => sum + parseNumber(entry.remaining), 0) +
    adjustmentBalance;
  const profit = filteredEntries.reduce((sum, entry) => sum + Math.max(0, parseNumber(entry.selling) - parseNumber(entry.purchase)) * parseNumber(entry.quantity), 0);

  const printPortal = () => {
    const rows =
      portalTab === "goods"
        ? filteredEntries.map((entry) => ({
          Product: entry.name,
          Quantity: `${entry.quantity} ${entry.unit || "Piece"}`,
          Purchase: formatCurrencyAmount(entry.purchase, entry.currency || openingCurrency),
          Total: formatCurrencyAmount(entry.total, entry.currency || openingCurrency),
          Date: getDateLabel(entry.date),
        }))
        : portalTab === "profit"
          ? filteredEntries.map((entry) => ({
            Product: entry.name,
            Purchase: formatCurrencyAmount(entry.purchase, entry.currency || openingCurrency),
            Selling: formatCurrencyAmount(entry.selling, entry.currency || openingCurrency),
            Profit: formatCurrencyAmount(Math.max(0, parseNumber(entry.selling) - parseNumber(entry.purchase)) * parseNumber(entry.quantity), entry.currency || openingCurrency),
            Date: getDateLabel(entry.date),
          }))
          : ledgerRows.map((row) => ({
            Date: row.date,
            Description: row.description,
            Deposit: row.deposit,
            Withdraw: row.withdraw,
            Paid: row.paid,
            Balance: row.balance,
            Currency: row.currency,
          }));
    printRows(`${supplier.name} - ${portalTab}`, rows);
  };

  return (
    <div className="suppliers-page supplier-portal-page">
      <div className="supplier-portal-head">
        <button type="button" className="supplier-back-btn" onClick={onBack}><ChevronLeft size={19} /></button>
        <div className="supplier-avatar"><Truck size={25} /></div>
        <div>
          <h1>{supplier.name}</h1>
          <p>{[supplier.phone, supplier.businessType, supplier.currency].filter(Boolean).join(" / ")}</p>
        </div>
        <div className="supplier-portal-actions">
          <button type="button" className="supplier-light-btn" onClick={onEdit}><SquarePen size={16} /> Edit</button>
          <button type="button" className="supplier-light-btn" onClick={onAdjust}><PlusCircle size={16} /> Adjustment</button>
          <button type="button" className="supplier-primary-btn" onClick={printPortal}><Printer size={16} /> Print</button>
        </div>
      </div>

      <section className="supplier-stats">
        <StatCard icon={ReceiptText} label="Purchase Value" value={formatCurrencyAmount(purchaseValue, supplier.currency)} />
        <StatCard icon={DollarSign} label="Paid" value={formatCurrencyAmount(paid, supplier.currency)} tone="success" />
        <StatCard icon={WalletCards} label="Remaining" value={formatCurrencyAmount(remaining, supplier.currency)} tone="warning" />
        <StatCard icon={BarChart3} label="Profit" value={formatCurrencyAmount(profit, supplier.currency)} />
        <StatCard icon={History} label="Net Balance" value={formatCurrencyAmount(Math.abs(stat?.balance || 0), supplier.currency)} />
      </section>

      <section className="supplier-card">
        <div className="supplier-portal-filter">
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
            onChange={onDateFilter}
          />
          {dateFilter === "custom" && (
            <div className="supplier-inline-dates">
              <input type="date" value={portalCustomStart} onChange={(event) => onRangeChange({ start: event.target.value, end: portalCustomEnd })} />
              <input type="date" value={portalCustomEnd} onChange={(event) => onRangeChange({ start: portalCustomStart, end: event.target.value })} />
            </div>
          )}
        </div>
        <div className="supplier-profile-tabs">
          {[
            { id: "ledger", icon: WalletCards, label: "Supplier Ledger" },
            { id: "goods", icon: ReceiptText, label: "Goods" },
            { id: "profit", icon: BarChart3, label: "Profit" },
            { id: "activity", icon: History, label: "Activity Log" },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button className={portalTab === tab.id ? "active" : ""} key={tab.id} type="button" onClick={() => setPortalTab(tab.id)}>
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
        <SupplierPortalPanel
          entries={filteredEntries}
          ledgerRows={ledgerRows}
          onDeleteLedgerRow={onDeleteLedgerRow}
          onEditLedgerRow={onEditLedgerRow}
          openingCurrency={openingCurrency}
          portalTab={portalTab}
        />
      </section>
      {children}
    </div>
  );
}

function SupplierPortalPanel({
  entries,
  ledgerRows,
  onDeleteLedgerRow,
  onEditLedgerRow,
  openingCurrency,
  portalTab,
}) {
  if (portalTab === "goods") {
    return (
      <SupplierTable
        columns={["Date", "Product", "Quantity", "Purchase", "Total", "Paid", "Remaining"]}
        empty="No goods recorded yet."
        rows={entries.map((entry) => [
          <span key="date">{getDateLabel(entry.date)}<small>{getShamsiLabel(entry.date)}</small></span>,
          entry.name,
          `${entry.quantity} ${entry.unit || "Piece"}`,
          formatCurrencyAmount(entry.purchase, entry.currency || openingCurrency),
          formatCurrencyAmount(entry.total, entry.currency || openingCurrency),
          formatCurrencyAmount(entry.paid, entry.currency || openingCurrency),
          <span className="supplier-warning-text" key="remaining">{formatCurrencyAmount(entry.remaining, entry.currency || openingCurrency)}</span>,
        ])}
      />
    );
  }

  if (portalTab === "profit") {
    return (
      <SupplierTable
        columns={["Product", "Qty", "Purchase", "Selling", "Profit"]}
        empty="No profit records."
        rows={entries.map((entry) => {
          const profit = Math.max(0, parseNumber(entry.selling) - parseNumber(entry.purchase)) * parseNumber(entry.quantity);
          return [
            entry.name,
            `${entry.quantity} ${entry.unit || "Piece"}`,
            formatCurrencyAmount(entry.purchase, entry.currency || openingCurrency),
            formatCurrencyAmount(entry.selling, entry.currency || openingCurrency),
            <span className="supplier-success-text" key="profit">{formatCurrencyAmount(profit, entry.currency || openingCurrency)}</span>,
          ];
        })}
      />
    );
  }

  if (portalTab === "activity") {
    return (
      <div className="supplier-activity-list">
        {ledgerRows.map((row) => (
          <article key={row.id}>
            <span>{row.withdraw !== "-" ? <MinusCircle size={17} /> : <PlusCircle size={17} />}</span>
            <div><strong>{row.description}</strong><small>{row.date}</small></div>
            <strong className={row.withdraw !== "-" ? "supplier-warning-text" : "supplier-success-text"}>{row.withdraw !== "-" ? row.withdraw : row.deposit}</strong>
          </article>
        ))}
        {!ledgerRows.length && <div className="supplier-empty">No activity recorded yet.</div>}
      </div>
    );
  }

  return (
    <SupplierTable
      columns={["No", "Date", "Description", "Deposit", "Withdraw", "Paid", "Balance", "Currency", "Actions"]}
      empty="No ledger entries."
      rows={ledgerRows.map((row, index) => [
        index + 1,
        <span key="date">{row.date}<small>{getShamsiLabel(row.rawDate)}</small></span>,
        row.description,
        row.deposit,
        <span className="supplier-warning-text" key="withdraw">{row.withdraw}</span>,
        <span className="supplier-success-text" key="paid">{row.paid}</span>,
        row.balance,
        row.currency,
        row.kind ? (
          <div className="supplier-ledger-actions" key="actions">
            <button type="button" onClick={() => onEditLedgerRow(row)} title="Edit">
              <SquarePen size={15} />
            </button>
            <button type="button" className="danger" onClick={() => onDeleteLedgerRow(row)} title="Delete">
              <Trash2 size={15} />
            </button>
          </div>
        ) : "-",
      ])}
    />
  );
}

function SupplierTable({ columns, empty, rows }) {
  return (
    <div className="supplier-table-wrap supplier-profile-table">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>
          ))}
          {!rows.length && <tr><td className="supplier-empty" colSpan={columns.length}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function LedgerRecordModal({ initialRow, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    amount: parseNumber(initialRow.amount),
    currency: initialRow.currency,
    date: initialRow.rawDate || todayInput(),
    description: initialRow.description || "",
    paid: parseNumber(initialRow.paidAmount),
  }));

  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const isPurchase = initialRow.kind === "purchase";
  const remaining = Math.max(0, parseNumber(form.amount) - parseNumber(form.paid));

  return (
    <div className="supplier-modal-backdrop">
      <form
        className="supplier-adjustment-modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.description.trim()) {
            notify("Please enter description.", "error");
            return;
          }
          onSave(form);
        }}
      >
        <div className="supplier-modal-title">
          <div>
            <h2>Edit Ledger Record</h2>
            <p>Update amount and paid value for this supplier ledger row.</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="supplier-form-grid">
          <Field label="Date">
            <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
          </Field>
          <Field label="Currency">
            <CustomSelect ariaLabel="Currency" options={currencyCodes.map((code) => ({ value: code, label: code }))} value={form.currency} onChange={(value) => update("currency", value)} />
          </Field>
          <Field label={isPurchase ? "Total Amount" : "Amount"}>
            <input value={form.amount} onChange={(event) => update("amount", event.target.value)} />
          </Field>
          <Field label="Paid Amount">
            <input value={form.paid} onChange={(event) => update("paid", event.target.value)} />
          </Field>
          {isPurchase && (
            <Field label="Remaining Amount">
              <input readOnly value={formatCurrencyAmount(remaining, form.currency)} />
            </Field>
          )}
          <Field label="Description" className="full">
            <textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
          </Field>
        </div>
        <div className="supplier-modal-actions">
          <button type="button" className="supplier-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="supplier-primary-btn">Save Changes</button>
        </div>
      </form>
    </div>
  );
}

function SupplierModal({
  customFields = [],
  initialSupplier,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() => ({
    ...emptySupplier,
    ...(initialSupplier || {}),
    name: initialSupplier ? getSupplierName(initialSupplier) : "",
    accountType: "supplier",
  }));
  const [itemInput, setItemInput] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const addItem = () => {
    const item = itemInput.trim();
    if (!item) return;
    setForm((current) => ({
      ...current,
      items: current.items.some((value) => value.toLowerCase() === item.toLowerCase()) ? current.items : [...current.items, item],
    }));
    setItemInput("");
  };

  return (
    <div className="supplier-modal-backdrop">
      <form
        className="supplier-modal"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (!form.name.trim()) return;
          onSave(form);
        }}
      >
        <div className="supplier-modal-title">
          <div>
            <h2>{initialSupplier ? "Edit Supplier Account" : "Create Supplier Account"}</h2>
            <p>
  Create and manage supplier account information.
</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="supplier-form-grid">
          <Field label="Name" required invalid={submitted && !form.name.trim()}>
            <input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} />
          </Field>
          <Field label="Phone"><input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
          <Field label="Business Type"><input value={form.businessType} onChange={(event) => update("businessType", event.target.value)} /></Field>
          <Field label="Currency">
            <CustomSelect ariaLabel="Currency" options={currencyCodes.map((code) => ({ value: code, label: code }))} value={form.currency} onChange={(value) => update("currency", value)} />
          </Field>
          {form.accountType === "partner" && (
            <>
              <Field label="Partner Contribution"><input value={form.partnerContribution} onChange={(event) => update("partnerContribution", event.target.value)} /></Field>
              <Field label="Partner Percent"><input value={form.partnerPercent} onChange={(event) => update("partnerPercent", event.target.value)} /></Field>
            </>
          )}
          {form.accountType === "investing" && (
            <>
              <Field label="Monthly Investment"><input value={form.monthlyInvestment} onChange={(event) => update("monthlyInvestment", event.target.value)} /></Field>
              <Field label="Return Percent"><input value={form.investmentReturnPercent} onChange={(event) => update("investmentReturnPercent", event.target.value)} /></Field>
            </>
          )}
          <Field label="Opening Balance">
            <input value={form.balance} onChange={(event) => update("balance", event.target.value)} placeholder="0.00" />
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
          <Field label="Supply Items" className="full">
            <div className="supplier-item-add">
              <input value={itemInput} onChange={(event) => setItemInput(event.target.value)} placeholder="Example: Rice, Oil, Electronics" />
              <button type="button" onClick={addItem}>Add</button>
            </div>
            {!!form.items.length && (
              <div className="supplier-item-chips">
                {form.items.map((item) => (
                  <button key={item} type="button" onClick={() => update("items", form.items.filter((value) => value !== item))}>
                    {item}<span>x</span>
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Address" className="full"><input value={form.address} onChange={(event) => update("address", event.target.value)} /></Field>
          <Field label="Notes" className="full"><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
          <CustomFormFields
            fields={customFields}
            values={form.customFields}
            fieldClassName="supplier-form-field"
            onChange={(key, value) =>
              update("customFields", {
                ...(form.customFields || {}),
                [key]: value,
              })
            }
          />
        </div>

        <div className="supplier-modal-actions">
          <button type="button" className="supplier-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="supplier-primary-btn">{initialSupplier ? "Save Changes" : "Create Account"}</button>
        </div>
      </form>
    </div>
  );
}

function AdjustmentModal({ baseCurrency, onClose, onSave, supplier }) {
  const [type, setType] = useState("debit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [currency, setCurrency] = useState(supplier.currency || baseCurrency);
  const amountValue = parseNumber(amount);
  const canSave = amountValue > 0 && reason.trim();

  return (
    <div className="supplier-modal-backdrop">
      <form
        className="supplier-adjustment-modal"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) {
            notify("Please enter amount and reason.", "error");
            return;
          }
          onSave({ amount: amountValue, currency, reason: reason.trim(), type });
        }}
      >
        <div className="supplier-modal-title">
          <div><h2>Add Adjustment</h2><p>Record a manual change to {supplier.name} balance.</p></div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="supplier-form-grid">
          <div className="supplier-adjustment-type full">
            <button type="button" className={type === "debit" ? "active" : ""} onClick={() => setType("debit")}>
              <MinusCircle size={17} />
              Debit / Payment
            </button>
            <button type="button" className={type === "credit" ? "active" : ""} onClick={() => setType("credit")}>
              <PlusCircle size={17} />
              Credit / New payable
            </button>
          </div>
          <Field label="Amount"><input value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <Field label="Currency">
            <CustomSelect ariaLabel="Currency" options={currencyCodes.map((code) => ({ value: code, label: code }))} value={currency} onChange={setCurrency} />
          </Field>
          <Field label="Reason" className="full"><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
        </div>
        <div className="supplier-modal-actions">
          <button type="button" className="supplier-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="supplier-primary-btn">Save Adjustment</button>
        </div>
      </form>
    </div>
  );
}

function Field({ children, className = "", invalid = false, label, required = false }) {
  return (
    <label className={`supplier-form-field ${className} ${invalid ? "invalid" : ""}`.trim()}>
      <span>{label}{required && <em>*</em>}</span>
      {children}
      {invalid && <small>This field is required.</small>}
    </label>
  );
}

function StatCard({ icon: Icon, label, tone = "", value }) {
  return (
    <article className={`supplier-stat-card ${tone}`.trim()}>
      <div><span>{label}</span><strong>{value}</strong></div>
      <Icon size={21} />
    </article>
  );
}

function ConfirmModal({ message, onClose, onConfirm, title }) {
  return (
    <div className="supplier-modal-backdrop">
      <div className="supplier-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="supplier-modal-actions">
          <button type="button" className="supplier-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="supplier-danger-btn" onClick={onConfirm}>Delete</button>
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
  const printWindow = window.open("", "_blank", "width=950,height=1100");
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

export default Suppliers;
