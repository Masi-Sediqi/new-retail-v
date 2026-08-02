import { Link, useParams } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import {
  Banknote,
  Boxes,
  ChevronLeft,
  DollarSign,
  Filter,
  MinusCircle,
  PlusCircle,
  Printer,
  ReceiptText,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
} from "../utils/currencyExchange";
import "../App.css";

const parseNumber = (value) => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const count = (value) => Number(value || 0).toLocaleString("en-US");

const recordDate = (record) =>
  String(
    record?.date ??
      record?.createdAt ??
      record?.invoiceDate ??
      record?.billDate ??
      record?.purchaseDate ??
      record?.paymentDate ??
      ""
  ).slice(0, 10);

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

const invoiceBalance = (invoice) =>
  Math.max(0, parseNumber(invoice.balance) || invoiceTotal(invoice) - invoicePaid(invoice));

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

const isCashWalletTransaction = (transaction) =>
  /cash-wallet|cash wallet/i.test(
    `${transaction.source || ""} ${transaction.category || ""}`
  );

const transactionDirection = (transaction) =>
  /withdraw|expense|payment out/i.test(
    `${transaction.transactionType || ""} ${transaction.type || ""}`
  )
    ? -1
    : 1;

const sourceLabel = (record, fallback = "System") =>
  record.module ||
  record.referenceSource ||
  record.sourceModule ||
  record.group ||
  fallback;

function DashboardOverviewDetail() {
  const { cardKey, overviewType } = useParams();
  const [products] = useJsonCollection("products");
  const [billingInvoices] = useJsonCollection("billingInvoices");
  const [expenses] = useJsonCollection("expenses");
  const [staff] = useJsonCollection("staff");
  const [suppliers] = useJsonCollection("suppliers");
  const [transactions] = useJsonCollection("transactions");
  const [customers] = useJsonCollection("customers");
  const [settings] = useJsonCollection("settings");

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";
  const exchangeRates = company.exchangeRates || {};
  const [moduleFilter, setModuleFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const money = useCallback(
    (value, currency = baseCurrency) =>
      formatCurrencyAmount(Number(value || 0), currency),
    [baseCurrency]
  );

  const toBase = (value, currency = baseCurrency) => {
    const converted = convertCurrencyAmount(value, {
      baseCurrency,
      exchangeRates,
      fromCurrency: currency || baseCurrency,
      targetCurrency: baseCurrency,
    });
    return converted === null ? 0 : converted;
  };

  const rowsByCard = useMemo(() => {
    const invoiceRows = billingInvoices.map((invoice) => ({
      date: recordDate(invoice),
      module: "Billing",
      type: "Credit",
      title: invoice.invoiceNumber || invoice.billNumber || "Invoice",
      name: invoice.customerName || invoice.customer || "Walk-in customer",
      status: invoice.status || invoice.paymentStatus || "-",
      amount: invoiceTotal(invoice),
      paid: invoicePaid(invoice),
      balance: invoiceBalance(invoice),
      currency: invoice.currency || baseCurrency,
      details: `Total: ${money(invoiceTotal(invoice), invoice.currency || baseCurrency)} | Paid: ${money(invoicePaid(invoice), invoice.currency || baseCurrency)}`,
    }));

    const expenseRows = expenses.map((expense) => ({
      date: recordDate(expense),
      module: "Expenses",
      type: "Debit",
      title: expense.title || expense.name || expense.description || "Expense",
      name: expense.category || "-",
      status: expense.status || "-",
      amount: parseNumber(expense.amount),
      currency: expense.currency || baseCurrency,
      details: expense.note || expense.description || "-",
    }));

    const refundRows = billingInvoices.flatMap((invoice) =>
      (invoice.refundHistory || invoice.refunds || []).map((refund) => ({
        date: recordDate(refund) || recordDate(invoice),
        module: "Billing",
        type: "Debit",
        title: `Refund - ${invoice.invoiceNumber || invoice.billNumber || invoice.id || "-"}`,
        name: invoice.customerName || invoice.customer || "Customer",
        status: refund.status || "Refund",
        amount: parseNumber(refund.amount),
        currency: refund.currency || invoice.currency || baseCurrency,
        details: refund.reason || refund.note || "-",
      }))
    );

    const walletRows = transactions
      .filter(isCashWalletTransaction)
      .map((transaction) => {
        const direction = transactionDirection(transaction);
        return {
          date: recordDate(transaction),
          module: sourceLabel(transaction, "Cash Wallet"),
          type: direction < 0 ? "Debit" : "Credit",
          title: transaction.title || transaction.description || "Cash Wallet transaction",
          name: transaction.accountName || transaction.staffName || transaction.customerName || "-",
          status: transaction.transactionType || transaction.type || "-",
          amount: direction * parseNumber(transaction.amount),
          currency: transaction.currency || baseCurrency,
          details: transaction.note || transaction.description || "-",
        };
      });

    const supplierRows = suppliers.map((supplier) => {
      const balance = parseNumber(supplier.balance ?? supplier.remainingBalance);
      return {
        date: recordDate(supplier),
        module: "Supplier / Katah",
        type: balance >= 0 ? "Payable" : "Receivable",
        title: supplierName(supplier),
        name: supplier.phone || supplier.email || "-",
        status: supplier.status || "Active",
        amount: balance,
        currency: supplier.currency || baseCurrency,
        details: supplier.address || supplier.notes || "-",
      };
    });

    const productRows = products.map((product) => ({
      date: recordDate(product),
      module: "Products",
      type: "Stock",
      title: productName(product),
      name: product.code || product.productCode || product.category || "-",
      status: product.status || "Active",
      amount: productQuantity(product) * productCost(product),
      currency: product.currency || baseCurrency,
      details: `Qty: ${count(productQuantity(product))} | Sale: ${money(productSalePrice(product), product.currency || baseCurrency)}`,
    }));

    const staffRows = staff.map((member) => {
      const paid = (member.payrollHistory || []).reduce(
        (sum, entry) => sum + parseNumber(entry.paidAmount),
        0
      );
      const payable = Math.max(
        0,
        parseNumber(member.salary ?? member.monthlySalary ?? member.payable) - paid
      );
      return {
        date: recordDate(member),
        module: "Staff",
        type: "Payroll",
        title: staffName(member),
        name: member.role || member.position || member.phone || "-",
        status: member.status || "Active",
        amount: parseNumber(member.salary ?? member.monthlySalary ?? member.payable),
        paid,
        balance: payable,
        currency: member.currency || baseCurrency,
        details: `Paid: ${money(paid, member.currency || baseCurrency)} | Payable: ${money(payable, member.currency || baseCurrency)}`,
      };
    });

    const customerRows = customers.map((customer) => ({
      date: recordDate(customer),
      module: "Customers",
      type: "Customer",
      title: customer.name || customer.fullName || customer.customerName || "Customer",
      name: customer.phone || customer.email || "-",
      status: customer.status || "Active",
      amount: parseNumber(customer.balance ?? customer.remainingBalance),
      currency: customer.currency || baseCurrency,
      details: customer.address || customer.notes || "-",
    }));

    const netRows = [...invoiceRows, ...expenseRows, ...refundRows, ...staffRows.map((row) => ({ ...row, type: "Debit" }))];

    return {
      "total-revenue": invoiceRows,
      "cash-wallet": walletRows,
      "net-profit": netRows,
      "pure-profit": [...invoiceRows, ...expenseRows],
      "total-sales": invoiceRows,
      "total-expenses": expenseRows,
      "pending-payments": invoiceRows.filter((row) => parseNumber(row.balance) > 0),
      "total-refunds": refundRows,
      "total-customers": customerRows,
      "supplier-payables": supplierRows.filter((row) => parseNumber(row.amount) > 0),
      "supplier-receivables": supplierRows.filter((row) => parseNumber(row.amount) < 0),
      "supplier-net-balance": supplierRows,
      "active-products": productRows.filter((row) => !/inactive|disabled/i.test(row.status)),
      "stock-quantity": productRows,
      "global-stock-value": productRows,
      "total-staff": staffRows,
      "staff-payable": staffRows.filter((row) => parseNumber(row.balance) > 0),
      "staff-paid": staffRows.filter((row) => parseNumber(row.paid) > 0),
    };
  }, [baseCurrency, billingInvoices, customers, expenses, money, products, staff, suppliers, transactions]);

  const cardPages = {
    "total-revenue": { title: "Total Revenue", subtitle: "All revenue records from every module.", icon: DollarSign },
    "cash-wallet": { title: "Current cash wallet", subtitle: "All debit and credit Cash Wallet transactions.", icon: WalletCards, walletButton: true },
    "net-profit": { title: "Net Profit", subtitle: "Revenue, expenses, refunds, and payroll records used for profit.", icon: Banknote },
    "pure-profit": { title: "Pure Profit", subtitle: "Revenue and expense records used for pure profit.", icon: Banknote },
    "total-sales": { title: "Total sales", subtitle: "All sales and billing records.", icon: ReceiptText },
    "total-expenses": { title: "Total Expenses", subtitle: "All expense records.", icon: WalletCards },
    "pending-payments": { title: "Pending Payments", subtitle: "Invoices with remaining customer balance.", icon: Banknote },
    "total-refunds": { title: "Total refunds", subtitle: "All refund records from sales.", icon: ReceiptText },
    "total-customers": { title: "Total customers", subtitle: "All customer records.", icon: Users },
    "supplier-payables": { title: "Supplier Payables", subtitle: "Supplier balances we owe.", icon: Truck },
    "supplier-receivables": { title: "Supplier Receivables", subtitle: "Supplier balances owed to us.", icon: Truck },
    "supplier-net-balance": { title: "Supplier Net Balance", subtitle: "Payable and receivable supplier accounts.", icon: Truck },
    "active-products": { title: "Active products", subtitle: "Active product records.", icon: Boxes },
    "stock-quantity": { title: "Stock Quantity", subtitle: "Product stock quantities and values.", icon: Boxes },
    "global-stock-value": { title: "Global Stock Value", subtitle: "Stock value by product.", icon: Boxes },
    "total-staff": { title: "Total staff", subtitle: "All staff records.", icon: Users },
    "staff-payable": { title: "Staff Payable", subtitle: "Staff members with remaining payable salary.", icon: Users },
    "staff-paid": { title: "Staff Paid", subtitle: "Staff payroll records with paid amount.", icon: DollarSign },
  };

  const legacyMap = {
    financial: "total-revenue",
    suppliers: "supplier-net-balance",
    stock: "global-stock-value",
    staff: "total-staff",
  };

  const activeKey = cardKey || legacyMap[overviewType] || "total-revenue";
  const page = cardPages[activeKey] || cardPages["total-revenue"];
  const rows = rowsByCard[activeKey] || [];
  const moduleOptions = ["all", ...new Set(rows.map((row) => row.module).filter(Boolean))];
  const filteredRows = rows.filter((row) => {
    const date = row.date || "";
    const matchesModule = moduleFilter === "all" || row.module === moduleFilter;
    const matchesFrom = !fromDate || !date || date >= fromDate;
    const matchesTo = !toDate || !date || date <= toDate;
    return matchesModule && matchesFrom && matchesTo;
  });
  const total = filteredRows.reduce(
    (sum, row) => sum + toBase(Math.abs(parseNumber(row.amount)), row.currency),
    0
  );
  const Icon = page.icon;

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
          <strong>{count(filteredRows.length)}</strong>
          <span>Total records</span>
        </div>
      </section>

      <section className="card table-card dashboard-insight-card">
        <div className="card-title">
          <div>
            <h3>
              <Filter size={16} /> Filters
            </h3>
            <span>{money(total, baseCurrency)} total value in current view</span>
          </div>
          <div className="dashboard-detail-actions">
            {page.walletButton && (
              <button
                type="button"
                className="btn primary"
                onClick={() => window.dispatchEvent(new Event("open-cash-wallet"))}
              >
                <WalletCards size={16} />
                Cash wallet
              </button>
            )}
            <button type="button" className="btn" onClick={() => window.print()}>
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>

        <div className="dashboard-detail-filters">
          <label>
            <span>Section</span>
            <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
              {moduleOptions.map((option) => (
                <option value={option} key={option}>
                  {option === "all" ? "All sections" : option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>From</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="card table-card dashboard-insight-card">
        <div className="card-title">
          <div>
            <h3>{page.title}</h3>
            <span>{count(filteredRows.length)} record(s)</span>
          </div>
        </div>
        <div className="dashboard-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Section</th>
                <th>Type</th>
                <th>Title</th>
                <th>Name</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan="8">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={`${row.module}-${row.title}-${index}`}>
                    <td>{row.date || "-"}</td>
                    <td>{row.module}</td>
                    <td>
                      {activeKey === "cash-wallet" ? (
                        <span
                          className={`dashboard-wallet-flow ${
                            parseNumber(row.amount) < 0 ? "debit" : "credit"
                          }`}
                        >
                          {parseNumber(row.amount) < 0 ? (
                            <MinusCircle size={16} />
                          ) : (
                            <PlusCircle size={16} />
                          )}
                          {row.type}
                        </span>
                      ) : (
                        row.type
                      )}
                    </td>
                    <td>{row.title}</td>
                    <td>{row.name}</td>
                    <td>{row.status}</td>
                    <td>
                      <span
                        className={
                          activeKey === "cash-wallet"
                            ? `dashboard-wallet-amount ${
                                parseNumber(row.amount) < 0
                                  ? "debit"
                                  : "credit"
                              }`
                            : ""
                        }
                      >
                        {money(row.amount, row.currency)}
                      </span>
                    </td>
                    <td>{row.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default DashboardOverviewDetail;
