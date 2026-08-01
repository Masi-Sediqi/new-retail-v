import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import "./Packages.css";

const emptyForm = {
  packageCode: "",
  packageName: "",
  speed: "",
  monthlyPrice: "",
  durationDays: "30",
  dataLimit: "",
  serviceType: "Home",
  status: "Active",
  description: "",
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

const money = (value) => Number(value || 0).toLocaleString("en-US");

function Packages() {
  const navigate = useNavigate();
  const [packages, setPackages] = useJsonCollection("packages");

  const [formData, setFormData] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [search, setSearch] = useState("");
  const [detailRecord, setDetailRecord] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const [openAction, setOpenAction] = useState(null);
  const [actionPosition, setActionPosition] = useState({ top: 0, left: 0 });

  const activePackages = packages.filter((item) => item.status === "Active").length;
  const inactivePackages = packages.filter((item) => item.status === "Inactive").length;
  const averagePrice =
    packages.length > 0
      ? packages.reduce((sum, item) => sum + Number(item.monthlyPrice || 0), 0) / packages.length
      : 0;

  const filteredPackages = packages
    .map((item, originalIndex) => ({ ...item, originalIndex }))
    .filter((item) => {
      const keyword = search.toLowerCase();

      return (
        (item.packageCode || "").toLowerCase().includes(keyword) ||
        (item.packageName || "").toLowerCase().includes(keyword) ||
        (item.speed || "").toLowerCase().includes(keyword) ||
        (item.dataLimit || "").toLowerCase().includes(keyword) ||
        (item.serviceType || "").toLowerCase().includes(keyword) ||
        (item.status || "").toLowerCase().includes(keyword)
      );
    });

  const generatePackageCode = () => {
    const numbers = packages
      .map((item) => String(item.packageCode || ""))
      .map((code) => Number(code.replace("PKG-", "")))
      .filter((number) => !Number.isNaN(number));

    const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;

    setFormData((previous) => ({
      ...previous,
      packageCode: `PKG-${String(nextNumber).padStart(4, "0")}`,
    }));
  };

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

  const packageExists = (data) => {
    return packages.some((item, index) => {
      if (editIndex !== null && index === editIndex) return false;

      const sameCode =
        data.packageCode &&
        item.packageCode &&
        data.packageCode.toLowerCase() === item.packageCode.toLowerCase();

      const sameNameSpeed =
        data.packageName &&
        data.speed &&
        item.packageName &&
        item.speed &&
        data.packageName.toLowerCase() === item.packageName.toLowerCase() &&
        data.speed.toLowerCase() === item.speed.toLowerCase();

      return sameCode || sameNameSpeed;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanData = {
      id: editIndex !== null ? packages[editIndex]?.id || Date.now() : Date.now(),
      packageCode: formData.packageCode.trim(),
      packageName: formData.packageName.trim(),
      speed: formData.speed.trim(),
      monthlyPrice: Number(formData.monthlyPrice || 0),
      durationDays: Number(formData.durationDays || 30),
      dataLimit: formData.dataLimit.trim(),
      serviceType: formData.serviceType,
      status: formData.status,
      description: formData.description.trim(),
      createdAt: editIndex !== null ? packages[editIndex]?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!cleanData.packageCode) {
      notify("Please enter or generate package code.", "error");
      return;
    }

    if (!cleanData.packageName) {
      notify("Please enter package name.", "error");
      return;
    }

    if (!cleanData.speed) {
      notify("Please enter package speed.", "error");
      return;
    }

    if (packageExists(cleanData)) {
      notify("Package code or package name with speed already exists.", "error");
      return;
    }

    if (editIndex !== null) {
      const updatedPackages = [...packages];
      updatedPackages[editIndex] = cleanData;

      const saved = await setPackages(updatedPackages);

      if (saved) {
        notify("Package updated successfully.");
        closeModal();
      }

      return;
    }

    const saved = await setPackages([...packages, cleanData]);

    if (saved) {
      notify("Package saved successfully.");
      closeModal();
    }
  };

  const openEditModal = (index) => {
    setEditIndex(index);
    setFormData({
      ...emptyForm,
      ...packages[index],
      monthlyPrice: String(packages[index]?.monthlyPrice || ""),
      durationDays: String(packages[index]?.durationDays || 30),
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

    const saved = await setPackages(packages.filter((_, index) => index !== deleteIndex));

    if (saved) {
      notify("Package deleted successfully.");
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
    if (status === "Active") return "package-badge active";
    if (status === "Inactive") return "package-badge inactive";
    return "package-badge";
  };

  return (
    <div className="packages-page">
      <div className="packages-header">
        <div>
          <h1>Package Management</h1>
          <p>Create reusable internet packages for customers.</p>
        </div>

        <button type="button" className="package-add-btn" onClick={openCreateModal}>
          + Add Package
        </button>
      </div>

      <div className="package-stats">
        <div className="package-stat-card">
          <span>Total Packages</span>
          <strong>{packages.length}</strong>
          <p>All registered packages</p>
        </div>

        <div className="package-stat-card">
          <span>Active Packages</span>
          <strong>{activePackages}</strong>
          <p>Available for customers</p>
        </div>

        <div className="package-stat-card">
          <span>Inactive Packages</span>
          <strong>{inactivePackages}</strong>
          <p>Disabled packages</p>
        </div>

        <div className="package-stat-card">
          <span>Average Price</span>
          <strong>{money(averagePrice)} AFN</strong>
          <p>Average package price</p>
        </div>
      </div>

      <div className="package-table-card">
        <div className="package-table-header">
          <div>
            <h3>Package List</h3>
            <p>Reusable internet packages saved in the system</p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search package..."
          />
        </div>

        <div className="package-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Package Name</th>
                <th>Speed</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Data Limit</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredPackages.map((item) => {
                const index = item.originalIndex;

                return (
                  <tr key={item.id || index}>
                    <td className="package-strong">{item.packageCode || "-"}</td>
                    <td>{item.packageName || "-"}</td>
                    <td>{item.speed || "-"}</td>
                    <td>{money(item.monthlyPrice)} AFN</td>
                    <td>{item.durationDays || 30} days</td>
                    <td>{item.dataLimit || "Unlimited"}</td>
                    <td>{item.serviceType || "-"}</td>
                    <td>
                      <span className={getStatusClass(item.status)}>
                        {item.status || "Unknown"}
                      </span>
                    </td>
                    <td>
                      <div className="package-action-cell">
                        <button
                          type="button"
                          className="package-action-btn"
                          onClick={(event) => toggleActionMenu(event, index)}
                        >
                          ⋮
                        </button>

                        {openAction === index && (
                          <div
                            className="package-action-menu"
                            style={{
                              top: `${actionPosition.top}px`,
                              left: `${actionPosition.left}px`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                navigate(
                                  `/packages/${item.id || item.packageCode}/details`
                                );
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

              {filteredPackages.length === 0 && (
                <tr>
                  <td colSpan="9" className="package-empty">
                    No package has been registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="package-modal-backdrop">
          <div className="package-modal" onClick={(event) => event.stopPropagation()}>
            <div className="package-modal-header">
              <div>
                <h3>{editIndex !== null ? "Edit Package" : "Add Package"}</h3>
                <p>Enter package speed, price, duration, and service information.</p>
              </div>

              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="package-form-grid">
                <div className="package-form-group">
                  <label>Package Code</label>
                  <div className="package-code-field">
                    <input
                      name="packageCode"
                      value={formData.packageCode}
                      onChange={handleChange}
                      placeholder="Example: PKG-0001"
                    />

                    <button type="button" onClick={generatePackageCode}>
                      Generate
                    </button>
                  </div>
                </div>

                <div className="package-form-group">
                  <label>Package Name</label>
                  <input
                    name="packageName"
                    value={formData.packageName}
                    onChange={handleChange}
                    placeholder="Example: Home Internet"
                  />
                </div>

                <div className="package-form-group">
                  <label>Speed</label>
                  <input
                    name="speed"
                    value={formData.speed}
                    onChange={handleChange}
                    placeholder="Example: 10 Mbps"
                  />
                </div>

                <div className="package-form-group">
                  <label>Monthly Price</label>
                  <input
                    type="number"
                    min="0"
                    name="monthlyPrice"
                    value={formData.monthlyPrice}
                    onChange={handleChange}
                    placeholder="Example: 1500"
                  />
                </div>

                <div className="package-form-group">
                  <label>Duration Days</label>
                  <input
                    type="number"
                    min="1"
                    name="durationDays"
                    value={formData.durationDays}
                    onChange={handleChange}
                    placeholder="Example: 30"
                  />
                </div>

                <div className="package-form-group">
                  <label>Data Limit</label>
                  <input
                    name="dataLimit"
                    value={formData.dataLimit}
                    onChange={handleChange}
                    placeholder="Example: Unlimited / 100GB"
                  />
                </div>

                <div className="package-form-group">
                  <label>Service Type</label>
                  <select name="serviceType" value={formData.serviceType} onChange={handleChange}>
                    <option value="Home">Home</option>
                    <option value="Business">Business</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Government">Government</option>
                  </select>
                </div>

                <div className="package-form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="package-form-group package-form-full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Package description..."
                  />
                </div>
              </div>

              <div className="package-modal-actions">
                <button type="button" className="package-cancel-btn" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="package-save-btn">
                  {editIndex !== null ? "Save Changes" : "Save Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailRecord && (
        <div className="package-detail-backdrop" onClick={() => setDetailRecord(null)}>
          <div className="package-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="package-detail-header">
              <div>
                <h3>Package Full Detail</h3>
                <p>Complete package information.</p>
              </div>

              <button type="button" onClick={() => setDetailRecord(null)}>
                ×
              </button>
            </div>

            <div className="package-detail-grid">
              <div><span>Package Code</span><strong>{detailRecord.packageCode || "-"}</strong></div>
              <div><span>Package Name</span><strong>{detailRecord.packageName || "-"}</strong></div>
              <div><span>Speed</span><strong>{detailRecord.speed || "-"}</strong></div>
              <div><span>Monthly Price</span><strong>{money(detailRecord.monthlyPrice)} AFN</strong></div>
              <div><span>Duration</span><strong>{detailRecord.durationDays || 30} days</strong></div>
              <div><span>Data Limit</span><strong>{detailRecord.dataLimit || "Unlimited"}</strong></div>
              <div><span>Service Type</span><strong>{detailRecord.serviceType || "-"}</strong></div>
              <div><span>Status</span><strong>{detailRecord.status || "-"}</strong></div>
            </div>

            <div className="package-detail-notes">
              <span>Description</span>
              <p>{detailRecord.description || "No description has been added for this package."}</p>
            </div>

            <div className="package-detail-actions">
              <button type="button" onClick={() => setDetailRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteIndex !== null && (
        <div className="package-delete-backdrop" onClick={cancelDelete}>
          <div className="package-delete-modal" onClick={(event) => event.stopPropagation()}>
            <div className="package-delete-icon">
              <TrashIcon />
            </div>

            <h3>Delete Package</h3>
            <p>Are you sure you want to delete this package? This action cannot be undone.</p>

            <div className="package-delete-actions">
              <button type="button" className="package-delete-cancel" onClick={cancelDelete}>
                Cancel
              </button>

              <button type="button" className="package-delete-confirm" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Packages;
