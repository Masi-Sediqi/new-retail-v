const getRecordId = (record) =>
  record?.id || record?.productId || record?.customerId || record?.supplierId || record?.staffId;

const readableName = (record) =>
  record?.name ||
  record?.productName ||
  record?.customerName ||
  record?.supplierName ||
  record?.fullName ||
  record?.description ||
  record?.title ||
  "Deleted record";

export const createRecycleEntry = (module, record, fallbackName = "") => {
  const id = getRecordId(record);
  const recycleId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? `deleted-${crypto.randomUUID()}`
      : `deleted-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    recycleId,
    id,
    module,
    name: fallbackName || readableName(record),
    data: record,
    deletedAt: new Date().toISOString(),
    daysLeft: 30,
  };
};
