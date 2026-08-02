import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { notify } from "../utils/notify";
import { apiUrl } from "../utils/api";
import { createRecycleEntry } from "../utils/recycleBin";

const stableStringify = (value) => JSON.stringify(value ?? null);
const recycleExcludedCollections = new Set(["deletedItems"]);

const recordKey = (record) => {
  const id =
    record?.id ??
    record?.productId ??
    record?.customerId ??
    record?.supplierId ??
    record?.staffId ??
    record?.invoiceNumber ??
    record?.billNumber ??
    record?.code;
  return id == null ? stableStringify(record) : String(id);
};

const sameCollectionData = (left, right) =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  stableStringify(left) === stableStringify(right);

const findRemovedItems = (previousItems, nextItems) => {
  const nextKeys = new Set(nextItems.map(recordKey));
  return previousItems.filter((item) => !nextKeys.has(recordKey(item)));
};

const archiveRemovedItems = async (name, removedItems) => {
  if (!removedItems.length || recycleExcludedCollections.has(name)) return true;

  try {
    const response = await axios.get(apiUrl("deletedItems"));
    const currentDeleted = Array.isArray(response.data) ? response.data : [];
    const existing = new Set(
      currentDeleted.map((item) => `${item.module || ""}:${recordKey(item.data || item)}`)
    );
    const entries = removedItems
      .filter((item) => !existing.has(`${name}:${recordKey(item)}`))
      .map((item) => createRecycleEntry(name, item));

    if (!entries.length) return true;

    const nextDeleted = [...entries, ...currentDeleted];
    await axios.put(apiUrl("deletedItems"), nextDeleted);
    window.dispatchEvent(new CustomEvent("json-collection-updated", {
      detail: { name: "deletedItems", items: nextDeleted },
    }));
    return true;
  } catch (error) {
    console.error(`Unable to move deleted ${name} record(s) to Recycle Bin:`, error);
    notify(`Unable to move deleted ${name} record(s) to Recycle Bin.`, "error");
    return false;
  }
};

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
      const removedItems = findRemovedItems(previousItems, nextItems);
      const archived = await archiveRemovedItems(name, removedItems);
      if (!archived) return false;

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
