import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { notify } from "../utils/notify";
import { apiUrl } from "../utils/api";

const PRIMARY_CURRENCY_STORAGE_KEY = "isp-primary-currency";
const currencyFilteredCollections = new Set([
  "products",
  "billingInvoices",
  "expenses",
  "godownEntries",
  "supplierPurchases",
  "supplierPayments",
  "suppliers",
  "loans",
  "staffMembers",
]);

const getPrimaryCurrency = () => localStorage.getItem(PRIMARY_CURRENCY_STORAGE_KEY) || "AFN";

const recordCurrency = (item) => item?.currency || item?.currencyCode || item?.baseCurrency || "";

const filterByPrimaryCurrency = (name, items, primaryCurrency) => {
  if (!currencyFilteredCollections.has(name) || !primaryCurrency) return items;
  return items.filter((item) => {
    const currency = recordCurrency(item);
    return !currency || currency === primaryCurrency;
  });
};

export function useJsonCollection(name) {
  const [items, setItemsState] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef([]);
  const [primaryCurrency, setPrimaryCurrency] = useState(getPrimaryCurrency);

  const load = useCallback(async () => {
    try {
      const response = await axios.get(apiUrl(name));
      const data = Array.isArray(response.data) ? response.data : [];

      itemsRef.current = data;
      setItemsState(filterByPrimaryCurrency(name, data, getPrimaryCurrency()));
      setLoaded(true);

      return data;
    } catch (error) {
      console.error(`Unable to load ${name}:`, error);
      itemsRef.current = [];
      setItemsState([]);
      setLoaded(true);
      notify(`Unable to load ${name}. Please check the server.`, "error");
      return [];
    }
  }, [name]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const updateCurrencyFilter = (event) => {
      const nextCurrency = event?.detail?.primaryCurrency || getPrimaryCurrency();
      setPrimaryCurrency(nextCurrency);
      setItemsState(filterByPrimaryCurrency(name, itemsRef.current, nextCurrency));
    };
    window.addEventListener("app-currency-changed", updateCurrencyFilter);
    return () => window.removeEventListener("app-currency-changed", updateCurrencyFilter);
  }, [name]);

  useEffect(() => {
    const syncCollection = (event) => {
      if (event?.detail?.name !== name || !Array.isArray(event.detail.items)) return;
      itemsRef.current = event.detail.items;
      setItemsState(filterByPrimaryCurrency(name, event.detail.items, getPrimaryCurrency()));
      setLoaded(true);
    };
    window.addEventListener("json-collection-updated", syncCollection);
    return () => window.removeEventListener("json-collection-updated", syncCollection);
  }, [name]);

  const setItems = useCallback(
    async (nextValue) => {
      const previousItems = itemsRef.current;
      const visiblePreviousItems = filterByPrimaryCurrency(name, previousItems, primaryCurrency);

      const visibleNextItems =
        typeof nextValue === "function" ? nextValue(visiblePreviousItems) : nextValue;

      if (!Array.isArray(visibleNextItems)) {
        notify(`Invalid data format for ${name}.`, "error");
        return false;
      }

      const hiddenItems = currencyFilteredCollections.has(name)
        ? previousItems.filter((item) => {
            const currency = recordCurrency(item);
            return currency && currency !== primaryCurrency;
          })
        : [];
      const nextItems = currencyFilteredCollections.has(name)
        ? [...visibleNextItems, ...hiddenItems]
        : visibleNextItems;

      itemsRef.current = nextItems;
      setItemsState(filterByPrimaryCurrency(name, nextItems, primaryCurrency));
      window.dispatchEvent(new CustomEvent("json-collection-updated", { detail: { name, items: nextItems } }));

      try {
        const response = await axios.put(apiUrl(name), nextItems);
        const savedData = Array.isArray(response.data) ? response.data : nextItems;

        itemsRef.current = savedData;
        setItemsState(filterByPrimaryCurrency(name, savedData, primaryCurrency));
        window.dispatchEvent(new CustomEvent("json-collection-updated", { detail: { name, items: savedData } }));

        return true;
      } catch (error) {
        console.error(`Unable to save ${name}:`, error);

        itemsRef.current = previousItems;
        setItemsState(filterByPrimaryCurrency(name, previousItems, primaryCurrency));
        window.dispatchEvent(new CustomEvent("json-collection-updated", { detail: { name, items: previousItems } }));

        notify(`Unable to save ${name}. Please check the server.`, "error");
        return false;
      }
    },
    [name, primaryCurrency]
  );

  return [items, setItems, load, loaded];
}
