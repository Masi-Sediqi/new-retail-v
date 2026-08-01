import { useMemo, useState } from "react";
import { RotateCcw, Search, Trash2 } from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import "./RecycleBin.css";

const moduleOptions = [
  { value: "all", label: "All" },
  { value: "products", label: "Products" },
  { value: "suppliers", label: "Suppliers" },
  { value: "customers", label: "Customers" },
  { value: "expenses", label: "Expenses" },
  { value: "staffMembers", label: "Staff Members" },
  { value: "bundles", label: "Bundles" },
];

const collectionByModule = {
  bundles: "bundles",
  customers: "customers",
  expenses: "expenses",
  products: "products",
  staff: "staff",
  staffMembers: "staff",
  suppliers: "suppliers",
};

const moduleLabel = (module) =>
  moduleOptions.find((option) => option.value === module)?.label ||
  (module === "staff" ? "Staff Members" : module || "Unknown");

const getItemName = (item) =>
  item.name ||
  item.title ||
  item.data?.name ||
  item.data?.productName ||
  item.data?.customerName ||
  item.data?.supplierName ||
  item.data?.fullName ||
  item.data?.description ||
  item.item?.name ||
  item.item?.title ||
  "Deleted record";

const getDeletedDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const getDaysLeft = (item) => {
  if (Number.isFinite(Number(item.daysLeft))) return Number(item.daysLeft);
  const deletedAt = new Date(item.deletedAt || Date.now());
  const elapsed = Math.floor((Date.now() - deletedAt.getTime()) / 86400000);
  return Math.max(0, 30 - elapsed);
};

function RecycleBin() {
  const [deletedItems, setDeletedItems] = useJsonCollection("deletedItems");
  const [products, setProducts] = useJsonCollection("products");
  const [suppliers, setSuppliers] = useJsonCollection("suppliers");
  const [customers, setCustomers] = useJsonCollection("customers");
  const [expenses, setExpenses] = useJsonCollection("expenses");
  const [staff, setStaff] = useJsonCollection("staff");
  const [bundles, setBundles] = useJsonCollection("bundles");

  const collections = useMemo(
    () => ({
      bundles: [bundles, setBundles],
      customers: [customers, setCustomers],
      expenses: [expenses, setExpenses],
      products: [products, setProducts],
      staff: [staff, setStaff],
      staffMembers: [staff, setStaff],
      suppliers: [suppliers, setSuppliers],
    }),
    [bundles, customers, expenses, products, setBundles, setCustomers, setExpenses, setProducts, setStaff, setSuppliers, staff, suppliers]
  );

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const normalizedItems = useMemo(
    () =>
      deletedItems.map((item, index) => ({
        ...item,
        recycleId: item.recycleId || item.id || `deleted-${index}`,
        module: item.module || item.collection || "unknown",
        name: getItemName(item),
        daysLeft: getDaysLeft(item),
      })),
    [deletedItems]
  );

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return normalizedItems.filter((item) => {
      const matchesModule = filter === "all" || item.module === filter;
      const matchesSearch =
        !keyword ||
        [item.name, item.module, item.deletedBy, item.reason]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      return matchesModule && matchesSearch;
    });
  }, [filter, normalizedItems, search]);

  const removeFromBin = async (recycleId) => {
    const saved = await setDeletedItems((current) =>
      current.filter((item) => String(item.recycleId || item.id) !== String(recycleId))
    );
    return saved;
  };

  const restoreItem = async (item) => {
    const collectionName = collectionByModule[item.module];
    const target = collections[item.module] || collections[collectionName];

    if (!target) {
      notify("This module cannot be restored yet.", "error");
      return;
    }

    const [records, setRecords] = target;
    const restoredRecord = item.data || item.item || item.record || null;

    if (!restoredRecord || typeof restoredRecord !== "object") {
      notify("This deleted item does not contain restorable data.", "error");
      return;
    }

    const recordId = restoredRecord.id || restoredRecord.productId || restoredRecord.customerId || restoredRecord.supplierId;
    const nextRecord = {
      ...restoredRecord,
      restoredAt: new Date().toISOString(),
    };
    const withoutDuplicate = recordId
      ? records.filter((record) => String(record.id || record.productId || record.customerId || record.supplierId) !== String(recordId))
      : records;
    const restored = await setRecords([nextRecord, ...withoutDuplicate]);
    if (!restored) return;

    const removed = await removeFromBin(item.recycleId);
    if (!removed) return;

    notify("Record restored successfully.");
  };

  const permanentDelete = async (recycleId) => {
    const ok = await confirmAction({
      title: "Delete Forever",
      message: "This record will be permanently removed from the recycle bin. Continue?",
      confirmText: "Delete Forever",
    });
    if (!ok) return;

    const saved = await removeFromBin(recycleId);
    if (!saved) return;
    notify("Record permanently deleted.");
  };

  const emptyBin = async () => {
    const ok = await confirmAction({
      title: "Empty Recycle Bin",
      message: "All deleted records will be permanently removed. Continue?",
      confirmText: "Empty Bin",
    });
    if (!ok) return;

    const saved = await setDeletedItems([]);
    if (!saved) return;
    notify("Recycle bin emptied successfully.");
  };

  return (
    <div className="recycle-page">
      <div className="recycle-header">
        <div>
          <h1>Recycle Bin</h1>
          <p>Restore deleted records or permanently remove them from the system.</p>
        </div>
        <button className="empty-bin-btn" type="button" disabled={deletedItems.length === 0} onClick={emptyBin}>
          <Trash2 size={16} />
          Empty Bin
        </button>
      </div>

      <div className="recycle-toolbar">
        <CustomSelect ariaLabel="Filter deleted records" options={moduleOptions} value={filter} onChange={setFilter} />
        <label className="recycle-search">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search deleted records..." />
        </label>
        <span>{filteredItems.length} records</span>
      </div>

      <section className="recycle-table-card">
        <div className="recycle-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Module</th>
                <th>Deleted</th>
                <th>Days Left</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="recycle-empty">Recycle bin is empty.</td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.recycleId}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.reason && <small>{item.reason}</small>}
                    </td>
                    <td><span className="recycle-module-pill">{moduleLabel(item.module)}</span></td>
                    <td>{getDeletedDate(item.deletedAt)}</td>
                    <td>{item.daysLeft}</td>
                    <td>
                      <div className="recycle-actions">
                        <button type="button" onClick={() => restoreItem(item)}>
                          <RotateCcw size={14} />
                          Restore
                        </button>
                        <button className="danger" type="button" onClick={() => permanentDelete(item.recycleId)}>
                          <Trash2 size={14} />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default RecycleBin;
