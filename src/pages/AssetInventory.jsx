import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import TablePagination from "../components/TablePagination";
import { useTablePagination } from "../hooks/useTablePagination";
import {
  buildAssetInventoryInsights,
  sumAssetRows,
} from "../utils/assetInventoryInsights";
import "./AssetInventory.css";

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

function DetailIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

const emptyForm = {
  assetId: "",
  deviceName: "",
  category: "",
  brand: "",

  identityTracking: "Single Identity",
  model: "",
  macAddress: "",
  serialNumber: "",
  assetImage: "",

  purchaseUnit: "Piece",
  purchaseUsageUnit: "Piece",
  quantity: "0",
  unitPrice: "",
  alertQuantity: "",

  purchaseDate: "",
  supplierName: "",
  location: "Main Stock",
  status: "In Stock",
  notes: "",
};

function AssetInventory() {
  const [assets, setAssets] = useJsonCollection("assets");
  const [assetMovements, setAssetMovements] = useJsonCollection("assetMovements");
  const [deviceTransfers, setDeviceTransfers] = useJsonCollection("deviceTransfers");
  const [towerAssets, setTowerAssets] = useJsonCollection("towerAssets");
  const [towerAssetTransfers, setTowerAssetTransfers] = useJsonCollection("towerAssetTransfers");
  const [supplierPurchases, setSupplierPurchases] = useJsonCollection("supplierPurchases");
  const [customers] = useJsonCollection("customers");
  const [customerDeviceBuybacks, setCustomerDeviceBuybacks] = useJsonCollection("customerDeviceBuybacks");
  const [securityDeposits, setSecurityDeposits] = useJsonCollection("securityDeposits");
  const [deviceHistory, setDeviceHistory] = useJsonCollection("deviceHistory");
  const [customerDevices, setCustomerDevices] = useJsonCollection("customerDevices");
  const [transactions, setTransactions] = useJsonCollection("transactions");
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [search, setSearch] = useState("");
  const [openAction, setOpenAction] = useState(null);
const [actionMenuPosition, setActionMenuPosition] = useState({
  top: 0,
  left: 0,
});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

const defaultCategories = [
  "Router",
  "ONU / ONT",
  "Modem",
  "Switch",
  "Access Point",
  "Radio",
  "Antenna",
  "Power Supply",
  "UPS",
  "Battery",
  "Server",
  "Rack",
  "Fiber Cable",
  "Ethernet Cable",
  "SFP Module",
  "Media Converter",
  "PoE Adapter",
  "Tower Equipment",
  "Tools",
  "Office Equipment",
  "Computers",
  "Printers",
  "Vehicles",
];

const toggleActionMenu = (event, index) => {
  const rect = event.currentTarget.getBoundingClientRect();

  setActionMenuPosition({
    top: rect.bottom + 8,
    left: rect.right - 150,
  });

  setOpenAction(openAction === index ? null : index);
};

const [customCategories, setCustomCategories] = useJsonCollection("assetCategories");
const [categoryMode, setCategoryMode] = useState("select");
const [newCategory, setNewCategory] = useState("");
const [editingCategoryId, setEditingCategoryId] = useState(null);
const [editingCategoryName, setEditingCategoryName] = useState("");

  const filteredAssets = assets
    .map((asset, originalIndex) => ({ ...asset, originalIndex }))
    .filter((asset) => {
      const keyword = search.toLowerCase();

      return (
        (asset.assetId || "").toLowerCase().includes(keyword) ||
        (asset.deviceName || "").toLowerCase().includes(keyword) ||
        (asset.category || "").toLowerCase().includes(keyword) ||
        (asset.brand || "").toLowerCase().includes(keyword) ||
        (asset.model || "").toLowerCase().includes(keyword) ||
        (asset.macAddress || "").toLowerCase().includes(keyword) ||
        (asset.serialNumber || "").toLowerCase().includes(keyword) ||
        (asset.supplierName || "").toLowerCase().includes(keyword) ||
        (asset.status || "").toLowerCase().includes(keyword)
      );
    });

  const assetPagination = useTablePagination(filteredAssets, search);

  const money = (value) => Number(value || 0).toLocaleString("en-US");

const generateNextAssetId = () => {
  const maxNumber = assets.reduce((max, asset) => {
    const match = String(asset.assetId || "").match(/^AST-(\d+)$/i);

    if (!match) return max;

    const number = Number(match[1] || 0);
    return number > max ? number : max;
  }, 0);

  return `AST-${String(maxNumber + 1).padStart(4, "0")}`;
};

const handleGenerateAssetId = () => {
  const nextAssetId = generateNextAssetId();

  setFormData((previous) => ({
    ...previous,
    assetId: nextAssetId,
  }));

  notify(`Asset ID generated: ${nextAssetId}`);
};


const categoryOptions = [
  ...defaultCategories,
  ...customCategories
    .map((item) => item.name)
    .filter(Boolean)
    .filter((name) => !defaultCategories.includes(name)),
];

const handleCategoryChange = (event) => {
  const value = event.target.value;

  setFormData((previous) => ({
    ...previous,
    category: value,
  }));
};

const saveCustomCategory = async () => {
  const cleanCategory = newCategory.trim();

  if (!cleanCategory) {
    notify("Please enter a category name.", "error");
    return;
  }

  const alreadyExists = categoryOptions.some(
    (category) => category.toLowerCase() === cleanCategory.toLowerCase()
  );

  if (alreadyExists) {
    notify("This category already exists.", "error");
    return;
  }

  const saved = await setCustomCategories([
    ...customCategories,
    {
      id: Date.now(),
      name: cleanCategory,
      createdAt: new Date().toISOString(),
    },
  ]);

  if (!saved) return;

  setFormData((previous) => ({
    ...previous,
    category: cleanCategory,
  }));

  setNewCategory("");
  setCategoryMode("select");
  notify("Category saved successfully.");
};

const beginEditCustomCategory = (category) => {
  setEditingCategoryId(category.id);
  setEditingCategoryName(category.name || "");
};

const saveEditedCustomCategory = async (category) => {
  const cleanCategory = editingCategoryName.trim();

  if (!cleanCategory) {
    notify("Please enter a category name.", "error");
    return;
  }

  const alreadyExists = categoryOptions.some(
    (name) =>
      name.toLowerCase() === cleanCategory.toLowerCase() &&
      name.toLowerCase() !== String(category.name || "").toLowerCase()
  );

  if (alreadyExists) {
    notify("This category already exists.", "error");
    return;
  }

  const saved = await setCustomCategories(
    customCategories.map((item) =>
      item.id === category.id
        ? { ...item, name: cleanCategory, updatedAt: new Date().toISOString() }
        : item
    )
  );

  if (!saved) return;

  if (formData.category === category.name) {
    setFormData((previous) => ({ ...previous, category: cleanCategory }));
  }

  setEditingCategoryId(null);
  setEditingCategoryName("");
  notify("Category updated successfully.");
};

const deleteCustomCategory = async (category) => {
  const saved = await setCustomCategories(
    customCategories.filter((item) => item.id !== category.id)
  );

  if (!saved) return;

  if (formData.category === category.name) {
    setFormData((previous) => ({ ...previous, category: "" }));
  }

  notify("Category deleted successfully.");
};

const backToCategorySelect = () => {
  setNewCategory("");
  setCategoryMode("select");
};

  const {
    towerRows,
    repairRows,
    mainStockRows,
    wastedRows,
    categoryGroups,
    activeCustomerAssetTotal,
    inactiveCustomerAssetTotal,
  } = useMemo(
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

  const openInsight = (type) => {
    navigate(`/assets/insights/${type}`);
  };

    const resetForm = () => {
    setFormData(emptyForm);
    setEditIndex(null);
    setCategoryMode("select");
    setNewCategory("");
    };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAssetImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notify("Image size must be 2 MB or less.", "error");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setFormData((previous) => ({
        ...previous,
        assetImage: String(reader.result || ""),
      }));
    };

    reader.readAsDataURL(file);
  };

  const identityExists = (data) => {
  return assets.some((asset, index) => {
    if (editIndex !== null && index === editIndex) {
      return false;
    }

    const sameAssetId =
      data.assetId &&
      asset.assetId &&
      data.assetId.trim().toLowerCase() ===
        asset.assetId.trim().toLowerCase();

    if (sameAssetId) {
      return true;
    }

    if (data.identityTracking !== "Single Identity") {
      return false;
    }

    const sameMac =
      data.macAddress &&
      asset.macAddress &&
      data.macAddress.trim().toLowerCase() ===
        asset.macAddress.trim().toLowerCase();

    const sameSerial =
      data.serialNumber &&
      asset.serialNumber &&
      data.serialNumber.trim().toLowerCase() ===
        asset.serialNumber.trim().toLowerCase();

    return sameMac || sameSerial;
  });
};

const handleSubmit = async (event) => {
  event.preventDefault();

  const cleanData = {
    ...formData,
    assetId: formData.assetId.trim(),
    deviceName: formData.deviceName.trim(),
    category: formData.category.trim(),
    brand: formData.brand.trim(),
  identityTracking: formData.identityTracking,

model:
  formData.identityTracking === "Single Identity"
    ? formData.model.trim()
    : "",

macAddress:
  formData.identityTracking === "Single Identity"
    ? formData.macAddress.trim()
    : "",

serialNumber:
  formData.identityTracking === "Single Identity"
    ? formData.serialNumber.trim()
    : "",

assetImage:
  formData.identityTracking === "Single Identity"
    ? formData.assetImage || ""
    : "",

    purchaseUnit: formData.purchaseUnit || "Piece",
    purchaseUsageUnit: formData.purchaseUsageUnit || "Piece",
    supplierName: (formData.supplierName || "").trim(),
    location: (formData.location || "Main Stock").trim(),
    quantity: Number(formData.quantity || 0),
    unitPrice: Number(formData.unitPrice || 0),
    alertQuantity: Number(formData.alertQuantity || 0),
    purchaseDate: formData.purchaseDate || "",
    status: formData.status || "In Stock",
    notes: formData.notes.trim(),
    updatedAt: new Date().toISOString(),
    createdAt: formData.createdAt || new Date().toISOString(),
  };

  if (identityExists(cleanData)) {
    notify(
  "Asset ID, MAC Address, or Serial Number already exists.",
  "error"
);
    return;
  }

  if (editIndex !== null) {
    const previousAsset = assets[editIndex] || {};
    const updatedAssets = [...assets];
    updatedAssets[editIndex] = cleanData;

    const saved = await setAssets(updatedAssets);

    if (saved) {
      await syncLinkedAssetName(previousAsset, cleanData);
      notify("Asset updated successfully.");
      resetForm();
      setShowModal(false);
    }

    return;
  }

  const saved = await setAssets([...assets, cleanData]);

  if (saved) {
    notify("Asset saved successfully.");
    resetForm();
    setShowModal(false);
  }
};

const matchesAssetRecord = (record, previousAsset, nextAsset) => {
  const recordAssetId = String(record.assetId || record.deviceId || "").trim();
  const previousAssetId = String(previousAsset.assetId || "").trim();
  const nextAssetId = String(nextAsset.assetId || "").trim();
  const recordAssetRecordId = String(
    record.assetRecordId || record.assetRecordID || record.parentAssetId || ""
  ).trim();
  const previousRecordId = String(previousAsset.id || "").trim();
  const nextRecordId = String(nextAsset.id || "").trim();

  return (
    (recordAssetId && (recordAssetId === previousAssetId || recordAssetId === nextAssetId)) ||
    (recordAssetRecordId &&
      (recordAssetRecordId === previousRecordId || recordAssetRecordId === nextRecordId))
  );
};

const renameLinkedAssetRecord = (record, previousAsset, nextAsset) => {
  if (Array.isArray(record)) {
    return record.map((item) => renameLinkedAssetRecord(item, previousAsset, nextAsset));
  }

  if (!record || typeof record !== "object") return record;

  const nextRecord = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      Array.isArray(value) || (value && typeof value === "object")
        ? renameLinkedAssetRecord(value, previousAsset, nextAsset)
        : value,
    ])
  );

  if (!matchesAssetRecord(nextRecord, previousAsset, nextAsset)) {
    return nextRecord;
  }

  const nextName = nextAsset.deviceName || nextRecord.deviceName || "";
  const previousName = String(previousAsset.deviceName || "");
  const replaceAssetName = (value) =>
    previousName && typeof value === "string"
      ? value.replaceAll(previousName, nextName)
      : value;

  return {
    ...nextRecord,
    assetId: nextAsset.assetId || nextRecord.assetId || "",
    deviceName: nextName,
    assetName: nextName,
    title: replaceAssetName(nextRecord.title),
    description: replaceAssetName(nextRecord.description),
    pendingDevices: replaceAssetName(nextRecord.pendingDevices),
    notes: replaceAssetName(nextRecord.notes),
    updatedAt: new Date().toISOString(),
  };
};

const renameLinkedAssetRecords = (records, previousAsset, nextAsset) =>
  (records || []).map((record) =>
    renameLinkedAssetRecord(record, previousAsset, nextAsset)
  );

const syncLinkedAssetName = async (previousAsset, nextAsset) => {
  const nameChanged =
    String(previousAsset.deviceName || "") !== String(nextAsset.deviceName || "");
  const assetIdChanged =
    String(previousAsset.assetId || "") !== String(nextAsset.assetId || "");

  if (!nameChanged && !assetIdChanged) return true;

  const movementSaved = await setAssetMovements(
    renameLinkedAssetRecords(assetMovements, previousAsset, nextAsset)
  );
  const transferSaved = await setDeviceTransfers(
    renameLinkedAssetRecords(deviceTransfers, previousAsset, nextAsset)
  );
  const towerAssetSaved = await setTowerAssets(
    renameLinkedAssetRecords(towerAssets, previousAsset, nextAsset)
  );
  const towerTransferSaved = await setTowerAssetTransfers(
    renameLinkedAssetRecords(towerAssetTransfers, previousAsset, nextAsset)
  );
  const supplierPurchasesSaved = await setSupplierPurchases(
    renameLinkedAssetRecords(supplierPurchases, previousAsset, nextAsset)
  );
  const buybacksSaved = await setCustomerDeviceBuybacks(
    renameLinkedAssetRecords(customerDeviceBuybacks, previousAsset, nextAsset)
  );
  const depositsSaved = await setSecurityDeposits(
    renameLinkedAssetRecords(securityDeposits, previousAsset, nextAsset)
  );
  const historySaved = await setDeviceHistory(
    renameLinkedAssetRecords(deviceHistory, previousAsset, nextAsset)
  );
  const customerDevicesSaved = await setCustomerDevices(
    renameLinkedAssetRecords(customerDevices, previousAsset, nextAsset)
  );
  const transactionsSaved = await setTransactions(
    renameLinkedAssetRecords(transactions, previousAsset, nextAsset)
  );

  return (
    movementSaved &&
    transferSaved &&
    towerAssetSaved &&
    towerTransferSaved &&
    supplierPurchasesSaved &&
    buybacksSaved &&
    depositsSaved &&
    historySaved &&
    customerDevicesSaved &&
    transactionsSaved
  );
};

  const editAsset = (index) => {
    setEditIndex(index);
    setFormData({
      ...emptyForm,
      ...assets[index],
    });
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

  const confirmDelete = () => {
    if (deleteIndex === null) return;

    setAssets(assets.filter((_, index) => index !== deleteIndex));
    setDeleteIndex(null);
    setDeleteModalOpen(false);
    notify("Asset deleted successfully.");
  };


  const getLocationClass = (location) => {
  const value = String(location || "Main Stock").toLowerCase();

  if (value === "main stock") {
    return "asset-location-badge main-stock";
  }

  if (value === "tower") {
    return "asset-location-badge tower";
  }

  if (value === "customer") {
    return "asset-location-badge customer";
  }

  if (value === "repair") {
    return "asset-location-badge repair";
  }

  if (value === "returned stock") {
    return "asset-location-badge returned-stock";
  }

  return "asset-location-badge";
};

  const getStatusClass = (status) => {
    if (status === "In Stock") return "asset-badge stock";
    if (status === "Issued") return "asset-badge issued";
    if (status === "Installed") return "asset-badge installed";
    if (status === "Returned") return "asset-badge returned";
    if (status === "Damaged") return "asset-badge damaged";
    if (status === "Lost") return "asset-badge lost";
    return "asset-badge";
  };

  return (
    <div className="asset-page">
      <div className="asset-header">
        <div>
          <h1>Smart Office Inventory Management</h1>
          <p>Record purchased devices, manage main stock, and track current asset status.</p>
        </div>

        <button className="asset-add-btn" onClick={openCreateModal}>
          + Add Asset
        </button>
      </div>

      <div className="asset-stats">
        <button type="button" className="asset-stat-card asset-stat-button asset-wide-stat" onClick={() => openInsight("categories")}>
          <span>Total Assets</span>
          <strong>{categoryGroups.length}</strong>
          <div className="asset-category-mini-list">
            {categoryGroups.slice(0, 6).map((group) => (
              <p key={group.category}><b>{group.category}</b> {money(group.total)}</p>
            ))}
            {categoryGroups.length > 6 && <p>+ {categoryGroups.length - 6} more categories</p>}
          </div>
        </button>

        <button type="button" className="asset-stat-card asset-stat-button" onClick={() => openInsight("customers")}>
          <span>Assets with Customers</span>
          <strong>{money(activeCustomerAssetTotal)}</strong>
          <p className="asset-yellow-text">{money(inactiveCustomerAssetTotal)} with inactive customers</p>
        </button>

        <button type="button" className="asset-stat-card asset-stat-button" onClick={() => openInsight("towers")}>
          <span>Assets at Towers</span>
          <strong>{money(sumAssetRows(towerRows))}</strong>
          <p>Click to view towers and assets</p>
        </button>

        <button type="button" className="asset-stat-card asset-stat-button" onClick={() => openInsight("stock")}>
          <span>Main Stock Assets</span>
          <strong>{money(sumAssetRows(mainStockRows))}</strong>
          <p>Click to view all stock assets</p>
        </button>

        <button type="button" className="asset-stat-card asset-stat-button" onClick={() => openInsight("repair")}>
          <span>Under Repair Assets</span>
          <strong>{money(sumAssetRows(repairRows))}</strong>
          <p>Click to view repair assets</p>
        </button>

        <button type="button" className="asset-stat-card asset-stat-button" onClick={() => openInsight("wasted")}>
          <span>Wasted Assets</span>
          <strong>{money(sumAssetRows(wastedRows))}</strong>
          <p>Click to view wasted assets</p>
        </button>

      </div>

      <div className="asset-table-card">
        <div className="asset-table-header">
          <div>
            <h3>Main Stock Inventory</h3>
            <p>All purchased devices and their current status</p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search asset..."
          />
        </div>

        <div className="asset-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Image</th>
                <th>Category</th>
                <th>Device Name</th>
                <th>Tracking</th>
                <th>MAC Address</th>
                <th>Serial Number</th>
                <th>Qty</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {assetPagination.pageItems.map((asset) => {
                const index = asset.originalIndex;

                return (
                  <tr key={index}>
                    <td className="asset-strong">{asset.assetId || "-"}</td>
                    <td>
                      {asset.identityTracking === "Single Identity" && asset.assetImage ? (
                        <img
                          className="asset-table-thumb"
                          src={asset.assetImage}
                          alt={asset.deviceName || asset.assetId || "Asset"}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{asset.category || "-"}</td>
                    <td title={asset.deviceName || "-"}>{asset.deviceName || "-"}</td>
                    <td>
                      <span
                        className={`asset-tracking-badge ${
                          String(asset.identityTracking || "").includes("Individual")
                            ? "individual"
                            : "single"
                        }`}
                      >
                        {String(asset.identityTracking || "").includes("Individual")
                          ? "Individual"
                          : "Single Model"}
                      </span>
                    </td>
                    <td>{asset.macAddress || "-"}</td>
                    <td>{asset.serialNumber || "-"}</td>
                    <td>{asset.quantity ?? 0}</td>
                    <td>
                  
  <div className="asset-action-cell">
    <button
      type="button"
      className="asset-action-btn"
      onClick={(event) => toggleActionMenu(event, index)}
    >
      ⋮
    </button>

    {openAction === index && (
      <div
        className="asset-action-menu"
        style={{
          top: `${actionMenuPosition.top}px`,
          left: `${actionMenuPosition.left}px`,
        }}
      >
        <button
  type="button"
  onClick={() => {
    navigate(`/assets/${asset.id || asset.assetId}/details`);
    setOpenAction(null);
  }}
>
  <DetailIcon />
  <span>Full Information</span>
</button>

        <button
          type="button"
          onClick={() => {
            navigate(`/assets/${asset.id || asset.assetId}/audit-trail`);
            setOpenAction(null);
          }}
        >
          <DetailIcon />
          <span>Audit Trail</span>
        </button>

        <button type="button" onClick={() => editAsset(index)}>
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

              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan="10" className="asset-empty">
                    No asset has been registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={assetPagination.page}
          totalPages={assetPagination.totalPages}
          setPage={assetPagination.setPage}
          totalItems={filteredAssets.length}
          pageSize={assetPagination.pageSize}
          setPageSize={assetPagination.setPageSize}
        />
      </div>

      {showModal && (
        <div className="asset-modal-backdrop">
          <div className="asset-modal" onClick={(event) => event.stopPropagation()}>
            <div className="asset-modal-header">
              <div>
                <h3>{editIndex !== null ? "Edit Asset" : "Add New Asset"}</h3>
                <p>Enter complete device specifications and identity information.</p>
              </div>

              <button
                type="button"
                className="asset-close-btn"
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="asset-form-grid">
                <div className="asset-form-group">
                    <label>Asset ID</label>

                    <div className="asset-id-field">
                        <input
                        name="assetId"
                        value={formData.assetId}
                        onChange={handleChange}
                        placeholder="Example: AST-0001"
                        />

                        <button
                        type="button"
                        className="asset-generate-btn"
                        onClick={handleGenerateAssetId}
                        title="Generate Asset ID"
                        >
                        Generate
                        </button>
                    </div>
                </div>

                <div className="asset-form-group">
                    <div className="asset-label-row">
                        <label>Category</label>

                        {categoryMode === "select" && (
                        <button
                            type="button"
                            className="asset-category-plus"
                            onClick={() => {
                            setCategoryMode("custom");
                            setNewCategory("");
                            }}
                            title="Add custom category"
                        >
                            +
                        </button>
                        )}
                    </div>

                    {categoryMode === "select" ? (
                        <select
                        name="category"
                        value={formData.category}
                        onChange={handleCategoryChange}
                        >
                        <option value="">Select Category</option>

                        {categoryOptions.map((category) => (
                            <option key={category} value={category}>
                            {category}
                            </option>
                        ))}
                        </select>
                    ) : (
                        <div className="asset-custom-category">
                        <input
                            value={newCategory}
                            onChange={(event) => setNewCategory(event.target.value)}
                            placeholder="Enter new category"
                            autoFocus
                        />

                        <button
                            type="button"
                            className="asset-category-save"
                            onClick={saveCustomCategory}
                        >
                            Save
                        </button>

                        <button
                            type="button"
                            className="asset-category-back"
                            onClick={backToCategorySelect}
                        >
                            Back
                        </button>
                        </div>
                    )}
                    {customCategories.length > 0 && (
                      <div className="asset-custom-category-list">
                        {customCategories.map((category) => (
                          <div className="asset-custom-category-chip" key={category.id}>
                            {editingCategoryId === category.id ? (
                              <>
                                <input
                                  value={editingCategoryName}
                                  onChange={(event) =>
                                    setEditingCategoryName(event.target.value)
                                  }
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => saveEditedCustomCategory(category)}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategoryId(null);
                                    setEditingCategoryName("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <span>{category.name}</span>
                                <button
                                  type="button"
                                  onClick={() => beginEditCustomCategory(category)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => deleteCustomCategory(category)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    </div>

                <div className="asset-form-group">
                  <label>Device Name</label>
                  <input
                    name="deviceName"
                    value={formData.deviceName}
                    onChange={handleChange}
                    placeholder="Example: MikroTik Router"
                  />
                </div>

                <div className="asset-form-group">
                  <label>Brand</label>
                  <input
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="Example: MikroTik"
                  />
                </div>

                

                <div className="asset-form-group">
  <label>Identity Tracking</label>

  <select
    name="identityTracking"
    value={formData.identityTracking}
    onChange={(event) => {
      const value = event.target.value;

      setFormData((previous) => ({
        ...previous,
        identityTracking: value,

        model:
          value === "Single Identity"
            ? previous.model
            : "",

        macAddress:
          value === "Single Identity"
            ? previous.macAddress
            : "",

        serialNumber:
          value === "Single Identity"
            ? previous.serialNumber
            : "",

        assetImage:
          value === "Single Identity"
            ? previous.assetImage
            : "",
      }));
    }}
  >
    <option value="Single Identity">
      Single Model / MAC / Serial
    </option>

    <option value="Individual Identity">
      Individual Identity per Unit
    </option>
  </select>
</div>

                <div className="asset-form-group">
                  <label>Alert Quantity</label>
                  <input
                    type="number"
                    min="0"
                    name="alertQuantity"
                    value={formData.alertQuantity}
                    onChange={handleChange}
                    placeholder="Example: 5"
                  />
                </div>

                <div className="asset-form-group">
                  <label>Purchase / Usage Unit</label>
                  <select
                    name="purchaseUsageUnit"
                    value={formData.purchaseUsageUnit}
                    onChange={handleChange}
                  >
                    <option value="Piece">Piece</option>
                    <option value="Meter">Meter</option>
                    <option value="Roll">Roll</option>
                    <option value="Box">Box</option>
                    <option value="Pack">Pack</option>
                    <option value="Set">Set</option>
                    <option value="Pair">Pair</option>
                    <option value="Kilogram">Kilogram</option>
                    <option value="Liter">Liter</option>
                    <option value="Bundle">Bundle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

{formData.identityTracking === "Single Identity" && (
  <>
    <div className="asset-form-group">
      <label>Model</label>

      <input
        name="model"
        value={formData.model}
        onChange={handleChange}
        placeholder="Example: RB750Gr3"
      />
    </div>

    <div className="asset-form-group">
      <label>MAC Address</label>

      <input
        name="macAddress"
        value={formData.macAddress}
        onChange={handleChange}
        placeholder="Example: AA:BB:CC:DD:EE:FF"
      />
    </div>

    <div className="asset-form-group">
      <label>Serial Number</label>

      <input
        name="serialNumber"
        value={formData.serialNumber}
        onChange={handleChange}
        placeholder="Example: SN-123456"
      />
    </div>

    <div className="asset-form-group asset-form-full">
      <label>Image</label>

      <div className="asset-image-picker">
        <div>
          {formData.assetImage ? (
            <img src={formData.assetImage} alt="Asset preview" />
          ) : (
            <span>No Image</span>
          )}
        </div>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleAssetImageChange}
        />

        {formData.assetImage && (
          <button
            type="button"
            onClick={() =>
              setFormData((previous) => ({
                ...previous,
                assetImage: "",
              }))
            }
          >
            Remove Image
          </button>
        )}
      </div>
    </div>
  </>
)}

                <div className="asset-form-group asset-form-full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional asset notes..."
                  />
                </div>
              </div>

              <div className="asset-modal-actions">
                <button
                  type="button"
                  className="asset-cancel-btn"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                >
                  Cancel
                </button>

                <button type="submit" className="asset-save-btn">
                  {editIndex !== null ? "Save Changes" : "Save Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="asset-delete-backdrop" onClick={cancelDelete}>
          <div className="asset-delete-modal" onClick={(event) => event.stopPropagation()}>
            <div className="asset-delete-icon">
              <TrashIcon />
            </div>

            <h3>Delete Asset</h3>

            <p>
              Are you sure you want to delete this asset? This action cannot be undone.
            </p>

            <div className="asset-delete-actions">
              <button
                type="button"
                className="asset-delete-cancel"
                onClick={cancelDelete}
              >
                Cancel
              </button>

              <button
                type="button"
                className="asset-delete-confirm"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssetInventory;
