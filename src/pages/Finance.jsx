import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  DollarSign,
  Printer,
  Search,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import StandardPrintStudio from "../components/StandardPrintStudio";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { currencyMatchesFilter, useBusinessCurrencyFilter } from "../hooks/useBusinessCurrencyFilter";
import { useTablePagination } from "../hooks/useTablePagination";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import "./Finance.css";

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const todayInput = () => new Date().toISOString().slice(0, 10);

const dateOptions = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "year", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
];

const readDate = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const matchesDate = (value, filter, start, end) => {
  if (filter === "all") return true;
  const date = readDate(value);
  if (!date) return true;

  const today = readDate(todayInput());
  const daysOld = Math.floor((today - date) / 86400000);
  const rangeStart = start ? new Date(`${start}T00:00:00`) : null;
  const rangeEnd = end ? new Date(`${end}T23:59:59`) : null;

  return (
    (filter === "today" && daysOld === 0) ||
    (filter === "week" && daysOld >= 0 && daysOld <= 7) ||
    (filter === "month" && daysOld >= 0 && daysOld <= 30) ||
    (filter === "year" && daysOld >= 0 && daysOld <= 365) ||
    (filter === "custom" && (!rangeStart || date >= rangeStart) && (!rangeEnd || date <= rangeEnd))
  );
};

const getSaleTotal = (sale) =>
  parseNumber(sale.total || sale.grandTotal || sale.netTotal || sale.finalTotal || sale.payableAmount);

const getSalePaid = (sale) => parseNumber(sale.paidAmount || sale.paid || sale.receivedAmount);

const getSaleBalance = (sale) => {
  const explicit = parseNumber(sale.balance || sale.remainingAmount || sale.dueAmount);
  return explicit || Math.max(0, getSaleTotal(sale) - getSalePaid(sale));
};

const getSaleDiscount = (sale) => parseNumber(sale.discountAmount || sale.discountTotal || sale.discount);

const getLineCost = (line) => {
  const quantity = parseNumber(line.quantity || line.qty || 1) || 1;
  const cost = parseNumber(line.costPrice || line.purchasePrice || line.buyingPrice || line.cost);
  return cost * quantity;
};

const getStockValue = (product) => {
  const quantity = parseNumber(product.quantity || product.stock || product.availableQuantity);
  const cost = parseNumber(product.costPrice || product.purchasePrice || product.buyingPrice || product.cost || product.selling);
  return quantity * cost;
};

const getDateLabel = (value) => {
  const date = readDate(value);
  return date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "-";
};

function MetricCard({ icon: Icon, label, tone = "green", value }) {
  return (
    <article className={`finance-stat-card ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={22} />
    </article>
  );
}

function StatementRow({ amount, label, note, tone = "" }) {
  return (
    <div className={`finance-statement-row ${tone}`.trim()}>
      <div>
        <strong>{label}</strong>
        <span>{note}</span>
      </div>
      <b>{amount}</b>
    </div>
  );
}

function Finance() {
  const [sales] = useJsonCollection("billingInvoices");
  const [expenses] = useJsonCollection("expenses");
  const [products] = useJsonCollection("products");
  const [staffMembers] = useJsonCollection("staff");
  const [settings] = useJsonCollection("settings");
  const [transactions] = useJsonCollection("transactions");
  const businessCurrencyFilter = useBusinessCurrencyFilter();

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";

  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [printReportOpen, setPrintReportOpen] = useState(false);

  const filteredSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          currencyMatchesFilter(sale.currency || baseCurrency, businessCurrencyFilter) &&
          matchesDate(sale.date || sale.billDate || sale.createdAt, dateFilter, customStartDate, customEndDate)
      ),
    [baseCurrency, businessCurrencyFilter, customEndDate, customStartDate, dateFilter, sales]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          currencyMatchesFilter(expense.currency || baseCurrency, businessCurrencyFilter) &&
          matchesDate(expense.date || expense.createdAt, dateFilter, customStartDate, customEndDate)
      ),
    [baseCurrency, businessCurrencyFilter, customEndDate, customStartDate, dateFilter, expenses]
  );

  const manualTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.source === "manual" &&
          currencyMatchesFilter(transaction.currency || baseCurrency, businessCurrencyFilter) &&
          matchesDate(transaction.date || transaction.createdAt, dateFilter, customStartDate, customEndDate)
      ),
    [baseCurrency, businessCurrencyFilter, customEndDate, customStartDate, dateFilter, transactions]
  );

  const metrics = useMemo(() => {
    const revenue = filteredSales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);
    const paidRevenue = filteredSales.reduce((sum, sale) => sum + getSalePaid(sale), 0);
    const pending = filteredSales.reduce((sum, sale) => sum + getSaleBalance(sale), 0);
    const discounts = filteredSales.reduce((sum, sale) => sum + getSaleDiscount(sale), 0);
    const cogs = filteredSales.reduce(
      (sum, sale) => sum + (sale.items || sale.products || []).reduce((itemSum, item) => itemSum + getLineCost(item), 0),
      0
    );
    const recordedExpenses = filteredExpenses.reduce((sum, expense) => sum + parseNumber(expense.amount), 0);
    const manualIncome = manualTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + parseNumber(transaction.amount), 0);
    const manualExpense = manualTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + parseNumber(transaction.amount), 0);
    const filteredStaff = staffMembers.filter((staff) =>
      currencyMatchesFilter(staff.currency || baseCurrency, businessCurrencyFilter)
    );
    const filteredProducts = products.filter((product) =>
      currencyMatchesFilter(product.currency || baseCurrency, businessCurrencyFilter)
    );
    const staffPaid = filteredStaff.reduce(
      (sum, staff) => sum + parseNumber(staff.paidAmount || staff.totalPaid || staff.salaryPaid),
      0
    );
    const staffPayable = filteredStaff.reduce(
      (sum, staff) => sum + Math.max(0, parseNumber(staff.salary || staff.monthlySalary) - parseNumber(staff.paidAmount || staff.totalPaid)),
      0
    );
    const stockValue = filteredProducts.reduce((sum, product) => sum + getStockValue(product), 0);
    const totalRevenue = revenue + manualIncome;
    const totalExpenses = recordedExpenses + manualExpense;

    return {
      cogs,
      discounts,
      expenses: totalExpenses,
      grossProfit: totalRevenue - cogs,
      netProfit: totalRevenue - cogs - totalExpenses,
      paidRevenue,
      pending,
      pureProfit: totalRevenue - totalExpenses,
      revenue: totalRevenue,
      staffPaid,
      staffPayable,
      stockValue,
    };
  }, [baseCurrency, businessCurrencyFilter, filteredExpenses, filteredSales, manualTransactions, products, staffMembers]);

  const ledgerRows = useMemo(() => {
    const saleRows = filteredSales.map((sale) => ({
      id: `sale-${sale.id}`,
      amount: getSaleTotal(sale),
      currency: sale.currency || baseCurrency,
      date: sale.date || sale.billDate || sale.createdAt,
      item: sale.invoiceNumber || sale.billNumber || `Sale ${sale.id || ""}`.trim(),
      note: sale.customerName || "Customer sale",
      type: "Income",
      tone: "income",
    }));

    const expenseRows = filteredExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      amount: parseNumber(expense.amount),
      currency: expense.currency || baseCurrency,
      date: expense.date || expense.createdAt,
      item: expense.description || expense.title || "Expense",
      note: expense.category || expense.method || "Expense",
      type: "Expense",
      tone: "expense",
    }));

    const manualRows = manualTransactions.map((transaction) => ({
      id: `transaction-${transaction.id}`,
      amount: parseNumber(transaction.amount),
      currency: transaction.currency || baseCurrency,
      date: transaction.date || transaction.createdAt,
      item: transaction.title || "Manual transaction",
      note: transaction.category || transaction.description || "Financial",
      type: transaction.type === "expense" ? "Expense" : "Income",
      tone: transaction.type === "expense" ? "expense" : "income",
    }));

    const keyword = search.trim().toLowerCase();
    return [...saleRows, ...expenseRows, ...manualRows]
      .filter((row) => !keyword || [row.item, row.note, row.type, row.date].join(" ").toLowerCase().includes(keyword))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [baseCurrency, filteredExpenses, filteredSales, manualTransactions, search]);

  const pagination = useTablePagination(ledgerRows, 10);
  const reportCurrency = businessCurrencyFilter === "all" ? baseCurrency : businessCurrencyFilter;
  const financialReportRows = useMemo(
    () =>
      ledgerRows.map((row) => ({
        Date: getDateLabel(row.date),
        Item: row.item,
        Type: row.type,
        Note: row.note,
        Amount: formatCurrencyAmount(row.amount, row.currency || baseCurrency),
      })),
    [baseCurrency, ledgerRows]
  );

  return (
    <div className="finance-page">
      <div className="finance-header">
        <div>
          <h1>Financials</h1>
          <p>Track revenue, expenses, profit, pending payments, and stock value.</p>
        </div>

        <div className="finance-header-actions">
          <CustomSelect
            ariaLabel="Filter financials by date"
            options={dateOptions}
            value={dateFilter}
            onChange={(value) => {
              setDateFilter(value);
              if (value !== "custom") {
                setCustomStartDate("");
                setCustomEndDate("");
              }
            }}
          />
          <button type="button" onClick={() => setPrintReportOpen(true)}>
            <Printer size={17} />
            Print Report
          </button>
        </div>
      </div>

      {dateFilter === "custom" && (
        <div className="finance-custom-range">
          <label>
            Start date
            <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
          </label>
          <label>
            End date
            <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
          </label>
        </div>
      )}

      <div className="finance-stats">
        <MetricCard icon={DollarSign} label="Revenue" value={formatCurrencyAmount(metrics.revenue, baseCurrency)} />
        <MetricCard icon={WalletCards} label="Expenses" tone="red" value={formatCurrencyAmount(metrics.expenses, baseCurrency)} />
        <MetricCard icon={BarChart3} label="Gross Profit" tone="blue" value={formatCurrencyAmount(metrics.grossProfit, baseCurrency)} />
        <MetricCard icon={BarChart3} label="Net Profit" tone={metrics.netProfit >= 0 ? "green" : "red"} value={formatCurrencyAmount(metrics.netProfit, baseCurrency)} />
        <MetricCard icon={TrendingDown} label="Total Discounts" tone="orange" value={formatCurrencyAmount(metrics.discounts, baseCurrency)} />
        <MetricCard icon={CreditCard} label="Pending Payments" tone="orange" value={formatCurrencyAmount(metrics.pending, baseCurrency)} />
        <MetricCard icon={WalletCards} label="Stock Value" tone="blue" value={formatCurrencyAmount(metrics.stockValue, baseCurrency)} />
        <MetricCard icon={CalendarDays} label="Staff Paid" value={formatCurrencyAmount(metrics.staffPaid, baseCurrency)} />
      </div>

      <div className="finance-summary-grid">
        <section className="finance-overview-card">
          <div className="finance-chart-title">
            <div>
              <h3>Revenue</h3>
              <p>Paid and pending customer amounts.</p>
            </div>
          </div>
          <StatementRow amount={formatCurrencyAmount(metrics.paidRevenue, baseCurrency)} label="Paid" note="Received from sales" tone="success" />
          <StatementRow amount={formatCurrencyAmount(metrics.pending, baseCurrency)} label="Pending Payments" note="Remaining customer balance" tone="warning" />
          <StatementRow amount={formatCurrencyAmount(metrics.revenue, baseCurrency)} label="Total Revenue" note="Sales plus manual income" />
        </section>

        <section className="finance-overview-card">
          <div className="finance-chart-title">
            <div>
              <h3>Financial Summary</h3>
              <p>Revenue, cost, expenses, and profit.</p>
            </div>
          </div>
          <StatementRow amount={`+${formatCurrencyAmount(metrics.revenue, baseCurrency)}`} label="Revenue" note="All income in this period" tone="success fill" />
          <StatementRow amount={`-${formatCurrencyAmount(metrics.cogs, baseCurrency)}`} label="COGS" note="Estimated product cost" tone="danger fill" />
          <StatementRow amount={`-${formatCurrencyAmount(metrics.expenses, baseCurrency)}`} label="Expenses" note="Business expenses" tone="danger fill" />
          <StatementRow amount={formatCurrencyAmount(metrics.netProfit, baseCurrency)} label="Net Profit" note="Revenue minus COGS and expenses" tone="outline" />
        </section>
      </div>

      <section className="finance-table-card">
        <div className="finance-table-header">
          <div>
            <h3>Financial Ledger</h3>
            <p>Sales, expenses, and manual financial transactions.</p>
          </div>
          <label className="finance-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search financial records..." />
          </label>
        </div>

        <div className="finance-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Type</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((row) => (
                <tr className={row.tone === "income" ? "finance-income-row" : "finance-expense-row"} key={row.id}>
                  <td>{getDateLabel(row.date)}</td>
                  <td>{row.item}</td>
                  <td><span className={`finance-badge ${row.tone}`}>{row.type}</span></td>
                  <td>{row.note}</td>
                  <td>{formatCurrencyAmount(row.amount, row.currency || baseCurrency)}</td>
                </tr>
              ))}
              {pagination.pageItems.length === 0 && (
                <tr>
                  <td className="finance-empty" colSpan="5">No financial record found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          setPage={pagination.setPage}
          setPageSize={pagination.setPageSize}
          totalItems={ledgerRows.length}
          totalPages={pagination.totalPages}
        />
      </section>
      {printReportOpen && (
        <StandardPrintStudio
          columns={["Date", "Item", "Type", "Note", "Amount"]}
          company={company}
          filename="financials-report"
          Icon={WalletCards}
          rows={financialReportRows}
          stats={[
            { label: "Revenue", value: formatCurrencyAmount(metrics.revenue, reportCurrency) },
            { label: "Expenses", value: formatCurrencyAmount(metrics.expenses, reportCurrency) },
            { label: "Net Profit", value: formatCurrencyAmount(metrics.netProfit, reportCurrency) },
          ]}
          subtitle="Sales, expenses, and manual financial transactions"
          title="Financials Report"
          onClose={() => setPrintReportOpen(false)}
        />
      )}
    </div>
  );
}

export default Finance;
