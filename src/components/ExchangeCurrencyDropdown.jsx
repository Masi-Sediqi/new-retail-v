import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCheck,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  convertCurrencyAmount,
  currencies,
  getCurrencyMeta,
} from "../utils/currencyExchange";

const PRIMARY_CURRENCY_STORAGE_KEY =
  "isp-primary-currency";

const EXCHANGE_FROM_CURRENCY_STORAGE_KEY =
  "isp-exchange-from-currency";

const EXCHANGE_TO_CURRENCY_STORAGE_KEY =
  "isp-exchange-to-currency";

const SECONDARY_CURRENCY_STORAGE_KEY =
  "isp-secondary-currency";

const currencyOptions = currencies.map((currency) => ({
  value: currency.code,
  label: currency.name,
  symbol: currency.symbol,
}));

function ExchangeCurrencyDropdown({
  settings = [],
  t = {},
}) {
  const wrapperRef = useRef(null);

  const company = settings?.[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";
  const exchangeRates = company.exchangeRates || {};

  const [isOpen, setIsOpen] = useState(false);

  const [exchangeFromCurrency, setExchangeFromCurrency] =
    useState(
      () =>
        localStorage.getItem(
          EXCHANGE_FROM_CURRENCY_STORAGE_KEY
        ) || "AFN"
    );

  const [exchangeToCurrency, setExchangeToCurrency] =
    useState(
      () =>
        localStorage.getItem(
          EXCHANGE_TO_CURRENCY_STORAGE_KEY
        ) || "USD"
    );

  useEffect(() => {
    const closeOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const closeWithEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      closeOutside
    );

    document.addEventListener(
      "keydown",
      closeWithEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeOutside
      );

      document.removeEventListener(
        "keydown",
        closeWithEscape
      );
    };
  }, []);

  const fromMeta = useMemo(
    () => getCurrencyMeta(exchangeFromCurrency),
    [exchangeFromCurrency]
  );

  const toMeta = useMemo(
    () => getCurrencyMeta(exchangeToCurrency),
    [exchangeToCurrency]
  );

  const selectedExchangeRate = useMemo(() => {
    if (
      !exchangeFromCurrency ||
      !exchangeToCurrency ||
      exchangeFromCurrency === exchangeToCurrency
    ) {
      return null;
    }

    return convertCurrencyAmount(1, {
      baseCurrency,
      exchangeRates,
      fromCurrency: exchangeFromCurrency,
      targetCurrency: exchangeToCurrency,
    });
  }, [
    baseCurrency,
    exchangeRates,
    exchangeFromCurrency,
    exchangeToCurrency,
  ]);

  const currenciesAreEqual =
    exchangeFromCurrency === exchangeToCurrency;

  const rateIsAvailable =
    !currenciesAreEqual &&
    selectedExchangeRate !== null &&
    Number.isFinite(Number(selectedExchangeRate));

  const dispatchCurrencyChange = ({
    fromCurrency,
    toCurrency,
  }) => {
    const primaryCurrency =
      localStorage.getItem(
        PRIMARY_CURRENCY_STORAGE_KEY
      ) || "all";

    const detail = {
      primaryCurrency,
      exchangeFromCurrency: fromCurrency,
      exchangeToCurrency: toCurrency,
      secondaryCurrency: toCurrency,
    };

    window.__retailCurrencyView = {
      ...(window.__retailCurrencyView || {}),
      primaryCurrency,
      exchangeFromCurrency: fromCurrency,
      exchangeToCurrency: toCurrency,
      secondaryCurrency: toCurrency,
      displayCurrency: toCurrency,
      baseCurrency,
      exchangeRates,
    };

    window.dispatchEvent(
      new CustomEvent("app-currency-changed", {
        detail,
      })
    );
  };

  const saveExchangeSelection = (
    fromCurrency,
    toCurrency
  ) => {
    localStorage.setItem(
      EXCHANGE_FROM_CURRENCY_STORAGE_KEY,
      fromCurrency
    );

    localStorage.setItem(
      EXCHANGE_TO_CURRENCY_STORAGE_KEY,
      toCurrency
    );

    localStorage.setItem(
      SECONDARY_CURRENCY_STORAGE_KEY,
      toCurrency
    );

    dispatchCurrencyChange({
      fromCurrency,
      toCurrency,
    });
  };

  const handleFromChange = (event) => {
    const nextFrom = event.target.value;
    let nextTo = exchangeToCurrency;

    if (nextFrom === nextTo) {
      nextTo =
        currencyOptions.find(
          (currency) =>
            currency.value !== nextFrom
        )?.value || baseCurrency;
    }

    setExchangeFromCurrency(nextFrom);
    setExchangeToCurrency(nextTo);

    saveExchangeSelection(nextFrom, nextTo);
  };

  const handleToChange = (event) => {
    const nextTo = event.target.value;

    if (nextTo === exchangeFromCurrency) {
      return;
    }

    setExchangeToCurrency(nextTo);

    saveExchangeSelection(
      exchangeFromCurrency,
      nextTo
    );
  };

  const swapCurrencies = () => {
    const nextFrom = exchangeToCurrency;
    const nextTo = exchangeFromCurrency;

    setExchangeFromCurrency(nextFrom);
    setExchangeToCurrency(nextTo);

    saveExchangeSelection(nextFrom, nextTo);
  };

  const clearConversion = () => {
    const nextFrom = baseCurrency;

    const nextTo =
      currencyOptions.find(
        (currency) =>
          currency.value !== nextFrom
      )?.value || "USD";

    setExchangeFromCurrency(nextFrom);
    setExchangeToCurrency(nextTo);

    localStorage.removeItem(
      EXCHANGE_FROM_CURRENCY_STORAGE_KEY
    );

    localStorage.removeItem(
      EXCHANGE_TO_CURRENCY_STORAGE_KEY
    );

    localStorage.setItem(
      SECONDARY_CURRENCY_STORAGE_KEY,
      "original"
    );

    const primaryCurrency =
      localStorage.getItem(
        PRIMARY_CURRENCY_STORAGE_KEY
      ) || "all";

    window.__retailCurrencyView = {
      ...(window.__retailCurrencyView || {}),
      primaryCurrency,
      exchangeFromCurrency: "original",
      exchangeToCurrency: nextTo,
      secondaryCurrency: "original",
      displayCurrency: "original",
      baseCurrency,
      exchangeRates,
    };

    window.dispatchEvent(
      new CustomEvent("app-currency-changed", {
        detail: {
          primaryCurrency,
          exchangeFromCurrency: "original",
          exchangeToCurrency: nextTo,
          secondaryCurrency: "original",
        },
      })
    );

    setIsOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className="header-menu header-preference-menu exchange-dropdown-wrapper"
    >
      <button
        type="button"
        className={`header-preference-btn header-icon-only-btn ${
          isOpen ? "active" : ""
        }`}
        aria-label={
          t.exchangeCurrency ||
          "Exchange Currency"
        }
        title={`${exchangeFromCurrency} → ${exchangeToCurrency}`}
        aria-expanded={isOpen}
        onClick={() =>
          setIsOpen((current) => !current)
        }
      >
        <ArrowLeftRight
          size={19}
          strokeWidth={1.9}
        />
      </button>

      {isOpen && (
        <div className="dropdown header-preference-dropdown currency-dropdown exchange-small-dropdown">
          <div className="header-preference-dropdown-title">
            <strong>
              {t.exchangeCurrency ||
                "Exchange Currency"}
            </strong>

            <span>
              {t.exchangeCurrencyHint ||
                "Choose currencies for conversion"}
            </span>
          </div>

          <div className="exchange-dropdown-body">
            <label className="exchange-select-field">
              <span className="exchange-select-label">
                From
              </span>

              <div className="exchange-native-select">
                <span className="exchange-select-symbol">
                  {fromMeta.symbol}
                </span>

                <select
                  value={exchangeFromCurrency}
                  onChange={handleFromChange}
                >
                  {currencyOptions.map(
                    (currency) => (
                      <option
                        key={currency.value}
                        value={currency.value}
                      >
                        {currency.value} —{" "}
                        {currency.label}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  className="exchange-select-chevron"
                  size={15}
                />
              </div>
            </label>

            <button
              type="button"
              className="exchange-swap-button"
              onClick={swapCurrencies}
              aria-label="Swap currencies"
              title="Swap currencies"
            >
              <ArrowLeftRight
                size={16}
                strokeWidth={2}
              />
            </button>

            <label className="exchange-select-field">
              <span className="exchange-select-label">
                To
              </span>

              <div className="exchange-native-select">
                <span className="exchange-select-symbol">
                  {toMeta.symbol}
                </span>

                <select
                  value={exchangeToCurrency}
                  onChange={handleToChange}
                >
                  {currencyOptions.map(
                    (currency) => (
                      <option
                        key={currency.value}
                        value={currency.value}
                        disabled={
                          currency.value ===
                          exchangeFromCurrency
                        }
                      >
                        {currency.value} —{" "}
                        {currency.label}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  className="exchange-select-chevron"
                  size={15}
                />
              </div>
            </label>

            {currenciesAreEqual ? (
              <div className="exchange-status-alert warning">
                <AlertTriangle size={16} />

                <div>
                  <strong>
                    Select different currencies
                  </strong>

                  <span>
                    From and To currencies cannot
                    be the same.
                  </span>
                </div>
              </div>
            ) : rateIsAvailable ? (
              <div className="exchange-status-alert success">
                <CheckCheck size={16} />

                <div>
                  <strong>
                    Exchange rate configured
                  </strong>

                  <span>
                    1 {exchangeFromCurrency} ={" "}
                    {Number(
                      selectedExchangeRate
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}{" "}
                    {exchangeToCurrency}
                  </span>
                </div>
              </div>
            ) : (
              <div className="exchange-status-alert danger">
                <AlertTriangle size={16} />

                <div>
                  <strong>
                    Exchange rate not configured
                  </strong>

                  <span>
                    Define the rate for{" "}
                    {exchangeFromCurrency} and{" "}
                    {exchangeToCurrency} in
                    Settings.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="exchange-dropdown-footer">
            <button
              type="button"
              className="exchange-reset-button"
              onClick={clearConversion}
            >
              <RotateCcw
                size={14}
                strokeWidth={2}
              />

              <span>Clear conversion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExchangeCurrencyDropdown;