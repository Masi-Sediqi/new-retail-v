import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CircleDollarSign,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  Repeat2,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import StandardPrintStudio from "../components/StandardPrintStudio";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { formatCurrencyAmount } from "../utils/currencyExchange";
import { LedgerAmount } from "../utils/ledgerDisplay";
import { notify } from "../utils/notify";
import { limitPhoneValue, normalizePhoneRules } from "../utils/phoneRules";
import "./Transfer.css";

const currencies = ["AFN", "USD", "EUR", "GBP", "SAR", "PKR", "INR", "IRR", "AED", "CNY"];
const todayInput = () => new Date().toISOString().slice(0, 10);
const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Math.round((parseNumber(value) + Number.EPSILON) * 100) / 100;

const emptyAccount = {
  name: "",
  phone: "",
  email: "",
  currency: "AFN",
  openingBalance: "",
  openingMode: "theyOweUs",
  address: "",
};

const emptyLedger = {
  type: "credit",
  date: todayInput(),
  fromCurrency: "USD",
  fromAmount: "",
  toCurrency: "AFN",
  toAmount: "",
  rate: "",
  note: "",
};

const getDateLabel = (value) => {
  if (!value) return "-";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const getSignedOpening = (account) => {
  const amount = parseNumber(account.openingBalance ?? account.balance);
  return account.openingMode === "weOweThem" ? amount : -amount;
};

function accountName(account) {
  return account.name || account.exchangerName || "Unnamed exchanger";
}

function Transfer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useJsonCollection("transferAccounts");
  const [ledger, setLedger] = useJsonCollection("transferLedger");
  const [settings] = useJsonCollection("settings");
  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";
  const phoneRules = normalizePhoneRules(company);

  const [search, setSearch] = useState("");
  const [accountModal, setAccountModal] = useState(null);
  const [deleteAccount, setDeleteAccount] = useState(null);
  const [ledgerModal, setLedgerModal] = useState(null);
  const [deleteLedger, setDeleteLedger] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  const normalizedAccounts = useMemo(
    () =>
      accounts.map((account) => ({
        ...emptyAccount,
        ...account,
        id: account.id || `transfer-${accountName(account)}`,
        currency: account.currency || baseCurrency,
      })),
    [accounts, baseCurrency]
  );

  const normalizedLedger = useMemo(
    () =>
      ledger.map((row) => ({
        ...emptyLedger,
        ...row,
        id: row.id || `transfer-ledger-${crypto.randomUUID()}`,
        date: row.date || todayInput(),
      })),
    [ledger]
  );

  const getRowsForAccount = (accountId) =>
    normalizedLedger.filter((row) => String(row.exchangerId) === String(accountId));

  const getBalance = (account) =>
    getRowsForAccount(account.id).reduce((sum, row) => {
      const amount = parseNumber(row.toAmount || row.fromAmount);
      return sum + (row.type === "credit" ? amount : -amount);
    }, getSignedOpening(account));

  const activeAccount = normalizedAccounts.find((account) => String(account.id) === String(id));

  const filteredAccounts = normalizedAccounts.filter((account) => {
    const query = search.trim().toLowerCase();
    const text = [accountName(account), account.phone, account.email, account.currency, account.address].join(" ").toLowerCase();
    return !query || text.includes(query);
  });

  const pagination = useTablePagination(filteredAccounts, search);
  const totals = normalizedAccounts.reduce(
    (summary, account) => {
      const balance = getBalance(account);
      return {
        count: summary.count + 1,
        theyOweUs: summary.theyOweUs + Math.max(0, -balance),
        weOweThem: summary.weOweThem + Math.max(0, balance),
      };
    },
    { count: 0, theyOweUs: 0, weOweThem: 0 }
  );

  const saveAccount = async (form) => {
    if (!form.name.trim()) {
      notify("Please enter exchanger name.", "error");
      return;
    }
    const record = {
      ...form,
      id: form.id || `transfer-${crypto.randomUUID()}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      openingBalance: roundMoney(form.openingBalance),
      currency: form.currency || baseCurrency,
      updatedAt: new Date().toISOString(),
      createdAt: form.createdAt || new Date().toISOString(),
    };
    const saved = await setAccounts((current) => {
      const exists = current.some((item) => String(item.id) === String(record.id));
      return exists ? current.map((item) => (String(item.id) === String(record.id) ? record : item)) : [record, ...current];
    });
    if (!saved) return;
    notify(form.id ? "Transfer account updated successfully." : "Transfer account saved successfully.");
    setAccountModal(null);
  };

  const removeAccount = async () => {
    if (!deleteAccount) return;
    const savedAccounts = await setAccounts((current) => current.filter((account) => String(account.id) !== String(deleteAccount.id)));
    if (!savedAccounts) return;
    await setLedger((current) => current.filter((row) => String(row.exchangerId) !== String(deleteAccount.id)));
    notify("Transfer account deleted successfully.");
    setDeleteAccount(null);
    if (String(id) === String(deleteAccount.id)) navigate("/transfer");
  };

  const saveLedger = async (form) => {
    if (!activeAccount) return;
    if (parseNumber(form.fromAmount) <= 0 || parseNumber(form.toAmount) <= 0) {
      notify("Please enter valid transfer amounts.", "error");
      return;
    }
    const record = {
      ...form,
      id: form.id || `transfer-ledger-${crypto.randomUUID()}`,
      exchangerId: activeAccount.id,
      fromAmount: roundMoney(form.fromAmount),
      toAmount: roundMoney(form.toAmount),
      rate: roundMoney(form.rate || parseNumber(form.toAmount) / Math.max(parseNumber(form.fromAmount), 1)),
      note: form.note.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: form.createdAt || new Date().toISOString(),
    };
    const saved = await setLedger((current) => {
      const exists = current.some((row) => String(row.id) === String(record.id));
      return exists ? current.map((row) => (String(row.id) === String(record.id) ? record : row)) : [record, ...current];
    });
    if (!saved) return;
    notify(form.id ? "Transfer record updated successfully." : "Transfer record saved successfully.");
    setLedgerModal(null);
  };

  const removeLedger = async () => {
    if (!deleteLedger) return;
    const saved = await setLedger((current) => current.filter((row) => String(row.id) !== String(deleteLedger.id)));
    if (!saved) return;
    notify("Transfer record deleted successfully.");
    setDeleteLedger(null);
  };

  if (id && !activeAccount) {
    return (
      <div className="transfer-page">
        <button className="transfer-light-btn" type="button" onClick={() => navigate("/transfer")}>
          <ArrowLeft size={16} /> Back to Transfer
        </button>
        <section className="transfer-empty-card">Transfer account was not found.</section>
      </div>
    );
  }

  if (activeAccount) {
    const rows = getRowsForAccount(activeAccount.id).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const balance = getBalance(activeAccount);
    const reportRows = rows.map((row) => ({
      Date: getDateLabel(row.date),
      Type: row.type === "credit" ? "Credit" : "Debit",
      From: `${row.fromAmount} ${row.fromCurrency}`,
      To: `${row.toAmount} ${row.toCurrency}`,
      Rate: row.rate,
      Note: row.note || "-",
    }));

    return (
      <div className="transfer-page">
        <div className="transfer-detail-hero">
          <div>
            <button className="transfer-light-btn" type="button" onClick={() => navigate("/transfer")}>
              <ArrowLeft size={16} /> Back to Transfer
            </button>
            <h1>{accountName(activeAccount)}</h1>
            <p>{activeAccount.phone || "No phone"} / {activeAccount.email || "No email"} / {activeAccount.address || "No address"}</p>
          </div>
          <div className="transfer-header-actions">
            <button type="button" className="transfer-light-btn" onClick={() => setPrintOpen(true)}><Printer size={16} /> Print</button>
            <button type="button" className="transfer-primary-btn" onClick={() => setLedgerModal(emptyLedger)}><Plus size={16} /> Add Credit / Debit</button>
          </div>
        </div>

        <div className="transfer-stats">
          <StatCard icon={CircleDollarSign} label="Currency" value={activeAccount.currency} />
          <StatCard icon={WalletCards} label="Opening Balance" value={formatCurrencyAmount(Math.abs(getSignedOpening(activeAccount)), activeAccount.currency)} />
          <StatCard icon={Banknote} label={balance >= 0 ? "We Owe" : "They Owe Us"} tone={balance >= 0 ? "warning" : "success"} value={formatCurrencyAmount(Math.abs(balance), activeAccount.currency)} />
        </div>

        <section className="transfer-card">
          <div className="transfer-table-title">
            <div>
              <h2>Transfer Ledger</h2>
              <p>Credit and Debit records for this exchanger.</p>
            </div>
            <span>{rows.length} records</span>
          </div>
          <div className="transfer-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Rate</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{getDateLabel(row.date)}</td>
                    <td><LedgerAmount type={row.type === "credit" ? "credit" : "debit"} value={row.toAmount} currency={row.toCurrency} /></td>
                    <td>{formatCurrencyAmount(row.fromAmount, row.fromCurrency)}</td>
                    <td>{formatCurrencyAmount(row.toAmount, row.toCurrency)}</td>
                    <td>{row.rate || "-"}</td>
                    <td>{row.note || "-"}</td>
                    <td>
                      <div className="transfer-row-actions">
                        <button type="button" onClick={() => setLedgerModal(row)} title="Edit"><Pencil size={15} /></button>
                        <button type="button" className="danger" onClick={() => setDeleteLedger(row)} title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td className="transfer-empty" colSpan="7">No transfer record yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {ledgerModal && <LedgerModal initial={ledgerModal} onClose={() => setLedgerModal(null)} onSave={saveLedger} />}
        {deleteLedger && <ConfirmModal title="Delete transfer record?" message="This Credit / Debit record will be removed." onClose={() => setDeleteLedger(null)} onConfirm={removeLedger} />}
        {printOpen && (
          <StandardPrintStudio
            columns={["Date", "Type", "From", "To", "Rate", "Note"]}
            company={company}
            filename={`${accountName(activeAccount)}-transfer-ledger`}
            Icon={Repeat2}
            rows={reportRows}
            stats={[
              { label: "Records", value: rows.length },
              { label: balance >= 0 ? "We Owe" : "They Owe Us", value: formatCurrencyAmount(Math.abs(balance), activeAccount.currency) },
            ]}
            subtitle={`${accountName(activeAccount)} transfer ledger`}
            title="Transfer Statement"
            onClose={() => setPrintOpen(false)}
          />
        )}
      </div>
    );
  }

  const reportRows = filteredAccounts.map((account) => {
    const balance = getBalance(account);
    return {
      Name: accountName(account),
      Phone: account.phone || "-",
      Email: account.email || "-",
      Currency: account.currency,
      Balance: formatCurrencyAmount(Math.abs(balance), account.currency),
      Status: balance >= 0 ? "We owe" : "They owe us",
      Address: account.address || "-",
    };
  });

  return (
    <div className="transfer-page">
      <div className="transfer-header">
        <div>
          <h1>Transfer</h1>
          <p>Manage exchanger accounts, received money, paid money, and exchange rates.</p>
        </div>
        <div className="transfer-header-actions">
          <button type="button" className="transfer-light-btn" onClick={() => setPrintOpen(true)}><Printer size={16} /> Print Report</button>
          <button type="button" className="transfer-primary-btn" onClick={() => setAccountModal(emptyAccount)}><Plus size={16} /> Add Exchanger</button>
        </div>
      </div>

      <div className="transfer-stats">
        <StatCard icon={Repeat2} label="Total Exchangers" value={totals.count} />
        <StatCard icon={Banknote} label="They Owe Us" tone="success" value={formatCurrencyAmount(totals.theyOweUs, baseCurrency)} />
        <StatCard icon={WalletCards} label="We Owe" tone="warning" value={formatCurrencyAmount(totals.weOweThem, baseCurrency)} />
      </div>

      <section className="transfer-card">
        <div className="transfer-toolbar">
          <label className="transfer-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exchangers..." />
          </label>
        </div>
        <div className="transfer-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Currency</th>
                <th>Balance</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((account) => {
                const balance = getBalance(account);
                return (
                  <tr className="transfer-click-row" key={account.id} onClick={() => navigate(`/transfer/${account.id}`)}>
                    <td><strong>{accountName(account)}</strong></td>
                    <td>
                      <span>{account.phone || "-No phone"}</span>
                      <small>{account.email || "-No email"}</small>
                    </td>
                    <td>{account.currency}</td>
                    <td className={balance >= 0 ? "transfer-warning-text" : "transfer-success-text"}>
                      {formatCurrencyAmount(Math.abs(balance), account.currency)}
                      <small>{balance >= 0 ? "We owe" : "They owe us"}</small>
                    </td>
                    <td>{account.address || "-"}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="transfer-row-actions">
                        <button type="button" onClick={() => setAccountModal(account)} title="Edit"><Pencil size={15} /></button>
                        <button type="button" className="danger" onClick={() => setDeleteAccount(account)} title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!pagination.pageItems.length && <tr><td className="transfer-empty" colSpan="6">No exchanger found.</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          setPage={pagination.setPage}
          setPageSize={pagination.setPageSize}
          totalItems={filteredAccounts.length}
          totalPages={pagination.totalPages}
        />
      </section>

      {accountModal && <AccountModal initial={accountModal} onClose={() => setAccountModal(null)} onSave={saveAccount} phoneRules={phoneRules} />}
      {deleteAccount && <ConfirmModal title="Delete exchanger?" message="This exchanger and all transfer ledger records will be removed." onClose={() => setDeleteAccount(null)} onConfirm={removeAccount} />}
      {printOpen && (
        <StandardPrintStudio
          columns={["Name", "Phone", "Email", "Currency", "Balance", "Status", "Address"]}
          company={company}
          filename="transfer-report"
          Icon={Repeat2}
          rows={reportRows}
          stats={[
            { label: "Exchangers", value: totals.count },
            { label: "They Owe Us", value: formatCurrencyAmount(totals.theyOweUs, baseCurrency) },
            { label: "We Owe", value: formatCurrencyAmount(totals.weOweThem, baseCurrency) },
          ]}
          subtitle="Exchanger accounts and balances"
          title="Transfer Report"
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}

function AccountModal({ initial, onClose, onSave, phoneRules }) {
  const [form, setForm] = useState(initial);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="transfer-modal-backdrop">
      <form className="transfer-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <ModalTitle title={form.id ? "Edit Exchanger" : "Add Exchanger"} subtitle="Create exchanger profile and opening balance." onClose={onClose} />
        <div className="transfer-form-grid">
          <Field label="Exchanger Name *"><input autoFocus value={form.name} onChange={(event) => update("name", event.target.value)} /></Field>
          <Field label="Phone Number"><input inputMode="numeric" maxLength={phoneRules?.enabled ? phoneRules.maxLength : undefined} value={form.phone} onChange={(event) => update("phone", limitPhoneValue(event.target.value, phoneRules))} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
          <Field label="Currency"><CustomSelect ariaLabel="Currency" options={currencies.map((currency) => ({ value: currency, label: currency }))} value={form.currency} onChange={(value) => update("currency", value)} /></Field>
          <Field label="Opening Balance"><input value={form.openingBalance} onChange={(event) => update("openingBalance", event.target.value)} placeholder="0.00" /></Field>
          <Field label="Balance Type">
            <CustomSelect
              ariaLabel="Opening balance type"
              options={[
                { value: "theyOweUs", label: "They owe us" },
                { value: "weOweThem", label: "We owe them" },
              ]}
              value={form.openingMode}
              onChange={(value) => update("openingMode", value)}
            />
          </Field>
          <Field label="Address" className="full"><input value={form.address} onChange={(event) => update("address", event.target.value)} /></Field>
        </div>
        <div className="transfer-modal-actions">
          <button type="button" className="transfer-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="transfer-primary-btn">{form.id ? "Save Changes" : "Add Exchanger"}</button>
        </div>
      </form>
    </div>
  );
}

function LedgerModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial);
  const update = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "fromAmount" || field === "toAmount") {
        const from = field === "fromAmount" ? parseNumber(value) : parseNumber(next.fromAmount);
        const to = field === "toAmount" ? parseNumber(value) : parseNumber(next.toAmount);
        next.rate = from > 0 && to > 0 ? roundMoney(to / from) : next.rate;
      }
      return next;
    });
  };

  return (
    <div className="transfer-modal-backdrop">
      <form className="transfer-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <ModalTitle title={form.id ? "Edit Credit / Debit" : "Add Credit / Debit"} subtitle="Record money exchange with amount, currency and rate." onClose={onClose} />
        <div className="transfer-form-grid">
          <Field label="Type">
            <CustomSelect
              ariaLabel="Type"
              options={[
                { value: "credit", label: "Credit - exchanger gave us" },
                { value: "debit", label: "Debit - we paid exchanger" },
              ]}
              value={form.type}
              onChange={(value) => update("type", value)}
            />
          </Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></Field>
          <Field label="From Amount"><input value={form.fromAmount} onChange={(event) => update("fromAmount", event.target.value)} placeholder="100" /></Field>
          <Field label="From Currency"><CustomSelect ariaLabel="From Currency" options={currencies.map((currency) => ({ value: currency, label: currency }))} value={form.fromCurrency} onChange={(value) => update("fromCurrency", value)} /></Field>
          <Field label="To Amount"><input value={form.toAmount} onChange={(event) => update("toAmount", event.target.value)} placeholder="5000" /></Field>
          <Field label="To Currency"><CustomSelect ariaLabel="To Currency" options={currencies.map((currency) => ({ value: currency, label: currency }))} value={form.toCurrency} onChange={(value) => update("toCurrency", value)} /></Field>
          <Field label="Rate"><input value={form.rate} onChange={(event) => update("rate", event.target.value)} placeholder="50" /></Field>
          <Field label="Note" className="full"><textarea value={form.note} onChange={(event) => update("note", event.target.value)} /></Field>
        </div>
        <div className="transfer-modal-actions">
          <button type="button" className="transfer-light-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="transfer-primary-btn">Save Record</button>
        </div>
      </form>
    </div>
  );
}

function ModalTitle({ onClose, subtitle, title }) {
  return (
    <div className="transfer-modal-title">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      <button type="button" onClick={onClose}><X size={18} /></button>
    </div>
  );
}

function Field({ children, className = "", label }) {
  return (
    <label className={`transfer-form-field ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon: Icon, label, tone = "", value }) {
  return (
    <article className={`transfer-stat-card ${tone}`.trim()}>
      <div><span>{label}</span><strong>{value}</strong></div>
      <Icon size={22} />
    </article>
  );
}

function ConfirmModal({ message, onClose, onConfirm, title }) {
  return (
    <div className="transfer-modal-backdrop">
      <div className="transfer-confirm-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="transfer-modal-actions">
          <button type="button" className="transfer-light-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="transfer-danger-btn" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export default Transfer;
