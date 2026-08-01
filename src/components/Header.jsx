import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Bell,
  Box,
  CheckCheck,
  ChevronDown,
  Coins,
  CreditCard,
  Globe2,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  Trash2,
  User,
  Users,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { todayDateValue } from "../utils/afghanDate";
import { buildSystemSearchResults, money } from "../utils/systemSearch";
import { playNotificationSound } from "../utils/notificationSounds";
import { setThemeModeOverride, themeModeStorageKey } from "../utils/theme";

const NOTIFICATION_STATE_KEY = "isp-notification-state";
const LOW_STOCK_SOUND_STATE_KEY = "isp-low-stock-sounded";

const LANGUAGE_STORAGE_KEY = "isp-selected-language";
const PRIMARY_CURRENCY_STORAGE_KEY = "isp-primary-currency";
const SECONDARY_CURRENCY_STORAGE_KEY = "isp-secondary-currency";

const languageOptions = [
  {
    value: "en",
    label: "English",
    shortLabel: "EN",
    direction: "ltr",
  },
  {
    value: "fa",
    label: "دری",
    shortLabel: "دری",
    direction: "rtl",
  },
  {
    value: "ps",
    label: "پښتو",
    shortLabel: "پښتو",
    direction: "rtl",
  },
];

const currencyOptions = [
  {
    value: "AFN",
    label: "Afghan Afghani",
    shortLabel: "AFN",
    symbol: "؋",
  },
  {
    value: "USD",
    label: "US Dollar",
    shortLabel: "USD",
    symbol: "$",
  },
  {
    value: "EUR",
    label: "Euro",
    shortLabel: "EUR",
    symbol: "€",
  },
  {
    value: "GBP",
    label: "British Pound",
    shortLabel: "GBP",
    symbol: "£",
  },
  {
    value: "PKR",
    label: "Pakistani Rupee",
    shortLabel: "PKR",
    symbol: "Rs",
  },
  {
    value: "IRR",
    label: "Iranian Rial",
    shortLabel: "IRR",
    symbol: "ریال",
  },
  {
    value: "SAR",
    label: "Saudi Riyal",
    shortLabel: "SAR",
    symbol: "ریال",
  },
  {
    value: "AED",
    label: "UAE Dirham",
    shortLabel: "AED",
    symbol: "د.إ",
  },
  {
    value: "INR",
    label: "Indian Rupee",
    shortLabel: "INR",
    symbol: "₹",
  },
];

const currencyTranslationKeys = { AFN: "afghanAfghani", USD: "usDollar", EUR: "euro", GBP: "britishPound", PKR: "pakistaniRupee", IRR: "iranianRial", SAR: "saudiRiyal", AED: "uaeDirham", INR: "indianRupee" };

const readNotificationState = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_STATE_KEY) || "{}");

    return {
      readIds: Array.isArray(parsed.readIds) ? parsed.readIds : [],
      clearedIds: Array.isArray(parsed.clearedIds) ? parsed.clearedIds : [],
    };
  } catch {
    return {
      readIds: [],
      clearedIds: [],
    };
  }
};

const writeNotificationState = (state) => {
  localStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(state));
};

function HeaderActions({
  currentUser,
  language = "en",
  onLanguageChange,
  onLogout,
  compact = false,
  t = {},
}) {
  const [openMenu, setOpenMenu] = useState(null);

  const [showCashWallet, setShowCashWallet] = useState(false);

const [walletType, setWalletType] = useState("deposit");

const [walletForm, setWalletForm] = useState({
  amount: "",
  currency: "AFN",
  note: "",
});

  const [selectedLanguage, setSelectedLanguage] = useState(
  () => language || localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en"
);

const [primaryCurrency, setPrimaryCurrency] = useState(
  () => localStorage.getItem(PRIMARY_CURRENCY_STORAGE_KEY) || "AFN"
);

const [secondaryCurrency, setSecondaryCurrency] = useState(
  () => localStorage.getItem(SECONDARY_CURRENCY_STORAGE_KEY) || "USD"
);

const headerDropdownRef = useRef(null);

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem(themeModeStorageKey) === "Dark" || document.body.classList.contains("dark-mode")
  );
  const [notificationState, setNotificationState] = useState(readNotificationState);

  const [assets] = useJsonCollection("assets");
  const [towerAssets] = useJsonCollection("towerAssets");
  const [securityDeposits] = useJsonCollection("securityDeposits");
  const [products, , , productsLoaded] = useJsonCollection("products");
  const [appSettings] = useJsonCollection("settings");

  const [transactions, setTransactions] =
  useJsonCollection("transactions");
  const today = todayDateValue();

  useEffect(() => {
    setSelectedLanguage(language || "en");
  }, [language]);

  const damagedOrLostAssets = assets.filter((asset) =>
    ["Damaged", "Lost"].includes(asset.status)
  );

  useEffect(() => {
  const closeHeaderDropdown = (event) => {
    if (
      headerDropdownRef.current &&
      !headerDropdownRef.current.contains(event.target)
    ) {
      setOpenMenu(null);
    }
  };

  const closeWithEscape = (event) => {
    if (event.key === "Escape") {
      setOpenMenu(null);
    }
  };

  document.addEventListener(
    "mousedown",
    closeHeaderDropdown
  );

  document.addEventListener(
    "keydown",
    closeWithEscape
  );

  return () => {
    document.removeEventListener(
      "mousedown",
      closeHeaderDropdown
    );

    document.removeEventListener(
      "keydown",
      closeWithEscape
    );
  };
}, []);

  const pendingTowerAssets = towerAssets.filter(
    (item) => item.installationStatus === "Pending"
  );

  const outstandingDeposits = securityDeposits.filter((item) =>
    ["Outstanding", "Held"].includes(item.status)
  );

  const lowStockAssets = assets.filter((asset) => {
    const alertQuantity = Number(asset.alertQuantity || 0);
    return alertQuantity > 0 && Number(asset.quantity || 0) <= alertQuantity;
  });

  const lowStockProducts = products.filter((product) => {
    const threshold = Number(product.lowStock ?? product.lowStockThreshold ?? 0);
    const quantity = Number(product.quantity ?? product.stock ?? 0);
    return threshold > 0 && quantity <= threshold;
  });

  const lowStockAlertItems = [
    ...lowStockAssets.map((asset) => ({
      id: `low-stock:asset:${asset.id || asset.assetId || asset.deviceName}`,
      title: "Low Stock Alert",
      description: `${asset.assetId || asset.deviceName || "Asset"} has only ${money(asset.quantity)} ${asset.purchaseUsageUnit || asset.purchaseUnit || "unit(s)"} left`,
    })),
    ...lowStockProducts.map((product) => ({
      id: `low-stock:product:${product.id || product.code || product.barcode || product.name}`,
      title: "Product Low Stock Alert",
      description: `${product.name || product.code || "Product"} has ${money(product.quantity)} ${product.unit || "unit(s)"} left (alert level: ${money(product.lowStock ?? product.lowStockThreshold)})`,
    })),
  ];

  const notificationGroups = [
    {
      key: "stock",
      title: "Stock Alerts",
      count: lowStockAlertItems.length,
      icon: Box,
      items: lowStockAlertItems,
    },
    {
      key: "asset-status",
      title: "Asset Status Alerts",
      count: damagedOrLostAssets.length,
      icon: AlertTriangle,
      items: damagedOrLostAssets.map((asset) => ({
        id: `asset-status:${asset.id || asset.assetId || asset.deviceName}:${asset.status}`,
        title: `${asset.status || "Asset"} Asset`,
        description: `${asset.assetId || asset.deviceName || "Asset"} needs attention`,
      })),
    },
    {
      key: "tower",
      title: "Tower Alerts",
      count: pendingTowerAssets.length,
      icon: Wrench,
      items: pendingTowerAssets.map((tower) => ({
        id: `tower:${tower.id || tower.towerName}:${tower.installationStatus}`,
        title: "Pending Tower Installation",
        description: `${tower.towerName || "Tower"} is still pending`,
      })),
    },
    {
      key: "deposit",
      title: "Deposit Alerts",
      count: outstandingDeposits.length,
      icon: CreditCard,
      items: outstandingDeposits.map((deposit) => ({
        id: `deposit:${deposit.id || deposit.customerId || deposit.customerName}:${deposit.status}:${deposit.remainingAmount || deposit.amount || deposit.depositAmount}`,
        title: "Outstanding Deposit",
        description: `${deposit.customerName || deposit.customerId || "Customer"} has a deposit balance`,
      })),
    },
  ].filter((group) => group.count > 0);

  const notificationItems = notificationGroups.flatMap((group) =>
    group.items.map((item) => ({ ...item, groupTitle: group.title, icon: group.icon }))
  );

  useEffect(() => {
    if (!productsLoaded) return;
    const notificationSettings = appSettings[0]?.notificationSettings || {};
    const currentIds = lowStockAlertItems.map((item) => item.id);
    let previousIds = [];
    try { previousIds = JSON.parse(localStorage.getItem(LOW_STOCK_SOUND_STATE_KEY) || "[]"); } catch { previousIds = []; }
    const previous = new Set(Array.isArray(previousIds) ? previousIds : []);
    const hasNewAlert = currentIds.some((id) => !previous.has(id));
    localStorage.setItem(LOW_STOCK_SOUND_STATE_KEY, JSON.stringify(currentIds));
    if (hasNewAlert && notificationSettings.enabled !== false && notificationSettings.lowStock !== false) {
      playNotificationSound(notificationSettings.sound || "chime").catch(() => {});
    }
  }, [productsLoaded, lowStockAlertItems.map((item) => item.id).join("|"), appSettings]);

  const clearedNotificationIds = new Set(notificationState.clearedIds);
  const readNotificationIds = new Set(notificationState.readIds);

  const visibleNotificationItems = notificationItems.filter(
    (item) => !clearedNotificationIds.has(item.id)
  );

  const visibleNotificationGroups = notificationGroups
    .map((group) => {
      const items = group.items.filter((item) => !clearedNotificationIds.has(item.id));
      return {
        ...group,
        count: items.length,
        unreadCount: items.filter((item) => !readNotificationIds.has(item.id)).length,
        items,
      };
    })
    .filter((group) => group.count > 0);

  const alertCount = visibleNotificationItems.filter(
    (item) => !readNotificationIds.has(item.id)
  ).length;

  const persistNotificationState = (nextState) => {
    setNotificationState(nextState);
    writeNotificationState(nextState);
  };

  const markAllNotificationsRead = () => {
    persistNotificationState({
      ...notificationState,
      readIds: Array.from(
        new Set([
          ...notificationState.readIds,
          ...visibleNotificationItems.map((item) => item.id),
        ])
      ),
    });
  };

  const clearAllNotifications = () => {
    persistNotificationState({
      ...notificationState,
      clearedIds: Array.from(
        new Set([
          ...notificationState.clearedIds,
          ...visibleNotificationItems.map((item) => item.id),
        ])
      ),
    });
  };

  const removeNotification = (notificationId) => {
    persistNotificationState({
      ...notificationState,
      clearedIds: Array.from(new Set([...notificationState.clearedIds, notificationId])),
    });
  };

  const changeLanguage = (languageCode) => {
  const language =
    languageOptions.find(
      (item) => item.value === languageCode
    ) || languageOptions[0];

  setSelectedLanguage(language.value);
  onLanguageChange?.(language.value);

  localStorage.setItem(
    LANGUAGE_STORAGE_KEY,
    language.value
  );

  document.documentElement.lang = language.value;
  document.documentElement.dir = language.direction;

  window.dispatchEvent(
    new CustomEvent("app-language-changed", {
      detail: {
        language: language.value,
        direction: language.direction,
      },
    })
  );

  setOpenMenu(null);
};

const changePrimaryCurrency = (currencyCode) => {
  setPrimaryCurrency(currencyCode);

  localStorage.setItem(
    PRIMARY_CURRENCY_STORAGE_KEY,
    currencyCode
  );

  window.dispatchEvent(
    new CustomEvent("app-currency-changed", {
      detail: {
        primaryCurrency: currencyCode,
        secondaryCurrency,
      },
    })
  );

  setOpenMenu(null);
};

const changeSecondaryCurrency = (currencyCode) => {
  setSecondaryCurrency(currencyCode);

  localStorage.setItem(
    SECONDARY_CURRENCY_STORAGE_KEY,
    currencyCode
  );

  window.dispatchEvent(
    new CustomEvent("app-currency-changed", {
      detail: {
        primaryCurrency,
        secondaryCurrency: currencyCode,
      },
    })
  );

  setOpenMenu(null);
};

  function toggleDarkMode() {
    setDarkMode((value) => {
      const nextDarkMode = !value;
      setThemeModeOverride(nextDarkMode ? "Dark" : "Light");
      return nextDarkMode;
    });
  }

  const openCashWallet = () => {
  setWalletType("deposit");

  setWalletForm({
    amount: "",
    currency: primaryCurrency || "AFN",
    note: "",
  });

  setOpenMenu(null);
  setShowCashWallet(true);
};

const closeCashWallet = () => {
  setShowCashWallet(false);
  setWalletType("deposit");

  setWalletForm({
    amount: "",
    currency: primaryCurrency || "AFN",
    note: "",
  });
};

const handleWalletInputChange = (event) => {
  const { name, value } = event.target;

  setWalletForm((previous) => ({
    ...previous,
    [name]: value,
  }));
};

const saveCashWalletTransaction = async (event) => {
  event.preventDefault();

  const amount = Number(walletForm.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    window.alert("Please enter a valid amount.");
    return;
  }

  const now = new Date().toISOString();

  const nextTransaction = {
    id: `wallet-${Date.now()}`,
    transactionType: walletType,
    type: walletType === "deposit" ? "income" : "expense",
    category: "Cash Wallet",
    title:
      walletType === "deposit"
        ? "Cash Wallet Deposit"
        : "Cash Wallet Withdrawal",
    amount,
    currency: walletForm.currency || primaryCurrency || "AFN",
    note: walletForm.note.trim(),
    date: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    source: "cash-wallet",
  };

  const saved = await setTransactions((current) => [
    nextTransaction,
    ...current,
  ]);

  if (!saved) return;

  window.dispatchEvent(
    new CustomEvent("cash-wallet-updated", {
      detail: nextTransaction,
    })
  );

  closeCashWallet();
};

  if (compact) {
    return (
      <div className="header-menu mobile-brand-actions">
        <button
          className="profile-btn mobile-actions-toggle"
          onClick={() => setOpenMenu(openMenu === "mobile" ? null : "mobile")}
          aria-label="Open mobile actions"
          type="button"
        >
          <User size={17} />
          {alertCount > 0 && <span className="alert-count">{alertCount}</span>}
          <ChevronDown size={14} />
        </button>

        {openMenu === "mobile" && (
          <div className="dropdown mobile-actions-dropdown">
            <strong>
              {currentUser?.fullName || currentUser?.email || currentUser?.username}
            </strong>
            <p>{currentUser?.email || "No email configured"}</p>

            <Link to="/accounts" className="dropdown-action" onClick={() => setOpenMenu(null)}>
              <Users size={15} />
              Accounts
            </Link>
            <Link to="/settings" className="dropdown-action" onClick={() => setOpenMenu(null)}>
              <Settings size={15} />
              Settings
            </Link>
            <button className="dropdown-action" type="button" onClick={toggleDarkMode}>
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              {darkMode ? "Light mode" : "Dark mode"}
            </button>

            <div className="dropdown-alerts">
              <span>
                <Bell size={15} />
                Alerts
                <b>{alertCount}</b>
              </span>
              <small>Low stock assets: {visibleNotificationGroups.find((group) => group.key === "stock")?.count || 0}</small>
              <small>Damaged / lost assets: {visibleNotificationGroups.find((group) => group.key === "asset-status")?.count || 0}</small>
              <small>Pending tower installations: {visibleNotificationGroups.find((group) => group.key === "tower")?.count || 0}</small>
              <small>Outstanding deposits: {visibleNotificationGroups.find((group) => group.key === "deposit")?.count || 0}</small>
            </div>

            <button className="dropdown-logout" onClick={onLogout} type="button">
              <LogOut size={15} />
              Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <div className="top-actions">
        <div
  className="header-preference-actions"
  ref={headerDropdownRef}
>
  <div className="header-menu header-preference-menu">
    <button
  type="button"
  className={`header-preference-btn header-icon-only-btn ${
    openMenu === "language" ? "active" : ""
  }`}
  aria-label={t.language || "Language"}
  title={t.language || "Language"}
  aria-expanded={openMenu === "language"}
  onClick={() =>
    setOpenMenu(
      openMenu === "language" ? null : "language"
    )
  }
>
  <Globe2 size={19} strokeWidth={1.9} />
</button>

    {openMenu === "language" && (
      <div className="dropdown header-preference-dropdown language-dropdown">
        <div className="header-preference-dropdown-title">
          <strong>{t.language || "Language"}</strong>
          <span>{t.selectSystemLanguage || "Select system language"}</span>
        </div>

        {languageOptions.map((item) => (
          <button
            type="button"
            key={item.value}
            className={`header-preference-option ${
              selectedLanguage === item.value ? "active" : ""
            }`}
            onClick={() => changeLanguage(item.value)}
          >
            <Globe2 size={15} />
            <span>
              <strong>{item.label}</strong>
              <small>{item.direction.toUpperCase()}</small>
            </span>
            {selectedLanguage === item.value && <CheckCheck size={15} />}
          </button>
        ))}
      </div>
    )}
  </div>

  {/* Primary currency dropdown */}
  <div className="header-menu header-preference-menu">
    <button
  type="button"
  className={`header-preference-btn header-icon-only-btn ${
    openMenu === "primary-currency"
      ? "active"
      : ""
  }`}
  aria-label={t.selectPrimaryCurrency || "Select primary currency"}
  title={`${t.primaryCurrency || "Primary Currency"}: ${primaryCurrency}`}
  aria-expanded={
    openMenu === "primary-currency"
  }
  onClick={() =>
    setOpenMenu(
      openMenu === "primary-currency"
        ? null
        : "primary-currency"
    )
  }
>
  <Coins size={18} strokeWidth={1.9} />
</button>

    {openMenu === "primary-currency" && (
      <div className="dropdown header-preference-dropdown currency-dropdown">
        <div className="header-preference-dropdown-title">
          <strong>{t.primaryCurrency || "Primary Currency"}</strong>

          <span>
            {t.primaryCurrencyHint || "Main currency used by the system"}
          </span>
        </div>

        <div className="header-currency-list">
          {currencyOptions.map((currency) => (
            <button
              type="button"
              key={currency.value}
              className={`header-preference-option ${
                primaryCurrency === currency.value
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                changePrimaryCurrency(
                  currency.value
                )
              }
            >
              <span className="currency-symbol">
                {currency.symbol}
              </span>

              <span>
                <strong>{currency.value}</strong>
                <small>{t[currencyTranslationKeys[currency.value]] || currency.label}</small>
              </span>

              {primaryCurrency ===
                currency.value && (
                <CheckCheck size={15} />
              )}
            </button>
          ))}
        </div>
      </div>
    )}
  </div>

  <button
  type="button"
  className="header-preference-btn header-icon-only-btn header-wallet-btn"
  aria-label={t.openCashWallet || "Open cash wallet"}
  title={t.cashWallet || "Cash Wallet"}
  onClick={openCashWallet}
>
  <WalletCards size={18} strokeWidth={1.9} />
</button>

  {/* Secondary currency dropdown */}
  <div className="header-menu header-preference-menu">
   <button
  type="button"
  className={`header-preference-btn header-icon-only-btn ${
    openMenu === "secondary-currency"
      ? "active"
      : ""
  }`}
  aria-label={t.selectExchangeCurrency || "Select exchange currency"}
  title={secondaryCurrency}
  aria-expanded={
    openMenu === "secondary-currency"
  }
  onClick={() =>
    setOpenMenu(
      openMenu === "secondary-currency"
        ? null
        : "secondary-currency"
    )
  }
>
  <ArrowLeftRight size={19} strokeWidth={1.9} />
</button>

    {openMenu === "secondary-currency" && (
      <div className="dropdown header-preference-dropdown currency-dropdown secondary-currency-dropdown">
        <div className="header-preference-dropdown-title">
          <strong>{t.exchangeCurrency || "Exchange Currency"}</strong>

          <span>
            {t.exchangeCurrencyHint || "Secondary currency used for exchange"}
          </span>
        </div>

        <div className="header-currency-list">
          {currencyOptions.map((currency) => (
              <button
                type="button"
                key={currency.value}
                className={`header-preference-option ${
                  secondaryCurrency ===
                  currency.value
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  changeSecondaryCurrency(
                    currency.value
                  )
                }
              >
                <span className="currency-symbol">
                  {currency.symbol}
                </span>

                <span>
                  <strong>{currency.value}</strong>

                  <small>{t[currencyTranslationKeys[currency.value]] || currency.label}</small>
                </span>

                {secondaryCurrency ===
                  currency.value && (
                  <CheckCheck size={15} />
                )}
              </button>
            ))}
        </div>
      </div>
    )}
  </div>
</div>

        <div className="header-menu">
          <button
            className="icon-btn"
            onClick={() => setOpenMenu(openMenu === "alerts" ? null : "alerts")}
            aria-label={t.alerts || "Alerts"}
          >
            <Bell size={21} strokeWidth={1.9} />
            {alertCount > 0 && <span className="alert-count">{alertCount}</span>}
          </button>

          {openMenu === "alerts" && (
            <div className="dropdown alert-dropdown notification-dropdown">
              <div className="notification-dropdown-header">
  <div className="notification-dropdown-title">
    <strong>{t.notifications || "Notifications"}</strong>

    {alertCount > 0 && (
      <span>{alertCount}</span>
    )}
  </div>

  <div className="notification-header-actions">
    <button
      type="button"
      aria-label={t.markAllRead || "Mark all notifications as read"}
      title={t.markAllRead || "Mark all as read"}
      onClick={markAllNotificationsRead}
      disabled={visibleNotificationItems.length === 0 || alertCount === 0}
    >
      <CheckCheck size={14} />
    </button>

    <button
      type="button"
      className="notification-clear-btn"
      aria-label={t.clearNotifications || "Clear all notifications"}
      title={t.clearNotifications || "Clear notifications"}
      onClick={clearAllNotifications}
      disabled={visibleNotificationItems.length === 0}
    >
      <Trash2 size={14} />
    </button>
  </div>
</div>

              {visibleNotificationGroups.length > 0 ? (
                <>
                  <div className="notification-group-list">
                    {visibleNotificationGroups.map((group) => {
                      const Icon = group.icon;
                      return (
                        <div key={group.key} className="notification-group-row">
                          <Icon size={15} />
                          <span>
                            {group.title} ({group.unreadCount}/{group.count})
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="notification-item-list">
                    {visibleNotificationItems.slice(0, 8).map((item, index) => {
                      const Icon = item.icon;
                      const isRead = readNotificationIds.has(item.id);
                      return (
                        <div
  key={`${item.groupTitle}-${index}`}
  className={`notification-item${isRead ? " read" : ""}`}
>
  <span className="notification-icon">
    <Icon size={15} strokeWidth={1.9} />
  </span>

  <div className="notification-item-content">
    <strong>{item.title}</strong>
    <p>{item.description}</p>
    <small>{isRead ? (t.read || "Read") : (t.unread || "Unread")}</small>
  </div>

  <button
    type="button"
    className="notification-remove-btn"
    aria-label={`Remove ${item.title}`}
    title={t.removeNotification || "Remove notification"}
    onClick={() => removeNotification(item.id)}
  >
    <Trash2 size={13} />
  </button>
</div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="notification-empty">{t.noNotifications || "No notifications right now."}</div>
              )}
            </div>
          )}
        </div>

        <button
  type="button"
  className="icon-btn header-theme-btn"
  onClick={toggleDarkMode}
  aria-label={
    darkMode
      ? (t.switchLightMode || "Switch to light mode")
      : (t.switchDarkMode || "Switch to dark mode")
  }
  title={
    darkMode
      ? (t.lightMode || "Light mode")
      : (t.darkMode || "Dark mode")
  }
>
  {darkMode ? (
    <Sun size={21} strokeWidth={1.9} />
  ) : (
    <Moon size={21} strokeWidth={1.9} />
  )}
</button>

        <div className="header-menu profile-menu">
          <button
            className="profile-btn"
            onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
            aria-label={t.profile || "Profile"}
          >
          <User size={21} strokeWidth={1.9} />
          </button>

          {openMenu === "profile" && (
            <div className="dropdown profile-dropdown">
              <strong>
                {currentUser?.fullName || currentUser?.email || currentUser?.username}
              </strong>
              <p>{currentUser?.email || t.noEmailConfigured || "No email configured"}</p>

          <button className="dropdown-logout" onClick={onLogout}>
                <LogOut size={15} />
                {t.logout || "Logout"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showCashWallet && (
        <CashWalletModal
          closeCashWallet={closeCashWallet}
          currencyOptions={currencyOptions}
          handleWalletInputChange={handleWalletInputChange}
          saveCashWalletTransaction={saveCashWalletTransaction}
          setWalletType={setWalletType}
          walletForm={walletForm}
          walletType={walletType}
          t={t}
        />
      )}
    </>
  );
}

function CashWalletModal({
  closeCashWallet,
  currencyOptions,
  handleWalletInputChange,
  saveCashWalletTransaction,
  setWalletType,
  walletForm,
  walletType,
  t = {},
}) {
  return (
    <div className="cash-wallet-backdrop" onMouseDown={closeCashWallet}>
      <div className="cash-wallet-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="cash-wallet-header">
          <div className="cash-wallet-heading">
            <span className="cash-wallet-heading-icon">
              <WalletCards size={19} />
            </span>

            <div>
              <h3>{t.cashWallet || "Cash Wallet"}</h3>
              <p>{t.walletHint || "Track owner cash deposits and withdrawals."}</p>
            </div>
          </div>

          <button
            type="button"
            className="cash-wallet-close"
            onClick={closeCashWallet}
            aria-label={t.closeCashWallet || "Close cash wallet"}
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={saveCashWalletTransaction}>
          <div className="cash-wallet-tabs">
            <button
              type="button"
              className={walletType === "deposit" ? "active deposit" : ""}
              onClick={() => setWalletType("deposit")}
            >
              <ArrowDownCircle size={16} />
              {t.deposit || "Deposit"}
            </button>

            <button
              type="button"
              className={walletType === "withdraw" ? "active withdraw" : ""}
              onClick={() => setWalletType("withdraw")}
            >
              <ArrowUpCircle size={16} />
              {t.withdraw || "Withdraw"}
            </button>
          </div>

          <div className="cash-wallet-form-grid">
            <label>
              <span>{t.amountRequired || "Amount *"}</span>
              <input
                type="number"
                name="amount"
                min="0"
                step="0.01"
                value={walletForm.amount}
                onChange={handleWalletInputChange}
                placeholder="0.00"
                autoFocus
              />
            </label>

            <label>
              <span>{t.currency || "Currency"}</span>
              <select
                name="currency"
                value={walletForm.currency}
                onChange={handleWalletInputChange}
              >
                {currencyOptions.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.symbol} {currency.value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="cash-wallet-note">
            <span>{t.reasonNote || "Reason / Note"}</span>
            <textarea
              name="note"
              value={walletForm.note}
              onChange={handleWalletInputChange}
              placeholder={
                walletType === "deposit"
                  ? "e.g. Owner injection from personal funds"
                  : "e.g. Owner cash withdrawal"
              }
            />
          </label>

          <div className="cash-wallet-actions">
            <button type="button" className="cash-wallet-cancel" onClick={closeCashWallet}>
              {t.cancel || "Cancel"}
            </button>
            <button type="submit" className={`cash-wallet-save ${walletType}`}>
              {walletType === "deposit" ? (t.saveDeposit || "Save Deposit") : (t.saveWithdrawal || "Save Withdrawal")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Header({ currentUser, language = "en", onLanguageChange, onLogout, t = {} }) {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [query, setQuery] = useState("");
  const [openSearch, setOpenSearch] = useState(false);
  const [resultFilter, setResultFilter] = useState("All");

  const [assets] = useJsonCollection("assets");
  const [suppliers] = useJsonCollection("suppliers");
  const [supplierPurchases] = useJsonCollection("supplierPurchases");
  const [customers] = useJsonCollection("customers");
  const [towerAssets] = useJsonCollection("towerAssets");
  const [deviceTransfers] = useJsonCollection("deviceTransfers");
  const [assetMovements] = useJsonCollection("assetMovements");
  const [towerAssetTransfers] = useJsonCollection("towerAssetTransfers");
  const [deviceHistory] = useJsonCollection("deviceHistory");
  const [securityDeposits] = useJsonCollection("securityDeposits");
  const [customerDevices] = useJsonCollection("customerDevices");
  const [customerPayments] = useJsonCollection("customerPayments");
  const [transactions] = useJsonCollection("transactions");
  const [packages] = useJsonCollection("packages");
  const [customerPackages] = useJsonCollection("customerPackages");
  const [disconnections] = useJsonCollection("disconnections");

  useEffect(() => {
    const handleOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setOpenSearch(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const searchResults = useMemo(() => {
    const keyword = query.trim();
    if (keyword.length < 2) return [];

    const allResults = buildSystemSearchResults(
      {
        assets,
        customers,
        suppliers,
        supplierPurchases,
        towerAssets,
        deviceTransfers,
        assetMovements,
        towerAssetTransfers,
        deviceHistory,
        securityDeposits,
        customerDevices,
        customerPayments,
        transactions,
        packages,
        customerPackages,
        disconnections,
      },
      keyword,
      { limit: 18 }
    );
    const filteredResults =
      resultFilter === "All"
        ? allResults
        : allResults.filter((result) => result.type === resultFilter);

    return filteredResults.slice(0, 18);
  }, [
    assetMovements,
    assets,
    customerDevices,
    customerPackages,
    customerPayments,
    customers,
    deviceHistory,
    deviceTransfers,
    disconnections,
    packages,
    query,
    resultFilter,
    securityDeposits,
    supplierPurchases,
    suppliers,
    towerAssetTransfers,
    towerAssets,
    transactions,
  ]);

  const openResult = (path) => {
    setOpenSearch(false);
    setQuery("");
    navigate(path);
  };

  const openSearchResultsPage = () => {
    const keyword = query.trim();
    if (keyword.length < 2) return;
    setOpenSearch(false);
    navigate(`/search-results?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <header className="topbar">
      <div className="header-search global-search" ref={searchRef}>
        <button
          type="button"
          className="global-search-submit"
          onClick={openSearchResultsPage}
          aria-label="Open search results"
        >
          <Search size={17} />
        </button>
        <input
          placeholder={t.searchAnySystemData || "Search any system data..."}
          aria-label={t.search || "Search system"}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpenSearch(true);
          }}
          onFocus={() => setOpenSearch(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              openSearchResultsPage();
            }
          }}
        />

        {openSearch && query.trim().length >= 2 && (
          <div className="global-search-results">
            <div className="global-search-results-header">
              <strong>System Search</strong>
              <span>{searchResults.length} result(s)</span>
            </div>
            <button type="button" className="global-search-view-all" onClick={openSearchResultsPage}>
              Open full result page
            </button>

            <div className="global-search-filters">
              {[
                "All",
                "Asset",
                "Customer",
                "Tower",
                "Supplier",
                "Transfer",
                "Purchase",
                "Movement",
                "Deposit",
                "History",
                "Payment",
                "Transaction",
                "Package",
              ].map((filter) => (
                <button
                  type="button"
                  key={filter}
                  className={resultFilter === filter ? "active" : ""}
                  onClick={() => setResultFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            {searchResults.map((result) => (
              <button
                type="button"
                key={result.key}
                className="global-search-result"
                onClick={() => openResult(result.path)}
              >
                <span>{result.type}</span>
                <strong>{result.title}</strong>
                <em>{result.subtitle}</em>
                <div>
                  {result.details.slice(0, 6).map((detail) => (
                    <small key={detail}>{detail}</small>
                  ))}
                </div>
              </button>
            ))}

            {!searchResults.length && (
              <div className="global-search-empty">
                No exact result found. Try a partial MAC, serial number, asset ID, customer, tower, or supplier name.
              </div>
            )}
          </div>
        )}
      </div>

      <HeaderActions
        currentUser={currentUser}
        language={language}
        onLanguageChange={onLanguageChange}
        onLogout={onLogout}
        t={t}
      />
    </header>
  );
}

Header.Actions = HeaderActions;

export default Header;
