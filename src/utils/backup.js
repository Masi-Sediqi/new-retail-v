import axios from "axios";
import { apiUrl } from "./api";

const collectionAliases = {
  cash_wallet: "transactions",
  godown: "godownEntries",
  recycle_bin: "deletedItems",
  sales: "billingInvoices",
};

const currencyLabel = (code = "AFN") => {
  const labels = {
    AFN: "Afghan Afghani (AFN)",
    USD: "US Dollar (USD)",
    EUR: "Euro (EUR)",
    GBP: "British Pound (GBP)",
    SAR: "Saudi Riyal (SAR)",
    PKR: "Pakistani Rupee (PKR)",
    INR: "Indian Rupee (INR)",
    IRR: "Iranian Rial (IRR)",
    AED: "UAE Dirham (AED)",
    CNY: "Chinese Yuan (CNY)",
  };
  return labels[code] || `${code} (${code})`;
};

const normalizeSettings = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return items;
  const main = items.find((item) => item?.id === "main") || items[0];
  const baseCurrency = main.baseCurrency || main.defaultCurrency || "AFN";
  const normalizedMain = {
    ...main,
    companyName: main.companyName || "Smart Office",
    systemSubtitle: main.systemSubtitle || main.companySubtitle || "Smart Office Management System",
    defaultCurrency:
      String(main.defaultCurrency || "").includes("(")
        ? main.defaultCurrency
        : currencyLabel(baseCurrency),
    baseCurrency,
    language:
      main.language === "da"
        ? "fa"
        : main.language || "en",
    themePreset: main.themePreset || main.theme || "forest",
    printSettings: main.printSettings || main.printStudioSettings?.state || {},
  };
  return [
    normalizedMain,
    ...items.filter((item) => item !== main),
  ];
};

const normalizeWalletTransactions = (items = []) =>
  items.map((item) => {
    const transactionType = item.transactionType || item.type || "deposit";
    const isWithdraw = /withdraw|expense|payment out/i.test(transactionType);
    return {
      ...item,
      id: item.id || `wallet-import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      transactionType: isWithdraw ? "withdraw" : "deposit",
      type: isWithdraw ? "expense" : "income",
      category: "Cash Wallet",
      title: item.title || (isWithdraw ? "Cash Wallet Withdrawal" : "Cash Wallet Deposit"),
      amount: Number(item.amount || 0),
      currency: item.currency || "AFN",
      note: item.note || item.reason || item.notes || "",
      date: String(item.date || item.createdAt || new Date().toISOString()).slice(0, 10),
      createdAt: item.createdAt || item.date || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || item.date || new Date().toISOString(),
      source: "cash-wallet",
    };
  });

const normalizeSales = (items = [], refunds = []) => {
  const refundsBySale = new Map();
  refunds.forEach((refund) => {
    const key = String(refund.saleId || "");
    if (!key) return;
    refundsBySale.set(key, [...(refundsBySale.get(key) || []), refund]);
  });
  return items.map((item) => {
    const refundHistory = [
      ...(item.refundHistory || item.refunds || []),
      ...(refundsBySale.get(String(item.id)) || []),
    ];
    return {
      ...item,
      id: item.id || item.invoiceNumber || `invoice-import-${Date.now()}`,
      invoiceNumber: item.invoiceNumber || item.billNumber || item.id,
      customerName: item.customerName || item.customer || "Walk-in customer",
      paidAmount: Number(item.paidAmount ?? item.paid ?? 0),
      paymentStatus: item.paymentStatus || item.status || "pending",
      currency: item.currency || "AFN",
      date: item.date || item.createdAt || new Date().toISOString(),
      createdAt: item.createdAt || item.date || new Date().toISOString(),
      refundHistory,
    };
  });
};

export function normalizeBackupCollections(parsed, serverCollections = []) {
  const raw =
    parsed?.collections && typeof parsed.collections === "object"
      ? parsed.collections
      : parsed?.data && typeof parsed.data === "object"
        ? parsed.data
        : parsed && typeof parsed === "object"
          ? parsed
          : {};
  const serverSet = new Set(serverCollections);
  const normalized = {};

  Object.entries(raw).forEach(([rawName, value]) => {
    if (!Array.isArray(value)) return;
    const name = collectionAliases[rawName] || rawName;
    if (!serverSet.has(name)) return;
    normalized[name] = [...(normalized[name] || []), ...value];
  });

  if (Array.isArray(raw.settings) && serverSet.has("settings")) {
    normalized.settings = normalizeSettings(raw.settings);
  }

  if (Array.isArray(raw.sales) && serverSet.has("billingInvoices")) {
    normalized.billingInvoices = normalizeSales(raw.sales, raw.refunds || []);
  }

  if (Array.isArray(raw.cash_wallet) && serverSet.has("transactions")) {
    normalized.transactions = [
      ...normalizeWalletTransactions(raw.cash_wallet),
      ...(normalized.transactions || []).filter((item) => item?.source !== "cash-wallet"),
    ];
  }

  return normalized;
}

export async function loadBackupCollectionNames() {
  const response = await axios.get(apiUrl("collections"));
  return Array.isArray(response.data) ? response.data : [];
}

export async function buildBackupPayload() {
  const collections = await loadBackupCollectionNames();
  const entries = await Promise.all(
    collections.map(async (name) => {
      const response = await axios.get(apiUrl(name));
      return [name, Array.isArray(response.data) ? response.data : []];
    })
  );

  return {
    app: "Smart Office",
    exportedAt: new Date().toISOString(),
    collections: Object.fromEntries(entries),
  };
}

export async function downloadBackup(reason = "manual") {
  const payload = await buildBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  link.href = url;
  link.download = `isp-data-${reason}-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return payload;
}
