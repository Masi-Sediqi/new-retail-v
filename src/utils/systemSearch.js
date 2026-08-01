const normalize = (value) => String(value || "").toLowerCase().trim();
const compact = (value) => normalize(value).replace(/[^a-z0-9]/g, "");

export const money = (value) => Number(value || 0).toLocaleString("en-US");

export const includesQuery = (value, query) => {
  const text = normalize(value);
  const cleanText = compact(value);
  const cleanQuery = compact(query);
  return text.includes(normalize(query)) || (cleanQuery && cleanText.includes(cleanQuery));
};

export const flattenSearchText = (value, depth = 0) => {
  if (value == null || depth > 4) return "";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  if (Array.isArray(value)) return value.map((item) => flattenSearchText(item, depth + 1)).join(" ");
  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => flattenSearchText(item, depth + 1))
      .join(" ");
  }
  return "";
};

export const recordMatchesQuery = (record, query, extraValues = []) =>
  includesQuery([flattenSearchText(record), ...extraValues].join(" "), query);

const safeDate = (record) =>
  record.date ||
  record.createdAt ||
  record.createdDate ||
  record.transferDate ||
  record.issueDate ||
  record.purchaseDate ||
  record.paymentDate ||
  record.registrationDate ||
  "-";

const assetTitle = (record) =>
  [record.category, record.assetId || record.deviceId, record.deviceName || record.assetName || record.name]
    .filter(Boolean)
    .join(" - ") || "System record";

const row = ({ type, title, subtitle, path, record, details = [] }) => ({
  type,
  key: `${type}-${record?.id || record?.assetId || record?.customerId || record?.transferId || record?.referenceNumber || record?.createdAt || title || flattenSearchText(record).slice(0, 40)}`,
  title: title || assetTitle(record),
  subtitle: subtitle || record.status || record.type || "System record",
  path,
  record,
  details: [
    `Date: ${safeDate(record)}`,
    `Category: ${record.category || "-"}`,
    `Issued from: ${record.sourceLocation || record.source || record.from || record.fromLocation || "-"}`,
    `Issued to: ${record.destinationLocation || record.destination || record.to || record.toLocation || "-"}`,
    `Status: ${record.newStatus || record.status || record.issueStatus || record.approvalStatus || "-"}`,
    `Deposit: ${money(record.depositAmount || record.depositReceivedAmount || 0)} ${record.depositCurrency || "AFN"}`,
    `Withdraw: ${money(record.refundAmount || record.withdrawAmount || record.depositRefundAmount || 0)} ${record.refundCurrency || record.depositCurrency || "AFN"}`,
    ...details,
  ],
});

export function buildSystemSearchResults(data, query, options = {}) {
  const keyword = String(query || "").trim();
  if (keyword.length < 2) return [];

  const {
    assets = [],
    customers = [],
    suppliers = [],
    supplierPurchases = [],
    towerAssets = [],
    deviceTransfers = [],
    assetMovements = [],
    towerAssetTransfers = [],
    deviceHistory = [],
    securityDeposits = [],
    customerDevices = [],
    customerPayments = [],
    transactions = [],
    packages = [],
    customerPackages = [],
    disconnections = [],
  } = data;

  const limit = options.limit || Infinity;
  const results = [];

  assets.filter((item) => recordMatchesQuery(item, keyword)).forEach((item) => {
    results.push(row({
      type: "Asset",
      title: `${item.assetId || "-"} - ${item.deviceName || item.name || "Asset"}`,
      subtitle: [item.macAddress, item.serialNumber, item.model].filter(Boolean).join(" / ") || "Asset record",
      path: `/assets/${item.id || item.assetId}/details`,
      record: item,
      details: [`Quantity: ${money(item.quantity || 0)} ${item.purchaseUsageUnit || item.purchaseUnit || item.unit || "Piece"}`],
    }));
  });

  customers.filter((item) => recordMatchesQuery(item, keyword)).forEach((item) => {
    results.push(row({
      type: "Customer",
      title: `${item.customerId || "-"} - ${item.customerName || item.fullName || item.name || "Customer"}`,
      subtitle: item.phone || item.contactNumber || item.address || "Customer record",
      path: `/customers/${item.id || item.customerId}`,
      record: item,
      details: [`Phone: ${item.phone || item.contactNumber || "-"}`],
    }));
  });

  towerAssets.filter((item) => recordMatchesQuery(item, keyword)).forEach((item) => {
    results.push(row({
      type: "Tower",
      title: item.towerName || "Tower",
      subtitle: item.towerLocation || "Tower record",
      path: `/tower-assets/${item.id}/details`,
      record: item,
      details: [`Responsible: ${item.responsiblePerson || item.installedBy || "-"}`],
    }));
  });

  suppliers.forEach((supplier, index) => {
    if (!recordMatchesQuery(supplier, keyword)) return;
    results.push(row({
      type: "Supplier",
      title: supplier.supplierName || supplier.companyName || "Supplier",
      subtitle: supplier.companyName || supplier.phone || "Supplier record",
      path: `/suppliers/${index}`,
      record: supplier,
      details: [`Phone: ${supplier.phone || "-"}`],
    }));
  });

  deviceTransfers.filter((item) => recordMatchesQuery(item, keyword)).forEach((item) => {
    results.push(row({
      type: "Transfer",
      title: `${item.transferId || item.referenceNumber || "Transfer"} - ${assetTitle(item)}`,
      subtitle: `${item.sourceLocation || item.sourceType || "-"} -> ${item.destinationLocation || item.destinationType || "-"}`,
      path: item.assetRecordId || item.assetId ? `/assets/${item.assetRecordId || item.assetId}/audit-trail` : "/device-transfer-management",
      record: item,
      details: [
        `Transfer type: ${item.transferType || "-"}`,
        `Quantity: ${money(item.quantity || 0)} ${item.unit || "Piece"}`,
      ],
    }));
  });

  supplierPurchases.filter((item) => recordMatchesQuery(item, keyword)).forEach((item) => {
    results.push(row({
      type: "Purchase",
      title: `${item.assetId || "-"} - ${item.deviceName || item.assetName || "Purchase"}`,
      subtitle: item.supplierName || item.supplier || "Supplier purchase",
      path: item.assetRecordId || item.assetId ? `/assets/${item.assetRecordId || item.assetId}/details` : "/suppliers",
      record: item,
      details: [`Invoice: ${item.invoiceNumber || "-"}`, `Quantity: ${money(item.quantity || 0)}`],
    }));
  });

  assetMovements.filter((item) => recordMatchesQuery(item, keyword)).forEach((item) => {
    results.push(row({
      type: "Movement",
      title: `${item.assetId || item.deviceId || "-"} - ${item.deviceName || item.assetName || item.movement || "Movement"}`,
      subtitle: item.movement || item.movementType || item.type || "Asset movement",
      path: `/assets/${item.assetRecordId || item.assetId || item.deviceId}/details`,
      record: item,
    }));
  });

  securityDeposits.filter((item) => recordMatchesQuery(item, keyword)).forEach((item) => {
    results.push(row({
      type: "Deposit",
      title: `${item.customerId || "-"} - ${item.customerName || item.customer || "Customer Deposit"}`,
      subtitle: `${money(item.depositAmount || item.amount || item.remainingDeposit || 0)} ${item.currency || item.depositCurrency || "AFN"}`,
      path: item.customerRecordId || item.customerId ? `/customers/${item.customerRecordId || item.customerId}/issue-device` : "/reports",
      record: item,
      details: [`Receipt: ${item.receiptNumber || "-"}`],
    }));
  });

  deviceHistory.filter((item) => recordMatchesQuery(item, keyword)).forEach((item) => {
    results.push(row({
      type: "History",
      title: `${item.transferId || "History"} - ${assetTitle(item)}`,
      subtitle: `${item.sourceLocation || "-"} -> ${item.destinationLocation || "-"}`,
      path: item.assetRecordId || item.assetId ? `/assets/${item.assetRecordId || item.assetId}/audit-trail` : "/device-transfer-management",
      record: item,
    }));
  });

  [
    { type: "Tower Transfer", path: "/tower-assets", rows: towerAssetTransfers },
    { type: "Customer Device", path: "/issued-devices", rows: customerDevices },
    { type: "Payment", path: "/reports", rows: customerPayments },
    { type: "Transaction", path: "/reports", rows: transactions },
    { type: "Package", path: "/packages", rows: packages },
    { type: "Customer Package", path: "/packages", rows: customerPackages },
    { type: "Reconnect / Suspend", path: "/customers", rows: disconnections },
  ].forEach((collection) => {
    collection.rows.filter((item) => recordMatchesQuery(item, keyword)).forEach((item) => {
      results.push(row({
        type: collection.type,
        title: item.title || item.name || item.customerName || item.deviceName || item.packageName || collection.type,
        subtitle: item.status || item.type || safeDate(item),
        path: collection.path,
        record: item,
        details: [`Amount: ${item.amount ? money(item.amount) : "-"}`],
      }));
    });
  });

  return results.slice(0, limit);
}
