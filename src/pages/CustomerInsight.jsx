import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatDateTime } from "../utils/afghanDate";
import {
  buildCustomerInsights,
  sumCustomerRows,
} from "../utils/customerInsights";
import "./Customers.css";

const number = (value) => Number(value || 0).toLocaleString("en-US");

const configs = {
  categories: {
    title: "Customer Asset Categories",
    subtitle: "Asset categories currently held by customers.",
    empty: "No customer asset category found.",
  },
  status: {
    title: "Customer Status",
    subtitle: "Active and suspend customers with asset quantity per customer.",
    empty: "No customer was found.",
  },
  outgoing: {
    title: "Assets Sent By Customers",
    subtitle: "Assets sent from customers to other destinations with date and destination.",
    empty: "No outgoing customer asset was found.",
  },
  incoming: {
    title: "Assets Received By Customers",
    subtitle: "Assets arrived to customers from other sources.",
    empty: "No incoming customer asset was found.",
  },
};

function CustomerInsight() {
  const { insightType = "categories" } = useParams();
  const [selected, setSelected] = useState(null);
  const [customers] = useJsonCollection("customers");
  const [assets] = useJsonCollection("assets");
  const [deviceTransfers] = useJsonCollection("deviceTransfers");

  const insights = useMemo(
    () => buildCustomerInsights({ customers, assets, deviceTransfers }),
    [customers, assets, deviceTransfers]
  );

  const config = configs[insightType] || configs.categories;
  const groups = getGroups(insightType, insights);
  const visibleRows = selected?.rows || getRows(insightType, insights);
  const showGroups = !selected && ["categories", "status"].includes(insightType);

  return (
    <div className="customers-page customer-insight-page">
      <section className="customer-insight-hero">
        <div>
          <Link to="/customers" className="customer-insight-back">
            Back to Customers
          </Link>
          <span className="customer-page-kicker">Customer Insight</span>
          <h1>{selected ? selected.name || selected.category : config.title}</h1>
          <p>{selected ? "Filtered asset list for the selected row." : config.subtitle}</p>
        </div>

        <div className="customer-insight-count">
          <strong>{number(sumCustomerRows(visibleRows))}</strong>
          <span>Asset(s)</span>
        </div>
      </section>

      <section className="customer-insight-summary-grid">
        {getSummary(insightType, insights, visibleRows).map((item) => (
          <div className="customer-insight-summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{number(item.value)}</strong>
          </div>
        ))}
      </section>

      {showGroups && (
        <section className="customer-insight-card">
          <div className="customer-insight-header">
            <div>
              <h3>{config.title}</h3>
              <p>Click a row to show the exact assets.</p>
            </div>
          </div>

          {insightType === "categories" ? (
            <CategoryGrid rows={groups} onOpen={setSelected} />
          ) : (
            <CustomerGrid rows={groups} onOpen={setSelected} />
          )}
        </section>
      )}

      <section className="customer-insight-card">
        <div className="customer-insight-header">
          <div>
            <h3>{selected ? selected.name || selected.category : "Asset List"}</h3>
            <p>Each row includes source, destination, and transfer date.</p>
          </div>
          {selected && (
            <button type="button" onClick={() => setSelected(null)}>
              Back
            </button>
          )}
        </div>

        <CustomerAssetTable rows={visibleRows} emptyText={config.empty} />
      </section>
    </div>
  );
}

function getGroups(type, insights) {
  if (type === "categories") return insights.categoryGroups;
  if (type === "status") return insights.customerGroups;
  return [];
}

function getRows(type, insights) {
  if (type === "outgoing") return insights.outgoingRows;
  if (type === "incoming") return insights.incomingRows;
  return getGroups(type, insights).flatMap((group) => group.rows || []);
}

function getSummary(type, insights, visibleRows) {
  if (type === "categories") {
    return [
      { label: "Categories", value: insights.categoryGroups.length },
      { label: "Customer Assets", value: sumCustomerRows(insights.customerRows) },
    ];
  }

  if (type === "status") {
    return [
      { label: "Active Customers", value: insights.activeCustomerGroups.length },
      { label: "Suspend Customers", value: insights.inactiveCustomerGroups.length },
      { label: "Customer Assets", value: sumCustomerRows(visibleRows) },
    ];
  }

  return [
    { label: "Assets", value: sumCustomerRows(visibleRows) },
    { label: "Rows", value: visibleRows.length },
  ];
}

function CategoryGrid({ rows, onOpen }) {
  if (!rows.length) return <p className="customer-empty">No category found.</p>;

  return (
    <div className="customer-insight-grid">
      {rows.map((row) => (
        <button
          type="button"
          className="customer-insight-row"
          key={row.category}
          onClick={() => onOpen(row)}
        >
          <strong title={row.category}>{row.category}</strong>
          <span>Total {number(row.total)}</span>
          <b>{row.rows.length} record(s)</b>
        </button>
      ))}
    </div>
  );
}

function CustomerGrid({ rows, onOpen }) {
  if (!rows.length) return <p className="customer-empty">No customer found.</p>;

  return (
    <div className="customer-insight-grid">
      {rows.map((row) => (
        <button
          type="button"
          className={`customer-insight-row ${row.type === "Suspend" ? "suspended" : ""}`}
          key={`${row.type}-${row.id || row.name}`}
          onClick={() => onOpen(row)}
        >
          <strong title={row.name}>{row.name}</strong>
          <span>{row.type}</span>
          <b>{number(row.quantity)} asset(s)</b>
        </button>
      ))}
    </div>
  );
}

function CustomerAssetTable({ rows, emptyText }) {
  return (
    <div className="customer-insight-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
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
              <td>{formatDateTime(row.date || row.createdAt || row.updatedAt)}</td>
              <td>{row.assetId || "-"}</td>
              <td title={row.deviceName || "-"}>{row.deviceName || "-"}</td>
              <td>{row.category || "-"}</td>
              <td>{row.model || "-"}</td>
              <td>{number(row.quantity)} {row.unit || ""}</td>
              <td>{row.sourceName || row.transfer?.sourceLocation || row.transfer?.sourceType || "-"}</td>
              <td>{row.destinationName || row.transfer?.destinationLocation || row.transfer?.destinationType || row.locationName || "-"}</td>
              <td><span className="customer-table-status">{row.status || row.placeType || "-"}</span></td>
              <td>{row.macAddress || row.transfer?.macAddress || row.asset?.macAddress || "-"}</td>
              <td>{row.serialNumber || row.transfer?.serialNumber || row.asset?.serialNumber || "-"}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan="11" className="customer-empty">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CustomerInsight;
