import { useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import CustomFormFields from "../components/CustomFormFields";
import FloatingActionMenu from "../components/FloatingActionMenu";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { currencies, formatCurrencyAmount } from "../utils/currencyExchange";
import { createRecycleEntry } from "../utils/recycleBin";
import "./Expenses.css";

const defaultExpenseCategories = [
  "Miscellaneous",
  "Rent",
  "Utilities",
  "Transport",
  "Salary",
  "Inventory",
  "Maintenance",
  "Marketing",
  "Food",
  "Office Supplies",
];

const paymentMethods = ["Cash", "Card", "Bank Transfer", "Mobile Money"];

const emptyExpense = {
  category: "Miscellaneous",
  description: "",
  amount: "",
  currency: "AFN",
  method: "Cash",
  notes: "",
  date: "",
  customFields: {},
};

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;
const todayInput = () => new Date().toISOString().slice(0, 10);

const parseExpenseDate = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateLabel = (value) => {
  const date = parseExpenseDate(value);
  return date
    ? date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
};

const getDateMatches = (dateValue, filter, customStartDate, customEndDate) => {
  if (filter === "all") return true;
  const date = parseExpenseDate(dateValue);
  if (!date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  const daysOld = Math.floor((today - dateOnly) / 86400000);
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

function Expenses() {
  const [expenses, setExpenses] = useJsonCollection("expenses");
  const [expenseCategories, setExpenseCategories] = useJsonCollection("expenseCategories");
  const [settings] = useJsonCollection("settings");
  const [, setTransactions] = useJsonCollection("transactions");
  const [, setDeletedItems] = useJsonCollection("deletedItems");

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";
  const expenseCustomFields = company.customFields?.expenses || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const categories = useMemo(() => {
    const saved = expenseCategories.map((item) => item.name || item).filter(Boolean);
    const used = expenses.map((expense) => expense.category).filter(Boolean);
    return [...new Set([...defaultExpenseCategories, ...saved, ...used])].sort((a, b) => a.localeCompare(b));
  }, [expenseCategories, expenses]);

  const normalizedExpenses = useMemo(
    () =>
      expenses.map((expense) => ({
        ...emptyExpense,
        ...expense,
        id: expense.id || `expense-${expense.description || expense.date}`,
        amount: parseNumber(expense.amount),
        currency: expense.currency || baseCurrency,
        date: expense.date || expense.createdAt?.slice(0, 10) || todayInput(),
      })),
    [baseCurrency, expenses]
  );

  const filteredExpenses = useMemo(
    () =>
      normalizedExpenses.filter((expense) => {
        const needle = search.trim().toLowerCase();
        const matchesSearch =
          !needle ||
          [expense.description, expense.category, expense.method, expense.notes]
            .join(" ")
            .toLowerCase()
            .includes(needle);
        const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
        const matchesMethod = methodFilter === "all" || expense.method === methodFilter;
        const matchesDate = getDateMatches(expense.date, dateFilter, customStartDate, customEndDate);
        return matchesSearch && matchesCategory && matchesMethod && matchesDate;
      }),
    [categoryFilter, customEndDate, customStartDate, dateFilter, methodFilter, normalizedExpenses, search]
  );

  const pagination = useTablePagination(
    filteredExpenses,
    `${search}-${categoryFilter}-${methodFilter}-${dateFilter}-${customStartDate}-${customEndDate}`
  );

  const saveExpense = async (expense) => {
    const cleanExpense = {
      ...expense,
      id: expense.id || `expense-${crypto.randomUUID()}`,
      category: expense.category || "Miscellaneous",
      description: expense.description.trim(),
      amount: roundMoney(expense.amount),
      currency: expense.currency || baseCurrency,
      method: expense.method || "Cash",
      notes: expense.notes.trim(),
      date: expense.date || todayInput(),
      updatedAt: new Date().toISOString(),
      createdAt: expense.createdAt || new Date().toISOString(),
    };

    if (!cleanExpense.description) {
      notify("Please enter expense description.", "error");
      return;
    }

    if (parseNumber(cleanExpense.amount) <= 0) {
      notify("Please enter a valid amount.", "error");
      return;
    }

    const expenseSaved = await setExpenses((current) => {
      const exists = current.some((item) => String(item.id) === String(cleanExpense.id));
      return exists
        ? current.map((item) => (String(item.id) === String(cleanExpense.id) ? cleanExpense : item))
        : [cleanExpense, ...current];
    });
    if (!expenseSaved) return;

    await setTransactions((current) => {
      const transaction = {
        id: `expense-${cleanExpense.id}`,
        type: "expense",
        title: cleanExpense.description,
        amount: cleanExpense.amount,
        date: cleanExpense.date,
        description: cleanExpense.notes,
        source: "manual-expense",
        category: cleanExpense.category,
        method: cleanExpense.method,
        referenceId: cleanExpense.id,
        currency: cleanExpense.currency,
        createdAt: cleanExpense.createdAt,
        updatedAt: cleanExpense.updatedAt,
      };
      const exists = current.some((item) => String(item.id) === String(transaction.id));
      return exists
        ? current.map((item) => (String(item.id) === String(transaction.id) ? transaction : item))
        : [transaction, ...current];
    });

    notify(editingExpense ? "Expense updated successfully." : "Expense saved successfully.");
    setModalOpen(false);
    setEditingExpense(null);
  };

  const removeExpense = async () => {
    if (!deleteExpense) return;
    const archived = await setDeletedItems((current) => [
      createRecycleEntry("expenses", deleteExpense, deleteExpense.description || deleteExpense.category),
      ...current,
    ]);
    if (!archived) return;

    const expenseSaved = await setExpenses((current) =>
      current.filter((expense) => String(expense.id) !== String(deleteExpense.id))
    );
    if (!expenseSaved) return;
    await setTransactions((current) =>
      current.filter((transaction) => String(transaction.id) !== `expense-${deleteExpense.id}`)
    );
    notify("Expense deleted successfully.");
    setDeleteExpense(null);
  };

  const addCategory = async (category) => {
    const value = category.trim();
    if (!value) return;
    await setExpenseCategories((current) => {
      const names = current.map((item) => String(item.name || item).toLowerCase());
      return names.includes(value.toLowerCase()) ? current : [...current, { id: `expense-category-${crypto.randomUUID()}`, name: value }];
    });
  };

  const printReport = () => {
    printRows(
      "Expense Report",
      filteredExpenses.map((expense) => ({
        Category: expense.category,
        Description: expense.description,
        Amount: formatCurrencyAmount(expense.amount, expense.currency),
        Method: expense.method,
        Date: getDateLabel(expense.date),
      }))
    );
  };

  return (
    <div className="expenses-page">
      <div className="expenses-header">
        <div>
          <h1>Expenses</h1>
          <p>Track business expenses, payment methods, categories and monthly spend.</p>
        </div>
        <div className="expenses-header-actions">
          <button type="button" className="expense-light-btn" onClick={printReport}>
            <Printer size={16} />
            Print
          </button>
          <button
            type="button"
            className="expense-primary-btn"
            onClick={() => {
              setEditingExpense(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} />
            Add Expense
          </button>
        </div>
      </div>

      <section className="expense-card">
        <div className="expense-toolbar">
          <label className="expense-search">
            <Search size={16} />
            <input placeholder="Search expenses..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <CustomSelect
            ariaLabel="Category"
            options={[{ value: "all", label: "All categories" }, ...categories.map((category) => ({ value: category, label: category }))]}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
          <CustomSelect
            ariaLabel="Payment method"
            options={[{ value: "all", label: "All methods" }, ...paymentMethods.map((method) => ({ value: method, label: method }))]}
            value={methodFilter}
            onChange={setMethodFilter}
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
            <div className="expense-inline-dates">
              <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
              <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
            </div>
          )}
        </div>

        <div className="expense-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((expense) => (
                <tr key={expense.id}>
                  <td><span className="expense-soft-pill">{expense.category}</span></td>
                  <td className="expense-name-cell"><strong>{expense.description}</strong><span>{expense.notes || "No notes"}</span></td>
                  <td className="expense-danger-text">{formatCurrencyAmount(expense.amount, expense.currency)}</td>
                  <td>{expense.method}</td>
                  <td>{getDateLabel(expense.date)}</td>
                  <td>
                    <FloatingActionMenu
                      ariaLabel="Expense actions"
                      actions={[
                        {
                          icon: <Pencil size={15} />,
                          label: "Edit",
                          onClick: () => {
                            setEditingExpense(expense);
                            setModalOpen(true);
                          },
                        },
                        { danger: true, icon: <Trash2 size={15} />, label: "Delete", onClick: () => setDeleteExpense(expense) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {!filteredExpenses.length && (
                <tr>
                  <td className="expense-empty" colSpan="6">No expenses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={filteredExpenses.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
        />
      </section>

      {modalOpen && (
        <ExpenseModal
          categories={categories}
          customFields={expenseCustomFields}
          initialExpense={editingExpense}
          onCategoryAdd={addCategory}
          onClose={() => {
            setModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={saveExpense}
        />
      )}

      {deleteExpense && (
        <ConfirmModal
          title="Delete Expense"
          message={`Delete "${deleteExpense.description}"? Related financial transaction will also be removed.`}
          onClose={() => setDeleteExpense(null)}
          onConfirm={removeExpense}
        />
      )}
    </div>
  );
}

function ExpenseModal({ categories, customFields = [], initialExpense, onCategoryAdd, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...emptyExpense,
    ...(initialExpense || {}),
    date: initialExpense?.date || todayInput(),
  }));
  const [categoryMode, setCategoryMode] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const saveCategory = () => {
    const category = newCategory.trim();
    if (!category) return;
    onCategoryAdd(category);
    update("category", category);
    setNewCategory("");
    setCategoryMode(false);
  };

  return (
    <div className="expense-modal-backdrop">
      <form
        className="expense-modal"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (!form.description.trim() || parseNumber(form.amount) <= 0) return;
          onSave(form);
        }}
      >
        <div className="expense-modal-title">
          <div>
            <h2>{initialExpense ? "Edit Expense" : "Add Expense"}</h2>
            <p>Record category, payment method and expense amount.</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="expense-form-grid">
          <Field label="Category" className="full">
            {categoryMode ? (
              <div className="expense-category-editor">
                <input autoFocus placeholder="Category name" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
                <button type="button" onClick={saveCategory}>Add</button>
                <button type="button" onClick={() => setCategoryMode(false)}>Cancel</button>
              </div>
            ) : (
              <div className="expense-category-row">
                <CustomSelect
                  ariaLabel="Category"
                  options={categories.map((category) => ({ value: category, label: category }))}
                  value={form.category}
                  onChange={(value) => update("category", value)}
                />
                <button type="button" className="expense-light-btn" onClick={() => setCategoryMode(true)}>Custom</button>
              </div>
            )}
          </Field>
          <Field label="Description" required invalid={submitted && !form.description.trim()} className="full">
            <input value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Expense description" />
          </Field>
          <Field label="Amount" required invalid={submitted && parseNumber(form.amount) <= 0}>
            <input inputMode="decimal" value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="0" />
          </Field>
          <Field label="Currency">
            <CustomSelect
              ariaLabel="Currency"
              options={currencies.map((currency) => ({ value: currency.code, label: currency.code }))}
              value={form.currency}
              onChange={(value) => update("currency", value)}
            />
          </Field>
          <Field label="Payment Method">
            <CustomSelect
              ariaLabel="Payment method"
              options={paymentMethods.map((method) => ({ value: method, label: method }))}
              value={form.method}
              onChange={(value) => update("method", value)}
            />
          </Field>
          <Field label="Date">
            <input type="date" value={String(form.date || "").slice(0, 10)} onChange={(event) => update("date", event.target.value)} />
          </Field>
          <Field label="Notes" className="full">
            <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Additional notes" />
          </Field>
          <CustomFormFields
            fields={customFields}
            values={form.customFields}
            fieldClassName="expense-form-field"
            onChange={(key, value) =>
              update("customFields", {
                ...(form.customFields || {}),
                [key]: value,
              })
            }
          />
        </div>

        <div className="expense-modal-actions">
          <button type="button" className="expense-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="expense-primary-btn">{initialExpense ? "Save Changes" : "Add Expense"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ children, className = "", invalid = false, label, required = false }) {
  return (
    <label className={`expense-form-field ${className} ${invalid ? "invalid" : ""}`.trim()}>
      <span>{label}{required && <em>*</em>}</span>
      {children}
      {invalid && <small>This field is required.</small>}
    </label>
  );
}

function StatCard({ icon: Icon, label, tone = "", value }) {
  return (
    <article className={`expense-stat-card ${tone}`.trim()}>
      <div><span>{label}</span><strong>{value}</strong></div>
      <Icon size={21} />
    </article>
  );
}

function ConfirmModal({ message, onClose, onConfirm, title }) {
  return (
    <div className="expense-modal-backdrop">
      <div className="expense-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="expense-modal-actions">
          <button type="button" className="expense-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="expense-danger-btn" onClick={onConfirm}>Delete</button>
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

export default Expenses;
