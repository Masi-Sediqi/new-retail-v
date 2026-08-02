import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  Boxes,
  BriefcaseBusiness,
  Clock3,
  DollarSign,
  AlertTriangle,
  PackageCheck,
  ReceiptText,
  Redo2,
  ShoppingCart,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { todayDateValue } from "../utils/afghanDate";
import {
  convertCurrencyAmount,
  formatBusinessCurrencyAmount,
  hasExchangeRate,
} from "../utils/currencyExchange";
import "../App.css";

const money = (value, currency = "AFN") => formatBusinessCurrencyAmount(Number(value || 0), currency);
const count = (value) => Number(value || 0).toLocaleString("en-US");
const clean = (value) => String(value || "").trim();
const normalize = (value) => clean(value).toLowerCase();
const parseNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateFields = [
  "date",
  "createdAt",
  "createdDate",
  "invoiceDate",
  "billDate",
  "purchaseDate",
  "registrationDate",
  "updatedAt",
];

const toDateValue = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const shiftDate = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateValue(date);
};

const getDateRange = (filter, customRange) => {
  const today = todayDateValue();
  if (filter === "Today") return { from: today, to: today };
  if (filter === "Yesterday") {
    const yesterday = shiftDate(today, -1);
    return { from: yesterday, to: yesterday };
  }
  if (filter === "Last Week") return { from: shiftDate(today, -6), to: today };
  if (filter === "Last Month") return { from: shiftDate(today, -29), to: today };
  if (filter === "Custom") return customRange;
  return { from: "", to: "" };
};

const recordDate = (record) => {
  const raw = dateFields.map((field) => record?.[field]).find(Boolean);
  if (!raw) return "";
  return String(raw).slice(0, 10);
};

const inDateRange = (record, range) => {
  if (!range.from && !range.to) return true;
  const date = recordDate(record);
  if (!date) return false;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
};

const invoiceTotal = (invoice) =>
  parseNumber(
    invoice.grandTotal ??
      invoice.total ??
      invoice.totalAmount ??
      invoice.netTotal ??
      invoice.subtotal
  );

const invoicePaid = (invoice) =>
  parseNumber(invoice.paidAmount ?? invoice.paid ?? invoice.amountPaid);

const invoiceBalance = (invoice) => {
  if (invoice.balance !== undefined && invoice.balance !== null && invoice.balance !== "") {
    return Math.max(0, parseNumber(invoice.balance));
  }
  return Math.max(0, invoiceTotal(invoice) - invoicePaid(invoice));
};

const productQuantity = (product) =>
  parseNumber(product.quantity ?? product.stock ?? product.currentStock);

const productCost = (product) =>
  parseNumber(product.purchase ?? product.purchasePrice ?? product.cost);

const productSalePrice = (product) =>
  parseNumber(product.sellingPrice ?? product.salePrice ?? product.price);

const invoiceItems = (invoice) =>
  Array.isArray(invoice.items)
    ? invoice.items
    : Array.isArray(invoice.products)
      ? invoice.products
      : [];

const invoiceCost = (invoice, products = []) =>
  invoiceItems(invoice).reduce((sum, item) => {
    const product = products.find(
      (currentProduct) =>
        String(currentProduct.id) ===
        String(item.productId || item.id)
    );

    const quantity = parseNumber(
      item.quantity ?? item.qty ?? 1
    );

    const purchasePrice = parseNumber(
      item.purchase ??
        item.purchasePrice ??
        item.cost ??
        product?.purchase ??
        product?.purchasePrice ??
        product?.cost
    );

    return sum + quantity * purchasePrice;
  }, 0);

const isInactive = (record) =>
  /inactive|disabled|suspend|suspended|closed/i.test(String(record?.status || ""));

const payrollPeriodKey = (entry) => `${entry.start || ""}__${entry.end || ""}`;

const payrollPaidTotal = (history = [], toBase, fallbackCurrency) =>
  history.reduce(
    (sum, entry) =>
      sum + toBase(parseNumber(entry.paidAmountBase ?? entry.paidAmount), entry.currency || fallbackCurrency),
    0
  );

const payrollPayableTotal = (history = [], toBase, fallbackCurrency) => {
  const latestPayableByPeriod = new Map();
  history.forEach((entry) => {
    latestPayableByPeriod.set(payrollPeriodKey(entry), {
      amount: parseNumber(entry.payable),
      currency: entry.currency || fallbackCurrency,
    });
  });
  return [...latestPayableByPeriod.values()].reduce(
    (sum, entry) => sum + toBase(entry.amount, entry.currency),
    0
  );
};

function Dashboard({ t = {} }) {
  const navigate = useNavigate();
  const [products] = useJsonCollection("products");
  const [billingInvoices] = useJsonCollection("billingInvoices");
  const [expenses] = useJsonCollection("expenses");
  const [staff] = useJsonCollection("staff");
  const [customers] = useJsonCollection("customers");
  const [suppliers] = useJsonCollection("suppliers");
  const [godownEntries] = useJsonCollection("godownEntries");
  const [transactions] = useJsonCollection("transactions");
  const [settings] = useJsonCollection("settings");
  const [dateFilter, setDateFilter] = useState("All");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";
  const exchangeRates = useMemo(
    () => company.exchangeRates || {},
    [company.exchangeRates]
  );
  const toBase = useCallback(
    (value, currency = baseCurrency) =>
      convertCurrencyAmount(value, { baseCurrency, exchangeRates, fromCurrency: currency, targetCurrency: baseCurrency }) ?? 0,
    [baseCurrency, exchangeRates]
  );
  const normalizeCurrency = useCallback(
    (currency) => currency || baseCurrency,
    [baseCurrency]
  );

  const activeDateRange = useMemo(
    () => getDateRange(dateFilter, customRange),
    [dateFilter, customRange]
  );

  const filteredInvoices = useMemo(
    () => billingInvoices.filter((invoice) => inDateRange(invoice, activeDateRange)),
    [billingInvoices, activeDateRange]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => inDateRange(expense, activeDateRange)),
    [expenses, activeDateRange]
  );
  const filteredTransactions = useMemo(
    () => transactions.filter((transaction) => inDateRange(transaction, activeDateRange)),
    [transactions, activeDateRange]
  );
  const filteredGodownEntries = useMemo(
    () => godownEntries.filter((entry) => inDateRange(entry, activeDateRange)),
    [godownEntries, activeDateRange]
  );

  const metrics = useMemo(() => {
    const revenue = filteredInvoices.reduce((sum, invoice) => sum + toBase(invoiceTotal(invoice), invoice.currency), 0);
    const paidRevenue = filteredInvoices.reduce((sum, invoice) => sum + toBase(invoicePaid(invoice), invoice.currency), 0);
    const pendingPayments = filteredInvoices.reduce((sum, invoice) => sum + toBase(invoiceBalance(invoice), invoice.currency), 0);
    const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + toBase(parseNumber(expense.amount), expense.currency), 0);
    const refundTotal = filteredInvoices.reduce((sum, invoice) => {
      const refunds = invoice.refundHistory || invoice.refunds || [];
      return sum + refunds.reduce((refundSum, refund) => refundSum + toBase(parseNumber(refund.amount), refund.currency || invoice.currency), 0);
    }, 0);
const soldGoodsCost = filteredInvoices.reduce(
  (sum, invoice) =>
    sum + toBase(invoiceCost(invoice, products), invoice.currency),
  0
);

const pureProfit =
  revenue - soldGoodsCost - refundTotal;
    const stockValue = products.reduce(
      (sum, product) => sum + toBase(productQuantity(product) * productCost(product), product.currency),
      0
    );
    const stockSaleValue = products.reduce(
      (sum, product) => sum + toBase(productQuantity(product) * productSalePrice(product), product.currency),
      0
    );
    const stockQuantity = products.reduce((sum, product) => sum + productQuantity(product), 0);
    const lowStock = products.filter((product) => {
      const quantity = productQuantity(product);
      const alert = parseNumber(product.lowStock || product.lowStockThreshold || product.minimumStock);
      return quantity <= 0 || (alert > 0 && quantity <= alert);
    }).length;
    const staffPayableFromPayroll = staff.reduce(
  (sum, member) =>
    sum + payrollPayableTotal(member.payrollHistory || [], toBase, member.currency),
  0
);

const staffPayableFromRecords = staff.reduce(
  (sum, member) => {
    if (Array.isArray(member.payrollHistory) && member.payrollHistory.length) {
      return sum;
    }

    return sum + toBase(parseNumber(
      member.payable ??
        member.remainingSalary ??
        member.remaining ??
        0
    ), member.currency);
  },
  0
);

const staffPayable = staffPayableFromPayroll + staffPayableFromRecords;

const staffPaidFromRecords = staff.reduce(
  (sum, member) => {
    const history = member.payrollHistory || [];
    if (history.length) {
      return sum + payrollPaidTotal(history, toBase, member.currency);
    }

    return sum + toBase(parseNumber(
      member.paidSalary ??
        member.salaryPaid ??
        member.paidAmount ??
        member.totalPaid
    ), member.currency);
  },
  0
);

const staffPaidFromTransactions =
  filteredTransactions.reduce((sum, transaction) => {
    const sourceText = normalize(
      [
        transaction.type,
        transaction.category,
        transaction.module,
        transaction.source,
        transaction.title,
        transaction.description,
      ].join(" ")
    );

    const isStaffPayment =
      /staff|salary|employee|payroll/.test(sourceText);

    const isPayment =
      /expense|paid|payment|salary|withdraw/.test(
        sourceText
      );

    if (!isStaffPayment || !isPayment) {
      return sum;
    }

    return sum + toBase(parseNumber(transaction.amount), transaction.currency);
  }, 0);

const staffPaid =
  staffPaidFromTransactions > 0
    ? staffPaidFromTransactions
    : staffPaidFromRecords;
    const supplierPayables = suppliers.reduce(
  (sum, supplier) => {
    const balance = parseNumber(
      supplier.balance ??
        supplier.remainingBalance ??
        supplier.openingBalance
    );

    return sum + toBase(Math.max(0, balance), supplier.currency);
  },
  0
);

const supplierReceivables = suppliers.reduce(
  (sum, supplier) => {
    const balance = parseNumber(
      supplier.balance ??
        supplier.remainingBalance ??
        supplier.openingBalance
    );

    return sum + toBase(Math.max(0, -balance), supplier.currency);
  },
  0
);

const supplierNetBalance =
  supplierPayables - supplierReceivables;
    const cashWalletByCurrency = filteredTransactions.reduce((balances, transaction) => {
      const source = normalize(transaction.source || transaction.category);
      if (!/cash-wallet|cash wallet/.test(source)) return balances;
      const currency = transaction.currency || baseCurrency;
      const kind = normalize(transaction.transactionType || transaction.type);
      const direction = /withdraw|expense|payment out/.test(kind) ? -1 : 1;
      balances[currency] = (balances[currency] || 0) + direction * parseNumber(transaction.amount);
      return balances;
    }, {});
    const cashWalletTotal = Object.entries(cashWalletByCurrency).reduce(
      (sum, [currency, amount]) => sum + toBase(amount, currency),
      0
    );
    const cashWalletHasNegative = Object.values(cashWalletByCurrency)
      .some((amount) => parseNumber(amount) < 0);
    const legacyCashWallet = filteredTransactions.reduce((sum, transaction) => {
      const type = normalize(transaction.type || transaction.kind || transaction.category);
      const amount = toBase(parseNumber(transaction.amount), transaction.currency);
      if (/expense|withdraw|payment out/.test(type)) return sum - amount;
      if (/income|sale|deposit|payment in/.test(type)) return sum + amount;
      return sum;
    }, paidRevenue - expenseTotal);

  return {
  activeCustomers: customers.filter(
    (customer) => !isInactive(customer)
  ).length,

  activeProducts: products.filter(
    (product) => !isInactive(product)
  ).length,

  cashWallet: Object.keys(cashWalletByCurrency).length ? 0 : legacyCashWallet,
  cashWalletTotal: Object.keys(cashWalletByCurrency).length
    ? cashWalletTotal
    : legacyCashWallet,
  cashWalletHasNegative: Object.keys(cashWalletByCurrency).length
    ? cashWalletHasNegative
    : legacyCashWallet < 0,
  cashWalletByCurrency: Object.keys(cashWalletByCurrency).length
    ? cashWalletByCurrency
    : { [baseCurrency]: legacyCashWallet },
  expenseTotal,
  lowStock,

  netProfit:
    revenue -
    soldGoodsCost -
    expenseTotal -
    staffPaid -
    refundTotal,

  pendingPayments,
  pureProfit,
  refundTotal,
  revenue,
  soldGoodsCost,

  staffPayable,
  staffPaid,

  stockQuantity,
  stockSaleValue,
  stockValue,

  supplierNetBalance,
  supplierPayables,
  supplierReceivables,

  totalCustomers: customers.length,
  totalInvoices: filteredInvoices.length,
  totalStaff: staff.length,
};
  }, [customers, filteredExpenses, filteredInvoices, filteredTransactions, products, staff, suppliers, baseCurrency, toBase]);

const missingExchangeCurrencies = useMemo(() => {
  const usedCurrencies = new Set();
  const addCurrency = (currency) => {
    usedCurrencies.add(normalizeCurrency(currency));
  };

  filteredInvoices.forEach((invoice) => {
    addCurrency(invoice.currency);
    (invoice.refundHistory || invoice.refunds || []).forEach((refund) =>
      addCurrency(refund.currency || invoice.currency)
    );
  });
  filteredExpenses.forEach((expense) => addCurrency(expense.currency));
  filteredTransactions.forEach((transaction) => addCurrency(transaction.currency));
  products.forEach((product) => addCurrency(product.currency));
  staff.forEach((member) => addCurrency(member.currency));
  suppliers.forEach((supplier) => addCurrency(supplier.currency));

  return [...usedCurrencies]
    .filter((currency) => !hasExchangeRate(currency, baseCurrency, exchangeRates))
    .sort();
}, [
  baseCurrency,
  exchangeRates,
  filteredExpenses,
  filteredInvoices,
  filteredTransactions,
  normalizeCurrency,
  products,
  staff,
  suppliers,
]);

const trendData = useMemo(() => {
  const grouped = new Map();

  const ensure = (date) => {
    const key = date || "No date";

    const current = grouped.get(key) || {
      date: key,
      revenue: 0,
      expenses: 0,
      refunds: 0,
      pendingPayments: 0,
      sales: 0,
    };

    grouped.set(key, current);
    return current;
  };

  filteredInvoices.forEach((invoice) => {
    const date = recordDate(invoice);
    const bucket = ensure(date);

    bucket.revenue += toBase(invoiceTotal(invoice), invoice.currency);
    bucket.pendingPayments += toBase(invoiceBalance(invoice), invoice.currency);
    bucket.sales += 1;

    const refunds =
      invoice.refundHistory || invoice.refunds || [];

    bucket.refunds += refunds.reduce(
      (sum, refund) =>
        sum + toBase(parseNumber(refund.amount), refund.currency || invoice.currency),
      0
    );
  });

  filteredExpenses.forEach((expense) => {
    const date = recordDate(expense);

    ensure(date).expenses += toBase(parseNumber(expense.amount), expense.currency);
  });

  return [...grouped.values()]
    .filter((item) => item.date !== "No date")
    .sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
}, [filteredExpenses, filteredInvoices, toBase]);

  const recentActivity = useMemo(() => {
    const rows = [
      ...filteredInvoices.map((invoice) => ({
        date: recordDate(invoice),
        module: "Billing",
        title: invoice.invoiceNumber || invoice.billNumber || invoice.customerName || "Invoice",
        value: money(invoiceTotal(invoice), invoice.currency || "AFN"),
      })),
      ...filteredExpenses.map((expense) => ({
        date: recordDate(expense),
        module: "Expenses",
        title: expense.category || expense.title || "Expense",
        value: money(parseNumber(expense.amount), expense.currency || "AFN"),
      })),
      ...filteredGodownEntries.map((entry) => ({
        date: recordDate(entry),
        module: "Godown",
        title: entry.productName || entry.name || entry.type || "Stock movement",
        value: count(entry.quantity || entry.qty || 0),
      })),
    ];

    return rows
      .filter((row) => row.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [filteredExpenses, filteredGodownEntries, filteredInvoices]);

const statCards = [
  // Financial overview
  {
    group: "Financial overview",
    label: t.totalRevenue || "Total Revenue",
    value: money(metrics.revenue, baseCurrency),
    icon: DollarSign,
    tone: "green",
    path: "/sales-bills",
  },
  {
    group: "Financial overview",
    label: t.currentCashWallet || "Current cash wallet",
    value: money(metrics.cashWalletTotal, baseCurrency),
    icon: WalletCards,
    tone: "green",
    path: "/financials",
    danger: metrics.cashWalletHasNegative,
  },
  {
    group: "Financial overview",
    label: t.netProfit || "Net Profit (After Expenses & Refunds)",
    value: money(metrics.netProfit, baseCurrency),
    icon: TrendingUp,
    tone: "green",
    path: "/financials",
    danger: metrics.netProfit < 0,
  },
  {
    group: "Financial overview",
    label: t.pureProfit || "Pure Profit",
    value: money(metrics.pureProfit, baseCurrency),
    icon: TrendingUp,
    tone: "green",
    path: "/financials",
    danger: metrics.pureProfit < 0,
  },
  {
    group: "Financial overview",
    label: t.totalSales || "Total sales",
    value: count(metrics.totalInvoices),
    icon: ShoppingCart,
    tone: "blue",
    path: "/sales-bills",
  },
  {
    group: "Financial overview",
    label: t.totalExpenses || "Total Expenses",
    value: money(metrics.expenseTotal, baseCurrency),
    icon: WalletCards,
    tone: "dark",
    path: "/expenses",
  },
  {
    group: "Financial overview",
    label: t.pendingPayments || "Pending Payments",
    value: money(metrics.pendingPayments, baseCurrency),
    icon: Clock3,
    tone: "orange",
    path: "/sales-bills",
  },
  {
    group: "Financial overview",
    label: t.totalRefunds || "Total refunds",
    value: money(metrics.refundTotal, baseCurrency),
    icon: Redo2,
    tone: "red",
    path: "/sales-bills",
  },
  {
    group: "Financial overview",
    label: t.totalCustomers || "Total customers",
    value: count(metrics.totalCustomers),
    icon: UserRound,
    tone: "dark",
    path: "/customers",
  },

  // Suppliers / Katanama overview
  {
    group: "Suppliers / Katanama overview",
    label: t.totalPayables || "Total Payables",
    value: money(metrics.supplierPayables, baseCurrency),
    icon: Banknote,
    tone: "orange",
    path: "/suppliers",
  },
  {
    group: "Suppliers / Katanama overview",
    label: t.totalReceivables || "Total Receivables",
    value: money(metrics.supplierReceivables, baseCurrency),
    icon: TrendingUp,
    tone: "green",
    path: "/suppliers",
  },
  {
    group: "Suppliers / Katanama overview",
    label: t.netBalance || "Net Balance",
    value: `${money(metrics.supplierNetBalance, baseCurrency)} ${
      metrics.supplierNetBalance > 0
        ? `(${t.netPayable || "Net Payable"})`
        : metrics.supplierNetBalance < 0
          ? `(${t.netReceivable || "Net Receivable"})`
          : `(${t.settled || "Settled"})`
    }`,
    icon: DollarSign,
    tone: "orange",
    path: "/suppliers",
    danger: metrics.supplierNetBalance < 0,
  },

  // Stock overview
  {
    group: "Stock overview",
    label: t.activeProducts || "Active products",
    value: count(metrics.activeProducts),
    icon: Boxes,
    tone: "dark",
    path: "/products",
  },
  {
    group: "Stock overview",
    label: t.stockQuantity || "Stock Quantity",
    value: count(metrics.stockQuantity),
    icon: PackageCheck,
    tone: "dark",
    path: "/products",
  },
  {
    group: "Stock overview",
    label: t.globalStockValue || "Global Stock Value",
    value: money(metrics.stockValue, baseCurrency),
    icon: Warehouse,
    tone: "orange",
    path: "/products",
  },
// Staff overview
{
  group: "Staff overview",
  label: t.totalStaff || "Total staff",
  value: count(metrics.totalStaff),
  icon: Users,
  tone: "dark",
  path: "/staff",
},
{
  group: "Staff overview",
  label: t.staffPayable || "Staff Payable",
  value: money(metrics.staffPayable, baseCurrency),
  icon: BriefcaseBusiness,
  tone: "orange",
  path: "/staff",
},
{
  group: "Staff overview",
  label: t.staffPaid || "Staff Paid",
  value: money(metrics.staffPaid, baseCurrency),
  icon: DollarSign,
  tone: "green",
  path: "/staff",
},
];




const statGroups = [
  {
    key: "Financial overview",
    type: "financial",
    title:
      t.financialOverview || "Financial overview",
  },
  {
    key: "Suppliers / Katanama overview",
    type: "suppliers",
    title:
      t.suppliersOverview ||
      "Suppliers / Katanama overview",
  },
  {
    key: "Stock overview",
    type: "stock",
    title:
      t.stockOverview || "Stock overview",
  },
  {
    key: "Staff overview",
    type: "staff",
    title:
      t.staffOverview || "Staff overview",
  },
].map((group) => ({
  key: group.key,
  type: group.type,
  title: group.title,
  cards: statCards.filter(
    (card) => card.group === group.key
  ),
}));

  const quickActions = [
    { label: t.newBill || "New Bill", icon: ReceiptText, path: "/billing" },
    { label: t.products || "Products", icon: Boxes, path: "/products" },
    { label: t.customers || "Customers", icon: Users, path: "/customers" },
    { label: t.godown || "Godown", icon: Warehouse, path: "/godown" },
    { label: t.suppliers || "Suppliers", icon: Truck, path: "/suppliers" },
    { label: t.expenses || "Expenses", icon: WalletCards, path: "/expenses" },
    { label: t.loans || "Loans", icon: Banknote, path: "/loans" },
    { label: t.staff || "Staff", icon: BriefcaseBusiness, path: "/staff" },
  ];

  return (
    <div className="dashboard-page">
      <section className="dashboard-date-filters smart-dashboard-header">
        <div>
          <span>{t.dashboardTitle || "Smart Office Dashboard"}</span>
          <strong>{{ All: t.all || "All", Today: t.today || "Today", Yesterday: t.yesterday || "Yesterday", "Last Week": t.lastWeek || "Last Week", "Last Month": t.lastMonth || "Last Month", Custom: t.custom || "Custom" }[dateFilter]}</strong>
          <p>
            {activeDateRange.from || activeDateRange.to
              ? `${activeDateRange.from || t.start || "Start"} ${t.to || "to"} ${activeDateRange.to || t.today || "Today"}`
              : t.showingAllRecords || "Showing all business records"}
          </p>
        </div>

        <div className="dashboard-date-filter-actions">
          {["All", "Today", "Yesterday", "Last Week", "Last Month", "Custom"].map((filter) => (
            <button
              type="button"
              key={filter}
              className={dateFilter === filter ? "active" : ""}
              onClick={() => setDateFilter(filter)}
            >
              {{ All: t.all || "All", Today: t.today || "Today", Yesterday: t.yesterday || "Yesterday", "Last Week": t.lastWeek || "Last Week", "Last Month": t.lastMonth || "Last Month", Custom: t.custom || "Custom" }[filter]}
            </button>
          ))}
        </div>

        {dateFilter === "Custom" && (
          <div className="dashboard-custom-date-range">
            <label>
              {t.from || "From"}
              <input
                type="date"
                value={customRange.from}
                onChange={(event) =>
                  setCustomRange((current) => ({ ...current, from: event.target.value }))
                }
              />
            </label>
            <label>
              {t.to || "To"}
              <input
                type="date"
                value={customRange.to}
                onChange={(event) =>
                  setCustomRange((current) => ({ ...current, to: event.target.value }))
                }
              />
            </label>
          </div>
        )}
      </section>

      {metrics.lowStock > 0 && (
        <button
          className="dashboard-stock-warning"
          type="button"
          onClick={() => navigate("/products")}
        >
          <span>{count(metrics.lowStock)} {t.lowStockMessage || "product(s) are running low on stock."}</span>
          <strong>{t.viewProducts || "View Products"}</strong>
        </button>
      )}

      {missingExchangeCurrencies.length > 0 && (
        <button
          className="dashboard-stock-warning dashboard-exchange-warning"
          type="button"
          onClick={() => navigate("/settings")}
        >
          <span>
            <AlertTriangle size={16} />
            Missing exchange rate for currencies used in dashboard calculations:{" "}
            {missingExchangeCurrencies.join(", ")}
          </span>
          <strong>Set Rates</strong>
        </button>
      )}

      <div className="dashboard-overview-groups">
  {statGroups.map((group) => (
    <section
      className={`dashboard-overview-group dashboard-overview-${group.type}`}
      key={group.title}
    >
      <div className="dashboard-overview-title">
        <h3>{group.title}</h3>
      </div>

      <div
        className={`stats dashboard-business-stats dashboard-${group.type}-stats`}
      >
        {group.cards.map((card) => {
          const Icon = card.icon;
          const valueIsNegative = card.danger ||
            (typeof card.value === "string" && /^\s*-/.test(card.value));

          return (
            <button
              type="button"
              className={`stat dashboard-stat-button dashboard-stat-${card.tone} ${
                valueIsNegative
                  ? "dashboard-danger-stat"
                  : ""
              }`}
              key={card.label}
              onClick={() =>
                navigate(card.path)
              }
            >
              <div className="dashboard-stat-content">
                <span>{card.label}</span>
                <h2>{card.value}</h2>
              </div>

              <span className="dashboard-stat-icon">
                <Icon size={20} strokeWidth={1.9} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  ))}
</div>

     <section className="dashboard-trends-card">
  <div className="dashboard-trends-title">
    <h3>{t.trends || "Trends"}</h3>
  </div>

  <TrendGraph data={trendData} t={t} />
</section>

      <section className="dashboard-bottom-grid">
        <div className="card dashboard-quick-card">
          <div className="card-title">
            <div>
              <h3>{t.quickActions || "Quick Actions"}</h3>
              <span>{t.openCommonWorkflows || "Open common workflows"}</span>
            </div>
          </div>

          <div className="dashboard-quick-actions">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  type="button"
                  key={action.label}
                  onClick={() => navigate(action.path)}
                >
                  <Icon size={18} />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card dashboard-recent-card">
          <div className="card-title">
            <div>
              <h3>{t.recentActivity || "Recent Activity"}</h3>
              <span>{t.latestActivityHint || "Latest bills, expenses, and stock movement"}</span>
            </div>
          </div>

          <div className="dashboard-recent-list">
            {recentActivity.length === 0 ? (
              <p className="dashboard-chart-empty">{t.noRecentActivity || "No recent activity yet."}</p>
            ) : (
              recentActivity.map((item, index) => (
                <div className="dashboard-recent-item" key={`${item.module}-${item.title}-${index}`}>
                  <span>{item.module}</span>
                  <strong>{item.title}</strong>
                  <p>{item.date}</p>
                  <em>{item.value}</em>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function TrendGraph({ data, t = {} }) {
  const graphData = data.length
    ? data
    : [
        {
          date: todayDateValue(),
          revenue: 0,
          expenses: 0,
          refunds: 0,
          pendingPayments: 0,
          sales: 0,
        },
      ];

  const formatDateTick = (value) => {
    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="dashboard-trends-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={graphData}
          margin={{
            top: 12,
            right: 18,
            left: -8,
            bottom: 4,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />

          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            labelFormatter={(value) =>
              formatDateTick(value)
            }
            formatter={(value, name) => {
              if (name === (t.sales || "Sales")) {
                return [count(value), name];
              }

              return [money(value), name];
            }}
          />

          <Legend
            verticalAlign="bottom"
            height={38}
          />

          <Line
            type="monotone"
            dataKey="revenue"
            name={t.totalRevenue || "Total Revenue"}
            stroke="#172554"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />

          <Line
            type="monotone"
            dataKey="expenses"
            name={t.totalExpenses || "Total Expenses"}
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />

          <Line
            type="monotone"
            dataKey="refunds"
            name={t.totalRefunds || "Refunds"}
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />

          <Line
            type="monotone"
            dataKey="pendingPayments"
            name={t.pendingPayments || "Pending Payments"}
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />

          <Line
            type="monotone"
            dataKey="sales"
            name={t.sales || "Sales"}
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Dashboard;

