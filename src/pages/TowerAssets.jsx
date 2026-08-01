import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import TablePagination from "../components/TablePagination";
import { useTablePagination } from "../hooks/useTablePagination";
import { formatDateTime } from "../utils/afghanDate";
import { buildTowerInsights, sumTowerRows } from "../utils/towerInsights";
import "./TowerAssets.css";

const emptyForm = {
  towerName: "",
  towerLocation: "",
  issueDate: "",
  installationStatus: "Pending",
  responsiblePerson: "",
  installedBy: "",
  notes: "",
};

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6l1 15h10l1-15" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TowerAssets() {
  const [towerAssets, setTowerAssets] = useJsonCollection("towerAssets");
  const [assets] = useJsonCollection("assets");
  const [deviceTransfers] = useJsonCollection("deviceTransfers");
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [search, setSearch] = useState("");

const [assetSearch, setAssetSearch] = useState("");
const [assetTrackingFilter, setAssetTrackingFilter] = useState("All");
const [selectedAssets, setSelectedAssets] = useState([]);
const [assetDetailRecord, setAssetDetailRecord] = useState(null);

  const [openAction, setOpenAction] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const filteredTowerAssets = towerAssets
    .map((record, originalIndex) => ({ ...record, originalIndex }))
    .filter((record) => {
      const keyword = search.toLowerCase();

      return (
        (record.towerName || "").toLowerCase().includes(keyword) ||
        (record.towerLocation || "").toLowerCase().includes(keyword) ||
        (record.deviceName || "").toLowerCase().includes(keyword) ||
        (record.assetId || "").toLowerCase().includes(keyword) ||
        (record.category || "").toLowerCase().includes(keyword) ||
        (record.macAddress || "").toLowerCase().includes(keyword) ||
        (record.serialNumber || "").toLowerCase().includes(keyword) ||
        (record.installationStatus || "").toLowerCase().includes(keyword)
      );
    });

const getTrackingMode = (asset) =>
  String(asset?.identityTracking || "").toLowerCase().includes("individual")
    ? "Individual"
    : "Single Model";

const getAssetUnit = (asset) =>
  asset?.purchaseUsageUnit || asset?.purchaseUnit || asset?.usageUnit || "Piece";

const assetKey = (asset) =>
  String(
    asset?.selectionKey ||
      asset?.identityRecordId ||
      asset?.id ||
      asset?.assetId ||
      asset?.serialNumber ||
      asset?.macAddress ||
      ""
  );

const getRecordQuantity = (asset) => Number(asset?.quantity || asset?.assignedQuantity || 0);

const normalizeTowerAsset = (asset) => ({
  id: asset.id || Date.now() + Math.random(),
  selectionKey: asset.selectionKey || assetKey(asset),
  sourceAssetRecordId: asset.sourceAssetRecordId || asset.sourceAssetId || asset.id || "",
  identityRecordId: asset.identityRecordId || "",
  identityTracking: asset.identityTracking || getTrackingMode(asset),
  assetId: asset.assetId || "",
  deviceName: asset.deviceName || "",
  category: asset.category || "",
  brand: asset.brand || "",
  model: asset.model || "",
  macAddress: asset.macAddress || "",
  serialNumber: asset.serialNumber || "",
  status: asset.status || "",
  location: asset.location || "",
  purchaseDate: asset.purchaseDate || "",
  supplierName: asset.supplierName || "",
  unitPrice: Number(asset.unitPrice || 0),
  purchaseUsageUnit: getAssetUnit(asset),
  availableQuantity: Number(asset.availableQuantity || 0),
  quantity: Math.max(Number(asset.quantity || 1), 0),
  notes: asset.notes || "",
});

const getRecordAssets = (record) => {
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
        status: record.status || "",
      },
    ];
  }

  return [];
};

const isAssetAssignedToAnotherTower = (asset) => {
  const key = assetKey(asset);
  if (!key) return false;

  if (asset.identityTracking === "Single Model") {
    return false;
  }

  return towerAssets.some((record, index) => {
    if (editIndex !== null && index === editIndex) return false;

    return getRecordAssets(record).some(
      (recordAsset) => assetKey(recordAsset) === key
    );
  });
};

const keyOf = (value) => String(value || "").trim().toLowerCase();

const assignedQuantityForSingleAsset = (asset) => {
  const key = String(asset.assetId || asset.id || "");

  return towerAssets.reduce((sum, record, index) => {
    if (editIndex !== null && index === editIndex) return sum;

    return (
      sum +
      getRecordAssets(record).reduce((recordSum, recordAsset) => {
        const sameAsset =
          String(recordAsset.assetId || recordAsset.sourceAssetRecordId || "") === key ||
          String(recordAsset.sourceAssetRecordId || "") === String(asset.id || "");

        if (!sameAsset || getTrackingMode(recordAsset) !== "Single Model") {
          return recordSum;
        }

        return recordSum + getRecordQuantity(recordAsset);
      }, 0)
    );
  }, 0);
};

const buildAvailableAssetOptions = () => {
  const options = [];

  assets.forEach((asset) => {
    const trackingMode = getTrackingMode(asset);
    const unit = getAssetUnit(asset);
    const assetQuantity = Number(asset.quantity || 0);

    if (assetQuantity <= 0) {
      return;
    }

    if (assetTrackingFilter !== "All" && assetTrackingFilter !== trackingMode) {
      return;
    }

    if (trackingMode === "Individual") {
      const identityRecords = Array.isArray(asset.identityRecords)
        ? asset.identityRecords
        : [];

      identityRecords.forEach((record, index) => {
        const option = {
          ...asset,
          ...record,
          id: record.id || `${asset.assetId || asset.id}-identity-${index}`,
          selectionKey: `${asset.assetId || asset.id}-identity-${record.id || index}`,
          sourceAssetRecordId: asset.id || asset.assetId || "",
          identityRecordId: record.id || "",
          identityTracking: "Individual",
          assetId: asset.assetId || "",
          deviceName: asset.deviceName || "",
          category: asset.category || "",
          brand: asset.brand || "",
          status: record.status || asset.status || "In Stock",
          purchaseUsageUnit: unit,
          availableQuantity: 1,
          quantity: 1,
          unitPrice: Number(record.unitPrice || asset.unitPrice || 0),
        };

        if (!isAssetAssignedToAnotherTower(option)) {
          options.push(option);
        }
      });

      if (identityRecords.length === 0 && assetQuantity > 0) {
        options.push({
          ...asset,
          selectionKey: `${asset.assetId || asset.id}-individual-fallback`,
          sourceAssetRecordId: asset.id || asset.assetId || "",
          identityTracking: "Individual",
          purchaseUsageUnit: unit,
          availableQuantity: assetQuantity,
          quantity: 1,
        });
      }

      return;
    }

    const availableQuantity =
      assetQuantity - assignedQuantityForSingleAsset(asset);

    if (availableQuantity <= 0) {
      return;
    }

    options.push({
      ...asset,
      selectionKey: `${asset.assetId || asset.id}-single`,
      sourceAssetRecordId: asset.id || asset.assetId || "",
      identityTracking: "Single Model",
      purchaseUsageUnit: unit,
      availableQuantity,
      quantity: Math.min(1, availableQuantity),
    });
  });

  return options;
};

const filteredAssets = buildAvailableAssetOptions().filter((asset) => {
  const keyword = assetSearch.toLowerCase();

  return (
    (asset.assetId || "").toLowerCase().includes(keyword) ||
    (asset.deviceName || "").toLowerCase().includes(keyword) ||
    (asset.category || "").toLowerCase().includes(keyword) ||
    (asset.brand || "").toLowerCase().includes(keyword) ||
    (asset.model || "").toLowerCase().includes(keyword) ||
    (asset.macAddress || "").toLowerCase().includes(keyword) ||
    (asset.serialNumber || "").toLowerCase().includes(keyword) ||
    (asset.identityTracking || "").toLowerCase().includes(keyword) ||
    (asset.status || "").toLowerCase().includes(keyword)
  );
});

  const towerPagination = useTablePagination(filteredTowerAssets, search);

  const towerInsights = useMemo(
    () => buildTowerInsights({ towerAssets, assets, deviceTransfers }),
    [towerAssets, assets, deviceTransfers]
  );
  const categoryAssetTotal = sumTowerRows(towerInsights.currentRows);
  const activeTowers = towerInsights.towerGroups.filter((tower) => tower.type === "Active").length;
  const inactiveTowers = towerInsights.towerGroups.filter((tower) => tower.type === "Inactive").length;
  const incomingTransferTotal = sumTowerRows(towerInsights.incomingRows);
  const outgoingTransferTotal = sumTowerRows(towerInsights.outgoingRows);
  const wastedTowerAssetTotal = sumTowerRows(towerInsights.wastedRows);
  const repairTowerAssetTotal = sumTowerRows(towerInsights.repairRows);

  const towerAssetCounts = useMemo(() => {
    const counts = new Map();

    towerAssets.forEach((tower) => {
      const towerKeys = [
        tower.id,
        tower.towerName,
        `${tower.towerName || ""} - ${tower.towerLocation || ""}`,
      ]
        .filter(Boolean)
        .map(keyOf);
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
          transfer.destinationType === "Tower" &&
          towerKeys.some(
            (key) =>
              keyOf(transfer.destinationRecordId) === key ||
              keyOf(transfer.destinationLocation).includes(key)
          );
        const sourceMatches =
          transfer.sourceType === "Tower" &&
          towerKeys.some(
            (key) =>
              keyOf(transfer.sourceRecordId) === key ||
              keyOf(transfer.sourceLocation).includes(key)
          );

        if (!destinationMatches && !sourceMatches) return;

        const assetKey = [
          transfer.assetRecordId || transfer.assetId,
          transfer.unitRecordId || "bulk",
        ].join("::");
        const quantity = Number(transfer.quantity || 0) * (destinationMatches ? 1 : -1);
        grouped.set(assetKey, Number(grouped.get(assetKey) || 0) + quantity);
      });

      const transferCount = Array.from(grouped.values()).filter((quantity) => quantity > 0).length;
      counts.set(String(tower.id || tower.towerName), transferCount || getRecordAssets(tower).length);
    });

    return counts;
  }, [deviceTransfers, towerAssets]);

const resetForm = () => {
  setFormData(emptyForm);
  setEditIndex(null);
  setSelectedAssets([]);
  setAssetSearch("");
  setAssetTrackingFilter("All");
};

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


const toggleSelectedAsset = (asset) => {
  const key = assetKey(asset);

  const alreadySelected = selectedAssets.some(
    (item) => assetKey(item) === key
  );

  if (alreadySelected) {
    setSelectedAssets(
      selectedAssets.filter((item) => assetKey(item) !== key)
    );
    return;
  }

  if (isAssetAssignedToAnotherTower(asset)) {
    notify("This asset is already assigned to another tower.", "error");
    return;
  }

  setSelectedAssets([
    ...selectedAssets,
    {
      ...asset,
      quantity:
        asset.identityTracking === "Single Model"
          ? Math.min(Number(asset.quantity || 1), Number(asset.availableQuantity || 1))
          : 1,
    },
  ]);
};

// const isAssetSelected = (asset) => {
//   const key = assetKey(asset);

//   return selectedAssets.some((item) => assetKey(item) === key);
// };

const isAssetSelected = (asset) => {
  const key = assetKey(asset);

  return selectedAssets.some((item) => {
    return String(assetKey(item)) === String(key);
  });
};

const updateSelectedAssetQuantity = (asset, value) => {
  const key = assetKey(asset);
  const availableQuantity = Number(asset.availableQuantity || 0);
  const nextQuantity =
    value === "" ? "" : Math.min(Math.max(Number(value || 0), 0), availableQuantity);

  setSelectedAssets((previous) =>
    previous.map((item) =>
      assetKey(item) === key
        ? {
            ...item,
            quantity: nextQuantity,
          }
        : item
    )
  );
};

  const towerDeviceExists = (data) => {
    return towerAssets.some((record, index) => {
      if (editIndex !== null && index === editIndex) return false;

      const sameAssetId =
        data.assetId &&
        record.assetId &&
        data.assetId.trim().toLowerCase() === record.assetId.trim().toLowerCase();

      const sameMac =
        data.macAddress &&
        record.macAddress &&
        data.macAddress.trim().toLowerCase() === record.macAddress.trim().toLowerCase();

      const sameSerial =
        data.serialNumber &&
        record.serialNumber &&
        data.serialNumber.trim().toLowerCase() === record.serialNumber.trim().toLowerCase();

      return sameAssetId || sameMac || sameSerial;
    });
  };

const handleSubmit = async (event) => {
  event.preventDefault();

  const currentRecord = editIndex !== null ? towerAssets[editIndex] : null;

  const cleanData = {
    id: currentRecord?.id || Date.now(),
    towerName: formData.towerName.trim(),
    towerLocation: formData.towerLocation.trim(),
    issueDate: currentRecord?.issueDate || new Date().toISOString(),
    installationStatus: formData.installationStatus,
    responsiblePerson: formData.responsiblePerson.trim(),
    installedBy: currentRecord?.installedBy || "",
    notes: formData.notes.trim(),
    assets: currentRecord?.assets || [],
    assetCount: currentRecord?.assetCount || 0,
    createdAt: currentRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (editIndex !== null) {
    const updatedRecords = [...towerAssets];
    updatedRecords[editIndex] = cleanData;

    const saved = await setTowerAssets(updatedRecords);

    if (saved) {
      notify("Tower asset record updated successfully.");
      closeModal();
    }

    return;
  }

  const saved = await setTowerAssets([...towerAssets, cleanData]);

  if (saved) {
    notify("Tower asset record saved successfully.");
    closeModal();
  }
};

const openEditModal = (index) => {
  const record = towerAssets[index];

  setEditIndex(index);

  setFormData({
    ...emptyForm,
    towerName: record.towerName || "",
    towerLocation: record.towerLocation || "",
    issueDate: record.issueDate || "",
    installationStatus: record.installationStatus || "Pending",
    responsiblePerson: record.responsiblePerson || "",
    installedBy: record.installedBy || "",
    notes: record.notes || "",
  });

  setSelectedAssets(getRecordAssets(record));
  setAssetSearch("");
  setShowModal(true);
  setOpenAction(null);
};

  const openDeleteModal = (index) => {
    setDeleteIndex(index);
    setDeleteModalOpen(true);
    setOpenAction(null);
  };

  const cancelDelete = () => {
    setDeleteIndex(null);
    setDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    if (deleteIndex === null) return;

    const saved = await setTowerAssets(
      towerAssets.filter((_, index) => index !== deleteIndex)
    );

    if (saved) {
      notify("Tower asset deleted successfully.");
      setDeleteIndex(null);
      setDeleteModalOpen(false);
    }
  };

  const toggleActionMenu = (event, index) => {
    const rect = event.currentTarget.getBoundingClientRect();

    setActionMenuPosition({
      top: rect.bottom + 8,
      left: rect.right - 160,
    });

    setOpenAction(openAction === index ? null : index);
  };

  const getStatusClass = (status) => {
    if (status === "Installed") return "tower-badge installed";
    if (status === "Pending") return "tower-badge pending";
    if (status === "Maintenance") return "tower-badge maintenance";
    if (status === "Removed") return "tower-badge removed";
    return "tower-badge";
  };

  return (
    <div className="tower-page">
      <div className="tower-header">
        <div>
          <h1>Tower</h1>
          <p>Record devices issued to towers and track installation status.</p>
        </div>

        <button type="button" className="tower-add-btn" onClick={openCreateModal}>
          + Add Tower
        </button>
      </div>

      <div className="tower-stats">
        <button type="button" className="tower-stat-card tower-stat-button tower-wide-stat" onClick={() => navigate("/tower-assets/insights/categories")}>
          <span>Total Assets</span>
          <strong>{categoryAssetTotal.toLocaleString("en-US")}</strong>
          <div className="tower-category-mini-list">
            {towerInsights.categoryGroups.slice(0, 5).map((group) => (
              <p key={group.category}><b>{group.category}</b> {sumTowerRows(group.rows).toLocaleString("en-US")}</p>
            ))}
            {towerInsights.categoryGroups.length > 5 && (
              <p>+ {towerInsights.categoryGroups.length - 5} more categories</p>
            )}
          </div>
        </button>

        <button type="button" className="tower-stat-card tower-stat-button" onClick={() => navigate("/tower-assets/insights/towers")}>
          <span>Active / Inactive Towers</span>
          <strong>{activeTowers + inactiveTowers}</strong>
          <p>{activeTowers} active, {inactiveTowers} inactive</p>
        </button>

        <button type="button" className="tower-stat-card tower-stat-button" onClick={() => navigate("/tower-assets/insights/incoming")}>
          <span>Transfers To Towers</span>
          <strong>{incomingTransferTotal.toLocaleString("en-US")}</strong>
          <p>Assets transferred into towers</p>
        </button>

        <button type="button" className="tower-stat-card tower-stat-button" onClick={() => navigate("/tower-assets/insights/outgoing")}>
          <span>Transfers From Towers</span>
          <strong>{outgoingTransferTotal.toLocaleString("en-US")}</strong>
          <p>Assets sent from towers to other places</p>
        </button>

        <button type="button" className="tower-stat-card tower-stat-button" onClick={() => navigate("/tower-assets/insights/wasted")}>
          <span>Wasted Tower Assets</span>
          <strong>{wastedTowerAssetTotal.toLocaleString("en-US")}</strong>
          <p>Wasted, damaged, or lost from towers</p>
        </button>

        <button type="button" className="tower-stat-card tower-stat-button" onClick={() => navigate("/tower-assets/insights/repair")}>
          <span>Tower Assets In Repair</span>
          <strong>{repairTowerAssetTotal.toLocaleString("en-US")}</strong>
          <p>Repair and maintenance assets</p>
        </button>
      </div>

      <div className="tower-table-card">
        <div className="tower-table-header">
          <div>
            <h3>Tower Asset List</h3>
            <p>All devices assigned or issued to towers</p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tower asset..."
          />
        </div>

        <div className="tower-table-wrap">
          <table>
            <thead>
              <tr>
  <th>Tower Name</th>
  <th>Tower Location</th>
  <th>Assets</th>
  <th>Issue Date</th>
  <th>Installation Status</th>
  <th>Actions</th>
</tr>
            </thead>

            <tbody>
  {towerPagination.pageItems.map((record) => {
    const index = record.originalIndex;
    const recordAssetCount =
      towerAssetCounts.get(String(record.id || record.towerName)) ||
      getRecordAssets(record).length;

    return (
      <tr key={record.id || index}>
        <td className="tower-strong">{record.towerName || "-"}</td>

        <td>{record.towerLocation || "-"}</td>

        <td>
          <span className="tower-assets-count">
            {recordAssetCount} asset{recordAssetCount === 1 ? "" : "s"}
          </span>
        </td>

        <td>
          {formatDateTime(record.issueDate, record.createdAt || record.updatedAt)}
        </td>

        <td>
          <span className={getStatusClass(record.installationStatus)}>
            {record.installationStatus || "Unknown"}
          </span>
        </td>

        <td>
          <div className="tower-action-cell">
            <button
              type="button"
              className="tower-action-btn"
              onClick={(event) => toggleActionMenu(event, index)}
            >
              ⋮
            </button>

            {openAction === index && (
              <div
                className="tower-action-menu"
                style={{
                  top: `${actionMenuPosition.top}px`,
                  left: `${actionMenuPosition.left}px`,
                }}
              >

                {false && <button
                    type="button"
                  >
                    <span>↔</span>
                    <span>Transfer Asset</span>
                  </button>}
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/tower-assets/${record.id}/details`);
                    setOpenAction(null);
                  }}
                >
                  <InfoIcon />
                  <span>Full Detail</span>
                </button>

                <button type="button" onClick={() => openEditModal(index)}>
                  <EditIcon />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  className="danger-action"
                  onClick={() => openDeleteModal(index)}
                >
                  <TrashIcon />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  })}

  {filteredTowerAssets.length === 0 && (
    <tr>
      <td colSpan="7" className="tower-empty">
        No tower asset has been registered yet.
      </td>
    </tr>
  )}
</tbody>
          </table>
        </div>

        <TablePagination
          page={towerPagination.page}
          totalPages={towerPagination.totalPages}
          setPage={towerPagination.setPage}
          totalItems={filteredTowerAssets.length}
          pageSize={towerPagination.pageSize}
          setPageSize={towerPagination.setPageSize}
        />
      </div>

      {showModal && (
        <div className="tower-modal-backdrop">
          <div className="tower-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tower-modal-header">
              <div>
                <h3>{editIndex !== null ? "Edit Tower" : "Add Tower"}</h3>
                <p>Enter tower, and installation information.</p>
              </div>

              <button type="button" className="tower-close-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="tower-form-grid">
                <div className="tower-form-group">
                  <label>Tower Name</label>
                  <input
                    name="towerName"
                    value={formData.towerName}
                    onChange={handleChange}
                    placeholder="Example: Tower A"
                  />
                </div>

                <div className="tower-form-group">
                  <label>Tower Location</label>
                  <input
                    name="towerLocation"
                    value={formData.towerLocation}
                    onChange={handleChange}
                    placeholder="Example: Kabul, District 5"
                  />
                </div>

                <div className="tower-form-group">
                  <label>Installation Status</label>
                  <select
                    name="installationStatus"
                    value={formData.installationStatus}
                    onChange={handleChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Installed">Installed</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Removed">Removed</option>
                  </select>
                </div>

                <div className="tower-form-group">
                  <label>Responsible Person</label>
                  <input
                    name="responsiblePerson"
                    value={formData.responsiblePerson}
                    onChange={handleChange}
                    placeholder="Example: Ahmad"
                  />
                </div>

                <div className="tower-form-group tower-form-full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional tower asset notes..."
                  />
                </div>
              </div>

              <div className="tower-modal-actions">
                <button type="button" className="tower-cancel-btn" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="tower-save-btn">
                  {editIndex !== null ? "Save Changes" : "Save Tower Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {false && (
  <div className="tower-detail-backdrop" onClick={() => setDetailRecord(null)}>
    <div className="tower-detail-modal" onClick={(event) => event.stopPropagation()}>
      <div className="tower-detail-header">
        <div>
          <h3>Tower Asset Full Detail</h3>
          <p>Complete tower information and all assets used in this tower.</p>
        </div>

        <button type="button" onClick={() => setDetailRecord(null)}>
          ×
        </button>
      </div>

      <div className="tower-detail-grid">
        <div>
          <span>Tower Name</span>
          <strong>{detailRecord.towerName || "-"}</strong>
        </div>

        <div>
          <span>Tower Location</span>
          <strong>{detailRecord.towerLocation || "-"}</strong>
        </div>

        <div>
          <span>Issue Date</span>
          <strong>
            {formatDateTime(
              detailRecord.issueDate,
              detailRecord.createdAt || detailRecord.updatedAt
            )}
          </strong>
        </div>

        <div>
          <span>Installation Status</span>
          <strong>{detailRecord.installationStatus || "-"}</strong>
        </div>

        <div>
          <span>Responsible Person</span>
          <strong>{detailRecord.responsiblePerson || "-"}</strong>
        </div>

        <div>
          <span>Installed By</span>
          <strong>{detailRecord.installedBy || "-"}</strong>
        </div>
      </div>

      <div className="tower-detail-assets">
        <h4>Assets Used in This Tower</h4>

        <div className="tower-detail-assets-table">
          <table>
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Category</th>
                <th>Device Name</th>
                <th>Brand</th>
                <th>Model</th>
                <th>MAC Address</th>
                <th>Serial Number</th>
                <th>Responsible Person</th>
                <th>Received By</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {getRecordAssets(detailRecord).map((asset, index) => (
                <tr key={assetKey(asset) || index}>
                  <td>{asset.assetId || "-"}</td>
                  <td>{asset.category || "-"}</td>
                  <td title={`${asset.category || "-"} - ${asset.deviceName || "-"}`}>
                    {asset.category || "-"} - {asset.deviceName || "-"}
                  </td>
                  <td>{asset.brand || "-"}</td>
                  <td>{asset.model || "-"}</td>
                  <td>{asset.macAddress || "-"}</td>
                  <td>{asset.serialNumber || "-"}</td>
                  <td>{asset.responsiblePerson || asset.responsibleUser || detailRecord.responsiblePerson || "-"}</td>
                  <td>{asset.receivedBy || detailRecord.receivedBy || "-"}</td>
                  <td>{asset.status || "-"}</td>
                </tr>
              ))}

              {getRecordAssets(detailRecord).length === 0 && (
                <tr>
                  <td colSpan="10" className="tower-empty">
                    No asset has been linked with this tower.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="tower-detail-notes">
        <span>Notes</span>
        <p>{detailRecord.notes || "No notes have been added for this tower asset."}</p>
      </div>

      <div className="tower-detail-actions">
        <button type="button" onClick={() => setDetailRecord(null)}>
          Close
        </button>
      </div>
    </div>
  </div>
)}

     {assetDetailRecord && (
  <div className="tower-detail-backdrop" onClick={() => setAssetDetailRecord(null)}>
    <div className="tower-detail-modal" onClick={(event) => event.stopPropagation()}>
      <div className="tower-detail-header">
        <div>
          <h3>Asset Full Detail</h3>
          <p>Complete selected asset information.</p>
        </div>

        <button type="button" onClick={() => setAssetDetailRecord(null)}>
          ×
        </button>
      </div>

      <div className="tower-detail-grid">
        <div><span>Asset ID</span><strong>{assetDetailRecord.assetId || "-"}</strong></div>
        <div><span>Device Name</span><strong>{assetDetailRecord.deviceName || "-"}</strong></div>
        <div><span>Category</span><strong>{assetDetailRecord.category || "-"}</strong></div>
        <div><span>Brand</span><strong>{assetDetailRecord.brand || "-"}</strong></div>
        <div><span>Model</span><strong>{assetDetailRecord.model || "-"}</strong></div>
        <div><span>MAC Address</span><strong>{assetDetailRecord.macAddress || "-"}</strong></div>
        <div><span>Serial Number</span><strong>{assetDetailRecord.serialNumber || "-"}</strong></div>
        <div><span>Quantity</span><strong>{assetDetailRecord.quantity || 1}</strong></div>
        <div>
          <span>Purchase Date</span>
          <strong>
            {formatDateTime(
              assetDetailRecord.purchaseDate,
              assetDetailRecord.createdAt || assetDetailRecord.updatedAt
            )}
          </strong>
        </div>
        <div><span>Supplier</span><strong>{assetDetailRecord.supplierName || "-"}</strong></div>
        <div><span>Location</span><strong>{assetDetailRecord.location || "-"}</strong></div>
        <div><span>Status</span><strong>{assetDetailRecord.status || "-"}</strong></div>
      </div>

      <div className="tower-detail-notes">
        <span>Notes</span>
        <p>{assetDetailRecord.notes || "No notes have been added for this asset."}</p>
      </div>

      <div className="tower-detail-actions">
        <button type="button" onClick={() => setAssetDetailRecord(null)}>
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {deleteModalOpen && (
        <div className="tower-delete-backdrop" onClick={cancelDelete}>
          <div className="tower-delete-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tower-delete-icon">
              <TrashIcon />
            </div>

            <h3>Delete Tower Asset</h3>

            <p>
              Are you sure you want to delete this tower asset? This action cannot be undone.
            </p>

            <div className="tower-delete-actions">
              <button type="button" className="tower-delete-cancel" onClick={cancelDelete}>
                Cancel
              </button>

              <button type="button" className="tower-delete-confirm" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TowerAssets;
