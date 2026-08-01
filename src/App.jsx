import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Routes,
  Route,
  NavLink,
} from "react-router-dom";

import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CircleHelp,
  Code2,
  CreditCard,
  DollarSign,
  Factory,
  HelpCircle,
  Info,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Package,
  ReceiptText,
  Settings as SettingsIcon,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import Header from "./components/Header";
import GlobalTableEnhancer from "./components/GlobalTableEnhancer";
import ConfirmDialogHost from "./components/ConfirmDialogHost";
import StartupSplash from "./components/StartupSplash";
import LockScreen from "./components/LockScreen";
import ToastHost from "./components/ToastHost";
import { useJsonCollection } from "./hooks/useJsonCollection";
import { translations } from "./data/translations";
import { downloadBackup } from "./utils/backup";
import { notify } from "./utils/notify";
import { canViewModule } from "./utils/permissions";
import { applyTheme } from "./utils/theme";
import { installPrintStudio } from "./utils/printStudio";
import { installRuntimeI18n } from "./utils/runtimeI18n";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardInsight = lazy(() => import("./pages/DashboardInsight"));
const DashboardOverviewDetail = lazy(() => import("./pages/DashboardOverviewDetail"));
const Products = lazy(() => import("./pages/Products"));
const Billing = lazy(() => import("./pages/Billing"));
const SalesBills = lazy(() => import("./pages/SalesBills"));
const Staff = lazy(() => import("./pages/Staff"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Loans = lazy(() => import("./pages/Loans"));
const SupplierDetails = lazy(() => import("./pages/SupplierDetails"));
const AssetInventory = lazy(() => import("./pages/AssetInventory"));
const AssetInventoryInsight = lazy(() => import("./pages/AssetInventoryInsight"));
const MainStock = lazy(() => import("./pages/MainStock"));
const DeviceTransferManagement = lazy(() => import("./pages/DeviceTransferManagement"));
const TowerAssets = lazy(() => import("./pages/TowerAssets"));
const TowerInsight = lazy(() => import("./pages/TowerInsight"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerInsight = lazy(() => import("./pages/CustomerInsight"));
const CustomerDetails = lazy(() => import("./pages/CustomerDetails"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Finance = lazy(() => import("./pages/Finance"));
const Reports = lazy(() => import("./pages/Reports"));
const Repair = lazy(() => import("./pages/Repair"));
const Settings = lazy(() => import("./pages/Settings"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Agent = lazy(() => import("./pages/Agent"));
const RecycleBin = lazy(() => import("./pages/RecycleBin"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Login = lazy(() => import("./pages/Login"));
const AssetFullInformation = lazy(() => import("./pages/AssetFullInformation"));
const AssetAuditTrail = lazy(() => import("./pages/AssetAuditTrail"));
const AssetInsightDetails = lazy(() => import("./pages/AssetInsightDetails"));
const TowerLinks = lazy(() => import("./pages/TowerLinks"));
const CustomerIssueDevice = lazy(() => import("./pages/CustomerIssueDevice"));
const TowerAssetDetails = lazy(() => import("./pages/TowerAssetDetails"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Developer = lazy(() => import("./pages/Developer"));
const TermsPrivacy = lazy(
  () => import("./pages/TermsPrivacy")
);
const PartnerInvesting = lazy(() => import("./pages/PartnerInvesting"));
const FAQ = lazy(() => import("./pages/FAQ"));
const UserGuide = lazy(() => import("./pages/UserGuide"));



const defaultAdminAccount = {
  id: "default-admin",
  fullName: "System Admin",
  email: "admin@gmail.com",
  password: "mynameisadmin",
  secondaryPassword: "",
  role: "Admin",
  status: "Active",
  permissions: {},
  isDefaultAdmin: true,
  createdAt: "2026-07-18",
};

const autoBackupStorageKey = "smart-office-auto-backup-last-run";
const languageStorageKey = "isp-selected-language";

const getLanguageDirection = (language) => (["fa", "ps"].includes(language) ? "rtl" : "ltr");

function getAutoBackupIntervalMs(mode, customDays) {
  if (mode === "daily") return 24 * 60 * 60 * 1000;
  if (mode === "weekly") return 7 * 24 * 60 * 60 * 1000;
  if (mode === "monthly") return 30 * 24 * 60 * 60 * 1000;
  if (mode === "custom") return Math.max(Number(customDays || 1), 1) * 24 * 60 * 60 * 1000;
  return 0;
}

function ModulePlaceholder({ title, description, items = [] }) {
  return (
    <div className="module-placeholder">
      <div className="module-placeholder-card">
        <span className="module-kicker">Module</span>
        <h1>{title}</h1>
        <p>{description}</p>

        {!!items.length && (
          <div className="module-feature-grid">
            {items.map((item) => (
              <div className="module-feature" key={item}>
                <span></span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PermissionDenied() {
  return (
    <div className="module-placeholder">
      <div className="module-placeholder-card">
        <span className="module-kicker">Access Control</span>
        <h1>Permission Denied</h1>
        <p>You do not have permission to access this module.</p>
      </div>
    </div>
  );
}

function BusyLoader({ label = "System is preparing..." }) {
  return (
    <div className="page-loading app-busy-loader" role="status" aria-live="polite">
      <div className="app-busy-loader-card">
        <div className="app-busy-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <strong>{label}</strong>
        <p>Please wait a moment.</p>
      </div>
    </div>
  );
}

function ProtectedModule({ currentUser, moduleKey, children }) {
  if (!canViewModule(currentUser, moduleKey)) {
    return <PermissionDenied />;
  }

  return children;
}

function App() {
  const [settings, , loadSettings] = useJsonCollection("settings");
  const [accounts, setAccounts, , accountsLoaded] = useJsonCollection("accounts");
    const [sidebarInfoOpen, setSidebarInfoOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState(
    () => localStorage.getItem(languageStorageKey) || "en"
  );
  const [primaryCurrencyFilter, setPrimaryCurrencyFilter] = useState(
    () => localStorage.getItem("isp-primary-currency") || "AFN"
  );
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem("isp-secondary-currency") || "USD"
  );
  const sidebarInfoRef = useRef(null);

  const [sessionId, setSessionId] = useState(() =>
    localStorage.getItem("smart-office-system-session") ||
    localStorage.getItem("isp-system-session")
  );
  const [locked, setLocked] = useState(() => localStorage.getItem("smart-office-locked") === "1");


  const company = settings[0] || {};
  const direction = getLanguageDirection(language);
  const t = translations[language] || translations.en;
  const systemName = company.companyName || "Smart Office";
  const systemSubtitle = company.systemSubtitle || "Business Management System";
  const configuredUsers = (company.systemUsers || []).map((user) => ({ ...user, fullName: user.fullName || user.name, status: user.status || "Active" }));
  const mergedAccounts = [...accounts, ...configuredUsers.filter((user) => !accounts.some((account) => String(account.id) === String(user.id)))];
  const effectiveAccounts = mergedAccounts.some((account) => String(account.id) === "default-admin")
    ? mergedAccounts
    : [defaultAdminAccount, ...mergedAccounts];
  const currentUser = effectiveAccounts.find(
    (account) => String(account.id) === String(sessionId)
  );

  useEffect(() => {
    window.addEventListener("company-settings-updated", loadSettings);
    return () => window.removeEventListener("company-settings-updated", loadSettings);
  }, [loadSettings]);

  useEffect(() => {
    const updateCurrency = (event) => {
      setPrimaryCurrencyFilter(event?.detail?.primaryCurrency || localStorage.getItem("isp-primary-currency") || company.baseCurrency || "AFN");
      setDisplayCurrency(event?.detail?.secondaryCurrency || localStorage.getItem("isp-secondary-currency") || "USD");
    };
    window.addEventListener("app-currency-changed", updateCurrency);
    return () => window.removeEventListener("app-currency-changed", updateCurrency);
  }, [company.baseCurrency]);

  window.__retailCurrencyView = {
    baseCurrency: company.baseCurrency || "AFN",
    exchangeRates: company.exchangeRates || {},
    displayCurrency,
    primaryCurrency: primaryCurrencyFilter,
  };

  useEffect(() => installPrintStudio(() => ({ settings: company.printSettings || {}, company })), [company]);

  useEffect(() => {
    applyTheme(company);
    if (company.themeMode !== "System") return undefined;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const update = () => applyTheme(company);
    media?.addEventListener?.("change", update);
    return () => media?.removeEventListener?.("change", update);
  }, [company]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
    document.body.classList.toggle("rtl-language", direction === "rtl");
    document.body.classList.toggle("latin-language", direction !== "rtl");
    localStorage.setItem(languageStorageKey, language);
    let disposeTranslation;
    const frame = window.requestAnimationFrame(() => { disposeTranslation = installRuntimeI18n(language); });
    return () => { window.cancelAnimationFrame(frame); disposeTranslation?.(); };
  }, [direction, language]);

  useEffect(() => {
    if (!currentUser) return undefined;

    const mode = company.autoBackupMode || "off";
    const intervalMs = getAutoBackupIntervalMs(mode, company.autoBackupCustomDays);
    if (!intervalMs) return undefined;

    let cancelled = false;
    let running = false;

    const checkBackup = async () => {
      if (cancelled || running) return;

      const lastRun = Number(localStorage.getItem(autoBackupStorageKey) || 0);
      const now = Date.now();
      if (lastRun && now - lastRun < intervalMs) return;

      running = true;
      try {
        await downloadBackup(`auto-${mode}`);
        localStorage.setItem(autoBackupStorageKey, String(now));
        notify(`Automatic ${mode} backup created successfully.`);
      } catch (error) {
        console.error("Automatic backup failed:", error);
        notify("Automatic backup failed. Please export a manual backup from Settings.", "error");
      } finally {
        running = false;
      }
    };

    const startupTimer = window.setTimeout(checkBackup, 4000);
    const intervalTimer = window.setInterval(checkBackup, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(startupTimer);
      window.clearInterval(intervalTimer);
    };
  }, [company.autoBackupCustomDays, company.autoBackupMode, currentUser]);

    useEffect(() => {
    const closeSidebarInfo = (event) => {
      if (
        sidebarInfoRef.current &&
        !sidebarInfoRef.current.contains(event.target)
      ) {
        setSidebarInfoOpen(false);
      }
    };

    const closeWithEscape = (event) => {
      if (event.key === "Escape") {
        setSidebarInfoOpen(false);
      }
    };

    document.addEventListener("mousedown", closeSidebarInfo);
    document.addEventListener("keydown", closeWithEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        closeSidebarInfo
      );

      document.removeEventListener(
        "keydown",
        closeWithEscape
      );
    };
  }, []);

  useEffect(() => {
    if (!accountsLoaded) return;
    if (accounts.some((account) => String(account.id) === "default-admin")) return;
    setAccounts([defaultAdminAccount, ...accounts]);
  }, [accountsLoaded, accounts, setAccounts]);

  const login = (account) => {
    localStorage.setItem("smart-office-system-session", String(account.id));
    localStorage.removeItem("isp-system-session");
    setSessionId(String(account.id));
  };

  const logout = () => {
    localStorage.removeItem("smart-office-system-session");
    localStorage.removeItem("isp-system-session");
    localStorage.setItem("smart-office-locked", "1");
    setSessionId(null);
    setLocked(true);
  };

  const lockScreen = () => {
    localStorage.setItem("smart-office-locked", "1");
    setLocked(true);
  };

  useEffect(() => {
    const handleLockScreen = () => {
      localStorage.setItem("smart-office-locked", "1");
      setLocked(true);
    };
    window.addEventListener("app-lock-screen", handleLockScreen);
    return () => window.removeEventListener("app-lock-screen", handleLockScreen);
  }, []);

  const unlockScreen = (account) => {
    login(account);
    localStorage.removeItem("smart-office-locked");
    sessionStorage.setItem("smart-office-start-lock-handled", "1");
    setLocked(false);
    const firstAllowed = menuItems.find((item) => canViewModule(account, item.moduleKey));
    window.location.hash = firstAllowed?.to || "/";
  };

  useEffect(() => {
    if (!currentUser || !company.securitySettings?.password || !company.securitySettings?.lockOnStart) return;
    if (sessionStorage.getItem("smart-office-start-lock-handled") === "1") return;
    localStorage.setItem("smart-office-locked", "1");
    setLocked(true);
  }, [company.securitySettings?.lockOnStart, company.securitySettings?.password, currentUser]);

const menuItems = [
  {
    to: "/",
    label: "Dashboard",
    labelKey: "dashboard",
    moduleKey: "dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/assets",
    label: "Products",
    labelKey: "products",
    moduleKey: "assets",
    icon: Package,
  },
  {
    to: "/billing",
    label: "Billing",
    labelKey: "billing",
    moduleKey: "billing",
    icon: ReceiptText,
  },
  {
    to: "/sales-bills",
    label: "Sales / Bills",
    labelKey: "salesBills",
    moduleKey: "salesBills",
    icon: ShoppingCart,
  },
  {
    to: "/staff",
    label: "Staff",
    labelKey: "staff",
    moduleKey: "staff",
    icon: UserPlus,
  },
  {
    to: "/customers",
    label: "Customers",
    labelKey: "customers",
    moduleKey: "customers",
    icon: Users,
  },
  {
    to: "/main-stock",
    label: "Godown",
    labelKey: "godown",
    moduleKey: "mainStock",
    icon: Factory,
  },
  {
    to: "/suppliers",
    label: "Suppliers",
    labelKey: "suppliers",
    moduleKey: "suppliers",
    icon: Truck,
  },
  {
    to: "/partner-investing",
    label: "Partner Investing",
    labelKey: "partnerInvesting",
    moduleKey: "dashboard",
    icon: BriefcaseBusiness,
  },
  {
    to: "/expenses",
    label: "Expenses",
    labelKey: "expenses",
    moduleKey: "expenses",
    icon: WalletCards,
  },
  {
    to: "/loans",
    label: "Loans",
    labelKey: "loans",
    moduleKey: "loans",
    icon: CreditCard,
  },
  {
    to: "/financials",
    label: "Financials",
    labelKey: "financials",
    moduleKey: "financials",
    icon: DollarSign,
  },
  {
    to: "/reports",
    label: "Reports",
    labelKey: "reports",
    moduleKey: "reports",
    icon: BarChart3,
  },
  {
    to: "/agent",
    label: "Agent",
    labelKey: "agent",
    moduleKey: "agent",
    icon: MessageCircle,
  },
  {
    to: "/recycle-bin",
    label: "Recycle Bin",
    labelKey: "recycleBin",
    moduleKey: "dashboard",
    icon: Trash2,
  },
  {
    to: "/settings",
    label: "Settings",
    labelKey: "settings",
    moduleKey: "settings",
    icon: SettingsIcon,
  },
];

    const sidebarInfoLinks = [
    {
      key: "help-center",
      label: "Help Center",
      icon: HelpCircle,
      to: "/help-center",
    },
    {
      key: "developer",
      label: "Developer",
      icon: Code2,
      to: "/developer",
    },
    {
      key: "faq",
      label: "FAQ",
      icon: CircleHelp,
      to: "/faq",
    },
    {
      key: "user-guide",
      label: "User Guide",
      icon: BookOpen,
      to: "/user-guide",
    },
    {
      key: "terms-privacy",
      label: "Terms & Privacy",
      icon: ShieldCheck,
      to: "/terms-privacy",
    },
  ];

  const protect = (moduleKey, element) => (
    <ProtectedModule currentUser={currentUser} moduleKey={moduleKey}>
      {element}
    </ProtectedModule>
  );

  let appContent;

  if (!accountsLoaded) {
    appContent = <BusyLoader label="Preparing system..." />;
  } else if (!currentUser) {
    appContent = (
      <Suspense fallback={<BusyLoader label="Opening login..." />}>
        <Login
          accounts={accounts}
          setAccounts={setAccounts}
          onLogin={login}
          company={company}
        />
      </Suspense>
    );
  } else {
    appContent = (
      <div className={`app ${direction === "rtl" ? "app-rtl" : "app-ltr"}`} dir={direction}>
        <aside className={`sidebar ${mobileMenuOpen ? "mobile-menu-open" : ""}`}>
        <div className="brand">
          <button
            type="button"
            className="mobile-sidebar-menu-btn"
            onClick={() => setMobileMenuOpen((previous) => !previous)}
            aria-label="Open sections"
            aria-expanded={mobileMenuOpen}
            title="Sections"
          >
            <MoreHorizontal size={20} />
          </button>

          <div className="brand-logo">
            {company.logo ? (
              <img src={company.logo} alt="Company Logo" />
            ) : (
              systemName.slice(0, 1)
            )}
          </div>

          <div>
            <h2>{systemName}</h2>
            <p>{systemSubtitle}</p>
          </div>

          <Header.Actions
            currentUser={currentUser}
            language={language}
            onLanguageChange={setLanguage}
            onLogout={logout}
            onLock={lockScreen}
            t={t}
            compact
          />
        </div>

     <nav className="menu">
  {menuItems
    .filter((item) =>
      canViewModule(currentUser, item.moduleKey)
    )
    .map((item) => {
      const Icon = item.icon;

      return (
        <NavLink
          key={item.to}
          to={item.to}
          className="sidebar-main-link"
          onClick={() => setMobileMenuOpen(false)}
        >
          <Icon size={16} strokeWidth={1.8} />

          <span>{t[item.labelKey] || item.label}</span>
        </NavLink>
      );
    })}
</nav>
        <div
  className="sidebar-version-area"
  ref={sidebarInfoRef}
>
  <div className="sidebar-version-row">
   <span className="sidebar-version-label">
  v0.0.1 - Smart Office
</span>

    <button
      type="button"
      className={`sidebar-version-info-btn ${
        sidebarInfoOpen ? "active" : ""
      }`}
      onClick={() =>
        setSidebarInfoOpen((previous) => !previous)
      }
      aria-label="Open information menu"
      aria-expanded={sidebarInfoOpen}
      title="Information"
    >
      <Info size={16} />
    </button>
  </div>

  {sidebarInfoOpen && (
    <div className="sidebar-simple-dropdown">
      {sidebarInfoLinks.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.key}
            to={item.to}
            className="sidebar-simple-dropdown-link"
            onClick={() => setSidebarInfoOpen(false)}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  )}
</div>
        </aside>

        <main className="main">
        <Header
          company={company}
          currentUser={currentUser}
          language={language}
          onLanguageChange={setLanguage}
          onLogout={logout}
          onLock={lockScreen}
          t={t}
        />
        <GlobalTableEnhancer />

        <div className="page-content">
          <Suspense fallback={<BusyLoader label="Loading module..." />}>
            <Routes>
            <Route
  path="/"
  element={protect("dashboard", <Dashboard t={t} />)}
/>
<Route
  path="/partner-investing"
  element={<PartnerInvesting />}
/>
<Route
  path="/dashboard"
  element={protect("dashboard", <Dashboard t={t} />)}
/>

<Route
  path="/dashboard/overview/:overviewType"
  element={protect("dashboard", <DashboardOverviewDetail t={t} />)}
/>

            <Route
  path="/assets"
  element={protect("assets", <Products language={language} />)}
/>

<Route
  path="/products"
  element={protect("assets", <Products language={language} />)}
/>

<Route
  path="/billing"
  element={protect("billing", <Billing />)}
/>

<Route
  path="/sales-bills"
  element={protect("salesBills", <SalesBills />)}
/>

<Route
  path="/financials"
  element={protect("financials", <Finance />)}
/>

<Route
  path="/reports"
  element={protect("reports", <Reports />)}
/>

<Route
  path="/accounts"
  element={protect("userManagement", <Accounts accounts={accounts} setAccounts={setAccounts} currentUser={currentUser} />)}
/>

<Route
  path="/staff"
  element={protect("staff", <Staff />)}
/>

<Route
  path="/user-management"
  element={protect("staff", <Staff />)}
/>

<Route
  path="/customers"
  element={protect("customers", <Customers />)}
/>

<Route
  path="/main-stock"
  element={protect("mainStock", <MainStock />)}
/>

<Route
  path="/godown"
  element={protect("mainStock", <MainStock />)}
/>

<Route
  path="/suppliers"
  element={protect("suppliers", <Suppliers />)}
/>

<Route
  path="/partner-investing"
  element={
    <ModulePlaceholder
      title="Partner Investing"
      description="Partner investment management will be connected here."
    />
  }
/>

<Route
  path="/expenses"
  element={protect("expenses", <Expenses />)}
/>

<Route
  path="/settings"
  element={protect("settings", <Settings />)}
/>

<Route
  path="/agent"
  element={protect("agent", <Agent />)}
/>

      <Route
        path="/loans"
        element={protect("loans", <Loans />)}
      />

<Route
  path="/recycle-bin"
  element={protect("dashboard", <RecycleBin />)}
/>
            </Routes>
          </Suspense>
        </div>
        </main>

        <ToastHost />
        <ConfirmDialogHost />
      </div>
    );
  }

  return (
    <>
      <StartupSplash />
      {appContent}
      {accountsLoaded && locked && <LockScreen accounts={effectiveAccounts} company={company} onUnlock={unlockScreen} />}
      {!currentUser && <ToastHost />}
      {!currentUser && <ConfirmDialogHost />}
    </>
  );
}

export default App;
