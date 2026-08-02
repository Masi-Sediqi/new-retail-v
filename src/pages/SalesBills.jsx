import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  DollarSign,
  Eye,
  FileDown,
  FileSpreadsheet,
  History,
  Plus,
  Pencil,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import FloatingActionMenu from "../components/FloatingActionMenu";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { currencyMatchesFilter, useBusinessCurrencyFilter } from "../hooks/useBusinessCurrencyFilter";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import { normalizePrintSettings } from "../utils/printStudio";
import { createRecycleEntry } from "../utils/recycleBin";
import "./SalesBills.css";

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getGregorianLabel = (isoDate) => {
  if (!isoDate) return "-";
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getShamsiShortLabel = (isoDate) => {
  if (!isoDate) return "-";
  try {
    return new Intl.DateTimeFormat("en-CA-u-ca-persian", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${isoDate}T12:00:00`));
  } catch {
    return isoDate;
  }
};

const getSaleDiscountTotal = (sale) =>
  parseNumber(sale.discountTotal) ||
  parseNumber(sale.itemDiscountTotal) + parseNumber(sale.discount);

const addCurrencyTotal = (totals, amount, currency = "AFN") => ({
  ...totals,
  [currency]: (totals[currency] || 0) + parseNumber(amount),
});

const formatCurrencyTotals = (totals, fallbackCurrency = "AFN") => {
  const rows = Object.entries(totals).filter(([, amount]) => parseNumber(amount) !== 0);
  if (!rows.length) return formatCurrencyAmount(0, fallbackCurrency);
  return rows.map(([currency, amount]) => formatCurrencyAmount(amount, currency)).join("\n");
};

function SalesBills() {
  const [sales, setSales] = useJsonCollection("billingInvoices");
  const [, setProducts] = useJsonCollection("products");
  const [, setCustomers] = useJsonCollection("customers");
  const [settings] = useJsonCollection("settings");
  const [transactions, setTransactions] = useJsonCollection("transactions");
  const [, setDeletedItems] = useJsonCollection("deletedItems");
  const businessCurrencyFilter = useBusinessCurrencyFilter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [viewSale, setViewSale] = useState(null);
  const [paymentSale, setPaymentSale] = useState(null);
  const [historySale, setHistorySale] = useState(null);
  const [refundSale, setRefundSale] = useState(null);
  const [printSale, setPrintSale] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [printReportOpen, setPrintReportOpen] = useState(false);
  const [deleteSale, setDeleteSale] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentToWallet, setPaymentToWallet] = useState(true);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundNote, setRefundNote] = useState("");

  const company = settings[0] || {};

  const normalizedSales = useMemo(
    () =>
      sales.map((sale, originalIndex) => ({
        ...sale,
        originalIndex,
        items: Array.isArray(sale.items) ? sale.items : [],
        paidAmount: parseNumber(sale.paidAmount),
        balance: parseNumber(sale.balance),
        total: parseNumber(sale.total),
        subtotal: parseNumber(sale.subtotal),
        currency: sale.currency || "AFN",
      })),
    [sales]
  );

  const currencyFilteredSales = useMemo(
    () => normalizedSales.filter((sale) => currencyMatchesFilter(sale.currency, businessCurrencyFilter)),
    [businessCurrencyFilter, normalizedSales]
  );

  const stats = useMemo(() => {
    const paid = currencyFilteredSales.filter((sale) => sale.paymentStatus === "paid");
    const loan = currencyFilteredSales.filter((sale) => sale.paymentStatus !== "paid");
    const refunded = currencyFilteredSales.filter((sale) => parseNumber(sale.refundTotal) > 0);
    return {
      invoices: currencyFilteredSales.length,
      discounts: currencyFilteredSales.reduce(
        (totals, sale) => addCurrencyTotal(totals, getSaleDiscountTotal(sale), sale.currency),
        {}
      ),
      paid: paid.reduce((totals, sale) => addCurrencyTotal(totals, sale.paidAmount || sale.total, sale.currency), {}),
      pending: loan.reduce((totals, sale) => addCurrencyTotal(totals, sale.balance, sale.currency), {}),
      refunds: refunded.reduce((totals, sale) => addCurrencyTotal(totals, sale.refundTotal, sale.currency), {}),
    };
  }, [currencyFilteredSales]);

  const filteredSales = currencyFilteredSales.filter((sale) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch =
      !keyword ||
      [
        sale.invoiceNumber,
        sale.customerName,
        sale.paymentMethod,
        sale.paymentStatus,
        ...sale.items.map((item) => `${item.name} ${item.code}`),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && sale.paymentStatus === "paid") ||
      (statusFilter === "loan" && sale.paymentStatus !== "paid") ||
      (statusFilter === "refunded" && parseNumber(sale.refundTotal) > 0);
    const matchesDate =
      (!dateRange.from || sale.date >= dateRange.from) &&
      (!dateRange.to || sale.date <= dateRange.to);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const pagination = useTablePagination(filteredSales, `${search}-${statusFilter}-${dateRange.from}-${dateRange.to}`);

  const updateSale = async (targetSale, updater) => {
    const saved = await setSales((currentSales) =>
      currentSales.map((sale) =>
        String(sale.id) === String(targetSale.id) ? updater(sale) : sale
      )
    );
    return saved;
  };

  const reduceCustomerPending = async (sale, amount) => {
    if (!sale.customerId || parseNumber(amount) <= 0) return true;
    return setCustomers((currentCustomers) =>
      currentCustomers.map((customer) => {
        if (String(customer.id || customer.customerId) !== String(sale.customerId)) return customer;
        return {
          ...customer,
          pending: roundMoney(Math.max(0, parseNumber(customer.pending) - parseNumber(amount))),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const printInvoice = (sale) => {
    setPrintSale(sale);
  };

  const addPayment = async () => {
    if (!paymentSale) return;
    const amount = roundMoney(paymentAmount);
    if (amount <= 0) {
      notify("Please enter a valid payment amount.", "error");
      return;
    }
    if (amount > parseNumber(paymentSale.balance)) {
      notify("Payment cannot exceed remaining balance.", "error");
      return;
    }

    const previousPaid = parseNumber(paymentSale.paidAmount);
    const remainingBefore = parseNumber(paymentSale.balance);
    const nextPaidPreview = roundMoney(previousPaid + amount);
    const nextRemainingPreview = roundMoney(Math.max(0, parseNumber(paymentSale.total) - nextPaidPreview));
    const paymentRecord = {
      id: `pay-${Date.now()}`,
      amount,
      note: paymentNote.trim(),
      cashWallet: paymentToWallet,
      method: paymentToWallet ? "Cash Wallet" : "Manual",
      currency: paymentSale.currency,
      previousPaid,
      paidAfter: nextPaidPreview,
      remainingBefore,
      remainingAfter: nextRemainingPreview,
      date: formatDateInput(new Date()),
      createdAt: new Date().toISOString(),
    };
    const saved = await updateSale(paymentSale, (sale) => {
      const nextPaid = roundMoney(parseNumber(sale.paidAmount) + amount);
      const nextBalance = roundMoney(Math.max(0, parseNumber(sale.total) - nextPaid));
      return {
        ...sale,
        paidAmount: nextPaid,
        balance: nextBalance,
        paymentStatus: nextBalance <= 0 ? "paid" : "loan",
        paymentHistory: [
          ...(sale.paymentHistory || []),
          paymentRecord,
        ],
        updatedAt: new Date().toISOString(),
      };
    });
    if (!saved) return;

    if (paymentToWallet) await setTransactions((current) => [
      {
        id: `payment-${paymentSale.id}-${Date.now()}`,
        type: "income",
        title: `Payment ${paymentSale.invoiceNumber}`,
        amount,
        date: formatDateInput(new Date()),
        description: paymentNote.trim() || paymentSale.customerName,
        transactionType: "deposit",
        source: "cash-wallet",
        referenceSource: "billing-payment",
        category: "Cash Wallet",
        referenceId: paymentSale.id,
        currency: paymentSale.currency,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...current,
    ]);

    const customerSaved = await reduceCustomerPending(paymentSale, amount);
    if (!customerSaved) return;

    setHistorySale((current) => {
      if (!current || String(current.id) !== String(paymentSale.id)) return current;
      const nextPaid = roundMoney(parseNumber(current.paidAmount) + amount);
      const nextBalance = roundMoney(Math.max(0, parseNumber(current.total) - nextPaid));
      return { ...current, paidAmount: nextPaid, balance: nextBalance, paymentStatus: nextBalance <= 0 ? "paid" : "loan", paymentHistory: [...(current.paymentHistory || []), paymentRecord] };
    });

    notify("Payment added successfully.");
    setPaymentSale(null);
    setPaymentAmount("");
    setPaymentNote("");
    setPaymentToWallet(true);
  };

  const markAsPaid = async (sale) => {
    const remaining = roundMoney(sale.balance);
    if (remaining <= 0) return;
    const previousPaid = parseNumber(sale.paidAmount);
    const now = new Date();
    const timestamp = now.getTime();
    const paymentRecord = {
      id: `pay-${timestamp}`,
      amount: remaining,
      note: "Marked as paid",
      cashWallet: true,
      method: "Cash Wallet",
      currency: sale.currency,
      previousPaid,
      paidAfter: roundMoney(previousPaid + remaining),
      remainingBefore: remaining,
      remainingAfter: 0,
      date: formatDateInput(now),
      createdAt: now.toISOString(),
    };
    const saved = await updateSale(sale, (current) => ({
      ...current,
      paidAmount: roundMoney(parseNumber(current.paidAmount) + remaining),
      balance: 0,
      paymentStatus: "paid",
      paymentHistory: [...(current.paymentHistory || []), paymentRecord],
      updatedAt: now.toISOString(),
    }));
    if (!saved) return;

    await setTransactions((current) => [
      {
        id: `payment-${sale.id}-${timestamp}`,
        type: "income",
        title: `Payment ${sale.invoiceNumber}`,
        amount: remaining,
        date: formatDateInput(now),
        description: "Marked as paid",
        transactionType: "deposit",
        source: "cash-wallet",
        referenceSource: "billing-payment",
        category: "Cash Wallet",
        referenceId: sale.id,
        currency: sale.currency,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      ...current,
    ]);

    const customerSaved = await reduceCustomerPending(sale, remaining);
    if (!customerSaved) return;

    setHistorySale((current) => {
      if (!current || String(current.id) !== String(sale.id)) return current;
      return {
        ...current,
        paidAmount: roundMoney(parseNumber(current.paidAmount) + remaining),
        balance: 0,
        paymentStatus: "paid",
        paymentHistory: [...(current.paymentHistory || []), paymentRecord],
      };
    });
    notify("Remaining balance marked as paid.");
  };

  const addRefund = async (request = {}) => {
    if (!refundSale) return;
    const amount = roundMoney(request.amount ?? refundAmount);
    const note = String(request.note ?? refundNote).trim();
    const refundedItems = Array.isArray(request.items) ? request.items : [];
    if (amount <= 0) {
      notify("Please enter a valid refund amount.", "error");
      return;
    }
    if (amount > parseNumber(refundSale.paidAmount)) {
      notify("Refund cannot exceed paid amount.", "error");
      return;
    }
    if (!note) {
      notify("Please enter the reason for refund.", "error");
      return;
    }

    if (refundedItems.length) {
      const stockSaved = await setProducts((current) => current.map((product) => {
        const returned = refundedItems.find((item) => String(item.productId) === String(product.id));
        return returned
          ? { ...product, quantity: roundMoney(parseNumber(product.quantity) + parseNumber(returned.quantity)), updatedAt: new Date().toISOString() }
          : product;
      }));
      if (!stockSaved) return;
    }

    const saved = await updateSale(refundSale, (sale) => {
      const nextPaid = roundMoney(Math.max(0, parseNumber(sale.paidAmount) - amount));
      return {
        ...sale,
        paidAmount: nextPaid,
        balance: parseNumber(sale.balance),
        paymentStatus: parseNumber(sale.balance) <= 0 ? "paid" : "loan",
        refundTotal: roundMoney(parseNumber(sale.refundTotal) + amount),
        refundHistory: [
          ...(sale.refundHistory || []),
          {
            id: `refund-${Date.now()}`,
            amount,
            currency: sale.currency || refundSale.currency,
            note,
            mode: request.mode || "amount",
            percent: parseNumber(request.percent),
            items: refundedItems,
            date: formatDateInput(new Date()),
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
    if (!saved) return;

    await setTransactions((current) => [
      {
        id: `refund-${refundSale.id}-${Date.now()}`,
        type: "expense",
        transactionType: "withdraw",
        title: `Refund ${refundSale.invoiceNumber}`,
        amount,
        date: formatDateInput(new Date()),
        description: note,
        source: "cash-wallet",
        referenceSource: "billing-refund",
        category: "Cash Wallet",
        referenceId: refundSale.id,
        currency: refundSale.currency,
      },
      ...current,
    ]);

    notify("Refund recorded successfully.");
    setRefundSale(null);
    setRefundAmount("");
    setRefundNote("");
  };

  const confirmDelete = async () => {
    if (!deleteSale) return;
    const invoiceId = String(deleteSale.id);
    const relatedTransactions = transactions.filter(
      (transaction) =>
        String(transaction.referenceId) === invoiceId &&
        ["billing", "billing-payment", "billing-refund"].includes(transaction.referenceSource)
    );
    const recycleEntry = {
      ...createRecycleEntry("billingInvoices", deleteSale, deleteSale.invoiceNumber || deleteSale.customerName),
      relatedTransactions,
    };

    const recycled = await setDeletedItems((current) => [recycleEntry, ...current]);
    if (!recycled) return;

    const stockSaved = await setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const soldQuantity = (deleteSale.items || [])
          .filter((item) => String(item.productId) === String(product.id))
          .reduce((sum, item) => sum + parseNumber(item.quantity), 0);
        return soldQuantity
          ? {
              ...product,
              quantity: roundMoney(parseNumber(product.quantity) + soldQuantity),
              updatedAt: new Date().toISOString(),
            }
          : product;
      })
    );
    if (!stockSaved) return;

    const transactionsSaved = await setTransactions((current) =>
      current.filter(
        (transaction) =>
          !(
            String(transaction.referenceId) === invoiceId &&
            ["billing", "billing-payment", "billing-refund"].includes(transaction.referenceSource)
          )
      )
    );
    if (!transactionsSaved) return;

    const saved = await setSales((current) =>
      current.filter((sale) => String(sale.id) !== String(deleteSale.id))
    );
    if (!saved) return;
    notify("Invoice moved to recycle bin.");
    setDeleteSale(null);
  };

  const statusOptions = [
    { value: "all", label: "All bills" },
    { value: "paid", label: "Paid" },
    { value: "loan", label: "Loan" },
    { value: "refunded", label: "Refunded" },
  ];

  return (
    <div className="sales-bills-page">
      <div className="sales-bills-header">
        <div>
          <h1>Sales / Bills</h1>
          <p>Review invoices, print bills, collect remaining payments and record refunds.</p>
        </div>
        <button type="button" className="sales-light-btn" onClick={() => setPrintReportOpen(true)}>
          <Printer size={16} />
          Print Report
        </button>
      </div>

      <section className="sales-bills-stats">
        <StatCard icon={ReceiptText} label="Invoices" value={stats.invoices} />
        <StatCard icon={DollarSign} label="Discounts" value={formatCurrencyTotals(stats.discounts)} />
        <StatCard icon={WalletCards} label="Paid" value={formatCurrencyTotals(stats.paid)} />
        <StatCard icon={CreditCard} label="Pending" value={formatCurrencyTotals(stats.pending)} tone="warning" />
        <StatCard icon={RefreshCcw} label="Refunds" value={formatCurrencyTotals(stats.refunds)} tone="danger" />
      </section>

      <section className="sales-bills-card">
        <div className="sales-bills-toolbar">
          <label className="sales-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, customer, item..."
            />
          </label>

          <CustomSelect
            ariaLabel="Status filter"
            className="sales-filter-select"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />

          <label className="sales-date-input">
            <CalendarDays size={15} />
            <input
              type="date"
              value={dateRange.from}
              onChange={(event) => setDateRange((current) => ({ ...current, from: event.target.value }))}
            />
          </label>

          <label className="sales-date-input">
            <CalendarDays size={15} />
            <input
              type="date"
              value={dateRange.to}
              onChange={(event) => setDateRange((current) => ({ ...current, to: event.target.value }))}
            />
          </label>
        </div>

        <div className="sales-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Discount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((sale) => (
                <tr key={sale.id || sale.invoiceNumber}>
                  <td className="sales-strong">{sale.invoiceNumber || "-"}</td>
                  <td>{sale.customerName || "Walk-in customer"}</td>
                  <td>
                    <strong>{getGregorianLabel(sale.date)}</strong>
                    <span>{getShamsiShortLabel(sale.date)}</span>
                  </td>
                  <td>{sale.items.length}</td>
                  <td>{formatCurrencyAmount(sale.total, sale.currency)}</td>
                  <td>{formatCurrencyAmount(getSaleDiscountTotal(sale), sale.currency)}</td>
                  <td>{formatCurrencyAmount(sale.paidAmount, sale.currency)}</td>
                  <td className={sale.balance > 0 ? "sales-warning-text" : ""}>
                    {formatCurrencyAmount(sale.balance, sale.currency)}
                  </td>
                  <td>
                    <StatusBadge sale={sale} />
                  </td>
                  <td>
                    <FloatingActionMenu
                      ariaLabel="Sales bill actions"
                      width={210}
                      actions={[
                        { icon: <Eye size={15} />, label: "View Details", onClick: () => setViewSale(sale) },
                        { icon: <Printer size={15} />, label: "Print Invoice", onClick: () => printInvoice(sale) },
                        { icon: <ReceiptText size={15} />, label: "Print Receipt", onClick: () => setReceiptSale(sale) },
                        { icon: <Pencil size={15} />, label: "Edit Bill", onClick: () => { window.location.hash = `/billing?edit=${encodeURIComponent(sale.id)}`; } },
                        { icon: <History size={15} />, label: "Payment History", onClick: () => setHistorySale(sale) },
                        ...(sale.balance > 0
                          ? [
                              { icon: <Plus size={15} />, label: "Add Payment", onClick: () => setPaymentSale(sale) },
                              { icon: <DollarSign size={15} />, label: "Mark as Paid", onClick: () => markAsPaid(sale) },
                            ]
                          : []),
                        { icon: <RefreshCcw size={15} />, label: "Refund", onClick: () => setRefundSale(sale) },
                        { danger: true, icon: <Trash2 size={15} />, label: "Delete", onClick: () => setDeleteSale(sale) },
                      ]}
                    />
                  </td>
                </tr>
              ))}

              {!filteredSales.length && (
                <tr>
                  <td colSpan="10" className="sales-empty">
                    No sales bill has been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={filteredSales.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
        />
      </section>

      {viewSale && (
        <InvoiceDetailsModal
          sale={viewSale}
          onClose={() => setViewSale(null)}
          onPrint={() => printInvoice(viewSale)}
        />
      )}

      {historySale && (
        <HistoryModal sale={historySale} onClose={() => setHistorySale(null)} onAddPayment={() => { setPaymentSale(historySale); setPaymentAmount(""); setPaymentNote(""); setPaymentToWallet(true); }} />
      )}

      {paymentSale && (
        <PaymentModal
          sale={paymentSale}
          amount={paymentAmount}
          note={paymentNote}
          setAmount={setPaymentAmount}
          setNote={setPaymentNote}
          toWallet={paymentToWallet}
          setToWallet={setPaymentToWallet}
          onClose={() => {
            setPaymentSale(null);
            setPaymentAmount("");
            setPaymentNote("");
            setPaymentToWallet(true);
          }}
          onSave={addPayment}
        />
      )}

      {refundSale && (
        <AdvancedRefundModal
          sale={refundSale}
          amount={refundAmount}
          note={refundNote}
          setAmount={setRefundAmount}
          setNote={setRefundNote}
          onClose={() => {
            setRefundSale(null);
            setRefundAmount("");
            setRefundNote("");
          }}
          onSave={addRefund}
        />
      )}

      {deleteSale && (
        <ConfirmModal
          title="Delete Invoice"
          message={`Move invoice ${deleteSale.invoiceNumber} to Recycle Bin? Its financial effect will be removed until restored.`}
          confirmText="Move to Bin"
          danger
          onClose={() => setDeleteSale(null)}
          onConfirm={confirmDelete}
        />
      )}

      {printSale && <InvoicePrintStudio sale={printSale} company={company} onClose={() => setPrintSale(null)} />}
      {receiptSale && <ReceiptPrintStudio sale={receiptSale} company={company} onClose={() => setReceiptSale(null)} />}
      {printReportOpen && (
        <SalesBillsPrintStudio
          company={company}
          sales={filteredSales}
          stats={stats}
          onClose={() => setPrintReportOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "" }) {
  return (
    <div className={`sales-stat-card ${tone}`.trim()}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={20} />
    </div>
  );
}

function StatusBadge({ sale }) {
  if (parseNumber(sale.refundTotal) > 0) {
    return <span className="sales-status refunded">Refunded</span>;
  }
  if (sale.paymentStatus === "paid" || parseNumber(sale.balance) <= 0) {
    return <span className="sales-status paid">Paid</span>;
  }
  return <span className="sales-status loan">Loan</span>;
}

function InvoiceDetailsModal({ sale, onClose, onPrint }) {
  return (
    <div className="sales-modal-backdrop">
      <div className="sales-detail-modal">
        <div className="sales-modal-title">
          <div>
            <h2>Invoice #{sale.invoiceNumber}</h2>
            <p>{sale.customerName} · {getGregorianLabel(sale.date)}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="sales-detail-head">
          <DetailBox label="Total" value={formatCurrencyAmount(sale.total, sale.currency)} />
          <DetailBox label="Paid" value={formatCurrencyAmount(sale.paidAmount, sale.currency)} />
          <DetailBox label="Balance" value={formatCurrencyAmount(sale.balance, sale.currency)} />
          <DetailBox label="Discount" value={formatCurrencyAmount(getSaleDiscountTotal(sale), sale.currency)} />
        </div>

        <div className="sales-detail-table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Code</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td>{item.code}</td>
                  <td>{item.quantity} {item.unit || "pcs"}</td>
                  <td>{formatCurrencyAmount(item.price, sale.currency)}</td>
                  <td><strong>{formatCurrencyAmount(item.lineTotal, sale.currency)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sales-modal-actions">
          <button type="button" className="sales-light-btn" onClick={onClose}>Close</button>
          <button type="button" className="sales-primary-btn" onClick={onPrint}><Printer size={15} /> Print</button>
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="sales-detail-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function HistoryModal({ sale, onClose, onAddPayment }) {
  const payments = sale.paymentHistory || [];
  const refunds = sale.refundHistory || [];
  const entries = [
    ...payments.map((item) => ({ ...item, kind: "Payment" })),
    ...refunds.map((item) => ({ ...item, kind: "Refund" })),
  ].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
  return (
    <div className="sales-modal-backdrop">
      <div className="sales-history-modal">
        <div className="sales-modal-title">
          <div>
            <h2>Payment History</h2>
            <p>{sale.invoiceNumber}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="payment-history-summary"><div><span>Total</span><b>{formatCurrencyAmount(sale.total,sale.currency)}</b></div><div><span>Paid</span><b className="paid">{formatCurrencyAmount(sale.paidAmount,sale.currency)}</b></div><div><span>Remaining</span><b className={parseNumber(sale.balance)>0?"remaining":"paid"}>{formatCurrencyAmount(sale.balance,sale.currency)}</b></div></div>
        <div className="payment-history-tools"><span>{payments.length} payment {payments.length===1?"entry":"entries"}</span>{parseNumber(sale.balance)>0&&<button type="button" className="sales-primary-btn" onClick={onAddPayment}><Plus size={15}/> Add payment</button>}</div>
        <div className="sales-history-list">
          {entries.map((item) => (
            <div className={`sales-history-entry ${item.kind === "Refund" ? "refund" : ""}`} key={item.id}>
              <span>{item.kind} · {item.date}</span>
              <strong>{formatCurrencyAmount(item.amount, item.currency || sale.currency)}</strong>
              <div className="sales-history-meta">
                {item.kind === "Payment" && (
                  <>
                    <small>{item.method || (item.cashWallet ? "Cash Wallet" : "Manual")}</small>
                    <small>Remaining after: {formatCurrencyAmount(item.remainingAfter ?? 0, item.currency || sale.currency)}</small>
                  </>
                )}
                {item.kind === "Refund" && <small>Refund mode: {item.mode || "amount"}</small>}
              </div>
              {item.note && <p>{item.note}</p>}
            </div>
          ))}
          {!entries.length && <div className="payment-history-empty"><DollarSign size={34}/><b>No payment entries yet</b><span>Add a partial payment to start tracking.</span></div>}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ sale, amount, note, setAmount, setNote, toWallet, setToWallet, onClose, onSave }) {
  const value = Math.max(0, parseNumber(amount));
  const nextPaid = roundMoney(Math.min(parseNumber(sale.total), parseNumber(sale.paidAmount) + value));
  const nextRemaining = roundMoney(Math.max(0, parseNumber(sale.balance) - value));
  const valid = value > 0 && value <= parseNumber(sale.balance);
  return <div className="sales-modal-backdrop payment-form-layer"><div className="payment-entry-modal">
    <div className="sales-modal-title"><div><h2>Add payment</h2></div><button type="button" onClick={onClose}><X size={18}/></button></div>
    <div className="payment-entry-facts"><span>Invoice:</span><b>{sale.invoiceNumber}</b><span>Total:</span><b>{formatCurrencyAmount(sale.total,sale.currency)}</b><span>Already Paid:</span><b className="paid">{formatCurrencyAmount(sale.paidAmount,sale.currency)}</b><span>Remaining:</span><b className="remaining">{formatCurrencyAmount(sale.balance,sale.currency)}</b></div>
    <label className="sales-form-field"><span>Payment Amount</span><input type="number" min="0" max={sale.balance} value={amount} onChange={(event)=>setAmount(event.target.value)} autoFocus/></label>
    <label className="sales-form-field"><span>Notes (optional)</span><textarea value={note} onChange={(event)=>setNote(event.target.value)}/></label>
    <label className="payment-wallet-option"><span><WalletCards size={16}/><span><b>Cash wallet payment</b><small>{toWallet?"Adds this payment to Cash Wallet":"History only — Cash Wallet unchanged"}</small></span></span><input type="checkbox" checked={toWallet} onChange={(event)=>setToWallet(event.target.checked)}/></label>
    <div className="payment-entry-result"><span>New Paid Amount:</span><b className="paid">{formatCurrencyAmount(nextPaid,sale.currency)}</b><span>New Remaining:</span><b className={nextRemaining>0?"remaining":"paid"}>{formatCurrencyAmount(nextRemaining,sale.currency)}</b></div>
    <div className="sales-modal-actions"><button type="button" className="sales-light-btn" onClick={onClose}>Cancel</button><button type="button" className="sales-primary-btn" disabled={!valid} onClick={onSave}>Record Payment</button></div>
  </div></div>;
}

function InvoicePrintStudio({ sale, company, onClose }) {
  const saved = normalizePrintSettings(company.printSettings || {}, company);
  const initialPaper = saved.paperSize === "80mm Thermal" ? "T80" : saved.paperSize;
  const [paper, setPaper] = useState(initialPaper || "A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState("normal");
  const [scale, setScale] = useState(101);
  const [sizes, setSizes] = useState({ title: saved.titleSize, subtitle: saved.subtitleSize, header: saved.headerTextSize, body: saved.bodyTextSize, footer: saved.footerTextSize });
  const baseSize = { A4:[210,297], A5:[148,210], Letter:[216,279], Legal:[216,356], T80:[80,220], T58:[58,190], Custom:[210,297] }[paper] || [210,297];
  const thermal = paper === "T80" || paper === "T58";
  const paperSize = orientation === "landscape" && !thermal ? [baseSize[1],baseSize[0]] : baseSize;
  const marginSize = { narrow:7, normal:14, wide:22 }[margin];
  const subtotal = parseNumber(sale.subtotal) || sale.items.reduce((sum,item)=>sum+parseNumber(item.lineTotal),0);
  const discount = getSaleDiscountTotal(sale);
  const status = sale.paymentStatus === "paid" ? "PAID" : "LOAN";
  const exportExcel = () => {
    const quote = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
    const rows = [["Invoice",sale.invoiceNumber],["Customer",sale.customerName],["Date",sale.date],[],["Item","Code","Quantity","Rate","Total"],...sale.items.map((item)=>[item.name,item.code,item.quantity,item.price,item.lineTotal]),[],["Subtotal",subtotal],["Discount",discount],["Total",sale.total],["Paid",sale.paidAmount],["Remaining",sale.balance]];
    const blob = new Blob(["\ufeff" + rows.map((row)=>row.map(quote).join(",")).join("\r\n")], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href=url; link.download=`${sale.invoiceNumber}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="invoice-print-backdrop">
    <style>{`@media print{@page{size:${paperSize[0]}mm ${paperSize[1]}mm;margin:0}}`}</style>
    <section className="invoice-print-studio">
      <header className="invoice-print-toolbar"><strong><Printer size={16}/> Tax Invoice — {sale.invoiceNumber}</strong><div><button onClick={()=>setScale(v=>Math.max(55,v-8))}>−</button><span>{scale}%</span><button onClick={()=>setScale(v=>Math.min(110,v+8))}>+</button><button onClick={()=>window.print()}><FileDown size={15}/> PDF</button><button onClick={exportExcel}><FileSpreadsheet size={15}/> Excel</button><button className="primary" onClick={()=>window.print()}><Printer size={15}/> Print</button><button className="close" onClick={onClose}><X size={17}/></button></div></header>
      <div className="invoice-print-body">
        <aside className="invoice-print-controls">
          <PrintControl title="Paper" values={["A4","A5","Letter","Legal","T80","T58","Custom"]} value={paper} onChange={setPaper}/>
          <PrintControl title="Orientation" values={["Portrait","Landscape"]} value={orientation === "portrait" ? "Portrait" : "Landscape"} onChange={(v)=>setOrientation(v.toLowerCase())}/>
          <PrintControl title="Page Margin" values={["Narrow","Normal","Wide"]} value={margin[0].toUpperCase()+margin.slice(1)} onChange={(v)=>setMargin(v.toLowerCase())}/>
          <h4>Live Typography</h4>{Object.entries(sizes).map(([key,value])=><label className="invoice-print-range" key={key}><span>{key}<b>{value}px</b></span><input type="range" min="7" max={key==="title"?34:20} value={value} onChange={(e)=>setSizes(s=>({...s,[key]:Number(e.target.value)}))}/></label>)}
          <small>{paper} · {orientation} · {marginSize}mm</small>
        </aside>
        <main className="invoice-print-canvas">
          <article className={`invoice-report-paper ${thermal?"thermal":""}`} style={{width:`${paperSize[0]}mm`,minHeight:`${paperSize[1]}mm`,"--invoice-scale":scale/100,"--invoice-margin":`${thermal?Math.min(5,marginSize):marginSize}mm`,"--invoice-primary":saved.primaryColor,"--invoice-accent":saved.accentColor,"--invoice-title":`${sizes.title}px`,"--invoice-subtitle":`${sizes.subtitle}px`,"--invoice-header":`${sizes.header}px`,"--invoice-body":`${sizes.body}px`,"--invoice-footer":`${sizes.footer}px`}}>
            <header className="invoice-report-header">{saved.showLogo && saved.logo?<img src={saved.logo} alt=""/>:<div className="invoice-report-logo"><ReceiptText size={27}/></div>}<div><strong>{saved.businessNameEn}</strong><span>{saved.subtitleEn}</span></div><p>{[saved.businessNameFa,saved.subtitleFa,saved.phone,saved.address].filter(Boolean).join(" · ")}</p></header>
            {saved.watermark&&<img className="invoice-report-watermark" src={saved.watermark} alt="" style={{opacity:Number(saved.watermarkOpacity||0)/100}}/>}
            <section className="invoice-report-heading"><div><small>INVOICE</small><h1>Tax Invoice</h1></div><div><b>Invoice # {sale.invoiceNumber}</b><span>Date {getGregorianLabel(sale.date)} / {getShamsiShortLabel(sale.date)}</span><span>Status {status}</span></div></section>
            <section className="invoice-report-parties"><div><span>BILL TO</span><b>{sale.customerName || "Walk-in Customer"}</b></div><div><span>SOLD BY</span><b>{saved.businessNameEn}</b></div></section>
            <table data-table-enhancer="off"><thead><tr><th>#</th><th>ITEM</th><th>QTY</th><th>RATE</th><th>TOTAL</th></tr></thead><tbody>{sale.items.map((item,index)=><tr key={`${item.productId}-${index}`}><td>{index+1}</td><td><b>{item.name}</b><small>{item.code}</small></td><td>{item.quantity} {item.unit||"pcs"}</td><td>{formatCurrencyAmount(item.price,sale.currency)}</td><td>{formatCurrencyAmount(item.lineTotal,sale.currency)}</td></tr>)}</tbody></table>
            <section className="invoice-report-summary"><div><span>Subtotal</span><b>{formatCurrencyAmount(subtotal,sale.currency)}</b></div>{discount>0&&<div><span>Discount</span><b>{formatCurrencyAmount(discount,sale.currency)}</b></div>}<div className="total"><span>Total</span><b>{formatCurrencyAmount(sale.total,sale.currency)}</b></div><div><span>Paid</span><b>{formatCurrencyAmount(sale.paidAmount,sale.currency)}</b></div>{parseNumber(sale.balance)>0&&<div><span>Remaining</span><b>{formatCurrencyAmount(sale.balance,sale.currency)}</b></div>}</section>
            <p className="invoice-payment-method">Payment method: <b>{sale.paymentMethod || "Cash"}</b></p>
            <footer><span>{saved.footerText || "Powered by Smart Office"}</span>{saved.showTimestamp&&<span>Printed {new Date().toLocaleString()}</span>}</footer>
          </article>
        </main>
      </div>
    </section>
  </div>;
}

function ReceiptPrintStudio({ sale, company, onClose }) {
  const saved = normalizePrintSettings(company.printSettings || {}, company);
  const [paper, setPaper] = useState("T80");
  const [scale, setScale] = useState(140);
  const [sizes, setSizes] = useState({ title:12, subtitle:8, header:9, body:7, footer:7 });
  const width = { A4:210, A5:148, Letter:216, Legal:216, T80:80, T58:58, Custom:80 }[paper] || 80;
  const thermal = paper === "T80" || paper === "T58";
  const subtotal = parseNumber(sale.subtotal) || sale.items.reduce((sum,item)=>sum+parseNumber(item.lineTotal),0);
  return <div className="invoice-print-backdrop receipt-studio-backdrop">
    <style>{`@media print{@page{size:${thermal?`${width}mm auto`:paper};margin:${thermal?"4mm":"10mm"}}}`}</style>
    <section className="invoice-print-studio receipt-print-studio">
      <header className="invoice-print-toolbar"><strong><ReceiptText size={16}/> Receipt — {sale.invoiceNumber}</strong><div><button onClick={()=>setScale(v=>Math.max(70,v-10))}>−</button><span>{scale}%</span><button onClick={()=>setScale(v=>Math.min(180,v+10))}>+</button><button onClick={()=>window.print()}><FileDown size={15}/> PDF</button><button className="primary" onClick={()=>window.print()}><Printer size={15}/> Print</button><button className="close" onClick={onClose}><X size={17}/></button></div></header>
      <div className="invoice-print-body">
        <aside className="invoice-print-controls"><PrintControl title="Paper" values={["A4","A5","Letter","Legal","T80","T58","Custom"]} value={paper} onChange={setPaper}/><h4>Live Typography</h4>{Object.entries(sizes).map(([key,value])=><label className="invoice-print-range" key={key}><span>{key}<b>{value}px</b></span><input type="range" min="6" max={key==="title"?20:14} value={value} onChange={(e)=>setSizes(s=>({...s,[key]:Number(e.target.value)}))}/></label>)}<small>{thermal?`Thermal ${width}mm · roll`:`${paper} receipt`}</small></aside>
        <main className="invoice-print-canvas receipt-print-canvas">
          <article className={`receipt-report-paper ${thermal?"thermal":"sheet"}`} style={{width:`${width}mm`,"--receipt-scale":scale/100,"--receipt-title":`${sizes.title}px`,"--receipt-subtitle":`${sizes.subtitle}px`,"--receipt-header":`${sizes.header}px`,"--receipt-body":`${sizes.body}px`,"--receipt-footer":`${sizes.footer}px`}}>
            <header>{saved.showLogo&&saved.logo?<img src={saved.logo} alt=""/>:<div className="receipt-logo"><ReceiptText size={24}/></div>}<h1>{saved.businessNameEn}</h1><p>{saved.subtitleEn}</p></header>
            <div className="receipt-divider"/><section className="receipt-meta"><span>Receipt #</span><b>{sale.invoiceNumber}</b><span>Date</span><b>{getGregorianLabel(sale.date)}</b><span>Customer</span><b>{sale.customerName||"Walk-in Customer"}</b></section>
            <table data-table-enhancer="off"><thead><tr><th>ITEM</th><th>QTY</th><th>PRICE</th><th>TOTAL</th></tr></thead><tbody>{sale.items.map((item,index)=><tr key={`${item.productId}-${index}`}><td>{item.name}<small>{item.code}</small></td><td>{item.quantity}{item.unit?` ${item.unit}`:""}</td><td>{formatCurrencyAmount(item.price,sale.currency)}</td><td>{formatCurrencyAmount(item.lineTotal,sale.currency)}</td></tr>)}</tbody></table>
            <div className="receipt-divider"/><section className="receipt-totals"><span>Subtotal</span><b>{formatCurrencyAmount(subtotal,sale.currency)}</b>{getSaleDiscountTotal(sale)>0&&<><span>Discount</span><b>{formatCurrencyAmount(getSaleDiscountTotal(sale),sale.currency)}</b></>}<strong>TOTAL</strong><strong>{formatCurrencyAmount(sale.total,sale.currency)}</strong><span>Paid ({sale.paymentMethod||"CASH"})</span><b>{formatCurrencyAmount(sale.paidAmount,sale.currency)}</b>{parseNumber(sale.balance)>0&&<><span>Remaining</span><b>{formatCurrencyAmount(sale.balance,sale.currency)}</b></>}</section>
            <div className="receipt-divider"/><footer><b>Thank you for your purchase!</b><span>{saved.footerText||"Powered by Smart Office"}</span>{saved.showTimestamp&&<small>{new Date().toLocaleString()}</small>}</footer>
          </article>
        </main>
      </div>
    </section>
  </div>;
}

function PrintControl({ title, values, value, onChange }) { return <><h4>{title}</h4><div className="invoice-print-choices">{values.map((item)=><button type="button" className={value===item?"active":""} key={item} onClick={()=>onChange(item)}>{item}</button>)}</div></>; }

function SalesBillsPrintStudio({ company, sales, stats, onClose }) {
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
  const reportRows = sales.slice(0, Math.max(1, rowsPerPage));
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
    pdf.save("sales-bills-report.pdf");
  };
  const exportExcel = () => {
    const headers = ["Invoice", "Customer", "Date", "Items", "Total", "Discount", "Paid", "Balance", "Status"];
    const rows = sales.map((sale) => [sale.invoiceNumber, sale.customerName, sale.date, sale.items.length, formatCurrencyAmount(sale.total, sale.currency), formatCurrencyAmount(getSaleDiscountTotal(sale), sale.currency), formatCurrencyAmount(sale.paidAmount, sale.currency), formatCurrencyAmount(sale.balance, sale.currency), parseNumber(sale.balance) > 0 ? "Loan" : "Paid"]);
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const blob = new Blob([`\ufeff${[headers, ...rows].map((row) => row.map(quote).join(",")).join("\n")}`], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-bills-report.xls";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="standard-print-backdrop">
      <style>{`@media print { @page { size: ${paperSize[0]}mm ${paperSize[1]}mm; margin: 0; } }`}</style>
      <section className="standard-print-studio">
        <header className="standard-print-toolbar">
          <div className="standard-print-titlebar">
            <button type="button" className={`standard-print-settings-toggle${settingsOpen ? " active" : ""}`} onClick={() => setSettingsOpen((current) => !current)} title="Print settings">
              <SlidersHorizontal size={17} />
            </button>
            <strong><Printer size={16} /> Sales / Bills Report</strong>
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
              <div className="standard-report-header">{saved.showLogo && saved.logo ? <img src={saved.logo} alt="" /> : <div className="standard-report-logo"><ReceiptText size={28} /></div>}<div><strong>{saved.businessNameEn}</strong><span>{saved.subtitleEn}</span></div><p>{[saved.phone, saved.email, saved.address].filter(Boolean).join(" - ")}</p></div>
              {saved.watermark && <img className="standard-report-watermark" src={saved.watermark} alt="" style={{ opacity: Number(saved.watermarkOpacity || 0) / 100 }} />}
              <div className="standard-report-heading"><div><small>REPORT</small><h1>Sales / Bills Report</h1><p>All filtered invoices</p></div><div><b>{new Date().toLocaleString()}</b><span>Records {sales.length}</span><span>Page 1 of 1</span></div></div>
              <div className="standard-report-stats"><div><span>INVOICES</span><b>{stats.invoices}</b></div><div><span>PAID</span><b>{formatCurrencyTotals(stats.paid)}</b></div><div><span>PENDING</span><b>{formatCurrencyTotals(stats.pending)}</b></div></div>
              <p className="standard-report-contents">Contents: <span>1 - {Math.min(reportRows.length, sales.length)} Records</span></p>
              <table data-table-enhancer="off"><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th><th>Discount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{reportRows.map((sale) => <tr key={sale.id || sale.invoiceNumber}><td>{sale.invoiceNumber}</td><td>{sale.customerName || "-"}</td><td>{sale.date}</td><td>{formatCurrencyAmount(sale.total, sale.currency)}</td><td>{formatCurrencyAmount(getSaleDiscountTotal(sale), sale.currency)}</td><td>{formatCurrencyAmount(sale.paidAmount, sale.currency)}</td><td>{formatCurrencyAmount(sale.balance, sale.currency)}</td><td>{parseNumber(sale.balance) > 0 ? "Loan" : "Paid"}</td></tr>)}</tbody></table>
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

function AdvancedRefundModal({ sale, onClose, onSave }) {
  const [mode, setMode] = useState("quantity");
  const [amount, setAmount] = useState("");
  const [percent, setPercent] = useState("");
  const [note, setNote] = useState("");
  const [quantities, setQuantities] = useState({});
  const previouslyRefunded = (sale.refundHistory || []).reduce((totals, refund) => {
    (refund.items || []).forEach((item) => {
      const key = String(item.productId);
      totals[key] = (totals[key] || 0) + parseNumber(item.quantity);
    });
    return totals;
  }, {});
  const refundable = parseNumber(sale.paidAmount);
  const lines = sale.items.map((item) => {
    const key = String(item.productId);
    const available = Math.max(0, parseNumber(item.quantity) - parseNumber(previouslyRefunded[key]));
    const refundQuantity = Math.min(available, Math.max(0, parseNumber(quantities[key])));
    const unitAmount = parseNumber(item.quantity) > 0 ? parseNumber(item.lineTotal) / parseNumber(item.quantity) : parseNumber(item.price);
    return { ...item, available, refundQuantity, unitAmount, refundAmount: roundMoney(refundQuantity * unitAmount) };
  });
  const quantityAmount = roundMoney(lines.reduce((sum, item) => sum + item.refundAmount, 0));
  const refundValue = mode === "quantity" ? quantityAmount : mode === "percent"
    ? roundMoney(refundable * Math.min(100, Math.max(0, parseNumber(percent))) / 100)
    : roundMoney(amount);
  const remainingStockValue = lines.reduce((sum, item) => sum + (item.available * item.unitAmount), 0);
  const proportionalRatio = mode === "percent"
    ? Math.min(1, Math.max(0, parseNumber(percent)) / 100)
    : mode === "amount" && remainingStockValue > 0
      ? Math.min(1, Math.max(0, refundValue) / remainingStockValue)
      : 0;
  const calculatedLines = lines.map((line) => {
    if (mode === "quantity") return line;
    const calculatedQuantity = Math.min(line.available, line.available * proportionalRatio);
    return {
      ...line,
      refundQuantity: Number(calculatedQuantity.toFixed(4)),
      refundAmount: roundMoney(calculatedQuantity * line.unitAmount),
    };
  });
  const canSave = refundValue > 0 && refundValue <= refundable && note.trim();
  const updateQuantity = (line, value) => setQuantities((current) => ({
    ...current,
    [String(line.productId)]: Math.min(line.available, Math.max(0, parseNumber(value))),
  }));

  return <div className="sales-modal-backdrop"><div className="sales-refund-modal">
    <div className="sales-modal-title"><div><h2><RefreshCcw size={17}/> Process Refund — {sale.invoiceNumber}</h2><p>{sale.customerName}</p></div><button type="button" onClick={onClose}><X size={18}/></button></div>
    <div className="sales-refund-summary"><span>Refundable</span><strong>{formatCurrencyAmount(refundable, sale.currency)}</strong></div>
    <div className="sales-refund-modes"><span>Refund mode:</span>{[{id:"quantity",label:"By quantity"},{id:"percent",label:"By percent"},{id:"amount",label:"By amount"}].map((option)=><button type="button" key={option.id} className={mode===option.id?"active":""} onClick={()=>setMode(option.id)}>{option.label}</button>)}
      {mode==="percent"&&<label><input type="number" min="0" max="100" value={percent} onChange={(event)=>setPercent(event.target.value)}/><span>% of remaining refundable</span></label>}
      {mode==="amount"&&<label><input type="number" min="0" max={refundable} value={amount} onChange={(event)=>setAmount(event.target.value)}/><span>{sale.currency} — refund amount</span></label>}
    </div>
    <div className="sales-refund-table-wrap"><table><thead><tr><th>Name</th><th>Original Qty</th><th>Refunded</th><th>Refund Qty</th><th>Refund Amount</th></tr></thead><tbody>{calculatedLines.map((line)=><tr key={line.productId}><td><strong>{line.name}</strong><small>{line.code}</small></td><td>{line.quantity} {line.unit||"pcs"}</td><td>{previouslyRefunded[String(line.productId)]||"—"}</td><td><div className="sales-refund-stepper"><button type="button" disabled={mode!=="quantity"} onClick={()=>updateQuantity(line,line.refundQuantity-1)}>−</button><input disabled={mode!=="quantity"} value={line.refundQuantity} onChange={(event)=>updateQuantity(line,event.target.value)}/><button type="button" disabled={mode!=="quantity"} onClick={()=>updateQuantity(line,line.refundQuantity+1)}>+</button></div></td><td>{line.refundAmount>0?formatCurrencyAmount(line.refundAmount,sale.currency):"—"}</td></tr>)}</tbody></table></div>
    <label className="sales-form-field"><span>Reason for Refund *</span><textarea value={note} onChange={(event)=>setNote(event.target.value)} placeholder="Enter the reason for this refund..."/></label>
    <div className="sales-refund-total"><span>Refund total</span><strong>{formatCurrencyAmount(refundValue,sale.currency)}</strong></div>
    <div className="sales-modal-actions"><button type="button" className="sales-light-btn" onClick={onClose}>Cancel</button><button type="button" className="sales-danger-btn" disabled={!canSave} onClick={()=>onSave({amount:refundValue,note,mode,percent,items:calculatedLines.filter((line)=>line.refundQuantity>0).map((line)=>({productId:line.productId,name:line.name,quantity:line.refundQuantity,amount:line.refundAmount}))})}><RefreshCcw size={14}/> Confirm Refund</button></div>
  </div></div>;
}

// eslint-disable-next-line no-unused-vars
function RefundModal({ sale, amount, note, setAmount, setNote, onClose, onSave }) {
  return (
    <FormModal
      title="Record Refund"
      subtitle={`${sale.invoiceNumber} · Paid ${formatCurrencyAmount(sale.paidAmount, sale.currency)}`}
      amount={amount}
      note={note}
      setAmount={setAmount}
      setNote={setNote}
      onClose={onClose}
      onSave={onSave}
      saveText="Record Refund"
      danger
    />
  );
}

function FormModal({ title, subtitle, amount, note, setAmount, setNote, onClose, onSave, saveText, danger = false }) {
  return (
    <div className="sales-modal-backdrop">
      <div className="sales-form-modal">
        <div className="sales-modal-title">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <label className="sales-form-field">
          <span>Amount</span>
          <input value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus />
        </label>
        <label className="sales-form-field">
          <span>Note</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="sales-modal-actions">
          <button type="button" className="sales-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className={danger ? "sales-danger-btn" : "sales-primary-btn"} onClick={onSave}>
            {saveText}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmText, danger = false, onClose, onConfirm }) {
  return (
    <div className="sales-modal-backdrop">
      <div className="sales-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="sales-modal-actions">
          <button type="button" className="sales-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className={danger ? "sales-danger-btn" : "sales-primary-btn"} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SalesBills;
