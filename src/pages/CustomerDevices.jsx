import { useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { formatDateTime } from "../utils/afghanDate";
import "./CustomerDevices.css";

const emptyForm = {
  towerName: "",
  towerLocation: "",
  customerId: "",
  customerName: "",
  customerPhone: "",
  assetId: "",
  deviceName: "",
  category: "",
  macAddress: "",
  serialNumber: "",
  installationDate: "",
  customerStatus: "Active",
  packageSpeed: "",
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
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

function customerNameOf(customer) {
  return (
    customer.customerName ||
    customer.fullName ||
    customer.name ||
    `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
    customer.phone ||
    "Unnamed Customer"
  );
}

function CustomerDevices() {
  const [customerDevices, setCustomerDevices] = useJsonCollection("customerDevices");
  const [towerAssets] = useJsonCollection("towerAssets");
  const [customers] = useJsonCollection("customers");
  const [assets] = useJsonCollection("assets");

  const [formData, setFormData] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [search, setSearch] = useState("");
  const [detailRecord, setDetailRecord] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const [openAction, setOpenAction] = useState(null);
  const [actionPosition, setActionPosition] = useState({ top: 0, left: 0 });

  const towerOptions = useMemo(() => {
    const map = new Map();

    towerAssets.forEach((record) => {
      const key = `${record.towerName || ""}|${record.towerLocation || ""}`;

      if (!record.towerName) return;

      map.set(key, {
        towerName: record.towerName || "",
        towerLocation: record.towerLocation || "",
      });
    });

    return [...map.values()];
  }, [towerAssets]);

  const filteredRecords = customerDevices
    .map((record, originalIndex) => ({ ...record, originalIndex }))
    .filter((record) => {
      const keyword = search.toLowerCase();

      return (
        (record.towerName || "").toLowerCase().includes(keyword) ||
        (record.towerLocation || "").toLowerCase().includes(keyword) ||
        (record.customerName || "").toLowerCase().includes(keyword) ||
        (record.customerPhone || "").toLowerCase().includes(keyword) ||
        (record.assetId || "").toLowerCase().includes(keyword) ||
        (record.deviceName || "").toLowerCase().includes(keyword) ||
        (record.macAddress || "").toLowerCase().includes(keyword) ||
        (record.serialNumber || "").toLowerCase().includes(keyword) ||
        (record.customerStatus || "").toLowerCase().includes(keyword) ||
        (record.packageSpeed || "").toLowerCase().includes(keyword)
      );
    });

  const activeCount = customerDevices.filter((item) => item.customerStatus === "Active").length;
  const inactiveCount = customerDevices.filter((item) => item.customerStatus === "Inactive").length;
  const disconnectedCount = customerDevices.filter((item) => item.customerStatus === "Disconnected").length;
  const uniqueTowers = new Set(customerDevices.map((item) => item.towerName).filter(Boolean)).size;

  const resetForm = () => {
    setFormData(emptyForm);
    setEditIndex(null);
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

  const handleTowerChange = (event) => {
    const value = event.target.value;
    const [towerName, towerLocation] = value.split("|");

    setFormData((previous) => ({
      ...previous,
      towerName: towerName || "",
      towerLocation: towerLocation || "",
    }));
  };

  const handleCustomerChange = (event) => {
    const customerId = event.target.value;
    const customer = customers.find((item) => String(item.id) === String(customerId));

    setFormData((previous) => ({
      ...previous,
      customerId,
      customerName: customer ? customerNameOf(customer) : "",
      customerPhone: customer?.phone || customer?.mobile || "",
    }));
  };

  const handleAssetChange = (event) => {
    const assetId = event.target.value;
    const asset = assets.find((item) => String(item.assetId) === String(assetId));

    setFormData((previous) => ({
      ...previous,
      assetId,
      deviceName: asset?.deviceName || "",
      category: asset?.category || "",
      macAddress: asset?.macAddress || "",
      serialNumber: asset?.serialNumber || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanData = {
      id: editIndex !== null ? customerDevices[editIndex]?.id || Date.now() : Date.now(),
      towerName: formData.towerName.trim(),
      towerLocation: formData.towerLocation.trim(),
      customerId: formData.customerId,
      customerName: formData.customerName.trim(),
      customerPhone: formData.customerPhone.trim(),
      assetId: formData.assetId.trim(),
      deviceName: formData.deviceName.trim(),
      category: formData.category.trim(),
      macAddress: formData.macAddress.trim(),
      serialNumber: formData.serialNumber.trim(),
      installationDate: formData.installationDate,
      customerStatus: formData.customerStatus,
      packageSpeed: formData.packageSpeed.trim(),
      notes: formData.notes.trim(),
      createdAt: editIndex !== null ? customerDevices[editIndex]?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!cleanData.towerName) {
      notify("Please select a tower.", "error");
      return;
    }

    if (!cleanData.customerName) {
      notify("Please select a customer.", "error");
      return;
    }

    if (!cleanData.assetId && !cleanData.macAddress && !cleanData.serialNumber) {
      notify("Please select or enter a device.", "error");
      return;
    }

    if (editIndex !== null) {
      const updatedRecords = [...customerDevices];
      updatedRecords[editIndex] = cleanData;

      const saved = await setCustomerDevices(updatedRecords);

      if (saved) {
        notify("Customer device updated successfully.");
        closeModal();
      }

      return;
    }

    const saved = await setCustomerDevices([...customerDevices, cleanData]);

    if (saved) {
      notify("Customer device saved successfully.");
      closeModal();
    }
  };

  const openEditModal = (index) => {
    setEditIndex(index);
    setFormData({
      ...emptyForm,
      ...customerDevices[index],
    });
    setShowModal(true);
    setOpenAction(null);
  };

  const openDeleteModal = (index) => {
    setDeleteIndex(index);
    setOpenAction(null);
  };

  const cancelDelete = () => {
    setDeleteIndex(null);
  };

  const confirmDelete = async () => {
    if (deleteIndex === null) return;

    const saved = await setCustomerDevices(
      customerDevices.filter((_, index) => index !== deleteIndex)
    );

    if (saved) {
      notify("Customer device deleted successfully.");
      setDeleteIndex(null);
    }
  };

  const toggleActionMenu = (event, index) => {
    const rect = event.currentTarget.getBoundingClientRect();

    setActionPosition({
      top: rect.bottom + 8,
      left: rect.right - 160,
    });

    setOpenAction(openAction === index ? null : index);
  };

  const getStatusClass = (status) => {
    if (status === "Active") return "customer-device-badge active";
    if (status === "Inactive") return "customer-device-badge inactive";
    if (status === "Disconnected") return "customer-device-badge disconnected";
    return "customer-device-badge";
  };

  return (
    <div className="customer-device-page">
      <div className="customer-device-header">
        <div>
          <h1>Customer Device Management</h1>
          <p>Connect towers, customers, and installed customer devices.</p>
        </div>

        <button type="button" className="customer-device-add-btn" onClick={openCreateModal}>
          + Add Customer Device
        </button>
      </div>

      <div className="customer-device-stats">
        <div className="customer-device-stat-card">
          <span>Total Records</span>
          <strong>{customerDevices.length}</strong>
          <p>All customer device records</p>
        </div>

        <div className="customer-device-stat-card">
          <span>Serving Towers</span>
          <strong>{uniqueTowers}</strong>
          <p>Towers linked with customers</p>
        </div>

        <div className="customer-device-stat-card">
          <span>Active</span>
          <strong>{activeCount}</strong>
          <p>Active customer services</p>
        </div>

        <div className="customer-device-stat-card">
          <span>Inactive</span>
          <strong>{inactiveCount}</strong>
          <p>Inactive customers</p>
        </div>

        <div className="customer-device-stat-card">
          <span>Disconnected</span>
          <strong>{disconnectedCount}</strong>
          <p>Disconnected customers</p>
        </div>
      </div>

      <div className="customer-device-table-card">
        <div className="customer-device-table-header">
          <div>
            <h3>Customer Device List</h3>
            <p>All customers connected with towers and devices</p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer device..."
          />
        </div>

        <div className="customer-device-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tower</th>
                <th>Customer</th>
                <th>Device</th>
                <th>MAC Address</th>
                <th>Serial Number</th>
                <th>Package</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => {
                const index = record.originalIndex;

                return (
                  <tr key={record.id || index}>
                    <td className="customer-device-strong">{record.towerName || "-"}</td>
                    <td>{record.customerName || "-"}</td>
                    <td>{record.deviceName || record.assetId || "-"}</td>
                    <td>{record.macAddress || "-"}</td>
                    <td>{record.serialNumber || "-"}</td>
                    <td>{record.packageSpeed || "-"}</td>
                    <td>
                      <span className={getStatusClass(record.customerStatus)}>
                        {record.customerStatus || "Unknown"}
                      </span>
                    </td>
                    <td>
                      <div className="customer-device-action-cell">
                        <button
                          type="button"
                          className="customer-device-action-btn"
                          onClick={(event) => toggleActionMenu(event, index)}
                        >
                          ⋮
                        </button>

                        {openAction === index && (
                          <div
                            className="customer-device-action-menu"
                            style={{
                              top: `${actionPosition.top}px`,
                              left: `${actionPosition.left}px`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setDetailRecord(record);
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

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan="8" className="customer-device-empty">
                    No customer device has been registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="customer-device-modal-backdrop">
          <div className="customer-device-modal" onClick={(event) => event.stopPropagation()}>
            <div className="customer-device-modal-header">
              <div>
                <h3>{editIndex !== null ? "Edit Customer Device" : "Add Customer Device"}</h3>
                <p>Enter tower, customer, device, package, and status information.</p>
              </div>

              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="customer-device-form-grid">
                <div className="customer-device-form-group">
                  <label>Tower</label>
                  <select
                    value={`${formData.towerName}|${formData.towerLocation}`}
                    onChange={handleTowerChange}
                  >
                    <option value="|">Select Tower</option>

                    {towerOptions.map((tower) => (
                      <option
                        key={`${tower.towerName}|${tower.towerLocation}`}
                        value={`${tower.towerName}|${tower.towerLocation}`}
                      >
                        {tower.towerName} - {tower.towerLocation || "No Location"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="customer-device-form-group">
                  <label>Customer</label>
                  <select
                    value={formData.customerId}
                    onChange={handleCustomerChange}
                  >
                    <option value="">Select Customer</option>

                    {customers.map((customer, index) => (
                      <option key={customer.id || index} value={customer.id || index}>
                        {customerNameOf(customer)} {customer.phone ? `- ${customer.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="customer-device-form-group">
                  <label>Device</label>
                  <select value={formData.assetId} onChange={handleAssetChange}>
                    <option value="">Select Device</option>

                    {assets.map((asset, index) => (
                      <option key={asset.id || asset.assetId || index} value={asset.assetId}>
                        {asset.assetId || "No Asset ID"} - {asset.deviceName || "Unnamed Device"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="customer-device-form-group">
                  <label>Installation Date</label>
                  <input
                    type="date"
                    name="installationDate"
                    value={formData.installationDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="customer-device-form-group">
                  <label>Package / Speed</label>
                  <input
                    name="packageSpeed"
                    value={formData.packageSpeed}
                    onChange={handleChange}
                    placeholder="Example: 10 Mbps"
                  />
                </div>

                <div className="customer-device-form-group">
                  <label>Customer Status</label>
                  <select
                    name="customerStatus"
                    value={formData.customerStatus}
                    onChange={handleChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Disconnected">Disconnected</option>
                  </select>
                </div>

                <div className="customer-device-form-group">
                  <label>Device Name</label>
                  <input value={formData.deviceName} readOnly placeholder="Auto-filled from device" />
                </div>

                <div className="customer-device-form-group">
                  <label>MAC Address</label>
                  <input value={formData.macAddress} readOnly placeholder="Auto-filled from device" />
                </div>

                <div className="customer-device-form-group">
                  <label>Serial Number</label>
                  <input value={formData.serialNumber} readOnly placeholder="Auto-filled from device" />
                </div>

                <div className="customer-device-form-group customer-device-form-full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional customer device notes..."
                  />
                </div>
              </div>

              <div className="customer-device-modal-actions">
                <button type="button" className="customer-device-cancel-btn" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="customer-device-save-btn">
                  {editIndex !== null ? "Save Changes" : "Save Customer Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailRecord && (
        <div className="customer-device-detail-backdrop" onClick={() => setDetailRecord(null)}>
          <div className="customer-device-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="customer-device-detail-header">
              <div>
                <h3>Customer Device Full Detail</h3>
                <p>Complete customer, tower, and device information.</p>
              </div>

              <button type="button" onClick={() => setDetailRecord(null)}>
                ×
              </button>
            </div>

            <div className="customer-device-detail-grid">
              <div><span>Tower</span><strong>{detailRecord.towerName || "-"}</strong></div>
              <div><span>Tower Location</span><strong>{detailRecord.towerLocation || "-"}</strong></div>
              <div><span>Customer</span><strong>{detailRecord.customerName || "-"}</strong></div>
              <div><span>Customer Phone</span><strong>{detailRecord.customerPhone || "-"}</strong></div>
              <div><span>Device</span><strong>{detailRecord.deviceName || "-"}</strong></div>
              <div><span>Asset ID</span><strong>{detailRecord.assetId || "-"}</strong></div>
              <div><span>Category</span><strong>{detailRecord.category || "-"}</strong></div>
              <div><span>MAC Address</span><strong>{detailRecord.macAddress || "-"}</strong></div>
              <div><span>Serial Number</span><strong>{detailRecord.serialNumber || "-"}</strong></div>
              <div>
                <span>Installation Date</span>
                <strong>
                  {formatDateTime(
                    detailRecord.installationDate,
                    detailRecord.createdAt || detailRecord.updatedAt
                  )}
                </strong>
              </div>
              <div><span>Package / Speed</span><strong>{detailRecord.packageSpeed || "-"}</strong></div>
              <div><span>Status</span><strong>{detailRecord.customerStatus || "-"}</strong></div>
            </div>

            <div className="customer-device-detail-notes">
              <span>Notes</span>
              <p>{detailRecord.notes || "No notes have been added for this customer device."}</p>
            </div>

            <div className="customer-device-detail-actions">
              <button type="button" onClick={() => setDetailRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteIndex !== null && (
        <div className="customer-device-delete-backdrop" onClick={cancelDelete}>
          <div className="customer-device-delete-modal" onClick={(event) => event.stopPropagation()}>
            <div className="customer-device-delete-icon">
              <TrashIcon />
            </div>

            <h3>Delete Customer Device</h3>
            <p>Are you sure you want to delete this customer device record?</p>

            <div className="customer-device-delete-actions">
              <button type="button" className="customer-device-delete-cancel" onClick={cancelDelete}>
                Cancel
              </button>

              <button type="button" className="customer-device-delete-confirm" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDevices;
