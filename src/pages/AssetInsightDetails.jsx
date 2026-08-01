import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatDateTime, todayDateValue } from "../utils/afghanDate";
import "./AssetFullInformation.css";

const today = () => todayDateValue();

function money(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function AssetInsightDetails() {
  const { assetId, insightType } = useParams();
  const [assets, setAssets, , assetsLoaded] = useJsonCollection("assets");
  const [movements, setMovements, , movementsLoaded] = useJsonCollection("assetMovements");
  const [filter, setFilter] = useState("All");
  const [customRange, setCustomRange] = useState({
    from: today(),
    to: today(),
  });
  const [openActionRow, setOpenActionRow] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const asset = assets.find(
    (item) =>
      String(item.id) === String(assetId) ||
      String(item.assetId) === String(assetId)
  );

  const assetKey = String(asset?.id || asset?.assetId || "");
  const currentQuantity = Number(asset?.quantity || 0);
  const mainStockQuantity =
    String(asset?.location || "").toLowerCase() === "main stock"
      ? currentQuantity
      : 0;
  const isIndividualAsset =
    String(asset?.identityTracking || "").toLowerCase().includes("individual") ||
    (asset?.identityRecords || []).length > 0;

  const availableIdentityRecords = (asset?.identityRecords || []).map(
    (record, index) => ({
      ...record,
      id: record.id || `identity-existing-${assetKey}-${index}`,
    })
  );

  const getRowImage = (record = {}, movement = {}) =>
    record.image || movement.assetImage || movement.image || asset?.assetImage || "";

  const handleEditRowImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditRow((previous) => ({
        ...previous,
        image: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const saveEditedRow = async (event) => {
    event.preventDefault();

    if (!editRow) return;

    if (editRow.identityRecordId) {
      const saved = await setAssets((previousAssets) =>
        previousAssets.map((item) => {
          const matches =
            String(item.id || item.assetId) === String(assetKey) ||
            String(item.assetId || "") === String(asset?.assetId || "");

          if (!matches) return item;

          const nextRecords = (item.identityRecords || []).map((record) =>
            String(record.id || "") === String(editRow.identityRecordId)
              ? {
                  ...record,
                  model: editRow.model.trim(),
                  macAddress: editRow.macAddress.trim(),
                  serialNumber: editRow.serialNumber.trim(),
                  image: editRow.image || "",
                  unitPrice: Number(editRow.amount || 0),
                  updatedAt: new Date().toISOString(),
                }
              : record
          );

          return {
            ...item,
            identityRecords: nextRecords,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      if (saved) setEditRow(null);
      return;
    }

    if (editRow.movementId) {
      const saved = await setMovements((previousMovements) =>
        previousMovements.map((movement) =>
          String(movement.id || "") === String(editRow.movementId)
            ? {
                ...movement,
                date: editRow.date,
                destinationName: editRow.destination,
                sourceName: editRow.source,
                transferStatus: editRow.status,
                paymentStatus: editRow.status,
                totalAmount: Number(editRow.amount || 0),
                updatedAt: new Date().toISOString(),
              }
            : movement
        )
      );

      if (saved) setEditRow(null);
    }
  };

  const deleteSelectedRow = async () => {
    if (!deleteRow) return;

    if (deleteRow.identityRecordId) {
      const saved = await setAssets((previousAssets) =>
        previousAssets.map((item) => {
          const matches =
            String(item.id || item.assetId) === String(assetKey) ||
            String(item.assetId || "") === String(asset?.assetId || "");

          if (!matches) return item;

          const nextRecords = (item.identityRecords || []).filter(
            (record) => String(record.id || "") !== String(deleteRow.identityRecordId)
          );

          return {
            ...item,
            quantity: Math.max(Number(item.quantity || 0) - Number(deleteRow.quantity || 1), 0),
            identityRecords: nextRecords,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      if (saved) setDeleteRow(null);
      return;
    }

    if (deleteRow.movementId) {
      const saved = await setMovements((previousMovements) =>
        previousMovements.filter(
          (movement) => String(movement.id || "") !== String(deleteRow.movementId)
        )
      );

      if (saved) setDeleteRow(null);
    }
  };

  const assetMovements = useMemo(() => {
    return movements
      .filter(
        (item) =>
          String(item.parentAssetId || "") === String(assetKey) ||
          String(item.assetRecordId || item.assetId) === String(assetKey) ||
          String(item.assetId) === String(asset?.assetId)
      )
      .sort((a, b) =>
        String(b.date || b.createdAt || "").localeCompare(
          String(a.date || a.createdAt || "")
        )
      );
  }, [movements, assetKey, asset?.assetId]);

  const totals = {
    balance: assetMovements
      .filter((item) => item.movementType === "Balance")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    purchase: assetMovements
      .filter((item) => item.movementType === "Purchase")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    waste: assetMovements
      .filter((item) => item.movementType === "Waste")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    transfer: assetMovements
      .filter((item) => item.movementType === "Transfer")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    purchaseValue: assetMovements
      .filter((item) => item.movementType === "Purchase")
      .reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0
      ),
  };

  const insightConfigs = {
    current: {
      title: "Current Quantity",
      description: "Current units recorded for this asset.",
      value: currentQuantity,
      movementTypes: [],
    },
    "main-stock": {
      title: "Main Stock Quantity",
      description: "Units currently available in Main Stock.",
      value: mainStockQuantity,
      movementTypes: [],
    },
    balance: {
      title: "Total Balance Added",
      description: "Units added from initial balance records.",
      value: totals.balance,
      movementTypes: ["Balance"],
    },
    purchase: {
      title: "Total Purchased",
      description: "Purchased units with purchase dates and details.",
      value: totals.purchase,
      movementTypes: ["Purchase"],
    },
    waste: {
      title: "Total Wasted",
      description: "Damaged, wasted, or disposed units.",
      value: totals.waste,
      movementTypes: ["Waste"],
    },
    transfer: {
      title: "Total Transferred",
      description: "Units moved to customers, towers, repair, or lost status.",
      value: totals.transfer,
      movementTypes: ["Transfer"],
    },
    "purchase-value": {
      title: "Total Purchase Value",
      description: "Total value of recorded purchase movements.",
      value: `${money(totals.purchaseValue)} AFN`,
      movementTypes: ["Purchase"],
    },
  };

  const config = insightConfigs[insightType] || insightConfigs.current;

  const dateInFilter = (dateValue) => {
    if (filter === "All") return true;
    const movementDate = new Date(dateValue || "");
    if (Number.isNaN(movementDate.getTime())) return false;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === "Today") return movementDate >= start;
    if (filter === "Weekly") {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() - 6);
      return movementDate >= weekStart;
    }
    if (filter === "Monthly") {
      return movementDate >= new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (filter === "Custom") {
      const from = new Date(customRange.from || "");
      const to = new Date(customRange.to || "");
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return true;
      to.setHours(23, 59, 59, 999);
      return movementDate >= from && movementDate <= to;
    }
    return true;
  };

  const expandMovementRows = (movement) => {
    const records = movement.identityRecords || [];
    if (isIndividualAsset && records.length > 0) {
      return records.map((record, index) => ({
        id: `${movement.id}-${record.id || index}`,
        movementId: movement.id,
        identityRecordId: record.id || "",
        date: movement.date || "",
        timeSource: movement.createdAt || movement.updatedAt || movement.date,
        movementType: movement.movementType || "",
        type: movement.transferType || movement.wasteReason || movement.paymentStatus || "Added",
        source: movement.sourceName || "-",
        destination: movement.destinationName || "-",
        quantity: 1,
        amount: Number(record.unitPrice || movement.unitPrice || asset?.unitPrice || 0),
        image: getRowImage(record, movement),
        model: record.model || "-",
        macAddress: record.macAddress || "-",
        serialNumber: record.serialNumber || "-",
        status: movement.transferStatus || movement.paymentStatus || "Completed",
      }));
    }

    return [
      {
        id: movement.id,
        movementId: movement.id,
        identityRecordId: "",
        date: movement.date || "",
        timeSource: movement.createdAt || movement.updatedAt || movement.date,
        movementType: movement.movementType || "",
        type: movement.transferType || movement.wasteReason || movement.paymentStatus || "Added",
        source: movement.sourceName || "-",
        destination: movement.destinationName || "-",
        quantity: Number(movement.quantity || 0),
        amount: Number(
          movement.totalAmount ||
            movement.estimatedLoss ||
            movement.trustAmount ||
            Number(movement.quantity || 0) * Number(movement.unitPrice || asset?.unitPrice || 0)
        ),
        image: getRowImage({}, movement),
        model: asset?.model || "-",
        macAddress: asset?.macAddress || "-",
        serialNumber: asset?.serialNumber || "-",
        status: movement.transferStatus || movement.paymentStatus || "Completed",
      },
    ];
  };

  const insightMovements = assetMovements
    .filter((movement) => dateInFilter(movement.date || movement.createdAt))
    .filter((movement) => {
      if (insightType === "current") return true;
      if (insightType === "main-stock") {
        return ["Balance", "Purchase"].includes(movement.movementType);
      }
      return config.movementTypes.includes(movement.movementType);
    });

  const rows =
    ["current", "main-stock"].includes(insightType) &&
    isIndividualAsset &&
    availableIdentityRecords.length > 0
      ? availableIdentityRecords.map((record, index) => ({
          id: record.id || index,
          movementId: "",
          identityRecordId: record.id || "",
          date: record.addedAt || "-",
          timeSource: record.addedAt || "",
          movementType: insightType === "main-stock" ? "Main Stock" : "Current",
          type: record.sourceType || "Available",
          source: record.sourceType || "-",
          destination: asset?.location || "Main Stock",
          quantity: 1,
          amount: Number(record.unitPrice || asset?.unitPrice || 0),
          image: getRowImage(record),
          model: record.model || "-",
          macAddress: record.macAddress || "-",
          serialNumber: record.serialNumber || "-",
          status: asset?.status || "In Stock",
        }))
      : insightMovements.flatMap(expandMovementRows);

  const chartData = Array.from(
    rows.reduce((map, row) => {
      const key = row.date && row.date !== "-" ? row.date : "No Date";
      const value = map.get(key) || { date: key, quantity: 0, amount: 0 };
      value.quantity += Number(row.quantity || 0);
      value.amount += Number(row.amount || 0);
      map.set(key, value);
      return map;
    }, new Map()).values()
  ).sort((a, b) => String(a.date).localeCompare(String(b.date)));

  if (!assetsLoaded || !movementsLoaded) {
    return <div className="page-loading">Loading asset calculation...</div>;
  }

  if (!asset) {
    return <div className="page-loading">Asset was not found.</div>;
  }

  return (
    <div className="asset-detail-page">
      <Link className="asset-detail-back" to={`/assets/${asset.assetId || asset.id}/details`}>
        ← Back to Asset Full Information
      </Link>

      <div className="asset-detail-header">
        <div>
          <span>Asset Calculation</span>
          <h1>{config.title}</h1>
          <p>
            {asset.assetId || "No Asset ID"} - {asset.deviceName || "Unnamed Asset"}.
            {config.description}
          </p>
        </div>
      </div>

      <div className="asset-insight-card">
        <div className="asset-insight-header">
          <div>
            <h3>{config.title}</h3>
            <p>{config.description}</p>
          </div>
          <div className="asset-insight-filters">
            {["All", "Today", "Weekly", "Monthly", "Custom"].map((item) => (
              <button
                type="button"
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {filter === "Custom" && (
          <div className="asset-insight-custom-range">
            <label>
              From
              <input
                type="date"
                value={customRange.from}
                onChange={(event) =>
                  setCustomRange((previous) => ({ ...previous, from: event.target.value }))
                }
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={customRange.to}
                onChange={(event) =>
                  setCustomRange((previous) => ({ ...previous, to: event.target.value }))
                }
              />
            </label>
          </div>
        )}

        <div className="asset-insight-summary">
          <div>
            <span>Selected Card Value</span>
            <strong>{config.value}</strong>
          </div>
          <div>
            <span>Total Quantity</span>
            <strong>{rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)}</strong>
          </div>
          <div>
            <span>Records</span>
            <strong>{rows.length}</strong>
          </div>
        </div>

        <div className="asset-insight-chart">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#111827" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="asset-insight-empty">No records found for this filter.</div>
          )}
        </div>

        <div className="asset-insight-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Movement</th>
                <th>Image</th>
                <th>Type</th>
                <th>Model</th>
                <th>MAC Address</th>
                <th>Serial Number</th>
                <th>Issued from</th>
                <th>Issued to</th>
                <th>Quantity</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDateTime(row.date, row.timeSource)}</td>
                  <td>{row.movementType || "-"}</td>
                  <td className="asset-insight-image-cell">
                    {row.image ? (
                      <img src={row.image} alt={row.model || "Asset"} />
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td>{row.type || "-"}</td>
                  <td>{row.model || "-"}</td>
                  <td>{row.macAddress || "-"}</td>
                  <td>{row.serialNumber || "-"}</td>
                  <td>{row.source || "-"}</td>
                  <td>{row.destination || "-"}</td>
                  <td>{row.quantity || 0}</td>
                  <td>{money(row.amount || 0)} AFN</td>
                  <td>{row.status || "-"}</td>
                  <td>
                    <div className="asset-movement-actions">
                      <button
                        type="button"
                        className="asset-movement-action-toggle"
                        aria-label="Open row actions"
                        aria-expanded={String(openActionRow) === String(row.id)}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenActionRow((previous) =>
                            String(previous) === String(row.id) ? "" : row.id
                          );
                        }}
                      >
                        <MoreVertical size={18} strokeWidth={2} />
                      </button>

                      {String(openActionRow) === String(row.id) && (
                        <div className="asset-insight-action-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setViewRow(row);
                              setOpenActionRow("");
                            }}
                          >
                            <Eye size={14} />
                            Full Information
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditRow({
                                ...row,
                                model: row.model === "-" ? "" : row.model,
                                macAddress: row.macAddress === "-" ? "" : row.macAddress,
                                serialNumber:
                                  row.serialNumber === "-" ? "" : row.serialNumber,
                                source: row.source === "-" ? "" : row.source,
                                destination:
                                  row.destination === "-" ? "" : row.destination,
                                status: row.status === "-" ? "" : row.status,
                              });
                              setOpenActionRow("");
                            }}
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="danger"
                            onClick={() => {
                              setDeleteRow(row);
                              setOpenActionRow("");
                            }}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan="13" className="asset-detail-empty">
                    No records found for this card.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewRow && (
        <div className="asset-detail-modal-backdrop">
          <div className="asset-detail-modal compact" onClick={(event) => event.stopPropagation()}>
            <div className="asset-detail-modal-header">
              <div>
                <h3>Record Full Information</h3>
                <p>{formatDateTime(viewRow.date, viewRow.timeSource)}</p>
              </div>
              <button type="button" onClick={() => setViewRow(null)}>
                ×
              </button>
            </div>

            <div className="asset-movement-detail-grid">
              <div><span>Movement</span><strong>{viewRow.movementType || "-"}</strong></div>
              <div><span>Type</span><strong>{viewRow.type || "-"}</strong></div>
              <div><span>Model</span><strong>{viewRow.model || "-"}</strong></div>
              <div><span>MAC Address</span><strong>{viewRow.macAddress || "-"}</strong></div>
              <div><span>Serial Number</span><strong>{viewRow.serialNumber || "-"}</strong></div>
              <div><span>Issued from</span><strong>{viewRow.source || "-"}</strong></div>
              <div><span>Issued to</span><strong>{viewRow.destination || "-"}</strong></div>
              <div><span>Quantity</span><strong>{viewRow.quantity || 0}</strong></div>
              <div><span>Amount</span><strong>{money(viewRow.amount || 0)} AFN</strong></div>
              <div><span>Status</span><strong>{viewRow.status || "-"}</strong></div>
            </div>

            {viewRow.image && (
              <div className="asset-unit-image-preview">
                <img src={viewRow.image} alt="Asset record" />
              </div>
            )}
          </div>
        </div>
      )}

      {editRow && (
        <div className="asset-detail-modal-backdrop">
          <div className="asset-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="asset-detail-modal-header">
              <div>
                <h3>Edit Record</h3>
                <p>{editRow.movementType || "Current"} record</p>
              </div>
              <button type="button" onClick={() => setEditRow(null)}>
                ×
              </button>
            </div>

            <form onSubmit={saveEditedRow}>
              <div className="asset-detail-form-grid">
                <label>
                  Date
                  <input
                    type="date"
                    value={String(editRow.date || "").slice(0, 10)}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, date: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Model
                  <input
                    value={editRow.model || ""}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, model: event.target.value }))
                    }
                  />
                </label>

                <label>
                  MAC Address
                  <input
                    value={editRow.macAddress || ""}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, macAddress: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Serial Number
                  <input
                    value={editRow.serialNumber || ""}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, serialNumber: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Issued from
                  <input
                    value={editRow.source || ""}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, source: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Issued to
                  <input
                    value={editRow.destination || ""}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, destination: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Amount
                  <input
                    type="number"
                    min="0"
                    value={editRow.amount || ""}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, amount: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Status
                  <input
                    value={editRow.status || ""}
                    onChange={(event) =>
                      setEditRow((previous) => ({ ...previous, status: event.target.value }))
                    }
                  />
                </label>

                <label>
                  Image
                  <div className="asset-balance-image-field">
                    <div>
                      {editRow.image ? <img src={editRow.image} alt="Preview" /> : <span>No Image</span>}
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleEditRowImageChange}
                    />
                    {editRow.image && (
                      <button
                        type="button"
                        onClick={() => setEditRow((previous) => ({ ...previous, image: "" }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </label>
              </div>

              <div className="asset-detail-modal-actions">
                <button type="button" onClick={() => setEditRow(null)}>
                  Cancel
                </button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteRow && (
        <div className="asset-detail-modal-backdrop">
          <div className="asset-detail-modal compact" onClick={(event) => event.stopPropagation()}>
            <div className="asset-detail-modal-header">
              <div>
                <h3>Delete Record</h3>
                <p>This record will be removed.</p>
              </div>
              <button type="button" onClick={() => setDeleteRow(null)}>
                ×
              </button>
            </div>

            <div className="asset-delete-warning">
              <strong>Are you sure you want to delete this record?</strong>
              <span>
                {deleteRow.movementType || "-"} / {deleteRow.model || "-"} / Quantity:{" "}
                {deleteRow.quantity || 0}
              </span>
            </div>

            <div className="asset-detail-modal-actions">
              <button type="button" onClick={() => setDeleteRow(null)}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={deleteSelectedRow}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetInsightDetails;
