import { useState } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import { todayDateValue } from "../utils/afghanDate";
import "./Accounts.css";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function Accounts({ accounts, setAccounts, currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const openEdit = (account) => {
    setEditId(account.id);

    setForm({
      fullName: account.fullName || "",
      email: account.email || "",
      password: "",
      confirmPassword: "",
    });

    setShowModal(true);
  };

  const close = () => {
    setShowModal(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const save = async (event) => {
    event.preventDefault();

    if (!form.fullName.trim()) {
      return notify("Please enter the full name.", "error");
    }

    if (!form.email.trim()) {
      return notify("Please enter the email address.", "error");
    }

    if (!editId && !form.password) {
      return notify("Please enter a password.", "error");
    }

    if (form.password && form.password.length < 4) {
      return notify("The password must be at least four characters.", "error");
    }

    if (form.password !== form.confirmPassword) {
      return notify("The password confirmation does not match.", "error");
    }

    const email = form.email.trim().toLowerCase();

    if (
      accounts.some(
        (item) =>
          item.id !== editId &&
          String(item.email || "").toLowerCase() === email
      )
    ) {
      return notify("This email address is already in use.", "error");
    }

    let saved;

    if (editId) {
      saved = await setAccounts(
        accounts.map((item) =>
          item.id === editId
            ? {
                ...item,
                fullName: form.fullName.trim(),
                email,
                ...(form.password ? { password: form.password } : {}),
              }
            : item
        )
      );

      if (!saved) return;

      notify("Account updated successfully.");
    } else {
      saved = await setAccounts([
        ...accounts,
        {
          id: Date.now(),
          fullName: form.fullName.trim(),
          email,
          password: form.password,
          role: "Full Administrator",
          createdAt: todayDateValue(),
        },
      ]);

      if (!saved) return;

      notify("New account created successfully.");
    }

    close();
  };

  const remove = async (account) => {
    if (account.id === currentUser.id) {
      return notify("You cannot delete your active account.", "error");
    }

    const ok = await confirmAction({
      title: "Delete Account",
      message: `Are you sure you want to delete the account ${
        account.fullName || account.email || account.username
      }?`,
      confirmText: "Delete",
    });

    if (!ok) {
      return;
    }

    const saved = await setAccounts(
      accounts.filter((item) => item.id !== account.id)
    );

    if (!saved) return;

    notify("Account deleted successfully.");
  };

  const filtered = accounts.filter(
    (account) =>
      (account.fullName || "").includes(search) ||
      (account.email || account.username || "").includes(search)
  );

  return (
    <div className="accounts-page">
      <div className="accounts-header">
        <div>
          <h1>Account Management</h1>
          <p>All accounts currently have full system permissions.</p>
        </div>

        <button type="button" onClick={() => setShowModal(true)}>
          <UserPlus size={17} />
          Create Account
        </button>
      </div>

      <div className="accounts-card">
        <div className="accounts-card-header">
          <div>
            <h3>Account List</h3>
            <p>
              {accounts.length} registered{" "}
              {accounts.length === 1 ? "account" : "accounts"}
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search accounts..."
          />
        </div>

        <div className="accounts-grid">
          {filtered.map((account) => (
            <article key={account.id} className="account-item">
              <div className="account-avatar">
                {(account.fullName || account.email || account.username).slice(
                  0,
                  1
                )}
              </div>

              <div className="account-info">
                <h3>
                  {account.fullName || account.email || account.username}
                </h3>

                <p>
                  {account.email ||
                    `Legacy account: ${account.username}`}
                </p>

                <span>{account.role || "Full Administrator"}</span>
              </div>

              <div className="account-actions">
                <button
                  type="button"
                  onClick={() => openEdit(account)}
                  aria-label="Edit account"
                  title="Edit Account"
                >
                  <Pencil size={15} />
                </button>

                <button
                  type="button"
                  className="danger"
                  onClick={() => remove(account)}
                  aria-label="Delete account"
                  title="Delete Account"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="account-modal-backdrop">
          <div
            className="account-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="account-modal-header">
              <div>
                <h3>
                  {editId ? "Edit Account" : "Create New Account"}
                </h3>
                <p>This account will have full system permissions.</p>
              </div>

              <button
                type="button"
                onClick={close}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={save} noValidate>
              <label>
                Full Name
                <input
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      fullName: event.target.value,
                    })
                  }
                  placeholder="Enter full name"
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  placeholder="name@example.com"
                />
              </label>

              <label>
                {editId ? "New Password (Optional)" : "Password"}
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      password: event.target.value,
                    })
                  }
                  placeholder={
                    editId
                      ? "Leave empty to keep the current password"
                      : "Enter password"
                  }
                />
              </label>

              <label>
                Confirm Password
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      confirmPassword: event.target.value,
                    })
                  }
                  placeholder="Confirm password"
                />
              </label>

              <div>
                <button type="button" onClick={close}>
                  Cancel
                </button>

                <button type="submit">
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Accounts;
