import { useEffect, useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { formatDateTime, todayDateValue } from "../utils/afghanDate";
import "./DeviceTransferManagement.css";
import {
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";

const TRANSFER_TYPES = [
  "Main Stock -> Tower",
  "Main Stock -> Customer",
  "Tower -> Tower",
  "Tower -> Customer",
  "Tower -> Main Stock",
  "Customer -> Customer",
  "Customer -> Main Stock",
  "Customer -> Tower",
  "Tower -> Repair",
  "Main Stock -> Repair",
  "Main Stock -> Waste",
  "Tower -> Waste",
  "Customer -> Waste",
];

const SOURCE_DESTINATION = {
  "Main Stock -> Tower": ["Main Stock", "Tower"],
  "Main Stock -> Customer": ["Main Stock", "Customer"],
  "Tower -> Tower": ["Tower", "Tower"],
  "Tower -> Customer": ["Tower", "Customer"],
  "Tower -> Main Stock": ["Tower", "Main Stock"],
  "Customer -> Customer": ["Customer", "Customer"],
  "Customer -> Main Stock": ["Customer", "Main Stock"],
  "Customer -> Tower": ["Customer", "Tower"],
  "Tower -> Repair": ["Tower", "Repair"],
  "Main Stock -> Repair": ["Main Stock", "Repair"],
  "Main Stock -> Waste": ["Main Stock", "Waste"],
  "Tower -> Waste": ["Tower", "Waste"],
  "Customer -> Waste": ["Customer", "Waste"],
};

const emptyForm = {
  transferType: "Main Stock -> Tower",
  sourceLocationId: "",
  destinationLocationId: "",
  transferDate: todayDateValue(),
  responsibleUser: "",
  receivedBy: "",
  reason: "",
  note: "",
  approvalStatus: "Approved",
  customerDeal: "Leased / Deposit",
  saleAmount: "",
  paidAmount: "",
  depositCurrency: "AFN",
  depositAmount: "",
  depositReceivedAmount: "",
  depositReceivedDate: todayDateValue(),
  depositPaymentMethod: "Cash",
  depositReceiptNumber: "",
  depositReceivedBy: "",
  depositStatus: "Not Received",
  refundAmount: "",
  refundCurrency: "AFN",
  refundDate: todayDateValue(),
  refundPaymentMethod: "Cash",
  refundReference: "",
  refundedBy: "",
  refundReason: "",
  deductionAmount: "",
};

const emptyRecordFilters = {
  sourceType: "All",
  sourceId: "",
  destinationType: "All",
  destinationId: "",
  recordType: "All",
  dateFrom: "",
  dateTo: "",
};

const DEPOSIT_STATUSES = [
  "Not Received",
  "Partially Received",
  "Full Received",
  "Held",
  "Partially Refunded",
  "Fully Refunded",
  "Deducted",
  "Forfeited",
  "Outstanding",
  "Adjusted Against Damage",
];

const RECOVERY_STATUSES = [
  "Pending Collection",
  "Partially Collected",
  "Fully Collected",
  "Customer Unreachable",
  "Device Lost",
  "Device Damaged",
  "Legal Follow-up",
  "Deposit Adjusted",
];

const money = (value) => Number(value || 0).toLocaleString("en-US");
const keyOf = (value) => String(value || "");
const itemLabel = (id, name) => [id, name].filter(Boolean).join(" - ") || "-";

const normalizeTransferType = (value) => String(value || "").replace(/â†’|→/g, "->");

const isIndividualAsset = (asset) =>
  String(asset?.identityTracking || "").toLowerCase().includes("individual");

const getAssetUnit = (asset) =>
  asset?.purchaseUsageUnit || asset?.purchaseUnit || asset?.usageUnit || "Piece";

const isTerminalStatus = (status) =>
  ["lost", "damaged", "disposed", "waste", "wasted"].includes(String(status || "").toLowerCase());

const getNewStatus = (destinationType) => {
  if (destinationType === "Main Stock") return "In Stock";
  if (destinationType === "Repair") return "Under Repair";
  if (destinationType === "Waste") return "Waste";
  if (destinationType === "Damaged") return "Damaged";
  if (destinationType === "Lost") return "Lost";
  if (destinationType === "Disposal") return "Disposed";
  if (destinationType === "Tower") return "Issued to Tower";
  if (destinationType === "Customer") return "Issued to Customer";
  return "Transferred";
};

const getLocationName = (type, id, towers, customers) => {
  if (type === "Main Stock") return "Main Stock";
  if (["Repair", "Waste", "Damaged", "Lost", "Disposal"].includes(type)) return type;
  if (type === "Any") return "Current Location";
  if (type === "Tower") {
    const tower = towers.find(
      (item) => keyOf(item.id || item.towerName) === keyOf(id)
    );
    return tower
      ? `${tower.towerName || "Tower"}${tower.towerLocation ? ` - ${tower.towerLocation}` : ""}`
      : "Tower";
  }
  if (type === "Customer") {
    const customer = customers.find(
      (item) => keyOf(item.id || item.customerId) === keyOf(id)
    );
    return customer
      ? itemLabel(customer.customerId, customer.customerName || customer.fullName || customer.name)
      : "Customer";
  }
  return type || "-";
};

export default function DeviceTransferManagement() {
  const [assets, setAssets] = useJsonCollection("assets");
  const [towers] = useJsonCollection("towerAssets");
  const [customers] = useJsonCollection("customers");
  const [deviceTransfers, setDeviceTransfers] = useJsonCollection("deviceTransfers");
  const [deviceHistory, setDeviceHistory] = useJsonCollection("deviceHistory");
  const [securityDeposits, setSecurityDeposits] = useJsonCollection("securityDeposits");
  const [transactions, setTransactions] = useJsonCollection("transactions");

  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [trackingFilter, setTrackingFilter] = useState("All");
  const [repairSourceFilter, setRepairSourceFilter] = useState("All");
  const [selectedRows, setSelectedRows] = useState({});
  const [pendingEditSelection, setPendingEditSelection] = useState(null);
  const [rowQuantities, setRowQuantities] = useState({});
  const [rowSalePrices, setRowSalePrices] = useState({});
  const [rowRecoveryStatuses, setRowRecoveryStatuses] = useState({});
  const [rowDamageAmounts, setRowDamageAmounts] = useState({});
  const [rowDamagePaidAmounts, setRowDamagePaidAmounts] = useState({});
  const [editTransfer, setEditTransfer] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [recordFilters, setRecordFilters] = useState(emptyRecordFilters);
const [deleteTransferTarget, setDeleteTransferTarget] =
  useState(null);

const [isDeletingTransfer, setIsDeletingTransfer] =
  useState(false);
  const normalizedTransferType = normalizeTransferType(form.transferType);
  const [sourceType, destinationType] =
    SOURCE_DESTINATION[normalizedTransferType] || ["Main Stock", "Tower"];
  const includesCustomerReceive = destinationType === "Customer";
  const includesCustomerRefund = sourceType === "Customer";
  const includesRecoveryStatus = ["Customer", "Tower"].includes(sourceType);
  const sourceSelectionRequired = ["Tower", "Customer"].includes(sourceType) && !form.sourceLocationId;
  const isCustomerSale = false;
  const isCustomerDeposit = includesCustomerReceive;
  const isCustomerWaste = sourceType === "Customer" && destinationType === "Waste";

  const findCustomerByLocationId = (locationId) =>
    customers.find(
      (customer) =>
        keyOf(customer.id) === keyOf(locationId) ||
        keyOf(customer.customerId) === keyOf(locationId)
    );

  const sourceCustomer = findCustomerByLocationId(form.sourceLocationId);
  const sourceDepositHeld = securityDeposits.reduce((sum, deposit) => {
    if (!sourceCustomer) return sum;
    const sameCustomer =
      keyOf(deposit.customerRecordId) === keyOf(sourceCustomer.id) ||
      keyOf(deposit.customerId) === keyOf(sourceCustomer.customerId);
    if (!sameCustomer) return sum;
    return (
      sum +
      Number(deposit.receivedAmount || deposit.depositPaidAmount || deposit.depositAmount || 0) -
      Number(deposit.refundAmount || 0) -
      Number(deposit.deductionAmount || 0)
    );
  }, 0);

  const depositAmount = Number(form.depositAmount || 0);
  const depositReceivedAmount = 0;
  const refundAmount = Number(form.refundAmount || 0);
  const deductionAmount = 0;
  const saleAmount = Number(form.saleAmount || 0);
  const paidAmount = Number(form.paidAmount || 0);
  const refundRemainingDeposit = Math.max(sourceDepositHeld - refundAmount, 0);
  const saleRemaining = Math.max(saleAmount - paidAmount, 0);

  const filterLocationOptions = (type) => {
    if (type === "Tower") {
      return towers.map((tower) => ({
        id: tower.id || tower.towerName,
        label: `${tower.towerName || "Tower"}${tower.towerLocation ? ` - ${tower.towerLocation}` : ""}`,
      }));
    }

    if (type === "Customer") {
      return customers.map((customer) => ({
        id: customer.id || customer.customerId,
        label: itemLabel(customer.customerId, customer.customerName || customer.fullName || customer.name),
      }));
    }

    if (type === "Main Stock") {
      return [{ id: "Main Stock", label: "Main Stock" }];
    }

    return [];
  };

  const sourceFilterOptions = filterLocationOptions(recordFilters.sourceType);
  const destinationFilterOptions = filterLocationOptions(recordFilters.destinationType);

  const locationMatchesFilter = (transfer, side, type, id) => {
    if (type === "All") return true;

    const transferType = transfer[`${side}Type`] || transfer[side === "source" ? "fromType" : "toType"] || "";
    const transferRecordId = transfer[`${side}RecordId`] || "";
    const transferLocation = transfer[`${side}Location`] || "";

    if (transferType !== type) return false;
    if (!id) return true;
    if (type === "Main Stock") return transferLocation === "Main Stock";

    return keyOf(transferRecordId) === keyOf(id) || keyOf(transferLocation).includes(keyOf(id));
  };

  const displayNewStatus = (transfer) => {
    const destination = transfer.destinationType || transfer.toType || "";

    if (destination === "Customer") return "Issued to Customer";
    if (destination === "Tower") return "Issued to Tower";
    if (destination === "Repair") return "Issued to Repair";
    if (destination === "Main Stock") return "In Stock";

    return transfer.newStatus || transfer.status || "-";
  };

  const displayDeal = (transfer) => {
    const deal = String(transfer.dealType || transfer.ownershipType || "");
    if (/leased|loaned/i.test(deal)) return "Leased";
    if (["Deposit", "Withdrawal"].includes(deal)) return deal;
    return deal || "-";
  };

  const transferRows = useMemo(
    () =>
      [...deviceTransfers]
        .filter((transfer) => transfer.sourcePage === "device-transfer-management")
        .filter((transfer) =>
          locationMatchesFilter(transfer, "source", recordFilters.sourceType, recordFilters.sourceId)
        )
        .filter((transfer) =>
          locationMatchesFilter(
            transfer,
            "destination",
            recordFilters.destinationType,
            recordFilters.destinationId
          )
        )
        .filter((transfer) => {
          if (recordFilters.recordType === "All") return true;

          const recordKind =
            transfer.summaryType ||
            transfer.issueStatus ||
            transfer.transferType ||
            transfer.ownershipType ||
            transfer.dealType ||
            "";

          if (recordFilters.recordType === "Deposit") {
            return recordKind === "Deposit" || Number(transfer.depositAmount || 0) > 0;
          }
          if (recordFilters.recordType === "Withdrawal") {
            return recordKind === "Withdrawal" || Number(transfer.refundAmount || 0) > 0;
          }
          if (recordFilters.recordType === "Transfer") {
            return !["Deposit", "Withdrawal"].includes(recordKind);
          }

          return true;
        })
        .filter((transfer) => {
          const dateValue = String(transfer.transferDate || transfer.issueDate || transfer.createdAt || "").slice(0, 10);
          if (recordFilters.dateFrom && dateValue < recordFilters.dateFrom) return false;
          if (recordFilters.dateTo && dateValue > recordFilters.dateTo) return false;
          return true;
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [deviceTransfers, recordFilters]
  );

  const locationMatches = (asset, type, locationId) => {
    const location = String(asset.location || "").toLowerCase();
    const quantity = Number(asset.quantity || 0);
    if (type === "Any") return !isTerminalStatus(asset.status);
    if (type === "Main Stock") {
      return quantity > 0;
    }
    if (type === "Repair") {
      const inRepair = location === "repair" || String(asset.status || "").toLowerCase().includes("repair");
      if (!inRepair) return false;
      if (repairSourceFilter === "Tower") return Boolean(asset.repairSourceTowerId || asset.repairSourceTowerName);
      if (repairSourceFilter === "Customer") return Boolean(asset.repairSourceCustomerId || asset.repairSourceCustomerName);
      if (repairSourceFilter === "Main Stock") return String(asset.repairSourceType || "").toLowerCase().includes("main");
      return true;
    }
    if (type === "Tower") {
      const inTower = location === "tower" || Boolean(asset.towerRecordId || asset.towerName);
      if (!inTower) return false;
      if (!locationId) return true;
      return (
        keyOf(asset.towerRecordId) === keyOf(locationId) ||
        keyOf(asset.towerId) === keyOf(locationId) ||
        keyOf(asset.towerName) === keyOf(locationId)
      );
    }
    if (type === "Customer") {
      const inCustomer =
        location === "customer" ||
        Boolean(asset.customerRecordId || asset.customerId || asset.toCustomerId);
      if (!inCustomer) return false;
      if (!locationId) return true;
      return (
        keyOf(asset.customerRecordId) === keyOf(locationId) ||
        keyOf(asset.customerId) === keyOf(locationId) ||
        keyOf(asset.toCustomerId) === keyOf(locationId)
      );
    }
    return false;
  };

  const buildRowsForAsset = (asset) => {
    if (isIndividualAsset(asset) && Array.isArray(asset.identityRecords) && asset.identityRecords.length > 0) {
      return asset.identityRecords
        .filter((record) => {
          if (sourceType !== "Main Stock") return true;
          const recordLocation = String(record.location || asset.location || "Main Stock").toLowerCase();
          return recordLocation === "main stock" || record.status === "In Stock" || !record.location;
        })
        .map((record, index) => ({
          rowKey: `${asset.id || asset.assetId}-unit-${record.id || index}`,
          asset,
          unitRecord: record,
          tracking: "Individual",
          availableQuantity: 1,
          defaultQuantity: 1,
          unit: "Piece",
          model: record.model || asset.model || "",
          macAddress: record.macAddress || asset.macAddress || "",
          serialNumber: record.serialNumber || asset.serialNumber || "",
        }));
    }

    return [
      {
        rowKey: `${asset.id || asset.assetId}-bulk`,
        asset,
        unitRecord: null,
        tracking: isIndividualAsset(asset) ? "Individual" : "Single Model",
        availableQuantity: Number(asset.quantity || 0),
        defaultQuantity: Math.min(Number(asset.quantity || 0), 1),
        unit: getAssetUnit(asset),
        model: asset.model || "",
        macAddress: asset.macAddress || "",
        serialNumber: asset.serialNumber || "",
      },
    ];
  };

  const ledgerRowsForLocation = useMemo(() => {
    if (!["Tower", "Customer", "Repair"].includes(sourceType)) return [];
    if (["Tower", "Customer"].includes(sourceType) && !form.sourceLocationId) return [];

    const grouped = new Map();

    deviceTransfers.forEach((transfer) => {
      if (
        transfer.isSummaryRecord ||
        transfer.summaryType ||
        !Number(transfer.quantity || 0) ||
        !(transfer.assetRecordId || transfer.assetId || transfer.unitRecordId)
      ) {
        return;
      }

      const destinationMatches =
        transfer.destinationType === sourceType &&
        (!form.sourceLocationId ||
          keyOf(transfer.destinationRecordId) === keyOf(form.sourceLocationId) ||
          keyOf(transfer.destinationLocation).includes(keyOf(form.sourceLocationId)));
      const sourceMatches =
        transfer.sourceType === sourceType &&
        (!form.sourceLocationId ||
          keyOf(transfer.sourceRecordId) === keyOf(form.sourceLocationId) ||
          keyOf(transfer.sourceLocation).includes(keyOf(form.sourceLocationId)));

      if (!destinationMatches && !sourceMatches) return;

      const parentAsset =
        assets.find(
          (asset) =>
            keyOf(asset.id) === keyOf(transfer.assetRecordId) ||
            keyOf(asset.assetId) === keyOf(transfer.assetId)
        ) || {};
      const key = [
        transfer.assetRecordId || transfer.assetId,
        transfer.unitRecordId || "bulk",
      ].join("::");
      const previous = grouped.get(key) || {
        rowKey: `ledger-${key}`,
        asset: {
          ...parentAsset,
          assetId: transfer.assetId || parentAsset.assetId || "",
          deviceName: transfer.deviceName || parentAsset.deviceName || "",
          category: parentAsset.category || "",
          location: sourceType,
        },
        unitRecord: transfer.unitRecordId ? { id: transfer.unitRecordId } : null,
        tracking: transfer.trackingType || (isIndividualAsset(parentAsset) ? "Individual" : "Single Model"),
        availableQuantity: 0,
        defaultQuantity: 1,
        unit: transfer.unit || getAssetUnit(parentAsset),
        model: transfer.model || parentAsset.model || "",
        macAddress: transfer.macAddress || parentAsset.macAddress || "",
        serialNumber: transfer.serialNumber || parentAsset.serialNumber || "",
        ownershipType: transfer.dealType === "Sold" ? "Sold" : transfer.dealType ? "Leased" : "",
        depositAmount: 0,
        depositReceivedAmount: 0,
        remainingDeposit: 0,
      };

      const delta = Number(transfer.quantity || 0) * (destinationMatches ? 1 : -1);
      const depositDelta =
        Number(
          transfer.depositReceivedAmount ||
            transfer.receivedAmount ||
            transfer.depositAmount ||
            transfer.remainingDeposit ||
            0
        ) * (destinationMatches ? 1 : -1);
      grouped.set(key, {
        ...previous,
        availableQuantity: Number(previous.availableQuantity || 0) + delta,
        depositAmount: Math.max(Number(previous.depositAmount || 0) + Number(transfer.depositAmount || 0) * (destinationMatches ? 1 : -1), 0),
        depositReceivedAmount: Math.max(Number(previous.depositReceivedAmount || 0) + depositDelta, 0),
        remainingDeposit: Math.max(Number(previous.remainingDeposit || 0) + depositDelta, 0),
      });
    });

    return Array.from(grouped.values())
      .filter((row) => Number(row.availableQuantity || 0) > 0)
      .map((row) => ({
        ...row,
        defaultQuantity: row.tracking === "Individual" ? 1 : Math.min(Number(row.availableQuantity || 0), 1),
      }));
  }, [assets, deviceTransfers, form.sourceLocationId, sourceType]);

  const removeTransferIncome = async (transfer) => {
    const batchId = transfer.batchId || transfer.referenceNumber || transfer.transferId || transfer.id;
    return setTransactions(
      transactions.filter(
        (item) =>
          !(
            item.source === "device-transfer-sale" &&
            (keyOf(item.referenceId) === keyOf(batchId) ||
              keyOf(item.referenceNumber) === keyOf(transfer.referenceNumber) ||
              keyOf(item.transferId) === keyOf(transfer.transferId))
          )
      )
    );
  };

  const removeTransferWasteExpense = async (transfer) => {
    const batchId = transfer.batchId || transfer.referenceNumber || transfer.transferId || transfer.id;
    return setTransactions((previous) =>
      previous.filter(
        (item) =>
          !(
            item.source === "device-transfer-waste" &&
            (keyOf(item.referenceId) === keyOf(batchId) ||
              keyOf(item.referenceNumber) === keyOf(transfer.referenceNumber) ||
              keyOf(item.transferId) === keyOf(transfer.transferId))
          )
      )
    );
  };

  const removeTransferCustomerDamageIncome = async (transfer) => {
    const batchId = transfer.batchId || transfer.referenceNumber || transfer.transferId || transfer.id;
    return setTransactions((previous) =>
      previous.filter(
        (item) =>
          !(
            item.source === "customer-damage-payment" &&
            (keyOf(item.referenceId) === keyOf(batchId) ||
              keyOf(item.referenceNumber) === keyOf(transfer.referenceNumber) ||
              keyOf(item.transferId) === keyOf(transfer.transferId))
          )
      )
    );
  };

  const assetRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const baseRows = ["Tower", "Customer", "Repair"].includes(sourceType)
      ? ledgerRowsForLocation
      : assets
          .filter((asset) => !isTerminalStatus(asset.status))
          .filter((asset) => locationMatches(asset, sourceType, form.sourceLocationId))
          .flatMap(buildRowsForAsset);

    return baseRows
      .filter((row) => Number(row.availableQuantity || 0) > 0)
      .filter((row) => trackingFilter === "All" || row.tracking === trackingFilter)
      .filter((row) => {
        if (!keyword) return true;
        const asset = row.asset;
        return [
          asset.assetId,
          asset.deviceName,
          asset.category,
          row.model,
          row.macAddress,
          row.serialNumber,
          row.tracking,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword));
      });
  }, [assets, form.sourceLocationId, ledgerRowsForLocation, repairSourceFilter, search, sourceType, trackingFilter]);

  const selectedAssetRows = assetRows.filter((row) => selectedRows[row.rowKey]);
  const selectedTotalQuantity = selectedAssetRows.reduce((sum, row) => {
    if (row.tracking === "Individual") return sum + 1;
    return sum + Number(rowQuantities[row.rowKey] || row.defaultQuantity || 0);
  }, 0);
  const selectedSaleTotal = selectedAssetRows.reduce((sum, row) => {
    const quantity =
      row.tracking === "Individual"
        ? 1
        : Number(rowQuantities[row.rowKey] || row.defaultQuantity || 0);
    const defaultSalePrice = Number(row.asset.salePrice || row.asset.defaultSalePrice || row.asset.unitPrice || 0);
    const rowSalePrice = Number(rowSalePrices[row.rowKey] ?? defaultSalePrice);
    return sum + quantity * rowSalePrice;
  }, 0);
  const selectedDamageTotal = selectedAssetRows.reduce((sum, row) => {
    if (!isCustomerWaste || row.ownershipType === "Sold") return sum;
    const quantity =
      row.tracking === "Individual"
        ? 1
        : Number(rowQuantities[row.rowKey] || row.defaultQuantity || 0);
    const defaultDamage = quantity * Number(row.asset.salePrice || row.asset.defaultSalePrice || row.asset.unitPrice || 0);
    return sum + Number(rowDamageAmounts[row.rowKey] ?? defaultDamage);
  }, 0);
  const selectedDamagePaidTotal = selectedAssetRows.reduce((sum, row) => {
    if (!isCustomerWaste || row.ownershipType === "Sold") return sum;
    return sum + Number(rowDamagePaidAmounts[row.rowKey] || 0);
  }, 0);

  useEffect(() => {
    if (!pendingEditSelection || !assetRows.length) return;

    const match = assetRows.find((row) => {
      const sameAsset =
        keyOf(row.asset.id || row.asset.assetId) === keyOf(pendingEditSelection.assetRecordId) ||
        keyOf(row.asset.assetId) === keyOf(pendingEditSelection.assetId);
      const sameUnit =
        !pendingEditSelection.unitRecordId ||
        keyOf(row.unitRecord?.id) === keyOf(pendingEditSelection.unitRecordId) ||
        keyOf(row.macAddress) === keyOf(pendingEditSelection.macAddress) ||
        keyOf(row.serialNumber) === keyOf(pendingEditSelection.serialNumber);

      return sameAsset && sameUnit;
    });

    if (!match) return;

    setSelectedRows({ [match.rowKey]: true });
    setRowQuantities({
      [match.rowKey]: String(pendingEditSelection.quantity || match.defaultQuantity || 1),
    });
    setRowSalePrices({
      [match.rowKey]: String(
        pendingEditSelection.salePricePerQuantity ||
          pendingEditSelection.salePrice ||
          match.asset.salePrice ||
          match.asset.defaultSalePrice ||
          match.asset.unitPrice ||
          0
      ),
    });
    setRowRecoveryStatuses({
      [match.rowKey]: pendingEditSelection.recoveryStatus || "Fully Collected",
    });
    setRowDamageAmounts({
      [match.rowKey]: String(pendingEditSelection.customerDamageAmount || 0),
    });
    setRowDamagePaidAmounts({
      [match.rowKey]: String(pendingEditSelection.customerDamagePaidAmount || 0),
    });
    setPendingEditSelection(null);
  }, [assetRows, pendingEditSelection]);

  const selectedDamageRemaining = Math.max(selectedDamageTotal - selectedDamagePaidTotal, 0);
  const selectedRefundTotal = includesCustomerRefund ? refundAmount : 0;
  const selectedDepositHeldTotal = selectedAssetRows.reduce((sum, row) => {
    return sum + Number(row.depositReceivedAmount || row.remainingDeposit || row.depositAmount || 0);
  }, 0);
  const effectiveSaleAmount = isCustomerSale ? selectedSaleTotal : saleAmount;
  const effectiveSaleRemaining = Math.max(effectiveSaleAmount - paidAmount, 0);
  const effectiveDepositAmount = isCustomerDeposit ? depositAmount : 0;
  const effectiveRefundRemaining = Math.max(selectedDepositHeldTotal - selectedRefundTotal, 0);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "sourceLocationId" &&
      sourceType === destinationType &&
      keyOf(previous.destinationLocationId) === keyOf(value)
        ? { destinationLocationId: "" }
        : {}),
      ...(name === "transferType"
        ? { sourceLocationId: "", destinationLocationId: "" }
        : {}),
    }));
    if (name === "transferType" || name === "sourceLocationId") {
      setSelectedRows({});
      setRowQuantities({});
      setRowSalePrices({});
      setRowRecoveryStatuses({});
      setRowDamageAmounts({});
      setRowDamagePaidAmounts({});
    }
  };

  const generateReceiptNumber = () => {
    const nextNumber = String(Date.now()).slice(-8);
    setForm((previous) => ({
      ...previous,
      depositReceiptNumber: `REC-${nextNumber}`,
    }));
  };

  const renderLocationSelect = (name, type) => {
    if (["Main Stock", "Repair", "Waste", "Damaged", "Lost", "Disposal", "Any"].includes(type)) {
      return (
        <input
          value={type === "Any" ? "Current Location" : type}
          readOnly
          className="device-transfer-readonly"
        />
      );
    }

    const rawOptions = type === "Tower" ? towers : customers;
    const options =
      name === "destinationLocationId" && sourceType === destinationType
        ? rawOptions.filter((item) => {
            const optionValue = item.id || item.customerId || item.towerName;
            return keyOf(optionValue) !== keyOf(form.sourceLocationId);
          })
        : rawOptions;
    return (
      <select name={name} value={form[name]} onChange={handleChange}>
        <option value="">Select {type}</option>
        {options.map((item, index) => (
          <option key={item.id || item.customerId || index} value={item.id || item.customerId || item.towerName}>
            {type === "Tower"
              ? itemLabel("", `${item.towerName || "Tower"}${item.towerLocation ? ` - ${item.towerLocation}` : ""}`)
              : itemLabel(item.customerId, item.customerName || item.fullName || item.name)}
          </option>
        ))}
      </select>
    );
  };

  const setRowSelected = (row, checked) => {
    setSelectedRows((previous) => ({ ...previous, [row.rowKey]: checked }));
    if (checked && row.tracking !== "Individual") {
      setRowQuantities((previous) => ({
        ...previous,
        [row.rowKey]: String(previous[row.rowKey] || row.defaultQuantity || 1),
      }));
    }
    if (checked) {
      const quantity =
        row.tracking === "Individual"
          ? 1
          : Number(rowQuantities[row.rowKey] || row.defaultQuantity || 1);
      const defaultSalePrice = Number(row.asset.salePrice || row.asset.defaultSalePrice || row.asset.unitPrice || 0);
      setRowSalePrices((previous) => ({
        ...previous,
        [row.rowKey]: String(
          previous[row.rowKey] ??
            row.asset.salePrice ??
            row.asset.defaultSalePrice ??
            row.asset.unitPrice ??
            0
        ),
      }));
      setRowRecoveryStatuses((previous) => ({
        ...previous,
        [row.rowKey]: previous[row.rowKey] || "Fully Collected",
      }));
      setRowDamageAmounts((previous) => ({
        ...previous,
        [row.rowKey]: String(previous[row.rowKey] ?? quantity * defaultSalePrice),
      }));
      setRowDamagePaidAmounts((previous) => ({
        ...previous,
        [row.rowKey]: String(previous[row.rowKey] ?? 0),
      }));
    }
  };

  const reverseTransferEffects = async (transfer) => {
    const source = transfer.sourceType;
    const destination = transfer.destinationType;
    const quantity = Number(transfer.quantity || 0);
    const assetRecordId = keyOf(transfer.assetRecordId || transfer.assetId);
    const unitRecordId = keyOf(transfer.unitRecordId);

    const nextAssets = assets.map((asset) => {
      const sameAsset =
        keyOf(asset.id || asset.assetId) === assetRecordId ||
        keyOf(asset.assetId) === keyOf(transfer.assetId);

      if (!sameAsset) return asset;

      let nextQuantity = Number(asset.quantity || 0);

      if (source === "Main Stock" && destination !== "Main Stock") {
        nextQuantity += quantity;
      }
      if (source !== "Main Stock" && destination === "Main Stock") {
        nextQuantity -= quantity;
      }

      const nextIdentityRecords = Array.isArray(asset.identityRecords)
        ? asset.identityRecords.map((record) =>
            unitRecordId && keyOf(record.id) === unitRecordId
              ? {
                  ...record,
                  location: transfer.sourceLocation || "Main Stock",
                  status: transfer.previousStatus || "In Stock",
                  customerRecordId: "",
                  towerRecordId: "",
                  updatedAt: new Date().toISOString(),
                }
              : record
          )
        : asset.identityRecords;

      return {
        ...asset,
        quantity: Math.max(nextQuantity, 0),
        location:
          source === "Main Stock" || Math.max(nextQuantity, 0) > 0
            ? "Main Stock"
            : transfer.sourceLocation || asset.location,
        status:
          source === "Main Stock" || Math.max(nextQuantity, 0) > 0
            ? "In Stock"
            : transfer.previousStatus || asset.status,
        identityRecords: nextIdentityRecords,
        updatedAt: new Date().toISOString(),
      };
    });

    return setAssets(nextAssets);
  };

  const requestDeleteTransfer = (transfer) => {
  setDeleteTransferTarget(transfer);
};

const closeDeleteTransferModal = () => {
  if (isDeletingTransfer) return;

  setDeleteTransferTarget(null);
};

const deleteTransferRecord = async () => {
  const transfer = deleteTransferTarget;

  if (!transfer || isDeletingTransfer) return;

  try {
    setIsDeletingTransfer(true);

    const reversed =
      await reverseTransferEffects(transfer);

    if (!reversed) {
      notify(
        "Unable to restore the asset stock.",
        "error"
      );
      return;
    }

    const transfersSaved =
      await setDeviceTransfers(
        deviceTransfers.filter(
          (item) =>
            keyOf(item.id) !==
            keyOf(transfer.id)
        )
      );

    if (!transfersSaved) {
      notify(
        "Unable to delete the transfer record.",
        "error"
      );
      return;
    }

    const historySaved =
      await setDeviceHistory(
        deviceHistory.filter(
          (item) =>
            keyOf(item.transferId) !==
              keyOf(transfer.transferId) &&
            keyOf(item.referenceNumber) !==
              keyOf(transfer.referenceNumber)
        )
      );

    if (!historySaved) {
      notify(
        "Unable to remove the related device history.",
        "error"
      );
      return;
    }

    const depositsSaved =
      await setSecurityDeposits(
        securityDeposits.filter(
          (item) =>
            keyOf(item.transferId) !==
            keyOf(transfer.transferId)
        )
      );

    if (!depositsSaved) {
      notify(
        "Unable to remove the related deposit record.",
        "error"
      );
      return;
    }

    const incomeRemoved =
      await removeTransferIncome(transfer);

    if (!incomeRemoved) {
      notify(
        "Unable to remove the related income record.",
        "error"
      );
      return;
    }

    const wasteExpenseRemoved =
      await removeTransferWasteExpense(
        transfer
      );

    if (!wasteExpenseRemoved) {
      notify(
        "Unable to remove the related waste expense.",
        "error"
      );
      return;
    }

    const damageIncomeRemoved =
      await removeTransferCustomerDamageIncome(
        transfer
      );

    if (!damageIncomeRemoved) {
      notify(
        "Unable to remove the related damage payment.",
        "error"
      );
      return;
    }

    setDeleteTransferTarget(null);

    notify(
      "Transfer record deleted and stock was restored."
    );
  } catch (error) {
    console.error(
      "Unable to delete transfer:",
      error
    );

    notify(
      error?.message ||
        "Unable to delete the transfer record.",
      "error"
    );
  } finally {
    setIsDeletingTransfer(false);
  }
};

  const editTransferRecord = async (transfer) => {
    const reversed = await reverseTransferEffects(transfer);
    if (!reversed) return;

    await setDeviceTransfers(
      deviceTransfers.filter((item) => keyOf(item.id) !== keyOf(transfer.id))
    );
    await setDeviceHistory(
      deviceHistory.filter(
        (item) =>
          keyOf(item.transferId) !== keyOf(transfer.transferId) &&
          keyOf(item.referenceNumber) !== keyOf(transfer.referenceNumber)
      )
    );
    await setSecurityDeposits(
      securityDeposits.filter((item) => keyOf(item.transferId) !== keyOf(transfer.transferId))
    );
    await removeTransferIncome(transfer);
    await removeTransferWasteExpense(transfer);
    await removeTransferCustomerDamageIncome(transfer);

    setForm({
      ...emptyForm,
      transferType: normalizeTransferType(transfer.transferType) || emptyForm.transferType,
      sourceLocationId: transfer.sourceRecordId || "",
      destinationLocationId: transfer.destinationRecordId || "",
      transferDate: transfer.transferDate || todayDateValue(),
      responsibleUser: transfer.responsibleUser || "",
      receivedBy: transfer.receivedBy || "",
      reason: transfer.reason || "",
      note: transfer.note || "",
      approvalStatus: transfer.approvalStatus || "Approved",
      customerDeal: "Leased / Deposit",
      saleAmount: transfer.totalAmount || "",
      paidAmount: transfer.paidAmount || "",
      depositAmount: transfer.depositAmount || "",
      depositCurrency: transfer.depositCurrency || "AFN",
      depositReceivedAmount: transfer.depositReceivedAmount || "",
      depositStatus: transfer.depositStatus || "Not Received",
      refundAmount: transfer.refundAmount || "",
      refundCurrency: transfer.refundCurrency || transfer.depositCurrency || "AFN",
      deductionAmount: transfer.deductionAmount || "",
    });
    setSelectedRows({});
    setRowQuantities({});
    setRowSalePrices({});
    setRowRecoveryStatuses({});
    setRowDamageAmounts({});
    setRowDamagePaidAmounts({});
    setPendingEditSelection(transfer);
    setEditTransfer(transfer);
    setShowTransferModal(true);
    notify("Transfer loaded into the form. The related asset is selected for editing.");
  };

  const nextTransferId = (offset = 0) => {
    const highestTransferNumber = deviceTransfers.reduce((highest, item) => {
      const match = String(item.transferId || item.id || "").match(/^TRF-(\d+)$/);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);

    return `TRF-${String(highestTransferNumber + offset + 1).padStart(5, "0")}`;
  };

  const saveTransfer = async (event) => {
    event.preventDefault();

    if (selectedAssetRows.length === 0) {
      notify("Please select at least one asset from the table.", "error");
      return;
    }

    if (isCustomerSale && paidAmount > effectiveSaleAmount) {
      notify("Paid amount cannot be greater than sale amount.", "error");
      return;
    }

    if (includesCustomerRefund && selectedRefundTotal < 0) {
      notify("Return amount cannot be negative.", "error");
      return;
    }

    if (isCustomerWaste && selectedDamagePaidTotal > selectedDamageTotal) {
      notify("Damage paid amount cannot be greater than damage charge.", "error");
      return;
    }

    const createdAt = new Date().toISOString();
    const sourceName = getLocationName(sourceType, form.sourceLocationId, towers, customers);
    const destinationName = getLocationName(destinationType, form.destinationLocationId, towers, customers);
    const newStatus = getNewStatus(destinationType);
    const transferBatchId = `DTR-${Date.now()}`;
    const sourceCustomerRecord = sourceType === "Customer" ? findCustomerByLocationId(form.sourceLocationId) : null;
    const destinationCustomerRecord =
      destinationType === "Customer" ? findCustomerByLocationId(form.destinationLocationId) : null;
    const sourceTowerRecord =
      sourceType === "Tower"
        ? towers.find(
            (tower) =>
              keyOf(tower.id || tower.towerName) === keyOf(form.sourceLocationId)
          )
        : null;
    const destinationTowerRecord =
      destinationType === "Tower"
        ? towers.find(
            (tower) =>
              keyOf(tower.id || tower.towerName) === keyOf(form.destinationLocationId)
          )
        : null;

    const quantityByAssetKey = new Map();
    const movedUnitIdsByAssetKey = new Map();
    let remainingSalePaidToAllocate = paidAmount;
    let remainingRefundToAllocate = selectedRefundTotal;

    const transferRecords = selectedAssetRows.map((row, index) => {
      const quantity =
        row.tracking === "Individual"
          ? 1
          : Number(rowQuantities[row.rowKey] || row.defaultQuantity || 0);

      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > Number(row.availableQuantity || 0)) {
        throw new Error(`Invalid quantity for ${row.asset.assetId || row.asset.deviceName || "asset"}.`);
      }

      const assetKey = keyOf(row.asset.id || row.asset.assetId);
      quantityByAssetKey.set(assetKey, (quantityByAssetKey.get(assetKey) || 0) + quantity);
      if (row.unitRecord?.id) {
        const existingUnitIds = movedUnitIdsByAssetKey.get(assetKey) || [];
        movedUnitIdsByAssetKey.set(assetKey, [...existingUnitIds, keyOf(row.unitRecord.id)]);
      }

      const transferId = nextTransferId(index);
      const referenceNumber = `${transferBatchId}-${index + 1}`;
      const previousStatus = row.asset.status || "In Stock";
      const salePricePerQuantity = Number(
        rowSalePrices[row.rowKey] ??
          row.asset.salePrice ??
          row.asset.defaultSalePrice ??
          row.asset.unitPrice ??
          0
      );
      const rowCostValue = quantity * Number(row.asset.unitPrice || 0);
      const rowSaleAmount = quantity * salePricePerQuantity;
      const rowDepositAmount = isCustomerDeposit ? depositAmount : 0;
      const rowDepositReceivedAmount = isCustomerDeposit ? depositAmount : 0;
      const rowPaidAmount = isCustomerSale
        ? Math.min(rowSaleAmount, Math.max(remainingSalePaidToAllocate, 0))
        : 0;
      const companyOwesCustomer = false;
      const sourceHeldDeposit = Number(
        row.depositReceivedAmount ||
          row.remainingDeposit ||
          row.depositAmount ||
          0
      );
      const availableRefundAmount = Math.max(remainingRefundToAllocate, 0);
      const rowRefundAmount = includesCustomerRefund ? availableRefundAmount : 0;
      const rowCustomerPayable = 0;
      const rowDeductionAmount = 0;
      const rowDamageAmount = isCustomerWaste && row.ownershipType !== "Sold"
        ? Number(rowDamageAmounts[row.rowKey] ?? rowSaleAmount)
        : 0;
      const rowDamagePaidAmount = isCustomerWaste && row.ownershipType !== "Sold"
        ? Math.min(Number(rowDamagePaidAmounts[row.rowKey] || 0), rowDamageAmount)
        : 0;

      if (isCustomerSale) {
        remainingSalePaidToAllocate -= rowPaidAmount;
      }
      if (rowRefundAmount > 0) {
        remainingRefundToAllocate = Math.max(remainingRefundToAllocate - rowRefundAmount, 0);
      }
      return {
        id: transferId,
        transferId,
        batchId: transferBatchId,
        referenceNumber,
        transferType: normalizedTransferType,
        sourceLocation: sourceName,
        destinationLocation: destinationName,
        sourceType,
        destinationType,
        sourceRecordId: form.sourceLocationId,
        destinationRecordId: form.destinationLocationId,
        fromType: sourceType,
        toType: destinationType,
        fromCustomerRecordId: sourceCustomerRecord?.id || "",
        fromCustomerId: sourceCustomerRecord?.customerId || "",
        fromCustomerName:
          sourceCustomerRecord?.customerName ||
          sourceCustomerRecord?.fullName ||
          sourceCustomerRecord?.name ||
          "",
        toCustomerRecordId: destinationCustomerRecord?.id || "",
        toCustomerId: destinationCustomerRecord?.customerId || "",
        toCustomerName:
          destinationCustomerRecord?.customerName ||
          destinationCustomerRecord?.fullName ||
          destinationCustomerRecord?.name ||
          "",
        fromTowerRecordId: sourceTowerRecord?.id || "",
        fromTowerName: sourceTowerRecord?.towerName || "",
        toTowerRecordId: destinationTowerRecord?.id || "",
        toTowerName: destinationTowerRecord?.towerName || "",
        assetRecordId: row.asset.id || "",
        assetId: row.asset.assetId || "",
        deviceName: row.asset.deviceName || "",
        category: row.asset.category || "",
        trackingType: row.tracking,
        unitRecordId: row.unitRecord?.id || "",
        model: row.model,
        macAddress: row.macAddress,
        serialNumber: row.serialNumber,
        unitPrice: Number(row.asset.unitPrice || 0),
        salePricePerQuantity,
        assetCostValue: rowCostValue,
        transferValue: rowCostValue,
        quantity,
        unit: row.unit,
        transferDate: form.transferDate,
        issueDate: form.transferDate,
        date: form.transferDate,
        responsibleUser: form.responsibleUser.trim(),
        receivedBy: form.receivedBy.trim(),
        reason: form.reason.trim(),
        note: form.note.trim(),
        previousStatus,
        newStatus,
        status: newStatus,
        sourceMovementStatus: destinationType === "Waste" ? "Wasted Out" : "Outgoing",
        destinationMovementStatus:
          destinationType === "Waste"
            ? "Waste"
            : destinationType === "Repair"
              ? "Sent To Repair"
              : "Incoming",
        sourceSection: sourceType,
        destinationSection: destinationType,
        issueStatus: destinationType === "Customer" ? "Issued" : newStatus,
        approvalStatus: form.approvalStatus,
        dealType: includesCustomerReceive ? "Leased / Deposit" : row.ownershipType || "",
        ownershipType: includesCustomerReceive
          ? "Leased"
          : row.ownershipType || "",
        totalAmount: isCustomerSale ? rowSaleAmount : isCustomerWaste ? rowDamageAmount : rowCostValue,
        salePrice: isCustomerSale ? rowSaleAmount : salePricePerQuantity,
        paidAmount: isCustomerWaste ? rowDamagePaidAmount : rowPaidAmount,
        remainingAmount: isCustomerSale
          ? Math.max(rowSaleAmount - rowPaidAmount, 0)
          : isCustomerWaste
            ? Math.max(rowDamageAmount - rowDamagePaidAmount, 0)
            : 0,
        remainAmount: isCustomerSale
          ? Math.max(rowSaleAmount - rowPaidAmount, 0)
          : isCustomerWaste
            ? Math.max(rowDamageAmount - rowDamagePaidAmount, 0)
            : 0,
        customerDamageAmount: rowDamageAmount,
        customerDamagePaidAmount: rowDamagePaidAmount,
        customerDamageRemainingAmount: isCustomerWaste ? Math.max(rowDamageAmount - rowDamagePaidAmount, 0) : 0,
        depositAmount: rowDepositAmount,
        depositCurrency: form.depositCurrency || "AFN",
        depositReceivedAmount: rowDepositReceivedAmount,
        depositStatus: isCustomerDeposit ? form.depositStatus : "",
        refundAmount: rowRefundAmount,
        refundCurrency: form.refundCurrency || form.depositCurrency || "AFN",
        deductionAmount: rowDeductionAmount,
        remainingDeposit: includesCustomerRefund
          ? Math.max(sourceHeldDeposit - rowRefundAmount, 0)
          : isCustomerDeposit
            ? rowDepositAmount
            : 0,
        recoveryStatus: includesRecoveryStatus ? rowRecoveryStatuses[row.rowKey] || "Fully Collected" : "",
        companyOwesCustomer,
        customerPayableAmount: rowCustomerPayable,
        createdDate: createdAt,
        createdAt,
        sourcePage: "device-transfer-management",
      };
    });

    const nextAssets = assets.map((asset) => {
      const assetKey = keyOf(asset.id || asset.assetId);
      const movedQuantity = quantityByAssetKey.get(assetKey) || 0;
      if (!movedQuantity) return asset;
      const movedUnitIds = new Set(movedUnitIdsByAssetKey.get(assetKey) || []);

      let nextQuantity = Number(asset.quantity || 0);
      if (sourceType === "Main Stock" && destinationType !== "Main Stock") {
        nextQuantity -= movedQuantity;
      }
      if (sourceType !== "Main Stock" && destinationType === "Main Stock") {
        nextQuantity += movedQuantity;
      }
      nextQuantity = Math.max(nextQuantity, 0);

      const nextIdentityRecords = Array.isArray(asset.identityRecords)
        ? asset.identityRecords.map((record) => {
            if (!movedUnitIds.has(keyOf(record.id))) return record;

            return {
              ...record,
              location: destinationName,
              status: newStatus,
              previousStatus: record.status || asset.status || "In Stock",
              customerRecordId:
                destinationType === "Customer"
                  ? form.destinationLocationId
                  : sourceType === "Customer"
                    ? ""
                    : record.customerRecordId || "",
              towerRecordId:
                destinationType === "Tower"
                  ? form.destinationLocationId
                  : sourceType === "Tower"
                    ? ""
                    : record.towerRecordId || "",
              updatedAt: createdAt,
            };
          })
        : asset.identityRecords;

      const shouldMoveWholeAsset =
        !isIndividualAsset(asset) && !(sourceType === "Main Stock" && destinationType !== "Main Stock" && nextQuantity > 0);

      return {
        ...asset,
        quantity: nextQuantity,
        location: shouldMoveWholeAsset ? destinationName : asset.location || "Main Stock",
        status: shouldMoveWholeAsset ? newStatus : nextQuantity > 0 ? "In Stock" : newStatus,
        previousStatus: asset.status || "In Stock",
        lastTransferId: transferBatchId,
        lastTransferDate: form.transferDate,
        customerRecordId:
          shouldMoveWholeAsset && destinationType === "Customer"
            ? form.destinationLocationId
            : shouldMoveWholeAsset && sourceType === "Customer"
              ? ""
              : asset.customerRecordId || "",
        towerRecordId:
          shouldMoveWholeAsset && destinationType === "Tower"
            ? form.destinationLocationId
            : shouldMoveWholeAsset && sourceType === "Tower"
              ? ""
              : asset.towerRecordId || "",
        identityRecords: nextIdentityRecords,
        updatedAt: createdAt,
      };
    });

    const allTransferRecords = transferRecords;

    const assetsSaved = await setAssets(nextAssets);
    if (!assetsSaved) return;

    const transfersSaved = await setDeviceTransfers([...deviceTransfers, ...allTransferRecords]);
    if (!transfersSaved) return;

    const historySaved = await setDeviceHistory([
      ...deviceHistory,
      ...allTransferRecords.map((record) => ({
        ...record,
        id: `history-${record.transferId}`,
        historyType: "Device Transfer",
        locked: true,
        immutable: true,
      })),
    ]);
    if (!historySaved) {
      notify("Transfer saved, but Device History could not be recorded.", "error");
      return;
    }

    const destinationCustomer = findCustomerByLocationId(form.destinationLocationId);
    if (isCustomerSale && paidAmount > 0) {
      const incomeSaved = await setTransactions([
        ...transactions.filter((item) => keyOf(item.referenceId) !== keyOf(transferBatchId)),
        {
          id: `device-transfer-sale-income-${transferBatchId}`,
          type: "income",
          category: "Device Sale",
          title: `Customer Device Sale - ${
            destinationCustomer?.customerName ||
            destinationCustomer?.fullName ||
            destinationCustomer?.name ||
            "Customer"
          }`,
          amount: paidAmount,
          date: form.transferDate,
          paymentMethod: "Cash",
          description: `Paid amount for ${transferRecords.length} sold device transfer record(s).`,
          source: "device-transfer-sale",
          referenceId: transferBatchId,
          referenceNumber: transferBatchId,
          customerRecordId: destinationCustomer?.id || "",
          customerId: destinationCustomer?.customerId || "",
          createdAt,
          updatedAt: createdAt,
        },
      ]);
      if (!incomeSaved) return;
    }

    if (isCustomerWaste && selectedDamagePaidTotal > 0) {
      const damageIncomeSaved = await setTransactions((previous) => [
        ...previous.filter((item) => keyOf(item.referenceId) !== keyOf(transferBatchId)),
        {
          id: `customer-damage-income-${transferBatchId}`,
          type: "income",
          category: "Customer Damage",
          title: `Customer Damage Payment - ${
            sourceCustomerRecord?.customerName ||
            sourceCustomerRecord?.fullName ||
            sourceCustomerRecord?.name ||
            "Customer"
          }`,
          amount: selectedDamagePaidTotal,
          date: form.transferDate,
          paymentMethod: "Cash",
          description: `Paid damage amount for ${transferRecords.length} wasted customer asset record(s). Remaining: ${money(selectedDamageRemaining)} AFN`,
          source: "customer-damage-payment",
          referenceId: transferBatchId,
          referenceNumber: transferBatchId,
          customerRecordId: sourceCustomerRecord?.id || "",
          customerId: sourceCustomerRecord?.customerId || "",
          createdAt,
          updatedAt: createdAt,
        },
      ]);
      if (!damageIncomeSaved) return;
    }

    if (destinationType === "Waste") {
      const wasteAmount = transferRecords.reduce(
        (sum, record) => sum + Number(record.quantity || 0) * Number(record.unitPrice || 0),
        0
      );

      const wasteExpenseSaved = await setTransactions([
        ...transactions.filter((item) => keyOf(item.referenceId) !== keyOf(transferBatchId)),
        ...(wasteAmount > 0
          ? [
              {
                id: `device-transfer-waste-expense-${transferBatchId}`,
                type: "expense",
                category: "Asset Waste",
                title: "Asset Waste",
                amount: wasteAmount,
                date: form.transferDate,
                description: [
                  `Issued from: ${sourceName}`,
                  `Quantity: ${money(selectedTotalQuantity)} unit(s)`,
                  form.reason.trim() ? `Reason: ${form.reason.trim()}` : "",
                  form.note.trim() || "",
                ]
                  .filter(Boolean)
                  .join(" | "),
                source: "device-transfer-waste",
                referenceId: transferBatchId,
                referenceNumber: transferBatchId,
                createdAt,
                updatedAt: createdAt,
              },
            ]
          : []),
      ]);
      if (!wasteExpenseSaved) return;
    }

    notify("Device transfer saved and locked in Device History.");
    setForm(emptyForm);
    setSelectedRows({});
    setRowQuantities({});
    setRowSalePrices({});
    setRowRecoveryStatuses({});
    setRowDamageAmounts({});
    setRowDamagePaidAmounts({});
    setSearch("");
    setEditTransfer(null);
    setShowTransferModal(false);
  };

  const trySaveTransfer = async (event) => {
    try {
      await saveTransfer(event);
    } catch (error) {
      notify(error.message || "Unable to save transfer.", "error");
    }
  };

  return (
    <div className="device-transfer-page">
      <div className="device-transfer-header">
        <div>
          <span>Central Transfer</span>
          <h1>Device Transfer Management</h1>
          <p>Filter by route and source, select exact units, and move stock between locations.</p>
        </div>
        <button
          type="button"
          className="device-transfer-open-modal"
          onClick={() => {
            setForm(emptyForm);
            setSelectedRows({});
            setRowQuantities({});
            setRowSalePrices({});
            setRowRecoveryStatuses({});
            setRowDamageAmounts({});
            setRowDamagePaidAmounts({});
            setEditTransfer(null);
            setShowTransferModal(true);
          }}
        >
          + New Transfer
        </button>
      </div>

      {showTransferModal && (
        <div
          className="device-transfer-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowTransferModal(false);
          }}
        >
          <div className="device-transfer-modal">
            <div className="device-transfer-modal-header">
              <div>
                <h2>{editTransfer ? "Edit Transfer" : "New Device Transfer"}</h2>
                <p>Select route, source, destination, and exact assets.</p>
              </div>
              <button type="button" aria-label="Close transfer form" onClick={() => setShowTransferModal(false)}>
                ×
              </button>
            </div>

      <form className="device-transfer-form device-transfer-form-modal" onSubmit={trySaveTransfer}>
        <div className="device-transfer-grid">
          <label>
            Transfer Type
            <select name="transferType" value={form.transferType} onChange={handleChange}>
              {TRANSFER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            Issued from Location
            {renderLocationSelect("sourceLocationId", sourceType)}
          </label>

          <label>
            Issued to Location
            {renderLocationSelect("destinationLocationId", destinationType)}
          </label>

          <label>
            Transfer Date
            <input type="date" name="transferDate" value={form.transferDate} onChange={handleChange} />
          </label>

          <label>
            Approval Status
            <select name="approvalStatus" value={form.approvalStatus} onChange={handleChange}>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </label>

          <label>
            New Status
            <input value={getNewStatus(destinationType)} readOnly className="device-transfer-readonly" />
          </label>

          {isCustomerWaste && (
            <div className="device-transfer-value-summary device-transfer-full">
              <div>
                <span>Customer Damage Charge</span>
                <strong>{money(selectedDamageTotal)} AFN</strong>
              </div>
              <div>
                <span>Paid Amount</span>
                <strong>{money(selectedDamagePaidTotal)} AFN</strong>
              </div>
              <div>
                <span>Customer Remaining Debt</span>
                <strong>{money(selectedDamageRemaining)} AFN</strong>
              </div>
            </div>
          )}

          {includesCustomerReceive && (
            <div className="device-transfer-deposit-panel device-transfer-full">
              <div className="device-transfer-panel-title">
                <h3>Customer Deal</h3>
                <p>Leased / Deposit devices are assigned to the customer.</p>
              </div>

              {isCustomerDeposit && (
                <>
                  <label>
                    Currency
                    <select
                      name="depositCurrency"
                      value={form.depositCurrency}
                      onChange={handleChange}
                    >
                      <option value="AFN">Afghani</option>
                      <option value="USD">Dollar</option>
                    </select>
                  </label>
                  <label>
                    Deposit Amount
                    <input
                      type="text"
                      name="depositAmount"
                      value={form.depositAmount}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Received Date
                    <input type="date" name="depositReceivedDate" value={form.depositReceivedDate} onChange={handleChange} />
                  </label>
                  <label>
                    Payment Method
                    <select name="depositPaymentMethod" value={form.depositPaymentMethod} onChange={handleChange}>
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label>
                    Receipt Number
                    <div className="device-transfer-inline-field">
                      <input name="depositReceiptNumber" value={form.depositReceiptNumber} onChange={handleChange} />
                      <button type="button" onClick={generateReceiptNumber}>
                        Generate
                      </button>
                    </div>
                  </label>
                  <label>
                    Deposit Status
                    <select name="depositStatus" value={form.depositStatus} onChange={handleChange}>
                      {DEPOSIT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </div>
          )}

          {includesCustomerRefund && (
            <div className="device-transfer-deposit-panel device-transfer-full">
              <div className="device-transfer-panel-title">
                <h3>Deposit Withdraw</h3>
                <p>Record the withdraw amount on the same transfer record.</p>
              </div>
              <label>
                Currency
                <select
                  name="refundCurrency"
                  value={form.refundCurrency}
                  onChange={handleChange}
                >
                  <option value="AFN">Afghani</option>
                  <option value="USD">Dollar</option>
                </select>
              </label>
              <label>
                Withdraw Amount
                <input
                  type="number"
                  min="0"
                  name="refundAmount"
                  value={form.refundAmount}
                  onChange={handleChange}
                  placeholder="Enter return amount..."
                />
              </label>
              <label>
                Refund Date
                <input type="date" name="refundDate" value={form.refundDate} onChange={handleChange} />
              </label>
              <label>
                Refund Reference
                <input name="refundReference" value={form.refundReference} onChange={handleChange} />
              </label>
              <label className="device-transfer-full">
                Reason
                <input name="refundReason" value={form.refundReason} onChange={handleChange} />
              </label>
            </div>
          )}

          <label className="device-transfer-full">
            Note
            <textarea name="note" value={form.note} onChange={handleChange} placeholder="Transfer notes..." />
          </label>
        </div>

        <section className="device-transfer-picker device-transfer-full">
          <div className="device-transfer-card-header device-transfer-picker-header">
            <div>
              <h3>Available Assets From {sourceType}</h3>
              <p>Individual assets are listed one by one. Single Model assets use quantity selection.</p>
            </div>
            <div className="device-transfer-picker-controls">
              {sourceType === "Repair" && (
                <label>
                  Repair Issued from Filter
                  <select
                    value={repairSourceFilter}
                    onChange={(event) => setRepairSourceFilter(event.target.value)}
                  >
                    <option value="All">All repaired assets</option>
                    <option value="Tower">Repaired from Tower</option>
                    <option value="Customer">Repaired from Customer</option>
                    <option value="Main Stock">Repaired from Main Stock</option>
                  </select>
                </label>
              )}

              <label>
                Tracking Filter
                <select value={trackingFilter} onChange={(event) => setTrackingFilter(event.target.value)}>
                  <option value="All">All</option>
                  <option value="Single Model">Single Model</option>
                  <option value="Individual">Individual</option>
                </select>
              </label>

              <label>
                Search Asset
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search asset..." />
              </label>
            </div>
          </div>
          <div className="device-transfer-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Asset</th>
                  <th>Tracking</th>
                  <th>Category</th>
                  <th>Model</th>
                  <th>MAC Address</th>
                  <th>Serial Number</th>
                  <th>Available</th>
                  <th>Quantity</th>
                  {isCustomerSale && <th>Sale Price</th>}
                  {includesRecoveryStatus && <th>Recovery Status</th>}
                  {isCustomerWaste && <th>Damage Charge</th>}
                  {isCustomerWaste && <th>Paid Amount</th>}
                  <th>Current Location</th>
                </tr>
              </thead>
              <tbody>
                {assetRows.map((row) => {
                  const rowSelectionDisabled = false;

                  return (
                  <tr
                    key={row.rowKey}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedRows[row.rowKey])}
                        disabled={rowSelectionDisabled}
                        onChange={(event) => setRowSelected(row, event.target.checked)}
                      />
                    </td>
                    <td title={`${row.asset.category || "-"} - ${row.asset.assetId || "-"} - ${row.asset.deviceName || "-"}`}>
                      {row.asset.category || "-"} - {row.asset.assetId || "-"} - {row.asset.deviceName || "-"}
                    </td>
                    <td><span className="device-transfer-pill">{row.tracking}</span></td>
                    <td>{row.asset.category || "-"}</td>
                    <td>{row.model || "-"}</td>
                    <td>{row.macAddress || "-"}</td>
                    <td>{row.serialNumber || "-"}</td>
                    <td>{money(row.availableQuantity)} {row.unit}</td>
                    <td>
                      {row.tracking === "Individual" ? (
                        "1"
                      ) : (
                        <input
                          type="number"
                          min="1"
                          max={row.availableQuantity}
                          value={rowQuantities[row.rowKey] || row.defaultQuantity || 1}
                          disabled={!selectedRows[row.rowKey] || rowSelectionDisabled}
                          onChange={(event) =>
                            setRowQuantities((previous) => ({
                              ...previous,
                              [row.rowKey]: String(
                                Math.min(Number(event.target.value || 1), row.availableQuantity)
                              ),
                            }))
                          }
                        />
                      )}
                    </td>
                    {isCustomerSale && (
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={
                            rowSalePrices[row.rowKey] ??
                            row.asset.salePrice ??
                            row.asset.defaultSalePrice ??
                            row.asset.unitPrice ??
                            0
                          }
                          disabled={!selectedRows[row.rowKey] || rowSelectionDisabled}
                          onChange={(event) =>
                            setRowSalePrices((previous) => ({
                              ...previous,
                              [row.rowKey]: event.target.value,
                            }))
                          }
                        />
                      </td>
                    )}
                    {includesRecoveryStatus && (
                      <td>
                        <select
                          value={rowRecoveryStatuses[row.rowKey] || "Fully Collected"}
                          disabled={!selectedRows[row.rowKey] || rowSelectionDisabled}
                          onChange={(event) =>
                            setRowRecoveryStatuses((previous) => ({
                              ...previous,
                              [row.rowKey]: event.target.value,
                            }))
                          }
                        >
                          {RECOVERY_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {isCustomerWaste && (
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={
                            rowDamageAmounts[row.rowKey] ??
                            (row.tracking === "Individual" ? 1 : Number(rowQuantities[row.rowKey] || row.defaultQuantity || 1)) *
                              Number(row.asset.salePrice || row.asset.defaultSalePrice || row.asset.unitPrice || 0)
                          }
                          disabled={!selectedRows[row.rowKey] || rowSelectionDisabled}
                          onChange={(event) =>
                            setRowDamageAmounts((previous) => ({
                              ...previous,
                              [row.rowKey]: event.target.value,
                            }))
                          }
                        />
                      </td>
                    )}
                    {isCustomerWaste && (
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={Number(
                            rowDamageAmounts[row.rowKey] ??
                              (row.tracking === "Individual" ? 1 : Number(rowQuantities[row.rowKey] || row.defaultQuantity || 1)) *
                                Number(row.asset.salePrice || row.asset.defaultSalePrice || row.asset.unitPrice || 0)
                          )}
                          value={rowDamagePaidAmounts[row.rowKey] || ""}
                          disabled={!selectedRows[row.rowKey] || rowSelectionDisabled}
                          onChange={(event) =>
                            setRowDamagePaidAmounts((previous) => ({
                              ...previous,
                              [row.rowKey]: String(
                                Math.min(
                                  Number(event.target.value || 0),
                                  Number(
                                    rowDamageAmounts[row.rowKey] ??
                                      (row.tracking === "Individual" ? 1 : Number(rowQuantities[row.rowKey] || row.defaultQuantity || 1)) *
                                        Number(row.asset.salePrice || row.asset.defaultSalePrice || row.asset.unitPrice || 0)
                                  )
                                )
                              ),
                            }))
                          }
                        />
                      </td>
                    )}
                    <td>{row.asset.location || "Main Stock"}</td>
                  </tr>
                )})}
                {assetRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        10 +
                        (isCustomerSale ? 1 : 0) +
                        (includesRecoveryStatus ? 1 : 0) +
                        (isCustomerWaste ? 2 : 0)
                      }
                      className="device-transfer-empty"
                    >
                      {sourceSelectionRequired
                        ? `Select a ${sourceType.toLowerCase()} to view available assets.`
                        : "No asset was found for this route and source location."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="device-transfer-actions">
          <button type="submit">{editTransfer ? "Save Edited Transfer" : "Save Transfer"}</button>
        </div>
      </form>
          </div>
        </div>
      )}

      <section className="device-transfer-card">
        <div className="device-transfer-card-header">
          <div>
            <h3>Transfer Records</h3>
            <p>Filter records by sender, receiver, deposit, withdrawal, or custom date range.</p>
          </div>
          <div className="device-transfer-record-filters">
            <label>
              Issued from Type
              <select
                value={recordFilters.sourceType}
                onChange={(event) =>
                  setRecordFilters((previous) => ({
                    ...previous,
                    sourceType: event.target.value,
                    sourceId: "",
                  }))
                }
              >
                <option value="All">All Issued from</option>
                <option value="Tower">Tower</option>
                <option value="Customer">Customer</option>
                <option value="Main Stock">Main Stock</option>
                <option value="Repair">Repair</option>
                <option value="Waste">Waste</option>
              </select>
            </label>

            {sourceFilterOptions.length > 0 && (
              <label>
                Sender
                <select
                  value={recordFilters.sourceId}
                  onChange={(event) =>
                    setRecordFilters((previous) => ({
                      ...previous,
                      sourceId: event.target.value,
                    }))
                  }
                >
                  <option value="">All {recordFilters.sourceType}</option>
                  {sourceFilterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Issued to Type
              <select
                value={recordFilters.destinationType}
                onChange={(event) =>
                  setRecordFilters((previous) => ({
                    ...previous,
                    destinationType: event.target.value,
                    destinationId: "",
                  }))
                }
              >
                <option value="All">All Receivers</option>
                <option value="Tower">Tower</option>
                <option value="Customer">Customer</option>
                <option value="Main Stock">Main Stock</option>
                <option value="Repair">Repair</option>
                <option value="Waste">Waste</option>
              </select>
            </label>

            {destinationFilterOptions.length > 0 && (
              <label>
                Receiver
                <select
                  value={recordFilters.destinationId}
                  onChange={(event) =>
                    setRecordFilters((previous) => ({
                      ...previous,
                      destinationId: event.target.value,
                    }))
                  }
                >
                  <option value="">All {recordFilters.destinationType}</option>
                  {destinationFilterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Record Type
              <select
                value={recordFilters.recordType}
                onChange={(event) =>
                  setRecordFilters((previous) => ({
                    ...previous,
                    recordType: event.target.value,
                  }))
                }
              >
                <option value="All">All Records</option>
                <option value="Transfer">Transfers</option>
                <option value="Deposit">Deposit</option>
                <option value="Withdrawal">Withdrawal</option>
              </select>
            </label>

            <label>
              From Date
              <input
                type="date"
                value={recordFilters.dateFrom}
                onChange={(event) =>
                  setRecordFilters((previous) => ({
                    ...previous,
                    dateFrom: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              To Date
              <input
                type="date"
                value={recordFilters.dateTo}
                onChange={(event) =>
                  setRecordFilters((previous) => ({
                    ...previous,
                    dateTo: event.target.value,
                  }))
                }
              />
            </label>

            <button type="button" onClick={() => setRecordFilters(emptyRecordFilters)}>
              Clear
            </button>
          </div>
        </div>
        <div className="device-transfer-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>Reference Number</th>
                <th>Transfer Type</th>
                <th>Issued from</th>
                <th>Issued to</th>
                <th>Category</th>
                <th>Asset</th>
                <th>Quantity</th>
                <th>Transfer Date</th>
                <th>Deal</th>
                <th>Deposit</th>
                <th>Withdraw</th>
                <th>Previous Status</th>
                <th>New Status</th>
                <th>Approval</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transferRows.map((transfer, index) => (
                <tr key={`${transfer.id || transfer.transferId}-${index}`}>
                  <td>{transfer.transferId || transfer.id}</td>
                  <td>{transfer.referenceNumber || "-"}</td>
                  <td>{normalizeTransferType(transfer.transferType) || "-"}</td>
                  <td>{transfer.sourceLocation || "-"}</td>
                  <td>{transfer.destinationLocation || "-"}</td>
                  <td>{transfer.category || "-"}</td>
                  <td title={`${transfer.category || "-"} - ${transfer.assetId || "-"} - ${transfer.deviceName || "-"}`}>
                    {transfer.category || "-"} - {transfer.assetId || "-"} - {transfer.deviceName || "-"}
                  </td>
                  <td>{money(transfer.quantity)} {transfer.unit || ""}</td>
                  <td>{formatDateTime(transfer.transferDate, transfer.createdAt)}</td>
                  <td>
                    {["Deposit", "Withdrawal"].includes(displayDeal(transfer)) ? (
                      <span className={`device-transfer-status ${displayDeal(transfer).toLowerCase()}`}>
                        {displayDeal(transfer)}
                      </span>
                    ) : (
                      displayDeal(transfer)
                    )}
                  </td>
                  <td>
                    {transfer.summaryType === "Deposit" || transfer.dealType === "Deposit" || transfer.depositAmount ? (
                      <span className="device-transfer-money-badge deposit">
                        {money(transfer.depositAmount)} {transfer.depositCurrency || "AFN"}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {transfer.summaryType === "Withdrawal" || transfer.dealType === "Withdrawal" || transfer.refundAmount ? (
                      <span className="device-transfer-money-badge return">
                        {money(transfer.refundAmount)} {transfer.refundCurrency || transfer.depositCurrency || "AFN"}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{transfer.previousStatus || "-"}</td>
                  <td>{displayNewStatus(transfer)}</td>
                  <td><span className="device-transfer-status">{transfer.approvalStatus || "-"}</span></td>
                  <td>{formatDateTime(transfer.createdDate || transfer.createdAt)}</td>
                  <td>
                    <div className="device-transfer-row-actions">
                      <button type="button" onClick={() => editTransferRecord(transfer)}>
                        Edit
                      </button>
                      <button
  type="button"
  className="danger"
  onClick={() =>
    requestDeleteTransfer(transfer)
  }
>
  Delete
</button>
                    </div>
                  </td>
                </tr>
              ))}
              {transferRows.length === 0 && (
                <tr>
                  <td colSpan="17" className="device-transfer-empty">No transfer has been recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
{deleteTransferTarget && (
  <div
    className="device-transfer-delete-backdrop"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        closeDeleteTransferModal();
      }
    }}
  >
    <section
      className="device-transfer-delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-transfer-title"
    >
      <header className="device-transfer-delete-header">
        <div className="device-transfer-delete-warning-icon">
          <AlertTriangle
            size={22}
            strokeWidth={1.9}
          />
        </div>

        <div>
          <h2 id="delete-transfer-title">
            Delete Transfer Record?
          </h2>

          <p>
            Review this transfer before permanently
            deleting it.
          </p>
        </div>

        <button
          type="button"
          className="device-transfer-delete-close"
          onClick={closeDeleteTransferModal}
          disabled={isDeletingTransfer}
          aria-label="Close delete confirmation"
        >
          <X size={18} />
        </button>
      </header>

      <div className="device-transfer-delete-alert">
        <strong>Important warning</strong>

        <p>
          Deleting this record will reverse its stock
          movement and may also remove related device
          history, deposit, income, waste expense, or
          damage-payment records.
        </p>
      </div>

      <div className="device-transfer-delete-details">
        <div>
          <span>Transfer ID</span>
          <strong>
            {deleteTransferTarget.transferId ||
              deleteTransferTarget.id ||
              "-"}
          </strong>
        </div>

        <div>
          <span>Reference</span>
          <strong>
            {deleteTransferTarget.referenceNumber ||
              "-"}
          </strong>
        </div>

        <div>
          <span>Transfer Type</span>
          <strong>
            {deleteTransferTarget.transferType ||
              deleteTransferTarget.summaryType ||
              "-"}
          </strong>
        </div>

        <div>
          <span>Transfer Date</span>
          <strong>
            {deleteTransferTarget.transferDate ||
              deleteTransferTarget.issueDate ||
              deleteTransferTarget.date ||
              "-"}
          </strong>
        </div>

        <div>
          <span>Asset</span>
          <strong>
            {itemLabel(
              deleteTransferTarget.assetId,
              deleteTransferTarget.deviceName
            )}
          </strong>
        </div>

        <div>
          <span>Quantity</span>
          <strong>
            {deleteTransferTarget.quantity || 0}{" "}
            {deleteTransferTarget.unit || "Piece"}
          </strong>
        </div>

        <div>
          <span>From</span>
          <strong>
            {deleteTransferTarget.sourceLocation ||
              deleteTransferTarget.fromCustomerName ||
              deleteTransferTarget.fromTowerName ||
              "-"}
          </strong>
        </div>

        <div>
          <span>To</span>
          <strong>
            {deleteTransferTarget.destinationLocation ||
              deleteTransferTarget.toCustomerName ||
              deleteTransferTarget.toTowerName ||
              "-"}
          </strong>
        </div>

        <div>
          <span>Previous Status</span>
          <strong>
            {deleteTransferTarget.previousStatus ||
              "-"}
          </strong>
        </div>

        <div>
          <span>New Status</span>
          <strong>
            {deleteTransferTarget.newStatus ||
              deleteTransferTarget.status ||
              "-"}
          </strong>
        </div>

        <div>
          <span>Responsible</span>
          <strong>
            {deleteTransferTarget.responsibleUser ||
              deleteTransferTarget.receivedBy ||
              "-"}
          </strong>
        </div>

        <div>
          <span>Financial Amount</span>
          <strong>
            {[
              Number(deleteTransferTarget.depositAmount || 0) > 0
                ? `Deposit: ${money(deleteTransferTarget.depositAmount)} ${deleteTransferTarget.depositCurrency || "AFN"}`
                : "",
              Number(deleteTransferTarget.refundAmount || 0) > 0
                ? `Withdraw: ${money(deleteTransferTarget.refundAmount)} ${deleteTransferTarget.refundCurrency || deleteTransferTarget.depositCurrency || "AFN"}`
                : "",
              Number(deleteTransferTarget.paidAmount || 0) > 0
                ? `Paid: ${money(deleteTransferTarget.paidAmount)} AFN`
                : "",
            ].filter(Boolean).join(" / ") || "-"}
          </strong>
        </div>

        {(deleteTransferTarget.note ||
          deleteTransferTarget.reason) && (
          <div className="device-transfer-delete-detail-full">
            <span>Note / Reason</span>
            <strong>
              {deleteTransferTarget.note ||
                deleteTransferTarget.reason}
            </strong>
          </div>
        )}
      </div>

      <footer className="device-transfer-delete-actions">
        <button
          type="button"
          className="device-transfer-delete-cancel"
          onClick={closeDeleteTransferModal}
          disabled={isDeletingTransfer}
        >
          Cancel
        </button>

        <button
          type="button"
          className="device-transfer-delete-confirm"
          onClick={deleteTransferRecord}
          disabled={isDeletingTransfer}
        >
          <Trash2 size={16} />

          {isDeletingTransfer
            ? "Deleting..."
            : "Delete Transfer"}
        </button>
      </footer>
    </section>
  </div>
)}
    </div>
  );
}
