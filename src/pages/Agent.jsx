import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Edit3,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import "./Agent.css";

const STORAGE_KEY = "retail-agent-sessions";
const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const normalize = (value) => String(value || "").toLowerCase();

const defaultSuggestions = [
  "How many customers do I have?",
  "Which customers owe me money?",
  "How many products are out of stock?",
  "Show my low stock products.",
  "What is my total sales amount?",
  "How much payment is pending?",
  "What is my cash wallet balance?",
  "Which suppliers do I owe?",
  "Show today sales.",
  "Show monthly sales.",
  "How much expense do I have?",
  "What is my net profit?",
  "Which products expire soon?",
  "How many staff members do I have?",
  "What is my total stock quantity?",
  "What is my stock value?",
  "Show refunded sales.",
  "Show loan invoices.",
  "Who are my top customers?",
  "Give me a quick business summary.",
  "Show system alerts.",
  "How many invoices are paid?",
  "How many invoices are unpaid?",
  "What is total supplier payable?",
  "What is total customer receivable?",
  "Show active products.",
  "Show expired products.",
  "Show sales count.",
  "Show product categories.",
  "Show expense categories.",
  "Show staff payable.",
  "Show staff paid.",
  "Show cash deposits.",
  "Show cash withdrawals.",
  "What should I check first today?",
  "Prepare advanced report.",
  "Show inventory health.",
  "Show customer debt report.",
  "Show financial health.",
  "Show recent activity summary.",
];

const newSession = (title = "New chat") => ({
  id: crypto.randomUUID(),
  title,
  messages: [],
  createdAt: new Date().toISOString(),
});

const dateOnly = (value) => (value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : null);

const daysUntil = (value) => {
  const date = dateOnly(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((date - today) / 86400000);
};

const isSameMonth = (value) => {
  const date = dateOnly(value);
  if (!date) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
};

const isToday = (value) => {
  const date = dateOnly(value);
  if (!date) return false;
  return date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
};

const listNames = (items, emptyText, render = (item) => item.name) => {
  if (!items.length) return emptyText;
  return items.slice(0, 8).map((item, index) => `${index + 1}. ${render(item)}`).join("\n");
};

const getCustomerName = (customer) =>
  customer.customerName || customer.fullName || customer.name || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Customer";

const getProductName = (product) =>
  product.name || product.productName || product.deviceName || product.assetName || "Product";

const getSupplierName = (supplier) =>
  supplier.supplierName || supplier.companyName || supplier.name || "Supplier";

const getSaleTotal = (sale) =>
  parseNumber(sale.total || sale.grandTotal || sale.netTotal || sale.finalTotal || sale.payableAmount);

const getSalePaid = (sale) => parseNumber(sale.paidAmount || sale.paid || sale.receivedAmount);

const getSaleBalance = (sale) => {
  const explicit = parseNumber(sale.balance || sale.remainingAmount || sale.dueAmount);
  return explicit || Math.max(0, getSaleTotal(sale) - getSalePaid(sale));
};

const getCurrency = (settings) => settings.baseCurrency || settings.defaultCurrencyCode || "AFN";

const buildInsights = ({ customers, expenses, godownEntries, products, sales, settings, staffMembers, suppliers, transactions }) => {
  const currency = getCurrency(settings);
  const money = (value) => formatCurrencyAmount(value, currency);
  const totalSales = sales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);
  const totalPaid = sales.reduce((sum, sale) => sum + getSalePaid(sale), 0);
  const totalPending = sales.reduce((sum, sale) => sum + getSaleBalance(sale), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + parseNumber(expense.amount), 0);
  const totalRefunds = sales.reduce(
    (sum, sale) => sum + (sale.refundHistory || []).reduce((inner, refund) => inner + parseNumber(refund.amount), 0),
    0
  );
  const customerDebt = customers
    .map((customer) => ({
      id: customer.id || getCustomerName(customer),
      name: getCustomerName(customer),
      amount: parseNumber(customer.pending || customer.balance || customer.receivable),
    }))
    .filter((item) => item.amount > 0);
  const saleDebt = sales
    .filter((sale) => getSaleBalance(sale) > 0)
    .map((sale) => ({
      id: sale.customerId || sale.customerName || sale.id,
      name: sale.customerName || "Customer",
      amount: getSaleBalance(sale),
    }));
  const debtMap = new Map();
  [...customerDebt, ...saleDebt].forEach((item) => {
    const key = item.id || item.name;
    const current = debtMap.get(key) || { name: item.name, amount: 0 };
    debtMap.set(key, { ...current, amount: current.amount + item.amount });
  });
  const debtors = [...debtMap.values()].sort((a, b) => b.amount - a.amount);
  const lowStock = products.filter((product) => {
    const quantity = parseNumber(product.quantity);
    const limit = parseNumber(product.lowStock || product.lowStockThreshold || product.minStock);
    return limit > 0 && quantity > 0 && quantity <= limit;
  });
  const outOfStock = products.filter((product) => parseNumber(product.quantity) <= 0);
  const expiringSoon = products.filter((product) => {
    const days = daysUntil(product.expiry || product.expiryDate);
    return days !== null && days >= 0 && days <= 30;
  });
  const expired = products.filter((product) => {
    const days = daysUntil(product.expiry || product.expiryDate);
    return days !== null && days < 0;
  });
  const supplierPayable = suppliers
    .map((supplier) => ({ ...supplier, name: getSupplierName(supplier), balance: parseNumber(supplier.balance || supplier.payable) }))
    .filter((supplier) => supplier.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  const supplierReceivable = suppliers
    .map((supplier) => ({ ...supplier, name: getSupplierName(supplier), balance: parseNumber(supplier.balance || supplier.receivable) }))
    .filter((supplier) => supplier.balance < 0);
  const stockQuantity = products.reduce((sum, product) => sum + parseNumber(product.quantity), 0);
  const stockValue = products.reduce(
    (sum, product) => sum + parseNumber(product.quantity) * parseNumber(product.selling || product.sellingPrice || product.purchase || product.costPrice),
    0
  );
  const staffPayable = staffMembers.reduce(
    (sum, staff) => sum + parseNumber(staff.payable || staff.balance || Math.max(0, parseNumber(staff.salary) - parseNumber(staff.paidAmount))),
    0
  );
  const staffPaid = staffMembers.reduce((sum, staff) => sum + parseNumber(staff.paid || staff.paidAmount || staff.totalPaid), 0);
  const deposits = transactions
    .filter((entry) => /deposit|cash-wallet/i.test(`${entry.group || ""} ${entry.source || ""} ${entry.title || ""}`) && entry.type !== "expense")
    .reduce((sum, entry) => sum + parseNumber(entry.amount), 0);
  const withdrawals = transactions
    .filter((entry) => /withdraw|cash-wallet/i.test(`${entry.group || ""} ${entry.source || ""} ${entry.title || ""}`) && entry.type === "expense")
    .reduce((sum, entry) => sum + parseNumber(entry.amount), 0);
  const todaySales = sales.filter((sale) => isToday(sale.date || sale.billDate || sale.createdAt));
  const monthlySales = sales.filter((sale) => isSameMonth(sale.date || sale.billDate || sale.createdAt));
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))];
  const expenseCategories = [...new Set(expenses.map((expense) => expense.category).filter(Boolean))];
  const loans = sales.filter((sale) => getSaleBalance(sale) > 0 || sale.paymentStatus === "loan");
  const topCustomers = [...debtMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 8);
  const alerts = [
    ...lowStock.map((product) => `${getProductName(product)}: low stock (${product.quantity || 0})`),
    ...outOfStock.map((product) => `${getProductName(product)}: out of stock`),
    ...expiringSoon.map((product) => `${getProductName(product)}: expires soon`),
    ...expired.map((product) => `${getProductName(product)}: expired`),
    ...debtors.slice(0, 6).map((item) => `${item.name}: customer debt ${money(item.amount)}`),
    ...supplierPayable.slice(0, 6).map((supplier) => `${supplier.name}: supplier payable ${money(supplier.balance)}`),
  ];

  return {
    alerts,
    categories,
    currency,
    customerCount: customers.length,
    debtors,
    deposits,
    expenseCategories,
    expenses,
    expiringSoon,
    expired,
    godownEntries,
    loans,
    lowStock,
    monthlySales,
    netProfit: totalPaid - totalExpenses - totalRefunds,
    outOfStock,
    products,
    sales,
    staffMembers,
    staffPaid,
    staffPayable,
    stockQuantity,
    stockValue,
    supplierPayable,
    supplierReceivable,
    suppliers,
    todaySales,
    topCustomers,
    totalExpenses,
    totalPaid,
    totalPending,
    totalRefunds,
    totalSales,
    withdrawals,
  };
};

const makeAnswer = (question, insights) => {
  const q = normalize(question);
  const suggestionIndex = defaultSuggestions.findIndex((item) => normalize(item) === q);
  const money = (value) => formatCurrencyAmount(value, insights.currency);
  const has = (...words) => words.some((word) => q.includes(word));

  if (suggestionIndex === 0 || (has("customer") && !has("owe", "debt", "loan", "receivable"))) {
    return `Total customers: ${insights.customerCount}`;
  }
  if ([1, 24, 37].includes(suggestionIndex) || (has("customer") && has("owe", "debt", "loan", "receivable"))) {
    return insights.debtors.length
      ? `Customers with debt:\n${listNames(insights.debtors, "", (item) => `${item.name} - ${money(item.amount)}`)}`
      : "No customer debt found.";
  }
  if ([7, 23].includes(suggestionIndex) || has("supplier")) {
    return insights.supplierPayable.length
      ? `Suppliers you owe:\n${listNames(insights.supplierPayable, "", (supplier) => `${supplier.name} - ${money(supplier.balance)}`)}`
      : "No supplier payable found.";
  }
  if ([20, 34].includes(suggestionIndex) || has("alert", "check first")) {
    return insights.alerts.length
      ? `System alerts:\n${listNames(insights.alerts.map((name) => ({ name })), "", (item) => item.name)}`
      : "No important alerts right now.";
  }
  if (suggestionIndex === 2 || (has("out") && has("stock"))) {
    return `Out of stock: ${insights.outOfStock.length}\n${listNames(insights.outOfStock, "No out of stock products.", getProductName)}`;
  }
  if (suggestionIndex === 3 || (has("low") && has("stock"))) {
    return `Low stock: ${insights.lowStock.length}\n${listNames(insights.lowStock, "No low stock products.", getProductName)}`;
  }
  if (suggestionIndex === 12 || has("expir")) {
    return `Expiring soon: ${insights.expiringSoon.length}\nExpired: ${insights.expired.length}\n${listNames(insights.expiringSoon, "No products expiring soon.", getProductName)}`;
  }
  if ([14, 25, 26].includes(suggestionIndex) || (has("stock", "inventory") && has("quantity", "active"))) {
    return `Stock quantity: ${insights.stockQuantity.toLocaleString()}\nActive products: ${insights.products.length}`;
  }
  if (suggestionIndex === 15 || (has("stock", "inventory") && has("value"))) {
    return `Stock value: ${money(insights.stockValue)}`;
  }
  if ([4, 8, 9, 16, 21, 22, 27].includes(suggestionIndex) || has("sale", "invoice")) {
    return `Total sales amount: ${money(insights.totalSales)}\nTotal paid: ${money(insights.totalPaid)}\nPending payments: ${money(insights.totalPending)}\nInvoices: ${insights.sales.length}\nToday sales: ${insights.todaySales.length}\nMonthly sales: ${insights.monthlySales.length}`;
  }
  if ([10, 29].includes(suggestionIndex) || has("expense")) {
    return `Total expenses: ${money(insights.totalExpenses)}\nExpense records: ${insights.expenses.length}\nCategories: ${insights.expenseCategories.join(", ") || "No categories"}`;
  }
  if ([11, 38].includes(suggestionIndex) || has("profit", "financial")) {
    return `Net profit: ${money(insights.netProfit)}\nTotal revenue paid: ${money(insights.totalPaid)}\nTotal expenses: ${money(insights.totalExpenses)}\nTotal refunds: ${money(insights.totalRefunds)}`;
  }
  if ([6, 32, 33].includes(suggestionIndex) || has("cash", "wallet")) {
    return `Current cash wallet: ${money(insights.deposits - insights.withdrawals)}\nDeposits: ${money(insights.deposits)}\nWithdrawals: ${money(insights.withdrawals)}`;
  }
  if ([13, 30, 31].includes(suggestionIndex) || has("staff")) {
    return `Total staff: ${insights.staffMembers.length}\nStaff payable: ${money(insights.staffPayable)}\nStaff paid: ${money(insights.staffPaid)}`;
  }
  if (suggestionIndex === 17 || has("loan")) {
    return insights.loans.length
      ? `Loan invoices: ${insights.loans.length}\n${listNames(insights.loans, "", (sale) => `${sale.invoiceNumber || sale.billNumber || sale.id} - ${sale.customerName || "Customer"} - ${money(getSaleBalance(sale))}`)}`
      : "No loan invoices found.";
  }
  if (suggestionIndex === 18 || has("top customer")) {
    return insights.topCustomers.length
      ? `Top customers by receivable:\n${listNames(insights.topCustomers, "", (item) => `${item.name} - ${money(item.amount)}`)}`
      : "No customer ranking available yet.";
  }
  if (suggestionIndex === 28 || has("product categor")) {
    return `Product categories: ${insights.categories.length}\n${insights.categories.join(", ") || "No product categories found."}`;
  }
  if ([19, 35, 36, 39].includes(suggestionIndex) || has("summary", "report", "health", "activity")) {
    return `Quick business summary:\nTotal customers: ${insights.customerCount}\nProducts: ${insights.products.length}\nSales: ${insights.sales.length}\nTotal revenue: ${money(insights.totalSales)}\nPending payments: ${money(insights.totalPending)}\nTotal expenses: ${money(insights.totalExpenses)}\nStock value: ${money(insights.stockValue)}\nAlerts: ${insights.alerts.length}`;
  }
  return "I can answer questions about customers, debts, sales, inventory, expenses, staff, suppliers, alerts and reports. Try one of the suggested questions.";
};

function Agent() {
  const [products] = useJsonCollection("products");
  const [customers] = useJsonCollection("customers");
  const [suppliers] = useJsonCollection("suppliers");
  const [expenses] = useJsonCollection("expenses");
  const [godownEntries] = useJsonCollection("godownEntries");
  const [sales] = useJsonCollection("billingInvoices");
  const [staffMembers] = useJsonCollection("staff");
  const [settings] = useJsonCollection("settings");
  const [transactions] = useJsonCollection("transactions");

  const companyInfo = useMemo(() => settings[0] || {}, [settings]);
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) && saved.length ? saved : [newSession()];
    } catch {
      return [newSession()];
    }
  });
  const [activeId, setActiveId] = useState(() => sessions[0]?.id || "");
  const [editingId, setEditingId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [menuId, setMenuId] = useState("");
  const [typing, setTyping] = useState("");
  const [deleteModal, setDeleteModal] = useState(null);
  const [feedback, setFeedback] = useState({});
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);

  const insights = useMemo(
    () => buildInsights({ customers, expenses, godownEntries, products, sales, settings: companyInfo, staffMembers, suppliers, transactions }),
    [companyInfo, customers, expenses, godownEntries, products, sales, staffMembers, suppliers, transactions]
  );

  const activeSession = sessions.find((session) => session.id === activeId) || sessions[0];
  const visibleSuggestions = defaultSuggestions.filter((item) => normalize(item).includes(normalize(query))).slice(0, 40);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 12)));
  }, [sessions]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeSession?.messages, typing]);

  useEffect(
    () => () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    },
    []
  );

  const updateActive = (updater) => {
    setSessions((current) => current.map((session) => (session.id === activeSession?.id ? updater(session) : session)));
  };

  const ask = (text) => {
    const clean = text.trim();
    if (!clean || typing || !activeSession) return;
    const answer = makeAnswer(clean, insights);
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    const userMessage = { id: crypto.randomUUID(), role: "user", text: clean };
    const agentMessage = { id: crypto.randomUUID(), role: "agent", text: "" };

    updateActive((session) => ({
      ...session,
      title: session.messages.length ? session.title : clean.slice(0, 38),
      messages: [...session.messages, userMessage, agentMessage],
    }));
    setInput("");
    setTyping(answer);

    let index = 0;
    typingTimerRef.current = setInterval(() => {
      index += 4;
      updateActive((session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === agentMessage.id ? { ...message, text: answer.slice(0, index) } : message
        ),
      }));
      if (index >= answer.length) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
        setTyping("");
      }
    }, 14);
  };

  const createChat = () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    const session = newSession();
    setSessions((current) => [session, ...current].slice(0, 12));
    setActiveId(session.id);
    setTyping("");
    setMenuId("");
  };

  const saveRename = (event) => {
    event.preventDefault();
    const title = editingTitle.trim();
    if (!title) return;
    setSessions((current) => current.map((session) => (session.id === editingId ? { ...session, title } : session)));
    setEditingId("");
    setEditingTitle("");
  };

  const confirmDeleteChat = () => {
    if (!deleteModal) return;
    setSessions((current) => {
      const next = current.filter((session) => session.id !== deleteModal.id);
      if (activeId === deleteModal.id) setActiveId(next[0]?.id || "");
      return next.length ? next : [newSession()];
    });
    setDeleteModal(null);
  };

  const toggleFeedback = (messageId, value) => {
    setFeedback((current) => ({ ...current, [messageId]: current[messageId] === value ? "" : value }));
  };

  return (
    <div className="agent-page">
      <section className="agent-hero">
        <div>
          <span>Local reporting agent</span>
          <h1>Agent</h1>
          <p>Ask questions about customers, debts, sales, inventory, expenses, alerts and reports.</p>
        </div>
        <button type="button" onClick={createChat}>
          <Plus size={16} />
          New chat
        </button>
      </section>

      <section className="agent-shell">
        <aside className="agent-history-panel">
          <div className="agent-panel-head">
            <div>
              <strong>Conversations</strong>
              <small>{sessions.length} conversation(s)</small>
            </div>
            <button type="button" onClick={createChat} aria-label="New chat">
              <Plus size={16} />
            </button>
          </div>

          <div className="agent-history-list">
            {sessions.map((session) =>
              editingId === session.id ? (
                <form className="agent-rename-form" key={session.id} onSubmit={saveRename}>
                  <input autoFocus value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditingId("")} aria-label="Cancel">
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <div className={`agent-history-item ${session.id === activeSession?.id ? "active" : ""}`} key={session.id}>
                  <button type="button" onClick={() => setActiveId(session.id)}>
                    <MessageCircle size={14} />
                    <span>{session.title}</span>
                  </button>
                  <button type="button" className="agent-menu-trigger" onClick={() => setMenuId((current) => (current === session.id ? "" : session.id))}>
                    <MoreHorizontal size={16} />
                  </button>
                  {menuId === session.id && (
                    <div className="agent-history-menu">
                      <button type="button" onClick={() => { setEditingId(session.id); setEditingTitle(session.title); setMenuId(""); }}>
                        <Edit3 size={14} />
                        Rename
                      </button>
                      <button type="button" className="danger" onClick={() => { setDeleteModal(session); setMenuId(""); }}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </aside>

        <main className="agent-chat">
          <div className="agent-chat-head">
            <span>
              <Bot size={18} />
            </span>
            <div>
              <strong>Business chat</strong>
              <small>{activeSession?.title || "New chat"}</small>
            </div>
          </div>

          <div className="agent-chat-log" ref={scrollRef}>
            {!activeSession?.messages.length && (
              <div className="agent-empty">
                <span><Bot size={30} /></span>
                <strong>Ask your business agent</strong>
                <small>Try: Which customers owe me money?</small>
              </div>
            )}

            {activeSession?.messages.map((message) => (
              <div className={`agent-message-row ${message.role}`} key={message.id}>
                {message.role === "agent" && <span className="agent-avatar"><Bot size={18} /></span>}
                <div className="agent-message-content">
                  <div className={`agent-message ${message.role}`}>
                    <p>{message.text}</p>
                    {message.role === "agent" && typing && activeSession.messages.at(-1)?.id === message.id && <span className="agent-typing-cursor" />}
                  </div>
                  {message.role === "agent" && message.text && !(typing && activeSession.messages.at(-1)?.id === message.id) && (
                    <div className="agent-message-actions">
                      <button type="button" className={feedback[message.id] === "like" ? "active like" : ""} onClick={() => toggleFeedback(message.id, "like")} aria-label="Like">
                        <ThumbsUp size={16} />
                      </button>
                      <button type="button" className={feedback[message.id] === "dislike" ? "active dislike" : ""} onClick={() => toggleFeedback(message.id, "dislike")} aria-label="Dislike">
                        <ThumbsDown size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form className="agent-compose" onSubmit={(event) => { event.preventDefault(); ask(input); }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your business..." />
            <button type="submit" disabled={!input.trim() || Boolean(typing)}>
              <Send size={17} />
              <span>Send</span>
            </button>
          </form>
        </main>

        <aside className="agent-side">
          <div className="agent-side-head">
            <strong>Suggested questions</strong>
          </div>
          <label className="agent-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions..." />
          </label>
          <div className="agent-suggestions">
            {visibleSuggestions.map((question) => (
              <button type="button" key={question} onClick={() => ask(question)} disabled={Boolean(typing)}>
                {question}
              </button>
            ))}
          </div>
        </aside>
      </section>

      {deleteModal && (
        <div className="agent-delete-backdrop" role="presentation" onMouseDown={() => setDeleteModal(null)}>
          <section className="agent-delete-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="agent-delete-close" type="button" aria-label="Close" onClick={() => setDeleteModal(null)}>
              <X size={17} />
            </button>
            <span className="agent-delete-icon">
              <Trash2 size={22} />
            </span>
            <h2>Delete chat?</h2>
            <p>Are you sure you want to delete "{deleteModal.title}"? This action cannot be undone.</p>
            <footer className="agent-delete-actions">
              <button className="agent-delete-cancel" type="button" onClick={() => setDeleteModal(null)}>
                Cancel
              </button>
              <button className="agent-delete-confirm" type="button" onClick={confirmDeleteChat}>
                <Trash2 size={15} />
                Delete
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default Agent;
