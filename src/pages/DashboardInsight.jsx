import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatDateTime } from "../utils/afghanDate";
import {
  buildAssetInventoryInsights,
  sumAssetRows,
} from "../utils/assetInventoryInsights";
import {
  dashboardInsightDescriptions,
  dashboardInsightLabels,
  getDashboardInsightRows,
} from "../utils/dashboardInsights";
import "../App.css";

function valueOf(row, keys) {
  const value = keys
    .map((key) => row?.[key])
    .find((item) => item !== undefined && item !== null && String(item).trim() !== "");

  return value ?? "-";
}

const insightDateFields = [
  "date",
  "createdAt",
  "createdDate",
  "transferDate",
  "issueDate",
  "purchaseDate",
  "registrationDate",
  "wasteDate",
  "resultDate",
  "disconnectionDate",
];

function recordDate(row) {
  const raw = insightDateFields.map((field) => row?.[field]).find(Boolean);
  return raw ? String(raw).slice(0, 10) : "";
}

function inDateRange(row, range) {
  if (!range.from && !range.to) return true;
  const date = recordDate(row);
  if (!date) return false;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

function DashboardInsight() {
  const { insightType = "total-assets" } = useParams();
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const [assets] = useJsonCollection("assets");
  const [assetMovements] = useJsonCollection("assetMovements");
  const [customers] = useJsonCollection("customers");
  const [towerAssets] = useJsonCollection("towerAssets");
  const [deviceTransfers] = useJsonCollection("deviceTransfers");
  const [disconnections] = useJsonCollection("disconnections");

  useEffect(() => {
    setSelected(null);
  }, [insightType]);

  const activeDateRange = useMemo(
    () => ({
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
    }),
    [searchParams]
  );

  const filteredAssets = useMemo(
    () => assets.filter((row) => inDateRange(row, activeDateRange)),
    [assets, activeDateRange]
  );
  const filteredAssetMovements = useMemo(
    () => assetMovements.filter((row) => inDateRange(row, activeDateRange)),
    [assetMovements, activeDateRange]
  );
  const filteredCustomers = useMemo(
    () => customers.filter((row) => inDateRange(row, activeDateRange)),
    [customers, activeDateRange]
  );
  const filteredTowerAssets = useMemo(
    () => towerAssets.filter((row) => inDateRange(row, activeDateRange)),
    [towerAssets, activeDateRange]
  );
  const filteredDeviceTransfers = useMemo(
    () => deviceTransfers.filter((row) => inDateRange(row, activeDateRange)),
    [deviceTransfers, activeDateRange]
  );
  const filteredDisconnections = useMemo(
    () => disconnections.filter((row) => inDateRange(row, activeDateRange)),
    [disconnections, activeDateRange]
  );

  const inventoryInsights = useMemo(
    () =>
      buildAssetInventoryInsights({
        assets: filteredAssets,
        assetMovements: filteredAssetMovements,
        deviceTransfers: filteredDeviceTransfers,
        towerAssets: filteredTowerAssets,
        customers: filteredCustomers,
      }),
    [filteredAssets, filteredAssetMovements, filteredDeviceTransfers, filteredTowerAssets, filteredCustomers]
  );

  const rows = useMemo(
    () =>
      getDashboardInsightRows({
        insightType,
        assets: filteredAssets,
        customers: filteredCustomers,
        deviceTransfers: filteredDeviceTransfers,
        disconnections: filteredDisconnections,
      }),
    [filteredAssets, filteredCustomers, filteredDeviceTransfers, filteredDisconnections, insightType]
  );

  const specialView = ["assets-at-towers", "active-customers", "inactive-customers", "total-assets"].includes(
    insightType
  );
  const groupedRows = getGroupedRows(insightType, inventoryInsights);
  const visibleRows = selected?.rows || groupedRows.flatMap((group) => group.rows || []);
  const isCustomerInsight = /customers/.test(insightType);
  const isCollectionInsight = insightType === "pending-collection";
  const isTransferInsight = insightType === "transfers-by-date";
  const countValue = specialView
    ? selected
      ? sumAssetRows(visibleRows)
      : groupedRows.length
    : rows.length;

  return (
    <div className="dashboard-page">
      <section className="dashboard-insight-hero">
        <div>
          <Link to="/" className="dashboard-insight-back">
            Back to Dashboard
          </Link>
          <span className="page-kicker">Insight</span>
          <h1>
            {selected
              ? selected.name || selected.category
              : dashboardInsightLabels[insightType] || "Dashboard Insight"}
          </h1>
          <p>
            {selected
              ? "Complete asset list for the selected record."
              : dashboardInsightDescriptions[insightType] || "Dashboard records"}
            {(activeDateRange.from || activeDateRange.to) &&
              ` (${activeDateRange.from || "Start"} to ${activeDateRange.to || "Today"})`}
          </p>
        </div>

        <div className="dashboard-insight-count">
          <strong>{Number(countValue || 0).toLocaleString("en-US")}</strong>
          <span>{selected ? "Asset(s)" : specialView ? "Group(s)" : "Record(s)"}</span>
        </div>
      </section>

      {specialView ? (
        <SpecialInsight
          insightType={insightType}
          groupedRows={groupedRows}
          visibleRows={visibleRows}
          selected={selected}
          setSelected={setSelected}
        />
      ) : (
        <LegacyInsightTable
          rows={rows}
          insightType={insightType}
          isCustomerInsight={isCustomerInsight}
          isCollectionInsight={isCollectionInsight}
          isTransferInsight={isTransferInsight}
        />
      )}
    </div>
  );
}

function getGroupedRows(insightType, insights) {
  if (insightType === "assets-at-towers") {
    return insights.towerGroups;
  }

  if (insightType === "active-customers") {
    return insights.customerGroups.filter((group) => group.type === "Active");
  }

  if (insightType === "inactive-customers") {
    return insights.customerGroups.filter((group) => group.type === "Inactive");
  }

  if (insightType === "total-assets") {
    return insights.categoryGroups;
  }

  return [];
}

function SpecialInsight({ insightType, groupedRows, visibleRows, selected, setSelected }) {
  return (
    <>
      {!selected && (
        <section className="card table-card dashboard-insight-card">
          <div className="card-title">
            <div>
              <h3>{groupTitle(insightType)}</h3>
              <span>Click a row to view every asset in that group.</span>
            </div>
          </div>

          <div className="dashboard-table-wrap">
            <table>
              <thead>
                {insightType === "total-assets" ? (
                  <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Stock</th>
                    <th>Customer</th>
                    <th>Tower</th>
                    <th>Repair</th>
                    <th>Wasted</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Name</th>
                    <th>Type / Location</th>
                    <th>Asset Quantity</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {groupedRows.map((group) => (
                  <tr
                    className="dashboard-click-row"
                    key={group.category || group.id || group.name}
                    onClick={() => setSelected(group)}
                  >
                    {insightType === "total-assets" ? (
                      <>
                        <td title={group.category}>{group.category}</td>
                        <td>{number(group.total)}</td>
                        <td>{number(group.stock)}</td>
                        <td>{number(group.customer)}</td>
                        <td>{number(group.tower)}</td>
                        <td>{number(group.repair)}</td>
                        <td>{number(group.wasted)}</td>
                      </>
                    ) : (
                      <>
                        <td title={group.name}>{group.name}</td>
                        <td>{group.type || group.towerLocation || "-"}</td>
                        <td>{number(group.quantity)} asset(s)</td>
                      </>
                    )}
                  </tr>
                ))}
                {!groupedRows.length && (
                  <tr>
                    <td colSpan={insightType === "total-assets" ? 7 : 3} className="dashboard-empty">
                      No record was found for this insight.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card table-card dashboard-insight-card">
        <div className="card-title">
          <div>
            <h3>{selected ? selected.name || selected.category : "Asset List"}</h3>
            <span>Assets include source, destination, and transfer date where available.</span>
          </div>
          {selected && (
            <button type="button" onClick={() => setSelected(null)}>
              Back
            </button>
          )}
        </div>

        <DashboardAssetTable rows={visibleRows} />
      </section>
    </>
  );
}

function DashboardAssetTable({ rows }) {
  return (
    <div className="dashboard-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Asset ID</th>
            <th>Category</th>
            <th>Device Name</th>
            <th>Model</th>
            <th>Qty</th>
            <th>Current Holder</th>
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
              <td>{valueOf(row, ["assetId"])}</td>
              <td>{valueOf(row, ["category"])}</td>
              <td title={valueOf(row, ["deviceName", "assetName", "name"])}>
                {valueOf(row, ["deviceName", "assetName", "name"])}
              </td>
              <td>{valueOf(row, ["model"])}</td>
              <td>{number(row.quantity)} {row.unit || ""}</td>
              <td>{valueOf(row, ["locationName", "placeType", "location"])}</td>
              <td>{row.transfer?.sourceLocation || row.transfer?.sourceName || row.transfer?.sourceType || "-"}</td>
              <td>{row.transfer?.destinationLocation || row.transfer?.destinationName || row.transfer?.destinationType || row.locationName || "-"}</td>
              <td><span className="badge info">{valueOf(row, ["status", "placeType"])}</span></td>
              <td>{row.transfer?.macAddress || row.asset?.macAddress || row.macAddress || "-"}</td>
              <td>{row.transfer?.serialNumber || row.asset?.serialNumber || row.serialNumber || "-"}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan="12" className="dashboard-empty">
                No asset was found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function LegacyInsightTable({ rows, insightType, isCustomerInsight, isCollectionInsight, isTransferInsight }) {
  return (
    <section className="card table-card dashboard-insight-card">
      <div className="card-title">
        <h3>{dashboardInsightLabels[insightType] || "Records"}</h3>
      </div>

      <div className="dashboard-table-wrap">
        <table>
          <thead>
            {isTransferInsight ? (
              <tr>
                <th>Date</th>
                <th>Transfer ID</th>
                <th>Issued from</th>
                <th>Issued to</th>
                <th>Category</th>
                <th>Device Name</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            ) : isCustomerInsight ? (
              <tr>
                <th>Customer ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Registration Date</th>
              </tr>
            ) : isCollectionInsight ? (
              <tr>
                <th>Customer</th>
                <th>Asset</th>
                <th>Category</th>
                <th>Recovery Status</th>
                <th>Date</th>
              </tr>
            ) : (
              <tr>
                <th>Asset ID</th>
                <th>Category</th>
                <th>Device Name</th>
                <th>Model</th>
                <th>Location</th>
                <th>Status</th>
                <th>Date</th>
                <th>Responsible</th>
                <th>Received By</th>
              </tr>
            )}
          </thead>

          <tbody>
            {rows.map((row, index) =>
              isTransferInsight ? (
                <tr key={row.id || row.transferId || index}>
                  <td>{formatDateTime(row.transferDate || row.date || row.createdAt)}</td>
                  <td>{valueOf(row, ["transferId", "referenceNumber", "id"])}</td>
                  <td>{valueOf(row, ["sourceLocation", "sourceName", "sourceType"])}</td>
                  <td>{valueOf(row, ["destinationLocation", "destinationName", "destinationType"])}</td>
                  <td>{valueOf(row, ["category"])}</td>
                  <td>{valueOf(row, ["deviceName", "assetName", "assetId"])}</td>
                  <td>{number(row.quantity)} {row.unit || "Piece"}</td>
                  <td><span className="badge info">{valueOf(row, ["newStatus", "status", "approvalStatus"])}</span></td>
                </tr>
              ) : isCustomerInsight ? (
                <tr key={row.id || row.customerId || index}>
                  <td>{valueOf(row, ["customerId", "id"])}</td>
                  <td>{valueOf(row, ["customerName", "fullName", "name"])}</td>
                  <td>{valueOf(row, ["phone", "mobile"])}</td>
                  <td><span className="badge info">{valueOf(row, ["status"])}</span></td>
                  <td>{formatDateTime(row.registrationDate || row.createdAt)}</td>
                </tr>
              ) : isCollectionInsight ? (
                <tr key={row.id || `${row.customerId}-${index}`}>
                  <td>{valueOf(row, ["customerName", "customerId"])}</td>
                  <td>{valueOf(row, ["deviceName", "assetName", "assetId"])}</td>
                  <td>{valueOf(row, ["category"])}</td>
                  <td><span className="badge warn">{valueOf(row, ["recoveryStatus", "status"])}</span></td>
                  <td>{formatDateTime(row.disconnectionDate || row.date || row.createdAt)}</td>
                </tr>
              ) : (
                <tr key={row.key || row.id || row.assetId || index}>
                  <td>{valueOf(row, ["assetId"])}</td>
                  <td>{valueOf(row, ["category"])}</td>
                  <td>{valueOf(row, ["deviceName", "assetName", "name"])}</td>
                  <td>{valueOf(row, ["model"])}</td>
                  <td>{valueOf(row, ["locationName", "location"])}</td>
                  <td><span className="badge info">{valueOf(row, ["status"])}</span></td>
                  <td>{formatDateTime(row.date || row.createdAt)}</td>
                  <td>{valueOf(row, ["responsibleUser", "responsiblePerson"])}</td>
                  <td>{valueOf(row, ["receivedBy"])}</td>
                </tr>
              )
            )}

            {!rows.length && (
              <tr>
                <td colSpan="9" className="dashboard-empty">
                  No record was found for this insight.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function groupTitle(insightType) {
  if (insightType === "assets-at-towers") return "Towers";
  if (insightType === "active-customers") return "Active Customers";
  if (insightType === "inactive-customers") return "Inactive / Suspend Customers";
  return "Asset Categories";
}

function number(value) {
  return Number(value || 0).toLocaleString("en-US");
}

export default DashboardInsight;
