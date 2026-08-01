import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatDateTime } from "../utils/afghanDate";
import { buildTowerInsights, sumTowerRows } from "../utils/towerInsights";
import "./TowerAssets.css";

const number = (value) => Number(value || 0).toLocaleString("en-US");

const configs = {
  categories: {
    title: "Tower Asset Categories",
    subtitle: "All asset categories currently held by towers.",
    empty: "No category asset was found.",
  },
  towers: {
    title: "Tower Status",
    subtitle: "Active and inactive towers with the asset quantity at each tower.",
    empty: "No tower asset was found.",
  },
  incoming: {
    title: "Transfers To Towers",
    subtitle: "Transfer categories received by towers.",
    empty: "No transfer to towers was found.",
  },
  outgoing: {
    title: "Transfers From Towers",
    subtitle: "Transfers sent from towers to customers, stock, repair, or other places.",
    empty: "No outgoing tower transfer was found.",
  },
  wasted: {
    title: "Wasted Tower Assets",
    subtitle: "Assets wasted, damaged, or lost from towers with recorded dates.",
    empty: "No wasted tower asset was found.",
  },
  repair: {
    title: "Tower Assets In Repair",
    subtitle: "Repair and maintenance assets grouped by tower.",
    empty: "No tower repair asset was found.",
  },
};

function TowerInsight() {
  const { insightType = "categories" } = useParams();
  const [towerAssets] = useJsonCollection("towerAssets");
  const [assets] = useJsonCollection("assets");
  const [deviceTransfers] = useJsonCollection("deviceTransfers");
  const [selected, setSelected] = useState(null);

  const insights = useMemo(
    () => buildTowerInsights({ towerAssets, assets, deviceTransfers }),
    [towerAssets, assets, deviceTransfers]
  );

  const config = configs[insightType] || configs.categories;
  const topRows = getTopRows(insightType, insights);
  const visibleRows = getVisibleRows(insightType, topRows, selected);
  const showGroups = !selected && ["categories", "towers", "incoming", "repair"].includes(insightType);
  const showDate = ["incoming", "outgoing", "wasted", "repair"].includes(insightType) || selected;

  return (
    <div className="tower-page tower-insight-page">
      <section className="tower-insight-hero">
        <div>
          <Link to="/tower-assets" className="tower-insight-back">
            Back to Towers
          </Link>
          <span className="tower-page-kicker">Tower Insight</span>
          <h1>{selected ? selected.name || selected.category : config.title}</h1>
          <p>{selected ? "Filtered detail for your selected row." : config.subtitle}</p>
        </div>

        <div className="tower-insight-count">
          <strong>{number(sumTowerRows(visibleRows))}</strong>
          <span>Asset(s)</span>
        </div>
      </section>

      <section className="tower-insight-summary-grid">
        {getSummaryCards(insightType, insights, visibleRows, selected).map((item) => (
          <div className="tower-insight-summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{number(item.value)}</strong>
          </div>
        ))}
      </section>

      {showGroups && (
        <section className="tower-insight-card">
          <div className="tower-insight-header">
            <div>
              <h3>{config.title}</h3>
              <p>Click a row to open its detailed asset list.</p>
            </div>
          </div>

          {["categories", "incoming"].includes(insightType) ? (
            <CategoryGrid rows={topRows} onOpen={setSelected} />
          ) : (
            <TowerGrid rows={topRows} onOpen={setSelected} />
          )}
        </section>
      )}

      {selected?.towers && (
        <section className="tower-insight-card">
          <div className="tower-insight-header">
            <div>
              <h3>{selected.category} By Tower</h3>
              <p>Click a tower to show every asset from this category.</p>
            </div>
            <button type="button" onClick={() => setSelected(null)}>
              Back
            </button>
          </div>

          <TowerGrid
            rows={selected.towers.map((tower) => ({
              ...tower,
              type: "Tower",
              category: selected.category,
            }))}
            onOpen={setSelected}
          />
        </section>
      )}

      <section className="tower-insight-card">
        <div className="tower-insight-header">
          <div>
            <h3>{selected?.towers ? "Category Assets" : selected ? selected.name || selected.category : "Asset List"}</h3>
            <p>{selected ? "List filtered by your selection." : "Full asset list for this insight."}</p>
          </div>

          {selected && !selected.towers && (
            <button type="button" onClick={() => setSelected(null)}>
              Back
            </button>
          )}
        </div>

        <TowerAssetTable rows={visibleRows} showDate={showDate} emptyText={config.empty} />
      </section>
    </div>
  );
}

function getTopRows(type, insights) {
  if (type === "categories") return insights.categoryGroups;
  if (type === "towers") return insights.towerGroups;
  if (type === "incoming") return insights.incomingCategoryGroups;
  if (type === "repair") return insights.repairTowerGroups.filter((tower) => tower.quantity > 0);
  if (type === "outgoing") return insights.outgoingRows;
  if (type === "wasted") return insights.wastedRows;
  return insights.currentRows;
}

function getVisibleRows(type, topRows, selected) {
  if (selected?.rows) return selected.rows;
  if (["categories", "incoming"].includes(type)) return topRows.flatMap((group) => group.rows || []);
  if (["towers", "repair"].includes(type)) return topRows.flatMap((tower) => tower.rows || []);
  return topRows;
}

function getSummaryCards(type, insights, visibleRows, selected) {
  if (selected?.category && !selected.towers) {
    return [
      { label: "Selected Assets", value: sumTowerRows(selected.rows) },
      { label: "Rows", value: selected.rows.length },
    ];
  }

  if (type === "categories") {
    return [
      { label: "Categories", value: insights.categoryGroups.length },
      { label: "Tower Assets", value: sumTowerRows(insights.currentRows) },
      { label: "Towers", value: insights.towerGroups.length },
    ];
  }

  if (type === "towers") {
    return [
      { label: "Active Towers", value: insights.towerGroups.filter((tower) => tower.type === "Active").length },
      { label: "Inactive Towers", value: insights.towerGroups.filter((tower) => tower.type === "Inactive").length },
      { label: "Tower Assets", value: sumTowerRows(visibleRows) },
    ];
  }

  if (type === "incoming") {
    return [
      { label: "Categories", value: insights.incomingCategoryGroups.length },
      { label: "Incoming Assets", value: sumTowerRows(insights.incomingRows) },
      { label: "Transfers", value: insights.incomingRows.length },
    ];
  }

  return [
    { label: "Assets", value: sumTowerRows(visibleRows) },
    { label: "Rows", value: visibleRows.length },
  ];
}

function CategoryGrid({ rows, onOpen }) {
  if (!rows.length) return <p className="tower-empty">No category was found.</p>;

  return (
    <div className="tower-category-insight-grid">
      {rows.map((row) => (
        <button
          type="button"
          className="tower-category-insight-row"
          key={row.category}
          onClick={() => onOpen(row)}
        >
          <strong title={row.category}>{row.category}</strong>
          <span>Total {number(row.total)}</span>
          <em>{row.towers.length} tower(s)</em>
        </button>
      ))}
    </div>
  );
}

function TowerGrid({ rows, onOpen }) {
  if (!rows.length) return <p className="tower-empty">No tower was found.</p>;

  return (
    <div className="tower-entity-insight-grid">
      {rows.map((row) => (
        <button
          type="button"
          className={`tower-entity-insight-row ${row.type === "Inactive" ? "inactive" : ""}`}
          key={`${row.category || row.type}-${row.id || row.name}`}
          onClick={() => onOpen(row)}
        >
          <strong title={row.name}>{row.name}</strong>
          <span>{row.category || row.type || "Tower"}</span>
          <b>{number(row.quantity)} asset(s)</b>
        </button>
      ))}
    </div>
  );
}

function TowerAssetTable({ rows, showDate, emptyText }) {
  return (
    <div className="tower-insight-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Tower</th>
            <th>Asset ID</th>
            <th>Device Name</th>
            <th>Category</th>
            <th>Model</th>
            <th>Qty</th>
            <th>Issued from</th>
            <th>Issued to</th>
            <th>Status</th>
            <th>MAC Address</th>
            <th>Serial Number</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key || `${row.assetId}-${index}`}>
              <td>{showDate ? formatDateTime(row.date || row.createdAt || row.updatedAt) : "-"}</td>
              <td title={row.towerName || row.locationName || "-"}>{row.towerName || row.locationName || "-"}</td>
              <td>{row.assetId || "-"}</td>
              <td title={row.deviceName || "-"}>{row.deviceName || "-"}</td>
              <td>{row.category || "-"}</td>
              <td>{row.model || "-"}</td>
              <td>{number(row.quantity)} {row.unit || ""}</td>
              <td>{row.sourceName || row.transfer?.sourceLocation || "-"}</td>
              <td>{row.destinationName || row.transfer?.destinationLocation || "-"}</td>
              <td><span className="tower-table-status">{row.status || row.placeType || "-"}</span></td>
              <td>{row.macAddress || row.transfer?.macAddress || row.asset?.macAddress || "-"}</td>
              <td>{row.serialNumber || row.transfer?.serialNumber || row.asset?.serialNumber || "-"}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan="12" className="tower-empty">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default TowerInsight;
