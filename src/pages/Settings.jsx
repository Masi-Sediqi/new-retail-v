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
  Palette,
  Plus,
  Printer,
  Save,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Upload,
  Users,
  Check,
  Eye,
  Activity,
  History,
  LockKeyhole,
  RotateCcw,
  Play,
  Volume2,
  Share2,
  UserRound,
  X,
} from "lucide-react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { apiUrl } from "../utils/api";
import { downloadBackup, loadBackupCollectionNames, normalizeBackupCollections } from "../utils/backup";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import "./Settings.css";
import { applyTheme, themePresets } from "../utils/theme";
import { currencies, getCurrencyMeta, rebaseExchangeRates } from "../utils/currencyExchange";
import { defaultPrintStudio, normalizePrintSettings, openPrintPreview } from "../utils/printStudio";
import { playNotificationSound, soundOptions as notificationSoundOptions } from "../utils/notificationSounds";

const defaultSystemName = "Smart Office";
const defaultSystemSubtitle = "Smart Office Management System";

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
];

const currencyOptions = currencies.map(({ name, code }) => `${name} (${code})`);

const languageOptions = [
  "English (English)",
  "Dari (Persian)",
  "Pashto",
];

const themeOptions = ["System", "Light", "Dark"];
const accentOptions = ["Preset", "Indigo", "Blue", "Emerald", "Amber", "Rose"];
const printTemplateOptions = ["Standard", "Compact", "Thermal", "Detailed"];
const formModules = ["products", "customers", "suppliers", "expenses", "staffMembers", "billing"];
const permissionModules = ["Dashboard", "Products", "Billing", "Sales/Bills", "Staff", "Customers", "Godown", "Suppliers", "Expenses", "Loans", "Financials", "Reports", "Settings"];
const permissionModuleKeys = { Dashboard:"dashboard", Products:"assets", Billing:"billing", "Sales/Bills":"salesBills", Staff:"staff", Customers:"customers", Godown:"mainStock", Suppliers:"suppliers", Expenses:"expenses", Loans:"loans", Financials:"financials", Reports:"reports", Settings:"settings" };

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

const buildDefaultSettings = () => ({
  companyName: defaultSystemName,
  systemSubtitle: defaultSystemSubtitle,
  logo: "",
  address: "",
  phoneNumber: "",
  emailAddress: "",
  website: "",
  defaultCurrency: currencyOptions[0],
  baseCurrency: currencyCodeFromLabel(currencyOptions[0]),
  language: languageOptions[0],
  kpiRouting: defaultKpiRouting,
  taxRate: 0,
  otherAdjustments: 0,
  adjustmentsCurrency: currencyOptions[0],
  adjustmentsCurrencyCode: currencyCodeFromLabel(currencyOptions[0]),
  inventoryCostingMethod: "lifo",
  autoBackupMode: "off",
  autoBackupCustomDays: 7,
  themeMode: themeOptions[0],
  accentColor: accentOptions[0],
  sidebarCompact: false,
  themePreset: "default",
  interfaceDensity: "Comfortable",
  cornerStyle: "Rounded",
  exchangeRates: {},
  printSettings: {
    ...defaultPrintStudio,
    businessNameEn: defaultSystemName,
    subtitleEn: defaultSystemSubtitle,
  },
  notificationSettings: {
    enabled: true,
    sound: "chime",
    lowStock: true,
    duePayments: true,
    dailySummary: false,
  },
  sharingSettings: {
    businessProfile: false,
    publicReports: false,
    shareUrl: "",
    whatsappNumber: "",
    emailAddress: "",
  },
  syncSettings: {
    enabled: false,
    endpoint: "",
    intervalMinutes: 30,
  },
  securitySettings: {
    lockOnStart: false,
    sessionTimeout: 30,
  },
  systemUsers: [],
  customFields: {},
  updatedAt: new Date().toISOString(),
});

function Settings() {
  const [settings, setSettings] = useJsonCollection("settings");
  const [accounts, setAccounts] = useJsonCollection("accounts");
  const current = settings[0] || {};
  const logoInputRef = useRef(null);
  const printLogoInputRef = useRef(null);
  const watermarkInputRef = useRef(null);

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
  const [themePreset, setThemePreset] = useState("default");
  const [interfaceDensity, setInterfaceDensity] = useState("Comfortable");
  const [cornerStyle, setCornerStyle] = useState("Rounded");
  const [exchangeRates, setExchangeRates] = useState({});
  const [printSettings, setPrintSettings] = useState(defaultPrintStudio);
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    sound: "chime",
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
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [systemUsers, setSystemUsers] = useState([]);
  const [userDraft, setUserDraft] = useState({ name: "", username: "", password: "", confirmPassword: "", role: "Operator", email: "" });
  const [customFields, setCustomFields] = useState({});
  const [activeFormModule, setActiveFormModule] = useState("products");
  const [fieldDraft, setFieldDraft] = useState({ label: "", placeholder: "", type: "text", required: false });
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});

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
    setThemePreset(current.themePreset || "default");
    setInterfaceDensity(current.interfaceDensity || "Comfortable");
    setCornerStyle(current.cornerStyle || "Rounded");
    setExchangeRates(current.exchangeRates || {});
    setPrintSettings(normalizePrintSettings(current.printSettings, current));
    setNotificationSettings({
      enabled: current.notificationSettings?.enabled ?? true,
      sound: current.notificationSettings?.sound || "chime",
      lowStock: current.notificationSettings?.lowStock ?? true,
      duePayments: current.notificationSettings?.duePayments ?? true,
      dailySummary: current.notificationSettings?.dailySummary ?? false,
    });
    setSharingSettings({
      businessProfile: Boolean(current.sharingSettings?.businessProfile),
      publicReports: Boolean(current.sharingSettings?.publicReports),
      shareUrl: current.sharingSettings?.shareUrl || "",
      whatsappNumber: current.sharingSettings?.whatsappNumber || current.phoneNumber || "",
      emailAddress: current.sharingSettings?.emailAddress || current.emailAddress || "",
    });
    setSyncSettings({
      enabled: Boolean(current.syncSettings?.enabled),
      endpoint: current.syncSettings?.endpoint || "",
      intervalMinutes: String(current.syncSettings?.intervalMinutes || "30"),
    });
    setSecuritySettings({
      lockOnStart: Boolean(current.securitySettings?.lockOnStart),
      sessionTimeout: String(current.securitySettings?.sessionTimeout || "30"),
      currentPassword: "",
      password: "",
      confirmPassword: "",
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
    current.themePreset,
    current.interfaceDensity,
    current.cornerStyle,
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

  useEffect(() => {
    applyTheme({ themePreset, themeMode, accentColor, sidebarCompact, interfaceDensity, cornerStyle });
  }, [themePreset, themeMode, accentColor, sidebarCompact, interfaceDensity, cornerStyle]);

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
        themePreset,
        interfaceDensity,
        cornerStyle,
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
        systemUsers,
        customFields,
        updatedAt: new Date().toISOString(),
      },
    ];

    if (securitySettings.password && securitySettings.password !== securitySettings.confirmPassword) {
      notify("Security password confirmation does not match.", "error");
      return;
    }
    if (current.securitySettings?.password && securitySettings.password && securitySettings.currentPassword !== current.securitySettings.password) {
      notify("Current security password is incorrect.", "error");
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
      const collections = await loadCollectionNames();
      const data = normalizeBackupCollections(parsed, collections);
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
      localStorage.setItem("isp-primary-currency", "all");
      localStorage.setItem("isp-secondary-currency", "original");
      window.dispatchEvent(new CustomEvent("app-currency-changed", {
        detail: { primaryCurrency: "all", secondaryCurrency: "original" },
      }));
      notify("App data imported successfully. The app will now refresh.");
      window.setTimeout(() => window.location.reload(), 300);
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
        "This will clear all business data, Cash Wallet transactions, and Exchange Rates. Other system settings will be preserved. This cannot be undone. Continue?",
      confirmText: "Clear Data",
    });
    if (!ok) return;

    try {
      setAppDataBusy(true);
      const serverCollections = await loadCollectionNames();
      const requiredBusinessCollections = [
        "transactions",
        "billingInvoices",
        "customers",
        "products",
        "godownEntries",
        "supplierPurchases",
        "supplierPayments",
        "suppliers",
        "expenses",
        "loans",
        "staff",
        "deletedItems",
      ];
      const serverCollectionSet = new Set(serverCollections);
      const collections = [...new Set([...serverCollections, ...requiredBusinessCollections])]
        .filter((name) => name && name !== "settings" && serverCollectionSet.has(name));

      await Promise.all(collections.map(async (name) => {
        await axios.put(apiUrl(name), []);
        window.dispatchEvent(new CustomEvent("json-collection-updated", {
          detail: { name, items: [] },
        }));
      }));
      const nextSettings = [
        buildDefaultSettings(),
      ];
      await axios.put(apiUrl("settings"), nextSettings);
      const verifySettings = await axios.get(apiUrl("settings"));
      const savedSettings = Array.isArray(verifySettings.data)
        ? verifySettings.data
        : nextSettings;
      const clearedSettings = savedSettings.length ? [savedSettings[0]] : nextSettings;
      setCompanyName(defaultSystemName);
      setSystemSubtitle(defaultSystemSubtitle);
      setLogo("");
      setAddress("");
      setPhoneNumber("");
      setEmailAddress("");
      setWebsite("");
      setDefaultCurrency(currencyOptions[0]);
      setLanguage(languageOptions[0]);
      setKpiRouting(defaultKpiRouting);
      setTaxRate("0");
      setOtherAdjustments("0");
      setAdjustmentsCurrency(currencyOptions[0]);
      setInventoryCostingMethod("lifo");
      setAutoBackupMode("off");
      setAutoBackupCustomDays("7");
      setThemeMode(themeOptions[0]);
      setAccentColor(accentOptions[0]);
      setSidebarCompact(false);
      setThemePreset("default");
      setInterfaceDensity("Comfortable");
      setCornerStyle("Rounded");
      setExchangeRates({});
      setPrintSettings(normalizePrintSettings(buildDefaultSettings().printSettings, buildDefaultSettings()));
      setNotificationSettings({
        enabled: true,
        sound: "chime",
        lowStock: true,
        duePayments: true,
        dailySummary: false,
      });
      setSharingSettings({
        businessProfile: false,
        publicReports: false,
        shareUrl: "",
        whatsappNumber: "",
        emailAddress: "",
      });
      setSyncSettings({
        enabled: false,
        endpoint: "",
        intervalMinutes: "30",
      });
      setSecuritySettings({
        lockOnStart: false,
        sessionTimeout: "30",
        currentPassword: "",
        password: "",
        confirmPassword: "",
      });
      setSystemUsers([]);
      setCustomFields({});
      localStorage.setItem("isp-primary-currency", "all");
      localStorage.setItem("isp-secondary-currency", "original");
      window.dispatchEvent(new Event("company-settings-updated"));
      window.dispatchEvent(new CustomEvent("app-currency-changed", {
        detail: {
          exchangeRates: {},
          primaryCurrency: "all",
          secondaryCurrency: "original",
        },
      }));
      window.dispatchEvent(new CustomEvent("json-collection-updated", {
        detail: { name: "settings", items: clearedSettings },
      }));
      localStorage.removeItem("isp-notification-state");
      localStorage.removeItem("isp-low-stock-sounded");
      setClearConfirm("");
      notify("All business data, sales, Cash Wallet records, and exchange rates were cleared.");
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

  const changeBaseCurrency = (nextLabel) => {
    const oldBase = currencyCodeFromLabel(defaultCurrency);
    const newBase = currencyCodeFromLabel(nextLabel);
    const rebased = rebaseExchangeRates(oldBase, newBase, { ...exchangeRates, [oldBase]: 1 });
    setDefaultCurrency(nextLabel);
    setAdjustmentsCurrency(nextLabel);
    setExchangeRates(rebased || { [newBase]: 1 });
  };

  const updatePrint = (key, value) => setPrintSettings((previous) => ({ ...previous, [key]: value }));
  const uploadPrintImage = (key, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("Please select an image file.", "error");
    const reader = new FileReader();
    reader.onload = () => updatePrint(key, String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const addSystemUser = async () => {
    if (!userDraft.name.trim()) {
      notify("Please enter the user name.", "error");
      return;
    }
    if (!userDraft.username.trim() || !userDraft.password || userDraft.password !== userDraft.confirmPassword) {
      notify("Enter a username and matching passwords.", "error"); return;
    }
    if (accounts.some((account) => String(account.username || account.email).toLowerCase() === userDraft.username.trim().toLowerCase())) {
      notify("This username already exists.", "error"); return;
    }
    const normalizedPermissions = permissionModules.reduce((result, label) => { const actions = userPermissions[label] || {}; const key = permissionModuleKeys[label] || label; const previous = result[key] || {}; result[key] = { create:Boolean(previous.create || actions.create || actions.all), view:Boolean(previous.view || actions.view || actions.all), edit:Boolean(previous.edit || actions.update || actions.edit || actions.all), update:Boolean(previous.update || actions.update || actions.all), delete:Boolean(previous.delete || actions.delete || actions.all), print:Boolean(previous.print || actions.print || actions.all) }; return result; }, {});
    const nextUser = {
        id: `user-${Date.now()}`,
        name: userDraft.name.trim(),
        fullName: userDraft.name.trim(),
        role: userDraft.role,
        status: "Active",
        email: userDraft.email.trim(),
        username: userDraft.username.trim(),
        password: userDraft.password,
        permissions: normalizedPermissions,
        createdAt: new Date().toISOString(),
      };
    const saved = await setAccounts((previous) => [...previous, nextUser]);
    if (!saved) return;
    setSystemUsers((previous) => [...previous, nextUser]);
    setUserDraft({ name: "", username: "", password: "", confirmPassword: "", role: "Operator", email: "" });
    setUserPermissions({}); setUserModalOpen(false);
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
          placeholder: fieldDraft.placeholder.trim(),
          required: fieldDraft.required,
        },
      ],
    }));
    setFieldDraft({ label: "", placeholder: "", type: "text", required: false });
    setFieldModalOpen(false);
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
          <section className="settings-card settings-theme-card">
            <SectionTitle title="Theme Selection" description="Choose a visual style — changes apply instantly." icon={Palette} />
            <div className="theme-preset-grid">
              {themePresets.map((preset) => (
                <button type="button" key={preset.id} className={`theme-preset ${themePreset === preset.id ? "active" : ""}`} onClick={() => { setThemePreset(preset.id); setAccentColor("Preset"); }} aria-pressed={themePreset === preset.id}>
                  <span className="theme-swatch" style={{ background: `linear-gradient(90deg, ${preset.colors[0]}, ${preset.colors[1]})` }} />
                  <span className="theme-preset-copy"><strong>{preset.name}</strong><small>{preset.description}</small></span>
                  {themePreset === preset.id && <span className="theme-active-mark"><Check size={13} /> Active</span>}
                </button>
              ))}
            </div>
          </section>

        </div>
      ) : activeTab === "currency" ? (
        <div className="settings-stack">
          <section className="settings-card settings-currency-card">
            <div className="settings-currency-heading">
              <SectionTitle title="Exchange Rates" description="Set exchange rates relative to your base currency." icon={CircleDollarSign} />
              <button type="submit" className="settings-save"><Save size={15} />Save Rates</button>
            </div>
            <div className="settings-currency-base">
              <Field label="Base currency">
                <select value={defaultCurrency} onChange={(event) => changeBaseCurrency(event.target.value)}>
                  {currencyOptions.map((currency) => { const code = currencyCodeFromLabel(currency); return <option key={currency} value={currency}>{getCurrencyMeta(code).symbol} {currency}</option>; })}
                </select>
              </Field>
            </div>
            <h3 className="settings-rate-title">Exchange rates (1 {currencyCodeFromLabel(defaultCurrency)} = ?)</h3>
            <div className="settings-currency-rate-grid">
              {currencies.filter(({ code }) => code !== currencyCodeFromLabel(defaultCurrency)).map(({ code, name, symbol }) => {
                const rate = Number.parseFloat(exchangeRates[code]);
                const reciprocal = Number.isFinite(rate) && rate > 0 ? 1 / rate : 0;
                const baseCode = currencyCodeFromLabel(defaultCurrency);
                return (
                  <div className="settings-currency-rate" key={code}>
                    <span className="settings-currency-symbol">{symbol}</span>
                    <Field label={`${name} (${code})`}>
                      <input type="number" min="0" step="any" inputMode="decimal" value={exchangeRates[code] || ""} onChange={(event) => setExchangeRates((previous) => ({ ...previous, [code]: event.target.value }))} placeholder="0.000000" />
                      {reciprocal > 0 && (
                        <small className="settings-rate-reciprocal">
                          1 {code} = {reciprocal.toLocaleString(undefined, { maximumFractionDigits: 10 })} {baseCode}
                        </small>
                      )}
                    </Field>
                  </div>
                );
              })}
            </div>
            <div className="settings-rate-note"><strong>Calculation rule</strong><span>Enter how much of each currency equals 1 {currencyCodeFromLabel(defaultCurrency)}. Records keep their original currency; reports and totals convert them using these rates.</span></div>
          </section>
        </div>
      ) : activeTab === "printing" ? (
        <div className="settings-stack">
          <section className="settings-card print-studio-card">
            <div className="print-studio-heading"><SectionTitle title="Print Studio" description="Brand every printed document — invoices, receipts, reports and statements." icon={Printer} /><div><button type="button" className="settings-light-button" onClick={() => openPrintPreview(printSettings, current)}><Eye size={15} />Preview</button><button type="button" className="settings-light-button" onClick={() => setPrintSettings(normalizePrintSettings(defaultPrintStudio, current))}><RotateCcw size={15} />Reset</button></div></div>

            <h3 className="print-studio-group-title">Business identity</h3>
            <div className="settings-field-grid three">
              <Field label="Name (English)"><input value={printSettings.businessNameEn} onChange={(e) => updatePrint("businessNameEn", e.target.value)} /></Field>
              <Field label="نام (دری)"><input dir="rtl" value={printSettings.businessNameFa} onChange={(e) => updatePrint("businessNameFa", e.target.value)} /></Field>
              <Field label="نوم (پښتو)"><input dir="rtl" value={printSettings.businessNamePs} onChange={(e) => updatePrint("businessNamePs", e.target.value)} /></Field>
              <Field label="Subtitle (English)"><input value={printSettings.subtitleEn} onChange={(e) => updatePrint("subtitleEn", e.target.value)} /></Field>
              <Field label="عنوان فرعی (دری)"><input dir="rtl" value={printSettings.subtitleFa} onChange={(e) => updatePrint("subtitleFa", e.target.value)} /></Field>
              <Field label="فرعي عنوان (پښتو)"><input dir="rtl" value={printSettings.subtitlePs} onChange={(e) => updatePrint("subtitlePs", e.target.value)} /></Field>
              {[['address','Address'],['phone','Phone'],['email','Email'],['website','Website'],['hours','Hours'],['registrationNumber','GSTIN / Reg No.']].map(([key,label]) => <Field key={key} label={label}><input value={printSettings[key]} onChange={(e) => updatePrint(key, e.target.value)} /></Field>)}
            </div>

            <h3 className="print-studio-group-title">Brand colors</h3>
            <div className="print-color-grid">{[['primaryColor','Primary'],['accentColor','Accent'],['headerTextColor','Header text'],['footerTextColor','Footer text'],['titleColor','Title'],['subtitleColor','Subtitle'],['bodyTextColor','Body text']].map(([key,label]) => <label className="print-color-field" key={key}><span>{label}</span><div><input type="color" value={printSettings[key]} onChange={(e) => updatePrint(key,e.target.value)} /><input value={printSettings[key]} onChange={(e) => updatePrint(key,e.target.value)} /></div></label>)}</div>

            <div className="print-upload-grid"><div><span>Logo</span><button type="button" className="settings-light-button" onClick={() => printLogoInputRef.current?.click()}><Upload size={14} />Upload logo</button><input ref={printLogoInputRef} hidden type="file" accept="image/*" onChange={(e) => uploadPrintImage("logo",e)} />{printSettings.logo && <img src={printSettings.logo} alt="Print logo" />}</div><div><span>Watermark</span><button type="button" className="settings-light-button" onClick={() => watermarkInputRef.current?.click()}><Upload size={14} />Upload watermark</button><input ref={watermarkInputRef} hidden type="file" accept="image/*" onChange={(e) => uploadPrintImage("watermark",e)} />{printSettings.watermark && <img src={printSettings.watermark} alt="Watermark" />}</div></div>
            <PrintRange label="Watermark opacity" value={printSettings.watermarkOpacity} min="0" max="30" unit="%" onChange={(value) => updatePrint("watermarkOpacity",value)} />

            <h3 className="print-studio-group-title">Typography</h3>
            <div className="print-range-grid">{[['titleSize','Title',14,34],['subtitleSize','Subtitle',8,20],['headerTextSize','Header text',8,18],['bodyTextSize','Body',8,18],['footerTextSize','Footer',8,16]].map(([key,label,min,max]) => <PrintRange key={key} label={label} value={printSettings[key]} min={min} max={max} unit="px" onChange={(value) => updatePrint(key,value)} />)}</div>

            <h3 className="print-studio-group-title">Layout</h3>
            <div className="settings-field-grid three"><PrintRange label="Header height" value={printSettings.headerHeight} min="20" max="70" unit="mm" onChange={(value) => updatePrint("headerHeight",value)} /><PrintRange label="Footer height" value={printSettings.footerHeight} min="10" max="45" unit="mm" onChange={(value) => updatePrint("footerHeight",value)} /><Field label="Rows per page"><input type="number" min="5" max="100" value={printSettings.rowsPerPage} onChange={(e) => updatePrint("rowsPerPage",Number(e.target.value))} /></Field></div>
            <div className="settings-field-grid three"><Field label="Default print template"><select value={printSettings.template} onChange={(e) => updatePrint("template",e.target.value)}>{printTemplateOptions.map((option) => <option key={option}>{option}</option>)}</select></Field><Field label="Paper size"><select value={printSettings.paperSize} onChange={(e) => updatePrint("paperSize",e.target.value)}>{["A4","Letter","A5","80mm Thermal"].map((option) => <option key={option}>{option}</option>)}</select></Field><Field label="Footer text"><input value={printSettings.footerText} onChange={(e) => updatePrint("footerText",e.target.value)} /></Field></div>
            <div className="settings-inline-switches"><div><span>Show timestamp</span><Switch checked={printSettings.showTimestamp} onChange={(value) => updatePrint("showTimestamp",value)} /></div><div><span>Show logo</span><Switch checked={printSettings.showLogo} onChange={(value) => updatePrint("showLogo",value)} /></div><div><span>Show signature</span><Switch checked={printSettings.showSignature} onChange={(value) => updatePrint("showSignature",value)} /></div></div>
          </section>
        </div>
      ) : activeTab === "notifications" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Notification Sounds" description="Choose a notification sound for alerts." icon={Bell} />
            <div className="notification-sound-grid">{notificationSoundOptions.filter((item) => item.value !== "none").map((sound) => <button type="button" key={sound.value} className={notificationSettings.sound === sound.value ? "active" : ""} onClick={() => { setNotificationSettings((previous) => ({ ...previous, sound: sound.value })); playNotificationSound(sound.value); }}><Volume2 size={16}/><span><strong>{sound.label}</strong><small>{sound.description}</small></span><Play size={14}/></button>)}</div>
            <div className="settings-inline-switches">
              <div><span>Enable notifications</span><Switch checked={notificationSettings.enabled} onChange={(value) => setNotificationSettings((previous) => ({ ...previous, enabled: value }))} /></div>
              <div><span>Low stock alerts</span><Switch checked={notificationSettings.lowStock} onChange={(value) => setNotificationSettings((previous) => ({ ...previous, lowStock: value }))} /></div>
              <div><span>Due payment alerts</span><Switch checked={notificationSettings.duePayments} onChange={(value) => setNotificationSettings((previous) => ({ ...previous, duePayments: value }))} /></div>
              <div><span>Daily summary</span><Switch checked={notificationSettings.dailySummary} onChange={(value) => setNotificationSettings((previous) => ({ ...previous, dailySummary: value }))} /></div>
            </div>
          </section>
        </div>
      ) : activeTab === "sharing" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Sharing Settings" description="Configure WhatsApp and Email for invoice sharing." icon={Share2} />
            <div className="sharing-fields"><Field label="WhatsApp Number"><input type="tel" value={sharingSettings.whatsappNumber || ""} onChange={(event) => setSharingSettings((previous) => ({ ...previous, whatsappNumber: event.target.value }))} placeholder="+93700000000" /><small>Include country code (e.g. +93 for Afghanistan)</small></Field><Field label="Email Address"><input type="email" value={sharingSettings.emailAddress || ""} onChange={(event) => setSharingSettings((previous) => ({ ...previous, emailAddress: event.target.value }))} placeholder="info@company.com" /><small>Email used for sharing invoices and reports</small></Field></div>
            <div className="settings-inline-switches"><div><span>Business profile sharing</span><Switch checked={sharingSettings.businessProfile} onChange={(value) => setSharingSettings((previous) => ({ ...previous, businessProfile: value }))} /></div><div><span>Public report links</span><Switch checked={sharingSettings.publicReports} onChange={(value) => setSharingSettings((previous) => ({ ...previous, publicReports: value }))} /></div></div>
          </section>
        </div>
      ) : activeTab === "advanced-sync" ? (
        <div className="settings-stack">
          <div className="sync-banner"><Shield size={15}/>Multi-device backup, intelligent merge, conflict resolution and audit-ready configuration.</div>
          <section className="settings-card sync-migration-card">
            <div className="settings-section-actions">
              <SectionTitle title="One-time migration" description="Stamps existing records with sync metadata (uuid, updatedAt, deviceId). Idempotent — safe to re-run." icon={Box} />
              <button type="button" className="settings-light-button" onClick={() => notify("Legacy records are ready for synchronization.")}>
                <Database size={14}/> Stamp legacy records
              </button>
            </div>
            <small className="sync-muted">Has not been run yet.</small>
          </section>

          <div className="advanced-sync-grid">
            <section className="settings-card sync-workspace-panel">
              <SectionTitle title="Export backup" description="Produce a portable, signed backup file you can send to another workstation." icon={Box} />
              <div className="sync-mode-switch"><button type="button" className="active">Full backup</button><button type="button">Incremental</button></div>
              <label className="sync-passphrase"><span><LockKeyhole size={14}/><strong>Encrypt with passphrase</strong><small>AES-GCM-256 · PBKDF2-SHA256</small></span><Switch checked={false} onChange={() => notify("Encrypted export can be enabled after a passphrase is configured.")} /></label>
              <button type="button" className="settings-save sync-primary-action" onClick={exportData} disabled={appDataBusy}><Download size={15}/>Export full</button>
            </section>

            <section className="settings-card sync-workspace-panel">
              <SectionTitle title="Import & merge" description="Drop backup files from any branch PC. Records merge by UUID with last-write-wins." icon={Upload} />
              <label className="sync-dropzone"><Upload size={25}/><strong>Drop backup files here</strong><small>or click to browse · multi-select supported</small><input hidden multiple type="file" accept="application/json,.json" onChange={importData}/></label>
              <div className="sync-import-options"><input aria-label="Import passphrase" placeholder="Passphrase (if encrypted)"/><label><span>Allow company mismatch</span><Switch checked={false} onChange={() => notify("Company mismatch protection remains enabled.")} /></label></div>
              <button type="button" className="settings-save sync-primary-action" disabled><Upload size={15}/>Start merge</button>
            </section>
          </div>

          <section className="settings-card sync-log-card">
            <div className="settings-section-actions"><SectionTitle title="Backup History" icon={History} /><div className="sync-log-filters"><select aria-label="Backup type"><option>All types</option><option>Full</option><option>Incremental</option></select><select aria-label="Backup status"><option>All statuses</option><option>Completed</option><option>Failed</option></select></div></div>
            <div className="sync-empty-state"><History size={20}/><span>No history yet — exports and imports will appear here.</span></div>
          </section>

          <section className="settings-card sync-log-card">
            <div className="settings-section-actions"><SectionTitle title="Live Activity" icon={Activity} /><button type="button" className="settings-light-button"><Trash2 size={13}/>Clear</button></div>
            <div className="sync-empty-state"><Activity size={20}/><span>Idle — no recent activity.</span></div>
          </section>
        </div>
      ) : activeTab === "security" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <SectionTitle title="Security Settings" description="Protect your system with password protection." icon={Shield} />
            <div className="security-status"><Shield size={18}/><div><strong>Password Protection</strong><span>{current.securitySettings?.password ? "Password is set" : "No password set"}</span></div>{current.securitySettings?.password&&<button type="button" className="settings-light-button" onClick={async()=>{const saved=await setSettings([{...current,securitySettings:{...(current.securitySettings||{}),password:"",lockOnStart:false,passwordUpdatedAt:new Date().toISOString()}}]);if(saved){setSecuritySettings((value)=>({...value,currentPassword:"",password:"",confirmPassword:"",lockOnStart:false}));window.dispatchEvent(new Event("company-settings-updated"));notify("Password protection removed.");}}}>Remove</button>}</div>
            <div className="settings-field-grid three">
              <div className="settings-toggle-field"><span>Lock on startup</span><Switch checked={securitySettings.lockOnStart} onChange={(value) => setSecuritySettings((previous) => ({ ...previous, lockOnStart: value }))} /></div>
              <Field label="Session timeout (minutes)">
                <input type="number" min="1" value={securitySettings.sessionTimeout} onChange={(event) => setSecuritySettings((previous) => ({ ...previous, sessionTimeout: event.target.value }))} />
              </Field>
              {current.securitySettings?.password&&<Field label="Current Password"><input type="password" value={securitySettings.currentPassword} onChange={(event)=>setSecuritySettings((previous)=>({...previous,currentPassword:event.target.value}))}/></Field>}
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
            <div className="settings-section-actions"><SectionTitle title="User Management" description="Create users with specific module access and CRUD permissions." icon={Shield} /><button className="settings-save" type="button" onClick={() => setUserModalOpen(true)}><Plus size={15}/>Add User</button></div>
            {!systemUsers.length && <div className="settings-empty-state"><UserRound size={38}/><p>No users created yet. Admin has full access by default.</p></div>}
            <SettingsTable
              empty="No users yet."
              rows={systemUsers}
              columns={["username", "name", "role", "email"]}
              onDelete={(id) => setSystemUsers((previous) => previous.filter((item) => item.id !== id))}
            />
          </section>
          {userModalOpen && <SettingsModal title="Create New User" wide onClose={() => setUserModalOpen(false)}><div className="settings-field-grid two"><Field label="Username *"><input autoFocus value={userDraft.username} onChange={(e)=>setUserDraft((p)=>({...p,username:e.target.value}))}/></Field><Field label="Display Name *"><input value={userDraft.name} onChange={(e)=>setUserDraft((p)=>({...p,name:e.target.value}))}/></Field><Field label="Password *"><input type="password" value={userDraft.password} onChange={(e)=>setUserDraft((p)=>({...p,password:e.target.value}))}/></Field><Field label="Confirm Password"><input type="password" value={userDraft.confirmPassword} onChange={(e)=>setUserDraft((p)=>({...p,confirmPassword:e.target.value}))}/></Field></div><h3 className="permission-title">Module Permissions</h3><div className="permission-table"><div className="permission-row header"><span>Module Access</span>{["create","view","update","delete","print","all"].map((a)=><span key={a}>{a}</span>)}</div>{permissionModules.map((module)=><div className="permission-row" key={module}><strong>{module}</strong>{["create","view","update","delete","print","all"].map((action)=><input key={action} type="checkbox" checked={Boolean(userPermissions[module]?.[action])} onChange={(e)=>setUserPermissions((previous)=>{const moduleAccess={...(previous[module]||{})}; if(action==="all"){["create","view","update","delete","print","all"].forEach((key)=>moduleAccess[key]=e.target.checked);}else moduleAccess[action]=e.target.checked; return {...previous,[module]:moduleAccess};})}/>)}</div>)}</div><div className="settings-modal-actions"><button type="button" className="settings-light-button" onClick={()=>setUserModalOpen(false)}>Cancel</button><button type="button" className="settings-save" onClick={addSystemUser}>Create User</button></div></SettingsModal>}
        </div>
      ) : activeTab === "forms" ? (
        <div className="settings-stack">
          <section className="settings-card">
            <div className="settings-section-actions"><SectionTitle title="Custom Form Fields" description="Add custom fields to module forms." icon={FileText} /><button className="settings-save" type="button" onClick={() => setFieldModalOpen(true)}><Plus size={15}/>Add Field</button></div>
            <div className="settings-tabs small" role="tablist">
              {formModules.map((module) => <button type="button" key={module} className={activeFormModule === module ? "active" : ""} onClick={() => setActiveFormModule(module)}>{module}</button>)}
            </div>
            {!(customFields[activeFormModule] || []).length && <div className="settings-empty-state"><FileText size={38}/><p>No custom fields for this module yet.</p></div>}
            <SettingsTable
              empty="No custom fields for this module."
              rows={customFields[activeFormModule] || []}
              columns={["label", "type", "required"]}
              onDelete={(id) => setCustomFields((previous) => ({ ...previous, [activeFormModule]: (previous[activeFormModule] || []).filter((item) => item.id !== id) }))}
            />
          </section>
          {fieldModalOpen && <SettingsModal title={`Add Field — ${activeFormModule}`} onClose={() => setFieldModalOpen(false)}><Field label="Field Label *"><input autoFocus value={fieldDraft.label} onChange={(e) => setFieldDraft((p) => ({...p,label:e.target.value}))} placeholder="e.g. Warranty Period"/></Field><Field label="Placeholder"><input value={fieldDraft.placeholder} onChange={(e) => setFieldDraft((p) => ({...p,placeholder:e.target.value}))}/></Field><Field label="Field Type"><select value={fieldDraft.type} onChange={(e) => setFieldDraft((p) => ({...p,type:e.target.value}))}>{["text","number","date","dropdown"].map((type)=><option key={type}>{type}</option>)}</select></Field><div className="settings-toggle-field"><span>Required</span><Switch checked={fieldDraft.required} onChange={(value)=>setFieldDraft((p)=>({...p,required:value}))}/></div><div className="settings-modal-actions"><button type="button" className="settings-light-button" onClick={()=>setFieldModalOpen(false)}>Cancel</button><button type="button" className="settings-save" onClick={addCustomField}>Add Field</button></div></SettingsModal>}
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

function SettingsModal({ title, onClose, children, wide = false }) {
  return <div className="settings-modal-overlay" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}><div className={`settings-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}><div className="settings-modal-header"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close"><X size={16}/></button></div><div className="settings-modal-body">{children}</div></div></div>;
}

function PrintRange({ label, value, min, max, unit, onChange }) {
  return <label className="print-range"><span><strong>{label}</strong><small>{value}{unit}</small></span><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
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
