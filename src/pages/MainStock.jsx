import { Fragment, useMemo, useState } from "react";
import {
  Archive,
  BarChart3,
  ChevronDown,
  Eye,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import FloatingActionMenu from "../components/FloatingActionMenu";
import StandardPrintStudio from "../components/StandardPrintStudio";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { currencyMatchesFilter, useBusinessCurrencyFilter } from "../hooks/useBusinessCurrencyFilter";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import { productCategories } from "../data/dashboardData";
import "./MainStock.css";

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;
const todayInput = () => new Date().toISOString().slice(0, 10);
const parseDateInput = (value) => (value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : null);
const normalizeText = (value) => String(value || "").trim().toLowerCase();

const defaultCategories = productCategories;

const unitOptions = ["Piece", "Box", "Carton", "Pack", "Bottle", "Bag", "Kg", "Gram", "Liter", "Meter", "Dozen"];
const currencyCodes = ["AFN", "USD", "EUR", "GBP", "SAR", "PKR", "INR", "IRR", "AED", "CNY"];

const emptyLine = () => ({
  id: `line-${crypto.randomUUID()}`,
  productId: "",
  name: "",
  code: "",
  quantity: "1",
  unit: "Piece",
  purchase: "",
  selling: "",
  category: "",
  lowStock: "",
  expiry: "",
  supplierId: "",
  notes: "",
});

const getProductName = (product) =>
  product.name || product.productName || product.deviceName || "Unnamed Product";

const getProductCode = (product) =>
  product.code || product.productCode || product.assetId || product.barcode || "";

const getSupplierName = (supplier) =>
  supplier?.name || supplier?.supplierName || supplier?.companyName || "Supplier";

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

const getShamsiLabel = (value) => {
  try {
    return new Intl.DateTimeFormat("en-CA-u-ca-persian", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
  } catch {
    return value || "-";
  }
};

const getDateMatches = (dateValue, filter, start, end) => {
  if (filter === "all" || !dateValue) return true;
  const date = parseDateInput(dateValue);
  if (!date) return true;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const daysOld = Math.floor((now - target) / 86400000);

  if (filter === "today") return daysOld === 0;
  if (filter === "weekly") return daysOld >= 0 && daysOld <= 7;
  if (filter === "monthly") return daysOld >= 0 && daysOld <= 31;
  if (filter === "annual") return daysOld >= 0 && daysOld <= 366;
  if (filter === "custom") {
    const startDate = parseDateInput(start);
    const endDate = end ? new Date(`${end}T23:59:59`) : null;
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  }
  return true;
};

function MainStock() {
  const [products, setProducts] = useJsonCollection("products");
  const [suppliers] = useJsonCollection("suppliers");
  const [categories, setCategories] = useJsonCollection("productCategories");
  const [godownEntries, setGodownEntries] = useJsonCollection("godownEntries");
  const [sales] = useJsonCollection("billingInvoices");
  const [settings] = useJsonCollection("settings");
  const [, setTransactions] = useJsonCollection("transactions");
  const businessCurrencyFilter = useBusinessCurrencyFilter();

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [viewMode, setViewMode] = useState("product");
  const [hideSoldOut, setHideSoldOut] = useState(true);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState("");
  const [detailEntry, setDetailEntry] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteEntry, setDeleteEntry] = useState(null);
  const [printReportOpen, setPrintReportOpen] = useState(false);

  const categoryList = useMemo(() => {
    const custom = categories.map((item) => item.name || item).filter(Boolean);
    const productCategories = products.map((product) => product.category).filter(Boolean);
    return [...new Set([...defaultCategories, ...custom, ...productCategories])].sort((a, b) => a.localeCompare(b));
  }, [categories, products]);

  const normalizedProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        id: product.id || product.productId || getProductCode(product) || `product-${getProductName(product)}`,
        name: getProductName(product),
        code: getProductCode(product),
        quantity: parseNumber(product.quantity),
        purchase: parseNumber(product.purchase || product.purchasePrice),
        selling: parseNumber(product.selling || product.sellingPrice || product.unitPrice),
        unit: product.unit || "Piece",
        currency: product.currency || baseCurrency,
      })),
    [baseCurrency, products]
  );

  const entries = useMemo(
    () =>
      godownEntries.flatMap((entry) => {
        const rows = Array.isArray(entry.rows) ? entry.rows : [];
        const billTotal = parseNumber(entry.total) || rows.reduce((sum, row) => sum + parseNumber(row.quantity) * parseNumber(row.purchase), 0);
        const billPaid = Math.min(parseNumber(entry.paid), billTotal);
        return rows.map((row, index) => {
          const rowTotal = parseNumber(row.quantity) * parseNumber(row.purchase);
          const rowPaid = billTotal > 0 ? Math.min(rowTotal, (billPaid * rowTotal) / billTotal) : 0;
          return {
            ...row,
            billNumber: entry.billNumber || `BILL-${String(entry.id).slice(-6).toUpperCase()}`,
            currency: entry.currency || row.currency || baseCurrency,
            entryDate: entry.date,
            entryId: entry.id,
            paid: rowPaid,
            rate: parseNumber(row.rate || entry.rate),
            remaining: Math.max(0, rowTotal - rowPaid),
            rowIndex: index,
            rowTotal,
            total: rowTotal,
          };
        });
      }),
    [baseCurrency, godownEntries]
  );

  const soldQuantityByProduct = useMemo(() => {
    const totals = new Map();
    sales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (!item.productId) return;
        totals.set(String(item.productId), (totals.get(String(item.productId)) || 0) + parseNumber(item.quantity));
      });
      (sale.refundHistory || []).forEach((refund) => {
        (refund.items || []).forEach((item) => {
          if (!item.productId) return;
          totals.set(String(item.productId), (totals.get(String(item.productId)) || 0) - parseNumber(item.refundQty || item.quantity));
        });
      });
    });
    return totals;
  }, [sales]);

  const productRows = useMemo(
    () =>
      normalizedProducts.map((product) => {
        const productEntries = entries.filter(
          (entry) => String(entry.productId) === String(product.id) || (!entry.productId && normalizeText(entry.name) === normalizeText(product.name))
        );
        const importedFromEntries = productEntries.reduce((sum, entry) => sum + parseNumber(entry.quantity), 0);
        const sold = Math.max(0, parseNumber(soldQuantityByProduct.get(String(product.id))));
        const imported = Math.max(importedFromEntries, product.quantity + sold);
        const paid = productEntries.reduce((sum, entry) => sum + parseNumber(entry.paid), 0);
        const remaining = productEntries.reduce((sum, entry) => sum + parseNumber(entry.remaining), 0);

        return {
          ...product,
          entries: productEntries,
          imported,
          sold,
          totalValue: imported * product.purchase,
          stockValue: product.quantity * product.purchase,
          expectedProfit: Math.max(0, product.selling - product.purchase) * product.quantity,
          paid,
          remaining,
        };
      }),
    [entries, normalizedProducts, soldQuantityByProduct]
  );

  const currencyFilteredProductRows = useMemo(
    () =>
      productRows.filter((product) =>
        currencyMatchesFilter(product.currency, businessCurrencyFilter)
      ),
    [businessCurrencyFilter, productRows]
  );

  const stockEntryRows = useMemo(() => {
    const purchaseRows = godownEntries
      .map((purchase) => {
        const rows = entries.filter((entry) => String(entry.entryId) === String(purchase.id));
        if (!rows.length) return null;
        const quantity = rows.reduce((sum, row) => sum + parseNumber(row.quantity), 0);
        const total = rows.reduce((sum, row) => sum + parseNumber(row.total), 0);
        const paid = rows.reduce((sum, row) => sum + parseNumber(row.paid), 0);
        const remaining = rows.reduce((sum, row) => sum + parseNumber(row.remaining), 0);
        return {
          id: `purchase-${purchase.id}`,
          actionEntry: rows[0],
          billNumber: purchase.billNumber || rows[0]?.billNumber,
          currency: purchase.currency || rows[0]?.currency || baseCurrency,
          date: purchase.date || purchase.createdAt?.slice(0, 10) || rows[0]?.date,
          isExpandable: rows.length > 1,
          kind: "purchase",
          name: rows.length > 1 ? `Purchase Bill (${rows.length} items)` : rows[0].name,
          paid,
          rate: parseNumber(purchase.rate || rows[0]?.rate),
          remaining,
          rows,
          source: purchase,
          supplierId: purchase.supplierId || rows[0]?.supplierId || "",
          total,
          unit: rows[0]?.unit || "Piece",
          quantity,
        };
      })
      .filter(Boolean);

    const autoRows = productRows
      .map((product) => {
        const importedFromPurchases = product.entries.reduce((sum, entry) => sum + parseNumber(entry.quantity), 0);
        const quantity = Math.max(0, parseNumber(product.imported) - importedFromPurchases);
        if (quantity <= 0) return null;
        const total = quantity * parseNumber(product.purchase);
        return {
          id: `auto-${product.id}`,
          actionEntry: {
            ...product,
            date: product.createdAt?.slice(0, 10) || todayInput(),
            entryId: `auto-${product.id}`,
            id: `auto-${product.id}`,
            productId: product.id,
            quantity,
            total,
          },
          currency: product.currency || baseCurrency,
          date: product.createdAt?.slice(0, 10) || todayInput(),
          isExpandable: false,
          kind: "auto",
          name: product.name,
          paid: Math.min(total, parseNumber(product.cashWalletPaid) + parseNumber(product.supplierAdvanceUsed)),
          remaining: Math.max(0, total - parseNumber(product.cashWalletPaid) - parseNumber(product.supplierAdvanceUsed)),
          rows: [],
          supplierId: product.supplierId || "",
          total,
          unit: product.unit || "Piece",
          quantity,
        };
      })
      .filter(Boolean);

    return [...purchaseRows, ...autoRows]
      .filter((row) => currencyMatchesFilter(row.currency, businessCurrencyFilter))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [baseCurrency, businessCurrencyFilter, entries, godownEntries, productRows]);

  const filteredProducts = currencyFilteredProductRows.filter((product) => {
    const needle = search.trim().toLowerCase();
    const supplierIds = new Set([product.supplierId, ...product.entries.map((entry) => entry.supplierId)].filter(Boolean).map(String));
    const supplierNames = [...supplierIds].map((id) => getSupplierName(suppliers.find((supplier) => String(supplier.id) === id))).join(" ");
    const matchesSearch = !needle || `${product.name} ${product.code} ${supplierNames} ${product.category}`.toLowerCase().includes(needle);
    const matchesProduct = productFilter === "all" || String(product.id) === String(productFilter);
    const matchesSupplier = supplierFilter === "all" || supplierIds.has(String(supplierFilter));
    const threshold = parseNumber(product.lowStockThreshold || product.lowStock);
    const expiryDate = parseDateInput(product.expiryDate || product.expiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysToExpire = expiryDate ? Math.ceil((expiryDate - today) / 86400000) : null;
    const productDate = product.entries[0]?.date || product.createdAt?.slice(0, 10) || "";
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in" && product.quantity > 0) ||
      (stockFilter === "out" && product.quantity <= 0) ||
      (stockFilter === "low" && product.quantity > 0 && threshold > 0 && product.quantity <= threshold) ||
      (stockFilter === "expiring" && daysToExpire !== null && daysToExpire >= 0 && daysToExpire <= 30) ||
      (stockFilter === "expired" && daysToExpire !== null && daysToExpire < 0);
    const matchesDate = getDateMatches(productDate, dateFilter, customStartDate, customEndDate);
    const matchesSoldOut = !hideSoldOut || product.quantity > 0;
    return matchesSearch && matchesProduct && matchesSupplier && matchesStock && matchesDate && matchesSoldOut;
  });

  const filteredStockEntries = stockEntryRows.filter((row) => {
    const needle = search.trim().toLowerCase();
    const supplierName = getSupplierName(suppliers.find((supplier) => String(supplier.id) === String(row.supplierId)));
    const rowText = `${row.name} ${row.billNumber} ${supplierName} ${row.rows.map((item) => `${item.name} ${item.code}`).join(" ")}`.toLowerCase();
    const matchesSearch = !needle || rowText.includes(needle);
    const matchesProduct = productFilter === "all" || String(row.actionEntry?.productId) === String(productFilter) || row.rows.some((item) => String(item.productId) === String(productFilter));
    const matchesSupplier = supplierFilter === "all" || String(row.supplierId) === String(supplierFilter) || row.rows.some((item) => String(item.supplierId) === String(supplierFilter));
    const relatedProduct = currencyFilteredProductRows.find((product) => String(product.id) === String(row.actionEntry?.productId) || row.rows.some((item) => String(item.productId) === String(product.id)));
    const currentQuantity = parseNumber(relatedProduct?.quantity ?? row.quantity);
    const threshold = parseNumber(relatedProduct?.lowStockThreshold || relatedProduct?.lowStock);
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in" && currentQuantity > 0) ||
      (stockFilter === "out" && currentQuantity <= 0) ||
      (stockFilter === "low" && currentQuantity > 0 && threshold > 0 && currentQuantity <= threshold);
    const matchesDate = getDateMatches(row.date, dateFilter, customStartDate, customEndDate);
    const matchesSoldOut = !hideSoldOut || currentQuantity > 0;
    return matchesSearch && matchesProduct && matchesSupplier && matchesStock && matchesDate && matchesSoldOut;
  });

  const visibleRows = viewMode === "product" ? filteredProducts : filteredStockEntries;
  const pagination = useTablePagination(
    visibleRows,
    `${viewMode}-${search}-${productFilter}-${supplierFilter}-${stockFilter}-${dateFilter}-${customStartDate}-${customEndDate}-${hideSoldOut}`
  );

  const summary = {
    imports: stockEntryRows.length,
    stockValue: currencyFilteredProductRows.reduce((sum, product) => sum + product.stockValue, 0),
    expectedProfit: currencyFilteredProductRows.reduce((sum, product) => sum + product.expectedProfit, 0),
    payable: stockEntryRows.reduce((sum, row) => sum + parseNumber(row.remaining), 0),
    quantity: currencyFilteredProductRows.reduce((sum, product) => sum + parseNumber(product.quantity), 0),
  };
  const summaryCurrency = businessCurrencyFilter === "all" ? baseCurrency : businessCurrencyFilter;

  const productOptions = [
    { value: "all", label: "All products" },
    ...currencyFilteredProductRows.map((product) => ({ value: product.id, label: product.name })),
  ];
  const supplierOptions = [
    { value: "all", label: "All suppliers" },
    ...suppliers.map((supplier) => ({ value: supplier.id, label: getSupplierName(supplier) })),
  ];

  const savePurchase = async (purchase) => {
    const purchaseRecord = {
      ...purchase,
      id: purchase.id || `godown-${Date.now()}`,
      createdAt: purchase.createdAt || new Date().toISOString(),
    };
    let nextProducts = [...products];
    const rowsWithIds = purchaseRecord.rows.map((row, rowIndex) => {
      const selectedIndex = nextProducts.findIndex((product) => String(product.id) === String(row.productId));
      const rowCode = normalizeText(row.code);
      const codeIndex = rowCode
        ? nextProducts.findIndex((product) => [product.code, product.barcode, product.productCode].some((value) => normalizeText(value) === rowCode))
        : -1;
      const existingIndex = codeIndex >= 0 ? codeIndex : selectedIndex;
      const productId = existingIndex >= 0 ? nextProducts[existingIndex].id : `product-${crypto.randomUUID()}`;

      if (existingIndex >= 0) {
        const existing = nextProducts[existingIndex];
        nextProducts[existingIndex] = {
          ...existing,
          name: row.name,
          productName: row.name,
          code: row.code || existing.code,
          category: row.category || existing.category,
          purchase: roundMoney(row.purchase),
          selling: roundMoney(row.selling),
          quantity: roundMoney(parseNumber(existing.quantity) + parseNumber(row.quantity)),
          unit: row.unit || existing.unit,
          currency: purchaseRecord.currency || existing.currency || baseCurrency,
          supplierId: row.supplierId || purchaseRecord.supplierId || existing.supplierId,
          lowStock: row.lowStock || existing.lowStock || "",
          expiry: row.expiry || existing.expiry || "",
          status: "In Stock",
          updatedAt: new Date().toISOString(),
        };
      } else {
        nextProducts = [
          {
            id: productId,
            barcode: "",
            code: row.code || `PRD-${Date.now().toString().slice(-5)}${String(rowIndex + 1).padStart(2, "0")}`,
            category: row.category,
            createdAt: purchaseRecord.createdAt,
            currency: purchaseRecord.currency || baseCurrency,
            name: row.name,
            productName: row.name,
            purchase: roundMoney(row.purchase),
            selling: roundMoney(row.selling),
            quantity: roundMoney(row.quantity),
            unit: row.unit,
            lowStock: row.lowStock || "",
            expiry: row.expiry || "",
            supplierId: row.supplierId || purchaseRecord.supplierId,
            status: "In Stock",
          },
          ...nextProducts,
        ];
      }

      return {
        ...row,
        id: `entry-row-${crypto.randomUUID()}`,
        productId,
        rate: parseNumber(row.rate || purchaseRecord.rate),
        supplierId: row.supplierId || purchaseRecord.supplierId,
      };
    });

    const productsSaved = await setProducts(nextProducts);
    if (!productsSaved) return;
    const entryToSave = { ...purchaseRecord, rows: rowsWithIds };
    const entrySaved = await setGodownEntries((current) => [entryToSave, ...current]);
    if (!entrySaved) return;

    if (parseNumber(purchaseRecord.paid) > 0) {
      await setTransactions((current) => [
        {
          id: `purchase-${purchaseRecord.id}`,
          type: "expense",
          title: `Godown purchase ${purchaseRecord.billNumber || ""}`.trim(),
          amount: roundMoney(purchaseRecord.paid),
          date: purchaseRecord.date,
          description: rowsWithIds.map((row) => row.name).join(", "),
          source: "godown-purchase",
          category: "purchase",
          referenceId: purchaseRecord.id,
          currency: purchaseRecord.currency || baseCurrency,
        },
        ...current,
      ]);
    }

    notify("Purchase saved successfully.");
    setPurchaseOpen(false);
  };

  const saveEditedEntry = async (form) => {
    const previousQuantity = parseNumber(editEntry?.quantity);
    const nextQuantity = parseNumber(form.quantity);
    const quantityDelta = nextQuantity - previousQuantity;
    const nextEntries = godownEntries.map((entry) => {
      if (String(entry.id) !== String(form.entryId)) return entry;
      const rows = (entry.rows || []).map((row) =>
        String(row.id) === String(form.id)
          ? {
              ...row,
              name: form.name,
              code: form.code,
              quantity: nextQuantity,
              unit: form.unit,
              purchase: roundMoney(form.purchase),
              selling: roundMoney(form.selling),
              rate: roundMoney(form.rate),
              category: form.category,
              supplierId: form.supplierId,
              date: form.date,
              notes: form.notes,
            }
          : row
      );
      const total = rows.reduce((sum, row) => sum + parseNumber(row.quantity) * parseNumber(row.purchase), 0);
      return { ...entry, rows, total, remaining: Math.max(0, total - parseNumber(entry.paid)), updatedAt: new Date().toISOString() };
    });
    const entriesSaved = await setGodownEntries(nextEntries);
    if (!entriesSaved) return;

    if (form.productId && quantityDelta) {
      await setProducts((current) =>
        current.map((product) =>
          String(product.id) === String(form.productId)
            ? {
                ...product,
                name: form.name,
                productName: form.name,
                code: form.code || product.code,
                purchase: roundMoney(form.purchase),
                selling: roundMoney(form.selling),
                quantity: Math.max(0, parseNumber(product.quantity) + quantityDelta),
                unit: form.unit || product.unit,
                category: form.category || product.category,
                supplierId: form.supplierId || product.supplierId,
                updatedAt: new Date().toISOString(),
              }
            : product
        )
      );
    }

    notify("Purchase entry updated.");
    setEditEntry(null);
  };

  const confirmDeleteEntry = async () => {
    if (!deleteEntry) return;
    const entry = deleteEntry;
    if (entry.kind === "auto") {
      notify("Auto stock entries come from Products and cannot be deleted here.", "error");
      setDeleteEntry(null);
      return;
    }

    const productDeltas = new Map();
    entry.rows.forEach((row) => {
      if (!row.productId) return;
      productDeltas.set(String(row.productId), (productDeltas.get(String(row.productId)) || 0) - parseNumber(row.quantity));
    });

    const entriesSaved = await setGodownEntries((current) =>
      current.filter((item) => String(item.id) !== String(entry.source?.id || entry.id).replace("purchase-", ""))
    );
    if (!entriesSaved) return;

    await setProducts((current) =>
      current.map((product) => {
        const delta = productDeltas.get(String(product.id));
        if (!delta) return product;
        const quantity = Math.max(0, parseNumber(product.quantity) + delta);
        return { ...product, quantity, status: quantity > 0 ? "In Stock" : "Out of Stock", updatedAt: new Date().toISOString() };
      })
    );

    notify("Purchase entry deleted and stock adjusted.");
    setDeleteEntry(null);
  };

  const godownReportRows = useMemo(
    () =>
      viewMode === "product"
        ? filteredProducts.map((product) => ({
            Product: product.name,
            Supplier: getSupplierName(suppliers.find((supplier) => String(supplier.id) === String(product.supplierId))),
            Imported: `${product.imported} ${product.unit}`,
            "In Stock": `${product.quantity} ${product.unit}`,
            Sold: `${product.sold} ${product.unit}`,
            Purchase: formatCurrencyAmount(product.purchase, product.currency),
            Selling: formatCurrencyAmount(product.selling, product.currency),
            Value: formatCurrencyAmount(product.stockValue, product.currency),
          }))
        : filteredStockEntries.map((entry) => ({
            Date: getDateLabel(entry.date),
            Bill: entry.billNumber || "-",
            Product: entry.name,
            Supplier: getSupplierName(suppliers.find((supplier) => String(supplier.id) === String(entry.supplierId))),
            Quantity: `${entry.quantity} ${entry.unit}`,
            Paid: formatCurrencyAmount(entry.paid, entry.currency),
            Remaining: formatCurrencyAmount(entry.remaining, entry.currency),
            Total: formatCurrencyAmount(entry.total, entry.currency),
          })),
    [filteredProducts, filteredStockEntries, suppliers, viewMode]
  );
  const godownReportColumns =
    viewMode === "product"
      ? ["Product", "Supplier", "Imported", "In Stock", "Sold", "Purchase", "Selling", "Value"]
      : ["Date", "Bill", "Product", "Supplier", "Quantity", "Paid", "Remaining", "Total"];

  return (
    <div className="main-stock-page">
      <div className="main-stock-header">
        <div>
          <h1>Godown</h1>
          <p>Manage stock purchases, supplier balances, product quantity and warehouse value.</p>
        </div>
        <div className="main-stock-header-actions">
          <button type="button" className="main-stock-light-btn" onClick={() => setPrintReportOpen(true)}>
            <Printer size={16} />
            Print Report
          </button>
          <button type="button" className="main-stock-primary-btn" onClick={() => setPurchaseOpen(true)}>
            <Plus size={16} />
            Add Purchase
          </button>
        </div>
      </div>

      <section className="main-stock-stats">
        <StatCard icon={Archive} label="Stock Entries" value={summary.imports} />
        <StatCard icon={ShoppingCart} label="Total Quantity" value={summary.quantity} />
        <StatCard icon={ReceiptText} label="Stock Value" value={formatCurrencyAmount(summary.stockValue, summaryCurrency)} />
        <StatCard icon={BarChart3} label="Expected Profit" value={formatCurrencyAmount(summary.expectedProfit, summaryCurrency)} tone="success" />
        <StatCard icon={WalletCards} label="Payable To Suppliers" value={formatCurrencyAmount(summary.payable, summaryCurrency)} tone="warning" />
      </section>

      <section className="main-stock-card">
        <div className="main-stock-toolbar">
          <label className="main-stock-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or supplier..." />
          </label>
          <CustomSelect ariaLabel="Product filter" options={productOptions} value={productFilter} onChange={setProductFilter} />
          <CustomSelect ariaLabel="Supplier filter" options={supplierOptions} value={supplierFilter} onChange={setSupplierFilter} />
          <CustomSelect
            ariaLabel="Stock status"
            options={[
              { value: "all", label: "All stock" },
              { value: "in", label: "In stock" },
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
              { value: "expiring", label: "Expiring soon" },
              { value: "expired", label: "Expired" },
            ]}
            value={stockFilter}
            onChange={setStockFilter}
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
          <div className="main-stock-inline-controls">
            <button type="button" className={viewMode === "product" ? "active" : ""} onClick={() => setViewMode("product")}>Products</button>
            <button type="button" className={viewMode === "entry" ? "active" : ""} onClick={() => setViewMode("entry")}>Entries</button>
            <button type="button" className={hideSoldOut ? "active" : ""} onClick={() => setHideSoldOut((current) => !current)}>
              Hide sold out
            </button>
          </div>
          {dateFilter === "custom" && (
            <div className="main-stock-inline-dates">
              <input type="date" value={customStartDate} onChange={(event) => setCustomStartDate(event.target.value)} />
              <input type="date" value={customEndDate} onChange={(event) => setCustomEndDate(event.target.value)} />
            </div>
          )}
        </div>

        {viewMode === "product" ? (
          <ProductTable
            expandedProduct={expandedProduct}
            pageItems={pagination.pageItems}
            setDetailEntry={setDetailEntry}
            setExpandedProduct={setExpandedProduct}
            suppliers={suppliers}
          />
        ) : (
          <EntryTable
            pageItems={pagination.pageItems}
            setDeleteEntry={setDeleteEntry}
            setDetailEntry={setDetailEntry}
            setEditEntry={setEditEntry}
            suppliers={suppliers}
          />
        )}

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={visibleRows.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
        />
      </section>

      {purchaseOpen && (
        <PurchaseModal
          baseCurrency={baseCurrency}
          categories={categoryList}
          onAddCategory={async (name) => {
            if (!name.trim()) return;
            await setCategories((current) => [...current, { id: `category-${Date.now()}`, name: name.trim() }]);
          }}
          onClose={() => setPurchaseOpen(false)}
          onSave={savePurchase}
          products={productRows}
          suppliers={suppliers}
        />
      )}

      {detailEntry && <EntryDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} suppliers={suppliers} />}
      {editEntry && <EditEntryModal categories={categoryList} entry={editEntry} onClose={() => setEditEntry(null)} onSave={saveEditedEntry} suppliers={suppliers} />}
      {deleteEntry && (
        <ConfirmModal
          title="Delete Stock Entry"
          message="Delete this purchase entry? Product stock will be adjusted."
          onClose={() => setDeleteEntry(null)}
          onConfirm={confirmDeleteEntry}
        />
      )}

      {printReportOpen && (
        <StandardPrintStudio
          columns={godownReportColumns}
          company={company}
          filename={`godown-${viewMode === "product" ? "products" : "stock-entries"}-report`}
          Icon={Archive}
          rows={godownReportRows}
          stats={[
            { label: "Entries", value: summary.imports },
            { label: "Quantity", value: summary.quantity },
            { label: "Stock Value", value: formatCurrencyAmount(summary.stockValue, summaryCurrency) },
          ]}
          subtitle={viewMode === "product" ? "All filtered godown products" : "All filtered godown stock entries"}
          title={`Godown ${viewMode === "product" ? "Products" : "Stock Entries"} Report`}
          onClose={() => setPrintReportOpen(false)}
        />
      )}
    </div>
  );
}

function ProductTable({ expandedProduct, pageItems, setDetailEntry, setExpandedProduct, suppliers }) {
  return (
    <div className="main-stock-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Supplier</th>
            <th>Imported</th>
            <th>In Stock</th>
            <th>Sold</th>
            <th>Purchase</th>
            <th>Selling</th>
            <th>Stock Value</th>
            <th>Payable</th>
            <th>History</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((product) => (
            <Fragment key={product.id}>
              <tr>
                <td className="main-stock-name-cell">
                  <strong>{product.name}</strong>
                  <span>{product.code || "-"} / {product.entries.length} purchases</span>
                </td>
                <td>{getSupplierName(suppliers.find((supplier) => String(supplier.id) === String(product.supplierId)))}</td>
                <td>{product.imported} {product.unit}</td>
                <td className={product.quantity <= 0 ? "main-stock-danger-text" : ""}>{product.quantity} {product.unit}</td>
                <td>{product.sold} {product.unit}</td>
                <td>{formatCurrencyAmount(product.purchase, product.currency)}</td>
                <td>{formatCurrencyAmount(product.selling, product.currency)}</td>
                <td><strong>{formatCurrencyAmount(product.stockValue, product.currency)}</strong></td>
                <td className="main-stock-warning-text">{formatCurrencyAmount(product.remaining, product.currency)}</td>
                <td>
                  <button type="button" className="main-stock-icon-btn" onClick={() => setExpandedProduct((current) => (current === product.id ? "" : product.id))}>
                    <ChevronDown className={expandedProduct === product.id ? "rotate" : ""} size={16} />
                  </button>
                </td>
              </tr>
              {expandedProduct === product.id && (
                <tr className="main-stock-nested-row">
                  <td colSpan="10">
                    {product.entries.length ? (
                      <div className="main-stock-history-table">
                        <table data-table-enhancer="off">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Supplier</th>
                              <th>Qty</th>
                              <th>Unit Cost</th>
                              <th>Selling Price</th>
                              <th>Rate (AFN)</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.entries.map((entry) => (
                              <tr key={entry.id} onClick={() => setDetailEntry(entry)}>
                                <td>{getDateLabel(entry.date || entry.entryDate)}</td>
                                <td>{getSupplierName(suppliers.find((supplier) => String(supplier.id) === String(entry.supplierId)))}</td>
                                <td><strong>{entry.quantity} {entry.unit}</strong></td>
                                <td>{formatCurrencyAmount(entry.purchase, entry.currency)}</td>
                                <td>{formatCurrencyAmount(entry.selling, entry.currency)}</td>
                                <td>{parseNumber(entry.rate) > 0 ? `${roundMoney(entry.rate)} AFN` : "-"}</td>
                                <td><strong>{formatCurrencyAmount(entry.total, entry.currency)}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p>No purchase history for this product yet.</p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          {!pageItems.length && (
            <tr>
              <td colSpan="10" className="main-stock-empty">No products found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EntryTable({ pageItems, setDeleteEntry, setDetailEntry, setEditEntry, suppliers }) {
  return (
    <div className="main-stock-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Bill</th>
            <th>Product</th>
            <th>Supplier</th>
            <th>Quantity</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Remaining</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((entry) => (
            <tr key={entry.id}>
              <td>{getDateLabel(entry.date)}<small>{getShamsiLabel(entry.date)}</small></td>
              <td><span className="main-stock-soft-pill">{entry.billNumber || "-"}</span></td>
              <td className="main-stock-name-cell"><strong>{entry.name}</strong><span>{entry.kind === "auto" ? "Imported from Products" : `${entry.rows.length || 1} line(s)`}</span></td>
              <td>{getSupplierName(suppliers.find((supplier) => String(supplier.id) === String(entry.supplierId)))}</td>
              <td>{entry.quantity} {entry.unit}</td>
              <td><strong>{formatCurrencyAmount(entry.total, entry.currency)}</strong></td>
              <td>{formatCurrencyAmount(entry.paid, entry.currency)}</td>
              <td className="main-stock-warning-text">{formatCurrencyAmount(entry.remaining, entry.currency)}</td>
              <td>
                <FloatingActionMenu
                  ariaLabel="Godown actions"
                  actions={[
                    { icon: <Eye size={15} />, label: "View Details", onClick: () => setDetailEntry(entry.kind === "purchase" ? entry : entry.actionEntry || entry) },
                    ...(entry.kind === "purchase"
                      ? [
                          { icon: <Plus size={15} />, label: "Edit", onClick: () => setEditEntry(entry.actionEntry) },
                          { danger: true, icon: <Trash2 size={15} />, label: "Delete", onClick: () => setDeleteEntry(entry) },
                        ]
                      : []),
                  ]}
                />
              </td>
            </tr>
          ))}
          {!pageItems.length && (
            <tr>
              <td colSpan="9" className="main-stock-empty">No stock entries found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseModal({ baseCurrency, categories, onAddCategory, onClose, onSave, products, suppliers }) {
  const [supplierId, setSupplierId] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [date, setDate] = useState(todayInput());
  const [rate, setRate] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [paid, setPaid] = useState("");
  const [rows, setRows] = useState([emptyLine()]);
  const [submitted, setSubmitted] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");

  const total = rows.reduce((sum, row) => sum + parseNumber(row.quantity) * parseNumber(row.purchase), 0);
  const remaining = Math.max(0, total - parseNumber(paid));
  const paidTooHigh = parseNumber(paid) > total;

  const productOptions = [
    { value: "", label: "New product" },
    ...products.map((product) => ({ value: product.id, label: `${product.name}${product.code ? ` (${product.code})` : ""}` })),
  ];
  const supplierOptions = [
    { value: "", label: "Select supplier" },
    ...suppliers.map((supplier) => ({ value: supplier.id, label: getSupplierName(supplier) })),
  ];

  const updateRow = (id, patch) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.productId !== undefined) {
          const product = products.find((item) => String(item.id) === String(patch.productId));
          if (product) {
            return {
              ...next,
              name: product.name || "",
              code: product.code || "",
              unit: product.unit || "Piece",
              purchase: product.purchase || "",
              selling: product.selling || "",
              category: product.category || "",
              lowStock: product.lowStock || "",
              expiry: product.expiry || "",
              supplierId: product.supplierId || supplierId,
            };
          }
        }
        return next;
      })
    );
  };

  const addRow = () => setRows((current) => [...current, { ...emptyLine(), supplierId, date }]);
  const removeRow = (id) => setRows((current) => (current.length === 1 ? current : current.filter((row) => row.id !== id)));

  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    const validRows = rows
      .map((row) => ({
        ...row,
        supplierId: row.supplierId || supplierId,
        date: row.date || date,
        purchase: roundMoney(row.purchase),
        rate: roundMoney(row.rate || rate),
        selling: roundMoney(row.selling),
        quantity: roundMoney(row.quantity),
      }))
      .filter((row) => row.name.trim() && parseNumber(row.quantity) > 0);

    if (!validRows.length || paidTooHigh) {
      notify(paidTooHigh ? "Paid amount cannot exceed grand total." : "Please add at least one valid product.", "error");
      return;
    }

    onSave({
      billNumber: billNumber.trim(),
      currency,
      date,
      paid: roundMoney(paid),
      rate: roundMoney(rate),
      remaining: roundMoney(remaining),
      supplierId,
      total: roundMoney(total),
      rows: validRows,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="main-stock-modal-backdrop">
      <form className="main-stock-purchase-modal" onSubmit={submit}>
        <div className="main-stock-modal-title">
          <div>
            <h2>Multi Product Purchase Bill</h2>
            <p>Add one bill with one or more product rows.</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <section className="main-stock-meta-grid">
          <Field label="Supplier">
            <CustomSelect ariaLabel="Supplier" options={supplierOptions} value={supplierId} onChange={setSupplierId} />
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="Currency">
            <CustomSelect ariaLabel="Currency" options={currencyCodes.map((code) => ({ value: code, label: code }))} value={currency} onChange={setCurrency} />
          </Field>
          <Field label="Rate">
            <input type="number" min="0" step="any" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="USD/EUR rate in AFN" />
          </Field>
          <Field label="Bill Number">
            <input value={billNumber} onChange={(event) => setBillNumber(event.target.value)} placeholder="Optional" />
          </Field>
        </section>

        <section className="main-stock-purchase-lines">
          <div className="main-stock-line main-stock-line-head">
            <span>Product</span>
            <span>Code</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Purchase</span>
            <span>Selling</span>
            <span>Date</span>
            <span></span>
          </div>
          {rows.map((row, index) => (
            <article className="main-stock-line-frame" key={row.id}>
              <div className="main-stock-line-frame-title">
                <strong>Product Row {index + 1}</strong>
                <span>{row.name || "New product"}</span>
              </div>
              <div className="main-stock-line">
                <div className="main-stock-product-pick">
                  <CustomSelect ariaLabel="Product" options={productOptions} value={row.productId} onChange={(value) => updateRow(row.id, { productId: value })} />
                  <input className={submitted && !row.name.trim() ? "invalid" : ""} placeholder="Product name" value={row.name} onChange={(event) => updateRow(row.id, { name: event.target.value })} />
                </div>
                <input placeholder="Code" value={row.code} onChange={(event) => updateRow(row.id, { code: event.target.value })} />
                <input className={submitted && parseNumber(row.quantity) <= 0 ? "invalid" : ""} type="number" min="0" value={row.quantity} onChange={(event) => updateRow(row.id, { quantity: event.target.value })} />
                <CustomSelect ariaLabel="Unit" options={unitOptions.map((unit) => ({ value: unit, label: unit }))} value={row.unit} onChange={(value) => updateRow(row.id, { unit: value })} />
                <input type="number" min="0" value={row.purchase} onChange={(event) => updateRow(row.id, { purchase: event.target.value })} />
                <input type="number" min="0" value={row.selling} onChange={(event) => updateRow(row.id, { selling: event.target.value })} />
                <input type="date" value={row.date} onChange={(event) => updateRow(row.id, { date: event.target.value })} />
                <button type="button" className="main-stock-line-delete" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
                  <Trash2 size={14} />
                </button>
                <CustomSelect
                  ariaLabel="Category"
                  className="main-stock-line-category"
                  options={[{ value: "", label: "Category" }, ...categories.map((category) => ({ value: category, label: category }))]}
                  value={row.category}
                  onChange={(value) => updateRow(row.id, { category: value })}
                />
                <input className="main-stock-line-low" type="number" min="0" placeholder="Low stock" value={row.lowStock} onChange={(event) => updateRow(row.id, { lowStock: event.target.value })} />
                <input className="main-stock-line-expiry" type="date" value={row.expiry} onChange={(event) => updateRow(row.id, { expiry: event.target.value })} />
                <textarea className="main-stock-line-notes" placeholder="Notes" value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} />
              </div>
            </article>
          ))}
          <div className="main-stock-line-tools">
            <button type="button" className="main-stock-light-btn" onClick={addRow}><Plus size={15} /> Add Row</button>
            <label>
              <input value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} placeholder="New category" />
              <button
                type="button"
                onClick={() => {
                  onAddCategory(categoryDraft);
                  setCategoryDraft("");
                }}
              >
                Add
              </button>
            </label>
          </div>
        </section>

        <section className="main-stock-payment">
          <div><span>{rows.length} rows</span><strong>Grand Total: {formatCurrencyAmount(total, currency)}</strong></div>
          <Field label="Paid Now" invalid={paidTooHigh}>
            <input type="number" min="0" value={paid} onChange={(event) => setPaid(event.target.value)} placeholder="0" />
          </Field>
          <Field label="Remaining">
            <input readOnly value={formatCurrencyAmount(remaining, currency)} />
          </Field>
        </section>

        <div className="main-stock-modal-actions">
          <button type="button" className="main-stock-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="main-stock-primary-btn">Save Purchase</button>
        </div>
      </form>
    </div>
  );
}

function EditEntryModal({ categories, entry, onClose, onSave, suppliers }) {
  const [form, setForm] = useState({ ...entry });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="main-stock-modal-backdrop">
      <form
        className="main-stock-edit-modal"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <div className="main-stock-modal-title">
          <div><h2>Edit Purchase Entry</h2><p>Update this stock entry and product quantity.</p></div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="main-stock-form-grid">
          <Field label="Product Name"><input value={form.name || ""} onChange={(event) => update("name", event.target.value)} /></Field>
          <Field label="Code"><input value={form.code || ""} onChange={(event) => update("code", event.target.value)} /></Field>
          <Field label="Supplier">
            <CustomSelect
              ariaLabel="Supplier"
              options={[{ value: "", label: "Select supplier" }, ...suppliers.map((supplier) => ({ value: supplier.id, label: getSupplierName(supplier) }))]}
              value={form.supplierId || ""}
              onChange={(value) => update("supplierId", value)}
            />
          </Field>
          <Field label="Date"><input type="date" value={form.date || todayInput()} onChange={(event) => update("date", event.target.value)} /></Field>
          <Field label="Quantity"><input type="number" min="0" value={form.quantity || ""} onChange={(event) => update("quantity", event.target.value)} /></Field>
          <Field label="Unit">
            <CustomSelect ariaLabel="Unit" options={unitOptions.map((unit) => ({ value: unit, label: unit }))} value={form.unit || "Piece"} onChange={(value) => update("unit", value)} />
          </Field>
          <Field label="Purchase"><input type="number" min="0" value={form.purchase || ""} onChange={(event) => update("purchase", event.target.value)} /></Field>
          <Field label="Selling"><input type="number" min="0" value={form.selling || ""} onChange={(event) => update("selling", event.target.value)} /></Field>
          <Field label="Rate (AFN)"><input type="number" min="0" step="any" value={form.rate || ""} onChange={(event) => update("rate", event.target.value)} /></Field>
          <Field label="Category">
            <CustomSelect
              ariaLabel="Category"
              options={[{ value: "", label: "Category" }, ...categories.map((category) => ({ value: category, label: category }))]}
              value={form.category || ""}
              onChange={(value) => update("category", value)}
            />
          </Field>
          <Field label="Notes" className="full"><textarea value={form.notes || ""} onChange={(event) => update("notes", event.target.value)} /></Field>
        </div>
        <div className="main-stock-modal-actions">
          <button type="button" className="main-stock-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="main-stock-primary-btn">Save Changes</button>
        </div>
      </form>
    </div>
  );
}

function EntryDetailModal({ entry, onClose, suppliers }) {
  const supplier = suppliers.find((item) => String(item.id) === String(entry.supplierId));
  const rows = Array.isArray(entry.rows) && entry.rows.length ? entry.rows : [];
  return (
    <div className="main-stock-modal-backdrop">
      <div className="main-stock-detail-modal">
        <div className="main-stock-modal-title">
          <div><h2>{entry.name || "Stock Entry"}</h2><p>{entry.billNumber || "Purchase details"}</p></div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="main-stock-detail-grid">
          <DetailBox label="Supplier" value={getSupplierName(supplier)} />
          <DetailBox label="Date" value={getDateLabel(entry.date || entry.entryDate)} />
          <DetailBox label="Quantity" value={`${entry.quantity || 0} ${entry.unit || "Piece"}`} />
          <DetailBox label="Purchase" value={formatCurrencyAmount(entry.purchase || 0, entry.currency || "AFN")} />
          <DetailBox label="Selling" value={formatCurrencyAmount(entry.selling || 0, entry.currency || "AFN")} />
          <DetailBox label="Rate (AFN)" value={parseNumber(entry.rate) > 0 ? `${roundMoney(entry.rate)} AFN` : "-"} />
          <DetailBox label="Total" value={formatCurrencyAmount(entry.total || entry.rowTotal || 0, entry.currency || "AFN")} />
        </div>
        {rows.length > 0 && (
          <div className="main-stock-history-table detail">
            <table data-table-enhancer="off">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Cost</th>
                  <th>Selling Price</th>
                  <th>Rate (AFN)</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowSupplier = suppliers.find((item) => String(item.id) === String(row.supplierId || entry.supplierId));
                  const rowTotal = parseNumber(row.total || row.rowTotal) || parseNumber(row.quantity) * parseNumber(row.purchase);
                  return (
                    <tr key={row.id || `${row.name}-${row.rowIndex}`}>
                      <td>{getDateLabel(row.date || entry.date || entry.entryDate)}</td>
                      <td>{getSupplierName(rowSupplier)}</td>
                      <td><strong>{row.name}</strong></td>
                      <td>{row.quantity} {row.unit}</td>
                      <td>{formatCurrencyAmount(row.purchase, entry.currency || row.currency || "AFN")}</td>
                      <td>{formatCurrencyAmount(row.selling, entry.currency || row.currency || "AFN")}</td>
                      <td>{parseNumber(row.rate || entry.rate) > 0 ? `${roundMoney(row.rate || entry.rate)} AFN` : "-"}</td>
                      <td><strong>{formatCurrencyAmount(rowTotal, entry.currency || row.currency || "AFN")}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {entry.notes && <p className="main-stock-detail-note">{entry.notes}</p>}
      </div>
    </div>
  );
}

function Field({ children, className = "", invalid = false, label }) {
  return (
    <label className={`main-stock-form-field ${className} ${invalid ? "invalid" : ""}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function DetailBox({ label, value }) {
  return (
    <div className="main-stock-detail-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatCard({ icon: Icon, label, tone = "", value }) {
  return (
    <article className={`main-stock-stat-card ${tone}`.trim()}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={21} />
    </article>
  );
}

function ConfirmModal({ message, onClose, onConfirm, title }) {
  return (
    <div className="main-stock-modal-backdrop">
      <div className="main-stock-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="main-stock-modal-actions">
          <button type="button" className="main-stock-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="main-stock-danger-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default MainStock;
