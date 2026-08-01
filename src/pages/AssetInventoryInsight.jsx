import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatDateTime } from "../utils/afghanDate";
import {
  buildAssetInventoryInsights,
  sumAssetRows,
} from "../utils/assetInventoryInsights";
import "./AssetInventory.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");

const insightConfig = {
  categories: {
    title: "Asset Categories",
    subtitle: "Category totals with stock, customer, tower, repair, and wasted quantities.",
    empty: "No category found.",
  },
  customers: {
    title: "Customer Assets",
    subtitle: "Active and inactive customers with company assets currently held by each customer.",
    empty: "No customer assets found.",
  },
  towers: {
    title: "Tower Assets",
    subtitle: "Tower list with installed company assets at every tower.",
    empty: "No tower assets found.",
  },
  stock: {
    title: "Main Stock Assets",
    subtitle: "All assets currently available in Main Stock.",
    empty: "No stock asset found.",
  },
  repair: {
    title: "Under Repair Assets",
    subtitle: "Assets currently marked as under repair.",
    empty: "No repair asset found.",
  },
  wasted: {
    title: "Wasted Assets",
    subtitle: "Assets marked as wasted, damaged, or lost with their recorded dates.",
    empty: "No wasted asset found.",
  },
};

function AssetInventoryInsight() {
  const { insightType = "categories" } = useParams();
  const [assets] = useJsonCollection("assets");
  const [assetMovements] = useJsonCollection("assetMovements");
  const [deviceTransfers] = useJsonCollection("deviceTransfers");
  const [towerAssets] = useJsonCollection("towerAssets");
  const [customers] = useJsonCollection("customers");
  const [selected, setSelected] = useState(null);

  const insights = useMemo(
    () =>
      buildAssetInventoryInsights({
        assets,
        assetMovements,
        deviceTransfers,
        towerAssets,
        customers,
      }),
    [assets, assetMovements, deviceTransfers, towerAssets, customers]
  );

  const config = insightConfig[insightType] || insightConfig.categories;
  const activeRows = getRowsForInsight(insightType, insights);
  const visibleRows = selected?.rows || activeRows;
  const showGroups = ["categories", "customers", "towers"].includes(insightType) && !selected;
  const showWasteDate = insightType === "wasted" || selected?.placeType === "Wasted";

  const summaryCards = getSummaryCards(insightType, insights, activeRows, selected);

  return (
    <div className="asset-page asset-insight-page">
      <section className="asset-insight-hero">
        <div>
          <Link to="/assets" className="asset-insight-back">
            Back to Asset Inventory
          </Link>
          <span className="asset-page-kicker">Asset Insight</span>
          <h1>{selected ? selected.name || selected.category : config.title}</h1>
          <p>{selected ? "Complete asset list for the selected record." : config.subtitle}</p>
        </div>

        <div className="asset-insight-hero-count">
          <strong>{money(sumAssetRows(visibleRows))}</strong>
          <span>Asset(s)</span>
        </div>
      </section>

      <section className="asset-insight-summary-grid">
        {summaryCards.map((card) => (
          <div className="asset-insight-summary-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{money(card.value)}</strong>
          </div>
        ))}
      </section>

      {showGroups && (
        <section className="asset-insight-list-card">
          <div className="asset-insight-header">
            <div>
              <h3>{config.title}</h3>
              <p>Click any row to show its asset list below.</p>
            </div>
          </div>

          {insightType === "categories" ? (
            <CategoryGrid rows={insights.categoryGroups} onOpen={setSelected} />
          ) : (
            <EntityGrid
              rows={insightType === "customers" ? insights.customerGroups : insights.towerGroups}
              onOpen={setSelected}
            />
          )}
        </section>
      )}

      <section className="asset-insight-list-card">
        <div className="asset-insight-header">
          <div>
            <h3>{selected ? selected.name || selected.category : "Asset List"}</h3>
            <p>{selected ? "Filtered by your selection." : "Full list for this insight."}</p>
          </div>

          {selected && (
            <button type="button" onClick={() => setSelected(null)}>
              Back
            </button>
          )}
        </div>

        <AssetInsightTable
          rows={visibleRows}
          showWasteDate={showWasteDate}
          emptyText={config.empty}
        />
      </section>
    </div>
  );
}

function getRowsForInsight(type, insights) {
  if (type === "stock") return insights.mainStockRows;
  if (type === "repair") return insights.repairRows;
  if (type === "wasted") return insights.wastedRows;
  if (type === "customers") return insights.customerGroups.flatMap((group) => group.rows);
  if (type === "towers") return insights.towerGroups.flatMap((group) => group.rows);
  return insights.currentRows;
}

function getSummaryCards(type, insights, activeRows, selected) {
  if (selected?.category) {
    return [
      { label: "Total", value: selected.total },
      { label: "Stock", value: selected.stock },
      { label: "Customer", value: selected.customer },
      { label: "Tower", value: selected.tower },
      { label: "Repair", value: selected.repair },
      { label: "Wasted", value: selected.wasted },
    ];
  }

  if (selected) {
    return [
      { label: "Selected Assets", value: selected.quantity },
      { label: "Rows", value: selected.rows.length },
    ];
  }

  if (type === "categories") {
    return [
      { label: "Categories", value: insights.categoryGroups.length },
      { label: "All Assets", value: sumAssetRows(activeRows) },
      { label: "In Stock", value: sumAssetRows(insights.mainStockRows) },
      { label: "With Customers", value: sumAssetRows(insights.customerRows) },
      { label: "At Towers", value: sumAssetRows(insights.towerRows) },
      { label: "Repair", value: sumAssetRows(insights.repairRows) },
    ];
  }

  if (type === "customers") {
    return [
      { label: "Active Customer Assets", value: insights.activeCustomerAssetTotal },
      { label: "Inactive Customer Assets", value: insights.inactiveCustomerAssetTotal },
      { label: "Customers", value: insights.customerGroups.length },
    ];
  }

  if (type === "towers") {
    return [
      { label: "Tower Assets", value: sumAssetRows(activeRows) },
      { label: "Towers", value: insights.towerGroups.length },
    ];
  }

  return [
    { label: "Assets", value: sumAssetRows(activeRows) },
    { label: "Rows", value: activeRows.length },
  ];
}

function CategoryGrid({ rows, onOpen }) {
  if (!rows.length) return <p className="asset-empty">No category found.</p>;

  return (
    <div className="asset-category-insight-list pretty">
      {rows.map((row) => (
        <button
          type="button"
          className="asset-category-insight-row pretty"
          key={row.category}
          onClick={() => onOpen(row)}
        >
          <strong title={row.category}>{row.category}</strong>
          <span>Total {money(row.total)}</span>
          <em>Stock {money(row.stock)}</em>
          <em>Customer {money(row.customer)}</em>
          <em>Tower {money(row.tower)}</em>
          <em>Repair {money(row.repair)}</em>
          <em>Wasted {money(row.wasted)}</em>
        </button>
      ))}
    </div>
  );
}

function EntityGrid({ rows, onOpen }) {
  if (!rows.length) return <p className="asset-empty">No record found.</p>;

  return (
    <div className="asset-entity-insight-list pretty">
      {rows.map((row) => (
        <button
          type="button"
          className={`asset-entity-insight-row pretty ${row.type === "Inactive" ? "inactive" : ""}`}
          key={`${row.type}-${row.id || row.name}`}
          onClick={() => onOpen(row)}
        >
          <strong title={row.name}>{row.name}</strong>
          <span>{row.type}</span>
          <b>{money(row.quantity)} asset(s)</b>
        </button>
      ))}
    </div>
  );
}

function AssetInsightTable({ rows, showWasteDate, emptyText }) {
  return (
    <div className="asset-insight-table-wrap pretty">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Asset ID</th>
            <th>Device Name</th>
            <th>Category</th>
            <th>Model</th>
            <th>Qty</th>
            <th>Location</th>
            <th>Issued from</th>
            <th>Issued to</th>
            <th>Status</th>
            <th>MAC Address</th>
            <th>Serial Number</th>
            {showWasteDate && <th>Waste Date</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key || `${row.assetId}-${index}`}>
              <td>{formatDateTime(row.date || row.createdAt || row.updatedAt)}</td>
              <td>{row.assetId || row.asset?.assetId || "-"}</td>
              <td
                title={`${row.category || row.asset?.category || "-"} - ${
                  row.deviceName || row.asset?.deviceName || "-"
                }`}
              >
                {row.category || row.asset?.category || "-"} -{" "}
                {row.deviceName || row.asset?.deviceName || "-"}
              </td>
              <td>{row.category || row.asset?.category || "-"}</td>
              <td>{row.model || row.asset?.model || "-"}</td>
              <td>{money(row.quantity)} {row.unit || ""}</td>
              <td>{row.locationName || row.placeType || "-"}</td>
              <td>{row.sourceName || row.transfer?.sourceLocation || row.transfer?.sourceType || "-"}</td>
              <td>{row.destinationName || row.transfer?.destinationLocation || row.transfer?.destinationType || row.locationName || "-"}</td>
              <td>
                <span className="asset-table-status">{row.status || row.placeType || "-"}</span>
              </td>
              <td>{row.transfer?.macAddress || row.asset?.macAddress || "-"}</td>
              <td>{row.transfer?.serialNumber || row.asset?.serialNumber || "-"}</td>
              {showWasteDate && <td>{formatDateTime(row.date || row.createdAt || row.updatedAt)}</td>}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={showWasteDate ? 13 : 12} className="asset-empty">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AssetInventoryInsight;
