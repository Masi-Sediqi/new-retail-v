import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatDateTime } from "../utils/afghanDate";
import "./AssetAuditTrail.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");

const eventLabel = (record) => {
  const movementType = String(
    record.movementType || record.historyType || record.transferType || ""
  );
  const newStatus = String(record.newStatus || record.status || record.transferStatus || "");
  const destination = String(record.destinationLocation || record.destinationName || "");

  if (/purchase/i.test(movementType)) return "Purchased";
  if (/balance/i.test(movementType)) return "Stock Entry";
  if (/repair/i.test(movementType) || /repair/i.test(destination)) return "Repair";
  if (/lost/i.test(movementType) || /lost/i.test(newStatus) || /lost/i.test(destination)) return "Lost";
  if (/damaged/i.test(movementType) || /damaged/i.test(newStatus) || /damaged/i.test(destination)) return "Damaged";
  if (/disposal|disposed/i.test(movementType) || /disposal|disposed/i.test(newStatus) || /disposal/i.test(destination)) return "Disposal";
  if (/customer.*customer/i.test(movementType)) return "Customer to Customer Transfer";
  if (/tower/i.test(destination) || /to tower/i.test(movementType)) return "Transfer to Tower";
  if (/customer/i.test(destination) || /to customer/i.test(movementType)) return "Transfer to Customer";
  if (/main stock|stock/i.test(destination)) return "Return to Stock";
  if (/status/i.test(movementType)) return "Status Change";
  return movementType || "Specification Change";
};

const getDate = (record) =>
  record.transferDate ||
  record.date ||
  record.purchaseDate ||
  record.issueDate ||
  record.createdDate ||
  record.createdAt ||
  record.updatedAt ||
  "";

const sameAsset = (record, asset) => {
  const assetKeys = [asset.id, asset.assetId].filter(Boolean).map(String);
  return [record.assetRecordId, record.assetId, record.sourceAssetRecordId]
    .filter(Boolean)
    .map(String)
    .some((key) => assetKeys.includes(key));
};

const sourceRowClass = (sourceLocation) => {
  const source = String(sourceLocation || "").trim();
  if (!source || source === "-") return "";
  if (/main stock|stock/i.test(source)) return "asset-audit-source-stock";
  return "asset-audit-source-other";
};

const displayNewStatus = (status, destinationLocation) => {
  const rawStatus = String(status || "").trim();
  const destination = String(destinationLocation || "").trim();
  if (/^issued$/i.test(rawStatus)) {
    if (/customer/i.test(destination)) return "Issued to Customer";
    if (/tower/i.test(destination)) return "Issued to Tower";
    if (/repair/i.test(destination)) return "Issued to Repair";
    if (/waste|damaged|lost/i.test(destination)) return "Issued to Waste";
  }
  return rawStatus || "-";
};

export default function AssetAuditTrail() {
  const { assetId } = useParams();
  const [assets] = useJsonCollection("assets");
  const [assetMovements] = useJsonCollection("assetMovements");
  const [towerTransfers] = useJsonCollection("towerAssetTransfers");
  const [deviceHistory] = useJsonCollection("deviceHistory");
  const [filters, setFilters] = useState({
    date: "",
    source: "",
    destination: "",
  });

  const asset = assets.find(
    (item) => String(item.id || item.assetId) === String(assetId)
  );

  const rows = useMemo(() => {
    if (!asset) return [];

    const movementRows = assetMovements.filter((record) => sameAsset(record, asset));
    const towerTransferRows = towerTransfers.filter((record) => sameAsset(record, asset));
    const historyRows = deviceHistory.filter((record) => sameAsset(record, asset));

    const statusRow = {
      id: "current-location",
      auditEvent: "Current Location",
      isCurrentLocation: true,
      sourceLocation: asset.previousLocation || "-",
      destinationLocation: asset.location || "Main Stock",
      quantity: asset.quantity || 0,
      previousStatus: asset.previousStatus || "-",
      newStatus: asset.status || "In Stock",
      referenceNumber: asset.lastTransferId || "-",
      note: asset.notes || "",
      createdAt: asset.updatedAt || asset.createdAt || "",
      locked: true,
    };

    return [
      ...movementRows,
      ...towerTransferRows,
      ...historyRows,
      statusRow,
    ]
      .map((record, index) => ({
        id: record.id || `audit-${index}`,
        auditEvent: record.auditEvent || eventLabel(record),
        date: getDate(record),
        referenceNumber:
          record.referenceNumber || record.purchaseCode || record.transferId || "-",
        sourceLocation:
          record.sourceLocation || record.sourceName || record.sourceTowerName || "-",
        destinationLocation:
          record.destinationLocation ||
          record.destinationName ||
          record.destinationTowerName ||
          "-",
        quantity: record.quantity ?? "-",
        previousStatus: record.previousStatus || "-",
        newStatus: displayNewStatus(
          record.newStatus ||
            record.paymentStatus ||
            record.transferStatus ||
            record.status ||
            "-",
          record.destinationLocation ||
            record.destinationName ||
            record.destinationTowerName ||
            "-"
        ),
        responsibleUser:
          record.responsibleUser ||
          record.responsiblePerson ||
          record.receivedBy ||
          "-",
        note: record.note || record.notes || record.reason || "-",
        createdAt: record.createdDate || record.createdAt || record.updatedAt || "",
        locked: Boolean(record.locked || record.immutable),
        isCurrentLocation: Boolean(record.isCurrentLocation),
      }))
      .sort((a, b) => {
        if (a.isCurrentLocation) return -1;
        if (b.isCurrentLocation) return 1;
        return new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
      });
  }, [asset, assetMovements, deviceHistory, towerTransfers]);

  const filteredRows = useMemo(() => {
    const dateFilter = filters.date.trim();
    const sourceFilter = filters.source.trim().toLowerCase();
    const destinationFilter = filters.destination.trim().toLowerCase();

    return rows.filter((row) => {
      const rowDate = String(row.date || row.createdAt || "").slice(0, 10);
      const matchesDate = !dateFilter || rowDate === dateFilter;
      const matchesSource =
        !sourceFilter || String(row.sourceLocation || "").toLowerCase().includes(sourceFilter);
      const matchesDestination =
        !destinationFilter ||
        String(row.destinationLocation || "").toLowerCase().includes(destinationFilter);

      return matchesDate && matchesSource && matchesDestination;
    });
  }, [filters, rows]);

  if (!asset) {
    return (
      <div className="asset-audit-page">
        <Link className="asset-audit-back" to="/assets">
          {"<-"} Back to Asset Inventory
        </Link>
        <h1>Asset was not found.</h1>
      </div>
    );
  }

  return (
    <div className="asset-audit-page">
      <Link className="asset-audit-back" to="/assets">
        {"<-"} Back to Asset Inventory
      </Link>

      <div className="asset-audit-header">
        <div>
          <span>Audit Trail</span>
          <h1>{asset.assetId || "-"} - {asset.deviceName || "Asset"}</h1>
          <p>Complete device history: purchase, stock, transfer, repair, damage, lost, status, and current location.</p>
        </div>
      </div>

      <div className="asset-audit-stats">
        <div>
          <span>Current Location</span>
          <strong>{asset.location || "Main Stock"}</strong>
          <p>Latest saved location</p>
        </div>
        <div>
          <span>Current Status</span>
          <strong>{asset.status || "In Stock"}</strong>
          <p>Latest asset status</p>
        </div>
        <div>
  <span>Current Quantity</span>

  <strong className="asset-audit-quantity">
    {money(asset.quantity)}
    <small>
      {asset.purchaseUnit ||
        asset.unit ||
        asset.quantityUnit ||
        asset.measurementUnit ||
        "Piece"}
    </small>
  </strong>

  <p>Current asset quantity</p>
</div>
        <div>
          <span>Audit Records</span>
          <strong>{rows.length}</strong>
          <p>Total audit events</p>
        </div>
      </div>

      <section className="asset-audit-card">
        <div className="asset-audit-card-header">
          <h3>Device Audit Trail</h3>
          <p>Records include purchase, stock entry, tower/customer transfer, installation, repair, damage, lost, status and specification changes.</p>
        </div>

        <div className="asset-audit-filters">
          <label>
            Date
            <input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters((previous) => ({ ...previous, date: event.target.value }))}
            />
          </label>
          <label>
            Issued from
            <input
              value={filters.source}
              onChange={(event) => setFilters((previous) => ({ ...previous, source: event.target.value }))}
              placeholder="Filter source..."
            />
          </label>
          <label>
            Receiver
            <input
              value={filters.destination}
              onChange={(event) => setFilters((previous) => ({ ...previous, destination: event.target.value }))}
              placeholder="Filter receiver..."
            />
          </label>
        </div>

        <div className="asset-audit-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th>Reference</th>
                <th>Issued from</th>
                <th>Issued to / Current Location</th>
                <th>Quantity</th>
                <th>Previous Status</th>
                <th>New Status</th>
                <th>Responsible</th>
                <th>Note</th>
                <th>Lock</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  className={[
                    row.isCurrentLocation ? "asset-audit-current-row" : "",
                    sourceRowClass(row.sourceLocation),
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td>{formatDateTime(row.date, row.createdAt)}</td>
                  <td>
                    <span className="asset-audit-event">{row.auditEvent}</span>
                  </td>
                  <td>{row.referenceNumber}</td>
                  <td>{row.sourceLocation}</td>
                  <td>{row.destinationLocation}</td>
                  <td>{row.quantity}</td>
                  <td>{row.previousStatus}</td>
                  <td>{row.newStatus}</td>
                  <td>{row.responsibleUser}</td>
                  <td>{row.note}</td>
                  <td>{row.locked ? "Locked" : "-"}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan="11" className="asset-audit-empty">
                    No audit event has been recorded for this asset yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
