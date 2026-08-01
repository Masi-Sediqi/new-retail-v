import { useMemo, useState } from "react";
import {
  BarChart3,
  Box,
  CreditCard,
  DollarSign,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import "./Reports.css";

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const todayKey = () => new Date().toISOString().slice(0, 10);

const dateOptions = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "year", label: "Last 12 months" },
  { value: "custom", label: "Custom range" },
];

const parseDate = (value) => {
  const date = new Date(`${String(value || todayKey()).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(`${todayKey()}T12:00:00`) : date;
};

const dateKey = (value) => parseDate(value).toISOString().slice(0, 10);
const shortDate = (value) => parseDate(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const matchesDate = (value, filter, start, end) => {
  if (filter === "all") return true;
  const date = parseDate(value);
  const today = parseDate(todayKey());
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

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function ReportMetric({ icon: Icon, label, tone = "green", value }) {
  return (
    <article className={`report-metric tone-${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={22} />
    </article>
  );
}

function ComparisonChart({ baseCurrency, expenses, revenue }) {
  const rows = [
    { key: "revenue", label: "Revenue", value: revenue, className: "green" },
    { key: "expenses", label: "Expenses", value: expenses, className: "red" },
  ];
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="comparison-chart">
      {rows.map((row) => (
        <div className="comparison-row" key={row.key}>
          <div>
            <span>{row.label}</span>
            <strong>{formatCurrencyAmount(row.value, baseCurrency)}</strong>
          </div>
          <div className="comparison-track">
            <span className={row.className} style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendAreaChart({ sales }) {
  const points = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      const key = day.toISOString().slice(0, 10);
      const revenue = sales
        .filter((sale) => dateKey(sale.date || sale.billDate || sale.createdAt) === key)
        .reduce((sum, sale) => sum + getSaleTotal(sale), 0);
      return { key, label: shortDate(key), revenue };
    });
  }, [sales]);

  const max = Math.max(...points.map((point) => point.revenue), 1);
  const coords = points.map((point, index) => ({
    ...point,
    x: 18 + index * 44,
    y: 132 - (point.revenue / max) * 104,
  }));
  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${coords.at(-1)?.x || 282} 150 L ${coords[0]?.x || 18} 150 Z`;

  return (
    <div className="trend-card">
      <svg className="trend-area-svg" viewBox="0 0 300 170" role="img" aria-label="Weekly trends">
        <path className="trend-grid-fill" d="M18 28 H282 M18 80 H282 M18 132 H282" />
        <path className="trend-area" d={area} />
        <path className="trend-line-path" d={line} />
        {coords.map((point) => (
          <circle cx={point.x} cy={point.y} key={point.key} r="3.5" />
        ))}
      </svg>
      <div className="trend-labels">
        {coords.map((point) => (
          <span key={point.key}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

function BreakdownList({ baseCurrency, breakdown }) {
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const visible = breakdown.slice(0, 5);

  if (!visible.length) return <div className="empty-cell">No records found.</div>;

  return (
    <div className="breakdown-list">
      {visible.map((item, index) => {
        const percent = total > 0 ? Math.round((item.amount / total) * 100) : 0;
        return (
          <div className="breakdown-row" key={item.category}>
            <span className={`breakdown-dot tone-${index % 5}`} />
            <div>
              <strong>{item.category}</strong>
              <small>{formatCurrencyAmount(item.amount, baseCurrency)}</small>
            </div>
            <b>{percent}%</b>
          </div>
        );
      })}
    </div>
  );
}

function PaymentDonut({ paidCount, pendingCount }) {
  const total = Math.max(1, paidCount + pendingCount);
  const paidPercent = Math.round((paidCount / total) * 100);

  return (
    <div className="payment-donut-card">
      <div className="payment-ring" style={{ "--paid-percent": `${paidPercent}%` }}>
        <span>{paidPercent}%</span>
      </div>
      <div className="payment-legend">
        <span><i className="paid" />Paid: {paidCount}</span>
        <span><i className="pending" />Pending: {pendingCount}</span>
      </div>
    </div>
  );
}

const printReport = ({ baseCurrency, company, metrics, rows }) => {
  const printRows = [
    ["Revenue", formatCurrencyAmount(metrics.revenue, baseCurrency)],
    ["Expenses", formatCurrencyAmount(metrics.expenseTotal, baseCurrency)],
    ["Total Sales", metrics.totalSales],
    ["Net Profit", formatCurrencyAmount(metrics.netProfit, baseCurrency)],
    ["Stock", formatCurrencyAmount(metrics.stockValue, baseCurrency)],
  ];

  const reportRows = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.detail)}</td>
          <td>${escapeHtml(row.value)}</td>
        </tr>
      `
    )
    .join("");

  const printWindow = window.open("", "_blank", "width=1100,height=760");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Reports</title>
        <style>
          body{font-family:Arial,sans-serif;color:#0f172a;padding:28px}
          h1{margin:0 0 4px} p{margin:0 0 20px;color:#64748b}
          table{width:100%;border-collapse:collapse;margin-top:16px}
          th,td{border:1px solid #e2e8f0;padding:10px;text-align:left;font-size:13px}
          th{background:#f8fafc}.summary{max-width:560px}
        </style>
      </head>
      <body>
        <h1>${escapeHtml(company.companyName || "Reports")}</h1>
        <p>Business report</p>
        <table class="summary"><tbody>${printRows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>
        <table>
          <thead><tr><th>Report</th><th>Detail</th><th>Value</th></tr></thead>
          <tbody>${reportRows || '<tr><td colspan="3">No records found.</td></tr>'}</tbody>
        </table>
        <script>window.print(); window.close();</script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

function Reports() {
  const [sales] = useJsonCollection("billingInvoices");
  const [expenses] = useJsonCollection("expenses");
  const [products] = useJsonCollection("products");
  const [staffMembers] = useJsonCollection("staff");
  const [settings] = useJsonCollection("settings");
  const [transactions] = useJsonCollection("transactions");

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";

  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [search, setSearch] = useState("");

  const filteredSales = useMemo(
    () => sales.filter((sale) => matchesDate(sale.date || sale.billDate || sale.createdAt, dateFilter, customStartDate, customEndDate)),
    [customEndDate, customStartDate, dateFilter, sales]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => matchesDate(expense.date || expense.createdAt, dateFilter, customStartDate, customEndDate)),
    [customEndDate, customStartDate, dateFilter, expenses]
  );

  const manualTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.source === "manual" &&
          matchesDate(transaction.date || transaction.createdAt, dateFilter, customStartDate, customEndDate)
      ),
    [customEndDate, customStartDate, dateFilter, transactions]
  );

  const metrics = useMemo(() => {
    const salesRevenue = filteredSales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);
    const paidRevenue = filteredSales.reduce((sum, sale) => sum + getSalePaid(sale), 0);
    const pendingPayments = filteredSales.reduce((sum, sale) => sum + getSaleBalance(sale), 0);
    const cogs = filteredSales.reduce(
      (sum, sale) => sum + (sale.items || sale.products || []).reduce((itemSum, item) => itemSum + getLineCost(item), 0),
      0
    );
    const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + parseNumber(expense.amount), 0);
    const manualIncome = manualTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + parseNumber(transaction.amount), 0);
    const manualExpense = manualTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + parseNumber(transaction.amount), 0);
    const revenue = salesRevenue + manualIncome;
    const expensesWithManual = expenseTotal + manualExpense;
    const stockValue = products.reduce((sum, product) => sum + getStockValue(product), 0);
    const staffPaid = staffMembers.reduce(
      (sum, staff) => sum + parseNumber(staff.paidAmount || staff.totalPaid || staff.salaryPaid),
      0
    );
    const staffPayable = staffMembers.reduce(
      (sum, staff) => sum + Math.max(0, parseNumber(staff.salary || staff.monthlySalary) - parseNumber(staff.paidAmount || staff.totalPaid)),
      0
    );

    return {
      expenseTotal: expensesWithManual,
      grossProfit: revenue - cogs,
      netProfit: revenue - cogs - expensesWithManual,
      paidRevenue,
      pendingPayments,
      pureProfit: revenue - expensesWithManual,
      revenue,
      staffPaid,
      staffPayable,
      stockValue,
      totalSales: filteredSales.length,
    };
  }, [filteredExpenses, filteredSales, manualTransactions, products, staffMembers]);

  const expenseBreakdown = useMemo(() => {
    const grouped = new Map();
    filteredExpenses.forEach((expense) => {
      const category = expense.category || "Other";
      grouped.set(category, (grouped.get(category) || 0) + parseNumber(expense.amount));
    });
    return Array.from(grouped, ([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const topCustomers = useMemo(() => {
    const grouped = new Map();
    filteredSales.forEach((sale) => {
      const name = sale.customerName || sale.customer || "Walk-in customer";
      const current = grouped.get(name) || { name, paid: 0, total: 0, records: 0 };
      current.total += getSaleTotal(sale);
      current.paid += getSalePaid(sale);
      current.records += 1;
      grouped.set(name, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [filteredSales]);

  const paidCount = filteredSales.filter((sale) => getSaleBalance(sale) <= 0).length;
  const pendingCount = filteredSales.length - paidCount;

  const reportRows = useMemo(() => {
    const rows = [
      { id: "profit-loss", name: "Profit & Loss", detail: "Revenue, expenses and net profit", value: formatCurrencyAmount(metrics.netProfit, baseCurrency) },
      { id: "balance-sheet", name: "Balance Sheet", detail: "Stock value and receivables as of now", value: formatCurrencyAmount(metrics.stockValue + metrics.pendingPayments, baseCurrency) },
      { id: "cash-flow", name: "Cash Flow", detail: "Paid revenue minus expenses", value: formatCurrencyAmount(metrics.paidRevenue - metrics.expenseTotal, baseCurrency) },
      ...topCustomers.map((customer) => ({
        id: `customer-${customer.name}`,
        name: customer.name,
        detail: `${customer.records} sale(s), paid ${formatCurrencyAmount(customer.paid, baseCurrency)}`,
        value: formatCurrencyAmount(customer.total, baseCurrency),
      })),
      ...expenseBreakdown.map((item) => ({
        id: `expense-${item.category}`,
        name: item.category,
        detail: "Expense category",
        value: formatCurrencyAmount(item.amount, baseCurrency),
      })),
    ];
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => !keyword || [row.name, row.detail, row.value].join(" ").toLowerCase().includes(keyword));
  }, [baseCurrency, expenseBreakdown, metrics, search, topCustomers]);

  const pagination = useTablePagination(
    reportRows,
    `${dateFilter}-${customStartDate}-${customEndDate}-${search}`,
    10
  );

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <span>Reporting</span>
          <h1>Reports</h1>
          <p>Analyze revenue, expenses, sales mix, payment status, customers, staff, and stock value.</p>
        </div>

        <div className="report-actions">
          <CustomSelect
            ariaLabel="Filter reports by date"
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
          <button type="button" onClick={() => printReport({ baseCurrency, company, metrics, rows: reportRows })}>
            <Printer size={17} />
            Print
          </button>
        </div>
      </div>

      {dateFilter === "custom" && (
        <div className="report-custom-range">
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

      <div className="report-metric-grid">
        <ReportMetric icon={DollarSign} label="Revenue" value={formatCurrencyAmount(metrics.revenue, baseCurrency)} />
        <ReportMetric icon={BarChart3} label="Expenses" tone="red" value={formatCurrencyAmount(metrics.expenseTotal, baseCurrency)} />
        <ReportMetric icon={ShoppingCart} label="Total Sales" tone="blue" value={metrics.totalSales.toLocaleString()} />
        <ReportMetric icon={Box} label="Net Profit" tone="navy" value={formatCurrencyAmount(metrics.netProfit, baseCurrency)} />
        <ReportMetric icon={BarChart3} label="Pure Profit" value={formatCurrencyAmount(metrics.pureProfit, baseCurrency)} />
        <ReportMetric icon={CreditCard} label="Staff Payable" tone="orange" value={formatCurrencyAmount(metrics.staffPayable, baseCurrency)} />
        <ReportMetric icon={DollarSign} label="Staff Paid" value={formatCurrencyAmount(metrics.staffPaid, baseCurrency)} />
        <ReportMetric icon={WalletCards} label="Upcoming Payroll" tone="blue" value="No upcoming" />
      </div>

      <div className="statement-card-grid">
        <article className="tailwind-card">
          <ReceiptText size={22} />
          <div>
            <span>Profit & Loss</span>
            <strong>Revenue, costs and profitability for the selected period</strong>
          </div>
        </article>
        <article className="tailwind-card">
          <BarChart3 size={22} />
          <div>
            <span>Balance Sheet</span>
            <strong>Assets, stock value and receivables as of today</strong>
          </div>
        </article>
        <article className="tailwind-card">
          <WalletCards size={22} />
          <div>
            <span>Cash Flow</span>
            <strong>Paid revenue and outgoing expenses grouped by activity</strong>
          </div>
        </article>
      </div>

      <div className="report-chart-grid">
        <section className="report-panel">
          <h2><BarChart3 size={20} /> Revenue vs Expenses</h2>
          <ComparisonChart baseCurrency={baseCurrency} expenses={metrics.expenseTotal} revenue={metrics.revenue} />
        </section>
        <section className="report-panel">
          <h2>Weekly Trends</h2>
          <TrendAreaChart sales={filteredSales} />
        </section>
        <section className="report-panel">
          <h2>Category Breakdown</h2>
          <BreakdownList baseCurrency={baseCurrency} breakdown={expenseBreakdown} />
        </section>
        <section className="report-panel">
          <h2>Paid vs Pending</h2>
          <PaymentDonut paidCount={paidCount} pendingCount={pendingCount} />
        </section>
      </div>

      <section className="report-panel top-customers-panel">
        <h2>Top Customers</h2>
        {topCustomers.length === 0 ? (
          <div className="empty-cell">No records found.</div>
        ) : (
          topCustomers.map((customer, index) => (
            <div className="top-customer-row" key={customer.name}>
              <span>{index + 1}</span>
              <strong>{customer.name}</strong>
              <b>{formatCurrencyAmount(customer.total, baseCurrency)}</b>
            </div>
          ))
        )}
      </section>

      <section className="report-panel reports-table-panel">
        <div className="reports-table-title">
          <div>
            <h2>Report Summary</h2>
            <p>Statements, top customers and expense categories.</p>
          </div>
          <label className="report-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search report rows..." />
          </label>
        </div>
        <div className="reports-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Detail</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.detail}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
              {pagination.pageItems.length === 0 && (
                <tr>
                  <td className="empty-cell" colSpan="3">No records found.</td>
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
          totalItems={reportRows.length}
          totalPages={pagination.totalPages}
        />
      </section>
    </div>
  );
}

export default Reports;
