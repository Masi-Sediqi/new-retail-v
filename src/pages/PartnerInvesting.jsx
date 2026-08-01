import { useMemo, useState } from "react";
import {
  BarChart3,
  DollarSign,
  Eye,
  Handshake,
  Plus,
  Printer,
  Search,
  SquarePen,
  Trash2,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import FloatingActionMenu from "../components/FloatingActionMenu";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import "./PartnerInvesting.css";

const currencyCodes = [
  "AFN",
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "PKR",
  "INR",
  "IRR",
  "AED",
  "CNY",
];

const emptyAccount = {
  accountType: "partner",
  name: "",
  phone: "",
  email: "",
  businessType: "",
  currency: "AFN",
  status: "Active",
  address: "",
  notes: "",

  // Partner fields
  partnerPercent: "",
  partnerAmount: "",

  // Investing fields
  monthlyInvestment: "",
  monthlySharePercent: "",
};

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;

const getAccountName = (account) =>
  account.name ||
  account.accountName ||
  account.partnerName ||
  account.investorName ||
  "Unnamed Account";

function PartnerInvesting() {
  const [accounts, setAccounts] = useJsonCollection(
    "partnerInvestingAccounts"
  );
  const [settings] = useJsonCollection("settings");

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";

  const [activeTab, setActiveTab] = useState("partner");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteAccount, setDeleteAccount] = useState(null);
  const [viewAccount, setViewAccount] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const normalizedAccounts = useMemo(
    () =>
      accounts.map((account) => ({
        ...emptyAccount,
        ...account,
        id:
          account.id ||
          `partner-investing-${Date.now()}-${Math.random()}`,
        name: getAccountName(account),
        accountType: account.accountType || "partner",
        currency: account.currency || baseCurrency,
        status: account.status || "Active",
      })),
    [accounts, baseCurrency]
  );

  const tabAccounts = useMemo(
    () =>
      normalizedAccounts.filter(
        (account) => account.accountType === activeTab
      ),
    [activeTab, normalizedAccounts]
  );

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tabAccounts.filter((account) => {
      const searchableText = [
        account.name,
        account.phone,
        account.email,
        account.businessType,
        account.address,
        account.notes,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        String(account.status).toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tabAccounts]);

  const pagination = useTablePagination(
    filteredAccounts,
    `${activeTab}-${search}-${statusFilter}`
  );

  const totals = useMemo(() => {
    const partnerAccounts = normalizedAccounts.filter(
      (account) => account.accountType === "partner"
    );
    const investingAccounts = normalizedAccounts.filter(
      (account) => account.accountType === "investing"
    );

    return {
      partnerCount: partnerAccounts.length,
      investingCount: investingAccounts.length,
      partnerCapital: partnerAccounts.reduce(
        (sum, account) => sum + parseNumber(account.partnerAmount),
        0
      ),
      monthlyInvestment: investingAccounts.reduce(
        (sum, account) =>
          sum + parseNumber(account.monthlyInvestment),
        0
      ),
      activeCount: tabAccounts.filter(
        (account) =>
          String(account.status).toLowerCase() === "active"
      ).length,
    };
  }, [normalizedAccounts, tabAccounts]);

  const openCreateModal = () => {
    setEditingAccount(null);
    setModalOpen(true);
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setModalOpen(true);
  };

  const saveAccount = async (account) => {
    const cleanAccount = {
      ...account,
      id:
        account.id ||
        `partner-investing-${crypto.randomUUID()}`,
      accountType: activeTab,
      name: account.name.trim(),
      phone: account.phone.trim(),
      email: account.email.trim(),
      businessType: account.businessType.trim(),
      address: account.address.trim(),
      notes: account.notes.trim(),
      partnerPercent: parseNumber(account.partnerPercent),
      partnerAmount: parseNumber(account.partnerAmount),
      monthlyInvestment: parseNumber(account.monthlyInvestment),
      monthlySharePercent: parseNumber(
        account.monthlySharePercent
      ),
      status: account.status || "Active",
      updatedAt: new Date().toISOString(),
      createdAt:
        account.createdAt || new Date().toISOString(),
    };

    if (!cleanAccount.name) {
      notify("Please enter account name.", "error");
      return;
    }

    const saved = await setAccounts((current) => {
      const exists = current.some(
        (item) => String(item.id) === String(cleanAccount.id)
      );

      return exists
        ? current.map((item) =>
            String(item.id) === String(cleanAccount.id)
              ? cleanAccount
              : item
          )
        : [cleanAccount, ...current];
    });

    if (!saved) return;

    notify(
      editingAccount
        ? "Account updated successfully."
        : `${
            activeTab === "partner" ? "Partner" : "Investing"
          } account created successfully.`
    );

    setModalOpen(false);
    setEditingAccount(null);
  };

  const removeAccount = async () => {
    if (!deleteAccount) return;

    const saved = await setAccounts((current) =>
      current.filter(
        (account) =>
          String(account.id) !== String(deleteAccount.id)
      )
    );

    if (!saved) return;

    notify("Account deleted successfully.");
    setDeleteAccount(null);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="partner-investing-page">
      <div className="partner-investing-header">
        <div>
          <h1>Partner & Investing</h1>
          <p>
            Manage partner ownership accounts and monthly
            investing accounts.
          </p>
        </div>

        <div className="partner-investing-header-actions">
          <button
            type="button"
            className="partner-investing-light-btn"
            onClick={printReport}
          >
            <Printer size={16} />
            Print
          </button>

          <button
            type="button"
            className="partner-investing-primary-btn"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            Create Account
          </button>
        </div>
      </div>

      <section className="partner-investing-tabs">
        <button
          type="button"
          className={activeTab === "partner" ? "active" : ""}
          onClick={() => setActiveTab("partner")}
        >
          <Handshake size={16} />
          Partner
          <span>{totals.partnerCount}</span>
        </button>

        <button
          type="button"
          className={activeTab === "investing" ? "active" : ""}
          onClick={() => setActiveTab("investing")}
        >
          <TrendingUp size={16} />
          Investing
          <span>{totals.investingCount}</span>
        </button>
      </section>

      <section className="partner-investing-stats">
        <StatCard
          icon={Users}
          label={
            activeTab === "partner"
              ? "Partner Accounts"
              : "Investing Accounts"
          }
          value={tabAccounts.length}
        />

        <StatCard
          icon={WalletCards}
          label={
            activeTab === "partner"
              ? "Partner Capital"
              : "Monthly Investment"
          }
          value={formatCurrencyAmount(
            activeTab === "partner"
              ? totals.partnerCapital
              : totals.monthlyInvestment,
            baseCurrency
          )}
          tone="success"
        />

        <StatCard
          icon={BarChart3}
          label="Active Accounts"
          value={totals.activeCount}
        />

        <StatCard
          icon={DollarSign}
          label="Account Type"
          value={
            activeTab === "partner" ? "Partner" : "Investing"
          }
        />
      </section>

      <section className="partner-investing-card">
        <div className="partner-investing-toolbar">
          <label className="partner-investing-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${activeTab} accounts...`}
            />
          </label>

          <CustomSelect
            ariaLabel="Account status"
            className="partner-investing-filter"
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <div className="partner-investing-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>

                {activeTab === "partner" ? (
                  <>
                    <th>Partner Share</th>
                    <th>Partner Capital</th>
                  </>
                ) : (
                  <>
                    <th>Monthly Investment</th>
                    <th>Monthly Share</th>
                  </>
                )}

                <th>Currency</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {pagination.pageItems.map((account) => (
                <tr key={account.id}>
                  <td className="partner-investing-name-cell">
                    <strong>{account.name}</strong>
                    <span>
                      {account.businessType ||
                        (activeTab === "partner"
                          ? "Partner account"
                          : "Investing account")}
                    </span>
                  </td>

                  <td>
                    <span className="partner-investing-contact">
                      {account.phone || "-"}
                      <small>
                        {account.email || account.address || "No contact"}
                      </small>
                    </span>
                  </td>

                  {activeTab === "partner" ? (
                    <>
                      <td>
                        {parseNumber(account.partnerPercent)}%
                      </td>
                      <td>
                        {formatCurrencyAmount(
                          account.partnerAmount,
                          account.currency
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        {formatCurrencyAmount(
                          account.monthlyInvestment,
                          account.currency
                        )}
                      </td>
                      <td>
                        {parseNumber(account.monthlySharePercent)}%
                      </td>
                    </>
                  )}

                  <td>{account.currency}</td>

                  <td>
                    <span
                      className={`partner-investing-status ${
                        String(account.status).toLowerCase() ===
                        "inactive"
                          ? "inactive"
                          : "active"
                      }`}
                    >
                      {account.status}
                    </span>
                  </td>

                  <td>
                    <FloatingActionMenu
                      ariaLabel="Account actions"
                      actions={[
                        {
                          icon: <Eye size={15} />,
                          label: "View Detail",
                          onClick: () => setViewAccount(account),
                        },
                        {
                          icon: <SquarePen size={15} />,
                          label: "Edit",
                          onClick: () => openEditModal(account),
                        },
                        {
                          danger: true,
                          icon: <Trash2 size={15} />,
                          label: "Delete",
                          onClick: () => setDeleteAccount(account),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}

              {!filteredAccounts.length && (
                <tr>
                  <td
                    className="partner-investing-empty"
                    colSpan="7"
                  >
                    No {activeTab} account has been registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={filteredAccounts.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
        />
      </section>

      {modalOpen && (
        <AccountModal
          accountType={activeTab}
          initialAccount={editingAccount}
          onClose={() => {
            setModalOpen(false);
            setEditingAccount(null);
          }}
          onSave={saveAccount}
        />
      )}

      {viewAccount && (
        <DetailModal
          account={viewAccount}
          onClose={() => setViewAccount(null)}
        />
      )}

      {deleteAccount && (
        <ConfirmModal
          title="Delete Account"
          message={`Delete ${deleteAccount.name}? This account will be permanently removed.`}
          onClose={() => setDeleteAccount(null)}
          onConfirm={removeAccount}
        />
      )}
    </div>
  );
}

function AccountModal({
  accountType,
  initialAccount,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(() => ({
    ...emptyAccount,
    ...(initialAccount || {}),
    accountType,
    name: initialAccount ? getAccountName(initialAccount) : "",
  }));
  const [submitted, setSubmitted] = useState(false);

  const update = (field, value) =>
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

  return (
    <div className="partner-investing-modal-backdrop">
      <form
        className="partner-investing-modal"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);

          if (!form.name.trim()) return;

          onSave({
            ...form,
            accountType,
          });
        }}
      >
        <div className="partner-investing-modal-title">
          <div>
            <h2>
              {initialAccount ? "Edit" : "Create"}{" "}
              {accountType === "partner"
                ? "Partner Account"
                : "Investing Account"}
            </h2>
            <p>
              {accountType === "partner"
                ? "Register ownership percentage and partner capital."
                : "Register monthly investment and monthly share percentage."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className="partner-investing-form-grid">
          <Field
            label="Name"
            required
            invalid={submitted && !form.name.trim()}
          >
            <input
              autoFocus
              value={form.name}
              onChange={(event) =>
                update("name", event.target.value)
              }
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(event) =>
                update("phone", event.target.value)
              }
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                update("email", event.target.value)
              }
            />
          </Field>

          <Field label="Business Type">
            <input
              value={form.businessType}
              onChange={(event) =>
                update("businessType", event.target.value)
              }
            />
          </Field>

          <Field label="Currency">
            <CustomSelect
              ariaLabel="Currency"
              options={currencyCodes.map((code) => ({
                value: code,
                label: code,
              }))}
              value={form.currency}
              onChange={(value) => update("currency", value)}
            />
          </Field>

          <Field label="Status">
            <CustomSelect
              ariaLabel="Status"
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
              ]}
              value={form.status}
              onChange={(value) => update("status", value)}
            />
          </Field>

          {accountType === "partner" ? (
            <>
              <Field label="Partner Share Percentage">
                <div className="partner-investing-input-suffix">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.partnerPercent}
                    onChange={(event) =>
                      update("partnerPercent", event.target.value)
                    }
                    placeholder="Example: 30"
                  />
                  <span>%</span>
                </div>
              </Field>

              <Field label="Partner Capital Amount">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.partnerAmount}
                  onChange={(event) =>
                    update("partnerAmount", event.target.value)
                  }
                  placeholder="Amount paid for this partnership"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Monthly Investment Amount">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyInvestment}
                  onChange={(event) =>
                    update(
                      "monthlyInvestment",
                      event.target.value
                    )
                  }
                  placeholder="Amount paid every month"
                />
              </Field>

              <Field label="Monthly Share Percentage">
                <div className="partner-investing-input-suffix">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.monthlySharePercent}
                    onChange={(event) =>
                      update(
                        "monthlySharePercent",
                        event.target.value
                      )
                    }
                    placeholder="Example: 10"
                  />
                  <span>%</span>
                </div>
              </Field>
            </>
          )}

          <Field label="Address" className="full">
            <input
              value={form.address}
              onChange={(event) =>
                update("address", event.target.value)
              }
            />
          </Field>

          <Field label="Notes" className="full">
            <textarea
              value={form.notes}
              onChange={(event) =>
                update("notes", event.target.value)
              }
            />
          </Field>
        </div>

        <div className="partner-investing-modal-actions">
          <button
            type="button"
            className="partner-investing-light-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="partner-investing-primary-btn"
          >
            {initialAccount ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DetailModal({ account, onClose }) {
  const isPartner = account.accountType === "partner";

  return (
    <div className="partner-investing-modal-backdrop">
      <div className="partner-investing-detail-modal">
        <div className="partner-investing-modal-title">
          <div>
            <h2>{account.name}</h2>
            <p>
              {isPartner ? "Partner Account" : "Investing Account"}
            </p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="partner-investing-detail-grid">
          <DetailItem label="Phone" value={account.phone || "-"} />
          <DetailItem label="Email" value={account.email || "-"} />
          <DetailItem
            label="Business Type"
            value={account.businessType || "-"}
          />
          <DetailItem label="Currency" value={account.currency} />
          <DetailItem label="Status" value={account.status} />

          {isPartner ? (
            <>
              <DetailItem
                label="Partner Share"
                value={`${parseNumber(account.partnerPercent)}%`}
              />
              <DetailItem
                label="Partner Capital"
                value={formatCurrencyAmount(
                  account.partnerAmount,
                  account.currency
                )}
              />
            </>
          ) : (
            <>
              <DetailItem
                label="Monthly Investment"
                value={formatCurrencyAmount(
                  account.monthlyInvestment,
                  account.currency
                )}
              />
              <DetailItem
                label="Monthly Share"
                value={`${parseNumber(
                  account.monthlySharePercent
                )}%`}
              />
            </>
          )}

          <DetailItem
            label="Address"
            value={account.address || "-"}
            full
          />
          <DetailItem
            label="Notes"
            value={account.notes || "-"}
            full
          />
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, full = false }) {
  return (
    <div
      className={`partner-investing-detail-item ${
        full ? "full" : ""
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({
  children,
  className = "",
  invalid = false,
  label,
  required = false,
}) {
  return (
    <label
      className={`partner-investing-form-field ${className} ${
        invalid ? "invalid" : ""
      }`.trim()}
    >
      <span>
        {label}
        {required && <em>*</em>}
      </span>

      {children}

      {invalid && <small>This field is required.</small>}
    </label>
  );
}

function StatCard({ icon: Icon, label, tone = "", value }) {
  return (
    <article
      className={`partner-investing-stat-card ${tone}`.trim()}
    >
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <Icon size={22} />
    </article>
  );
}

function ConfirmModal({
  message,
  onClose,
  onConfirm,
  title,
}) {
  return (
    <div className="partner-investing-modal-backdrop">
      <div className="partner-investing-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>

        <div className="partner-investing-modal-actions">
          <button
            type="button"
            className="partner-investing-light-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="partner-investing-danger-btn"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default PartnerInvesting;