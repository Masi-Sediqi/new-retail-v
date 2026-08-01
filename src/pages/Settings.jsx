import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Bell,
  Box,
  CircleDollarSign,
  Database,
  Download,
  FileText,
  Globe2,
  KeyRound,
  Palette,
  Plus,
  Printer,
  Save,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { apiUrl } from "../utils/api";
import { downloadBackup, loadBackupCollectionNames } from "../utils/backup";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import "./Settings.css";

const defaultSystemName = "Smart Office";
const defaultSystemSubtitle = "Business Management System";

const settingTabs = [
  { key: "general", label: "General", icon: SettingsIcon },
  { key: "themes", label: "Themes", icon: Globe2 },
  { key: "currency", label: "Currency", icon: CircleDollarSign },
  { key: "printing", label: "Printing", icon: Printer },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "sharing", label: "Sharing", icon: Upload },
  { key: "backup", label: "Backup", icon: Database },
  { key: "advanced-sync", label: "Advanced sync", icon: Box },
  { key: "security", label: "Security", icon: Shield },
  { key: "users", label: "Users", icon: Users },
  { key: "forms", label: "Forms", icon: FileText },
  { key: "license", label: "Your License Key", icon: KeyRound },
];

const currencyOptions = [
  "Afghan Afghani (AFN)",
  "US Dollar (USD)",
  "Euro (EUR)",
  "Pakistani Rupee (PKR)",
  "Iranian Rial (IRR)",
];

const languageOptions = [
  "English (English)",
  "Dari (Persian)",
  "Pashto",
];

const themeOptions = ["System", "Light", "Dark"];
const accentOptions = ["Indigo", "Blue", "Emerald", "Amber", "Rose"];
const printTemplateOptions = ["Standard", "Compact", "Thermal", "Detailed"];
const soundOptions = ["Chime", "Bell", "Pop", "Ding", "Silent"];
const formModules = ["products", "customers", "suppliers", "expenses", "staffMembers", "billing"];

const currencyCodeFromLabel = (value) => {
  const match = String(value || "").match(/\(([A-Z]{3})\)/);
  return match?.[1] || String(value || "AFN").slice(0, 3).toUpperCase();
};

const kpiRoutes = [
  {
    key: "totalRevenue",
    title: "Total Revenue",
    offDescription: "Wallet flows are ignored for this KPI.",
    onDescription: "Wallet deposits/withdrawals affect this KPI.",
  },
  {
    key: "pureProfit",
    title: "Pure Profit",
    offDescription: "Wallet flows are ignored for this KPI.",
    onDescription: "Wallet deposits/withdrawals affect this KPI.",
  },
  {
    key: "netProfit",
    title: "Net Profit (After Expenses & Refunds)",
    offDescription: "Wallet flows are ignored for this KPI.",
    onDescription: "Wallet deposits/withdrawals affect this KPI.",
  },
  {
    key: "currentCashWallet",
    title: "Current cash wallet",
    offDescription: "Wallet flows are ignored for this KPI.",
    onDescription: "Wallet deposits/withdrawals affect this KPI.",
  },
];

const defaultKpiRouting = {
  totalRevenue: false,
  pureProfit: false,
  netProfit: false,
  currentCashWallet: true,
};

function Settings() {
  const [settings, setSettings] = useJsonCollection("settings");
  const current = settings[0] || {};
  const logoInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("general");
  const [companyName, setCompanyName] = useState(defaultSystemName);
  const [systemSubtitle, setSystemSubtitle] = useState(defaultSystemSubtitle);
  const [logo, setLogo] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState(currencyOptions[0]);
  const [language, setLanguage] = useState(languageOptions[0]);
  const [kpiRouting, setKpiRouting] = useState(defaultKpiRouting);
  const [taxRate, setTaxRate] = useState("0");
  const [otherAdjustments, setOtherAdjustments] = useState("0");
  const [adjustmentsCurrency, setAdjustmentsCurrency] = useState(currencyOptions[0]);
  const [inventoryCostingMethod, setInventoryCostingMethod] = useState("lifo");
  const [autoBackupMode, setAutoBackupMode] = useState("off");
  const [autoBackupCustomDays, setAutoBackupCustomDays] = useState("7");
  const [appDataBusy, setAppDataBusy] = useState(false);
  const [clearConfirm, setClearConfirm] = useState("");
  const [themeMode, setThemeMode] = useState(themeOptions[0]);
  const [accentColor, setAccentColor] = useState(accentOptions[0]);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({});
  const [printSettings, setPrintSettings] = useState({
    template: "Standard",
    paperSize: "A4",
    showLogo: true,
    showSignature: true,
    footerText: "",
  });
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    sound: "Chime",
    lowStock: true,
    duePayments: true,
    dailySummary: false,
  });
  const [sharingSettings, setSharingSettings] = useState({
    businessProfile: false,
    publicReports: false,
    shareUrl: "",
  });
  const [syncSettings, setSyncSettings] = useState({
    enabled: false,
    endpoint: "",
    intervalMinutes: "30",
  });
  const [securitySettings, setSecuritySettings] = useState({
    lockOnStart: false,
    sessionTimeout: "30",
    password: "",
    confirmPassword: "",
  });
  const [licenseSettings, setLicenseSettings] = useState({
    licenseKey: "",
    owner: "",
    expiresAt: "",
  });
  const [systemUsers, setSystemUsers] = useState([]);
  const [userDraft, setUserDraft] = useState({ name: "", role: "Operator", email: "" });
  const [customFields, setCustomFields] = useState({});
  const [activeFormModule, setActiveFormModule] = useState("products");
  const [fieldDraft, setFieldDraft] = useState({ label: "", type: "text", required: false });

  useEffect(() => {
    setCompanyName(current.companyName || defaultSystemName);
    setSystemSubtitle(current.systemSubtitle || defaultSystemSubtitle);
    setLogo(current.logo || "");
    setAddress(current.address || "");
    setPhoneNumber(current.phoneNumber || "");
    setEmailAddress(current.emailAddress || "");
    setWebsite(current.website || "");
    setDefaultCurrency(current.defaultCurrency || currencyOptions[0]);
    setLanguage(current.language || languageOptions[0]);
    setKpiRouting({ ...defaultKpiRouting, ...(current.kpiRouting || {}) });
    setTaxRate(String(current.taxRate ?? "0"));
    setOtherAdjustments(String(current.otherAdjustments ?? "0"));
    setAdjustmentsCurrency(current.adjustmentsCurrency || current.defaultCurrency || currencyOptions[0]);
    setInventoryCostingMethod(current.inventoryCostingMethod || "lifo");
    setAutoBackupMode(current.autoBackupMode || "off");
    setAutoBackupCustomDays(String(current.autoBackupCustomDays || "7"));
    setThemeMode(current.themeMode || themeOptions[0]);
    setAccentColor(current.accentColor || accentOptions[0]);
    setSidebarCompact(Boolean(current.sidebarCompact));
    setExchangeRates(current.exchangeRates || {});
    setPrintSettings({
      template: current.printSettings?.template || "Standard",
      paperSize: current.printSettings?.paperSize || "A4",
      showLogo: current.printSettings?.showLogo ?? true,
      showSignature: current.printSettings?.showSignature ?? true,
      footerText: current.printSettings?.footerText || "",
    });
    setNotificationSettings({
      enabled: current.notificationSettings?.enabled ?? true,
      sound: current.notificationSettings?.sound || "Chime",
      lowStock: current.notificationSettings?.lowStock ?? true,
      duePayments: current.notificationSettings?.duePayments ?? true,
      dailySummary: current.notificationSettings?.dailySummary ?? false,
    });
    setSharingSettings({
      businessProfile: Boolean(current.sharingSettings?.businessProfile),
      publicReports: Boolean(current.sharingSettings?.publicReports),
      shareUrl: current.sharingSettings?.shareUrl || "",
    });
    setSyncSettings({
      enabled: Boolean(current.syncSettings?.enabled),
      endpoint: current.syncSettings?.endpoint || "",
      intervalMinutes: String(current.syncSettings?.intervalMinutes || "30"),
    });
    setSecuritySettings({
      lockOnStart: Boolean(current.securitySettings?.lockOnStart),
      sessionTimeout: String(current.securitySettings?.sessionTimeout || "30"),
      password: "",
      confirmPassword: "",
    });
    setLicenseSettings({
      licenseKey: current.licenseSettings?.licenseKey || "",
      owner: current.licenseSettings?.owner || "",
      expiresAt: current.licenseSettings?.expiresAt || "",
    });
    setSystemUsers(current.systemUsers || []);
    setCustomFields(current.customFields || {});
  }, [
    current.address,
    current.adjustmentsCurrency,
    current.autoBackupCustomDays,
    current.autoBackupMode,
    current.companyName,
    current.defaultCurrency,
    current.emailAddress,
    current.inventoryCostingMethod,
    current.licenseSettings,
    current.kpiRouting,
    current.language,
    current.logo,
    current.notificationSettings,
    current.otherAdjustments,
    current.phoneNumber,
    current.printSettings,
    current.securitySettings,
    current.sharingSettings,
    current.sidebarCompact,
    current.syncSettings,
    current.systemSubtitle,
    current.systemUsers,
    current.taxRate,
    current.themeMode,
    current.accentColor,
    current.customFields,
    current.exchangeRates,
    current.website,
  ]);

  const activeTabMeta = useMemo(
    () => settingTabs.find((tab) => tab.key === activeTab) || settingTabs[0],
    [activeTab]
  );

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("Please select an image file for the logo.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event?.preventDefault();

    const nextSettings = [
      {
        ...current,
        companyName: companyName.trim() || defaultSystemName,
        systemSubtitle: systemSubtitle.trim() || defaultSystemSubtitle,
        logo,
        address: address.trim(),
        phoneNumber: phoneNumber.trim(),
        emailAddress: emailAddress.trim(),
        website: website.trim(),
        defaultCurrency,
        baseCurrency: currencyCodeFromLabel(defaultCurrency),
        language,
        kpiRouting,
        taxRate: Number(taxRate || 0),
        otherAdjustments: Number(otherAdjustments || 0),
        adjustmentsCurrency,
        adjustmentsCurrencyCode: currencyCodeFromLabel(adjustmentsCurrency),
        inventoryCostingMethod,
        autoBackupMode,
        autoBackupCustomDays: Math.max(Number(autoBackupCustomDays || 7), 1),
        themeMode,
        accentColor,
        sidebarCompact,
        exchangeRates,
        printSettings,
        notificationSettings,
        sharingSettings,
        syncSettings: {
          ...syncSettings,
          intervalMinutes: Math.max(Number(syncSettings.intervalMinutes || 30), 1),
        },
        securitySettings: {
          ...(current.securitySettings || {}),
          lockOnStart: securitySettings.lockOnStart,
          sessionTimeout: Math.max(Number(securitySettings.sessionTimeout || 30), 1),
          ...(securitySettings.password && securitySettings.password === securitySettings.confirmPassword
            ? { password: securitySettings.password, passwordUpdatedAt: new Date().toISOString() }
            : {}),
        },
        licenseSettings,
        systemUsers,
        customFields,
        updatedAt: new Date().toISOString(),
      },
    ];

    if (securitySettings.password && securitySettings.password !== securitySettings.confirmPassword) {
      notify("Security password confirmation does not match.", "error");
      return;
    }

    const saved = await setSettings(nextSettings);
    if (!saved) return;

    window.dispatchEvent(new Event("company-settings-updated"));
    notify("System settings saved successfully.");
  };

  const loadCollectionNames = async () => {
    return loadBackupCollectionNames();
  };

  const exportData = async () => {
    try {
      setAppDataBusy(true);
      await downloadBackup("manual");
      notify("App data exported successfully.");
    } catch (error) {
      console.error("Unable to export app data:", error);
      notify("Unable to export app data.", "error");
    } finally {
      setAppDataBusy(false);
    }
  };

  const importData = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setAppDataBusy(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const data =
        parsed.collections && typeof parsed.collections === "object"
          ? parsed.collections
          : parsed;
      const collections = await loadCollectionNames();
      const importable = collections.filter((name) => Array.isArray(data[name]));

      if (!importable.length) {
        notify("This file does not contain valid app data.", "error");
        return;
      }

      const ok = await confirmAction({
        title: "Import App Data",
        message: `Import will replace ${importable.length} data table(s). Continue?`,
        confirmText: "Import Data",
      });
      if (!ok) return;

      await Promise.all(
        importable.map((name) => axios.put(apiUrl(name), data[name]))
      );
      notify("App data imported successfully. Refresh the app to see all changes.");
    } catch (error) {
      console.error("Unable to import app data:", error);
      notify("Unable to import app data. Please select a valid JSON file.", "error");
    } finally {
      setAppDataBusy(false);
    }
  };

  const clearData = async () => {
    if (clearConfirm.trim().toUpperCase() !== "CLEAR") {
      notify("Type CLEAR to confirm data clearing.", "error");
      return;
    }

    const ok = await confirmAction({
      title: "Clear All App Data",
      message:
        "This will clear all saved app data, including settings. This cannot be undone. Continue?",
      confirmText: "Clear Data",
    });
    if (!ok) return;

    try {
      setAppDataBusy(true);
      const collections = await loadCollectionNames();
      await Promise.all(collections.map((name) => axios.put(apiUrl(name), [])));
      setClearConfirm("");
      notify("App data cleared successfully. Refresh the app to start clean.");
    } catch (error) {
      console.error("Unable to clear app data:", error);
      notify("Unable to clear app data.", "error");
    } finally {
      setAppDataBusy(false);
    }
  };

  const setRouteEnabled = (key, enabled) => {
    setKpiRouting((previous) => ({ ...previous, [key]: enabled }));
  };

  const addSystemUser = () => {
    if (!userDraft.name.trim()) {
      notify("Please enter the user name.", "error");
      return;
    }
    setSystemUsers((previous) => [
      ...previous,
      {
        id: `user-${Date.now()}`,
        name: userDraft.name.trim(),
        role: userDraft.role,
        email: userDraft.email.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setUserDraft({ name: "", role: "Operator", email: "" });
  };

  const addCustomField = () => {
    if (!fieldDraft.label.trim()) {
      notify("Please enter the field label.", "error");
      return;
    }
    setCustomFields((previous) => ({
      ...previous,
      [activeFormModule]: [
        ...(previous[activeFormModule] || []),
        {
          id: `field-${Date.now()}`,
          label: fieldDraft.label.trim(),
          type: fieldDraft.type,
          required: fieldDraft.required,
        },
      ],
    }));
    setFieldDraft({ label: "", type: "text", required: false });
  };

  return (
    <form className="settings-page" onSubmit={save}>
      <div className="settings-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your system preferences</p>
        </div>

        <button type="submit" className="settings-save">
          <Save size={16} />
          Save Changes
        </button>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        {settingTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              key={tab.key}
              className={activeTab === tab.key ? "active" : ""}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "general" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle
              title="Company Information"
              description="Update your business details"
            />

            <div className="settings-logo-block">
              <label>Company Logo</label>
              <p>Shown in the sidebar header and on print-outs</p>
              <div className="settings-logo-row">
                <div className="settings-logo-thumb">
                  {logo ? <img src={logo} alt="Company logo" /> : <span>-</span>}
                </div>
                <button
                  type="button"
                  className="settings-light-button"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload size={15} />
                  Upload Logo
                </button>
                {logo && (
                  <button
                    type="button"
                    className="settings-light-button danger"
                    onClick={() => setLogo("")}
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  hidden
                />
              </div>
            </div>

            <div className="settings-field-grid two">
              <Field label="Company Name">
                <input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder={defaultSystemName}
                />
              </Field>
              <Field label="Subtitle / Tagline">
                <input
                  value={systemSubtitle}
                  onChange={(event) => setSystemSubtitle(event.target.value)}
                  placeholder={defaultSystemSubtitle}
                />
              </Field>
            </div>

            <Field label="Address">
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </Field>

            <div className="settings-field-grid three">
              <Field label="Phone Number">
                <input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                />
              </Field>
              <Field label="Email Address">
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(event) => setEmailAddress(event.target.value)}
                />
              </Field>
              <Field label="Website">
                <input
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </Field>
            </div>

            <div className="settings-field-grid two">
              <Field label="Default Currency">
                <select
                  value={defaultCurrency}
                  onChange={(event) => {
                    setDefaultCurrency(event.target.value);
                    setAdjustmentsCurrency(event.target.value);
                  }}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Language">
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  {languageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="settings-card">
            <SectionTitle
              title="Cash Wallet - KPI routing"
              description="Choose which dashboard cards include cash-wallet deposits and withdrawals (supplier adjustments + manual entries)."
            />

            <div className="settings-kpi-list">
              {kpiRoutes.map((route) => {
                const enabled = Boolean(kpiRouting[route.key]);
                return (
                  <div
                    className={`settings-kpi-row ${enabled ? "enabled" : ""}`}
                    key={route.key}
                  >
                    <div>
                      <strong>{route.title}</strong>
                      <p>{enabled ? route.onDescription : route.offDescription}</p>
                    </div>
                    <Switch
                      checked={enabled}
                      onChange={(next) => setRouteEnabled(route.key, next)}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="settings-card">
            <SectionTitle
              title="Tax & Adjustments"
              description="Applied only to Net Profit. Tax is charged on positive results per currency; adjustments are subtracted as a signed value."
            />

            <div className="settings-field-grid three">
              <Field label="Tax rate (%)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                />
              </Field>
              <Field label="Other adjustments (signed)">
                <input
                  type="number"
                  step="0.01"
                  value={otherAdjustments}
                  onChange={(event) => setOtherAdjustments(event.target.value)}
                />
              </Field>
              <Field label="Adjustments currency">
                <select
                  value={adjustmentsCurrency}
                  onChange={(event) => setAdjustmentsCurrency(event.target.value)}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <p className="settings-help-text">
              Pure Profit ignores both. Set tax to 0 and adjustments to 0 to make Net Profit identical to (Gross Profit - Expenses).
            </p>
          </section>

          <section className="settings-card">
            <SectionTitle
              title="Inventory costing method"
              description="Choose how new sales value their COGS. Historical sales keep the cost captured at the time of sale and are never rewritten."
              icon={Box}
            />

            <div className="settings-costing-field">
              <Field label="Costing method">
                <select
                  value={inventoryCostingMethod}
                  onChange={(event) => setInventoryCostingMethod(event.target.value)}
                >
                  <option value="lifo">LIFO - newest lot first (default)</option>
                  <option value="fifo">FIFO - oldest lot first</option>
                  <option value="average">Weighted average cost</option>
                </select>
              </Field>
            </div>

            <p className="settings-help-text">
              Switching only affects sales made from now on. Past invoices, profits and refunds remain valued at their original lot cost.
            </p>
          </section>
        </div>
      ) : activeTab === "backup" ? (
        <BackupTab
          appDataBusy={appDataBusy}
          autoBackupMode={autoBackupMode}
          autoBackupCustomDays={autoBackupCustomDays}
          clearConfirm={clearConfirm}
          exportData={exportData}
          importData={importData}
          save={save}
          clearData={clearData}
          setAutoBackupMode={setAutoBackupMode}
          setAutoBackupCustomDays={setAutoBackupCustomDays}
          setClearConfirm={setClearConfirm}
        />
      ) : activeTab === "themes" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Themes" description="Choose how the application should look." icon={Globe2} />
            <div className="settings-field-grid three">
              <Field label="Theme mode">
                <select value={themeMode} onChange={(event) => setThemeMode(event.target.value)}>
                  {themeOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Accent color">
                <select value={accentColor} onChange={(event) => setAccentColor(event.target.value)}>
                  {accentOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </Field>
              <div className="settings-toggle-field">
                <span>Compact sidebar</span>
                <Switch checked={sidebarCompact} onChange={setSidebarCompact} />
              </div>
            </div>
          </section>
        </div>
      ) : activeTab === "currency" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Currency" description="Manage base currency and exchange rates." icon={CircleDollarSign} />
            <div className="settings-field-grid two">
              <Field label="Base currency">
                <select value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value)}>
                  {currencyOptions.map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </Field>
              <Field label="Currency code">
                <input value={currencyCodeFromLabel(defaultCurrency)} readOnly />
              </Field>
            </div>
            <div className="settings-rate-grid">
              {["USD", "EUR", "PKR", "IRR"].map((code) => (
                <Field key={code} label={`${code} exchange rate`}>
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={exchangeRates[code] || ""}
                    onChange={(event) => setExchangeRates((previous) => ({ ...previous, [code]: event.target.value }))}
                    placeholder={`1 ${currencyCodeFromLabel(defaultCurrency)} to ${code}`}
                  />
                </Field>
              ))}
            </div>
          </section>
        </div>
      ) : activeTab === "printing" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Printing" description="Control invoices, receipts and report print-outs." icon={Printer} />
            <div className="settings-field-grid three">
              <Field label="Template">
                <select value={printSettings.template} onChange={(event) => setPrintSettings((previous) => ({ ...previous, template: event.target.value }))}>
                  {printTemplateOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Paper size">
                <select value={printSettings.paperSize} onChange={(event) => setPrintSettings((previous) => ({ ...previous, paperSize: event.target.value }))}>
                  {["A4", "Letter", "A5", "80mm Thermal"].map((option) => <option key={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Footer text">
                <input value={printSettings.footerText} onChange={(event) => setPrintSettings((previous) => ({ ...previous, footerText: event.target.value }))} />
              </Field>
            </div>
            <div className="settings-inline-switches">
              <div><span>Show logo</span><Switch checked={printSettings.showLogo} onChange={(value) => setPrintSettings((previous) => ({ ...previous, showLogo: value }))} /></div>
              <div><span>Show signature</span><Switch checked={printSettings.showSignature} onChange={(value) => setPrintSettings((previous) => ({ ...previous, showSignature: value }))} /></div>
            </div>
          </section>
        </div>
      ) : activeTab === "notifications" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Notifications" description="Choose which alerts the system should show." icon={Bell} />
            <div className="settings-field-grid two">
              <div className="settings-toggle-field"><span>Enable notifications</span><Switch checked={notificationSettings.enabled} onChange={(value) => setNotificationSettings((previous) => ({ ...previous, enabled: value }))} /></div>
              <Field label="Alert sound">
                <select value={notificationSettings.sound} onChange={(event) => setNotificationSettings((previous) => ({ ...previous, sound: event.target.value }))}>
                  {soundOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </Field>
            </div>
            <div className="settings-inline-switches">
              <div><span>Low stock alerts</span><Switch checked={notificationSettings.lowStock} onChange={(value) => setNotificationSettings((previous) => ({ ...previous, lowStock: value }))} /></div>
              <div><span>Due payment alerts</span><Switch checked={notificationSettings.duePayments} onChange={(value) => setNotificationSettings((previous) => ({ ...previous, duePayments: value }))} /></div>
              <div><span>Daily summary</span><Switch checked={notificationSettings.dailySummary} onChange={(value) => setNotificationSettings((previous) => ({ ...previous, dailySummary: value }))} /></div>
            </div>
          </section>
        </div>
      ) : activeTab === "sharing" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Sharing" description="Control export and public sharing preferences." icon={Upload} />
            <div className="settings-field-grid two">
              <div className="settings-toggle-field"><span>Business profile sharing</span><Switch checked={sharingSettings.businessProfile} onChange={(value) => setSharingSettings((previous) => ({ ...previous, businessProfile: value }))} /></div>
              <div className="settings-toggle-field"><span>Public report link</span><Switch checked={sharingSettings.publicReports} onChange={(value) => setSharingSettings((previous) => ({ ...previous, publicReports: value }))} /></div>
            </div>
            <Field label="Share URL">
              <input value={sharingSettings.shareUrl} onChange={(event) => setSharingSettings((previous) => ({ ...previous, shareUrl: event.target.value }))} placeholder="https://..." />
            </Field>
          </section>
        </div>
      ) : activeTab === "advanced-sync" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Advanced sync" description="Configure optional sync bridge settings." icon={Box} />
            <div className="settings-field-grid three">
              <div className="settings-toggle-field"><span>Enable sync</span><Switch checked={syncSettings.enabled} onChange={(value) => setSyncSettings((previous) => ({ ...previous, enabled: value }))} /></div>
              <Field label="Sync endpoint">
                <input value={syncSettings.endpoint} onChange={(event) => setSyncSettings((previous) => ({ ...previous, endpoint: event.target.value }))} placeholder="https://api.example.com/sync" />
              </Field>
              <Field label="Interval minutes">
                <input type="number" min="1" value={syncSettings.intervalMinutes} onChange={(event) => setSyncSettings((previous) => ({ ...previous, intervalMinutes: event.target.value }))} />
              </Field>
            </div>
          </section>
        </div>
      ) : activeTab === "security" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Security" description="Protect startup access and sessions." icon={Shield} />
            <div className="settings-field-grid three">
              <div className="settings-toggle-field"><span>Lock on startup</span><Switch checked={securitySettings.lockOnStart} onChange={(value) => setSecuritySettings((previous) => ({ ...previous, lockOnStart: value }))} /></div>
              <Field label="Session timeout (minutes)">
                <input type="number" min="1" value={securitySettings.sessionTimeout} onChange={(event) => setSecuritySettings((previous) => ({ ...previous, sessionTimeout: event.target.value }))} />
              </Field>
              <Field label="New security password">
                <input type="password" value={securitySettings.password} onChange={(event) => setSecuritySettings((previous) => ({ ...previous, password: event.target.value }))} />
              </Field>
            </div>
            <Field label="Confirm security password">
              <input type="password" value={securitySettings.confirmPassword} onChange={(event) => setSecuritySettings((previous) => ({ ...previous, confirmPassword: event.target.value }))} />
            </Field>
          </section>
        </div>
      ) : activeTab === "users" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Users" description="Create simple system users and roles." icon={Users} />
            <div className="settings-field-grid three">
              <Field label="Name"><input value={userDraft.name} onChange={(event) => setUserDraft((previous) => ({ ...previous, name: event.target.value }))} /></Field>
              <Field label="Role">
                <select value={userDraft.role} onChange={(event) => setUserDraft((previous) => ({ ...previous, role: event.target.value }))}>
                  {["Administrator", "Manager", "Cashier", "Operator"].map((role) => <option key={role}>{role}</option>)}
                </select>
              </Field>
              <Field label="Email"><input type="email" value={userDraft.email} onChange={(event) => setUserDraft((previous) => ({ ...previous, email: event.target.value }))} /></Field>
            </div>
            <button className="settings-light-button" type="button" onClick={addSystemUser}><Users size={15} /> Add User</button>
            <SettingsTable
              empty="No users yet."
              rows={systemUsers}
              columns={["name", "role", "email"]}
              onDelete={(id) => setSystemUsers((previous) => previous.filter((item) => item.id !== id))}
            />
          </section>
        </div>
      ) : activeTab === "forms" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Forms" description="Add custom fields to module forms." icon={FileText} />
            <div className="settings-tabs small" role="tablist">
              {formModules.map((module) => <button type="button" key={module} className={activeFormModule === module ? "active" : ""} onClick={() => setActiveFormModule(module)}>{module}</button>)}
            </div>
            <div className="settings-field-grid three">
              <Field label="Field label"><input value={fieldDraft.label} onChange={(event) => setFieldDraft((previous) => ({ ...previous, label: event.target.value }))} /></Field>
              <Field label="Type">
                <select value={fieldDraft.type} onChange={(event) => setFieldDraft((previous) => ({ ...previous, type: event.target.value }))}>
                  {["text", "number", "date", "dropdown"].map((type) => <option key={type}>{type}</option>)}
                </select>
              </Field>
              <div className="settings-toggle-field"><span>Required</span><Switch checked={fieldDraft.required} onChange={(value) => setFieldDraft((previous) => ({ ...previous, required: value }))} /></div>
            </div>
            <button className="settings-light-button" type="button" onClick={addCustomField}><Plus size={15} /> Add Field</button>
            <SettingsTable
              empty="No custom fields for this module."
              rows={customFields[activeFormModule] || []}
              columns={["label", "type", "required"]}
              onDelete={(id) => setCustomFields((previous) => ({ ...previous, [activeFormModule]: (previous[activeFormModule] || []).filter((item) => item.id !== id) }))}
            />
          </section>
        </div>
      ) : activeTab === "license" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Your License Key" description="Store the license information for this installation." icon={KeyRound} />
            <div className="settings-field-grid three">
              <Field label="License key"><input value={licenseSettings.licenseKey} onChange={(event) => setLicenseSettings((previous) => ({ ...previous, licenseKey: event.target.value }))} /></Field>
              <Field label="Owner"><input value={licenseSettings.owner} onChange={(event) => setLicenseSettings((previous) => ({ ...previous, owner: event.target.value }))} /></Field>
              <Field label="Expires at"><input type="date" value={licenseSettings.expiresAt} onChange={(event) => setLicenseSettings((previous) => ({ ...previous, expiresAt: event.target.value }))} /></Field>
            </div>
            <p className="settings-help-text">Device ID: {current.deviceId || "local-device"}</p>
          </section>
        </div>
      ) : (
        <PlaceholderTab tab={activeTabMeta} />
      )}
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({ title, description, icon: Icon }) {
  return (
    <div className="settings-section-title">
      <h2>
        {Icon && <Icon size={17} />}
        {title}
      </h2>
      <p>{description}</p>
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`settings-switch ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span />
      <strong>{checked ? "ON" : "OFF"}</strong>
    </button>
  );
}

function SettingsTable({ columns, empty, onDelete, rows }) {
  return (
    <div className="settings-mini-table-wrap">
      <table className="settings-mini-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column}>{typeof row[column] === "boolean" ? (row[column] ? "Yes" : "No") : row[column] || "-"}</td>
              ))}
              <td>
                <button className="settings-table-delete" type="button" onClick={() => onDelete(row.id)}>
                  <Trash2 size={14} />
                  Delete
                </button>
              </td>
            </tr>
          )) : (
            <tr>
              <td className="settings-table-empty" colSpan={columns.length + 1}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BackupTab({
  appDataBusy,
  autoBackupMode,
  autoBackupCustomDays,
  clearConfirm,
  exportData,
  importData,
  save,
  clearData,
  setAutoBackupMode,
  setAutoBackupCustomDays,
  setClearConfirm,
}) {
  return (
    <div className="settings-stack">
      <section className="settings-card">
        <SectionTitle
          title="Backup"
          description="Export a backup, import a backup, or clear all saved app data."
          icon={Database}
        />

        <div className="settings-data-actions">
          <button type="button" onClick={exportData} disabled={appDataBusy}>
            <Download size={16} />
            Export Data
          </button>

          <label className={appDataBusy ? "disabled" : ""}>
            <Upload size={16} />
            Import Data
            <input
              type="file"
              accept="application/json,.json"
              onChange={importData}
              disabled={appDataBusy}
            />
          </label>
        </div>

        <div className="settings-auto-backup">
          <div className="settings-auto-backup-title">
            <Database size={18} />
            <div>
              <strong>Automatically Backup</strong>
              <span>The system checks this schedule while the app is open and reports when a backup is created.</span>
            </div>
          </div>

          <Field label="Backup Schedule">
            <select
              value={autoBackupMode}
              onChange={(event) => setAutoBackupMode(event.target.value)}
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </Field>

          {autoBackupMode === "custom" && (
            <Field label="Custom Interval (Days)">
              <input
                type="number"
                min="1"
                value={autoBackupCustomDays}
                onChange={(event) => setAutoBackupCustomDays(event.target.value)}
              />
            </Field>
          )}

          <button type="button" onClick={save} disabled={appDataBusy}>
            <Save size={16} />
            Save Backup Setting
          </button>
        </div>

        <div className="settings-clear-zone">
          <div>
            <Database size={18} />
            <strong>Clear Data</strong>
            <span>Type CLEAR, then press Clear Data.</span>
          </div>

          <input
            value={clearConfirm}
            onChange={(event) => setClearConfirm(event.target.value)}
            placeholder="CLEAR"
            disabled={appDataBusy}
          />

          <button type="button" onClick={clearData} disabled={appDataBusy}>
            <Trash2 size={16} />
            Clear Data
          </button>
        </div>
      </section>
    </div>
  );
}

function PlaceholderTab({ tab }) {
  const Icon = tab.icon || Palette;
  return (
    <section className="settings-card settings-empty-tab">
      <div className="settings-empty-icon">
        <Icon size={24} />
      </div>
      <h2>{tab.label}</h2>
      <p>This settings section is ready for the next logic you want to connect.</p>
    </section>
  );
}

export default Settings;
