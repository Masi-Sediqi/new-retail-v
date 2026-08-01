import { getCurrentLocationRows } from "./dashboardInsights";

const normalize = (value) => String(value || "").trim().toLowerCase();

export const sumAssetRows = (rows = []) =>
  rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);

export const isInactiveCustomer = (customer) =>
  /inactive|disabled|disconnected|suspend/i.test(String(customer?.status || ""));

export const isWastedAsset = (asset) =>
  /waste|wasted|damaged|lost/i.test(String(asset?.status || asset?.location || ""));

export function buildAssetInventoryInsights({
  assets = [],
  assetMovements = [],
  deviceTransfers = [],
  towerAssets = [],
  customers = [],
}) {
  const towerRows = getCurrentLocationRows(deviceTransfers, assets, "Tower").map((row) => ({
    ...row,
    placeType: "Tower",
  }));
  const customerRows = getCurrentLocationRows(deviceTransfers, assets, "Customer").map((row) => ({
    ...row,
    placeType: "Customer",
  }));
  const repairRows = getCurrentLocationRows(deviceTransfers, assets, "Repair").map((row) => ({
    ...row,
    placeType: "Repair",
  }));
  const transferWasteRows = getCurrentLocationRows(deviceTransfers, assets, "Waste").map((row) => ({
    ...row,
    placeType: "Wasted",
  }));

  const mainStockRows = assets
    .filter((asset) => Number(asset.quantity || 0) > 0 && !isWastedAsset(asset))
    .map((asset) => ({
      key: `stock-${asset.id || asset.assetId}`,
      asset,
      assetId: asset.assetId || "-",
      category: asset.category || "Uncategorized",
      deviceName: asset.deviceName || asset.model || "-",
      model: asset.model || "-",
      quantity: Number(asset.quantity || 0),
      unit: asset.purchaseUsageUnit || asset.purchaseUnit || "Piece",
      sourceName: asset.supplierName || asset.sourceName || "Purchase / Balance",
      destinationName: "Main Stock",
      locationName: "Main Stock",
      status: asset.status || "In Stock",
      date: asset.purchaseDate || asset.createdAt || asset.updatedAt || "",
      placeType: "Stock",
    }));

  const wastedRows = [
    ...assets.filter(isWastedAsset).map((asset) => ({
      key: `wasted-${asset.id || asset.assetId}`,
      asset,
      assetId: asset.assetId || "-",
      category: asset.category || "Uncategorized",
      deviceName: asset.deviceName || asset.model || "-",
      model: asset.model || "-",
      quantity: Number(asset.quantity || 1),
      unit: asset.purchaseUsageUnit || asset.purchaseUnit || "Piece",
      locationName: asset.location || "Waste",
      status: asset.status || "Wasted",
      date: asset.updatedAt || asset.purchaseDate || asset.createdAt || "",
      placeType: "Wasted",
    })),
    ...transferWasteRows,
    ...assetMovements
      .filter((movement) =>
        /waste|lost|damaged/i.test(
          `${movement.movementType || ""} ${movement.wasteReason || ""} ${movement.status || ""}`
        )
      )
      .map((movement) => ({
        key: `movement-waste-${movement.id}`,
        assetId: movement.assetId || "-",
        category: movement.category || "Uncategorized",
        deviceName: movement.deviceName || movement.assetName || "-",
        model: movement.model || "-",
        quantity: Number(movement.quantity || 0),
        unit: movement.unit || "Piece",
        locationName: movement.destinationName || "Waste",
        status: movement.wasteReason || movement.status || movement.movementType || "Wasted",
        date: movement.date || movement.createdAt || "",
        placeType: "Wasted",
        transfer: movement,
      })),
  ];

  const currentRows = [
    ...mainStockRows,
    ...customerRows,
    ...towerRows,
    ...repairRows,
    ...wastedRows,
  ];

  const categoryMap = new Map();
  currentRows.forEach((row) => {
    const category = row.category || row.asset?.category || "Uncategorized";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        name: category,
        rows: [],
        total: 0,
        stock: 0,
        customer: 0,
        tower: 0,
        repair: 0,
        wasted: 0,
      });
    }

    const group = categoryMap.get(category);
    const quantity = Number(row.quantity || 0);
    group.rows.push(row);
    group.total += quantity;
    if (row.placeType === "Stock") group.stock += quantity;
    if (row.placeType === "Customer") group.customer += quantity;
    if (row.placeType === "Tower") group.tower += quantity;
    if (row.placeType === "Repair") group.repair += quantity;
    if (row.placeType === "Wasted") group.wasted += quantity;
  });

  const activeCustomers = customers.filter((customer) => !isInactiveCustomer(customer));
  const inactiveCustomers = customers.filter(isInactiveCustomer);
  const groupRowsByRecord = (records, rows, type) =>
    records.map((record) => {
      const id =
        record.id ||
        record.customerId ||
        record.towerId ||
        record.customerName ||
        record.towerName;
      const name = record.customerName || record.towerName || record.name || "Unnamed";
      const matchedRows = rows.filter(
        (row) =>
          normalize(row.locationKey) === normalize(id) ||
          normalize(row.locationName) === normalize(name)
      );

      return {
        id,
        name,
        type,
        record,
        rows: matchedRows,
        quantity: sumAssetRows(matchedRows),
      };
    });

  const customerGroups = [
    ...groupRowsByRecord(activeCustomers, customerRows, "Active"),
    ...groupRowsByRecord(inactiveCustomers, customerRows, "Inactive"),
  ];
  const towerGroups = groupRowsByRecord(towerAssets, towerRows, "Tower");

  return {
    towerRows,
    customerRows,
    repairRows,
    mainStockRows,
    wastedRows,
    currentRows,
    categoryGroups: Array.from(categoryMap.values()).sort((a, b) =>
      a.category.localeCompare(b.category)
    ),
    customerGroups,
    towerGroups,
    activeCustomerAssetTotal: sumAssetRows(
      customerGroups.filter((group) => group.type === "Active").flatMap((group) => group.rows)
    ),
    inactiveCustomerAssetTotal: sumAssetRows(
      customerGroups.filter((group) => group.type === "Inactive").flatMap((group) => group.rows)
    ),
  };
}
