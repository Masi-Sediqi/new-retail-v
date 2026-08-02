import { useEffect, useState } from "react";

const STORAGE_KEY = "isp-primary-currency";

export const useBusinessCurrencyFilter = () => {
  const [currencyFilter, setCurrencyFilter] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "all"
  );

  useEffect(() => {
    const update = (event) => {
      setCurrencyFilter(
        event?.detail?.primaryCurrency ||
          localStorage.getItem(STORAGE_KEY) ||
          "all"
      );
    };

    window.addEventListener("app-currency-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("app-currency-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return currencyFilter;
};

export const currencyMatchesFilter = (recordCurrency, filterCurrency) =>
  !filterCurrency ||
  filterCurrency === "all" ||
  String(recordCurrency || "AFN").toUpperCase() ===
    String(filterCurrency).toUpperCase();
