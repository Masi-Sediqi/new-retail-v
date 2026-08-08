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

  if (!Number.isFinite(rate) || rate <= 0) return 0;

  const likelyAfghanMajorCurrency =
    baseCurrency === "AFN" &&
    ["USD", "EUR", "GBP", "SAR", "AED", "CNY"].includes(code);

  // Older records could store the reciprocal value, for example USD = 0.02
  // instead of USD = 50 AFN. Normalize only the major currencies that should
  // be greater than AFN so existing dashboard totals remain correct.
  if (likelyAfghanMajorCurrency && rate > 0 && rate < 1) {
    return 1 / rate;
  }

  return rate;
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

  const fromRate = getExchangeRate(
    fromCurrency,
    baseCurrency,
    exchangeRates
  );

  const targetRate = getExchangeRate(
    targetCurrency,
    baseCurrency,
    exchangeRates
  );

  if (!fromRate || !targetRate) return null;

  const majorCurrencies = ["USD", "EUR", "GBP", "SAR", "AED", "CNY"];
  const weakCurrencies = ["AFN", "PKR", "IRR", "INR"];
  const baseIsMajor = majorCurrencies.includes(baseCurrency);
  const fromIsBase = fromCurrency === baseCurrency;
  const targetIsBase = targetCurrency === baseCurrency;

  // If the system base is a major currency and the user enters rates such as
  // AFN = 60, they usually mean 1 base currency = 60 AFN. In that common
  // shop workflow, converting USD -> AFN must multiply, not divide.
  if (baseIsMajor && weakCurrencies.includes(targetCurrency) && fromIsBase && targetRate > 1) {
    return Number(value || 0) * targetRate;
  }

  if (baseIsMajor && weakCurrencies.includes(fromCurrency) && targetIsBase && fromRate > 1) {
    return Number(value || 0) / fromRate;
  }

  return (Number(value || 0) * fromRate) / targetRate;
};

export const formatCurrencyAmount = (
  value,
  currency = "AFN"
) => {
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
    targetCurrency === "original" ||
      targetCurrency === "all"
      ? fromCurrency
      : targetCurrency
  );
};

export const getBusinessCurrencyView = () =>
  typeof window === "undefined"
    ? null
    : window.__retailCurrencyView;

export const applyBusinessCurrencyExchange = (
  value,
  currency = "AFN",
  view = getBusinessCurrencyView()
) => {
  const fromCurrency = view?.exchangeFromCurrency;
  const targetCurrency = view?.exchangeToCurrency;

  if (
    !fromCurrency ||
    fromCurrency === "original" ||
    !targetCurrency ||
    currency !== fromCurrency ||
    fromCurrency === targetCurrency
  ) {
    return {
      value: Number(value || 0),
      currency,
      converted: false,
    };
  }

  const converted = convertCurrencyAmount(value, {
    baseCurrency: view.baseCurrency,
    exchangeRates: view.exchangeRates,
    fromCurrency,
    targetCurrency,
  });

  if (converted === null) {
    return {
      value: Number(value || 0),
      currency,
      converted: false,
      missingRate: true,
    };
  }

  return {
    value: converted,
    currency: targetCurrency,
    converted: true,
  };
};

export const formatBusinessCurrencyAmount = (
  value,
  currency = "AFN"
) => {
  const result = applyBusinessCurrencyExchange(
    value,
    currency
  );

  return formatCurrencyAmount(
    result.value,
    result.currency
  );
};

export const rebaseExchangeRates = (
  oldBase,
  newBase,
  exchangeRates = {}
) => {
  if (!newBase || oldBase === newBase) {
    return {
      ...exchangeRates,
      [newBase]: 1,
    };
  }

  const newBaseRate = getExchangeRate(
    newBase,
    oldBase,
    exchangeRates
  );

  if (!newBaseRate) return null;

  return Object.fromEntries(
    currencies.map(({ code }) => {
      if (code === newBase) {
        return [code, 1];
      }

      const oldRate = getExchangeRate(
        code,
        oldBase,
        exchangeRates
      );

      return [
        code,
        oldRate ? oldRate / newBaseRate : "",
      ];
    })
  );
};
