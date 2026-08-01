import { getCurrentLocationRows } from "./dashboardInsights";

const clean = (value) => String(value || "").trim();
const keyOf = (value) => clean(value).toLowerCase();

export const sumTowerRows = (rows = []) =>
  rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);

const isApprovedTransfer = (transfer) =>
  !/rejected/i.test(clean(transfer?.approvalStatus || "Approved"));

export const getTowerRecordAssets = (record = {}) => {
  if (Array.isArray(record.assets)) return record.assets;

  if (record.assetId || record.deviceName || record.macAddress || record.serialNumber) {
    return [
      {
        assetId: record.assetId || "",
        deviceName: record.deviceName || "",
        category: record.category || "",
        brand: record.brand || "",
        model: record.model || "",
        macAddress: record.macAddress || "",
        serialNumber: record.serialNumber || "",
        status: record.status || record.installationStatus || "",
        quantity: Number(record.quantity || 1),
      },
    ];
  }

  return [];
};

const towerNameOf = (tower) => tower.towerName || tower.name || "Unnamed Tower";

const towerKeys = (tower) =>
  [
    tower.id,
    tower.towerId,
    tower.towerName,
    tower.name,
    `${tower.towerName || ""} - ${tower.towerLocation || ""}`,
  ]
    .filter(Boolean)
    .map(keyOf);

const transferMatchesTower = (transfer, tower, side) => {
  const keys = towerKeys(tower);
  const recordId =
    side === "source"
      ? transfer.sourceRecordId || transfer.fromTowerRecordId || transfer.sourceTowerId
      : transfer.destinationRecordId ||
        transfer.toTowerRecordId ||
        transfer.destinationTowerId;
  const location =
    side === "source"
      ? transfer.sourceLocation || transfer.sourceName || transfer.fromTowerName
      : transfer.destinationLocation || transfer.destinationName || transfer.toTowerName;

  return keys.some(
    (key) => keyOf(recordId) === key || keyOf(location) === key || keyOf(location).includes(key)
  );
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
  transfer.transferDate || transfer.date || transfer.createdAt || transfer.updatedAt || "";

const normalizeTransferRow = (transfer, assets, placeType) => {
  const asset = findAsset(assets, transfer);
  return {
    key: `transfer-${placeType}-${transfer.id || transfer.referenceNumber || Math.random()}`,
    transfer,
    asset,
    assetId: transfer.assetId || asset.assetId || "-",
    category: transfer.category || asset.category || "Uncategorized",
    deviceName: transfer.deviceName || transfer.assetName || asset.deviceName || "-",
    model: transfer.model || asset.model || "-",
    quantity: Number(transfer.quantity || 0),
    unit: transfer.unit || asset.purchaseUsageUnit || asset.purchaseUnit || "Piece",
    sourceName: transfer.sourceLocation || transfer.sourceName || transfer.sourceType || "-",
    destinationName:
      transfer.destinationLocation || transfer.destinationName || transfer.destinationType || "-",
    locationName:
      placeType === "Outgoing"
        ? transfer.destinationLocation || transfer.destinationName || transfer.destinationType || "-"
        : transfer.destinationLocation || transfer.destinationName || transfer.sourceLocation || "-",
    status: transfer.newStatus || transfer.status || transfer.transferStatus || "-",
    date: transferDate(transfer),
    placeType,
    macAddress: transfer.macAddress || asset.macAddress || "",
    serialNumber: transfer.serialNumber || asset.serialNumber || "",
  };
};

const normalizeRecordAssetRow = (tower, asset, index) => ({
  key: `tower-record-${tower.id || tower.towerName}-${asset.assetId || index}`,
  towerId: tower.id || tower.towerId || "",
  towerName: towerNameOf(tower),
  towerLocation: tower.towerLocation || "",
  assetId: asset.assetId || "-",
  category: asset.category || "Uncategorized",
  deviceName: asset.deviceName || asset.assetName || asset.model || "-",
  model: asset.model || "-",
  quantity: Number(asset.quantity || asset.assignedQuantity || 1),
  unit: asset.purchaseUsageUnit || asset.purchaseUnit || "Piece",
  locationName: towerNameOf(tower),
  status: asset.status || tower.installationStatus || "Installed",
  date: tower.issueDate || tower.createdAt || tower.updatedAt || "",
  placeType: "Tower",
  macAddress: asset.macAddress || "",
  serialNumber: asset.serialNumber || "",
});

const groupRowsByCategory = (rows) => {
  const grouped = new Map();

  rows.forEach((row) => {
    const category = row.category || "Uncategorized";
    if (!grouped.has(category)) {
      grouped.set(category, { category, name: category, rows: [], total: 0, towers: new Map() });
    }

    const group = grouped.get(category);
    const quantity = Number(row.quantity || 0);
    const towerName = row.towerName || row.locationName || row.destinationName || row.sourceName || "-";
    group.rows.push(row);
    group.total += quantity;
    group.towers.set(towerName, {
      name: towerName,
      rows: [...(group.towers.get(towerName)?.rows || []), row],
      quantity: Number(group.towers.get(towerName)?.quantity || 0) + quantity,
    });
  });

  return Array.from(grouped.values())
    .map((group) => ({ ...group, towers: Array.from(group.towers.values()) }))
    .sort((a, b) => a.category.localeCompare(b.category));
};

export function buildTowerInsights({ towerAssets = [], assets = [], deviceTransfers = [] }) {
  const transferTowerRows = getCurrentLocationRows(deviceTransfers, assets, "Tower");
  const towerGroups = towerAssets.map((tower) => {
    const rowsFromTransfers = transferTowerRows
      .filter(
        (row) =>
          towerKeys(tower).some(
            (key) => keyOf(row.locationKey) === key || keyOf(row.locationName).includes(key)
          )
      )
      .map((row) => ({
        ...row,
        towerId: tower.id || tower.towerId || "",
        towerName: towerNameOf(tower),
        towerLocation: tower.towerLocation || "",
        placeType: "Tower",
      }));

    const fallbackRows = getTowerRecordAssets(tower).map((asset, index) =>
      normalizeRecordAssetRow(tower, asset, index)
    );
    const rows = rowsFromTransfers.length ? rowsFromTransfers : fallbackRows;
    const inactive = /inactive|removed|disabled|decommissioned/i.test(
      `${tower.status || ""} ${tower.installationStatus || ""}`
    );

    return {
      id: tower.id || tower.towerId || tower.towerName,
      name: towerNameOf(tower),
      towerLocation: tower.towerLocation || "",
      type: inactive ? "Inactive" : "Active",
      record: tower,
      rows,
      quantity: sumTowerRows(rows),
    };
  });

  const currentRows = towerGroups.flatMap((tower) =>
    tower.rows.map((row) => ({
      ...row,
      towerId: tower.id,
      towerName: tower.name,
      towerLocation: tower.towerLocation,
    }))
  );

  const approvedTransfers = deviceTransfers.filter(isApprovedTransfer);
  const incomingRows = approvedTransfers
    .filter((transfer) => keyOf(transfer.destinationType) === "tower")
    .map((transfer) => ({
      ...normalizeTransferRow(transfer, assets, "Incoming"),
      towerName: transfer.destinationLocation || transfer.destinationName || "Tower",
    }));
  const outgoingRows = approvedTransfers
    .filter(
      (transfer) =>
        keyOf(transfer.sourceType) === "tower" && keyOf(transfer.destinationType) !== "tower"
    )
    .map((transfer) => ({
      ...normalizeTransferRow(transfer, assets, "Outgoing"),
      towerName: transfer.sourceLocation || transfer.sourceName || "Tower",
    }));
  const wastedRows = outgoingRows.filter((row) =>
    /waste|wasted|damaged|lost/i.test(
      `${row.destinationName || ""} ${row.status || ""} ${row.transfer?.transferType || ""}`
    )
  );
  const repairRows = outgoingRows.filter((row) =>
    /repair|maintenance/i.test(
      `${row.destinationName || ""} ${row.status || ""} ${row.transfer?.transferType || ""}`
    )
  );

  return {
    towerGroups,
    currentRows,
    categoryGroups: groupRowsByCategory(currentRows),
    incomingRows,
    incomingCategoryGroups: groupRowsByCategory(incomingRows),
    outgoingRows,
    wastedRows,
    repairRows,
    repairTowerGroups: towerGroups.map((tower) => ({
      ...tower,
      rows: repairRows.filter((row) =>
        towerKeys(tower.record).some(
          (key) => keyOf(row.sourceName) === key || keyOf(row.sourceName).includes(key)
        )
      ),
    })).map((tower) => ({ ...tower, quantity: sumTowerRows(tower.rows) })),
  };
}
