import { useMemo, useState } from "react";
import { Edit3, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import { todayDateValue } from "../utils/afghanDate";
import "./UserManagement.css";

const defaultRoles = [
  "General Manager",
  "Tower Manager",
  "Storekeeper",
  "Technician",
  "Admin",
];

const permissionModules = [
  { key: "dashboard", label: "Dashboard" },
  { key: "suppliers", label: "Suppliers" },
  { key: "assets", label: "Asset & Inventory" },
  { key: "mainStock", label: "Main Stock" },
  { key: "deviceTransfer", label: "Device Transfer Management" },
  { key: "customers", label: "Customers" },
  { key: "towerAssets", label: "Tower Assets" },
  { key: "reports", label: "Reports" },
  { key: "repair", label: "Repair" },
  { key: "settings", label: "Settings" },
  { key: "userManagement", label: "User Management" },
  { key: "agent", label: "Agent / AI" },
];

const permissionActions = [
  { key: "view", label: "View" },
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
];

const emptyForm = {
  fullName: "",
  email: "",
  currentPassword: "",
  password: "",
  confirmPassword: "",
  secondaryPassword: "",
  confirmSecondaryPassword: "",
  role: "Admin",
  status: "Active",
  notes: "",
  permissions: {},
};

const makeFullPermissions = () =>
  permissionModules.reduce((permissions, module) => {
    permissions[module.key] = permissionActions.reduce((actions, action) => {
      actions[action.key] = true;
      return actions;
    }, {});
    return permissions;
  }, {});

const makeRolePermissions = (role) => {
  const permissions = makeFullPermissions();

  if (role === "Technician") {
    Object.keys(permissions).forEach((key) => {
      permissions[key] = { view: false, create: false, edit: false, delete: false };
    });
    ["dashboard", "mainStock", "deviceTransfer", "towerAssets", "repair"].forEach((key) => {
      permissions[key] = { view: true, create: true, edit: true, delete: false };
    });
  }

  if (role === "Storekeeper") {
    Object.keys(permissions).forEach((key) => {
      permissions[key] = { view: false, create: false, edit: false, delete: false };
    });
    ["dashboard", "assets", "mainStock", "deviceTransfer", "suppliers"].forEach((key) => {
      permissions[key] = { view: true, create: true, edit: true, delete: false };
    });
  }

  if (role === "Tower Manager") {
    Object.keys(permissions).forEach((key) => {
      permissions[key] = { view: false, create: false, edit: false, delete: false };
    });
    ["dashboard", "deviceTransfer", "towerAssets"].forEach((key) => {
      permissions[key] = { view: true, create: true, edit: true, delete: false };
    });
  }

  return permissions;
};

function UserManagement({ accounts, setAccounts, currentUser }) {
  const [userRoles, setUserRoles] = useJsonCollection("userRoles");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    ...emptyForm,
    permissions: makeRolePermissions("Admin"),
  });
  const [search, setSearch] = useState("");
  const [newRole, setNewRole] = useState("");

  const roles = useMemo(() => {
    const savedRoles = userRoles.map((role) => role.name || role.roleName).filter(Boolean);
    return Array.from(new Set([...defaultRoles, ...savedRoles]));
  }, [userRoles]);

  const filteredAccounts = accounts.filter((account) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return [account.fullName, account.email, account.username, account.role, account.status]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, permissions: makeRolePermissions("Admin") });
    setShowModal(true);
  };

  const openEdit = (account) => {
    setEditId(account.id);
    setForm({
      fullName: account.fullName || "",
      email: account.email || account.username || "",
      currentPassword: "",
      password: "",
      confirmPassword: "",
      secondaryPassword: "",
      confirmSecondaryPassword: "",
      role: account.role || "Admin",
      status: account.status || "Active",
      notes: account.notes || "",
      permissions: account.permissions || makeRolePermissions(account.role || "Admin"),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setForm({ ...emptyForm, permissions: makeRolePermissions("Admin") });
  };

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "role" ? { permissions: makeRolePermissions(value) } : {}),
    }));
  };

  const updatePermission = (moduleKey, actionKey, checked) => {
    setForm((previous) => ({
      ...previous,
      permissions: {
        ...previous.permissions,
        [moduleKey]: {
          ...(previous.permissions?.[moduleKey] || {}),
          [actionKey]: checked,
        },
      },
    }));
  };

  const saveRole = async () => {
    const roleName = newRole.trim();
    if (!roleName) return;
    if (roles.some((role) => role.toLowerCase() === roleName.toLowerCase())) {
      notify("This user category already exists.", "error");
      return;
    }
    const saved = await setUserRoles([
      ...userRoles,
      { id: Date.now(), name: roleName, createdAt: todayDateValue() },
    ]);
    if (!saved) return;
    setNewRole("");
    notify("User category added.");
  };

  const saveUser = async (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();

    if (!form.fullName.trim()) {
      notify("Please enter the account owner name.", "error");
      return;
    }
    if (!email) {
      notify("Please enter email or username.", "error");
      return;
    }
    if (!editId && !form.password) {
      notify("Please enter password.", "error");
      return;
    }
    if (form.password && form.password.length < 4) {
      notify("Password must be at least 4 characters.", "error");
      return;
    }
    if (form.secondaryPassword && form.secondaryPassword.length < 4) {
      notify("Secondary password must be at least 4 characters.", "error");
      return;
    }
    if (form.password !== form.confirmPassword) {
      notify("Password confirmation does not match.", "error");
      return;
    }
    if (form.secondaryPassword !== form.confirmSecondaryPassword) {
      notify("Secondary password confirmation does not match.", "error");
      return;
    }
    if (
      accounts.some(
        (account) =>
          String(account.id) !== String(editId) &&
          String(account.email || account.username || "").toLowerCase() === email
      )
    ) {
      notify("This email or username is already used.", "error");
      return;
    }

    const existingAccount = accounts.find((account) => String(account.id) === String(editId));
    const editingSelf = existingAccount && String(existingAccount.id) === String(currentUser.id);
    const changedOwnCredentials =
      editingSelf &&
      (email !== String(existingAccount.email || existingAccount.username || "").toLowerCase() ||
        Boolean(form.password) ||
        Boolean(form.secondaryPassword));

    if (changedOwnCredentials) {
      const currentPassword = form.currentPassword || "";
      const matchesCurrentPassword =
        currentPassword &&
        (currentPassword === existingAccount.password ||
          currentPassword === existingAccount.secondaryPassword);

      if (!matchesCurrentPassword) {
        notify("Enter your current primary or secondary password before changing this account.", "error");
        return;
      }
    }

    const payload = {
      fullName: form.fullName.trim(),
      email,
      role: form.role,
      status: form.status,
      notes: form.notes.trim(),
      permissions: form.permissions,
      updatedAt: new Date().toISOString(),
      ...(form.password ? { password: form.password } : {}),
      ...(form.secondaryPassword ? { secondaryPassword: form.secondaryPassword } : {}),
    };

    const saved = editId
      ? await setAccounts(
          accounts.map((account) =>
            String(account.id) === String(editId) ? { ...account, ...payload } : account
          )
        )
      : await setAccounts([
          ...accounts,
          {
            id: Date.now(),
            ...payload,
            createdAt: todayDateValue(),
          },
        ]);

    if (!saved) return;
    notify(editId ? "User account updated." : "User account created.");
    closeModal();
  };

  const removeUser = async (account) => {
    if (String(account.id) === String(currentUser.id)) {
      notify("You cannot delete the active account.", "error");
      return;
    }
    const isFullAdminAccount = (item) =>
      String(item.status || "Active").toLowerCase() === "active" &&
      (String(item.role || "").toLowerCase() === "admin" ||
        permissionModules.every((module) =>
          permissionActions.every((action) => item.permissions?.[module.key]?.[action.key])
        ));

    const fullAdmins = accounts.filter(isFullAdminAccount);
    if (isFullAdminAccount(account) && fullAdmins.length <= 1) {
      notify("You cannot delete the only full-permission administrator account.", "error");
      return;
    }

    const ok = await confirmAction({
      title: "Delete User Account",
      message: `Delete account ${account.fullName || account.email}?`,
      confirmText: "Delete",
    });
    if (!ok) return;
    const saved = await setAccounts(accounts.filter((item) => item.id !== account.id));
    if (!saved) return;
    notify("User account deleted.");
  };

  return (
    <div className="user-management-page">
      <div className="user-management-header">
        <div>
          <span>User Management</span>
          <h1>User Accounts & Permissions</h1>
          <p>Create accounts, assign roles, and control permissions for every system module.</p>
        </div>
        <button type="button" onClick={openCreate}>
          <UserPlus size={17} />
          Add User
        </button>
      </div>

      <div className="user-management-stats">
        <div>
          <span>Total Users</span>
          <strong>{accounts.length}</strong>
        </div>
        <div>
          <span>Active Users</span>
          <strong>{accounts.filter((account) => (account.status || "Active") === "Active").length}</strong>
        </div>
        <div>
          <span>User Categories</span>
          <strong>{roles.length}</strong>
        </div>
      </div>

      <section className="user-management-card">
        <div className="user-management-card-header">
          <div>
            <h3>User List</h3>
            <p>Accounts saved in the system.</p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user..."
          />
        </div>

        <div className="user-table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email / Username</th>
                <th>Category</th>
                <th>Status</th>
                <th>Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => (
                <tr key={account.id}>
                  <td className="user-name-cell">
                    <span>{(account.fullName || account.email || account.username || "U").slice(0, 1)}</span>
                    <strong>{account.fullName || account.email || account.username}</strong>
                  </td>
                  <td>{account.email || account.username || "-"}</td>
                  <td><b className="user-role-pill">{account.role || "Admin"}</b></td>
                  <td>{account.status || "Active"}</td>
                  <td>{Object.values(account.permissions || {}).filter((module) => module.view).length || "Full"} module(s)</td>
                  <td>
                    <div className="user-row-actions">
                      <button type="button" onClick={() => openEdit(account)}><Edit3 size={14} /> Edit</button>
                      <button type="button" className="danger" onClick={() => removeUser(account)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan="6" className="user-empty">No user was found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="user-management-card">
        <div className="user-management-card-header">
          <div>
            <h3>User Categories</h3>
            <p>Add more categories such as Admin, Technician, Storekeeper, or custom roles.</p>
          </div>
          <div className="user-role-add">
            <input value={newRole} onChange={(event) => setNewRole(event.target.value)} placeholder="New category..." />
            <button type="button" onClick={saveRole}><Plus size={15} /> Add</button>
          </div>
        </div>
        <div className="user-role-list">
          {roles.map((role) => <span key={role}>{role}</span>)}
        </div>
      </section>

      {showModal && (
        <div className="user-modal-backdrop">
          <div className="user-modal" onClick={(event) => event.stopPropagation()}>
            <div className="user-modal-header">
              <div>
                <h3>{editId ? "Edit User Account" : "Create User Account"}</h3>
                <p>Choose who this account belongs to and define its permissions.</p>
              </div>
              <button type="button" onClick={closeModal}>x</button>
            </div>

            <form onSubmit={saveUser}>
              <div className="user-form-grid">
                <label>
                  Account Owner
                  <input value={form.fullName} onChange={(event) => updateForm("fullName", event.target.value)} placeholder="Example: Ahmad" />
                </label>
                <label>
                  Email / Username
                  <input value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="name@example.com" />
                </label>
                <label>
                  User Category
                  <select value={form.role} onChange={(event) => updateForm("role", event.target.value)}>
                    {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
                <label>
                  Status
                  <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <label>
                  {editId ? "New Password (optional)" : "Password"}
                  <input type="password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} />
                </label>
                <label>
                  Confirm Password
                  <input type="password" value={form.confirmPassword} onChange={(event) => updateForm("confirmPassword", event.target.value)} />
                </label>
                <label>
                  Secondary Password
                  <input type="password" value={form.secondaryPassword} onChange={(event) => updateForm("secondaryPassword", event.target.value)} />
                </label>
                <label>
                  Confirm Secondary Password
                  <input type="password" value={form.confirmSecondaryPassword} onChange={(event) => updateForm("confirmSecondaryPassword", event.target.value)} />
                </label>
                {editId && String(editId) === String(currentUser.id) && (
                  <label className="user-form-full">
                    Current Password Required for Own Account Changes
                    <input
                      type="password"
                      value={form.currentPassword}
                      onChange={(event) => updateForm("currentPassword", event.target.value)}
                      placeholder="Enter primary or secondary current password"
                    />
                  </label>
                )}
                <label className="user-form-full">
                  Notes
                  <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="User notes..." />
                </label>
              </div>

              <div className="permission-panel">
                <div className="permission-panel-title">
                  <ShieldCheck size={17} />
                  <h4>Module Permissions</h4>
                </div>
                <div className="permission-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Module</th>
                        {permissionActions.map((action) => <th key={action.key}>{action.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {permissionModules.map((module) => (
                        <tr key={module.key}>
                          <td>{module.label}</td>
                          {permissionActions.map((action) => (
                            <td key={action.key}>
                              <input
                                type="checkbox"
                                checked={Boolean(form.permissions?.[module.key]?.[action.key])}
                                onChange={(event) => updatePermission(module.key, action.key, event.target.checked)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="user-modal-actions">
                <button type="button" onClick={closeModal}>Cancel</button>
                <button type="submit">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
