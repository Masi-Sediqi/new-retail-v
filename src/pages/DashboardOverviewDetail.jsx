import { Link, useParams } from "react-router-dom";
import { useMemo } from "react";
import {
  Banknote,
  BriefcaseBusiness,
  Boxes,
  ChevronLeft,
  ReceiptText,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import "../App.css";

const parseNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value, currency = "AFN") =>
  formatCurrencyAmount(Number(value || 0), currency);

const count = (value) => Number(value || 0).toLocaleString("en-US");

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

const recordDate = (record) =>
  String(
    record?.date ??
      record?.createdAt ??
      record?.invoiceDate ??
      record?.billDate ??
      record?.purchaseDate ??
      ""
  ).slice(0, 10);

const productName = (product) =>
  product.name || product.productName || product.deviceName || "Unnamed product";

const supplierName = (supplier) =>
  supplier.supplierName || supplier.companyName || supplier.name || "Supplier";

const staffName = (member) =>
  member.fullName || member.staffName || member.name || "Staff member";

const productQuantity = (product) =>
  parseNumber(product.quantity ?? product.stock ?? product.currentStock);

const productCost = (product) =>
  parseNumber(product.purchase ?? product.purchasePrice ?? product.cost);

const productSalePrice = (product) =>
  parseNumber(product.selling ?? product.sellingPrice ?? product.salePrice ?? product.price);

function DashboardOverviewDetail({ t = {} }) {
  const { overviewType = "financial" } = useParams();
  const [products] = useJsonCollection("products");
  const [billingInvoices] = useJsonCollection("billingInvoices");
  const [expenses] = useJsonCollection("expenses");
  const [staff] = useJsonCollection("staff");
  const [suppliers] = useJsonCollection("suppliers");
  const [transactions] = useJsonCollection("transactions");
  const [godownEntries] = useJsonCollection("godownEntries");

  const data = useMemo(() => {
    const revenue = billingInvoices.reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
    const paidRevenue = billingInvoices.reduce((sum, invoice) => sum + invoicePaid(invoice), 0);
    const pendingPayments = billingInvoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
    const expenseTotal = expenses.reduce((sum, expense) => sum + parseNumber(expense.amount), 0);
    const refundTotal = billingInvoices.reduce((sum, invoice) => {
      const refunds = invoice.refundHistory || invoice.refunds || [];
      return sum + refunds.reduce((refundSum, refund) => refundSum + parseNumber(refund.amount), 0);
    }, 0);
    const staffSalary = staff.reduce(
      (sum, member) => sum + parseNumber(member.salary ?? member.monthlySalary ?? member.payable),
      0
    );
    const cashWallet = transactions.reduce((sum, transaction) => {
      const type = String(transaction.type || transaction.kind || transaction.category || "").toLowerCase();
      const amount = parseNumber(transaction.amount);
      if (/expense|withdraw|payment out/.test(type)) return sum - amount;
      if (/income|sale|deposit|payment in/.test(type)) return sum + amount;
      return sum;
    }, paidRevenue - expenseTotal);
    const stockQuantity = products.reduce((sum, product) => sum + productQuantity(product), 0);
    const stockValue = products.reduce(
      (sum, product) => sum + productQuantity(product) * productCost(product),
      0
    );
    const stockSaleValue = products.reduce(
      (sum, product) => sum + productQuantity(product) * productSalePrice(product),
      0
    );
    const lowStockProducts = products.filter((product) => {
      const quantity = productQuantity(product);
      const alert = parseNumber(product.lowStock || product.lowStockThreshold || product.minimumStock);
      return quantity <= 0 || (alert > 0 && quantity <= alert);
    });
    const supplierPayables = suppliers.reduce(
      (sum, supplier) => sum + Math.max(0, parseNumber(supplier.balance ?? supplier.remainingBalance)),
      0
    );

    return {
      cashWallet,
      expenseTotal,
      lowStockProducts,
      netProfit: revenue - expenseTotal - staffSalary - refundTotal,
      pendingPayments,
      revenue,
      staffSalary,
      stockQuantity,
      stockSaleValue,
      stockValue,
      supplierPayables,
    };
  }, [billingInvoices, expenses, products, staff, suppliers, transactions]);

  const pages = {
    financial: {
      icon: ReceiptText,
      title: t.financialOverview || "Financial overview",
      subtitle: "Invoices, expenses, pending balances, wallet movement, and profit.",
      stats: [
        { label: "Total Revenue", value: money(data.revenue) },
        { label: "Net Profit", value: money(data.netProfit), danger: data.netProfit < 0 },
        { label: "Pending Payments", value: money(data.pendingPayments) },
        { label: "Total Expenses", value: money(data.expenseTotal), danger: true },
        { label: "Cash Wallet", value: money(data.cashWallet), danger: data.cashWallet < 0 },
      ],
      tables: [
        {
          title: "Sales invoices",
          columns: ["Invoice", "Customer", "Date", "Total", "Paid", "Balance"],
          rows: billingInvoices.map((invoice) => [
            invoice.invoiceNumber || invoice.billNumber || invoice.id || "-",
            invoice.customerName || invoice.customer || "Walk-in customer",
            recordDate(invoice) || "-",
            money(invoiceTotal(invoice), invoice.currency || "AFN"),
            money(invoicePaid(invoice), invoice.currency || "AFN"),
            money(invoiceBalance(invoice), invoice.currency || "AFN"),
          ]),
        },
        {
          title: "Expenses",
          columns: ["Title", "Category", "Date", "Amount"],
          rows: expenses.map((expense) => [
            expense.title || expense.name || expense.description || "Expense",
            expense.category || "-",
            recordDate(expense) || "-",
            money(parseNumber(expense.amount), expense.currency || "AFN"),
          ]),
        },
      ],
    },
    suppliers: {
      icon: Truck,
      title: t.suppliersOverview || "Suppliers / Katanama overview",
      subtitle: "Supplier accounts, payable balances, and godown purchase movement.",
      stats: [
        { label: "Supplier Payables", value: money(data.supplierPayables) },
        { label: "Total Suppliers", value: count(suppliers.length) },
        { label: "Godown Entries", value: count(godownEntries.length) },
      ],
      tables: [
        {
          title: "Supplier accounts",
          columns: ["Supplier", "Phone", "Email", "Balance", "Status"],
          rows: suppliers.map((supplier) => [
            supplierName(supplier),
            supplier.phone || supplier.mobile || "-",
            supplier.email || "-",
            money(parseNumber(supplier.balance ?? supplier.remainingBalance), supplier.currency || "AFN"),
            supplier.status || "Active",
          ]),
        },
        {
          title: "Godown movement",
          columns: ["Product", "Supplier", "Date", "Quantity", "Total"],
          rows: godownEntries.map((entry) => [
            entry.productName || entry.name || "-",
            entry.supplierName || entry.supplier || "-",
            recordDate(entry) || "-",
            count(entry.quantity || entry.qty),
            money(parseNumber(entry.total || entry.grandTotal || entry.amount), entry.currency || "AFN"),
          ]),
        },
      ],
    },
    stock: {
      icon: Boxes,
      title: t.stockOverview || "Stock overview",
      subtitle: "Product quantity, purchase value, sale value, and low-stock alerts.",
      stats: [
        { label: "Stock Value", value: money(data.stockValue) },
        { label: "Stock Sale Value", value: money(data.stockSaleValue) },
        { label: "Stock Quantity", value: count(data.stockQuantity) },
        { label: "Low Stock", value: count(data.lowStockProducts.length), danger: data.lowStockProducts.length > 0 },
      ],
      tables: [
        {
          title: "Products",
          columns: ["Product", "Code", "Category", "Quantity", "Purchase", "Selling", "Status"],
          rows: products.map((product) => [
            productName(product),
            product.code || product.productCode || "-",
            product.category || product.productCategory || "-",
            `${count(productQuantity(product))} ${product.unit || ""}`.trim(),
            money(productCost(product), product.currency || "AFN"),
            money(productSalePrice(product), product.currency || "AFN"),
            data.lowStockProducts.some((item) => String(item.id) === String(product.id)) ? "Low stock" : "In stock",
          ]),
        },
      ],
    },
    staff: {
      icon: BriefcaseBusiness,
      title: t.staffOverview || "Staff overview",
      subtitle: "Registered staff, salary obligations, and employment status.",
      stats: [
        { label: "Total Staff", value: count(staff.length) },
        { label: "Staff Payable", value: money(data.staffSalary) },
        { label: "Active Staff", value: count(staff.filter((member) => !/inactive|disabled/i.test(String(member.status || ""))).length) },
      ],
      tables: [
        {
          title: "Staff members",
          columns: ["Name", "Role", "Phone", "Salary", "Status"],
          rows: staff.map((member) => [
            staffName(member),
            member.role || member.position || member.jobTitle || "-",
            member.phone || member.mobile || "-",
            money(parseNumber(member.salary ?? member.monthlySalary ?? member.payable), member.currency || "AFN"),
            member.status || "Active",
          ]),
        },
      ],
    },
  };

  const page = pages[overviewType] || pages.financial;
  const Icon = page.icon || Banknote;

  return (
    <div className="dashboard-page dashboard-overview-detail-page">
      <section className="dashboard-insight-hero">
        <Link className="dashboard-insight-back" to="/">
          <ChevronLeft size={17} />
          Back to dashboard
        </Link>
        <div className="dashboard-overview-detail-title">
          <span className="dashboard-overview-detail-icon">
            <Icon size={22} />
          </span>
          <div>
            <h1>{page.title}</h1>
            <p>{page.subtitle}</p>
          </div>
        </div>
        <div className="dashboard-insight-count">
          <Users size={18} />
          <strong>{page.tables.reduce((sum, table) => sum + table.rows.length, 0)}</strong>
          <span>Total records</span>
        </div>
      </section>

      <div className="stats dashboard-business-stats dashboard-overview-detail-stats">
        {page.stats.map((stat) => (
          <div className={`stat ${stat.danger ? "dashboard-danger-stat" : ""}`} key={stat.label}>
            <span>{stat.label}</span>
            <h2>{stat.value}</h2>
          </div>
        ))}
      </div>

      {page.tables.map((table) => (
        <section className="card table-card dashboard-insight-card" key={table.title}>
          <div className="card-title">
            <div>
              <h3>{table.title}</h3>
              <span>{count(table.rows.length)} record(s)</span>
            </div>
          </div>
          <div className="dashboard-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {table.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.length === 0 ? (
                  <tr>
                    <td className="empty-cell" colSpan={table.columns.length}>
                      No records found.
                    </td>
                  </tr>
                ) : (
                  table.rows.map((row, rowIndex) => (
                    <tr key={`${table.title}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${table.title}-${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export default DashboardOverviewDetail;
