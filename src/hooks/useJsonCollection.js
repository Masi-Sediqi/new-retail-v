import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { notify } from "../utils/notify";
import { apiUrl } from "../utils/api";

const stableStringify = (value) => JSON.stringify(value ?? null);

const sameCollectionData = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  stableStringify(left) === stableStringify(right);

export function useJsonCollection(name) {
  const [items, setItemsState] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef([]);

  const load = useCallback(async () => {
    try {
      const response = await axios.get(apiUrl(name));
      const data = Array.isArray(response.data) ? response.data : [];

      itemsRef.current = data;
      setItemsState(data);
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
    const syncCollection = (event) => {
      if (event?.detail?.name !== name || !Array.isArray(event.detail.items)) return;
      itemsRef.current = event.detail.items;
      setItemsState(event.detail.items);
      setLoaded(true);
    };
    window.addEventListener("json-collection-updated", syncCollection);
    return () => window.removeEventListener("json-collection-updated", syncCollection);
  }, [name]);

  const setItems = useCallback(
    async (nextValue) => {
      const previousItems = itemsRef.current;

      const visibleNextItems =
        typeof nextValue === "function" ? nextValue(previousItems) : nextValue;

      if (!Array.isArray(visibleNextItems)) {
        notify(`Invalid data format for ${name}.`, "error");
        return false;
      }

      const nextItems = visibleNextItems;

      itemsRef.current = nextItems;
      setItemsState(nextItems);
      window.dispatchEvent(new CustomEvent("json-collection-updated", { detail: { name, items: nextItems } }));

      try {
        await axios.put(apiUrl(name), nextItems);
        const verifyResponse = await axios.get(apiUrl(name));
        const savedData = Array.isArray(verifyResponse.data)
          ? verifyResponse.data
          : [];

        if (!sameCollectionData(savedData, nextItems)) {
          throw new Error(`Server did not persist ${name}.`);
        }

        itemsRef.current = savedData;
        setItemsState(savedData);
        window.dispatchEvent(new CustomEvent("json-collection-updated", { detail: { name, items: savedData } }));

        return true;
      } catch (error) {
        console.error(`Unable to save ${name}:`, error);

        itemsRef.current = previousItems;
        setItemsState(previousItems);
        window.dispatchEvent(new CustomEvent("json-collection-updated", { detail: { name, items: previousItems } }));

        notify(`Unable to save ${name}. Please check the server.`, "error");
        return false;
      }
    },
    [name]
  );

  return [items, setItems, load, loaded];
}
