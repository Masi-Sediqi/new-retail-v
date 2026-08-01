import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { formatDateTime } from "../utils/afghanDate";
import "./SupplierDetails.css";

const emptyPurchaseForm = {
  purchaseDate: "",
  referenceNumber: "",
  invoiceNumber: "",
  assetId: "",
  deviceName: "",
  category: "",
  brand: "",
  model: "",
  macAddress: "",
  serialNumber: "",
  quantity: "1",
  unitPrice: "",
  paidAmount: "",
  remainAmount: "",
  location: "Main Stock",
  status: "In Stock",
  notes: "",
};

const defaultCategories = [
  "Router",
  "ONU / ONT",
  "Modem",
  "Switch",
  "Access Point",
  "Radio",
  "Antenna",
  "Power Supply",
  "UPS",
  "Battery",
  "Server",
  "Rack",
  "Fiber Cable",
  "Ethernet Cable",
  "SFP Module",
  "Media Converter",
  "PoE Adapter",
  "Tower Equipment",
  "Tools",
  "Office Equipment",
  "Computers",
  "Printers",
  "Vehicles",
];

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6l1 15h10l1-15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PrintIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M7 8V3h10v5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 14h10v7H7v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function SupplierDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const supplierIndex = Number(id);

  const [suppliers] = useJsonCollection("suppliers");
  const [assets, setAssets] = useJsonCollection("assets");
  const [supplierPurchases, setSupplierPurchases] = useJsonCollection("supplierPurchases");
  const [assetMovements, setAssetMovements] = useJsonCollection("assetMovements");
  const [supplierPayments] = useJsonCollection("supplierPayments");
  const [customCategories, setCustomCategories] = useJsonCollection("assetCategories");
  const [settings] = useJsonCollection("settings");
  const [, setTransactions] = useJsonCollection("transactions");

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);
  const [categoryMode, setCategoryMode] = useState("select");
  const [newCategory, setNewCategory] = useState("");

  const [editPurchaseId, setEditPurchaseId] = useState(null);
  const [detailPurchase, setDetailPurchase] = useState(null);
  const [deletePurchaseId, setDeletePurchaseId] = useState(null);
  const [showSupplierInfo, setShowSupplierInfo] = useState(false);
  const [editLedgerPurchase, setEditLedgerPurchase] = useState(null);
  const [editLedgerPurchaseForm, setEditLedgerPurchaseForm] = useState({});
  const [purchaseDateFilter, setPurchaseDateFilter] = useState({
    from: "",
    to: "",
  });

  const [openPurchaseAction, setOpenPurchaseAction] = useState(null);
  const [purchaseActionPosition, setPurchaseActionPosition] = useState({
    top: 0,
    left: 0,
  });

  const supplier = suppliers[supplierIndex];

  const money = (value) => Number(value || 0).toLocaleString("en-US");

  const supplierName = supplier?.supplierName || "";
  const companySettings = settings[0] || {};
  const systemName = companySettings.companyName || "Smart Office";
  const systemLogo = companySettings.logo || "";
  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const getPurchaseDateOnly = (purchase) =>
    String(purchase.purchaseDate || purchase.date || purchase.createdAt || "").slice(0, 10);
  const purchaseMatchesDateFilter = (purchase) => {
    const date = getPurchaseDateOnly(purchase);
    if (purchaseDateFilter.from && (!date || date < purchaseDateFilter.from)) return false;
    if (purchaseDateFilter.to && (!date || date > purchaseDateFilter.to)) return false;
    return true;
  };

  const generateNextPurchaseReference = () => {
    const maxNumber = [...supplierPurchases, ...assetMovements].reduce((max, record) => {
      const value = record.referenceNumber || record.purchaseCode || record.invoiceNumber || "";
      const match = String(value).match(/^(?:REF|PUR)-(\d+)$/i);

      if (!match) return max;

      const number = Number(match[1] || 0);
      return number > max ? number : max;
    }, 0);

    return `REF-${String(maxNumber + 1).padStart(4, "0")}`;
  };

  const movementPurchases = assetMovements
    .filter((movement) => {
      const supplierKey = String(supplier?.id || supplierName || "");
      return (
        movement.movementType === "Purchase" &&
        (String(movement.supplierRecordId || "") === supplierKey ||
          movement.supplierName === supplierName)
      );
    })
    .map((movement) => {
      const relatedAsset = assets.find(
        (asset) =>
          String(asset.id || asset.assetId) ===
            String(movement.assetRecordId || movement.assetId) ||
          String(asset.assetId || "") === String(movement.assetId || "")
      );

      return {
        ...movement,
        source: "asset-movement",
        purchaseDate: movement.date || movement.purchaseDate || "",
        invoiceNumber: movement.invoiceNumber || movement.billNumber || "",
        assetId: relatedAsset?.assetId || movement.assetId || "-",
        deviceName: relatedAsset?.deviceName || movement.deviceName || "-",
        category: relatedAsset?.category || movement.category || "-",
        brand: relatedAsset?.brand || movement.brand || "-",
        model: relatedAsset?.model || movement.model || "-",
        macAddress: relatedAsset?.macAddress || movement.macAddress || "-",
        serialNumber: relatedAsset?.serialNumber || movement.serialNumber || "-",
        totalPurchaseValue: Number(movement.totalAmount || 0),
        remainAmount: Number(movement.remainingAmount || 0),
        status: movement.paymentStatus || "-",
      };
    });

  const repairPurchases = assetMovements
    .filter((movement) => {
      const repairResult = movement.repairResult || {};
      const supplierKey = String(supplier?.id || supplierName || "");

      return (
        repairResult.supplierRecordId || repairResult.supplierName
      ) && (
        String(repairResult.supplierRecordId || "") === supplierKey ||
        repairResult.supplierName === supplierName
      );
    })
    .map((movement) => {
      const relatedAsset = assets.find(
        (asset) =>
          String(asset.id || asset.assetId) ===
            String(movement.assetRecordId || movement.assetId) ||
          String(asset.assetId || "") === String(movement.assetId || "")
      );
      const repairResult = movement.repairResult || {};
      const repairCost = Number(repairResult.repairCost || 0);
      const paidAmount = Number(repairResult.paidAmount || 0);

      return {
        ...movement,
        source: "asset-repair",
        purchaseDate: repairResult.repairDate || movement.date || "",
        invoiceNumber: movement.referenceNumber || "",
        assetId: relatedAsset?.assetId || movement.assetId || "-",
        deviceName: `Repair - ${relatedAsset?.deviceName || movement.deviceName || "-"}`,
        category: relatedAsset?.category || movement.category || "-",
        brand: relatedAsset?.brand || movement.brand || "-",
        model: relatedAsset?.model || movement.model || "-",
        macAddress: relatedAsset?.macAddress || movement.macAddress || "-",
        serialNumber: relatedAsset?.serialNumber || movement.serialNumber || "-",
        quantity: 1,
        totalPurchaseValue: repairCost,
        paidAmount,
        remainAmount: Math.max(repairCost - paidAmount, 0),
        status: repairCost - paidAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Unpaid",
      };
    });

  const legacyPurchases = supplierPurchases
    .filter(
      (purchase) =>
        Number(purchase.supplierIndex) === Number(supplierIndex) ||
        purchase.supplierName === supplierName
    )
    .map((purchase) => ({
      ...purchase,
      source: "legacy-supplier-purchase",
    }));

  const purchases = [...movementPurchases, ...repairPurchases, ...legacyPurchases];
  const filteredPurchases = purchases.filter(purchaseMatchesDateFilter);

  const supplierPaymentRecords = supplierPayments.filter(
    (payment) =>
      Number(payment.supplierIndex) === Number(supplierIndex) ||
      payment.supplierName === supplierName
  );

  const isBalanceRecord = (record) =>
    String(record.recordType || record.type || "").toLowerCase() === "balance";

  const balanceRecords = supplierPaymentRecords.filter(isBalanceRecord);
  const payments = supplierPaymentRecords.filter((record) => !isBalanceRecord(record));

  const totalPurchaseValue = filteredPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.totalPurchaseValue || 0),
    0
  );

  const totalQuantity = filteredPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.quantity || 0),
    0
  );
  const purchasedCategoryCount = new Set(
    filteredPurchases
      .map((purchase) => String(purchase.category || "").trim())
      .filter(Boolean)
  ).size;

  const purchasePaidTotal = filteredPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.paidAmount || 0),
    0
  );

  const supplierPaymentTotal = payments.reduce(
    (sum, payment) =>
      payment.direction === "supplier_pays_us"
        ? sum
        : sum + Number(payment.amount || 0),
    0
  );

  const supplierPaidUsTotal = payments.reduce(
    (sum, payment) =>
      payment.direction === "supplier_pays_us"
        ? sum + Number(payment.amount || 0)
        : sum,
    0
  );

  const openingWeOweSupplier = balanceRecords.reduce(
    (sum, balance) =>
      balance.balanceSide === "we_owe_supplier"
        ? sum + Number(balance.amount || 0)
        : sum,
    0
  );

  const openingSupplierOwesUs = balanceRecords.reduce(
    (sum, balance) =>
      balance.balanceSide === "supplier_owes_us"
        ? sum + Number(balance.amount || 0)
        : sum,
    0
  );

  const totalPaidToSupplier = purchasePaidTotal + supplierPaymentTotal;
  const supplierBalance =
    totalPurchaseValue +
    openingWeOweSupplier +
    supplierPaidUsTotal -
    totalPaidToSupplier -
    openingSupplierOwesUs;
  const weOweSupplier = supplierBalance > 0 ? supplierBalance : 0;
  const supplierOwesUs = supplierBalance < 0 ? Math.abs(supplierBalance) : 0;
  const averagePurchaseValue =
    filteredPurchases.length > 0 ? totalPurchaseValue / filteredPurchases.length : 0;
  const ledgerRows = [
    ...filteredPurchases.map((purchase) => ({
      id: `purchase-${purchase.source}-${purchase.id}`,
      type: "Purchase",
      date: purchase.purchaseDate || purchase.createdAt?.slice(0, 10) || "-",
      timeSource: purchase.createdAt || purchase.updatedAt || "",
      description: `${purchase.deviceName || "-"} / ${purchase.invoiceNumber || purchase.purchaseCode || "-"}`,
      debit: Number(purchase.totalPurchaseValue || 0),
      status: purchase.status || purchase.paymentStatus || "-",
      record: purchase,
      recordType: "purchase",
    })),
  ].sort((a, b) => {
  const getTimestamp = (row) => {
    const date = row.date && row.date !== "-" ? row.date : "";
    const timeSource = row.timeSource || "";

    if (date) {
      const timePart =
        timeSource && timeSource.includes("T")
          ? timeSource.split("T")[1]
          : "00:00:00";

      const timestamp = new Date(`${date}T${timePart}`).getTime();

      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
    }

    const fallbackTimestamp = new Date(timeSource).getTime();

    return Number.isNaN(fallbackTimestamp)
      ? 0
      : fallbackTimestamp;
  };

  return getTimestamp(b) - getTimestamp(a);
});

  const categoryOptions = [
  ...defaultCategories,
  ...customCategories
    .map((item) => item.name)
    .filter(Boolean)
    .filter((name) => !defaultCategories.includes(name)),
];

const togglePurchaseActionMenu = (event, purchaseId) => {
  const rect = event.currentTarget.getBoundingClientRect();

  setPurchaseActionPosition({
    top: rect.bottom + 8,
    left: rect.right - 160,
  });

  setOpenPurchaseAction(openPurchaseAction === purchaseId ? null : purchaseId);
};

const printSupplierStatement = () => {
  const printWindow = window.open("", "_blank", "width=1100,height=760");

  if (!printWindow) {
    notify("Unable to open print window. Please allow pop-ups.", "error");
    return;
  }

  const rows = ledgerRows
    .map(({ record: purchase }) => `
      <tr>
        <td>${escapeHtml(formatDateTime(purchase.purchaseDate, purchase.createdAt || purchase.updatedAt))}</td>
        <td>${escapeHtml(purchase.invoiceNumber || "-")}</td>
        <td>${escapeHtml(purchase.assetId || "-")}</td>
        <td><span class="category-pill">${escapeHtml(purchase.category || "-")}</span></td>
        <td>${escapeHtml(purchase.deviceName || "-")}</td>
        <td>${escapeHtml(purchase.quantity || "-")}</td>
        <td>${escapeHtml(purchase.status || "-")}</td>
      </tr>
    `)
    .join("");
  const dateRangeText = purchaseDateFilter.from || purchaseDateFilter.to
    ? `${purchaseDateFilter.from || "Start"} to ${purchaseDateFilter.to || "Today"}`
    : "All dates";
  const logoHtml = systemLogo
    ? `<img src="${escapeHtml(systemLogo)}" alt="System logo" />`
    : `<span>${escapeHtml(systemName.slice(0, 1))}</span>`;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Supplier Statement</title>
        <style>
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: Arial, sans-serif; color: #102033; padding: 28px; background: #f6f8fc; }
          .page { background: #ffffff; border: 1px solid #dbe5f3; border-radius: 22px; overflow: hidden; box-shadow: 0 14px 40px rgba(15, 23, 42, 0.10); }
          .hero { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 18px; padding: 24px 28px; color: #ffffff; background: linear-gradient(135deg, #0f766e, #2563eb 55%, #4f46e5); }
          .logo { width: 58px; height: 58px; border-radius: 16px; background: rgba(255,255,255,0.18); display: grid; place-items: center; overflow: hidden; font-size: 26px; font-weight: 900; }
          .logo img { width: 100%; height: 100%; object-fit: cover; }
          .hero h1 { margin: 0; font-size: 25px; }
          .hero p { margin: 6px 0 0; color: rgba(255,255,255,0.86); font-size: 13px; }
          .date-badge { background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.26); border-radius: 999px; padding: 9px 13px; font-size: 12px; font-weight: 700; white-space: nowrap; }
          .content { padding: 22px 28px 26px; }
          .supplier-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          .info-item { border: 1px solid #dbe5f3; border-radius: 14px; padding: 12px; background: #f8fafc; }
          .info-item span, .item span { display: block; color: #64748b; font-size: 11px; margin-bottom: 6px; }
          .info-item strong { font-size: 13px; color: #0f172a; }
          .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 18px; }
          .item { border: 1px solid #bfdbfe; border-radius: 18px; padding: 16px; background: linear-gradient(180deg, #eff6ff, #ffffff); }
          .item strong { display: block; font-size: 25px; color: #0f172a; }
          .item small { display: block; margin-top: 5px; color: #475569; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          th { background: #e0f2fe; color: #0f3f5f; }
          tr:nth-child(even) td { background: #f8fafc; }
          .category-pill { display: inline-block; padding: 4px 8px; border-radius: 999px; background: #dcfce7; color: #166534; font-weight: 800; }
          @media print { body { padding: 12px; background: #ffffff; } .page { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="page">
        <div class="hero">
          <div class="logo">${logoHtml}</div>
          <div>
            <h1>${escapeHtml(systemName)}</h1>
            <p>Supplier Full Information - ${escapeHtml(supplierName || "-")}</p>
          </div>
          <div class="date-badge">${escapeHtml(dateRangeText)}</div>
        </div>
        <div class="content">
        <div class="supplier-info">
          <div class="info-item"><span>Supplier</span><strong>${escapeHtml(supplierName || "-")}</strong></div>
          <div class="info-item"><span>Company</span><strong>${escapeHtml(supplier.companyName || "-")}</strong></div>
          <div class="info-item"><span>Contact Person</span><strong>${escapeHtml(supplier.contactPerson || "-")}</strong></div>
          <div class="info-item"><span>Phone</span><strong>${escapeHtml(supplier.phone || "-")}</strong></div>
        </div>
        <div class="summary">
          <div class="item"><span>Total Purchases</span><strong>${filteredPurchases.length}</strong><small>Purchase records from this supplier</small></div>
          <div class="item"><span>Category / Quantity</span><strong>${purchasedCategoryCount} categories</strong><small>${money(totalQuantity)} pieces purchased</small></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Purchase Date</th>
              <th>Invoice No</th>
              <th>Asset ID</th>
              <th>Category</th>
              <th>Device Name</th>
              <th>Qty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="7">No purchases recorded.</td></tr>`}</tbody>
        </table>
        </div>
        </div>
        <script>window.onload = function () { window.print(); };</script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

const printPurchaseDetail = (purchase) => {
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    notify("Unable to open print window. Please allow pop-ups.", "error");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Purchase Detail</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            padding: 28px;
          }

          .header {
            border-bottom: 2px solid #111827;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }

          h1 {
            margin: 0 0 6px;
            font-size: 24px;
          }

          p {
            margin: 0;
            color: #64748b;
            font-size: 13px;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .item {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
          }

          .item span {
            display: block;
            color: #64748b;
            font-size: 12px;
            margin-bottom: 5px;
          }

          .item strong {
            font-size: 14px;
          }

          .notes {
            margin-top: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
          }

          @media print {
            body {
              padding: 18px;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h1>Purchase Full Detail</h1>
          <p>Supplier: ${supplierName || "-"}</p>
        </div>

        <div class="grid">
          <div class="item"><span>Purchase Date</span><strong>${formatDateTime(purchase.purchaseDate, purchase.createdAt || purchase.updatedAt)}</strong></div>
          <div class="item"><span>Invoice No</span><strong>${purchase.invoiceNumber || "-"}</strong></div>
          <div class="item"><span>Asset ID</span><strong>${purchase.assetId || "-"}</strong></div>
          <div class="item"><span>Category</span><strong>${purchase.category || "-"}</strong></div>
          <div class="item"><span>Device Name</span><strong>${purchase.deviceName || "-"}</strong></div>
          <div class="item"><span>Brand</span><strong>${purchase.brand || "-"}</strong></div>
          <div class="item"><span>Model</span><strong>${purchase.model || "-"}</strong></div>
          <div class="item"><span>MAC Address</span><strong>${purchase.macAddress || "-"}</strong></div>
          <div class="item"><span>Serial Number</span><strong>${purchase.serialNumber || "-"}</strong></div>
          <div class="item"><span>Quantity</span><strong>${purchase.quantity || 1}</strong></div>
          <div class="item"><span>Unit Price</span><strong>${money(purchase.unitPrice)} AFN</strong></div>
          <div class="item"><span>Total Value</span><strong>${money(purchase.totalPurchaseValue)} AFN</strong></div>
          <div class="item"><span>Paid Amount</span><strong>${money(purchase.paidAmount)} AFN</strong></div>
          <div class="item"><span>Remain Amount</span><strong>${money(purchase.remainAmount)} AFN</strong></div>
          <div class="item"><span>Location</span><strong>${purchase.location || "-"}</strong></div>
          <div class="item"><span>Status</span><strong>${purchase.status || "-"}</strong></div>
        </div>

        <div class="notes">
          <span>Notes</span>
          <p>${purchase.notes || "No notes have been added for this purchase."}</p>
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

const handleCategoryChange = (event) => {
  const value = event.target.value;

  setPurchaseForm((previous) => ({
    ...previous,
    category: value,
  }));
};

const saveCustomCategory = async () => {
  const cleanCategory = newCategory.trim();

  if (!cleanCategory) {
    notify("Please enter a category name.", "error");
    return;
  }

  const alreadyExists = categoryOptions.some(
    (category) => category.toLowerCase() === cleanCategory.toLowerCase()
  );

  if (alreadyExists) {
    notify("This category already exists.", "error");
    return;
  }

  const saved = await setCustomCategories([
    ...customCategories,
    {
      id: Date.now(),
      name: cleanCategory,
      createdAt: new Date().toISOString(),
    },
  ]);

  if (!saved) return;

  setPurchaseForm((previous) => ({
    ...previous,
    category: cleanCategory,
  }));

  setNewCategory("");
  setCategoryMode("select");
  notify("Category saved successfully.");
};

const backToCategorySelect = () => {
  setNewCategory("");
  setCategoryMode("select");
};

  const recentPurchases = [...purchases]
    .sort((a, b) => String(b.purchaseDate || "").localeCompare(String(a.purchaseDate || "")));

  const generateNextAssetId = () => {
    const maxNumber = assets.reduce((max, asset) => {
      const match = String(asset.assetId || "").match(/^AST-(\d+)$/i);
      if (!match) return max;

      const number = Number(match[1] || 0);
      return number > max ? number : max;
    }, 0);

    return `AST-${String(maxNumber + 1).padStart(4, "0")}`;
  };

  const handleGenerateAssetId = () => {
    const nextAssetId = generateNextAssetId();

    setPurchaseForm((previous) => ({
      ...previous,
      assetId: nextAssetId,
    }));

    notify(`Asset ID generated: ${nextAssetId}`);
  };

  const handlePurchaseChange = (event) => {
    const { name, value } = event.target;

    setPurchaseForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetPurchaseForm = () => {
    setPurchaseForm(emptyPurchaseForm);
    setCategoryMode("select");
    setNewCategory("");
  };

const closePurchaseModal = () => {
  resetPurchaseForm();
  setEditPurchaseId(null);
  setShowPurchaseModal(false);
};

  const identityExists = (data) => {
    return assets.some((asset) => {
      const sameAssetId =
        data.assetId &&
        asset.assetId &&
        data.assetId.trim().toLowerCase() === asset.assetId.trim().toLowerCase();

      const sameMac =
        data.macAddress &&
        asset.macAddress &&
        data.macAddress.trim().toLowerCase() === asset.macAddress.trim().toLowerCase();

      const sameSerial =
        data.serialNumber &&
        asset.serialNumber &&
        data.serialNumber.trim().toLowerCase() === asset.serialNumber.trim().toLowerCase();

      return sameAssetId || sameMac || sameSerial;
    });
  };

const upsertPurchaseExpense = async (purchase, source = "supplier-purchase") => {
  const referenceId = purchase.id;
  const totalAmount = Number(
    purchase.totalPurchaseValue ?? purchase.totalAmount ?? 0
  );
  const paidAmount = Number(purchase.paidAmount || 0);
  const remainingAmount = Number(
    purchase.remainAmount ?? purchase.remainingAmount ?? Math.max(totalAmount - paidAmount, 0)
  );
  const date = purchase.purchaseDate || purchase.date || new Date().toISOString().slice(0, 10);
  const createdAt = purchase.createdAt || new Date().toISOString();

  if (paidAmount <= 0) {
    return removePurchaseExpense(source, referenceId);
  }

  const expense = {
    id: `${source}-expense-${referenceId}`,
    type: "expense",
    title: `Asset Purchase - ${purchase.deviceName || purchase.assetName || "Asset"}`,
    category: "Purchases",
    amount: paidAmount,
    date,
    description: [
      purchase.supplierName ? `Supplier: ${purchase.supplierName}` : "",
      purchase.invoiceNumber || purchase.billNumber
        ? `Bill: ${purchase.invoiceNumber || purchase.billNumber}`
        : "",
      `Quantity: ${purchase.quantity || 0}`,
      `Unit Price: ${money(purchase.unitPrice)} AFN`,
      `Paid: ${money(paidAmount)} AFN`,
      `Remaining: ${money(remainingAmount)} AFN`,
      purchase.notes || "",
    ]
      .filter(Boolean)
      .join(" | "),
    source,
    referenceId,
    assetId: purchase.assetId || "",
    supplierName: purchase.supplierName || "",
    createdAt,
    updatedAt: new Date().toISOString(),
  };

  return setTransactions((previousTransactions) => [
    ...previousTransactions.filter(
      (transaction) =>
        !(
          transaction.source === source &&
          String(transaction.referenceId || "") === String(referenceId)
        )
    ),
    expense,
  ]);
};

const removePurchaseExpense = async (source, referenceId) =>
  setTransactions((previousTransactions) =>
    previousTransactions.filter(
      (transaction) =>
        !(
          transaction.source === source &&
          String(transaction.referenceId || "") === String(referenceId)
        )
    )
  );

const savePurchase = async (event) => {
  event.preventDefault();

  const quantity = Number(purchaseForm.quantity || 1);
  const unitPrice = Number(purchaseForm.unitPrice || 0);
  const totalPurchaseValue = quantity * unitPrice;
  const paidAmount = Number(purchaseForm.paidAmount || 0);
  const remainAmount = Math.max(totalPurchaseValue - paidAmount, 0);

  const cleanPurchase = {
    id: editPurchaseId || Date.now(),
    supplierIndex,
    supplierName,
    purchaseDate: purchaseForm.purchaseDate,
    referenceNumber: purchaseForm.referenceNumber.trim() || generateNextPurchaseReference(),
    invoiceNumber: purchaseForm.invoiceNumber.trim(),
    assetId: purchaseForm.assetId.trim(),
    deviceName: purchaseForm.deviceName.trim(),
    category: purchaseForm.category.trim(),
    brand: purchaseForm.brand.trim(),
    model: purchaseForm.model.trim(),
    macAddress: purchaseForm.macAddress.trim(),
    serialNumber: purchaseForm.serialNumber.trim(),
    quantity,
    unitPrice,
    totalPurchaseValue,
    paidAmount,
    remainAmount,
    location: purchaseForm.location,
    status: purchaseForm.status,
    notes: purchaseForm.notes.trim(),
    createdAt:
      supplierPurchases.find((purchase) => purchase.id === editPurchaseId)?.createdAt ||
      new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!cleanPurchase.assetId && !cleanPurchase.macAddress && !cleanPurchase.serialNumber) {
    notify(
      "Please enter at least one unique identity: Asset ID, MAC Address, or Serial Number.",
      "error"
    );
    return;
  }

  const duplicateIdentity = assets.some((asset) => {
    if (editPurchaseId && asset.purchaseId === editPurchaseId) return false;

    const sameAssetId =
      cleanPurchase.assetId &&
      asset.assetId &&
      cleanPurchase.assetId.toLowerCase() === asset.assetId.toLowerCase();

    const sameMac =
      cleanPurchase.macAddress &&
      asset.macAddress &&
      cleanPurchase.macAddress.toLowerCase() === asset.macAddress.toLowerCase();

    const sameSerial =
      cleanPurchase.serialNumber &&
      asset.serialNumber &&
      cleanPurchase.serialNumber.toLowerCase() === asset.serialNumber.toLowerCase();

    return sameAssetId || sameMac || sameSerial;
  });

  if (duplicateIdentity) {
    notify("Asset ID, MAC Address, or Serial Number already exists.", "error");
    return;
  }

  let nextPurchases;

  if (editPurchaseId) {
    nextPurchases = supplierPurchases.map((purchase) =>
      purchase.id === editPurchaseId ? cleanPurchase : purchase
    );
  } else {
    nextPurchases = [...supplierPurchases, cleanPurchase];
  }

  const existingAsset = assets.find((asset) => asset.purchaseId === cleanPurchase.id);
  let nextAssets;

  if (existingAsset) {
    nextAssets = assets.map((asset) =>
      asset.purchaseId === cleanPurchase.id
        ? buildAssetFromPurchase(cleanPurchase, asset)
        : asset
    );
  } else {
    nextAssets = [...assets, buildAssetFromPurchase(cleanPurchase)];
  }

  const purchasesSaved = await setSupplierPurchases(nextPurchases);
  const assetsSaved = await setAssets(nextAssets);

  if (purchasesSaved && assetsSaved) {
    const financeSaved = await upsertPurchaseExpense(cleanPurchase);

    if (!financeSaved) {
      notify("Purchase saved, but its expense could not be linked to Financial.", "error");
    }

    notify(
      editPurchaseId
        ? "Purchase updated successfully."
        : "Purchase saved and asset added to inventory successfully."
    );

    setEditPurchaseId(null);
    closePurchaseModal();
  }
};


  const openCreatePurchaseModal = () => {
  setEditPurchaseId(null);
  setPurchaseForm({
    ...emptyPurchaseForm,
    assetId: generateNextAssetId(),
    referenceNumber: generateNextPurchaseReference(),
  });
  setCategoryMode("select");
  setNewCategory("");
  setShowPurchaseModal(true);
};

const openEditPurchaseModal = (purchase) => {
  if (purchase.source === "asset-movement") {
    setEditLedgerPurchase(purchase);
    setEditLedgerPurchaseForm({
      purchaseDate: purchase.purchaseDate || "",
      invoiceNumber: purchase.invoiceNumber || "",
      quantity: String(purchase.quantity || 1),
      unitPrice: String(purchase.unitPrice || ""),
      paidAmount: String(purchase.paidAmount || ""),
      notes: purchase.notes || "",
    });
    return;
  }

  setEditPurchaseId(purchase.id);

  setPurchaseForm({
    purchaseDate: purchase.purchaseDate || "",
    referenceNumber: purchase.referenceNumber || purchase.purchaseCode || "",
    invoiceNumber: purchase.invoiceNumber || "",
    assetId: purchase.assetId || "",
    deviceName: purchase.deviceName || "",
    category: purchase.category || "",
    brand: purchase.brand || "",
    model: purchase.model || "",
    macAddress: purchase.macAddress || "",
    serialNumber: purchase.serialNumber || "",
    quantity: String(purchase.quantity || 1),
    unitPrice: String(purchase.unitPrice || ""),
    paidAmount: String(purchase.paidAmount || ""),
    remainAmount: String(purchase.remainAmount || ""),
    location: purchase.location || "Main Stock",
    status: purchase.status || "In Stock",
    notes: purchase.notes || "",
  });

  setCategoryMode("select");
  setNewCategory("");
  setShowPurchaseModal(true);
};

const handleEditLedgerPurchaseChange = (event) => {
  const { name, value } = event.target;
  setEditLedgerPurchaseForm((previous) => ({
    ...previous,
    [name]: value,
  }));
};

const saveEditedLedgerPurchase = async (event) => {
  event.preventDefault();

  if (!editLedgerPurchase) return;

  const quantity = Number(editLedgerPurchaseForm.quantity || 0);
  const unitPrice = Number(editLedgerPurchaseForm.unitPrice || 0);
  const paidAmount = Number(editLedgerPurchaseForm.paidAmount || 0);
  const totalAmount = quantity * unitPrice;
  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  if (quantity <= 0 || unitPrice < 0 || paidAmount < 0) {
    notify("Quantity, unit price, and paid amount must be valid.", "error");
    return;
  }

  if (paidAmount > totalAmount) {
    notify("Paid amount cannot be greater than total amount.", "error");
    return;
  }

  const updatedMovement = {
    ...editLedgerPurchase,
    date: editLedgerPurchaseForm.purchaseDate,
    purchaseDate: editLedgerPurchaseForm.purchaseDate,
    invoiceNumber: editLedgerPurchaseForm.invoiceNumber.trim(),
    billNumber: editLedgerPurchaseForm.invoiceNumber.trim(),
    quantity,
    unitPrice,
    totalAmount,
    totalPurchaseValue: totalAmount,
    paidAmount,
    remainingAmount,
    remainAmount: remainingAmount,
    paymentStatus:
      remainingAmount === 0
        ? "Paid"
        : paidAmount > 0
          ? "Partial"
          : "Unpaid",
    notes: editLedgerPurchaseForm.notes.trim(),
    updatedAt: new Date().toISOString(),
  };

  const saved = await setAssetMovements(
    assetMovements.map((movement) =>
      movement.id === editLedgerPurchase.id
        ? updatedMovement
        : movement
    )
  );

  if (!saved) return;

  const financeSaved = await upsertPurchaseExpense(updatedMovement, "asset-purchase");

  if (!financeSaved) {
    notify("Purchase updated, but its expense could not be updated in Financial.", "error");
  }

  notify("Purchase record updated successfully.");
  setEditLedgerPurchase(null);
  setEditLedgerPurchaseForm({});
};

const buildAssetFromPurchase = (purchase, existingAsset = {}) => ({
  ...existingAsset,
  assetId: purchase.assetId,
  deviceName: purchase.deviceName,
  category: purchase.category,
  brand: purchase.brand,
  model: purchase.model,
  macAddress: purchase.macAddress,
  serialNumber: purchase.serialNumber,
  quantity: purchase.quantity,
  unitPrice: purchase.unitPrice,
  totalPurchaseValue: purchase.totalPurchaseValue,
  paidAmount: purchase.paidAmount,
  remainAmount: purchase.remainAmount,
  purchaseDate: purchase.purchaseDate,
  supplierName: purchase.supplierName,
  location: purchase.location,
  status: purchase.status,
  notes: purchase.notes,
  source: "supplier-purchase",
  purchaseId: purchase.id,
  createdAt: existingAsset.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const openDeletePurchaseModal = (purchaseId) => {
  setDeletePurchaseId(purchaseId);
};

const cancelDeletePurchase = () => {
  setDeletePurchaseId(null);
};

const confirmDeletePurchase = async () => {
  if (!deletePurchaseId) return;

  const movementPurchase = purchases.find(
    (purchase) =>
      purchase.source === "asset-movement" &&
      String(purchase.id) === String(deletePurchaseId)
  );

  if (movementPurchase) {
    const saved = await setAssetMovements(
      assetMovements.filter((movement) => movement.id !== deletePurchaseId)
    );

    if (saved) {
      await removePurchaseExpense("asset-purchase", deletePurchaseId);
      notify("Purchase record deleted successfully.");
      setDeletePurchaseId(null);
    }

    return;
  }

  const nextPurchases = supplierPurchases.filter(
    (purchase) => purchase.id !== deletePurchaseId
  );

  const nextAssets = assets.filter(
    (asset) => asset.purchaseId !== deletePurchaseId
  );

  const purchasesSaved = await setSupplierPurchases(nextPurchases);
  const assetsSaved = await setAssets(nextAssets);

  if (purchasesSaved && assetsSaved) {
    await removePurchaseExpense("supplier-purchase", deletePurchaseId);
    notify("Purchase deleted successfully.");
    setDeletePurchaseId(null);
  }
};

  if (!supplier) {
    return (
      <div className="supplier-details-page">
        <div className="supplier-not-found">
          <h1>Supplier Not Found</h1>
          <p>The selected supplier record does not exist.</p>
          <button type="button" onClick={() => navigate("/suppliers")}>
            Back to Suppliers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="supplier-details-page">
      <div className="supplier-details-header">
        <div>
          <Link className="supplier-back-link" to="/suppliers">
            ← Back to Suppliers
          </Link>
          <h1>{supplier.supplierName}</h1>
          <p>
            Complete supplier dashboard, purchase history, and inventory contribution.
          </p>
        </div>

        <div className="supplier-header-actions">
          <button
            type="button"
            className="supplier-secondary-btn"
            onClick={() => printSupplierStatement()}
          >
            <PrintIcon />
            Print / PDF
          </button>

          <button
            type="button"
            className="supplier-secondary-btn"
            onClick={() => setShowSupplierInfo((value) => !value)}
          >
            {showSupplierInfo ? "Hide Supplier Info" : "Show Supplier Info"}
          </button>
        </div>
      </div>

      {showSupplierInfo && (
        <>
          <div className="supplier-profile-card">
            <div>
              <span>Company</span>
              <strong>{supplier.companyName || "-"}</strong>
            </div>

            <div>
              <span>Contact Person</span>
              <strong>{supplier.contactPerson || "-"}</strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>{supplier.phone || "-"}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{supplier.email || "-"}</strong>
            </div>
          </div>
        </>
      )}

      <div className="supplier-dashboard-stats">
        <div className="supplier-dashboard-card">
          <span>Total Purchases</span>
          <strong>{filteredPurchases.length}</strong>
          <p>Purchase records from this supplier</p>
        </div>


        <div className="supplier-dashboard-card">
          <span>Total Quantity</span>
          <strong>{purchasedCategoryCount} categories</strong>
          <p>{money(totalQuantity)} pieces purchased</p>
        </div>

      </div>

      <div className="supplier-purchase-table-card">
        <div className="supplier-purchase-table-header">
          <div>
            <h3>Recent Purchase History</h3>
            <p>Purchases recorded for this supplier</p>
          </div>

          <div className="supplier-date-filters">
            <label>
              <span>From Date</span>
              <input
                type="date"
                value={purchaseDateFilter.from}
                onChange={(event) =>
                  setPurchaseDateFilter((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>To Date</span>
              <input
                type="date"
                value={purchaseDateFilter.to}
                onChange={(event) =>
                  setPurchaseDateFilter((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
              />
            </label>

            <button
              type="button"
              onClick={() => setPurchaseDateFilter({ from: "", to: "" })}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="supplier-purchase-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Purchase Date</th>
                <th>Type</th>
                <th>Direction</th>
                <th>Invoice No</th>
                <th>Asset ID</th>
                <th>Category</th>
                <th>Device Name</th>
                <th>Qty</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {ledgerRows.map((row) => {
                const purchase = row.record;

                return (
                <tr key={row.id}>
                  <td>{formatDateTime(row.date, row.timeSource)}</td>
                  <td>
                    <span
                      className={
                        "supplier-ledger-type purchase"
                      }
                    >
                      {row.type}
                    </span>
                  </td>
                  <td>{row.direction || "-"}</td>
                  <td>{purchase?.invoiceNumber || "-"}</td>
                  <td>{purchase?.assetId || "-"}</td>
                  <td>{purchase?.category || "-"}</td>
                  <td title={purchase?.deviceName || "-"}>
                    {purchase?.deviceName || "-"}
                  </td>
                  <td>{purchase?.quantity || "-"}</td>
                  <td>{purchase ? `${money(purchase.totalPurchaseValue)} AFN` : "-"}</td>
                  <td>{row.status || "-"}</td>
                  <td>
  <div className="supplier-purchase-action-cell">
  <button
    type="button"
    className="supplier-purchase-action-btn"
    onClick={(event) => togglePurchaseActionMenu(event, row.id)}
  >
    ⋮
  </button>

  {openPurchaseAction === row.id && (
    <div
      className="supplier-purchase-action-menu"
      style={{
        top: `${purchaseActionPosition.top}px`,
        left: `${purchaseActionPosition.left}px`,
      }}
    >
      <>
          <button
            type="button"
            onClick={() => {
              setDetailPurchase(purchase);
              setOpenPurchaseAction(null);
            }}
          >
            <InfoIcon />
            <span>Full Detail</span>
          </button>

          <button
            type="button"
            onClick={() => {
              openEditPurchaseModal(purchase);
              setOpenPurchaseAction(null);
            }}
          >
            <EditIcon />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              printPurchaseDetail(purchase);
              setOpenPurchaseAction(null);
            }}
          >
            <PrintIcon />
            <span>Receipt</span>
          </button>

          <button
            type="button"
            className="danger-action"
            onClick={() => {
              openDeletePurchaseModal(purchase.id);
              setOpenPurchaseAction(null);
            }}
          >
            <TrashIcon />
            <span>Delete</span>
          </button>
        </>
    </div>
  )}
</div>
</td>
                </tr>
              );
              })}

              {ledgerRows.length === 0 && (
                <tr>
                  <td colSpan="11" className="supplier-empty-message">
                    No purchase has been recorded for this supplier yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {false && showPurchaseModal && (
        <div className="supplier-purchase-modal-backdrop">
          <div
            className="supplier-purchase-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="supplier-purchase-modal-header">
              <div>
                <h3>{editPurchaseId ? "Edit Purchase" : "New Purchase"}</h3>
                <p>Record a purchase from {supplier.supplierName}.</p>
              </div>

              <button type="button" onClick={closePurchaseModal}>
                ×
              </button>
            </div>

            <form onSubmit={savePurchase}>
              <div className="supplier-purchase-form-grid">
                <div className="supplier-form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={purchaseForm.purchaseDate}
                    onChange={handlePurchaseChange}
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Reference Number</label>
                  <input
                    name="referenceNumber"
                    value={purchaseForm.referenceNumber}
                    onChange={handlePurchaseChange}
                    placeholder="Example: REF-0001"
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Invoice Number</label>
                  <input
                    name="invoiceNumber"
                    value={purchaseForm.invoiceNumber}
                    onChange={handlePurchaseChange}
                    placeholder="Example: INV-1001"
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Asset ID</label>
                  <div className="supplier-asset-id-field">
                    <input
                      name="assetId"
                      value={purchaseForm.assetId}
                      onChange={handlePurchaseChange}
                      placeholder="Example: AST-0001"
                    />

                    <button type="button" onClick={handleGenerateAssetId}>
                      Generate
                    </button>
                  </div>
                </div>

                <div className="supplier-form-group">
                  <label>Device Name</label>
                  <input
                    name="deviceName"
                    value={purchaseForm.deviceName}
                    onChange={handlePurchaseChange}
                    placeholder="Example: MikroTik Router"
                  />
                </div>

                <div className="supplier-form-group">
                  <div className="supplier-label-row">
                    <label>Category</label>

                    {categoryMode === "select" && (
                      <button
                        type="button"
                        className="supplier-category-plus"
                        onClick={() => {
                          setCategoryMode("custom");
                          setNewCategory("");
                        }}
                        title="Add custom category"
                      >
                        +
                      </button>
                    )}
                  </div>

                  {categoryMode === "select" ? (
                    <select
                      name="category"
                      value={purchaseForm.category}
                      onChange={handleCategoryChange}
                    >
                      <option value="">Select Category</option>

                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="supplier-custom-category">
                      <input
                        value={newCategory}
                        onChange={(event) => setNewCategory(event.target.value)}
                        placeholder="Enter new category"
                        autoFocus
                      />

                      <button
                        type="button"
                        className="supplier-category-save"
                        onClick={saveCustomCategory}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        className="supplier-category-back"
                        onClick={backToCategorySelect}
                      >
                        Back
                      </button>
                    </div>
                  )}
                </div>
                <div className="supplier-form-group">
                  <label>Brand</label>
                  <input
                    name="brand"
                    value={purchaseForm.brand}
                    onChange={handlePurchaseChange}
                    placeholder="Example: MikroTik"
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Model</label>
                  <input
                    name="model"
                    value={purchaseForm.model}
                    onChange={handlePurchaseChange}
                    placeholder="Example: RB750Gr3"
                  />
                </div>

                <div className="supplier-form-group">
                  <label>MAC Address</label>
                  <input
                    name="macAddress"
                    value={purchaseForm.macAddress}
                    onChange={handlePurchaseChange}
                    placeholder="Example: AA:BB:CC:DD:EE:FF"
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Serial Number</label>
                  <input
                    name="serialNumber"
                    value={purchaseForm.serialNumber}
                    onChange={handlePurchaseChange}
                    placeholder="Example: SN-123456"
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    name="quantity"
                    value={purchaseForm.quantity}
                    onChange={handlePurchaseChange}
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    name="unitPrice"
                    value={purchaseForm.unitPrice}
                    onChange={handlePurchaseChange}
                    placeholder="Example: 2500"
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Total Purchase Value</label>
                  <input
                    value={`${money(Number(purchaseForm.quantity || 0) * Number(purchaseForm.unitPrice || 0))} AFN`}
                    readOnly
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    name="paidAmount"
                    value={purchaseForm.paidAmount}
                    onChange={handlePurchaseChange}
                    placeholder="Example: 1000"
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Remain Amount</label>
                  <input
                    value={`${money(
                      Math.max(
                        Number(purchaseForm.quantity || 0) * Number(purchaseForm.unitPrice || 0) -
                          Number(purchaseForm.paidAmount || 0),
                        0
                      )
                    )} AFN`}
                    readOnly
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Location</label>
                  <select
                    name="location"
                    value={purchaseForm.location}
                    onChange={handlePurchaseChange}
                  >
                    <option value="Main Stock">Main Stock</option>
                    <option value="Tower">Tower</option>
                    <option value="Customer">Customer</option>
                    <option value="Repair">Repair</option>
                    <option value="Returned Stock">Returned Stock</option>
                  </select>
                </div>

                <div className="supplier-form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={purchaseForm.status}
                    onChange={handlePurchaseChange}
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Issued">Issued</option>
                    <option value="Installed">Installed</option>
                    <option value="Returned">Returned</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div className="supplier-form-group supplier-form-full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={purchaseForm.notes}
                    onChange={handlePurchaseChange}
                    placeholder="Additional purchase notes..."
                  />
                </div>
              </div>

              <div className="supplier-purchase-modal-actions">
                <button type="button" className="supplier-cancel-btn" onClick={closePurchaseModal}>
                  Cancel
                </button>

                <button type="submit" className="supplier-save-btn">
                  {editPurchaseId ? "Save Changes" : "Save Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editLedgerPurchase && (
        <div className="supplier-purchase-modal-backdrop">
          <div
            className="supplier-purchase-modal supplier-payment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="supplier-purchase-modal-header">
              <div>
                <h3>Edit Purchase Record</h3>
                <p>Update the purchase values recorded from Asset Inventory.</p>
              </div>

              <button type="button" onClick={() => setEditLedgerPurchase(null)}>
                ×
              </button>
            </div>

            <form onSubmit={saveEditedLedgerPurchase}>
              <div className="supplier-purchase-form-grid">
                <div className="supplier-form-group">
                  <label>Purchase Date</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={editLedgerPurchaseForm.purchaseDate || ""}
                    onChange={handleEditLedgerPurchaseChange}
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Invoice Number</label>
                  <input
                    name="invoiceNumber"
                    value={editLedgerPurchaseForm.invoiceNumber || ""}
                    onChange={handleEditLedgerPurchaseChange}
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    name="quantity"
                    value={editLedgerPurchaseForm.quantity || ""}
                    onChange={handleEditLedgerPurchaseChange}
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    name="unitPrice"
                    value={editLedgerPurchaseForm.unitPrice || ""}
                    onChange={handleEditLedgerPurchaseChange}
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    name="paidAmount"
                    value={editLedgerPurchaseForm.paidAmount || ""}
                    onChange={handleEditLedgerPurchaseChange}
                  />
                </div>

                <div className="supplier-form-group">
                  <label>Remaining Amount</label>
                  <input
                    value={`${money(
                      Math.max(
                        Number(editLedgerPurchaseForm.quantity || 0) *
                          Number(editLedgerPurchaseForm.unitPrice || 0) -
                          Number(editLedgerPurchaseForm.paidAmount || 0),
                        0
                      )
                    )} AFN`}
                    readOnly
                  />
                </div>

                <div className="supplier-form-group supplier-form-full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={editLedgerPurchaseForm.notes || ""}
                    onChange={handleEditLedgerPurchaseChange}
                  />
                </div>
              </div>

              <div className="supplier-purchase-modal-actions">
                <button
                  type="button"
                  className="supplier-cancel-btn"
                  onClick={() => setEditLedgerPurchase(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="supplier-save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {detailPurchase && (
  <div className="supplier-detail-modal-backdrop" onClick={() => setDetailPurchase(null)}>
    <div
      className="supplier-detail-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="supplier-detail-modal-header">
        <div>
          <h3>Purchase Full Detail</h3>
          <p>Complete purchase and inventory information.</p>
        </div>

        <button type="button" onClick={() => setDetailPurchase(null)}>
          ×
        </button>
      </div>

      <div className="supplier-detail-grid">
        <div>
          <span>Purchase Date</span>
          <strong>
            {formatDateTime(
              detailPurchase.purchaseDate,
              detailPurchase.createdAt || detailPurchase.updatedAt
            )}
          </strong>
        </div>
        <div><span>Invoice No</span><strong>{detailPurchase.invoiceNumber || "-"}</strong></div>
        <div><span>Asset ID</span><strong>{detailPurchase.assetId || "-"}</strong></div>
        <div><span>Category</span><strong>{detailPurchase.category || "-"}</strong></div>
        <div><span>Device Name</span><strong>{detailPurchase.deviceName || "-"}</strong></div>
        <div><span>Brand</span><strong>{detailPurchase.brand || "-"}</strong></div>
        <div><span>Model</span><strong>{detailPurchase.model || "-"}</strong></div>
        <div><span>MAC Address</span><strong>{detailPurchase.macAddress || "-"}</strong></div>
        <div><span>Serial Number</span><strong>{detailPurchase.serialNumber || "-"}</strong></div>
        <div><span>Quantity</span><strong>{detailPurchase.quantity || 1}</strong></div>
        <div><span>Unit Price</span><strong>{money(detailPurchase.unitPrice)} AFN</strong></div>
        <div><span>Total Value</span><strong>{money(detailPurchase.totalPurchaseValue)} AFN</strong></div>
        <div><span>Paid Amount</span><strong>{money(detailPurchase.paidAmount)} AFN</strong></div>
        <div><span>Remain Amount</span><strong>{money(detailPurchase.remainAmount)} AFN</strong></div>
        <div><span>Location</span><strong>{detailPurchase.location || "-"}</strong></div>
        <div><span>Status</span><strong>{detailPurchase.status || "-"}</strong></div>
      </div>

      <div className="supplier-detail-notes">
        <span>Notes</span>
        <p>{detailPurchase.notes || "No notes have been added for this purchase."}</p>
      </div>

      <div className="supplier-detail-actions">
  <button
    type="button"
    className="supplier-print-btn"
    onClick={() => printPurchaseDetail(detailPurchase)}
  >
    <PrintIcon />
    <span>Print</span>
  </button>

  <button type="button" onClick={() => setDetailPurchase(null)}>
    Close
  </button>
</div>
    </div>
  </div>
)}

{deletePurchaseId && (
  <div className="supplier-delete-backdrop" onClick={cancelDeletePurchase}>
    <div
      className="supplier-delete-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <h3>Delete Purchase</h3>
      <p>
        Are you sure you want to delete this purchase? The related asset record
        will also be removed from inventory.
      </p>

      <div className="supplier-delete-actions">
        <button type="button" className="supplier-delete-cancel" onClick={cancelDeletePurchase}>
          Cancel
        </button>

        <button type="button" className="supplier-delete-confirm" onClick={confirmDeletePurchase}>
          Delete
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

export default SupplierDetails;
