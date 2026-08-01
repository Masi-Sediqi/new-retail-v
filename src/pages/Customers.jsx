import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  CreditCard,
  DollarSign,
  Eye,
  History,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  UserRoundPen,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import FloatingActionMenu from "../components/FloatingActionMenu";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import { createRecycleEntry } from "../utils/recycleBin";
import "./Customers.css";

const emptyCustomer = {
  name: "",
  customerName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  vip: false,
  purchases: 0,
  pending: 0,
  status: "Active",
  customFields: {},
};

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;

const parseDateInput = (value) => (value ? new Date(`${value}T12:00:00`) : null);

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

const getCustomerName = (customer) =>
  customer.name ||
  customer.customerName ||
  customer.fullName ||
  `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
  "Unnamed Customer";

const getCustomerKey = (customer) => String(customer.id || customer.customerId || getCustomerName(customer));

const getSaleItems = (sale) => (Array.isArray(sale.items) ? sale.items : []);

const getSaleCost = (sale, products = []) =>
  getSaleItems(sale).reduce((sum, item) => {
    const product = products.find((current) => String(current.id) === String(item.productId));
    const cost = parseNumber(item.purchase ?? item.cost ?? product?.purchase ?? product?.purchasePrice);
    return sum + cost * parseNumber(item.quantity || 1);
  }, 0);

const getCustomerSales = (customer, sales = []) => {
  const customerId = getCustomerKey(customer);
  const name = getCustomerName(customer).toLowerCase();

  return sales.filter((sale) => {
    const saleCustomerId = String(sale.customerId || sale.customerRecordId || "");
    const saleCustomerName = String(sale.customerName || "").toLowerCase();
    return (
      (saleCustomerId && saleCustomerId === customerId) ||
      saleCustomerName === name ||
      (!saleCustomerId && saleCustomerName && saleCustomerName === name)
    );
  });
};

const getDateMatches = (dateValue, filter, customStartDate, customEndDate) => {
  const date = parseDateInput(dateValue);
  if (!date) return true;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const daysOld = Math.floor((now - day) / 86400000);
  const rangeStart = parseDateInput(customStartDate);
  const rangeEnd = customEndDate ? new Date(`${customEndDate}T23:59:59`) : null;

  return (
    filter === "all" ||
    (filter === "today" && daysOld === 0) ||
    (filter === "weekly" && daysOld <= 7) ||
    (filter === "monthly" && daysOld <= 31) ||
    (filter === "annual" && daysOld <= 366) ||
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

function Customers() {
  const [customers, setCustomers] = useJsonCollection("customers");
  const [sales] = useJsonCollection("billingInvoices");
  const [products] = useJsonCollection("products");
  const [settings] = useJsonCollection("settings");
  const [, setDeletedItems] = useJsonCollection("deletedItems");

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [profileCustomerId, setProfileCustomerId] = useState("");
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const normalizedCustomers = useMemo(
    () =>
      customers.map((customer) => ({
        ...emptyCustomer,
        ...customer,
        id: customer.id || customer.customerId || `customer-${getCustomerName(customer)}`,
        name: getCustomerName(customer),
        status: customer.status || "Active",
      })),
    [customers]
  );

  const customerSummaries = useMemo(
    () =>
      normalizedCustomers.map((customer) => {
        const customerSales = getCustomerSales(customer, sales);
        const hasSales = customerSales.length > 0;
        const purchases = hasSales
          ? customerSales.reduce((sum, sale) => sum + parseNumber(sale.total), 0)
          : parseNumber(customer.purchases);
        const pending = hasSales
          ? customerSales.reduce((sum, sale) => sum + parseNumber(sale.balance), 0)
          : parseNumber(customer.pending);
        const latestSale = [...customerSales].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
        const latestDate = latestSale?.date || customer.createdAt?.slice(0, 10) || "";
        return { ...customer, purchases, pending, latestDate, salesCount: customerSales.length };
      }),
    [normalizedCustomers, sales]
  );

  const filteredCustomers = useMemo(
    () =>
      customerSummaries.filter((customer) => {
        const needle = search.trim().toLowerCase();
        const matchesSearch =
          !needle ||
          [customer.name, customer.phone, customer.email, customer.address, customer.notes]
            .join(" ")
            .toLowerCase()
            .includes(needle);
        const status = String(customer.status || "Active").toLowerCase();
        const matchesStatus = statusFilter === "all" || status === statusFilter;
        const hasLoan = parseNumber(customer.pending) > 0;
        const matchesPayment =
          paymentFilter === "all" ||
          (paymentFilter === "paid" && !hasLoan) ||
          (paymentFilter === "loan" && hasLoan);
        const matchesDate = getDateMatches(customer.latestDate, dateFilter, customStartDate, customEndDate);
        return matchesSearch && matchesStatus && matchesPayment && matchesDate;
      }),
    [customEndDate, customStartDate, customerSummaries, dateFilter, paymentFilter, search, statusFilter]
  );

  const profileCustomer = customerSummaries.find((customer) => String(customer.id) === String(profileCustomerId));
  const pagination = useTablePagination(
    filteredCustomers,
    `${search}-${statusFilter}-${paymentFilter}-${dateFilter}-${customStartDate}-${customEndDate}`
  );

  const totals = useMemo(
    () => ({
      customers: customerSummaries.length,
      vip: customerSummaries.filter((customer) => customer.vip).length,
      purchases: customerSummaries.reduce((sum, customer) => sum + parseNumber(customer.purchases), 0),
      pending: customerSummaries.reduce((sum, customer) => sum + parseNumber(customer.pending), 0),
    }),
    [customerSummaries]
  );

  const saveCustomer = async (customer) => {
    const cleanCustomer = {
      ...customer,
      id: customer.id || `customer-${Date.now()}`,
      name: customer.name.trim(),
      customerName: customer.name.trim(),
      phone: customer.phone.trim(),
      email: customer.email.trim(),
      address: customer.address.trim(),
      notes: customer.notes.trim(),
      purchases: roundMoney(customer.purchases),
      pending: roundMoney(customer.pending),
      status: customer.status || "Active",
      updatedAt: new Date().toISOString(),
      createdAt: customer.createdAt || new Date().toISOString(),
    };

    if (!cleanCustomer.name) {
      notify("Please enter customer name.", "error");
      return;
    }

    const duplicate = customers.some((item) => {
      if (String(item.id || item.customerId) === String(cleanCustomer.id)) return false;
      const samePhone = cleanCustomer.phone && String(item.phone || "") === cleanCustomer.phone;
      const sameEmail = cleanCustomer.email && String(item.email || "").toLowerCase() === cleanCustomer.email.toLowerCase();
      return samePhone || sameEmail;
    });

    if (duplicate) {
      notify("A customer with this phone or email already exists.", "error");
      return;
    }

    const saved = await setCustomers((current) => {
      const exists = current.some((item) => String(item.id || item.customerId) === String(cleanCustomer.id));
      return exists
        ? current.map((item) => (String(item.id || item.customerId) === String(cleanCustomer.id) ? cleanCustomer : item))
        : [cleanCustomer, ...current];
    });

    if (!saved) return;
    notify(editingCustomer ? "Customer updated successfully." : "Customer added successfully.");
    setModalOpen(false);
    setEditingCustomer(null);
  };

  const removeCustomer = async () => {
    if (!deleteCustomer) return;
    const archived = await setDeletedItems((current) => [
      createRecycleEntry("customers", deleteCustomer, deleteCustomer.name || deleteCustomer.customerName),
      ...current,
    ]);
    if (!archived) return;

    const saved = await setCustomers((current) =>
      current.filter((customer) => String(customer.id || customer.customerId) !== String(deleteCustomer.id))
    );
    if (!saved) return;
    notify("Customer deleted successfully.");
    setDeleteCustomer(null);
  };

  const printCustomerReport = () => {
    printRows(
      "Customer Report",
      filteredCustomers.map((customer) => ({
        Name: customer.name,
        Phone: customer.phone || "-",
        Email: customer.email || "-",
        Purchases: formatCurrencyAmount(customer.purchases, baseCurrency),
        Pending: formatCurrencyAmount(customer.pending, baseCurrency),
        Status: customer.status,
      }))
    );
  };

  if (profileCustomer) {
    return (
      <CustomerProfile
        baseCurrency={baseCurrency}
        customer={profileCustomer}
        onBack={() => setProfileCustomerId("")}
        onEdit={(customer) => {
          setEditingCustomer(customer);
          setModalOpen(true);
        }}
        products={products}
        sales={sales}
      >
        {modalOpen && (
          <CustomerModal
            initialCustomer={editingCustomer}
            onClose={() => {
              setModalOpen(false);
              setEditingCustomer(null);
            }}
            onSave={saveCustomer}
          />
        )}
      </CustomerProfile>
    );
  }

  return (
    <div className="customers-page">
      <div className="customers-header">
        <div>
          <h1>Customers</h1>
          <p>Manage customer profiles, purchases, payments, loans and account activity.</p>
        </div>
        <div className="customers-header-actions">
          <button type="button" className="customer-light-btn" onClick={printCustomerReport}>
            <Printer size={16} />
            Print
          </button>
          <button type="button" className="customer-primary-btn" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      <section className="customer-stats">
        <StatCard icon={Users} label="Total Customers" value={totals.customers} />
        <StatCard icon={Users} label="VIP Customers" value={totals.vip} tone="success" />
        <StatCard icon={ShoppingCart} label="Total Purchases" value={formatCurrencyAmount(totals.purchases, baseCurrency)} />
        <StatCard icon={WalletCards} label="Total Pending" value={formatCurrencyAmount(totals.pending, baseCurrency)} tone="warning" />
      </section>

      <section className="customer-table-card">
        <div className="customer-toolbar">
          <label className="customer-search">
            <Search size={16} />
            <input
              placeholder="Search customers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <CustomSelect
            ariaLabel="Customer status"
            className="customer-filter-select"
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <CustomSelect
            ariaLabel="Payment status"
            className="customer-filter-select"
            options={[
              { value: "all", label: "All payments" },
              { value: "paid", label: "Paid" },
              { value: "loan", label: "Loan" },
            ]}
            value={paymentFilter}
            onChange={setPaymentFilter}
          />
          <div className="customer-date-filter">
            <CustomSelect
              ariaLabel="Date filter"
              className="customer-filter-select"
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
              <div className="customer-inline-dates">
                <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
                <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="customer-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Orders</th>
                <th>Purchases</th>
                <th>Pending</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((customer) => (
                <tr key={customer.id}>
                  <td className="customer-name-cell">
                    <strong>{customer.name}</strong>
                    <span>{customer.vip ? "VIP customer" : customer.address || "No address"}</span>
                  </td>
                  <td>
                    <span className="customer-stacked-cell">
                      {customer.phone || "-"}
                      <small>{customer.email || "No email"}</small>
                    </span>
                  </td>
                  <td>{customer.salesCount}</td>
                  <td>{formatCurrencyAmount(customer.purchases, baseCurrency)}</td>
                  <td className={customer.pending > 0 ? "customer-warning-text" : ""}>
                    {formatCurrencyAmount(customer.pending, baseCurrency)}
                  </td>
                  <td>
                    <span className={String(customer.status).toLowerCase() === "inactive" ? "customer-status warning" : "customer-status active"}>
                      {String(customer.status).toLowerCase() === "inactive" ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td>
                    <FloatingActionMenu
                      ariaLabel="Customer actions"
                      actions={[
                        { icon: <Eye size={15} />, label: "View Profile", onClick: () => setProfileCustomerId(customer.id) },
                        {
                          icon: <UserRoundPen size={15} />,
                          label: "Edit",
                          onClick: () => {
                            setEditingCustomer(customer);
                            setModalOpen(true);
                          },
                        },
                        { danger: true, icon: <Trash2 size={15} />, label: "Delete", onClick: () => setDeleteCustomer(customer) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {!filteredCustomers.length && (
                <tr>
                  <td colSpan="7" className="customer-empty">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={filteredCustomers.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
        />
      </section>

      {modalOpen && (
        <CustomerModal
          initialCustomer={editingCustomer}
          onClose={() => {
            setModalOpen(false);
            setEditingCustomer(null);
          }}
          onSave={saveCustomer}
        />
      )}

      {deleteCustomer && (
        <ConfirmModal
          title="Delete Customer"
          message={`Delete ${deleteCustomer.name}? This customer profile will be removed from the list.`}
          onClose={() => setDeleteCustomer(null)}
          onConfirm={removeCustomer}
        />
      )}
    </div>
  );
}

function CustomerProfile({ baseCurrency, children, customer, onBack, onEdit, products, sales }) {
  const [activeTab, setActiveTab] = useState("orders");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const customerSales = useMemo(() => getCustomerSales(customer, sales), [customer, sales]);

  const filteredSales = useMemo(
    () =>
      customerSales.filter((sale) => {
        const needle = query.trim().toLowerCase();
        const matchesQuery =
          !needle ||
          String(sale.invoiceNumber || "").toLowerCase().includes(needle) ||
          getSaleItems(sale).some((item) =>
            [item.name, item.code].some((value) => String(value || "").toLowerCase().includes(needle))
          );
        const isLoan = parseNumber(sale.balance) > 0 || sale.paymentStatus === "loan";
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "paid" && !isLoan) ||
          (statusFilter === "loan" && isLoan);
        const matchesDate = getDateMatches(sale.date, dateFilter, customStartDate, customEndDate);
        return matchesQuery && matchesStatus && matchesDate;
      }),
    [customEndDate, customStartDate, customerSales, dateFilter, query, statusFilter]
  );

  const totals = useMemo(() => {
    const totalRevenue = customerSales.reduce((sum, sale) => sum + parseNumber(sale.total), 0);
    const totalSpent = customerSales.reduce((sum, sale) => sum + parseNumber(sale.paidAmount), 0);
    const pendingBalance = customerSales.reduce((sum, sale) => sum + parseNumber(sale.balance), 0);
    const totalDiscounts = customerSales.reduce((sum, sale) => sum + parseNumber(sale.discountTotal), 0);
    const totalCost = customerSales.reduce((sum, sale) => sum + getSaleCost(sale, products), 0);
    return {
      totalCost,
      totalDiscounts,
      totalOrders: customerSales.length,
      totalRevenue,
      totalSpent,
      pendingBalance,
      profit: totalRevenue - totalCost,
    };
  }, [customerSales, products]);

  const paymentRows = filteredSales.flatMap((sale) => {
    const payments = (sale.paymentHistory || []).map((payment) => ({
      id: payment.id,
      invoice: sale.invoiceNumber,
      amount: payment.amount,
      total: sale.total,
      date: payment.createdAt?.slice(0, 10) || sale.date,
      status: sale.paymentStatus,
      description: payment.notes || "Payment recorded",
      currency: sale.currency || baseCurrency,
    }));
    if (payments.length) return payments;
    return parseNumber(sale.paidAmount) > 0
      ? [
          {
            id: `${sale.id}-initial-payment`,
            invoice: sale.invoiceNumber,
            amount: sale.paidAmount,
            total: sale.total,
            date: sale.date,
            status: sale.paymentStatus,
            description: "Payment recorded",
            currency: sale.currency || baseCurrency,
          },
        ]
      : [];
  });

  const loanRows = filteredSales.filter((sale) => parseNumber(sale.balance) > 0);
  const profitRows = filteredSales.map((sale) => {
    const cost = getSaleCost(sale, products);
    return { ...sale, cost, profit: parseNumber(sale.total) - cost };
  });
  const activityRows = filteredSales.flatMap((sale) => [
    ...(sale.updatedAt
      ? [
          {
            id: `${sale.id}-updated`,
            action: "Bill Updated",
            description: `${sale.invoiceNumber} - ${formatCurrencyAmount(sale.total, sale.currency || baseCurrency)}`,
            date: sale.updatedAt.slice(0, 10),
          },
        ]
      : []),
    {
      id: `${sale.id}-created`,
      action: "New Sale Created",
      description: `${sale.invoiceNumber} - ${formatCurrencyAmount(sale.total, sale.currency || baseCurrency)}`,
      date: sale.date,
    },
    ...(parseNumber(sale.balance) > 0
      ? [
          {
            id: `${sale.id}-loan`,
            action: "Loan Created",
            description: `Loan - ${formatCurrencyAmount(sale.balance, sale.currency || baseCurrency)}`,
            date: sale.date,
          },
        ]
      : []),
  ]);

  const displayCurrency = customerSales[0]?.currency || baseCurrency;

  const printProfile = () => {
    const rows =
      activeTab === "payments"
        ? paymentRows.map((row) => ({
            Invoice: row.invoice,
            Amount: formatCurrencyAmount(row.amount, row.currency),
            Description: row.description,
            Date: getDateLabel(row.date),
          }))
        : activeTab === "loans"
          ? loanRows.map((sale) => ({
              Invoice: sale.invoiceNumber,
              Total: formatCurrencyAmount(sale.total, sale.currency || baseCurrency),
              Paid: formatCurrencyAmount(sale.paidAmount, sale.currency || baseCurrency),
              Remaining: formatCurrencyAmount(sale.balance, sale.currency || baseCurrency),
              Date: getDateLabel(sale.date),
            }))
          : activeTab === "profit"
            ? profitRows.map((sale) => ({
                Invoice: sale.invoiceNumber,
                Revenue: formatCurrencyAmount(sale.total, sale.currency || baseCurrency),
                Cost: formatCurrencyAmount(sale.cost, sale.currency || baseCurrency),
                Profit: formatCurrencyAmount(sale.profit, sale.currency || baseCurrency),
                Date: getDateLabel(sale.date),
              }))
            : activeTab === "activity"
              ? activityRows.map((activity) => ({
                  Action: activity.action,
                  Description: activity.description,
                  Date: getDateLabel(activity.date),
                }))
              : filteredSales.map((sale) => ({
                  Invoice: sale.invoiceNumber,
                  Items: getSaleItems(sale).length,
                  Total: formatCurrencyAmount(sale.total, sale.currency || baseCurrency),
                  Paid: formatCurrencyAmount(sale.paidAmount, sale.currency || baseCurrency),
                  Balance: formatCurrencyAmount(sale.balance, sale.currency || baseCurrency),
                  Date: getDateLabel(sale.date),
                }));

    printRows(`${customer.name} - Customer Statement`, rows);
  };

  return (
    <div className="customers-page customer-profile-page">
      <div className="customer-profile-head">
        <button type="button" className="customer-back-btn" onClick={onBack}>
          <ChevronLeft size={19} />
        </button>
        <div className="customer-avatar">
          <Users size={25} />
        </div>
        <div>
          <h1>{customer.name}</h1>
          <p>{[customer.phone, customer.email, `Member since ${getDateLabel((customer.createdAt || "").slice(0, 10))}`].filter(Boolean).join(" / ")}</p>
        </div>
        <div className="customer-profile-actions">
          <button type="button" className="customer-light-btn" onClick={() => onEdit(customer)}>
            <UserRoundPen size={16} />
            Edit
          </button>
          <button type="button" className="customer-primary-btn" onClick={printProfile}>
            <Printer size={16} />
            Print Statement
          </button>
        </div>
      </div>

      <section className="customer-profile-summary">
        <StatCard icon={DollarSign} label="Total Spent" value={formatCurrencyAmount(totals.totalSpent, displayCurrency)} tone="success" />
        <StatCard icon={ReceiptText} label="Total Revenue" value={formatCurrencyAmount(totals.totalRevenue, displayCurrency)} />
        <StatCard icon={ShoppingCart} label="Total Orders" value={totals.totalOrders} />
        <StatCard icon={CalendarDays} label="Pending Balance" value={formatCurrencyAmount(totals.pendingBalance, displayCurrency)} tone="warning" />
        <StatCard icon={CreditCard} label="Total Discounts" value={formatCurrencyAmount(totals.totalDiscounts, displayCurrency)} />
        <StatCard icon={BarChart3} label="Profit Earned" value={formatCurrencyAmount(totals.profit, displayCurrency)} tone="success" />
      </section>

      <section className="customer-table-card">
        <div className="customer-profile-filter">
          <label className="customer-search">
            <Search size={16} />
            <input placeholder="Search invoices..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
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
          <CustomSelect
            ariaLabel="Invoice status"
            options={[
              { value: "all", label: "All statuses" },
              { value: "paid", label: "Paid" },
              { value: "loan", label: "Loan" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          {dateFilter === "custom" && (
            <div className="customer-inline-dates">
              <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
              <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
            </div>
          )}
        </div>

        <div className="customer-profile-tabs">
          {[
            { id: "orders", icon: ShoppingCart, label: "Orders", count: filteredSales.length },
            { id: "payments", icon: CreditCard, label: "Payment History", count: paymentRows.length },
            { id: "loans", icon: WalletCards, label: "Loans", count: loanRows.length },
            { id: "profit", icon: BarChart3, label: "Profit Analysis" },
            { id: "activity", icon: History, label: "Activity Log" },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button className={activeTab === tab.id ? "active" : ""} key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}>
                <Icon size={16} />
                <span>{tab.label}{typeof tab.count === "number" ? ` (${tab.count})` : ""}</span>
              </button>
            );
          })}
        </div>

        <ProfilePanel
          activeTab={activeTab}
          activityRows={activityRows}
          baseCurrency={baseCurrency}
          filteredSales={filteredSales}
          loanRows={loanRows}
          paymentRows={paymentRows}
          profitRows={profitRows}
          totals={totals}
        />
      </section>

      {children}
    </div>
  );
}

function ProfilePanel({ activeTab, activityRows, baseCurrency, filteredSales, loanRows, paymentRows, profitRows, totals }) {
  if (activeTab === "payments") {
    return (
      <div className="customer-payment-list">
        {paymentRows.map((payment) => (
          <article key={payment.id}>
            <div>
              <strong>{payment.invoice}</strong>
              <span>{getDateLabel(payment.date)}</span>
            </div>
            <div>
              <strong className="customer-success-text">{formatCurrencyAmount(payment.amount, payment.currency || baseCurrency)}</strong>
              <span>of {formatCurrencyAmount(payment.total, payment.currency || baseCurrency)}</span>
            </div>
            <span className={payment.status === "paid" ? "customer-status active" : "customer-status warning"}>
              {payment.status === "paid" ? "Paid" : "Loan"}
            </span>
          </article>
        ))}
        {!paymentRows.length && <div className="customer-empty">No payment entries.</div>}
      </div>
    );
  }

  if (activeTab === "loans") {
    return (
      <ProfileTable
        columns={["Invoice", "Total", "Paid", "Remaining", "Status", "Date"]}
        empty="No loans found."
        rows={loanRows.map((sale) => [
          sale.invoiceNumber,
          formatCurrencyAmount(sale.total, sale.currency || baseCurrency),
          formatCurrencyAmount(sale.paidAmount, sale.currency || baseCurrency),
          <span className="customer-warning-text" key="balance">{formatCurrencyAmount(sale.balance, sale.currency || baseCurrency)}</span>,
          <span className="customer-status warning" key="status">Loan</span>,
          getDateLabel(sale.date),
        ])}
      />
    );
  }

  if (activeTab === "profit") {
    return (
      <div className="customer-profit-panel">
        <div className="customer-profit-strip">
          <div><span>Revenue from Customer</span><strong>{formatCurrencyAmount(totals.totalRevenue, baseCurrency)}</strong></div>
          <div><span>Cost of Goods Sold</span><strong>{formatCurrencyAmount(totals.totalCost, baseCurrency)}</strong></div>
          <div><span>Net Profit</span><strong className="customer-success-text">{formatCurrencyAmount(totals.profit, baseCurrency)}</strong></div>
        </div>
        <ProfileTable
          columns={["Invoice", "Revenue", "Cost", "Profit", "Date"]}
          empty="No profit records."
          rows={profitRows.map((sale) => [
            sale.invoiceNumber,
            formatCurrencyAmount(sale.total, sale.currency || baseCurrency),
            formatCurrencyAmount(sale.cost, sale.currency || baseCurrency),
            <span className="customer-success-text" key="profit">{formatCurrencyAmount(sale.profit, sale.currency || baseCurrency)}</span>,
            getDateLabel(sale.date),
          ])}
        />
      </div>
    );
  }

  if (activeTab === "activity") {
    return (
      <div className="customer-activity-list">
        {activityRows.map((activity) => (
          <article key={activity.id}>
            <span><ShoppingCart size={17} /></span>
            <div>
              <strong>{activity.action}</strong>
              <small>{activity.description}</small>
              <small>{getDateLabel(activity.date)}</small>
            </div>
          </article>
        ))}
        {!activityRows.length && <div className="customer-empty">No records found.</div>}
      </div>
    );
  }

  return (
    <ProfileTable
      columns={["Invoice", "Items", "Total", "Paid", "Balance", "Status", "Date"]}
      empty="No sales found."
      rows={filteredSales.map((sale) => [
        sale.invoiceNumber,
        getSaleItems(sale).length,
        <strong key="total">{formatCurrencyAmount(sale.total, sale.currency || baseCurrency)}</strong>,
        formatCurrencyAmount(sale.paidAmount, sale.currency || baseCurrency),
        <span className="customer-warning-text" key="balance">{formatCurrencyAmount(sale.balance, sale.currency || baseCurrency)}</span>,
        <span className={parseNumber(sale.balance) > 0 ? "customer-status warning" : "customer-status active"} key="status">
          {parseNumber(sale.balance) > 0 ? "Loan" : "Paid"}
        </span>,
        getDateLabel(sale.date),
      ])}
    />
  );
}

function ProfileTable({ columns, empty, rows }) {
  return (
    <div className="customer-table-wrap customer-profile-table">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td className="customer-empty" colSpan={columns.length}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function CustomerModal({ initialCustomer, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...emptyCustomer,
    ...(initialCustomer || {}),
    name: initialCustomer ? getCustomerName(initialCustomer) : "",
  }));
  const [submitted, setSubmitted] = useState(false);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="customer-modal-backdrop">
      <form
        className="customer-modal"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (!form.name.trim()) return;
          onSave(form);
        }}
      >
        <div className="customer-modal-title">
          <div>
            <h2>{initialCustomer ? "Edit Customer" : "Add New Customer"}</h2>
            <p>Enter customer information and account settings.</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="customer-form-grid">
          <Field label="Customer Name" required invalid={submitted && !form.name.trim()}>
            <input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} />
          </Field>
          <Field label="Phone Number">
            <input inputMode="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
          </Field>
          <Field label="Status">
            <CustomSelect
              ariaLabel="Customer status"
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
              ]}
              value={form.status}
              onChange={(value) => update("status", value)}
            />
          </Field>
          <Field label="Address" className="full">
            <input value={form.address} onChange={(event) => update("address", event.target.value)} />
          </Field>
          <Field label="Notes" className="full">
            <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </Field>
          <div className={`customer-vip-field full ${form.vip ? "is-active" : ""}`}>
            <div>
              <strong>VIP Customer</strong>
              <small>{form.vip ? "VIP customer is active" : "VIP customer is inactive"}</small>
            </div>
            <button
              type="button"
              className={`customer-switch ${form.vip ? "is-on" : ""}`}
              onClick={() => update("vip", !form.vip)}
            >
              <span />
              <strong>{form.vip ? "ON" : "OFF"}</strong>
            </button>
          </div>
        </div>

        <div className="customer-modal-actions">
          <button type="button" className="customer-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="customer-primary-btn">{initialCustomer ? "Save Changes" : "Add Customer"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ children, className = "", invalid = false, label, required = false }) {
  return (
    <label className={`customer-form-field ${className} ${invalid ? "invalid" : ""}`.trim()}>
      <span>{label}{required && <em>*</em>}</span>
      {children}
      {invalid && <small>This field is required.</small>}
    </label>
  );
}

function StatCard({ icon: Icon, label, tone = "", value }) {
  return (
    <article className={`customer-stat-card ${tone}`.trim()}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={22} />
    </article>
  );
}

function ConfirmModal({ message, onClose, onConfirm, title }) {
  return (
    <div className="customer-modal-backdrop">
      <div className="customer-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="customer-modal-actions">
          <button type="button" className="customer-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="customer-danger-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function printRows(title, rows) {
  const columns = Object.keys(rows[0] || {});
  const bodyRows = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`)
    .join("");
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body{font-family:Arial,sans-serif;margin:30px;color:#111827}
          h1{margin:0 0 16px}
          table{width:100%;border-collapse:collapse}
          th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:12px}
          th{background:#f8fafc;color:#475569}
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <table>
          <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
          <tbody>${bodyRows || `<tr><td colspan="${columns.length || 1}">No records found.</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
}

export default Customers;
