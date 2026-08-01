export const currencies = [
  { code: "AFN", symbol: "؋", name: "Afghan Afghani" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "SAR", symbol: "ر.س", name: "Saudi Riyal" },
  { code: "PKR", symbol: "Rs", name: "Pakistani Rupee" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "IRR", symbol: "ریال", name: "Iranian Rial" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
];

export const getCurrencyMeta = (code) =>
  currencies.find((currency) => currency.code === code) || {
    code,
    name: code,
    symbol: code,
  };

export const getExchangeRate = (
  code,
  baseCurrency = "AFN",
  exchangeRates = {}
) => {
  if (!code || code === baseCurrency) return 1;
  const rawRate = exchangeRates?.[code];
  const rate = Number.parseFloat(rawRate);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
};

export const hasExchangeRate = (
  code,
  baseCurrency = "AFN",
  exchangeRates = {}
) =>
  !code ||
  code === "all" ||
  code === "original" ||
  getExchangeRate(code, baseCurrency, exchangeRates) > 0;

export const convertCurrencyAmount = (
  value,
  {
    baseCurrency = "AFN",
    exchangeRates = {},
    fromCurrency = baseCurrency,
    targetCurrency = baseCurrency,
  } = {}
) => {
  if (
    !targetCurrency ||
    targetCurrency === "all" ||
    targetCurrency === "original" ||
    targetCurrency === fromCurrency
  ) {
    return Number(value || 0);
  }

  const fromRate = getExchangeRate(fromCurrency, baseCurrency, exchangeRates);
  const targetRate = getExchangeRate(targetCurrency, baseCurrency, exchangeRates);

  if (!fromRate || !targetRate) return null;
  return (Number(value || 0) * fromRate) / targetRate;
};

export const formatCurrencyAmount = (value, currency = "AFN") => {
  const meta = getCurrencyMeta(currency);
  return `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} ${meta.symbol}`;
};

export const convertAndFormatCurrency = (
  value,
  {
    baseCurrency = "AFN",
    exchangeRates = {},
    fromCurrency = baseCurrency,
    targetCurrency = baseCurrency,
  } = {}
) => {
  const converted = convertCurrencyAmount(value, {
    baseCurrency,
    exchangeRates,
    fromCurrency,
    targetCurrency,
  });

  return formatCurrencyAmount(
    converted || 0,
    targetCurrency === "original" || targetCurrency === "all"
      ? fromCurrency
      : targetCurrency
  );
};

export const getBusinessCurrencyView = () =>
  typeof window === "undefined" ? null : window.__retailCurrencyView;

export const formatBusinessCurrencyAmount = (value, currency = "AFN") => {
  const view = getBusinessCurrencyView();
  if (!view?.displayCurrency || view.displayCurrency === currency) {
    return formatCurrencyAmount(value, currency);
  }
  const converted = convertCurrencyAmount(value, {
    baseCurrency: view.baseCurrency,
    exchangeRates: view.exchangeRates,
    fromCurrency: currency,
    targetCurrency: view.displayCurrency,
  });
  return converted === null
    ? formatCurrencyAmount(value, currency)
    : formatCurrencyAmount(converted, view.displayCurrency);
};

export const rebaseExchangeRates = (oldBase, newBase, exchangeRates = {}) => {
  if (!newBase || oldBase === newBase) return { ...exchangeRates, [newBase]: 1 };
  const newBaseRate = getExchangeRate(newBase, oldBase, exchangeRates);
  if (!newBaseRate) return null;
  return Object.fromEntries(currencies.map(({ code }) => {
    if (code === newBase) return [code, 1];
    const oldRate = getExchangeRate(code, oldBase, exchangeRates);
    return [code, oldRate ? oldRate / newBaseRate : ""];
  }));
};
