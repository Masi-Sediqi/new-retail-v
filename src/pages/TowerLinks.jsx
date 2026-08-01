import { useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { formatDateTime } from "../utils/afghanDate";
import "./TowerLinks.css";

const emptyForm = {
  fromTower: "",
  fromLocation: "",
  toTower: "",
  toLocation: "",
  linkType: "PTP",
  radioDevice: "",
  frequency: "",
  bandwidth: "",
  linkStatus: "Active",
  installationDate: "",
  responsiblePerson: "",
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

function TowerLinks() {
  const [towerLinks, setTowerLinks] = useJsonCollection("towerLinks");
  const [towerAssets] = useJsonCollection("towerAssets");

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
      if (!record.towerName) return;

      const key = `${record.towerName}|${record.towerLocation || ""}`;

      map.set(key, {
        towerName: record.towerName,
        towerLocation: record.towerLocation || "",
      });
    });

    return [...map.values()];
  }, [towerAssets]);

  const activeLinks = towerLinks.filter((item) => item.linkStatus === "Active").length;
  const downLinks = towerLinks.filter((item) => item.linkStatus === "Down").length;
  const maintenanceLinks = towerLinks.filter((item) => item.linkStatus === "Maintenance").length;
  const ptpLinks = towerLinks.filter((item) => item.linkType === "PTP").length;

  const filteredLinks = towerLinks
    .map((item, originalIndex) => ({ ...item, originalIndex }))
    .filter((item) => {
      const keyword = search.toLowerCase();

      return (
        (item.fromTower || "").toLowerCase().includes(keyword) ||
        (item.fromLocation || "").toLowerCase().includes(keyword) ||
        (item.toTower || "").toLowerCase().includes(keyword) ||
        (item.toLocation || "").toLowerCase().includes(keyword) ||
        (item.linkType || "").toLowerCase().includes(keyword) ||
        (item.radioDevice || "").toLowerCase().includes(keyword) ||
        (item.frequency || "").toLowerCase().includes(keyword) ||
        (item.bandwidth || "").toLowerCase().includes(keyword) ||
        (item.linkStatus || "").toLowerCase().includes(keyword) ||
        (item.responsiblePerson || "").toLowerCase().includes(keyword)
      );
    });

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

  const handleFromTowerSelect = (event) => {
    const [towerName, towerLocation] = event.target.value.split("|");

    setFormData((previous) => ({
      ...previous,
      fromTower: towerName || "",
      fromLocation: towerLocation || "",
    }));
  };

  const handleToTowerSelect = (event) => {
    const [towerName, towerLocation] = event.target.value.split("|");

    setFormData((previous) => ({
      ...previous,
      toTower: towerName || "",
      toLocation: towerLocation || "",
    }));
  };

  const linkExists = (data) => {
    return towerLinks.some((item, index) => {
      if (editIndex !== null && index === editIndex) return false;

      const sameDirection =
        item.fromTower?.toLowerCase() === data.fromTower.toLowerCase() &&
        item.toTower?.toLowerCase() === data.toTower.toLowerCase();

      const reverseDirection =
        item.fromTower?.toLowerCase() === data.toTower.toLowerCase() &&
        item.toTower?.toLowerCase() === data.fromTower.toLowerCase();

      return sameDirection || reverseDirection;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanData = {
      id: editIndex !== null ? towerLinks[editIndex]?.id || Date.now() : Date.now(),
      fromTower: formData.fromTower.trim(),
      fromLocation: formData.fromLocation.trim(),
      toTower: formData.toTower.trim(),
      toLocation: formData.toLocation.trim(),
      linkType: formData.linkType,
      radioDevice: formData.radioDevice.trim(),
      frequency: formData.frequency.trim(),
      bandwidth: formData.bandwidth.trim(),
      linkStatus: formData.linkStatus,
      installationDate: formData.installationDate,
      responsiblePerson: formData.responsiblePerson.trim(),
      notes: formData.notes.trim(),
      createdAt: editIndex !== null ? towerLinks[editIndex]?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!cleanData.fromTower) {
      notify("Please select or enter From Tower.", "error");
      return;
    }

    if (!cleanData.toTower) {
      notify("Please select or enter To Tower.", "error");
      return;
    }

    if (cleanData.fromTower.toLowerCase() === cleanData.toTower.toLowerCase()) {
      notify("From Tower and To Tower cannot be the same.", "error");
      return;
    }

    if (!cleanData.radioDevice) {
      notify("Please enter radio device.", "error");
      return;
    }

    if (linkExists(cleanData)) {
      notify("This tower link already exists.", "error");
      return;
    }

    if (editIndex !== null) {
      const updatedLinks = [...towerLinks];
      updatedLinks[editIndex] = cleanData;

      const saved = await setTowerLinks(updatedLinks);

      if (saved) {
        notify("Tower link updated successfully.");
        closeModal();
      }

      return;
    }

    const saved = await setTowerLinks([...towerLinks, cleanData]);

    if (saved) {
      notify("Tower link saved successfully.");
      closeModal();
    }
  };

  const openEditModal = (index) => {
    setEditIndex(index);
    setFormData({
      ...emptyForm,
      ...towerLinks[index],
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

    const saved = await setTowerLinks(
      towerLinks.filter((_, index) => index !== deleteIndex)
    );

    if (saved) {
      notify("Tower link deleted successfully.");
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
    if (status === "Active") return "tower-link-badge active";
    if (status === "Down") return "tower-link-badge down";
    if (status === "Maintenance") return "tower-link-badge maintenance";
    if (status === "Pending") return "tower-link-badge pending";

    return "tower-link-badge";
  };

  return (
    <div className="tower-links-page">
      <div className="tower-links-header">
        <div>
          <h1>Tower Link Management</h1>
          <p>Manage links and connectivity between ISP towers.</p>
        </div>

        <button type="button" className="tower-link-add-btn" onClick={openCreateModal}>
          + Add Tower Link
        </button>
      </div>

      <div className="tower-link-stats">
        <div className="tower-link-stat-card">
          <span>Total Links</span>
          <strong>{towerLinks.length}</strong>
          <p>All tower link records</p>
        </div>

        <div className="tower-link-stat-card">
          <span>Active Links</span>
          <strong>{activeLinks}</strong>
          <p>Currently active links</p>
        </div>

        <div className="tower-link-stat-card">
          <span>PTP Links</span>
          <strong>{ptpLinks}</strong>
          <p>Point-to-point links</p>
        </div>

        <div className="tower-link-stat-card">
          <span>Down Links</span>
          <strong>{downLinks}</strong>
          <p>Unavailable links</p>
        </div>

        <div className="tower-link-stat-card">
          <span>Maintenance</span>
          <strong>{maintenanceLinks}</strong>
          <p>Links under maintenance</p>
        </div>
      </div>

      <div className="tower-link-table-card">
        <div className="tower-link-table-header">
          <div>
            <h3>Tower Link List</h3>
            <p>All recorded tower-to-tower connections.</p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tower link..."
          />
        </div>

        <div className="tower-link-table-wrap">
          <table>
            <thead>
              <tr>
                <th>From Tower</th>
                <th>To Tower</th>
                <th>Link Type</th>
                <th>Radio Device</th>
                <th>Frequency</th>
                <th>Bandwidth</th>
                <th>Status</th>
                <th>Installation Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredLinks.map((link) => {
                const index = link.originalIndex;

                return (
                  <tr key={link.id || index}>
                    <td className="tower-link-strong">{link.fromTower || "-"}</td>
                    <td>{link.toTower || "-"}</td>
                    <td>{link.linkType || "-"}</td>
                    <td>{link.radioDevice || "-"}</td>
                    <td>{link.frequency || "-"}</td>
                    <td>{link.bandwidth || "-"}</td>
                    <td>
                      <span className={getStatusClass(link.linkStatus)}>
                        {link.linkStatus || "Unknown"}
                      </span>
                    </td>
                    <td>
                      {formatDateTime(
                        link.installationDate,
                        link.createdAt || link.updatedAt
                      )}
                    </td>
                    <td>
                      <div className="tower-link-action-cell">
                        <button
                          type="button"
                          className="tower-link-action-btn"
                          onClick={(event) => toggleActionMenu(event, index)}
                        >
                          ⋮
                        </button>

                        {openAction === index && (
                          <div
                            className="tower-link-action-menu"
                            style={{
                              top: `${actionPosition.top}px`,
                              left: `${actionPosition.left}px`,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setDetailRecord(link);
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

              {filteredLinks.length === 0 && (
                <tr>
                  <td colSpan="9" className="tower-link-empty">
                    No tower link has been registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="tower-link-modal-backdrop">
          <div className="tower-link-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tower-link-modal-header">
              <div>
                <h3>{editIndex !== null ? "Edit Tower Link" : "Add Tower Link"}</h3>
                <p>Enter tower connection, radio, frequency, and status information.</p>
              </div>

              <button type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="tower-link-form-grid">
                <div className="tower-link-form-group">
                  <label>From Tower</label>
                  <select
                    value={`${formData.fromTower}|${formData.fromLocation}`}
                    onChange={handleFromTowerSelect}
                  >
                    <option value="|">Select From Tower</option>

                    {towerOptions.map((tower) => (
                      <option
                        key={`from-${tower.towerName}|${tower.towerLocation}`}
                        value={`${tower.towerName}|${tower.towerLocation}`}
                      >
                        {tower.towerName} - {tower.towerLocation || "No Location"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tower-link-form-group">
                  <label>To Tower</label>
                  <select
                    value={`${formData.toTower}|${formData.toLocation}`}
                    onChange={handleToTowerSelect}
                  >
                    <option value="|">Select To Tower</option>

                    {towerOptions.map((tower) => (
                      <option
                        key={`to-${tower.towerName}|${tower.towerLocation}`}
                        value={`${tower.towerName}|${tower.towerLocation}`}
                      >
                        {tower.towerName} - {tower.towerLocation || "No Location"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tower-link-form-group">
                  <label>Manual From Tower</label>
                  <input
                    name="fromTower"
                    value={formData.fromTower}
                    onChange={handleChange}
                    placeholder="Example: Main Tower"
                  />
                </div>

                <div className="tower-link-form-group">
                  <label>Manual To Tower</label>
                  <input
                    name="toTower"
                    value={formData.toTower}
                    onChange={handleChange}
                    placeholder="Example: Karte Naw Tower"
                  />
                </div>

                <div className="tower-link-form-group">
                  <label>From Location</label>
                  <input
                    name="fromLocation"
                    value={formData.fromLocation}
                    onChange={handleChange}
                    placeholder="Example: Kabul Center"
                  />
                </div>

                <div className="tower-link-form-group">
                  <label>To Location</label>
                  <input
                    name="toLocation"
                    value={formData.toLocation}
                    onChange={handleChange}
                    placeholder="Example: Karte Naw"
                  />
                </div>

                <div className="tower-link-form-group">
                  <label>Link Type</label>
                  <select name="linkType" value={formData.linkType} onChange={handleChange}>
                    <option value="PTP">PTP</option>
                    <option value="PTMP">PTMP</option>
                    <option value="Fiber">Fiber</option>
                    <option value="Wireless Bridge">Wireless Bridge</option>
                    <option value="Backup Link">Backup Link</option>
                  </select>
                </div>

                <div className="tower-link-form-group">
                  <label>Radio Device</label>
                  <input
                    name="radioDevice"
                    value={formData.radioDevice}
                    onChange={handleChange}
                    placeholder="Example: LiteBeam 5AC"
                  />
                </div>

                <div className="tower-link-form-group">
                  <label>Frequency</label>
                  <input
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    placeholder="Example: 5.8 GHz"
                  />
                </div>

                <div className="tower-link-form-group">
                  <label>Bandwidth</label>
                  <input
                    name="bandwidth"
                    value={formData.bandwidth}
                    onChange={handleChange}
                    placeholder="Example: 100 Mbps"
                  />
                </div>

                <div className="tower-link-form-group">
                  <label>Link Status</label>
                  <select name="linkStatus" value={formData.linkStatus} onChange={handleChange}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Down">Down</option>
                  </select>
                </div>

                <div className="tower-link-form-group">
                  <label>Installation Date</label>
                  <input
                    type="date"
                    name="installationDate"
                    value={formData.installationDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="tower-link-form-group">
                  <label>Responsible Person</label>
                  <input
                    name="responsiblePerson"
                    value={formData.responsiblePerson}
                    onChange={handleChange}
                    placeholder="Example: Ahmad"
                  />
                </div>

                <div className="tower-link-form-group tower-link-form-full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional tower link notes..."
                  />
                </div>
              </div>

              <div className="tower-link-modal-actions">
                <button type="button" className="tower-link-cancel-btn" onClick={closeModal}>
                  Cancel
                </button>

                <button type="submit" className="tower-link-save-btn">
                  {editIndex !== null ? "Save Changes" : "Save Tower Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailRecord && (
        <div className="tower-link-detail-backdrop" onClick={() => setDetailRecord(null)}>
          <div className="tower-link-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tower-link-detail-header">
              <div>
                <h3>Tower Link Full Detail</h3>
                <p>Complete tower link and radio connection information.</p>
              </div>

              <button type="button" onClick={() => setDetailRecord(null)}>
                ×
              </button>
            </div>

            <div className="tower-link-detail-grid">
              <div><span>From Tower</span><strong>{detailRecord.fromTower || "-"}</strong></div>
              <div><span>From Location</span><strong>{detailRecord.fromLocation || "-"}</strong></div>
              <div><span>To Tower</span><strong>{detailRecord.toTower || "-"}</strong></div>
              <div><span>To Location</span><strong>{detailRecord.toLocation || "-"}</strong></div>
              <div><span>Link Type</span><strong>{detailRecord.linkType || "-"}</strong></div>
              <div><span>Radio Device</span><strong>{detailRecord.radioDevice || "-"}</strong></div>
              <div><span>Frequency</span><strong>{detailRecord.frequency || "-"}</strong></div>
              <div><span>Bandwidth</span><strong>{detailRecord.bandwidth || "-"}</strong></div>
              <div><span>Link Status</span><strong>{detailRecord.linkStatus || "-"}</strong></div>
              <div>
                <span>Installation Date</span>
                <strong>
                  {formatDateTime(
                    detailRecord.installationDate,
                    detailRecord.createdAt || detailRecord.updatedAt
                  )}
                </strong>
              </div>
              <div><span>Responsible Person</span><strong>{detailRecord.responsiblePerson || "-"}</strong></div>
            </div>

            <div className="tower-link-detail-notes">
              <span>Notes</span>
              <p>{detailRecord.notes || "No notes have been added for this tower link."}</p>
            </div>

            <div className="tower-link-detail-actions">
              <button type="button" onClick={() => setDetailRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteIndex !== null && (
        <div className="tower-link-delete-backdrop" onClick={cancelDelete}>
          <div className="tower-link-delete-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tower-link-delete-icon">
              <TrashIcon />
            </div>

            <h3>Delete Tower Link</h3>
            <p>Are you sure you want to delete this tower link record?</p>

            <div className="tower-link-delete-actions">
              <button type="button" className="tower-link-delete-cancel" onClick={cancelDelete}>
                Cancel
              </button>

              <button type="button" className="tower-link-delete-confirm" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TowerLinks;
