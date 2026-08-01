import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatDateTime } from "../utils/afghanDate";
import "./TowerAssetDetails.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");

const getRecordAssets = (record) => {
  if (Array.isArray(record?.assets)) return record.assets;
  return [];
};

const getAssetUnit = (asset) =>
  asset?.purchaseUsageUnit || asset?.purchaseUnit || asset?.usageUnit || "Piece";

const getTrackingMode = (asset) =>
  String(asset?.identityTracking || "").toLowerCase().includes("individual")
    ? "Individual"
    : "Single Model";

export default function TowerAssetDetails() {
  const { towerId } = useParams();
  const navigate = useNavigate();
  const [towerAssets] = useJsonCollection("towerAssets");
  const [assets] = useJsonCollection("assets");
  const [deviceTransfers] = useJsonCollection("deviceTransfers");
  const [showTowerInfo, setShowTowerInfo] = useState(false);
  const [assetFilters, setAssetFilters] = useState({
    date: "",
    source: "",
    destination: "",
  });

  const towerRecord = towerAssets.find(
    (record) => String(record.id || record.towerName) === String(towerId)
  );

  const towerKeys = useMemo(() => {
    if (!towerRecord) return [];

    return [
      towerRecord.id,
      towerRecord.towerName,
      `${towerRecord.towerName || ""} - ${towerRecord.towerLocation || ""}`,
    ]
      .filter(Boolean)
      .map(String);
  }, [towerRecord]);

  const transferMatchesTower = (transfer, side) =>
    towerKeys.some(
      (key) =>
        String(transfer[`${side}RecordId`] || "") === key ||
        String(transfer[`${side}Location`] || "").includes(key)
    );

  const currentAssets = useMemo(() => {
    if (!towerRecord) return [];

    const grouped = new Map();

    deviceTransfers.forEach((transfer) => {
      if (
        transfer.isSummaryRecord ||
        transfer.summaryType ||
        !Number(transfer.quantity || 0) ||
        !(transfer.assetRecordId || transfer.assetId || transfer.unitRecordId)
      ) {
        return;
      }

      const destinationMatches =
        transfer.destinationType === "Tower" && transferMatchesTower(transfer, "destination");
      const sourceMatches =
        transfer.sourceType === "Tower" && transferMatchesTower(transfer, "source");

      if (!destinationMatches && !sourceMatches) return;

      const parentAsset =
        assets.find(
          (asset) =>
            String(asset.id || "") === String(transfer.assetRecordId || "") ||
            String(asset.assetId || "") === String(transfer.assetId || "")
        ) || {};
      const key = [
        transfer.assetRecordId || transfer.assetId,
        transfer.unitRecordId || "bulk",
      ].join("::");
      const previous = grouped.get(key) || {
        ...parentAsset,
        assetId: transfer.assetId || parentAsset.assetId || "",
        deviceName: transfer.deviceName || parentAsset.deviceName || "",
        category: transfer.category || parentAsset.category || "",
        identityTracking: transfer.trackingType || parentAsset.identityTracking || "",
        model: transfer.model || parentAsset.model || "",
        macAddress: transfer.macAddress || parentAsset.macAddress || "",
        serialNumber: transfer.serialNumber || parentAsset.serialNumber || "",
        unitPrice: Number(parentAsset.unitPrice || 0),
        purchaseUsageUnit: transfer.unit || getAssetUnit(parentAsset),
        status: transfer.newStatus || "At Tower",
        responsibleUser: transfer.responsibleUser || "",
        responsiblePerson: transfer.responsiblePerson || transfer.responsibleUser || "",
        receivedBy: transfer.receivedBy || "",
        quantity: 0,
      };

      const delta = Number(transfer.quantity || 0) * (destinationMatches ? 1 : -1);
      grouped.set(key, {
        ...previous,
        quantity: Number(previous.quantity || 0) + delta,
        status: destinationMatches ? transfer.newStatus || "At Tower" : previous.status,
      });
    });

    const assignedAssets = getRecordAssets(towerRecord);

    return [
      ...Array.from(grouped.values()).filter((asset) => Number(asset.quantity || 0) > 0),
      ...assignedAssets,
    ];
  }, [assets, deviceTransfers, towerKeys, towerRecord]);

  const towerAssetRows = useMemo(() => {
    if (!towerRecord) return [];

    const transferRows = deviceTransfers
      .filter((transfer) => {
        if (
          transfer.isSummaryRecord ||
          transfer.summaryType ||
          !Number(transfer.quantity || 0) ||
          !(transfer.assetRecordId || transfer.assetId || transfer.unitRecordId)
        ) {
          return false;
        }

        return (
          (transfer.destinationType === "Tower" && transferMatchesTower(transfer, "destination")) ||
          (transfer.sourceType === "Tower" && transferMatchesTower(transfer, "source"))
        );
      })
      .map((transfer) => {
        const isOutgoing =
          transfer.sourceType === "Tower" && transferMatchesTower(transfer, "source");
        const parentAsset =
          assets.find(
            (asset) =>
              String(asset.id || "") === String(transfer.assetRecordId || "") ||
              String(asset.assetId || "") === String(transfer.assetId || "")
          ) || {};

        return {
          ...parentAsset,
          id: transfer.id || transfer.transferId,
          assetId: transfer.assetId || parentAsset.assetId || "",
          deviceName: transfer.deviceName || parentAsset.deviceName || "",
          category: transfer.category || parentAsset.category || "",
          identityTracking: transfer.trackingType || parentAsset.identityTracking || "",
          model: transfer.model || parentAsset.model || "",
          macAddress: transfer.macAddress || parentAsset.macAddress || "",
          serialNumber: transfer.serialNumber || parentAsset.serialNumber || "",
          purchaseUsageUnit: transfer.unit || getAssetUnit(parentAsset),
          quantity: Number(transfer.quantity || 0),
          sourceLocation: transfer.sourceLocation || "-",
          destinationLocation: transfer.destinationLocation || "-",
          responsibleUser: transfer.responsibleUser || "",
          responsiblePerson: transfer.responsiblePerson || transfer.responsibleUser || "",
          receivedBy: transfer.receivedBy || "",
          status: isOutgoing ? "Sent" : transfer.newStatus || "At Tower",
          direction: isOutgoing ? "outgoing" : "incoming",
          createdAt: transfer.createdAt || transfer.createdDate || transfer.transferDate || "",
          date: transfer.transferDate || transfer.date || transfer.createdAt || "",
        };
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

    if (transferRows.length) return transferRows;

    return getRecordAssets(towerRecord).map((asset, index) => ({
      ...asset,
      id: asset.id || `${asset.assetId || "asset"}-${index}`,
      sourceLocation: asset.sourceLocation || "Opening Balance",
      destinationLocation: towerRecord.towerName || "Tower",
      status: asset.status || "At Tower",
      direction: "incoming",
      date: asset.date || asset.issueDate || towerRecord.issueDate || towerRecord.createdAt || "",
    }));
  }, [assets, deviceTransfers, towerKeys, towerRecord]);

  const filteredTowerAssetRows = useMemo(() => {
    const dateFilter = assetFilters.date.trim();
    const sourceFilter = assetFilters.source.trim().toLowerCase();
    const destinationFilter = assetFilters.destination.trim().toLowerCase();

    return towerAssetRows.filter((asset) => {
      const rowDate = String(asset.date || asset.createdAt || "").slice(0, 10);
      const source = String(asset.sourceLocation || "").toLowerCase();
      const destination = String(asset.destinationLocation || "").toLowerCase();

      return (
        (!dateFilter || rowDate === dateFilter) &&
        (!sourceFilter || source.includes(sourceFilter)) &&
        (!destinationFilter || destination.includes(destinationFilter))
      );
    });
  }, [assetFilters, towerAssetRows]);

  if (!towerRecord) {
    return (
      <div className="tower-detail-page">
        <Link className="tower-detail-back" to="/tower-assets">
          ← Back to Tower Assets
        </Link>
        <h1>Tower asset record was not found.</h1>
      </div>
    );
  }

  return (
    <div className="tower-detail-page">
      <Link className="tower-detail-back" to="/tower-assets">
        ← Back to Tower Assets
      </Link>

      <div className="tower-detail-page-header">
        <div>
          <span>Tower Asset Full Detail</span>
          <h1>{towerRecord.towerName || "Tower"}</h1>
          <p>Current assets and installation information.</p>
        </div>

        <div className="tower-detail-page-actions">
          <button type="button" onClick={() => setShowTowerInfo((value) => !value)}>
            {showTowerInfo ? "Hide Tower Info" : "Show Tower Info"}
          </button>
        </div>
      </div>

      <div className="tower-detail-stat-grid">
        <div>
          <span>Current Assets</span>
          <strong>{currentAssets.length}</strong>
          <p>Asset records currently held by this tower</p>
        </div>
      </div>

      {showTowerInfo && (
        <section className="tower-detail-info-card">
          <div>
            <span>Tower Name</span>
            <strong>{towerRecord.towerName || "-"}</strong>
          </div>
          <div>
            <span>Tower Location</span>
            <strong>{towerRecord.towerLocation || "-"}</strong>
          </div>
          <div>
            <span>Issue Date</span>
            <strong>{formatDateTime(towerRecord.issueDate, towerRecord.createdAt)}</strong>
          </div>
          <div>
            <span>Installation Status</span>
            <strong>{towerRecord.installationStatus || "-"}</strong>
          </div>
          <div>
            <span>Responsible Person</span>
            <strong>{towerRecord.responsiblePerson || "-"}</strong>
          </div>
          <div>
            <span>Installed By</span>
            <strong>{towerRecord.installedBy || "-"}</strong>
          </div>
          <div>
            <span>Notes</span>
            <strong>{towerRecord.notes || "-"}</strong>
          </div>
        </section>
      )}

      <section className="tower-detail-assets-card">
        <div className="tower-detail-assets-header">
          <div>
            <h3>Current Assets With This Tower</h3>
            <p>Assets currently assigned or issued to this tower.</p>
          </div>
          <div className="tower-detail-assets-legend" aria-label="Tower asset row color guide">
            <span><i className="legend-dot incoming" /> Issued to (Tower)</span>
            <span><i className="legend-dot outgoing" /> Issued from (other sources)</span>
          </div>
        </div>

        <div className="tower-detail-assets-filters">
          <label>
            Date
            <input
              type="date"
              value={assetFilters.date}
              onChange={(event) =>
                setAssetFilters((previous) => ({ ...previous, date: event.target.value }))
              }
            />
          </label>
          <label>
            Issued from
            <input
              value={assetFilters.source}
              onChange={(event) =>
                setAssetFilters((previous) => ({ ...previous, source: event.target.value }))
              }
              placeholder="Filter source..."
            />
          </label>
          <label>
            Receiver
            <input
              value={assetFilters.destination}
              onChange={(event) =>
                setAssetFilters((previous) => ({ ...previous, destination: event.target.value }))
              }
              placeholder="Filter receiver..."
            />
          </label>
        </div>

        <div className="tower-detail-assets-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Asset ID</th>
                <th>Category</th>
                <th>Device Name</th>
                <th>Issued from</th>
                <th>Issued to</th>
                <th>Tracking</th>
                <th>Model</th>
                <th>MAC Address</th>
                <th>Serial Number</th>
                <th>Quantity</th>
                <th>Responsible Person</th>
                <th>Received By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTowerAssetRows.map((asset, index) => (
                <tr
                  key={asset.selectionKey || asset.id || `${asset.assetId}-${index}`}
                  className={`tower-detail-row-${asset.direction || "incoming"}`}
                >
                  <td>{formatDateTime(asset.date || asset.createdAt)}</td>
                  <td>{asset.assetId || "-"}</td>
                  <td>{asset.category || "-"}</td>
                  <td title={`${asset.category || "-"} - ${asset.deviceName || "-"}`}>
                    {asset.category || "-"} - {asset.deviceName || "-"}
                  </td>
                  <td>{asset.sourceLocation || "-"}</td>
                  <td>{asset.destinationLocation || "-"}</td>
                  <td>
                    <span
                      className={`tower-detail-tracking ${
                        getTrackingMode(asset) === "Individual" ? "individual" : "single"
                      }`}
                    >
                      {getTrackingMode(asset)}
                    </span>
                  </td>
                  <td>{asset.model || "-"}</td>
                  <td>{asset.macAddress || "-"}</td>
                  <td>{asset.serialNumber || "-"}</td>
                  <td>
                    {money(asset.quantity)} {getAssetUnit(asset)}
                  </td>
                  <td>{asset.responsiblePerson || asset.responsibleUser || "-"}</td>
                  <td>{asset.receivedBy || "-"}</td>
                  <td>{asset.status || "-"}</td>
                </tr>
              ))}

              {filteredTowerAssetRows.length === 0 && (
                <tr>
                  <td colSpan="14" className="tower-detail-empty">
                    No current asset was found for this tower.
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
