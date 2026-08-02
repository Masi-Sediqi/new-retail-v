import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CreditCard,
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
import StandardPrintStudio from "../components/StandardPrintStudio";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { currencyMatchesFilter, useBusinessCurrencyFilter } from "../hooks/useBusinessCurrencyFilter";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import {
  convertCurrencyAmount,
  formatCurrencyAmount,
} from "../utils/currencyExchange";
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
const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const getAccountName = (account) =>
  account.name ||
  account.accountName ||
  account.partnerName ||
  account.investorName ||
  "Unnamed Account";

const getPaymentLedger = (account) =>
  Array.isArray(account.paymentLedger) ? account.paymentLedger : [];

const getPaymentPercent = (account) =>
  parseNumber(
    account.accountType === "partner"
      ? account.partnerPercent
      : account.monthlySharePercent
  );

const getLedgerSummary = (account) => {
  const ledger = getPaymentLedger(account);
  const paid = ledger.reduce(
    (sum, entry) => sum + parseNumber(entry.paidAmount),
    0
  );
  const balance = ledger.reduce(
    (sum, entry) => sum + parseNumber(entry.balanceDelta),
    0
  );

  return {
    balance,
    paid,
    payable: Math.max(0, balance),
    receivable: Math.max(0, -balance),
  };
};

const isCashWalletTransaction = (transaction) =>
  /cash-wallet|cash wallet/i.test(
    `${transaction.source || ""} ${transaction.category || ""}`
  );

const getTransactionDirection = (transaction) =>
  /withdraw|expense|payment out/i.test(
    `${transaction.transactionType || ""} ${transaction.type || ""}`
  )
    ? -1
    : 1;

function PartnerInvesting() {
  const [accounts, setAccounts] = useJsonCollection(
    "partnerInvestingAccounts"
  );
  const [transactions, setTransactions] =
    useJsonCollection("transactions");
  const [settings] = useJsonCollection("settings");
  const businessCurrencyFilter = useBusinessCurrencyFilter();

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";
  const exchangeRates = company.exchangeRates || {};

  const [activeTab, setActiveTab] = useState("partner");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteAccount, setDeleteAccount] = useState(null);
  const [viewAccount, setViewAccount] = useState(null);
  const [paymentAccountId, setPaymentAccountId] = useState(null);
  const [paymentDraft, setPaymentDraft] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [printReportOpen, setPrintReportOpen] = useState(false);

  const normalizedAccounts = useMemo(
    () =>
      accounts.map((account, index) => ({
        ...emptyAccount,
        ...account,
        id:
          account.id ||
          `partner-investing-${account.accountType || "account"}-${index}`,
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
        (account) =>
          account.accountType === activeTab &&
          currencyMatchesFilter(account.currency, businessCurrencyFilter)
      ),
    [activeTab, businessCurrencyFilter, normalizedAccounts]
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

  const paymentAccount = useMemo(
    () =>
      normalizedAccounts.find(
        (account) => String(account.id) === String(paymentAccountId)
      ) || null,
    [normalizedAccounts, paymentAccountId]
  );

  const getCashWalletTotal = (targetCurrency) => {
    const missingCurrencies = new Set();
    const total = transactions.reduce((sum, transaction) => {
      if (!isCashWalletTransaction(transaction)) return sum;

      const amount =
        getTransactionDirection(transaction) *
        parseNumber(transaction.amount);
      const fromCurrency = transaction.currency || baseCurrency;
      const converted = convertCurrencyAmount(amount, {
        baseCurrency,
        exchangeRates,
        fromCurrency,
        targetCurrency,
      });

      if (converted === null) {
        missingCurrencies.add(fromCurrency);
        return sum;
      }

      return sum + converted;
    }, 0);

    return {
      missingCurrencies: [...missingCurrencies],
      total: roundMoney(total),
    };
  };

  const getSuggestedPayment = (account) => {
    const wallet = getCashWalletTotal(account.currency || baseCurrency);
    const percent = getPaymentPercent(account);

    return {
      ...wallet,
      percent,
      suggestedAmount: roundMoney(wallet.total * (percent / 100)),
    };
  };

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

  const reportRows = useMemo(
    () =>
      filteredAccounts.map((account) =>
        activeTab === "partner"
          ? {
              Name: account.name,
              Contact: account.phone || account.email || "-",
              "Partner Share": `${parseNumber(account.partnerPercent)}%`,
              "Partner Capital": formatCurrencyAmount(account.partnerAmount, account.currency),
              Currency: account.currency,
              Status: account.status,
            }
          : {
              Name: account.name,
              Contact: account.phone || account.email || "-",
              "Monthly Investment": formatCurrencyAmount(account.monthlyInvestment, account.currency),
              "Monthly Share": `${parseNumber(account.monthlySharePercent)}%`,
              Currency: account.currency,
              Status: account.status,
            }
      ),
    [activeTab, filteredAccounts]
  );
  const reportColumns =
    activeTab === "partner"
      ? ["Name", "Contact", "Partner Share", "Partner Capital", "Currency", "Status"]
      : ["Name", "Contact", "Monthly Investment", "Monthly Share", "Currency", "Status"];

  const openPaymentDraft = () => {
    if (!paymentAccount) return;

    const suggested = getSuggestedPayment(paymentAccount);
    if (suggested.missingCurrencies.length) {
      notify(
        `Exchange rate is missing for ${suggested.missingCurrencies.join(
          ", "
        )}. Those Cash Wallet amounts were not included.`,
        "warning"
      );
    }

    setPaymentDraft({
      date: new Date().toISOString().slice(0, 10),
      walletTotal: suggested.total,
      percent: suggested.percent,
      expectedAmount: suggested.suggestedAmount,
      paidAmount: suggested.suggestedAmount,
      currency: paymentAccount.currency || baseCurrency,
      notes: "",
    });
  };

  const savePayment = async (draft) => {
    if (!paymentAccount) return;

    const paidAmount = roundMoney(parseNumber(draft.paidAmount));
    if (paidAmount <= 0) {
      notify("Please enter paid amount.", "error");
      return;
    }

    const now = new Date().toISOString();
    const paymentEntry = {
      id: `partner-payment-${Date.now()}`,
      accountId: paymentAccount.id,
      accountType: paymentAccount.accountType,
      date: draft.date || now.slice(0, 10),
      walletTotal: roundMoney(draft.walletTotal),
      percent: parseNumber(draft.percent),
      expectedAmount: roundMoney(draft.expectedAmount),
      paidAmount,
      balanceDelta: roundMoney(parseNumber(draft.expectedAmount) - paidAmount),
      currency: draft.currency,
      notes: draft.notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    const saved = await setAccounts((current) =>
      current.map((account) =>
        String(account.id) === String(paymentAccount.id)
          ? {
              ...account,
              paymentLedger: [
                paymentEntry,
                ...getPaymentLedger(account),
              ],
              updatedAt: now,
            }
          : account
      )
    );
    if (!saved) return;

    const walletTransaction = {
      id: `partner-investing-payment-${paymentEntry.id}`,
      transactionType: "withdraw",
      type: "expense",
      title: `Payment to ${paymentAccount.name}`,
      amount: paidAmount,
      date: paymentEntry.date,
      createdAt: now,
      updatedAt: now,
      description:
        paymentEntry.notes ||
        `${paymentEntry.percent}% of Cash Wallet for ${paymentAccount.name}`,
      note: paymentEntry.notes,
      source: "cash-wallet",
      referenceSource: "partner-investing",
      category: "Cash Wallet",
      module: "partner-investing-payment",
      paymentEntryId: paymentEntry.id,
      referenceId: paymentAccount.id,
      partnerInvestingAccountId: paymentAccount.id,
      accountName: paymentAccount.name,
      currency: paymentEntry.currency,
    };

    const transactionSaved = await setTransactions((current) => [
      walletTransaction,
      ...current,
    ]);

    if (transactionSaved) {
      window.dispatchEvent(
        new CustomEvent("cash-wallet-updated", {
          detail: walletTransaction,
        })
      );
    }

    notify("Payment saved and deducted from Cash Wallet.");
    setPaymentDraft(null);
  };

  if (paymentAccount) {
    return (
      <PaymentLedgerView
        account={paymentAccount}
        onBack={() => {
          setPaymentAccountId(null);
          setPaymentDraft(null);
        }}
        onOpenPayment={openPaymentDraft}
        suggested={getSuggestedPayment(paymentAccount)}
      >
        {paymentDraft && (
          <PaymentModal
            account={paymentAccount}
            draft={paymentDraft}
            onChange={setPaymentDraft}
            onClose={() => setPaymentDraft(null)}
            onSave={savePayment}
          />
        )}
      </PaymentLedgerView>
    );
  }

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
            onClick={() => setPrintReportOpen(true)}
          >
            <Printer size={16} />
            Print Report
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
                          icon: <CreditCard size={15} />,
                          label: "Payment",
                          onClick: () => setPaymentAccountId(account.id),
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

      {printReportOpen && (
        <StandardPrintStudio
          columns={reportColumns}
          company={company}
          filename={`${activeTab}-investing-report`}
          Icon={activeTab === "partner" ? Handshake : TrendingUp}
          rows={reportRows}
          stats={[
            { label: "Accounts", value: filteredAccounts.length },
            {
              label: activeTab === "partner" ? "Capital" : "Monthly",
              value: formatCurrencyAmount(
                activeTab === "partner" ? totals.partnerCapital : totals.monthlyInvestment,
                baseCurrency
              ),
            },
            { label: "Active", value: totals.activeCount },
          ]}
          subtitle={`All filtered ${activeTab} records`}
          title={`${activeTab === "partner" ? "Partner" : "Investing"} Report`}
          onClose={() => setPrintReportOpen(false)}
        />
      )}
    </div>
  );
}

function PaymentLedgerView({
  account,
  children,
  onBack,
  onOpenPayment,
  suggested,
}) {
  const isPartner = account.accountType === "partner";
  const ledger = getPaymentLedger(account);
  const summary = getLedgerSummary(account);
  const actionLabel = isPartner
    ? "Add Payment"
    : `Payment to ${account.name}`;

  return (
    <div className="partner-investing-page">
      <div className="partner-payment-header">
        <button
          type="button"
          className="partner-investing-light-btn"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          type="button"
          className="partner-investing-primary-btn"
          onClick={onOpenPayment}
        >
          <CreditCard size={16} />
          {actionLabel}
        </button>
      </div>

      <section className="partner-payment-profile">
        <div>
          <span>{isPartner ? "Partner" : "Investing Account"}</span>
          <h1>{account.name}</h1>
          <p>
            {isPartner
              ? `${parseNumber(account.partnerPercent)}% partner share`
              : `${parseNumber(
                  account.monthlySharePercent
                )}% monthly share`}
          </p>
        </div>

        <div className="partner-payment-profile-grid">
          <PaymentMetric
            label={isPartner ? "Capital Given" : "Monthly Gives Us"}
            value={formatCurrencyAmount(
              isPartner
                ? account.partnerAmount
                : account.monthlyInvestment,
              account.currency
            )}
          />
          <PaymentMetric
            label="Cash Wallet Share"
            value={formatCurrencyAmount(
              suggested.suggestedAmount,
              account.currency
            )}
          />
          <PaymentMetric
            label="Paid"
            value={formatCurrencyAmount(summary.paid, account.currency)}
          />
          <PaymentMetric
            label="We Owe"
            value={formatCurrencyAmount(
              summary.payable,
              account.currency
            )}
            tone={summary.payable ? "warning" : ""}
          />
          <PaymentMetric
            label="They Owe Us"
            value={formatCurrencyAmount(
              summary.receivable,
              account.currency
            )}
            tone={summary.receivable ? "success" : ""}
          />
        </div>
      </section>

      {!!suggested.missingCurrencies.length && (
        <div className="partner-payment-warning">
          Exchange rate is missing for{" "}
          {suggested.missingCurrencies.join(", ")}. Those wallet amounts
          are not included in this calculation.
        </div>
      )}

      <section className="partner-investing-card">
        <div className="partner-payment-ledger-title">
          <div>
            <h2>Payment Ledger</h2>
            <p>
              Expected share minus paid amount becomes payable; extra paid
              becomes receivable.
            </p>
          </div>
        </div>

        <div className="partner-investing-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cash Wallet</th>
                <th>Percent</th>
                <th>Expected</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Notes</th>
              </tr>
            </thead>

            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.date}</td>
                  <td>
                    {formatCurrencyAmount(
                      entry.walletTotal,
                      entry.currency
                    )}
                  </td>
                  <td>{parseNumber(entry.percent)}%</td>
                  <td>
                    {formatCurrencyAmount(
                      entry.expectedAmount,
                      entry.currency
                    )}
                  </td>
                  <td>
                    {formatCurrencyAmount(
                      entry.paidAmount,
                      entry.currency
                    )}
                  </td>
                  <td>
                    <span
                      className={`partner-payment-balance ${
                        parseNumber(entry.balanceDelta) < 0
                          ? "receivable"
                          : parseNumber(entry.balanceDelta) > 0
                            ? "payable"
                            : ""
                      }`.trim()}
                    >
                      {parseNumber(entry.balanceDelta) < 0
                        ? "They owe us "
                        : parseNumber(entry.balanceDelta) > 0
                          ? "We owe "
                          : ""}
                      {formatCurrencyAmount(
                        Math.abs(parseNumber(entry.balanceDelta)),
                        entry.currency
                      )}
                    </span>
                  </td>
                  <td>{entry.notes || "-"}</td>
                </tr>
              ))}

              {!ledger.length && (
                <tr>
                  <td className="partner-investing-empty" colSpan="7">
                    No payment has been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {children}
    </div>
  );
}

function PaymentMetric({ label, tone = "", value }) {
  return (
    <article className={`partner-payment-metric ${tone}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PaymentModal({
  account,
  draft,
  onChange,
  onClose,
  onSave,
}) {
  const update = (field, value) =>
    onChange((current) => ({
      ...current,
      [field]: value,
    }));

  return (
    <div className="partner-investing-modal-backdrop">
      <form
        className="partner-investing-modal"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
      >
        <div className="partner-investing-modal-title">
          <div>
            <h2>Payment to {account.name}</h2>
            <p>
              Paid amount is prefilled from Cash Wallet percentage and can
              be adjusted.
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="partner-investing-form-grid">
          <Field label="Date">
            <input
              type="date"
              value={draft.date}
              onChange={(event) => update("date", event.target.value)}
            />
          </Field>

          <Field label="Cash Wallet Total">
            <input
              readOnly
              value={formatCurrencyAmount(
                draft.walletTotal,
                draft.currency
              )}
            />
          </Field>

          <Field label="Share Percent">
            <div className="partner-investing-input-suffix">
              <input readOnly value={draft.percent} />
              <span>%</span>
            </div>
          </Field>

          <Field label="Expected Amount">
            <input
              readOnly
              value={formatCurrencyAmount(
                draft.expectedAmount,
                draft.currency
              )}
            />
          </Field>

          <Field label="Paid">
            <input
              autoFocus
              type="number"
              min="0"
              step="0.01"
              value={draft.paidAmount}
              onChange={(event) =>
                update("paidAmount", event.target.value)
              }
            />
          </Field>

          <Field label="Notes" className="full">
            <textarea
              value={draft.notes}
              onChange={(event) => update("notes", event.target.value)}
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
            Save Payment
          </button>
        </div>
      </form>
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
