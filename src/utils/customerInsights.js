import { getCurrentLocationRows } from "./dashboardInsights";

const clean = (value) => String(value || "").trim();
const keyOf = (value) => clean(value).toLowerCase();

export const sumCustomerRows = (rows = []) =>
  rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);

export const isInactiveCustomer = (customer = {}) =>
  /inactive|suspend|suspended|disconnect|disconnected|disabled/i.test(
    clean(customer.status)
  );

export const displayCustomerStatus = (status) =>
  /disconnect|disconnected|suspend|suspended/i.test(clean(status)) ? "Suspend" : status || "-";

const isApprovedTransfer = (transfer) =>
  !/rejected/i.test(clean(transfer?.approvalStatus || "Approved"));

const isSummaryTransfer = (transfer) =>
  transfer?.isSummaryRecord ||
  transfer?.summaryType ||
  /deposit|withdrawal/i.test(
    `${transfer?.transferType || ""} ${transfer?.ownershipType || ""} ${
      transfer?.assetLabel || transfer?.deviceName || ""
    }`
  );

const isRealTransfer = (transfer) =>
  isApprovedTransfer(transfer) &&
  !isSummaryTransfer(transfer) &&
  Number(transfer.quantity || 0) > 0;

const customerNameOf = (customer) =>
  customer.customerName ||
  customer.fullName ||
  customer.name ||
  `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
  "Unnamed Customer";

const customerKeys = (customer) =>
  [customer.id, customer.customerId, customer.customerName, customer.name]
    .filter(Boolean)
    .map(keyOf);

const transferCustomerKey = (transfer, side) =>
  keyOf(
    side === "source"
      ? transfer.sourceRecordId ||
          transfer.fromCustomerRecordId ||
          transfer.fromCustomerId ||
          transfer.sourceLocation ||
          transfer.fromCustomerName
      : transfer.destinationRecordId ||
          transfer.toCustomerRecordId ||
          transfer.toCustomerId ||
          transfer.destinationLocation ||
          transfer.toCustomerName
  );

const transferMatchesCustomer = (transfer, customer, side) => {
  const keys = customerKeys(customer);
  const recordKey = transferCustomerKey(transfer, side);
  const label =
    side === "source"
      ? transfer.sourceLocation || transfer.sourceName || transfer.fromCustomerName
      : transfer.destinationLocation || transfer.destinationName || transfer.toCustomerName;

  return keys.some((key) => recordKey === key || keyOf(label) === key || keyOf(label).includes(key));
};

const findAsset = (assets, transfer) => {
  const keys = [
    transfer.assetRecordId,
    transfer.assetId,
    transfer.unitRecordId,
    transfer.deviceName,
    transfer.model,
  ]
    .map(keyOf)
    .filter(Boolean);

  return (
    assets.find((asset) =>
      [asset.id, asset.assetId, asset.deviceName, asset.model]
        .map(keyOf)
        .some((key) => keys.includes(key))
    ) || {}
  );
};

const transferDate = (transfer) =>
  transfer.transferDate ||
  transfer.issueDate ||
  transfer.date ||
  transfer.createdAt ||
  transfer.updatedAt ||
  "";

const normalizeTransferRow = (transfer, assets, placeType) => {
  const asset = findAsset(assets, transfer);
  const sourceName =
    transfer.sourceLocation ||
    transfer.sourceName ||
    transfer.fromCustomerName ||
    transfer.fromType ||
    transfer.sourceType ||
    "Main Stock";
  const destinationName =
    transfer.destinationLocation ||
    transfer.destinationName ||
    transfer.toCustomerName ||
    transfer.destinationType ||
    "-";

  return {
    key: `${placeType}-${transfer.id || transfer.transferId || transfer.referenceNumber || Math.random()}`,
    transfer,
    asset,
    assetId: transfer.assetId || asset.assetId || "-",
    category: transfer.category || asset.category || "Uncategorized",
    deviceName: transfer.deviceName || transfer.assetName || asset.deviceName || "-",
    model: transfer.model || asset.model || "-",
    quantity: Number(transfer.quantity || 0),
    unit: transfer.unit || asset.purchaseUsageUnit || asset.purchaseUnit || "Piece",
    locationName: placeType === "Outgoing" ? sourceName : destinationName,
    sourceName,
    destinationName,
    status: transfer.newStatus || transfer.issueStatus || transfer.status || transfer.transferStatus || "-",
    date: transferDate(transfer),
    placeType,
    macAddress: transfer.macAddress || asset.macAddress || "",
    serialNumber: transfer.serialNumber || asset.serialNumber || "",
  };
};

const groupRowsByCategory = (rows) => {
  const grouped = new Map();

  rows.forEach((row) => {
    const category = row.category || "Uncategorized";
    if (!grouped.has(category)) {
      grouped.set(category, { category, name: category, rows: [], total: 0 });
    }

    const group = grouped.get(category);
    group.rows.push(row);
    group.total += Number(row.quantity || 0);
  });

  return Array.from(grouped.values()).sort((a, b) =>
    a.category.localeCompare(b.category)
  );
};

export function buildCustomerInsights({ customers = [], assets = [], deviceTransfers = [] }) {
  const customerRows = getCurrentLocationRows(deviceTransfers, assets, "Customer").map((row) => ({
    ...row,
    placeType: "Customer",
    sourceName: row.transfer?.sourceLocation || row.transfer?.sourceName || row.transfer?.sourceType || "Main Stock",
    destinationName:
      row.transfer?.destinationLocation ||
      row.transfer?.destinationName ||
      row.locationName ||
      "Customer",
  }));

  const activeCustomers = customers.filter((customer) => !isInactiveCustomer(customer));
  const inactiveCustomers = customers.filter(isInactiveCustomer);

  const groupRowsByCustomer = (records, type) =>
    records.map((customer) => {
      const keys = customerKeys(customer);
      const rows = customerRows.filter((row) =>
        keys.some((key) => keyOf(row.locationKey) === key || keyOf(row.locationName).includes(key))
      );

      return {
        id: customer.id || customer.customerId || customerNameOf(customer),
        name: customerNameOf(customer),
        type,
        record: customer,
        rows,
        quantity: sumCustomerRows(rows),
      };
    });

  const customerGroups = [
    ...groupRowsByCustomer(activeCustomers, "Active"),
    ...groupRowsByCustomer(inactiveCustomers, "Suspend"),
  ];

  const realTransfers = deviceTransfers.filter(isRealTransfer);
  const incomingRows = realTransfers
    .filter((transfer) => keyOf(transfer.destinationType) === "customer" || transfer.toCustomerId || transfer.toCustomerRecordId)
    .map((transfer) => normalizeTransferRow(transfer, assets, "Incoming"));
  const outgoingRows = realTransfers
    .filter((transfer) => keyOf(transfer.sourceType) === "customer" || transfer.fromCustomerId || transfer.fromCustomerRecordId)
    .map((transfer) => normalizeTransferRow(transfer, assets, "Outgoing"));

  return {
    customerRows,
    categoryGroups: groupRowsByCategory(customerRows),
    customerGroups,
    activeCustomerGroups: customerGroups.filter((group) => group.type === "Active"),
    inactiveCustomerGroups: customerGroups.filter((group) => group.type === "Suspend"),
    incomingRows,
    outgoingRows,
  };
}
