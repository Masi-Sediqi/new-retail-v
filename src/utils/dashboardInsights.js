const clean = (value) => String(value || "").trim();
const keyOf = (value) => clean(value).toLowerCase();

export const dashboardInsightLabels = {
  "total-assets": "Total Assets",
  "main-stock-assets": "Main Stock Assets",
  "assets-at-towers": "Assets at Towers",
  "assets-with-customers": "Assets with Customers",
  "wasted-assets": "Wasted Assets",
  "under-repair-assets": "Under Repair Assets",
  "active-customers": "Active Customers",
  "inactive-customers": "Inactive / Suspend Customers",
  "pending-collection": "Pending Collection",
  "transfers-by-date": "Transfers by Date",
};

export const dashboardInsightDescriptions = {
  "total-assets": "Registered asset definitions",
  "main-stock-assets": "Assets currently available in Main Stock",
  "assets-at-towers": "Current tower-held asset records",
  "assets-with-customers": "Current customer-held asset records",
  "wasted-assets": "Assets marked wasted, damaged, or lost",
  "under-repair-assets": "Assets currently in repair",
  "active-customers": "Customers currently active",
  "inactive-customers": "Inactive or suspend customers",
  "pending-collection": "Inactive customer assets not collected",
  "transfers-by-date": "Transfer records grouped by the selected date",
};

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

const isRealAssetTransfer = (transfer) =>
  isApprovedTransfer(transfer) &&
  !isSummaryTransfer(transfer) &&
  Number(transfer?.quantity || 0) > 0 &&
  Boolean(
    transfer?.assetRecordId ||
      transfer?.assetId ||
      transfer?.unitRecordId ||
      transfer?.deviceName
  );

const assetKeyFromTransfer = (transfer) =>
  keyOf(
    transfer?.unitRecordId ||
      transfer?.serialNumber ||
      transfer?.macAddress ||
      transfer?.assetRecordId ||
      transfer?.assetId ||
      transfer?.deviceName
  );

const locationKeyFromTransfer = (transfer, side) =>
  keyOf(
    side === "source"
      ? transfer?.sourceRecordId ||
          transfer?.fromCustomerRecordId ||
          transfer?.fromCustomerId ||
          transfer?.sourceLocation
      : transfer?.destinationRecordId ||
          transfer?.toCustomerRecordId ||
          transfer?.toCustomerId ||
          transfer?.destinationLocation
  );

const getTransferName = (transfer, side) =>
  side === "source"
    ? transfer?.sourceLocation || transfer?.sourceName || transfer?.from || "-"
    : transfer?.destinationLocation ||
      transfer?.destinationName ||
      transfer?.to ||
      "-";

const getAssetName = (asset) =>
  asset?.deviceName || asset?.assetName || asset?.name || "-";

const findAsset = (assets, transfer) => {
  const keys = [
    transfer?.assetRecordId,
    transfer?.assetId,
    transfer?.deviceName,
    transfer?.model,
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

export function getCurrentLocationRows(transfers, assets, locationType) {
  const balances = new Map();
  const targetType = keyOf(locationType);

  transfers.filter(isRealAssetTransfer).forEach((transfer) => {
    const assetKey = assetKeyFromTransfer(transfer);
    if (!assetKey) return;

    const apply = (side, delta) => {
      const locationKey = locationKeyFromTransfer(transfer, side);
      if (!locationKey) return;

      const key = `${targetType}::${locationKey}::${assetKey}`;
      const previous = balances.get(key) || {
        key,
        locationKey,
        assetKey,
        transfer,
        quantity: 0,
      };

      balances.set(key, {
        ...previous,
        transfer,
        quantity: previous.quantity + delta,
      });
    };

    if (keyOf(transfer.destinationType) === targetType) {
      apply("destination", Number(transfer.quantity || 0));
    }

    if (keyOf(transfer.sourceType) === targetType) {
      apply("source", -Number(transfer.quantity || 0));
    }
  });

  return Array.from(balances.values())
    .filter((item) => Number(item.quantity || 0) > 0)
    .map((item) => {
      const asset = findAsset(assets, item.transfer);
      return {
        ...item,
        asset,
        assetId: item.transfer.assetId || asset.assetId || "-",
        category: item.transfer.category || asset.category || "-",
        deviceName: item.transfer.deviceName || getAssetName(asset),
        model: item.transfer.model || asset.model || "-",
        unit: item.transfer.unit || asset.purchaseUsageUnit || asset.purchaseUnit || "Piece",
        locationName:
          keyOf(item.transfer.destinationType) === targetType
            ? getTransferName(item.transfer, "destination")
            : getTransferName(item.transfer, "source"),
        date:
          item.transfer.transferDate ||
          item.transfer.date ||
          item.transfer.createdAt ||
          "",
        responsibleUser: item.transfer.responsibleUser || "-",
        receivedBy: item.transfer.receivedBy || "-",
        status: item.transfer.newStatus || item.transfer.status || "-",
      };
    });
}

export function getDashboardInsightRows({
  insightType,
  assets = [],
  customers = [],
  deviceTransfers = [],
  disconnections = [],
}) {
  const customerRows = getCurrentLocationRows(deviceTransfers, assets, "Customer");
  const towerRows = getCurrentLocationRows(deviceTransfers, assets, "Tower");
  const repairRows = getCurrentLocationRows(deviceTransfers, assets, "Repair");
  const wasteRows = getCurrentLocationRows(deviceTransfers, assets, "Waste");

  const inactiveCustomers = customers.filter((customer) =>
    /inactive|disabled|disconnected|suspend/i.test(clean(customer.status))
  );

  const pendingCollectionRows = disconnections.flatMap((record) => {
    const devices = record.deviceDetails || record.devices || record.pendingDevices || [];
    if (!Array.isArray(devices) || !devices.length) {
      return /pending/i.test(clean(record.recoveryStatus)) ? [record] : [];
    }

    return devices
      .filter((device) =>
        /pending|partially|unreachable/i.test(
          clean(device.recoveryStatus || device.status)
        )
      )
      .map((device) => ({
        ...device,
        customerName: record.customerName,
        customerId: record.customerId,
        disconnectionDate: record.disconnectionDate,
      }));
  });

  const rowsByType = {
    "total-assets": assets,
    "main-stock-assets": assets.filter((asset) => Number(asset.quantity || 0) > 0),
    "assets-at-towers": towerRows,
    "assets-with-customers": customerRows,
    "wasted-assets": wasteRows,
    "under-repair-assets": repairRows,
    "active-customers": customers.filter(
      (customer) => !/inactive|disabled|disconnected|suspend/i.test(clean(customer.status))
    ),
    "inactive-customers": inactiveCustomers,
    "pending-collection": pendingCollectionRows,
    "transfers-by-date": deviceTransfers.filter(isRealAssetTransfer),
  };

  return rowsByType[insightType] || [];
}

export function getDashboardStats(data) {
  const rows = {
    totalAssets: getDashboardInsightRows({ ...data, insightType: "total-assets" }),
    mainStockAssets: getDashboardInsightRows({ ...data, insightType: "main-stock-assets" }),
    assetsAtTowers: getDashboardInsightRows({ ...data, insightType: "assets-at-towers" }),
    assetsWithCustomers: getDashboardInsightRows({
      ...data,
      insightType: "assets-with-customers",
    }),
    wastedAssets: getDashboardInsightRows({ ...data, insightType: "wasted-assets" }),
    underRepairAssets: getDashboardInsightRows({
      ...data,
      insightType: "under-repair-assets",
    }),
    activeCustomers: getDashboardInsightRows({ ...data, insightType: "active-customers" }),
    inactiveCustomers: getDashboardInsightRows({
      ...data,
      insightType: "inactive-customers",
    }),
    pendingCollection: getDashboardInsightRows({
      ...data,
      insightType: "pending-collection",
    }),
  };

  return {
    rows,
    counts: Object.fromEntries(
      Object.entries(rows).map(([key, value]) => [key, value.length])
    ),
  };
}
