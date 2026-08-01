import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import { formatDateTime } from "../utils/afghanDate";
import "./CustomerIssueDevice.css";

function createEmptyIssueForm() {
  return {
    sourceType: "Customer",
    fromCustomerId: "",
    destinationCustomerId: "",
    destinationTowerId: "",
    issueDate: new Date().toISOString().slice(0, 10),
    issueStatus: "Issued",
    ownershipType: "Leased",
    salePrice: "",
    paidAmount: "",
    remainAmount: "",
    salePrices: {},
    depositRefundAmount: "",
    depositCurrency: "AFN",
    depositAmount: "",
    depositStatus: "Held",
    notes: "",
  };
}

const emptyEditForm = {
  issueDate: "",
  issueStatus: "Issued",
  ownershipType: "Leased",
  salePrice: "",
  paidAmount: "",
  remainAmount: "",
  depositAmount: "",
  depositCurrency: "AFN",
  depositStatus: "Held",
  notes: "",
};

function money(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function CustomerIssueDevice() {
  const { id, viewMode } = useParams();
  const navigate = useNavigate();

  const [customers, , , customersLoaded] = useJsonCollection("customers");
  const [assets, setAssets, , assetsLoaded] = useJsonCollection("assets");
  const [assetMovements, setAssetMovements, , movementsLoaded] =
    useJsonCollection("assetMovements");

  const [deviceTransfers, setDeviceTransfers, , transfersLoaded] =
    useJsonCollection("deviceTransfers");

  const [securityDeposits, setSecurityDeposits, , depositsLoaded] =
    useJsonCollection("securityDeposits");
  const [customerDeviceBuybacks, setCustomerDeviceBuybacks, , buybacksLoaded] =
    useJsonCollection("customerDeviceBuybacks");
  const [customerPayments, setCustomerPayments, , paymentsLoaded] =
    useJsonCollection("customerPayments");
  const [, setTransactions, , transactionsLoaded] =
    useJsonCollection("transactions");
  const [towerAssets, setTowerAssets, , towersLoaded] =
    useJsonCollection("towerAssets");
  const [towerAssetTransfers, setTowerAssetTransfers, , towerTransfersLoaded] =
    useJsonCollection("towerAssetTransfers");

  const [formData, setFormData] = useState(createEmptyIssueForm);
  const [selectedAssetKeys, setSelectedAssetKeys] = useState([]);
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [search, setSearch] = useState("");
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showBuybackModal, setShowBuybackModal] = useState(false);
  const [editBuybackRecord, setEditBuybackRecord] = useState(null);
  const [buybackForm, setBuybackForm] = useState({
    purchaseDate: new Date().toISOString().slice(0, 10),
    destination: "Main Stock",
    selectedTransferIds: [],
    purchasePrices: {},
    purchasedBy: "",
    paidAmount: "",
    notes: "",
  });

  const [openActionId, setOpenActionId] = useState(null);

  const [actionMenuPosition, setActionMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const [viewTransfer, setViewTransfer] = useState(null);
  const [editTransfer, setEditTransfer] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [deleteTransfer, setDeleteTransfer] = useState(null);
  const [viewAsset, setViewAsset] = useState(null);
  const [showDepositDetails, setShowDepositDetails] = useState(false);
  const [activeSummaryView, setActiveSummaryView] = useState("");
  const [historyFilters, setHistoryFilters] = useState({
    date: "",
    source: "",
    destination: "",
  });

  const customer = customers.find(
    (item) =>
      String(item.id) === String(id) ||
      String(item.customerId) === String(id)
  );

  const getCustomerName = (record) => {
    return (
      record?.customerName ||
      record?.fullName ||
      record?.name ||
      `${record?.firstName || ""} ${record?.lastName || ""}`.trim() ||
      "Unnamed Customer"
    );
  };

  const getAssetKey = (asset) => {
    return String(
      asset?.selectionKey ||
        asset?.unitRecordId ||
        asset?.id ||
        asset?.assetId ||
        asset?.serialNumber ||
        asset?.macAddress ||
        ""
    );
  };

  const getTransferAssetKey = (transfer) => {
    return String(
      transfer?.unitRecordId ||
        transfer?.serialNumber ||
        transfer?.macAddress ||
        transfer?.assetRecordId ||
        transfer?.assetId ||
        ""
    );
  };

  const getParentAssetId = (asset) =>
    String(asset?.assetRecordId || asset?.parentAssetId || asset?.id || "");

  const isIndividualAsset = (asset) =>
    String(asset?.identityTracking || "")
      .toLowerCase()
      .includes("individual");

  const getBulkAssetGroupKey = (asset) =>
    String(
      asset?.assetRecordId ||
        asset?.parentAssetId ||
        asset?.parentAssetKey ||
        asset?.assetId ||
        asset?.id ||
        ""
    );

  const getSelectableAssetKey = (asset) =>
    isIndividualAsset(asset) ? getAssetKey(asset) : getBulkAssetGroupKey(asset);

  const buildUnitOption = (asset, record, index, sourceLabel = "") => ({
    ...asset,
    ...record,
    id: asset.id,
    parentAssetId: asset.id || "",
    assetRecordId: asset.id || "",
    assetId: asset.assetId || "",
    deviceName: asset.deviceName || "",
    category: record.category || asset.category || "",
    brand: asset.brand || "",
    unitRecordId:
      record.id ||
      record.serialNumber ||
      record.macAddress ||
      `${asset.id || asset.assetId}-unit-${index}`,
    selectionKey: `${asset.id || asset.assetId}::${
      record.id ||
      record.serialNumber ||
      record.macAddress ||
      index
    }`,
    quantity: 1,
    sourceType: sourceLabel || record.sourceType || asset.location || "",
  });

  const expandAssetOptions = (asset, sourceLabel = "") => {
    if (isIndividualAsset(asset) && (asset.identityRecords || []).length > 0) {
      return (asset.identityRecords || []).map((record, index) =>
        buildUnitOption(asset, record, index, sourceLabel)
      );
    }

    return [
      {
        ...asset,
        parentAssetId: asset.id || "",
        assetRecordId: asset.id || "",
        selectionKey: asset.id || asset.assetId || "",
        quantity: Number(asset.quantity || 1),
        availableQuantity: Number(asset.quantity || 1),
        unitRecordId: "",
        sourceType: sourceLabel || asset.location || "",
      },
    ];
  };

  const mergeSelectableAssets = (assetOptions) => {
    const merged = new Map();

    assetOptions.forEach((asset) => {
      const key = getSelectableAssetKey(asset);
      const existing = merged.get(key);

      if (!existing || isIndividualAsset(asset)) {
        merged.set(key, asset);
        return;
      }

      merged.set(key, {
        ...existing,
        quantity: Number(existing.quantity || 0) + Number(asset.quantity || 1),
        availableQuantity:
          Number(existing.availableQuantity ?? existing.quantity ?? 0) +
          Number(asset.availableQuantity ?? asset.quantity ?? 1),
        depositAmount:
          Number(existing.depositAmount || 0) + Number(asset.depositAmount || 0),
        depositRemainingAmount:
          Number(existing.depositRemainingAmount || 0) +
          Number(asset.depositRemainingAmount ?? asset.depositAmount ?? 0),
        securityDepositPerDevice:
          Number(existing.securityDepositPerDevice || 0) +
          Number(asset.securityDepositPerDevice || 0),
      });
    });

    return Array.from(merged.values());
  };

  const getAssetLabel = (asset) => {
    const assetId = asset.assetId || "No Asset ID";
    const name = asset.deviceName || "Unnamed Device";

    const serial = asset.serialNumber
      ? ` / SN: ${asset.serialNumber}`
      : "";

    const mac = asset.macAddress
      ? ` / MAC: ${asset.macAddress}`
      : "";

    return `${assetId} - ${name}${serial}${mac}`;
  };

  const getCustomerByAnyId = (value) =>
    customers.find(
      (item) =>
        String(item.id || "") === String(value || "") ||
        String(item.customerId || "") === String(value || "")
    );

  const normalizeCustomerTransfer = (transfer) => {
    const repairResult = transfer.repairResult || null;
    const repairToCustomer = repairResult?.sendTo === "Customer";
    const centralToCustomer = String(transfer.destinationType || "") === "Customer";
    const centralFromCustomer = String(transfer.sourceType || "") === "Customer";

    const toCustomerRecordId =
      transfer.toCustomerRecordId ||
      (centralToCustomer ? transfer.destinationRecordId : "") ||
      (repairToCustomer ? repairResult.destinationRecordId : "");
    const fromCustomerRecordId =
      transfer.fromCustomerRecordId ||
      (centralFromCustomer ? transfer.sourceRecordId : "");

    const toCustomer = getCustomerByAnyId(toCustomerRecordId || transfer.toCustomerId);
    const fromCustomer = getCustomerByAnyId(fromCustomerRecordId || transfer.fromCustomerId);

    const normalizedTransferType = repairToCustomer
      ? "Repair -> Customer"
      : transfer.transferType || transfer.fromType || "-";
    const ownershipType =
      transfer.ownershipType ||
      (transfer.dealType === "Sold" ? "Sold" : transfer.dealType ? "Leased" : "");

    return {
      ...transfer,
      id: repairToCustomer ? `repair-customer-${transfer.id || transfer.transferId}` : transfer.id,
      issueDate: repairResult?.resultDate || transfer.issueDate || transfer.transferDate || transfer.date || "",
      transferType: normalizedTransferType,
      fromCustomerRecordId,
      fromCustomerId: fromCustomer?.customerId || transfer.fromCustomerId || "",
      fromCustomerName:
        fromCustomer ? getCustomerName(fromCustomer) : transfer.fromCustomerName || transfer.sourceLocation || "-",
      toCustomerRecordId,
      toCustomerId: toCustomer?.customerId || transfer.toCustomerId || "",
      toCustomerName:
        toCustomer ? getCustomerName(toCustomer) : transfer.toCustomerName || transfer.destinationLocation || "-",
      ownershipType,
      salePrice: transfer.salePrice || transfer.totalAmount || 0,
      paidAmount: transfer.paidAmount || 0,
      depositAmount: transfer.depositAmount || 0,
      depositReceivedAmount: transfer.depositReceivedAmount || 0,
      depositRemainingAmount: transfer.remainingDeposit || 0,
      issueStatus:
        repairToCustomer
          ? repairResult.repairStatus === "Fixed"
            ? "Issued"
            : "Not Fixed"
          : transfer.issueStatus || transfer.newStatus || transfer.status || "Issued",
      quantity: repairResult?.quantity || transfer.quantity || 1,
      createdAt: repairResult?.updatedAt || transfer.createdAt,
      updatedAt: repairResult?.updatedAt || transfer.updatedAt,
    };
  };

  const normalizedCustomerTransfers = useMemo(
    () => deviceTransfers.map((transfer) => normalizeCustomerTransfer(transfer)),
    [deviceTransfers, customers]
  );

  const isLatestTransferForAsset = (transfer) => {
    const relatedTransfers = normalizedCustomerTransfers.filter(
      (item) =>
        getTransferAssetKey(item) === getTransferAssetKey(transfer)
    );

    if (!relatedTransfers.length) return false;

    const sortedTransfers = [...relatedTransfers].sort((a, b) => {
      const firstDate = String(
        a.createdAt || a.issueDate || ""
      );

      const secondDate = String(
        b.createdAt || b.issueDate || ""
      );

      return firstDate.localeCompare(secondDate);
    });

    const latestTransfer =
      sortedTransfers[sortedTransfers.length - 1];

    return String(latestTransfer.id) === String(transfer.id);
  };

  const mainStockAssets = useMemo(() => {
    return assets.flatMap((asset) => {
      const location = String(
        asset.location || ""
      ).toLowerCase();

      const status = String(
        asset.status || ""
      ).toLowerCase();

      const inMainStock =
        location === "main stock" ||
        status === "in stock" ||
        status === "returned";

      return inMainStock ? expandAssetOptions(asset, "Main Stock") : [];
    });
  }, [assets]);

  const latestCustomerTransferOptions = useMemo(() => {
    const sortedTransfers = [...normalizedCustomerTransfers].sort((a, b) =>
      String(a.createdAt || a.issueDate || "").localeCompare(
        String(b.createdAt || b.issueDate || "")
      )
    );
    const latestByUnit = new Map();

    sortedTransfers.forEach((transfer) => {
      if (
        transfer.isSummaryRecord ||
        transfer.summaryType ||
        !Number(transfer.quantity || 0) ||
        !(transfer.assetRecordId || transfer.assetId || transfer.unitRecordId)
      ) {
        return;
      }

      const key =
        transfer.serialNumber ||
        transfer.macAddress ||
        transfer.unitRecordId ||
        transfer.assetRecordId ||
        transfer.assetId ||
        transfer.id;
      latestByUnit.set(String(key), transfer);
    });

    return Array.from(latestByUnit.values())
      .filter((transfer) => transfer.toCustomerRecordId)
      .map((transfer) => {
        const parentAsset =
          assets.find(
            (asset) =>
              String(asset.id || "") ===
                String(transfer.assetRecordId || "") ||
              String(asset.assetId || "") === String(transfer.assetId || "")
          ) || {};

        return {
          ...parentAsset,
          ...transfer,
          id: parentAsset.id || transfer.assetRecordId || transfer.id,
          parentAssetId: transfer.assetRecordId || parentAsset.id || "",
          assetRecordId: transfer.assetRecordId || parentAsset.id || "",
          assetId: transfer.assetId || parentAsset.assetId || "",
          deviceName: transfer.deviceName || parentAsset.deviceName || "",
          category: transfer.category || parentAsset.category || "",
          brand: transfer.brand || parentAsset.brand || "",
          selectionKey: `${transfer.assetRecordId || transfer.assetId}::${
            transfer.serialNumber ||
            transfer.macAddress ||
            transfer.id
          }`,
          unitRecordId:
            transfer.unitRecordId ||
            transfer.serialNumber ||
            transfer.macAddress ||
            transfer.id,
          quantity: Number(transfer.quantity || 1),
          availableQuantity: Number(transfer.quantity || 1),
          location: "Customer",
          status: transfer.issueStatus || "Issued",
          customerRecordId: transfer.toCustomerRecordId || "",
          customerId: transfer.toCustomerId || "",
          customerName: transfer.toCustomerName || "",
        };
      });
  }, [assets, normalizedCustomerTransfers]);

  const customerOwnedAssets = useMemo(() => {
    if (formData.sourceType !== "Customer") {
      return [];
    }

    const fromCustomer = customers.find(
      (item) =>
        String(item.id) === String(formData.fromCustomerId)
    );

    if (!fromCustomer) {
      return [];
    }

    const assetOptions = assets.flatMap((asset) => {
      const belongsToCustomer =
        String(asset.customerRecordId || "") === String(fromCustomer.id) ||
        String(asset.customerId || "") === String(fromCustomer.customerId);

      const unitRecords = Array.isArray(asset.identityRecords)
        ? asset.identityRecords.filter(
            (record) =>
              String(record.customerRecordId || "") === String(fromCustomer.id) ||
              String(record.customerId || "") === String(fromCustomer.customerId)
          )
        : [];

      if (unitRecords.length) {
        return unitRecords.map((record, index) => buildUnitOption(asset, record, index, "Customer"));
      }

      return belongsToCustomer ? expandAssetOptions(asset, "Customer") : [];
    });

    const transferOptions = latestCustomerTransferOptions.filter(
      (asset) =>
        String(asset.customerRecordId || "") === String(fromCustomer.id) ||
        String(asset.customerId || "") === String(fromCustomer.customerId)
    );

    return mergeSelectableAssets([...assetOptions, ...transferOptions]);
  }, [
    assets,
    customers,
    formData.fromCustomerId,
    formData.sourceType,
    latestCustomerTransferOptions,
  ]);

  const currentCustomerAssets = useMemo(() => {
  if (!customer) return [];

  const grouped = new Map();
  const sameCustomer = (recordId, customerId) =>
    String(recordId || "") === String(customer.id || "") ||
    String(customerId || "") === String(customer.customerId || "");

  normalizedCustomerTransfers.forEach((transfer) => {
    if (
      transfer.isSummaryRecord ||
      transfer.summaryType ||
      !Number(transfer.quantity || 0) ||
      !(transfer.assetRecordId || transfer.assetId || transfer.unitRecordId)
    ) {
      return;
    }

    const incoming = sameCustomer(transfer.toCustomerRecordId, transfer.toCustomerId);
    const outgoing = sameCustomer(transfer.fromCustomerRecordId, transfer.fromCustomerId);

    if (!incoming && !outgoing) return;

    const parentAsset =
      assets.find(
        (asset) =>
          String(asset.id || "") === String(transfer.assetRecordId || "") ||
          String(asset.assetId || "") === String(transfer.assetId || "")
      ) || {};

    const key = [
      transfer.assetRecordId || transfer.assetId,
      transfer.unitRecordId || transfer.serialNumber || transfer.macAddress || "bulk",
    ].join("::");

    const previous = grouped.get(key) || {
      ...parentAsset,
      ...transfer,
      id: parentAsset.id || transfer.assetRecordId || transfer.id,
      parentAssetId: transfer.assetRecordId || parentAsset.id || "",
      assetRecordId: transfer.assetRecordId || parentAsset.id || "",
      assetId: transfer.assetId || parentAsset.assetId || "",
      deviceName: transfer.deviceName || parentAsset.deviceName || "",
      category: transfer.category || parentAsset.category || "",
      brand: transfer.brand || parentAsset.brand || "",
      selectionKey: `${transfer.assetRecordId || transfer.assetId}::${
        transfer.unitRecordId || transfer.serialNumber || transfer.macAddress || "bulk"
      }`,
      unitRecordId:
        transfer.unitRecordId ||
        transfer.serialNumber ||
        transfer.macAddress ||
        "",
      quantity: 0,
      availableQuantity: 0,
      location: "Customer",
      status: transfer.issueStatus || transfer.newStatus || "Issued",
      customerRecordId: customer.id || "",
      customerId: customer.customerId || "",
      customerName: getCustomerName(customer),
      ownershipType:
        transfer.ownershipType ||
        (transfer.dealType === "Sold" ? "Sold" : transfer.dealType ? "Leased" : ""),
      salePrice: transfer.salePrice || transfer.totalAmount || 0,
      paidAmount: transfer.paidAmount || 0,
      depositAmount: transfer.depositAmount || 0,
      depositReceivedAmount: transfer.depositReceivedAmount || 0,
    };

    const delta = Number(transfer.quantity || 1) * (incoming ? 1 : -1);

    grouped.set(key, {
      ...previous,
      quantity: Number(previous.quantity || 0) + delta,
      availableQuantity: Number(previous.availableQuantity || 0) + delta,
    });
  });

  const transferAssets = Array.from(grouped.values()).filter(
    (asset) => Number(asset.quantity || 0) > 0
  );

  if (transferAssets.length) {
    return transferAssets;
  }

  const legacyAssetOptions = assets.flatMap((asset) => {
    const belongsToCustomer =
      String(asset.customerRecordId || "") === String(customer.id) ||
      String(asset.customerId || "") === String(customer.customerId);

    const unitRecords = Array.isArray(asset.identityRecords)
      ? asset.identityRecords.filter(
          (record) =>
            String(record.customerRecordId || "") === String(customer.id) ||
            String(record.customerId || "") === String(customer.customerId)
        )
      : [];

    if (unitRecords.length) {
      return unitRecords.map((record, index) => buildUnitOption(asset, record, index, "Customer"));
    }

    return belongsToCustomer ? expandAssetOptions(asset, "Customer") : [];
  });

  return mergeSelectableAssets(legacyAssetOptions);
}, [assets, customer, normalizedCustomerTransfers]);


const currentCustomerDeviceCount = currentCustomerAssets.length;

const currentSoldDeviceCount = currentCustomerAssets
  .filter((asset) => asset.ownershipType === "Sold")
  .length;

const currentLeasedDeviceCount = currentCustomerAssets
  .filter((asset) => asset.ownershipType === "Leased")
  .length;

const isSourceCurrentCustomer = (transfer) => {
  if (!customer) return false;

  return (
    String(transfer.fromCustomerRecordId || "") === String(customer.id || "") ||
    String(transfer.fromCustomerId || "") === String(customer.customerId || "")
  );
};

const isDestinationCurrentCustomer = (transfer) => {
  if (!customer) return false;

  return (
    String(transfer.toCustomerRecordId || "") === String(customer.id || "") ||
    String(transfer.toCustomerId || "") === String(customer.customerId || "")
  );
};

const getTransferRowClass = (transfer) => {
  if (isSourceCurrentCustomer(transfer)) {
    return "customer-issue-row-source-current";
  }

  if (isDestinationCurrentCustomer(transfer)) {
    return "customer-issue-row-source-other";
  }

  return "customer-issue-row-neutral";
};

const displayOwnership = (value) =>
  String(value || "") === "Loaned" ? "Leased" : value || "-";

 const availableAssets = useMemo(() => {
  if (formData.sourceType === "Main Stock") {
    return mainStockAssets;
  }

  if (formData.sourceType === "Customer") {
    return customerOwnedAssets;
  }

  if (
    formData.sourceType === "Customer to Main Stock" ||
    formData.sourceType === "Customer to Tower"
  ) {
    return currentCustomerAssets;
  }

  return [];
}, [
  formData.sourceType,
  mainStockAssets,
  customerOwnedAssets,
  currentCustomerAssets,
]);

  const filteredAssets = useMemo(() => {
    const keyword = String(search || "")
      .trim()
      .toLowerCase();

    return availableAssets.filter((asset) => {
      if (!keyword) return true;

      return [
        asset.assetId,
        asset.deviceName,
        asset.category,
        asset.brand,
        asset.model,
        asset.macAddress,
        asset.serialNumber,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [availableAssets, search]);

  const selectedAssets = useMemo(() => {
    const selectedKeys = new Set(
      selectedAssetKeys.map(String)
    );

    return availableAssets
      .filter((asset) => selectedKeys.has(getSelectableAssetKey(asset)))
      .map((asset) => {
        if (isIndividualAsset(asset)) return asset;

        const key = getSelectableAssetKey(asset);
        const availableQuantity = Number(
          asset.availableQuantity ?? asset.quantity ?? 1
        );
        const selectedQuantity = Math.min(
          Math.max(Number(selectedQuantities[key] || 1), 1),
          Math.max(availableQuantity, 1)
        );

        return {
          ...asset,
          quantity: selectedQuantity,
          availableQuantity,
        };
      });
  }, [availableAssets, selectedAssetKeys, selectedQuantities]);

  const getSourceDepositHeld = (asset) =>
    Number(
      asset.depositRemainingAmount ??
        asset.depositAmount ??
        asset.securityDepositPerDevice ??
        asset.previousDepositAmount ??
        0
    );

  const getDefaultIssueSalePrice = (asset) =>
    Number(
      formData.salePrices?.[getSelectableAssetKey(asset)] ??
        asset.salePrice ??
        asset.unitPrice ??
        0
    );

  const manualSaleTotal =
    formData.salePrice !== "" && formData.salePrice !== null
      ? Number(formData.salePrice || 0)
      : null;

  const getIssueSalePrice = (asset) => {
    if (manualSaleTotal !== null) {
      return selectedAssets.length > 1
        ? manualSaleTotal / Math.max(selectedAssets.length, 1)
        : manualSaleTotal;
    }

    const unitPrice = getDefaultIssueSalePrice(asset);

    return isIndividualAsset(asset)
      ? unitPrice
      : Number(asset.quantity || 1) * unitPrice;
  };

  const selectedSaleTotal =
    manualSaleTotal !== null
      ? manualSaleTotal
      : selectedAssets.reduce((sum, asset) => sum + getIssueSalePrice(asset), 0);

  const selectedPaidTotal = Number(formData.paidAmount || 0);

  const selectedRemainTotal =
    formData.ownershipType === "Sold"
      ? Math.max(selectedSaleTotal - selectedPaidTotal, 0)
      : 0;

  const selectedLeasedDepositTotal = selectedAssets.reduce(
    (sum, asset) => sum + getSourceDepositHeld(asset),
    0
  );

  const depositRefundAmount = Number(formData.depositRefundAmount || 0);
  const depositRefundRemaining = Math.max(
    selectedLeasedDepositTotal - depositRefundAmount,
    0
  );

  const getTransferSortValues = (transfer) => {
  const issueDateTime = Date.parse(`${transfer.issueDate || ""}T00:00:00`);
  const createdTime = Date.parse(transfer.createdAt || "");
  const updatedTime = Date.parse(transfer.updatedAt || "");

  const idTime = Number(
    String(transfer.id || "").match(/\d{10,}/)?.[0] || 0
  );

  const referenceTime = Number(
    String(transfer.referenceNumber || "").match(/\d{10,}/)?.[0] || 0
  );

  return {
    issueDateTime: Number.isNaN(issueDateTime) ? 0 : issueDateTime,
    createdTime: Number.isNaN(createdTime) ? 0 : createdTime,
    updatedTime: Number.isNaN(updatedTime) ? 0 : updatedTime,
    idTime,
    referenceTime,
  };
};

  const customerTransferHistory = useMemo(() => {
    if (!customer) {
      return [];
    }

    return normalizedCustomerTransfers
      .filter((item) => {
        const isDepositSummary =
          item.summaryType === "Deposit" ||
          item.issueStatus === "Deposit" ||
          item.transferType === "Deposit" ||
          item.ownershipType === "Deposit" ||
          item.dealType === "Deposit";
        const isWithdrawalSummary =
          item.summaryType === "Withdrawal" ||
          item.issueStatus === "Withdrawal" ||
          item.transferType === "Withdrawal" ||
          item.ownershipType === "Withdrawal" ||
          item.dealType === "Withdrawal";
        const toThisCustomer =
          String(item.toCustomerRecordId || "") === String(customer.id) ||
          String(item.toCustomerId || "") === String(customer.customerId);
        const fromThisCustomer =
          String(item.fromCustomerRecordId || "") === String(customer.id) ||
          String(item.fromCustomerId || "") === String(customer.customerId);

        if (isDepositSummary || isWithdrawalSummary) return false;
        return toThisCustomer || fromThisCustomer;
      })
      .sort((a, b) => {
  const first = getTransferSortValues(a);
  const second = getTransferSortValues(b);

  return (
    second.issueDateTime - first.issueDateTime ||
    second.createdTime - first.createdTime ||
    second.referenceTime - first.referenceTime ||
    second.idTime - first.idTime ||
    second.updatedTime - first.updatedTime
  );
});
  }, [customer, normalizedCustomerTransfers]);

  const filteredCustomerTransferHistory = useMemo(() => {
    const dateFilter = historyFilters.date.trim();
    const sourceFilter = historyFilters.source.trim().toLowerCase();
    const destinationFilter = historyFilters.destination.trim().toLowerCase();

    return customerTransferHistory.filter((item) => {
      const rowDate = String(
        item.issueDate || item.transferDate || item.date || item.createdAt || ""
      ).slice(0, 10);
      const source = String(
        item.fromCustomerName ||
          item.sourceLocation ||
          item.sourceType ||
          item.fromLabel ||
          ""
      ).toLowerCase();
      const destination = String(
        item.toCustomerName ||
          item.destinationLocation ||
          item.destinationType ||
          item.toLabel ||
          ""
      ).toLowerCase();

      return (
        (!dateFilter || rowDate === dateFilter) &&
        (!sourceFilter || source.includes(sourceFilter)) &&
        (!destinationFilter || destination.includes(destinationFilter))
      );
    });
  }, [customerTransferHistory, historyFilters]);

  const totalTransfers = customerTransferHistory.length;

  const incomingCustomerTransfers = customerTransferHistory.filter((item) =>
    isDestinationCurrentCustomer(item)
  );

  const outgoingCustomerTransfers = customerTransferHistory.filter((item) =>
    isSourceCurrentCustomer(item)
  );

  const LeasedTransfers = customerTransferHistory.filter(
    (item) => item.ownershipType === "Leased"
  ).length;

  const soldTransfers = customerTransferHistory.filter(
    (item) => item.ownershipType === "Sold"
  ).length;

  const depositDetailRows = customerTransferHistory.filter(
    (item) => Number(item.depositAmount || 0) || Number(item.depositRefundAmount || item.refundAmount || 0)
  );

  const totalDepositsByCurrency = depositDetailRows.reduce((totals, item) => {
      const isIncoming =
        String(item.toCustomerRecordId || "") === String(customer?.id || "") ||
        String(item.toCustomerId || "") === String(customer?.customerId || "");
      const isOutgoing =
        String(item.fromCustomerRecordId || "") === String(customer?.id || "") ||
        String(item.fromCustomerId || "") === String(customer?.customerId || "");
      const depositIn = isIncoming ? Number(item.depositAmount || 0) : 0;
      const depositOut = isOutgoing
        ? Number(item.depositRefundAmount || item.refundAmount || 0)
        : 0;
      const currency = item.depositCurrency || "AFN";
      const nextAmount = Math.max(Number(totals[currency] || 0) + depositIn - depositOut, 0);

      return {
        ...totals,
        [currency]: nextAmount,
      };
    }, {});

  const totalDepositsText =
    Object.entries(totalDepositsByCurrency)
      .filter(([, amount]) => Number(amount || 0) > 0)
      .map(([currency, amount]) => `${money(amount)} ${currency}`)
      .join(" / ") || "0 AFN";

  const summaryViewConfig = {
    current: {
      title: "Current Assets With Customer",
      description: "Assets currently held by this customer, listed one by one.",
      rows: currentCustomerAssets.map((asset) => ({
        id: getAssetKey(asset),
        date: asset.issueDate || asset.transferDate || asset.createdAt,
        category: asset.category || "-",
        asset: `${asset.assetId || "-"} - ${asset.deviceName || "-"}`,
        source: asset.sourceLocation || asset.fromCustomerName || asset.previousAssetLocation || "-",
        receiver: getCustomerName(customer),
        ownership: displayOwnership(asset.ownershipType),
        quantity: asset.quantity || 1,
        status: asset.status || asset.issueStatus || "-",
      })),
      empty: "No current asset is recorded for this customer.",
    },
    incoming: {
      title: "Assets Received By This Customer",
      description: "Every device that came from another source to this customer.",
      rows: incomingCustomerTransfers.map((item) => ({
        id: item.id || item.transferId,
        date: item.issueDate || item.transferDate || item.createdAt,
        category: item.category || "-",
        asset: `${item.assetId || "-"} - ${item.deviceName || "-"}`,
        source: item.fromCustomerName || item.sourceLocation || "Main Stock",
        receiver: item.toCustomerName || getCustomerName(customer),
        ownership: displayOwnership(item.ownershipType || item.dealType),
        quantity: item.quantity || 1,
        status: item.issueStatus || item.status || "-",
      })),
      empty: "No incoming transfer was found for this customer.",
    },
    outgoing: {
      title: "Assets Sent By This Customer",
      description: "Every device sent from this customer to another destination.",
      rows: outgoingCustomerTransfers.map((item) => ({
        id: item.id || item.transferId,
        date: item.issueDate || item.transferDate || item.createdAt,
        category: item.category || "-",
        asset: `${item.assetId || "-"} - ${item.deviceName || "-"}`,
        source: item.fromCustomerName || getCustomerName(customer),
        receiver: item.toCustomerName || item.destinationLocation || "Main Stock",
        ownership: displayOwnership(item.ownershipType || item.dealType),
        quantity: item.quantity || 1,
        status: item.issueStatus || item.status || "-",
      })),
      empty: "No outgoing transfer was found for this customer.",
    },
  };

  const activeSummary = summaryViewConfig[activeSummaryView];

  const customerBuybackRecords = customer
    ? customerDeviceBuybacks.filter(
        (item) =>
          String(item.customerId || "") === String(customer.customerId) ||
          String(item.customerRecordId || "") === String(customer.id)
      )
    : [];

  const boughtBackTransferIds = new Set(
    customerBuybackRecords.flatMap((record) =>
      Array.isArray(record.items)
        ? record.items.map((item) => String(item.transferId || ""))
        : []
    )
  );

  const buybackAvailableDevices = customerTransferHistory.filter(
    (item) => {
      const transferId = String(item.id || "");
      const belongsToEditingRecord = (editBuybackRecord?.items || []).some(
        (recordItem) => String(recordItem.transferId || "") === transferId
      );

      return (
        item.ownershipType === "Sold" &&
        isDestinationCurrentCustomer(item) &&
        (!boughtBackTransferIds.has(transferId) || belongsToEditingRecord)
      );
    }
  );

  const selectedBuybackDevices = buybackAvailableDevices.filter((item) =>
    buybackForm.selectedTransferIds.includes(String(item.id || ""))
  );

  const buybackTotal = selectedBuybackDevices.reduce((sum, item) => {
    const transferId = String(item.id || "");
    const price = Number(
      buybackForm.purchasePrices[transferId] ??
        item.salePrice ??
        item.totalAmount ??
        0
    );
    return sum + price;
  }, 0);

  const buybackPaid = Number(buybackForm.paidAmount || 0);
  const buybackRemaining = Math.max(buybackTotal - buybackPaid, 0);

  const resetBuybackForm = () => {
    setEditBuybackRecord(null);
    setBuybackForm({
      purchaseDate: new Date().toISOString().slice(0, 10),
      destination: "Main Stock",
      selectedTransferIds: [],
      purchasePrices: {},
      purchasedBy: "",
      paidAmount: "",
      notes: "",
    });
  };

  const applyBuybackStock = (baseAssets, record, multiplier = 1) => {
    const items = Array.isArray(record?.items) ? record.items : [];

    return baseAssets.map((asset) => {
      const matchingItems = items.filter(
        (item) =>
          String(item.assetRecordId || "") === String(asset.id || "") ||
          String(item.assetId || "") === String(asset.assetId || "")
      );

      if (!matchingItems.length) return asset;

      const quantityDelta =
        matchingItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0) *
        multiplier;
      const nextIdentityRecords = Array.isArray(asset.identityRecords)
        ? asset.identityRecords.map((unit) => {
            const matched = matchingItems.some(
              (item) =>
                String(item.unitRecordId || "") === String(unit.id || "") ||
                String(item.macAddress || "") === String(unit.macAddress || "") ||
                String(item.serialNumber || "") === String(unit.serialNumber || "")
            );

            if (!matched) return unit;

            return {
              ...unit,
              location: multiplier > 0 ? "Main Stock" : "Customer",
              status: multiplier > 0 ? "In Stock" : "Issued",
              customerRecordId: multiplier > 0 ? "" : record.customerRecordId || customer?.id || "",
              updatedAt: new Date().toISOString(),
            };
          })
        : asset.identityRecords;

      return {
        ...asset,
        quantity: Math.max(Number(asset.quantity || 0) + quantityDelta, 0),
        location: multiplier > 0 ? "Main Stock" : "Customer",
        status: multiplier > 0 ? "In Stock" : "Issued",
        customerRecordId: multiplier > 0 ? "" : record.customerRecordId || customer?.id || "",
        identityRecords: nextIdentityRecords,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const openEditBuyback = (record) => {
    const purchasePrices = {};
    const selectedTransferIds = (record.items || []).map((item) => {
      const transferId = String(item.transferId || "");
      purchasePrices[transferId] = item.purchasePrice ?? "";
      return transferId;
    });

    setEditBuybackRecord(record);
    setBuybackForm({
      purchaseDate: record.purchaseDate || new Date().toISOString().slice(0, 10),
      destination: record.destination || "Main Stock",
      selectedTransferIds,
      purchasePrices,
      purchasedBy: record.purchasedBy || "",
      paidAmount: String(record.paidAmount || ""),
      notes: record.notes || "",
    });
    setShowBuybackModal(true);
  };

  const deleteBuyback = async (record) => {
    const ok = await confirmAction({
      title: "Delete Customer Purchase",
      message: "Delete this customer purchase record?",
      confirmText: "Delete",
    });
    if (!ok) return;

    const assetsSaved = await setAssets(applyBuybackStock(assets, record, -1));
    if (!assetsSaved) return;

    const recordsSaved = await setCustomerDeviceBuybacks(
      customerDeviceBuybacks.filter((item) => String(item.id) !== String(record.id))
    );
    if (!recordsSaved) return;

    const expenseRemoved = await setTransactions((previous) =>
      previous.filter(
        (item) =>
          !(
            item.source === "customer-device-buyback" &&
            String(item.referenceId || "") === String(record.id)
          )
      )
    );
    if (!expenseRemoved) return;

    notify("Customer purchase deleted and stock was adjusted.");
  };

  const toggleBuybackDevice = (transfer) => {
    const transferId = String(transfer.id || "");

    setBuybackForm((previous) => {
      const selected = previous.selectedTransferIds.includes(transferId);

      return {
        ...previous,
        selectedTransferIds: selected
          ? previous.selectedTransferIds.filter((item) => item !== transferId)
          : [...previous.selectedTransferIds, transferId],
        purchasePrices: {
          ...previous.purchasePrices,
          [transferId]:
            previous.purchasePrices[transferId] ??
            transfer.salePrice ??
            transfer.totalAmount ??
            "",
        },
      };
    });
  };

  const saveBuyback = async (event) => {
    event.preventDefault();

    if (!customer) return;

    if (!selectedBuybackDevices.length) {
      notify("Please select at least one sold device to purchase from this customer.", "error");
      return;
    }

    if (buybackPaid > buybackTotal) {
      notify("Paid amount cannot be greater than total purchase amount.", "error");
      return;
    }

    const timestamp = Date.now();
    const createdAt = new Date().toISOString();
    const record = {
      id: editBuybackRecord?.id || `customer-buyback-${timestamp}`,
      customerRecordId: customer.id || "",
      customerId: customer.customerId || "",
      customerName: getCustomerName(customer),
      purchaseDate: buybackForm.purchaseDate,
      destination: "Main Stock",
      purchasedBy: buybackForm.purchasedBy.trim(),
      totalAmount: buybackTotal,
      paidAmount: buybackPaid,
      remainingAmount: buybackRemaining,
      notes: buybackForm.notes.trim(),
      items: selectedBuybackDevices.map((item) => {
        const transferId = String(item.id || "");
        return {
          transferId,
          assetRecordId: item.assetRecordId || "",
          assetId: item.assetId || "",
          unitRecordId: item.unitRecordId || "",
          deviceName: item.deviceName || "",
          category: item.category || "",
          model: item.model || "",
          macAddress: item.macAddress || "",
          serialNumber: item.serialNumber || "",
          quantity: Number(item.quantity || 1),
          purchasePrice: Number(
            buybackForm.purchasePrices[transferId] ??
              item.salePrice ??
              item.totalAmount ??
              0
          ),
        };
      }),
      createdAt: editBuybackRecord?.createdAt || createdAt,
      updatedAt: createdAt,
    };

    let nextAssets = assets;
    if (editBuybackRecord) {
      nextAssets = applyBuybackStock(nextAssets, editBuybackRecord, -1);
    }
    nextAssets = applyBuybackStock(nextAssets, record, 1);

    const assetsSaved = await setAssets(nextAssets);
    if (!assetsSaved) return;

    const saved = await setCustomerDeviceBuybacks(
      editBuybackRecord
        ? customerDeviceBuybacks.map((item) =>
            String(item.id) === String(editBuybackRecord.id) ? record : item
          )
        : [...customerDeviceBuybacks, record]
    );
    if (!saved) return;

    const expenseSaved = await setTransactions((previous) => [
      ...previous.filter(
        (item) =>
          !(
            item.source === "customer-device-buyback" &&
            String(item.referenceId || "") === String(record.id)
          )
      ),
      ...(buybackPaid > 0
        ? [
            {
          id: `customer-buyback-expense-${timestamp}`,
          type: "expense",
          category: "Customer Device Purchase",
          title: `Purchase From Customer - ${getCustomerName(customer)}`,
          amount: buybackPaid,
          date: buybackForm.purchaseDate,
          description: `Paid amount for ${record.items.length} device purchase item(s).`,
          source: "customer-device-buyback",
          referenceId: record.id,
          customerRecordId: customer.id || "",
          customerId: customer.customerId || "",
          createdAt,
          updatedAt: createdAt,
        },
          ]
        : []),
    ]);
    if (!expenseSaved) return;

    notify(editBuybackRecord ? "Customer purchase updated successfully." : "Customer purchase saved successfully.");
    resetBuybackForm();
    setShowBuybackModal(false);
  };

  useEffect(() => {
    if (!openActionId) {
      return undefined;
    }

    const closeMenu = () => {
      setOpenActionId(null);
    };

    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      document.removeEventListener(
        "mousedown",
        closeMenu
      );

      window.removeEventListener(
        "resize",
        closeMenu
      );

      window.removeEventListener(
        "scroll",
        closeMenu,
        true
      );
    };
  }, [openActionId]);

  const resetIssueForm = () => {
    setFormData(createEmptyIssueForm());
    setSelectedAssetKeys([]);
    setSelectedQuantities({});
    setSearch("");
  };

  const openIssueModal = () => {
    resetIssueForm();
    setShowIssueModal(true);
  };

  const closeIssueModal = () => {
    resetIssueForm();
    setShowIssueModal(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = value;

    if (
      name === "sourceType" ||
      name === "fromCustomerId" ||
      name === "destinationCustomerId" ||
      name === "destinationTowerId"
    ) {
      setSelectedAssetKeys([]);
      setSelectedQuantities({});
    }

    setFormData((previous) => {
      const nextData = {
        ...previous,
        [name]: nextValue,
      };

      if (name === "sourceType") {
  nextData.fromCustomerId = "";
  nextData.destinationCustomerId = "";
  nextData.destinationTowerId = "";

  if (value === "Customer to Main Stock" || value === "Customer to Tower") {
    nextData.ownershipType = "";
    nextData.salePrice = "";
    nextData.paidAmount = "";
    nextData.remainAmount = "";
    nextData.salePrices = {};
    nextData.depositRefundAmount = "";
    nextData.depositAmount = "";
    nextData.depositStatus = "";
    nextData.issueStatus =
      value === "Customer to Tower" ? "Installed" : "Returned";
  } else {
    nextData.ownershipType = "Leased";
    nextData.depositStatus = "Held";
    nextData.issueStatus = "Issued";
  }
}

      if (name === "ownershipType") {
        nextData.salePrice = "";
        nextData.paidAmount = "";
        nextData.remainAmount = "";
        nextData.salePrices = {};
        nextData.depositRefundAmount = "";
        nextData.depositAmount = "";
        nextData.depositStatus = "Held";
      }

      const salePrice =
        name === "salePrice"
          ? Number(nextValue || 0)
          : Number(nextData.salePrice || 0);

      const paidAmount =
        name === "paidAmount"
          ? Number(nextValue || 0)
          : Number(nextData.paidAmount || 0);

      if (nextData.ownershipType === "Sold") {
        nextData.remainAmount = Math.max(
          salePrice - paidAmount,
          0
        );
      } else {
        nextData.remainAmount = "";
      }

      return nextData;
    });
  };

  const updateSelectedSalePrice = (asset, value) => {
      const key = getSelectableAssetKey(asset);

    setFormData((previous) => ({
      ...previous,
      salePrices: {
        ...(previous.salePrices || {}),
        [key]: value,
      },
    }));
  };

  const isLockedSoldCustomerAsset = () => false;

  const toggleAssetSelection = (asset) => {
    const assetKey = getSelectableAssetKey(asset);

    setSelectedAssetKeys((previous) => {
      const exists = previous.some(
        (key) => String(key) === assetKey
      );

      if (exists) {
        setSelectedQuantities((previousQuantities) => {
          const next = { ...previousQuantities };
          delete next[assetKey];
          return next;
        });

        return previous.filter(
          (key) => String(key) !== assetKey
        );
      }

      if (!isIndividualAsset(asset)) {
        setSelectedQuantities((previousQuantities) => ({
          ...previousQuantities,
          [assetKey]: previousQuantities[assetKey] || 1,
        }));
      }

      return [...previous, assetKey];
    });
  };

  const selectAllVisibleAssets = () => {
      const visibleKeys = filteredAssets.map(getSelectableAssetKey);

    const nextQuantities = {};
    filteredAssets
      .filter((asset) => !isIndividualAsset(asset))
      .forEach((asset) => {
        const key = getSelectableAssetKey(asset);
        nextQuantities[key] = selectedQuantities[key] || 1;
      });

    setSelectedAssetKeys((previous) => {
      const nextKeys = new Set(
        previous.map(String)
      );

      visibleKeys.forEach((key) => {
        nextKeys.add(String(key));
      });

      return [...nextKeys];
    });

    setSelectedQuantities((previous) => ({
      ...previous,
      ...nextQuantities,
    }));
  };

  const updateSelectedQuantity = (asset, value) => {
    const key = getSelectableAssetKey(asset);
    const maxQuantity = Math.max(
      Number(asset.availableQuantity ?? asset.quantity ?? 1),
      1
    );
    const nextQuantity = Math.min(
      Math.max(Number(value || 1), 1),
      maxQuantity
    );

    setSelectedQuantities((previous) => ({
      ...previous,
      [key]: nextQuantity,
    }));
  };

  const toggleActionMenu = (
    event,
    transferId
  ) => {
    event.stopPropagation();

    if (
      String(openActionId) ===
      String(transferId)
    ) {
      setOpenActionId(null);
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const menuWidth = 180;
    const menuHeight = 132;
    const gap = 8;

    const left = Math.min(
      Math.max(
        rect.right - menuWidth,
        12
      ),
      window.innerWidth - menuWidth - 12
    );

    const hasSpaceBelow =
      window.innerHeight - rect.bottom >=
      menuHeight + gap;

    const top = hasSpaceBelow
      ? rect.bottom + gap
      : Math.max(
          12,
          rect.top - menuHeight - gap
        );

    setActionMenuPosition({
      top,
      left,
    });

    setOpenActionId(transferId);
  };

  const saveIssueDevice = async (event) => {
    event.preventDefault();

    if (!customer) return;

    if (formData.sourceType === "Main Stock") {
      notify(
        "Main Stock to Customer is not allowed from this form. Send devices from the Asset section first.",
        "error"
      );
      return;
    }

    if (!selectedAssets.length) {
      notify(
        "Please select at least one device.",
        "error"
      );

      return;
    }

    if (
      formData.sourceType === "Customer" &&
      !formData.fromCustomerId
    ) {
      notify(
        "Please select a source customer.",
        "error"
      );

      return;
    }

    if (
      formData.sourceType === "Customer" &&
      String(formData.fromCustomerId) ===
        String(customer.id) &&
      !formData.destinationCustomerId
    ) {
      notify(
        "Please select a destination customer.",
        "error"
      );

      return;
    }

    if (
      formData.sourceType === "Customer" &&
      String(formData.fromCustomerId) === String(customer.id) &&
      String(formData.destinationCustomerId) === String(customer.id)
    ) {
      notify(
        "Source customer and destination customer cannot be the same.",
        "error"
      );

      return;
    }


    const isReturnToMainStock =
  formData.sourceType === "Customer to Main Stock";
    const isCustomerToTower =
  formData.sourceType === "Customer to Tower";

const fromCustomer =
  formData.sourceType === "Customer"
    ? customers.find(
        (item) =>
          String(item.id) === String(formData.fromCustomerId)
      )
    : isReturnToMainStock || isCustomerToTower
      ? customer
      : null;

const destinationCustomer =
  formData.sourceType === "Customer" &&
  String(formData.fromCustomerId) === String(customer.id)
    ? customers.find(
        (item) =>
          String(item.id) === String(formData.destinationCustomerId)
      )
    : isReturnToMainStock
      ? null
      : customer;
const destinationTower = isCustomerToTower
  ? towerAssets.find(
      (tower) => String(tower.id || "") === String(formData.destinationTowerId || "")
    )
  : null;

    if (isCustomerToTower && !destinationTower) {
      notify("Please select a destination tower.", "error");
      return;
    }

    const isSoldTransfer =
      !isReturnToMainStock &&
      !isCustomerToTower &&
      formData.ownershipType === "Sold";

    const totalSaleAmount = isSoldTransfer
      ? selectedAssets.reduce((sum, asset) => sum + getIssueSalePrice(asset), 0)
      : 0;

const totalPaidAmount = isSoldTransfer
  ? Number(formData.paidAmount || 0)
  : 0;

    const depositAmount =
  !isReturnToMainStock &&
  !isCustomerToTower &&
  formData.ownershipType === "Leased"
    ? Number(formData.depositAmount || 0)
    : 0;

    if (isSoldTransfer && totalPaidAmount > totalSaleAmount) {
      notify("Paid amount cannot be greater than total sale amount.", "error");
      return;
    }

    const timestamp = Date.now();
    const batchId = `batch-${timestamp}`;
    const referenceNumber = `CUS-TRF-${timestamp}`;
    const createdAt =
      new Date().toISOString();

    const transferTypeLabel =
      formData.sourceType === "Main Stock"
        ? "Main Stock to Customer"
        : formData.sourceType === "Customer"
          ? "Customer to Customer"
          : isCustomerToTower
            ? "Customer to Tower"
            : "Customer to Main Stock";

    let remainingPaidAmount = totalPaidAmount;
    let remainingRefundAmount = Number(formData.depositRefundAmount || 0);

    const newTransferRecords =
      selectedAssets.map((asset, index) => {
        const itemSalePrice = isSoldTransfer ? getIssueSalePrice(asset) : 0;
        const itemPaidAmount = isSoldTransfer
          ? Math.min(itemSalePrice, Math.max(remainingPaidAmount, 0))
          : 0;

        if (isSoldTransfer) {
          remainingPaidAmount = Math.max(
            remainingPaidAmount - itemPaidAmount,
            0
          );
        }

        const itemRemainAmount = isSoldTransfer
          ? Math.max(itemSalePrice - itemPaidAmount, 0)
          : 0;
        const previousDepositAmount = getSourceDepositHeld(asset);
        const itemRefundAmount =
          !isReturnToMainStock &&
          !isCustomerToTower &&
          formData.ownershipType === "Leased"
            ? Math.min(previousDepositAmount, Math.max(remainingRefundAmount, 0))
            : 0;

        if (itemRefundAmount > 0) {
          remainingRefundAmount = Math.max(
            remainingRefundAmount - itemRefundAmount,
            0
          );
        }

        return ({
        id: `${timestamp}-${index}`,
        batchId,
        referenceNumber,
        batchSize: selectedAssets.length,
        createdFromCustomerId: customer?.id || "",
        createdFromCustomerCode: customer?.customerId || "",
        sourcePage: "customer-device-transfer",

        transferType: transferTypeLabel,

        fromType: formData.sourceType,

        fromCustomerRecordId:
          fromCustomer?.id || "",

        fromCustomerId:
          fromCustomer?.customerId || "",

        fromCustomerName: fromCustomer
          ? getCustomerName(fromCustomer)
          : "Main Stock",

        toCustomerRecordId:
  isReturnToMainStock || isCustomerToTower ? "" : destinationCustomer?.id || "",

toCustomerId:
  isReturnToMainStock || isCustomerToTower
    ? ""
    : destinationCustomer?.customerId || "",

toCustomerName:
  isReturnToMainStock
    ? "Main Stock"
    : isCustomerToTower
    ? destinationTower?.towerName || "Tower"
    : getCustomerName(destinationCustomer),
        toTowerRecordId:
          isCustomerToTower ? destinationTower?.id || "" : "",
        toTowerName:
          isCustomerToTower ? destinationTower?.towerName || "" : "",
        toTowerLocation:
          isCustomerToTower ? destinationTower?.towerLocation || "" : "",

        assetRecordId:
          asset.assetRecordId || asset.parentAssetId || asset.id || "",
        parentAssetId:
          asset.assetRecordId || asset.parentAssetId || asset.id || "",

        assetId:
          asset.assetId || "",

        deviceName:
          asset.deviceName || "",

        category:
          asset.category || "",

        brand:
          asset.brand || "",

        model:
          asset.model || "",

        macAddress:
          asset.macAddress || "",

        serialNumber:
          asset.serialNumber || "",

        previousAssetLocation:
          asset.location || "Main Stock",

        previousAssetStatus:
          asset.status || "In Stock",

        previousOwnershipType:
          asset.ownershipType || "",

        previousCustomerRecordId:
          asset.customerRecordId || "",

        previousCustomerId:
          asset.customerId || "",

        previousCustomerName:
          asset.customerName || "",

        issueDate:
          formData.issueDate,

        issueStatus:
  isReturnToMainStock
    ? "Returned"
    : isCustomerToTower
    ? "Installed"
    : formData.issueStatus,

ownershipType:
  isReturnToMainStock || isCustomerToTower
    ? ""
    : formData.ownershipType,

        salePrice: itemSalePrice,
        paidAmount: itemPaidAmount,
        remainAmount: itemRemainAmount,
        depositAmount,
        depositCurrency: formData.depositCurrency || "AFN",
        previousDepositAmount,
        depositRefundAmount: itemRefundAmount,
        depositRemainingAmount: Math.max(previousDepositAmount - itemRefundAmount, 0),

        depositStatus:
  !isReturnToMainStock &&
  !isCustomerToTower &&
  formData.ownershipType === "Leased"
    ? formData.depositStatus
    : "",
        notes:
          formData.notes.trim(),

        createdAt,
        updatedAt: createdAt,
      });
      });

    const selectedByParent = new Map();

    selectedAssets.forEach((asset) => {
      const parentId = getParentAssetId(asset);
      const list = selectedByParent.get(parentId) || [];
      list.push(asset);
      selectedByParent.set(parentId, list);
    });

    const getSelectedUnitsForAsset = (asset) =>
      selectedByParent.get(String(asset.id || "")) ||
      selectedByParent.get(String(asset.assetId || "")) ||
      selectedByParent.get(String(asset.assetRecordId || "")) ||
      selectedByParent.get(String(asset.parentAssetId || "")) ||
      [];

    const updatedAssets = assets.map(
      (asset) => {
        const selectedUnits = getSelectedUnitsForAsset(asset);

        if (!selectedUnits?.length) {
          return asset;
        }

        const selectedUnitKeys = new Set(
          selectedUnits.map((unit) => String(unit.unitRecordId || unit.serialNumber || unit.macAddress || ""))
        );
        const selectedQuantity = selectedUnits.reduce(
          (sum, unit) => sum + Number(unit.quantity || 1),
          0
        );
        const nextMainStockQuantity = Math.max(
          Number(asset.quantity || 0) - selectedQuantity,
          0
        );
        const assetBelongsToSourceCustomer =
          fromCustomer &&
          (String(asset.customerRecordId || "") === String(fromCustomer.id) ||
            String(asset.customerId || "") ===
              String(fromCustomer.customerId));
        const shouldMoveWholeAssetToCustomer =
          formData.sourceType === "Customer"
            ? assetBelongsToSourceCustomer
            : formData.sourceType === "Main Stock" &&
              !isIndividualAsset(asset) &&
              nextMainStockQuantity === 0;

        if (isReturnToMainStock) {
  const existingKeys = new Set(
    (asset.identityRecords || []).map((record) =>
      String(record.id || record.serialNumber || record.macAddress || "")
    )
  );
  const restoredIdentityRecords = selectedUnits
    .filter((unit) => unit.unitRecordId || unit.serialNumber || unit.macAddress)
    .filter(
      (unit) =>
        !existingKeys.has(
          String(unit.unitRecordId || unit.serialNumber || unit.macAddress || "")
        )
    )
    .map((unit) => ({
      id: unit.unitRecordId || unit.serialNumber || unit.macAddress,
      model: unit.model || "",
      macAddress: unit.macAddress || "",
      serialNumber: unit.serialNumber || "",
      category: unit.category || asset.category || "",
      unitPrice: unit.unitPrice || unit.salePrice || asset.unitPrice || 0,
      addedAt: createdAt,
      sourceType: "Customer Return",
    }));

  return {
    ...asset,

    location: "Main Stock",
    status: "Returned",
    ownershipType: "",
    quantity: Number(asset.quantity || 0) + selectedQuantity,
    identityRecords: isIndividualAsset(asset)
      ? [...(asset.identityRecords || []), ...restoredIdentityRecords]
      : asset.identityRecords || [],

    previousCustomerRecordId:
      customer.id || asset.customerRecordId || "",

    previousCustomerId:
      customer.customerId || asset.customerId || "",

    previousCustomerName:
      getCustomerName(customer),

    customerRecordId: "",
    customerId: "",
    customerName: "",

    lastTransferId:
      newTransferRecords.find(
        (record) =>
          String(record.assetRecordId || "") === String(asset.id || "")
      )?.id || "",
    lastTransferDate: formData.issueDate,
    returnedToStockDate: formData.issueDate,

    updatedAt: createdAt,
  };
}

if (isCustomerToTower) {
  return {
    ...asset,

    location: "Tower",
    status: "Installed",
    ownershipType: "",
    towerRecordId: destinationTower?.id || "",
    towerName: destinationTower?.towerName || "",
    towerLocation: destinationTower?.towerLocation || "",
    previousCustomerRecordId:
      customer.id || asset.customerRecordId || "",
    previousCustomerId:
      customer.customerId || asset.customerId || "",
    previousCustomerName:
      getCustomerName(customer),
    customerRecordId: "",
    customerId: "",
    customerName: "",
    lastTransferId:
      newTransferRecords.find(
        (record) =>
          String(record.assetRecordId || "") === String(asset.id || "")
      )?.id || "",
    lastTransferDate: formData.issueDate,
    updatedAt: createdAt,
  };
}

return {
  ...asset,

  location: shouldMoveWholeAssetToCustomer ? "Customer" : asset.location,

  status:
    !shouldMoveWholeAssetToCustomer
      ? asset.status
      : formData.ownershipType === "Sold"
      ? "Sold"
      : formData.issueStatus,

  ownershipType:
    shouldMoveWholeAssetToCustomer
      ? formData.ownershipType
      : asset.ownershipType,

  customerRecordId:
    shouldMoveWholeAssetToCustomer
      ? destinationCustomer?.id || ""
      : asset.customerRecordId || "",

  customerId:
    shouldMoveWholeAssetToCustomer
      ? destinationCustomer?.customerId || ""
      : asset.customerId || "",

  customerName:
    shouldMoveWholeAssetToCustomer
      ? getCustomerName(destinationCustomer)
      : asset.customerName || "",
  quantity:
    formData.sourceType === "Main Stock"
      ? nextMainStockQuantity
      : Number(asset.quantity || 0),
  identityRecords:
    formData.sourceType === "Main Stock" && isIndividualAsset(asset)
      ? (asset.identityRecords || []).filter((record) => {
          const key = String(
            record.id || record.serialNumber || record.macAddress || ""
          );
          return !selectedUnitKeys.has(key);
        })
      : asset.identityRecords || [],

  previousCustomerRecordId:
    fromCustomer?.id ||
    asset.customerRecordId ||
    "",

  previousCustomerId:
    fromCustomer?.customerId ||
    asset.customerId ||
    "",

  previousCustomerName:
    fromCustomer
      ? getCustomerName(fromCustomer)
      : asset.customerName || "",

  lastTransferId:
    newTransferRecords.find(
      (record) =>
        String(record.assetRecordId || "") === String(asset.id || "")
    )?.id || "",

  lastTransferDate:
    formData.issueDate,

  updatedAt: createdAt,
};
      }
    );

    const assetsSaved =
      await setAssets(updatedAssets);

    if (!assetsSaved) {
      return;
    }

    if (isCustomerToTower) {
      const towerUnits = selectedAssets.map((unit) => ({
        ...unit,
        location: "Tower",
        status: "Installed",
        ownershipType: "",
        customerRecordId: "",
        customerId: "",
        customerName: "",
        towerRecordId: destinationTower?.id || "",
        towerName: destinationTower?.towerName || "",
        towerLocation: destinationTower?.towerLocation || "",
        sourceType: "Customer",
        lastTowerTransferDate: formData.issueDate,
        updatedAt: createdAt,
      }));
      const towerSaved = await setTowerAssets((previousTowers) =>
        previousTowers.map((tower) => {
          if (String(tower.id || "") !== String(destinationTower?.id || "")) {
            return tower;
          }

          const existingAssets = Array.isArray(tower.assets) ? tower.assets : [];
          const existingKeys = new Set(existingAssets.map(getAssetKey));
          const nextAssets = [
            ...existingAssets,
            ...towerUnits.filter((unit) => !existingKeys.has(getAssetKey(unit))),
          ];

          return {
            ...tower,
            assets: nextAssets,
            assetCount: nextAssets.length,
            updatedAt: createdAt,
          };
        })
      );

      if (!towerSaved) {
        return;
      }

      const towerTransferRecords = selectedAssets.map((unit, index) => ({
        id: `${timestamp}-tower-${index}`,
        batchId,
        batchSize: selectedAssets.length,
        transferType: "Customer to Tower",
        referenceNumber,
        quantity: Number(unit.quantity || 1),
        sourceType: "Customer",
        sourceCustomerId: customer.customerId || "",
        sourceCustomerRecordId: customer.id || "",
        sourceCustomerName: getCustomerName(customer),
        sourceTowerId: "",
        sourceTowerName: getCustomerName(customer),
        sourceTowerLocation: "",
        destinationType: "Tower",
        destinationTowerId: destinationTower?.id || "",
        destinationTowerName: destinationTower?.towerName || "",
        destinationTowerLocation: destinationTower?.towerLocation || "",
        parentAssetId: unit.parentAssetId || unit.assetRecordId || unit.id || "",
        assetRecordId: unit.assetRecordId || unit.parentAssetId || unit.id || "",
        assetId: unit.assetId || "",
        deviceName: unit.deviceName || "",
        category: unit.category || "",
        brand: unit.brand || "",
        model: unit.model || "",
        macAddress: unit.macAddress || "",
        serialNumber: unit.serialNumber || "",
        transferDate: formData.issueDate,
        transferStatus: "Completed",
        responsiblePerson: "",
        sourcePage: "customer-device-transfer",
        createdFromCustomerId: customer.id || "",
        createdFromCustomerCode: customer.customerId || "",
        notes: formData.notes.trim(),
        createdAt,
        updatedAt: createdAt,
      }));

      const towerTransfersSaved = await setTowerAssetTransfers([
        ...towerAssetTransfers,
        ...towerTransferRecords,
      ]);

      if (!towerTransfersSaved) {
        return;
      }
    }

    const movementRecords = Array.from(selectedByParent.entries()).map(
      ([parentId, selectedUnits], index) => {
        const parentAsset =
          assets.find((asset) => String(asset.id || "") === String(parentId)) ||
          selectedUnits[0] ||
          {};
        const quantity = selectedUnits.reduce(
          (sum, unit) => sum + Number(unit.quantity || 1),
          0
        );
        const identityRecords = selectedUnits
          .filter((unit) => unit.unitRecordId || unit.serialNumber || unit.macAddress)
          .map((unit) => ({
            id: unit.unitRecordId || unit.serialNumber || unit.macAddress,
            model: unit.model || "",
            macAddress: unit.macAddress || "",
            serialNumber: unit.serialNumber || "",
            category: unit.category || parentAsset.category || "",
            unitPrice:
              unit.unitPrice ||
              parentAsset.unitPrice ||
              getIssueSalePrice(unit) ||
              0,
          }));
        const relatedTransferRecords = newTransferRecords.filter(
          (record) =>
            String(record.assetRecordId || "") ===
            String(parentAsset.id || selectedUnits[0]?.assetRecordId || "")
        );
        const movementSaleTotal = relatedTransferRecords.reduce(
          (sum, record) => sum + Number(record.salePrice || 0),
          0
        );
        const movementPaidTotal = relatedTransferRecords.reduce(
          (sum, record) => sum + Number(record.paidAmount || 0),
          0
        );
        const movementRemainTotal = Math.max(
          movementSaleTotal - movementPaidTotal,
          0
        );

        return {
          id: `asset-movement-${timestamp}-${index}`,
          parentAssetId: parentAsset.id || selectedUnits[0]?.assetRecordId || "",
          assetRecordId: parentAsset.id || selectedUnits[0]?.assetRecordId || "",
          assetId: parentAsset.assetId || selectedUnits[0]?.assetId || "",
          deviceName:
            parentAsset.deviceName || selectedUnits[0]?.deviceName || "",
          category: parentAsset.category || selectedUnits[0]?.category || "",
          movementType: "Transfer",
          transferType: transferTypeLabel,
          dealType:
            isReturnToMainStock || isCustomerToTower
              ? ""
              : formData.ownershipType,
          batchId,
          referenceNumber,
          date: formData.issueDate,
          quantity,
          identityRecords,
          sourceName: fromCustomer ? getCustomerName(fromCustomer) : "Main Stock",
          sourceRecordId: fromCustomer?.id || "",
          sourceCustomerId: fromCustomer?.customerId || "",
          destinationName: isReturnToMainStock
            ? "Main Stock"
            : isCustomerToTower
            ? destinationTower?.towerName || "Tower"
            : getCustomerName(destinationCustomer),
          destinationType: isReturnToMainStock
            ? "Main Stock"
            : isCustomerToTower
            ? "Tower"
            : "Customer",
          destinationRecordId: isReturnToMainStock
            ? ""
            : isCustomerToTower
            ? destinationTower?.id || ""
            : destinationCustomer?.id || "",
          destinationCustomerId: isReturnToMainStock
            ? ""
            : isCustomerToTower
            ? ""
            : destinationCustomer?.customerId || "",
          totalAmount:
            formData.ownershipType === "Sold" &&
            !isReturnToMainStock &&
            !isCustomerToTower
              ? movementSaleTotal
              : 0,
          paidAmount:
            formData.ownershipType === "Sold" &&
            !isReturnToMainStock &&
            !isCustomerToTower
              ? movementPaidTotal
              : 0,
          remainingAmount:
            formData.ownershipType === "Sold" &&
            !isReturnToMainStock &&
            !isCustomerToTower
              ? movementRemainTotal
              : 0,
          trustAmount:
            formData.ownershipType === "Leased" &&
            !isReturnToMainStock &&
            !isCustomerToTower
              ? quantity * depositAmount
              : 0,
          securityDepositPerDevice:
            formData.ownershipType === "Leased" &&
            !isReturnToMainStock &&
            !isCustomerToTower
              ? depositAmount
              : 0,
          salePricePerDevice:
            formData.ownershipType === "Sold" &&
            !isReturnToMainStock &&
            !isCustomerToTower
              ? movementSaleTotal / Math.max(quantity, 1)
              : 0,
          paidAmountPerDevice:
            formData.ownershipType === "Sold" &&
            !isReturnToMainStock &&
            !isCustomerToTower
              ? movementPaidTotal / Math.max(quantity, 1)
              : 0,
          remainingAmountPerDevice:
            formData.ownershipType === "Sold" &&
            !isReturnToMainStock &&
            !isCustomerToTower
              ? movementRemainTotal / Math.max(quantity, 1)
              : 0,
          transferStatus: isReturnToMainStock
            ? "Returned"
            : isCustomerToTower
            ? "Installed"
            : formData.issueStatus,
          responsiblePerson: "",
          notes: formData.notes.trim(),
          createdAt,
          updatedAt: createdAt,
        };
      }
    );

    const movementsSaved = await setAssetMovements([
      ...assetMovements,
      ...movementRecords,
    ]);

    if (!movementsSaved) {
      return;
    }

    for (const movement of movementRecords) {
      const saleIncomeSaved = await saveDeviceSaleIncome(movement);

      if (!saleIncomeSaved) {
        notify(
          "Device transfer was saved, but sale income could not be updated.",
          "error"
        );
        return;
      }
    }

    const transfersSaved =
      await setDeviceTransfers([
        ...deviceTransfers,
        ...newTransferRecords,
      ]);

    if (!transfersSaved) {
      return;
    }

    const refundOffsetAmount =
      formData.sourceType === "Customer" && selectedLeasedDepositTotal > 0
        ? Math.max(
            selectedLeasedDepositTotal - Number(formData.depositRefundAmount || 0),
            0
          )
        : 0;

    if (refundOffsetAmount > 0 && fromCustomer) {
      const refundOffsetRecord = {
        id: `deposit-refund-offset-${batchId}`,
        customerRecordId: fromCustomer.id || "",
        customerId: fromCustomer.customerId || "",
        customerName: getCustomerName(fromCustomer),
        paymentDate: formData.issueDate,
        date: formData.issueDate,
        direction: "customer-to-us",
        paymentDirection: "customer-to-us",
        amount: refundOffsetAmount,
        method: "Deposit Refund Offset",
        notes: [
          `Deposit refund not paid in cash. Offset against customer balance.`,
          `Held: ${money(selectedLeasedDepositTotal)} AFN`,
          `Paid: ${money(formData.depositRefundAmount || 0)} AFN`,
          `Remaining/Offset: ${money(refundOffsetAmount)} AFN`,
          referenceNumber ? `Reference: ${referenceNumber}` : "",
          formData.notes.trim(),
        ]
          .filter(Boolean)
          .join(" | "),
        source: "deposit-refund-offset",
        referenceId: batchId,
        createdAt,
        updatedAt: createdAt,
      };

      const refundOffsetSaved = await setCustomerPayments((previousPayments) => [
        ...previousPayments.filter(
          (payment) =>
            !(
              payment.source === "deposit-refund-offset" &&
              String(payment.referenceId || "") === String(batchId)
            )
        ),
        refundOffsetRecord,
      ]);

      if (!refundOffsetSaved) {
        notify(
          "Device transfer was saved, but refund balance could not be updated.",
          "error"
        );
        return;
      }
    }

    notify(
  isReturnToMainStock
    ? `${selectedAssets.length} device${
        selectedAssets.length === 1 ? "" : "s"
      } returned to Main Stock successfully.`
    : isCustomerToTower
    ? `${selectedAssets.length} device${
        selectedAssets.length === 1 ? "" : "s"
      } sent to Tower successfully.`
    : `${selectedAssets.length} device${
        selectedAssets.length === 1 ? "" : "s"
      } issued successfully.`
);

    closeIssueModal();
  };

  const openEditTransferModal = (
    transfer
  ) => {
    if (!canManageTransfer(transfer)) {
      notify("This transfer can only be edited from the page that created it.", "error");
      setOpenActionId(null);
      return;
    }

    setEditTransfer(transfer);

    setEditForm({
      issueDate:
        transfer.issueDate || "",

      issueStatus:
        transfer.issueStatus || "Issued",

      ownershipType:
        transfer.ownershipType || "Leased",

      salePrice:
        String(transfer.salePrice || ""),

      paidAmount:
        String(transfer.paidAmount || ""),

      remainAmount:
        String(transfer.remainAmount || ""),

      depositAmount:
        String(transfer.depositAmount || ""),
      depositCurrency:
        transfer.depositCurrency || "AFN",

      depositStatus:
        transfer.depositStatus || "Held",

      notes:
        transfer.notes || "",
    });

    setOpenActionId(null);
  };

  const closeEditTransferModal = () => {
    setEditTransfer(null);
    setEditForm(emptyEditForm);
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => {
      const nextData = {
        ...previous,
        [name]: value,
      };

      if (name === "ownershipType") {
        nextData.salePrice = "";
        nextData.paidAmount = "";
        nextData.remainAmount = "";
        nextData.depositAmount = "";
        nextData.depositStatus = "Held";
      }

      const salePrice =
        name === "salePrice"
          ? Number(value || 0)
          : Number(nextData.salePrice || 0);

      const paidAmount =
        name === "paidAmount"
          ? Number(value || 0)
          : Number(nextData.paidAmount || 0);

      if (
        nextData.ownershipType === "Sold"
      ) {
        nextData.remainAmount = Math.max(
          salePrice - paidAmount,
          0
        );
      } else {
        nextData.remainAmount = "";
      }

      return nextData;
    });
  };

  const saveEditedTransfer = async (
    event
  ) => {
    event.preventDefault();

    if (!editTransfer) {
      return;
    }

    const salePrice =
  editForm.ownershipType === "Sold"
    ? Number(editForm.salePrice || 0)
    : 0;

const paidAmount =
  editForm.ownershipType === "Sold"
    ? Number(editForm.paidAmount || 0)
    : 0;

    const remainAmount =
      editForm.ownershipType === "Sold"
        ? Math.max(
            salePrice - paidAmount,
            0
          )
        : 0;

    const depositAmount =
      editForm.ownershipType === "Leased"
        ? Number(
            editForm.depositAmount || 0
          )
        : 0;

    const updatedAt =
      new Date().toISOString();

    const updatedTransfer = {
      ...editTransfer,

      issueDate:
        editForm.issueDate,

      issueStatus:
        editForm.issueStatus,

      ownershipType:
        editForm.ownershipType,

      salePrice,
      paidAmount,
      remainAmount,
      depositAmount,
      depositCurrency:
        editForm.depositCurrency || "AFN",

      depositStatus:
        editForm.ownershipType === "Leased"
          ? editForm.depositStatus
          : "",

      notes:
        editForm.notes.trim(),

      updatedAt,
    };

    let nextAssets = assets;

    if (
      isLatestTransferForAsset(editTransfer)
    ) {
      const destinationCustomer =
        customers.find(
          (item) =>
            String(item.id) ===
              String(
                editTransfer.toCustomerRecordId
              ) ||
            String(item.customerId) ===
              String(
                editTransfer.toCustomerId
              )
        );

      nextAssets = assets.map((asset) => {
        const matches =
          String(getAssetKey(asset)) ===
          String(
            getTransferAssetKey(editTransfer)
          );

        if (!matches) {
          return asset;
        }

        return {
          ...asset,

          location: "Customer",

          status:
            editForm.ownershipType === "Sold"
              ? "Sold"
              : editForm.issueStatus,

          ownershipType:
            editForm.ownershipType,

          customerRecordId:
            editTransfer.toCustomerRecordId ||
            "",

          customerId:
            editTransfer.toCustomerId || "",

          customerName:
            editTransfer.toCustomerName ||
            (destinationCustomer
              ? getCustomerName(
                  destinationCustomer
                )
              : ""),

          lastTransferId:
            editTransfer.id,

          lastTransferDate:
            editForm.issueDate,

          updatedAt,
        };
      });
    }

    const nextTransfers =
      deviceTransfers.map((item) =>
        String(item.id) ===
        String(editTransfer.id)
          ? updatedTransfer
          : item
      );

    const assetsSaved =
      await setAssets(nextAssets);

    if (!assetsSaved) {
      return;
    }

    const transfersSaved =
      await setDeviceTransfers(
        nextTransfers
      );

    if (!transfersSaved) {
      return;
    }

    const updatedMovements = updateTransferInMovements(
      editTransfer,
      updatedTransfer
    );
    const movementsSaved = await setAssetMovements(updatedMovements);

    if (!movementsSaved) {
      return;
    }

    const relatedUpdatedMovements = updatedMovements.filter((movement) =>
      transferMatchesMovement(updatedTransfer, movement)
    );

    for (const movement of relatedUpdatedMovements) {
      const saleIncomeSaved = await saveDeviceSaleIncome(movement);

      if (!saleIncomeSaved) {
        notify(
          "Device transfer was updated, but sale income could not be updated.",
          "error"
        );
        return;
      }
    }

    notify(
      "Device transfer updated successfully."
    );

    closeEditTransferModal();
  };

  const transferMatchesMovement = (transfer, movement) => {
  if (!transfer || !movement) return false;

  if (
    transfer.batchId &&
    movement.batchId &&
    String(transfer.batchId) === String(movement.batchId)
  ) {
    return true;
  }

  if (
    transfer.referenceNumber &&
    movement.referenceNumber &&
    String(transfer.referenceNumber) === String(movement.referenceNumber)
  ) {
    return true;
  }

  const sameAsset =
    String(movement.assetRecordId || movement.parentAssetId || "") ===
      String(transfer.assetRecordId || transfer.parentAssetId || "") ||
    String(movement.assetId || "") === String(transfer.assetId || "");

  const sameDate =
    String(movement.date || "") === String(transfer.issueDate || transfer.date || "");

  return sameAsset && sameDate;
};

const removeTransferFromMovements = (transfer) => {
  return assetMovements.flatMap((movement) => {
    if (!transferMatchesMovement(transfer, movement)) {
      return [movement];
    }

    const movementUnits = movement.identityRecords || [];

    if (movementUnits.length > 1) {
      const transferUnitKey = String(
        transfer.unitRecordId ||
          transfer.serialNumber ||
          transfer.macAddress ||
          transfer.assetRecordId ||
          transfer.assetId ||
          ""
      );

      const nextIdentityRecords = movementUnits.filter((record) => {
        const recordKey = String(
          record.id ||
            record.serialNumber ||
            record.macAddress ||
            ""
        );

        return recordKey !== transferUnitKey;
      });

      if (nextIdentityRecords.length === movementUnits.length) {
        return [movement];
      }

      return [
        {
          ...movement,
          quantity: Math.max(Number(movement.quantity || 0) - Number(transfer.quantity || 1), 0),
          identityRecords: nextIdentityRecords,
          totalAmount: Math.max(
            Number(movement.totalAmount || 0) - Number(transfer.salePrice || 0),
            0
          ),
          paidAmount: Math.max(
            Number(movement.paidAmount || 0) - Number(transfer.paidAmount || 0),
            0
          ),
          remainingAmount: Math.max(
            Number(movement.remainingAmount || 0) - Number(transfer.remainAmount || 0),
            0
          ),
          trustAmount: Math.max(
            Number(movement.trustAmount || 0) - Number(transfer.depositAmount || 0),
            0
          ),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    return [];
  });
};

const canManageTransfer = (transfer) =>
  isSourceCurrentCustomer(transfer);

const getTransferMovementAmounts = (transfer) => {
  const isSold = transfer.ownershipType === "Sold";
  const isLeased = transfer.ownershipType === "Leased";

  return {
    totalAmount: isSold ? Number(transfer.salePrice || 0) : 0,
    paidAmount: isSold ? Number(transfer.paidAmount || 0) : 0,
    remainingAmount: isSold ? Number(transfer.remainAmount || 0) : 0,
    trustAmount: isLeased ? Number(transfer.depositAmount || 0) : 0,
  };
};

const saveDeviceSaleIncome = async (movement) => {
  const paidAmount = Number(movement?.paidAmount || 0);

  if (
    movement?.movementType !== "Transfer" ||
    movement?.dealType !== "Sold" ||
    paidAmount <= 0
  ) {
    return setTransactions((previousTransactions) =>
      previousTransactions.filter(
        (transaction) =>
          !(
            transaction.source === "customer-device-sale" &&
            String(transaction.referenceId || "") === String(movement?.id || "")
          )
      )
    );
  }

  const updatedAt = new Date().toISOString();
  const incomeRecord = {
    id: `customer-device-sale-income-${movement.id}`,
    type: "income",
    title: `Device Sale - ${movement.deviceName || movement.assetId || "Asset"}`,
    category: "Customer Payment",
    amount: paidAmount,
    date: movement.date,
    description: [
      movement.destinationName ? `Customer: ${movement.destinationName}` : "",
      `Total: ${money(movement.totalAmount || 0)} AFN`,
      `Paid: ${money(paidAmount)} AFN`,
      `Remaining: ${money(movement.remainingAmount || 0)} AFN`,
      movement.referenceNumber ? `Reference: ${movement.referenceNumber}` : "",
      movement.notes || "",
    ]
      .filter(Boolean)
      .join(" | "),
    source: "customer-device-sale",
    referenceId: movement.id,
    assetRecordId: movement.assetRecordId || "",
    assetId: movement.assetId || "",
    customerRecordId: movement.destinationRecordId || "",
    customerName: movement.destinationName || "",
    createdAt: movement.createdAt || updatedAt,
    updatedAt,
  };

  return setTransactions((previousTransactions) => [
    ...previousTransactions.filter(
      (transaction) =>
        !(
          transaction.source === "customer-device-sale" &&
          String(transaction.referenceId || "") === String(movement.id)
        )
    ),
    incomeRecord,
  ]);
};

const updateTransferInMovements = (oldTransfer, updatedTransfer) => {
  const oldAmounts = getTransferMovementAmounts(oldTransfer);
  const nextAmounts = getTransferMovementAmounts(updatedTransfer);
  const updatedAt = new Date().toISOString();

  return assetMovements.map((movement) => {
    if (!transferMatchesMovement(oldTransfer, movement)) {
      return movement;
    }

    const movementUnits = movement.identityRecords || [];
    const nextUnitRecords = movementUnits.map((record) => {
      const recordKey = String(
        record.id ||
          record.serialNumber ||
          record.macAddress ||
          ""
      );
      const transferKey = String(
        oldTransfer.unitRecordId ||
          oldTransfer.serialNumber ||
          oldTransfer.macAddress ||
          ""
      );

      if (!transferKey || recordKey !== transferKey) {
        return record;
      }

      return {
        ...record,
        unitPrice:
          updatedTransfer.ownershipType === "Sold"
            ? updatedTransfer.salePrice
            : record.unitPrice,
      };
    });

    const isSingleRecord = Number(movement.quantity || 0) <= Number(oldTransfer.quantity || 1);

    return {
      ...movement,
      dealType:
        updatedTransfer.transferType === "Customer to Main Stock"
          ? ""
          : updatedTransfer.ownershipType || movement.dealType,
      date: updatedTransfer.issueDate || movement.date,
      transferStatus: updatedTransfer.issueStatus || movement.transferStatus,
      identityRecords: movementUnits.length ? nextUnitRecords : movement.identityRecords,
      totalAmount: isSingleRecord
        ? nextAmounts.totalAmount
        : Math.max(
            Number(movement.totalAmount || 0) -
              oldAmounts.totalAmount +
              nextAmounts.totalAmount,
            0
          ),
      paidAmount: isSingleRecord
        ? nextAmounts.paidAmount
        : Math.max(
            Number(movement.paidAmount || 0) -
              oldAmounts.paidAmount +
              nextAmounts.paidAmount,
            0
          ),
      remainingAmount: isSingleRecord
        ? nextAmounts.remainingAmount
        : Math.max(
            Number(movement.remainingAmount || 0) -
              oldAmounts.remainingAmount +
              nextAmounts.remainingAmount,
            0
          ),
      trustAmount: isSingleRecord
        ? nextAmounts.trustAmount
        : Math.max(
            Number(movement.trustAmount || 0) -
              oldAmounts.trustAmount +
              nextAmounts.trustAmount,
            0
          ),
      securityDepositPerDevice:
        updatedTransfer.ownershipType === "Leased"
          ? Number(updatedTransfer.depositAmount || 0)
          : 0,
      salePricePerDevice:
        updatedTransfer.ownershipType === "Sold"
          ? Number(updatedTransfer.salePrice || 0)
          : 0,
      paidAmountPerDevice:
        updatedTransfer.ownershipType === "Sold"
          ? Number(updatedTransfer.paidAmount || 0)
          : 0,
      remainingAmountPerDevice:
        updatedTransfer.ownershipType === "Sold"
          ? Number(updatedTransfer.remainAmount || 0)
          : 0,
      notes: updatedTransfer.notes || movement.notes,
      updatedAt,
    };
  });
};

  const confirmDeleteTransfer =
    async () => {
      if (!deleteTransfer) {
        return;
      }

      if (!canManageTransfer(deleteTransfer)) {
        notify("This transfer can only be deleted from the page that created it.", "error");
        setDeleteTransfer(null);
        return;
      }

      const transferSourceType =
        deleteTransfer.sourceType || deleteTransfer.fromType || "";
      const transferDestinationType =
        deleteTransfer.destinationType || deleteTransfer.toType || "";
      const deleteQuantity = Number(deleteTransfer.quantity || 1);
      const deleteUnitKey = String(
        deleteTransfer.unitRecordId ||
          deleteTransfer.serialNumber ||
          deleteTransfer.macAddress ||
          ""
      );

      const sourceCustomerRecordId =
        deleteTransfer.fromCustomerRecordId ||
        deleteTransfer.previousCustomerRecordId ||
        "";
      const sourceCustomerId =
        deleteTransfer.fromCustomerId ||
        deleteTransfer.previousCustomerId ||
        "";
      const sourceCustomerName =
        deleteTransfer.fromCustomerName ||
        deleteTransfer.previousCustomerName ||
        "";
      const sourceTowerRecordId =
        deleteTransfer.sourceRecordId ||
        deleteTransfer.fromTowerRecordId ||
        deleteTransfer.previousTowerRecordId ||
        "";

      const nextAssets = assets.map((asset) => {
          const matchesTransferAsset =
            String(getAssetKey(asset)) === String(getTransferAssetKey(deleteTransfer)) ||
            String(asset.id || "") === String(deleteTransfer.assetRecordId || "") ||
            String(asset.id || "") === String(deleteTransfer.parentAssetId || "") ||
            String(asset.assetId || "") === String(deleteTransfer.assetId || "");

          if (!matchesTransferAsset) {
            return asset;
          }

          let nextQuantity = Number(asset.quantity || 0);
          if (transferSourceType === "Main Stock" && transferDestinationType !== "Main Stock") {
            nextQuantity += deleteQuantity;
          }
          if (transferSourceType !== "Main Stock" && transferDestinationType === "Main Stock") {
            nextQuantity = Math.max(nextQuantity - deleteQuantity, 0);
          }

          const restoredLocation =
            transferSourceType === "Main Stock"
              ? "Main Stock"
              : transferSourceType === "Customer"
                ? "Customer"
                : transferSourceType === "Tower"
                  ? deleteTransfer.sourceLocation || "Tower"
                  : deleteTransfer.previousAssetLocation || asset.location || "Main Stock";

          const restoredStatus =
            transferSourceType === "Main Stock"
              ? "In Stock"
              : transferSourceType === "Customer"
                ? "Issued"
                : transferSourceType === "Tower"
                  ? "At Tower"
                  : deleteTransfer.previousAssetStatus || asset.status || "In Stock";

          const nextIdentityRecords = isIndividualAsset(asset)
            ? (asset.identityRecords || []).map((record) => {
                if (!deleteUnitKey) return record;

                const recordKey = String(
                  record.id ||
                    record.serialNumber ||
                    record.macAddress ||
                    ""
                );

                if (recordKey !== deleteUnitKey) return record;

                return {
                  ...record,
                  location: restoredLocation,
                  status: restoredStatus,
                  customerRecordId: transferSourceType === "Customer" ? sourceCustomerRecordId : "",
                  towerRecordId: transferSourceType === "Tower" ? sourceTowerRecordId : "",
                  updatedAt: new Date().toISOString(),
                };
              })
            : asset.identityRecords || [];

          return {
            ...asset,
            quantity: nextQuantity,
            location: restoredLocation,
            status: restoredStatus,
            ownershipType: transferSourceType === "Customer" ? "Leased" : deleteTransfer.previousOwnershipType || "",
            customerRecordId: transferSourceType === "Customer" ? sourceCustomerRecordId : "",
            customerId: transferSourceType === "Customer" ? sourceCustomerId : "",
            customerName: transferSourceType === "Customer" ? sourceCustomerName : "",
            towerRecordId: transferSourceType === "Tower" ? sourceTowerRecordId : "",
            identityRecords: nextIdentityRecords,
            lastTransferId: "",
            lastTransferDate: "",
            updatedAt: new Date().toISOString(),
          };
        });

      const nextTransfers =
        deviceTransfers.filter(
          (item) =>
            String(item.id) !==
            String(deleteTransfer.id)
        );

        const saleMovementIdsToRemove = assetMovements
          .filter(
            (movement) =>
              transferMatchesMovement(deleteTransfer, movement) &&
              movement.dealType === "Sold"
          )
          .map((movement) => String(movement.id || ""));
        const nextMovements = removeTransferFromMovements(deleteTransfer);

      const nextDeposits =
        securityDeposits.filter(
          (deposit) =>
            String(deposit.transferId) !==
            String(deleteTransfer.id)
        );

      const assetsSaved =
        await setAssets(nextAssets);

      if (!assetsSaved) {
        return;
      }

      const transfersSaved =
        await setDeviceTransfers(
          nextTransfers
        );

      if (!transfersSaved) {
        return;
      }

      const depositsSaved =
        await setSecurityDeposits(
          nextDeposits
        );
        

      if (!depositsSaved) {
        return;
      }

      const paymentsSaved = await setCustomerPayments((previousPayments) =>
        previousPayments.filter(
          (payment) =>
            !(
              payment.source === "deposit-refund-offset" &&
              String(payment.referenceId || "") ===
                String(deleteTransfer.batchId || "")
            )
        )
      );

      if (!paymentsSaved) {
        return;
      }

      const movementsSaved = await setAssetMovements(nextMovements);

if (!movementsSaved) {
  return;
}

      const transactionsSaved = await setTransactions((previousTransactions) =>
        previousTransactions.filter(
          (transaction) =>
            !(
              transaction.source === "customer-device-sale" &&
              saleMovementIdsToRemove.includes(String(transaction.referenceId || ""))
            )
        )
      );

      if (!transactionsSaved) {
        return;
      }




      notify("Device transfer deleted and route was reversed.");

      setDeleteTransfer(null);
    };

  if (
    !customersLoaded ||
    !assetsLoaded ||
    !movementsLoaded ||
    !transfersLoaded ||
    !depositsLoaded ||
    !buybacksLoaded ||
    !paymentsLoaded ||
    !transactionsLoaded ||
    !towersLoaded ||
    !towerTransfersLoaded
  ) {
    return (
      <div className="page-loading">
        Loading device transfers...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="customer-issue-page">
        <div className="customer-issue-not-found">
          <h1>Customer Not Found</h1>

          <p>
            The selected customer record does
            not exist.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/customers")
            }
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === "current") {
    return (
      <div className="customer-issue-page">
        <Link
          className="customer-issue-back"
          to={`/customers/${customer.id || customer.customerId}/issue-device`}
        >
          ← Back to Customer Device Transfer
        </Link>

        <div className="customer-issue-header">
          <div>
            <span className="customer-issue-kicker">
              Current Devices
            </span>
            <h1>Current Devices With Customer</h1>
            <p>
              <strong>{getCustomerName(customer)}</strong> currently has{" "}
              {currentCustomerDeviceCount} device(s).
            </p>
          </div>
        </div>

        <div className="customer-current-summary">
          <div>
            <span>Total</span>
            <strong>{currentCustomerDeviceCount}</strong>
          </div>
          <div>
            <span>Purchased / Sold</span>
            <strong>{currentSoldDeviceCount}</strong>
          </div>
          <div>
            <span>Leased / Deposit</span>
            <strong>{currentLeasedDeviceCount}</strong>
          </div>
        </div>

        <div className="customer-issue-card">
          <div className="customer-issue-card-header">
            <div>
              <h3>Current Device List</h3>
              <p>Devices grouped by ownership status for this customer.</p>
            </div>
          </div>

          <div className="customer-current-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Asset</th>
                  <th>Model</th>
                  <th>Serial Number</th>
                  <th>Ownership</th>
                  <th>Quantity</th>
                  <th>Deposit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentCustomerAssets.map((asset) => (
                  <tr key={getAssetKey(asset)}>
                    <td>{asset.category || "-"}</td>
                    <td title={`${asset.category || "-"} - ${asset.assetId || "-"} - ${asset.deviceName || "-"}`}>
                      {asset.category || "-"} - {asset.assetId || "-"} - {asset.deviceName || "-"}
                    </td>
                    <td>{asset.model || "-"}</td>
                    <td>{asset.serialNumber || "-"}</td>
                    <td>{displayOwnership(asset.ownershipType)}</td>
                    <td>{asset.quantity || 1}</td>
                    <td>
                      {money(asset.depositAmount || 0)} {asset.depositCurrency || "AFN"}
                    </td>
                    <td>{asset.status || asset.issueStatus || "-"}</td>
                  </tr>
                ))}

                {currentCustomerAssets.length === 0 && (
                  <tr>
                    <td colSpan="8" className="customer-issue-empty-row">
                      No current device is recorded for this customer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-issue-page">
      <Link
        className="customer-issue-back"
        to="/customers"
      >
        ← Back to Customers
      </Link>

      <div className="customer-issue-header">
        <div>
          <span className="customer-issue-kicker">
            Customer Device Transfer
          </span>

          <h1>Customer Device Transfer</h1>

          <p>
            View devices currently held by{" "}
            <strong>
              {getCustomerName(customer)}
            </strong>
            , plus every incoming and outgoing transfer report.
          </p>
        </div>

        <div className="customer-issue-header-actions">
          <Link
            className="customer-issue-detail-link"
            to={`/customers/${
              customer.id ||
              customer.customerId
            }`}
          >
            Customer Full Detail
          </Link>
        </div>
      </div>

      <div className="customer-issue-stats">
        <div
          className="customer-issue-clickable-stat"
          role="button"
          tabIndex={0}
          onClick={() => setActiveSummaryView("current")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setActiveSummaryView("current");
            }
          }}
        >
          <span>Assets With This Customer</span>
          <strong>{currentCustomerDeviceCount}</strong>
          <p>
            Sold: {currentSoldDeviceCount} / Leased: {currentLeasedDeviceCount}
          </p>
        </div>

        <div
          className="customer-issue-clickable-stat"
          role="button"
          tabIndex={0}
          onClick={() => setActiveSummaryView("incoming")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setActiveSummaryView("incoming");
            }
          }}
        >
          <span>Assets Received From Other Sources</span>
          <strong>{incomingCustomerTransfers.length}</strong>
          <p>Device-by-device incoming transfers</p>
        </div>

        <div
          className="customer-issue-clickable-stat"
          role="button"
          tabIndex={0}
          onClick={() => setActiveSummaryView("outgoing")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setActiveSummaryView("outgoing");
            }
          }}
        >
          <span>Assets Sent By This Customer</span>
          <strong>{outgoingCustomerTransfers.length}</strong>
          <p>Device-by-device outgoing transfers</p>
        </div>

        <div
          className="customer-issue-clickable-stat"
          role="button"
          tabIndex={0}
          onClick={() => setShowDepositDetails((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setShowDepositDetails((value) => !value);
            }
          }}
        >
          <span>Total Deposits</span>
          <strong>
            {totalDepositsText}
          </strong>
          <p>Click to view related assets</p>
        </div>
      </div>

      {activeSummary && (
        <div className="customer-issue-card">
          <div className="customer-issue-card-header">
            <div>
              <h3>{activeSummary.title}</h3>
              <p>{activeSummary.description}</p>
            </div>
          </div>

          <div className="customer-issue-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Asset</th>
                  <th>Issued from</th>
                  <th>Issued to</th>
                  <th>Ownership</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeSummary.rows.map((item, index) => (
                  <tr key={`${activeSummaryView}-${item.id || index}`}>
                    <td>{formatDateTime(item.date)}</td>
                    <td>{item.category || "-"}</td>
                    <td title={`${item.category || "-"} - ${item.asset || "-"}`}>
                      {item.category || "-"} - {item.asset || "-"}
                    </td>
                    <td>{item.source || "-"}</td>
                    <td>{item.receiver || "-"}</td>
                    <td>{item.ownership || "-"}</td>
                    <td>{money(item.quantity || 1)}</td>
                    <td>{item.status || "-"}</td>
                  </tr>
                ))}

                {activeSummary.rows.length === 0 && (
                  <tr>
                    <td colSpan="8" className="customer-issue-empty-row">
                      {activeSummary.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDepositDetails && (
        <div className="customer-issue-card">
          <div className="customer-issue-card-header">
            <div>
              <h3>Total Deposits Detail</h3>
              <p>Deposit and refund amounts recorded inside transfer records.</p>
            </div>
          </div>

          <div className="customer-issue-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Asset</th>
                  <th>Issued from</th>
                  <th>Issued to</th>
                  <th>Deposit</th>
                  <th>Refund</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {depositDetailRows.map((item, index) => (
                  <tr key={`deposit-detail-${item.id || index}`}>
                    <td>{formatDateTime(item.issueDate, item.createdAt)}</td>
                    <td title={`${item.category || "-"} - ${item.assetId || "-"} - ${item.deviceName || "-"}`}>
                      {item.category || "-"} - {item.assetId || "-"} - {item.deviceName || "-"}
                    </td>
                    <td>{item.fromCustomerName || "Main Stock"}</td>
                    <td>{item.toCustomerName || "Main Stock"}</td>
                    <td>
                      {Number(item.depositAmount || 0)
                        ? `${money(item.depositAmount)} ${item.depositCurrency || "AFN"}`
                        : "-"}
                    </td>
                    <td>
                      {Number(item.depositRefundAmount || item.refundAmount || 0)
                        ? `${money(item.depositRefundAmount || item.refundAmount)} ${
                            item.depositCurrency || "AFN"
                          }`
                        : "-"}
                    </td>
                    <td>
                      {money(
                        Number(item.depositRemainingAmount ?? item.remainingDeposit ?? item.depositAmount ?? 0)
                      )}{" "}
                      {item.depositCurrency || "AFN"}
                    </td>
                    <td>{item.depositStatus || item.issueStatus || "-"}</td>
                  </tr>
                ))}

                {depositDetailRows.length === 0 && (
                  <tr>
                    <td colSpan="8" className="customer-issue-empty-row">
                      No deposit has been recorded for this customer yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {false && (
      <div className="customer-issue-card">
        <div className="customer-issue-card-header">
          <div>
            <h3>Customer Purchases</h3>
            <p>Buy back sold devices from this customer and track purchase payments.</p>
          </div>
          <button
            type="button"
            className="customer-issue-add-btn"
            onClick={() => {
              resetBuybackForm();
              setShowBuybackModal(true);
            }}
          >
            Purchase From Customer
          </button>
        </div>

        <div className="customer-current-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Items</th>
                <th>Purchased By</th>
                <th>Total Amount</th>
                <th>Paid Amount</th>
                <th>Remaining Amount</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {customerBuybackRecords.map((record) => (
                <tr key={record.id}>
                  <td>{formatDateTime(record.purchaseDate, record.createdAt || record.updatedAt)}</td>
                  <td>{(record.items || []).length}</td>
                  <td>{record.purchasedBy || "-"}</td>
                  <td>{money(record.totalAmount)} AFN</td>
                  <td>{money(record.paidAmount)} AFN</td>
                  <td>{money(record.remainingAmount)} AFN</td>
                  <td>{record.notes || "-"}</td>
                  <td>
                    <div className="customer-issue-buyback-row-actions">
                      <button
                        type="button"
                        onClick={() =>
                          window.alert(
                            (record.items || [])
                              .map(
                                (item) =>
                                  `${item.category || "-"} - ${item.assetId || "-"} - ${item.deviceName || "Device"}: ${money(item.purchasePrice)} AFN`
                              )
                              .join("\n") || "No item detail."
                          )
                        }
                      >
                        View
                      </button>
                      <button type="button" onClick={() => openEditBuyback(record)}>
                        Edit
                      </button>
                      <button type="button" className="danger" onClick={() => deleteBuyback(record)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {customerBuybackRecords.length === 0 && (
                <tr>
                  <td colSpan="8" className="customer-issue-empty-row">
                    No customer purchase has been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {false && showBuybackModal && (
        <div
          className="customer-issue-buyback-backdrop"
          onClick={() => setShowBuybackModal(false)}
        >
          <div
            className="customer-issue-buyback-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-issue-buyback-header">
              <div>
                <h3>Purchase From Customer</h3>
                <p>Select sold devices and record the customer buyback payment.</p>
              </div>
              <button type="button" onClick={() => setShowBuybackModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={saveBuyback} className="customer-issue-buyback-form">
              <div className="customer-issue-buyback-grid">
                <label>
                  Purchase Date
                  <input
                    type="date"
                    value={buybackForm.purchaseDate}
                    onChange={(event) =>
                      setBuybackForm((previous) => ({
                        ...previous,
                        purchaseDate: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Purchased By
                  <input
                    value={buybackForm.purchasedBy}
                    onChange={(event) =>
                      setBuybackForm((previous) => ({
                        ...previous,
                        purchasedBy: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Destination
                  <input value={buybackForm.destination || "Main Stock"} readOnly />
                </label>

                <div className="customer-issue-buyback-section full">
                  <div className="customer-issue-buyback-section-title">
                    <h4>Select Sold Devices</h4>
                    <span>{selectedBuybackDevices.length} selected</span>
                  </div>

                  <div className="customer-issue-buyback-device-list">
                    {buybackAvailableDevices.map((item) => {
                      const transferId = String(item.id || "");
                      const selected = buybackForm.selectedTransferIds.includes(transferId);

                      return (
                        <label
                          key={transferId}
                          className={
                            selected
                              ? "customer-issue-buyback-device selected"
                              : "customer-issue-buyback-device"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleBuybackDevice(item)}
                          />

                          <div>
                            <strong>
                              {item.category || "-"} - {item.assetId || "-"} - {item.deviceName || "Device"}
                            </strong>
                            <span>
                              SN: {item.serialNumber || "-"} / MAC: {item.macAddress || "-"}
                            </span>
                          </div>

                          <label className="customer-issue-buyback-price">
                            <span>Purchase Price</span>
                            <input
                              type="number"
                              min="0"
                              value={
                                buybackForm.purchasePrices[transferId] ??
                                item.salePrice ??
                                item.totalAmount ??
                                ""
                              }
                              onChange={(event) =>
                                setBuybackForm((previous) => ({
                                  ...previous,
                                  purchasePrices: {
                                    ...previous.purchasePrices,
                                    [transferId]: event.target.value,
                                  },
                                }))
                              }
                              onClick={(event) => event.stopPropagation()}
                              placeholder="Purchase price"
                            />
                          </label>
                        </label>
                      );
                    })}

                    {buybackAvailableDevices.length === 0 && (
                      <div className="customer-issue-empty-row">
                        No sold device is available to purchase from this customer.
                      </div>
                    )}
                  </div>
                </div>

                <label>
                  Total Amount
                  <input value={`${money(buybackTotal)} AFN`} readOnly />
                </label>

                <label>
                  Paid Amount
                  <input
                    type="number"
                    min="0"
                    max={buybackTotal}
                    value={buybackForm.paidAmount}
                    onChange={(event) =>
                      setBuybackForm((previous) => ({
                        ...previous,
                        paidAmount: String(
                          Math.min(Number(event.target.value || 0), buybackTotal)
                        ),
                      }))
                    }
                  />
                </label>

                <label>
                  Remaining Amount
                  <input value={`${money(buybackRemaining)} AFN`} readOnly />
                </label>

                <label className="full">
                  Notes
                  <textarea
                    value={buybackForm.notes}
                    onChange={(event) =>
                      setBuybackForm((previous) => ({
                        ...previous,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="customer-issue-buyback-actions">
                <button type="button" onClick={() => setShowBuybackModal(false)}>
                  Cancel
                </button>
                <button type="submit">Save Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="customer-issue-card">
        <div className="customer-issue-card-header">
  <div>
    <h3>
      Customer Device Transfer History
    </h3>

    <p>
      Report of every asset sent to this customer or taken from this customer.
    </p>
  </div>

  <div className="customer-issue-legend">
    <span className="customer-issue-legend-item source-other">
      <i />
      Issued from is not this customer
    </span>

    <span className="customer-issue-legend-item source-current">
      <i />
      Issued from is this customer
    </span>
  </div>
</div>

        <div className="customer-issue-history-filters">
          <label>
            Date
            <input
              type="date"
              value={historyFilters.date}
              onChange={(event) =>
                setHistoryFilters((previous) => ({
                  ...previous,
                  date: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Issued from
            <input
              value={historyFilters.source}
              onChange={(event) =>
                setHistoryFilters((previous) => ({
                  ...previous,
                  source: event.target.value,
                }))
              }
              placeholder="Filter source..."
            />
          </label>
          <label>
            Receiver
            <input
              value={historyFilters.destination}
              onChange={(event) =>
                setHistoryFilters((previous) => ({
                  ...previous,
                  destination: event.target.value,
                }))
              }
              placeholder="Filter receiver..."
            />
          </label>
        </div>

        <div className="customer-issue-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transfer Type</th>
                <th>Issued from</th>
                <th>Issued to</th>
                <th>Category</th>
                <th>Device</th>
                <th>Ownership</th>
                <th>Quantity</th>
                <th>Deposit / Withdraw</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomerTransferHistory.map(
                (item) => (
                  <tr key={item.id} className={getTransferRowClass(item)}>
                    <td>
                      {formatDateTime(
                        item.issueDate,
                        item.createdAt || item.updatedAt
                      )}
                    </td>

                    <td
                      title={
                        item.transferType ||
                        "-"
                      }
                    >
                      {item.transferType ||
                        "-"}
                    </td>

                    <td
                      title={
                        item.fromCustomerName ||
                        "-"
                      }
                    >
                      {item.fromCustomerName ||
                        "-"}
                    </td>

                    <td
                      title={
                        item.toCustomerName ||
                        "-"
                      }
                    >
                      {item.toCustomerName ||
                        "-"}
                    </td>

                    <td>{item.category || "-"}</td>

                    <td
                      title={`${
                        item.category || "-"
                      } - ${
                        item.assetId || "-"
                      } - ${
                        item.deviceName || "-"
                      }`}
                    >
                      {item.category || "-"} -{" "}
                      {item.assetId || "-"} -{" "}
                      {item.deviceName || "-"}
                    </td>

                    <td>
                      {displayOwnership(item.ownershipType)}
                    </td>

                    <td>{money(item.quantity || 1)}</td>

                    <td>
                      {item.summaryType === "Deposit" || item.issueStatus === "Deposit" || item.depositAmount ? (
                        <span className="customer-issue-money-badge deposit">
                          {money(item.depositAmount)} {item.depositCurrency || "AFN"}
                        </span>
                      ) : item.summaryType === "Withdrawal" || item.issueStatus === "Withdrawal" || item.depositRefundAmount || item.refundAmount ? (
                        <span className="customer-issue-money-badge return">
                          {money(item.depositRefundAmount || item.refundAmount)} {item.depositCurrency || "AFN"}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      {["Deposit", "Withdrawal"].includes(item.issueStatus) ? (
                        <span className={`customer-issue-status-badge ${item.issueStatus.toLowerCase()}`}>
                          {item.issueStatus}
                        </span>
                      ) : (
                        item.issueStatus || "-"
                      )}
                    </td>

                    <td>
                      <div className="customer-issue-action-cell">
                        <button
                          type="button"
                          className="customer-issue-action-btn"
                          aria-label="Open transfer actions"
                          onClick={(event) =>
                            toggleActionMenu(
                              event,
                              item.id
                            )
                          }
                        >
                          ⋮
                        </button>

                        {String(
                          openActionId
                        ) === String(item.id) && (
                          <div
                            className="customer-issue-action-menu"
                            style={{
                              top: `${actionMenuPosition.top}px`,
                              left: `${actionMenuPosition.left}px`,
                            }}
                            onMouseDown={(
                              event
                            ) =>
                              event.stopPropagation()
                            }
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setViewTransfer(
                                  item
                                );

                                setOpenActionId(
                                  null
                                );
                              }}
                            >
                              View Details
                            </button>

                            {canManageTransfer(item) && (
                              <button
                                type="button"
                                className="danger"
                                onClick={() => {
                                  setDeleteTransfer(
                                    item
                                  );

                                  setOpenActionId(
                                    null
                                  );
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}

              {filteredCustomerTransferHistory.length ===
                0 && (
                <tr>
                  <td
                    colSpan="11"
                    className="customer-issue-empty-row"
                  >
                    No device transfer has been
                    recorded for this customer
                    yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {false && showIssueModal && (
        <div
          className="customer-issue-modal-backdrop"
        >
          <div
            className="customer-issue-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="customer-issue-modal-header">
              <div>
                <h3>
                  Issue Multiple Devices
                </h3>

                <p>
                  Select one or more devices
                  for{" "}
                  <strong>
                    {getCustomerName(customer)}
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={closeIssueModal}
              >
                ×
              </button>
            </div>

            <div className="customer-issue-modal-grid">
              <div className="customer-issue-card">
                <div className="customer-issue-card-header">
                  <div>
                    <h3>Issue Device Form</h3>

                    <p>
                      Transfer devices from one
                      customer to another, or return
                      this customer's devices to stock.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={saveIssueDevice}
                >
                  <div className="customer-issue-form-grid">
                    <div className="customer-issue-form-group">
                      <label>
                        Transfer Type
                      </label>

                     <select
                        name="sourceType"
                        value={formData.sourceType}
                        onChange={handleChange}
                        >
                        <option value="Customer">
                            Customer to Customer
                        </option>

                        <option value="Customer to Main Stock">
                            Customer to Main Stock
                        </option>

                        <option value="Customer to Tower">
                            Customer to Tower
                        </option>
                        </select>
                    </div>

                    {formData.sourceType === "Customer to Main Stock" && (
                    <>
                        <div className="customer-issue-form-group">
                        <label>Source Customer</label>

                        <input
                            value={`${customer.customerId || "No ID"} - ${getCustomerName(
                            customer
                            )}`}
                            readOnly
                        />
                        </div>

                        <div className="customer-issue-form-group">
                        <label>Issued to</label>

                        <input
                            value="Main Stock"
                            readOnly
                        />
                        </div>
                    </>
                    )}

                    {formData.sourceType === "Customer to Tower" && (
                    <>
                        <div className="customer-issue-form-group">
                        <label>Source Customer</label>

                        <input
                            value={`${customer.customerId || "No ID"} - ${getCustomerName(
                            customer
                            )}`}
                            readOnly
                        />
                        </div>

                        <div className="customer-issue-form-group">
                        <label>Issued to Tower</label>

                        <select
                            name="destinationTowerId"
                            value={formData.destinationTowerId}
                            onChange={handleChange}
                        >
                            <option value="">Select Destination Tower</option>

                            {towerAssets.map((tower) => (
                            <option key={tower.id} value={tower.id}>
                                {tower.towerName || "Unnamed Tower"}
                                {tower.towerLocation
                                ? ` - ${tower.towerLocation}`
                                : ""}
                            </option>
                            ))}
                        </select>
                        </div>
                    </>
                    )}

                    {formData.sourceType ===
                      "Customer" && (
                      <div className="customer-issue-form-group">
                        <label>
                          From Customer
                        </label>

                        <select
                          name="fromCustomerId"
                          value={
                            formData.fromCustomerId
                          }
                          onChange={
                            handleChange
                          }
                        >
                          <option value="">
                            Select Source Customer
                          </option>

                          {customers
                            .map((item) => (
                              <option
                                key={
                                  item.id
                                }
                                value={
                                  item.id
                                }
                              >
                                {item.customerId ||
                                  "No ID"}{" "}
                                -{" "}
                                {getCustomerName(
                                  item
                                )}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {formData.sourceType === "Customer" &&
                      String(formData.fromCustomerId) === String(customer.id) && (
                        <div className="customer-issue-form-group">
                          <label>Issued to</label>

                          <select
                            name="destinationCustomerId"
                            value={formData.destinationCustomerId}
                            onChange={handleChange}
                          >
                            <option value="">Select Destination Customer</option>

                            {customers
                              .filter(
                                (item) =>
                                  String(item.id) !== String(customer.id)
                              )
                              .map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.customerId || "No ID"} -{" "}
                                  {getCustomerName(item)}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                    {formData.sourceType === "Customer" &&
                      formData.fromCustomerId &&
                      String(formData.fromCustomerId) !== String(customer.id) && (
                        <div className="customer-issue-form-group">
                          <label>Issued to</label>

                          <input
                            value={`${customer.customerId || "No ID"} - ${getCustomerName(
                              customer
                            )}`}
                            readOnly
                          />
                        </div>
                      )}

                    <div className="customer-issue-form-group">
                      <label>
                        Issue Date
                      </label>

                      <input
                        type="date"
                        name="issueDate"
                        value={
                          formData.issueDate
                        }
                        onChange={
                          handleChange
                        }
                      />
                    </div>

                    <div className="customer-issue-form-group">
                      <label>
                        Device Status
                      </label>

                      <select
  name="issueStatus"
  value={formData.issueStatus}
  onChange={handleChange}
  disabled={[
    "Customer to Main Stock",
    "Customer to Tower",
  ].includes(formData.sourceType)}
>
  {formData.sourceType === "Customer to Main Stock" ? (
    <option value="Returned">
      Returned to Main Stock
    </option>
  ) : formData.sourceType === "Customer to Tower" ? (
    <option value="Installed">
      Installed at Tower
    </option>
  ) : (
    <>
      <option value="Issued">
        Issued
      </option>

      <option value="Installed">
        Installed
      </option>
    </>
  )}
</select>
                    </div>

                    {formData.sourceType === "Customer" && (
                      <div className="customer-issue-form-group">
                        <label>Return Amount</label>
                        <input
                          type="number"
                          min="0"
                          name="depositRefundAmount"
                          value={formData.depositRefundAmount}
                          onChange={handleChange}
                          placeholder="Enter return amount..."
                        />
                      </div>
                    )}

                    {![
                      "Customer to Main Stock",
                      "Customer to Tower",
                    ].includes(formData.sourceType) &&
  formData.ownershipType === "Leased" && (
                      <>
                        <div className="customer-issue-form-group">
                          <label>
                            Currency
                          </label>

                          <select
                            name="depositCurrency"
                            value={formData.depositCurrency}
                            onChange={handleChange}
                          >
                            <option value="AFN">
                              Afghani
                            </option>
                            <option value="USD">
                              Dollar
                            </option>
                          </select>
                        </div>

                        <div className="customer-issue-form-group">
                          <label>
                            Deposit Amount
                          </label>

                          <input
                            type="text"
                            name="depositAmount"
                            value={
                              formData.depositAmount
                            }
                            onChange={
                              handleChange
                            }
                            placeholder="Example: 1000"
                          />
                        </div>

                        <div className="customer-issue-form-group">
                          <label>
                            Destination Deposit Status
                          </label>

                          <select
                            name="depositStatus"
                            value={
                              formData.depositStatus
                            }
                            onChange={
                              handleChange
                            }
                          >
                            <option value="Held">
                              Held
                            </option>

                            <option value="Not Received">
                              Not Received
                            </option>

                            <option value="Partially Received">
                              Partially Received
                            </option>

                            <option value="Partially Refunded">
                              Partially Refunded
                            </option>

                            <option value="Fully Refunded">
                              Fully Refunded
                            </option>

                            <option value="Deducted">
                              Deducted
                            </option>

                            <option value="Forfeited">
                              Forfeited
                            </option>

                            <option value="Outstanding">
                              Outstanding
                            </option>

                            <option value="Adjusted Against Damage">
                              Adjusted Against Damage
                            </option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="customer-issue-form-group customer-issue-full">
                      <label>Notes</label>

                      <textarea
                        name="notes"
                        value={
                          formData.notes
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Device transfer notes..."
                      />
                    </div>
                  </div>

                  <div className="customer-issue-actions">
                    <button
                      type="button"
                      onClick={resetIssueForm}
                    >
                      Reset
                    </button>

                    <button type="submit">
  {formData.sourceType === "Customer to Main Stock"
    ? `Return ${
        selectedAssets.length || "Selected"
      } Device${
        selectedAssets.length === 1 ? "" : "s"
      } to Main Stock`
    : formData.sourceType === "Customer to Tower"
    ? `Send ${
        selectedAssets.length || "Selected"
      } Device${
        selectedAssets.length === 1 ? "" : "s"
      } to Tower`
    : `Issue ${
        selectedAssets.length || "Selected"
      } Device${
        selectedAssets.length === 1 ? "" : "s"
      }`}
</button>
                  </div>
                </form>
              </div>

              <div className="customer-issue-card customer-issue-selector-card">
                <div className="customer-issue-card-header">
                  <div>
                    <h3>Select Devices</h3>

                    <p>
                      {selectedAssets.length}{" "}
                      device(s) selected.
                    </p>
                  </div>

                  <div className="customer-issue-selector-actions">
                    <button
                      type="button"
                      onClick={
                        selectAllVisibleAssets
                      }
                    >
                      Select All Visible
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssetKeys([]);
                        setSelectedQuantities({});
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <input
                  className="customer-issue-search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search by asset ID, device, MAC, or serial..."
                />

                <div className="customer-issue-device-list">
                  {filteredAssets.map(
                    (asset) => {
                      const selected =
                        selectedAssetKeys.some(
                          (key) =>
                            String(key) ===
                            getSelectableAssetKey(
                              asset
                            )
                        );
                      return (
                        <button
                          key={getSelectableAssetKey(
                            asset
                          )}
                          type="button"
                          className={
                            selected
                              ? "customer-issue-device active"
                              : "customer-issue-device"
                          }
                          onClick={() =>
                            toggleAssetSelection(
                              asset
                            )
                          }
                        >
                          <span className="customer-issue-device-check">
                            {selected
                              ? "✓"
                              : ""}
                          </span>

                          <span className="customer-issue-device-content">
                            <strong>
                              {getAssetLabel(
                                asset
                              )}
                            </strong>

                            <small>
                              {asset.category ||
                                "-"}{" "}
                              /{" "}
                              {asset.status ||
                                "-"}{" "}
                              /{" "}
                              {asset.location ||
                                "-"}
                              {lockedSoldAsset ? " / Purchased by customer" : ""}
                            </small>
                            {!isIndividualAsset(asset) && (
                              <small>
                                Available:{" "}
                                {money(asset.availableQuantity ?? asset.quantity ?? 0)}
                              </small>
                            )}
                          </span>

                          {selected && !isIndividualAsset(asset) && (
                            <span
                              className="customer-issue-quantity-inline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <small>Quantity</small>
                              <input
                                type="number"
                                min="1"
                                max={asset.availableQuantity ?? asset.quantity ?? 1}
                                value={
                                  selectedQuantities[getSelectableAssetKey(asset)] ||
                                  1
                                }
                                onChange={(event) =>
                                  updateSelectedQuantity(asset, event.target.value)
                                }
                              />
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}

                  {filteredAssets.length ===
                    0 && (
                    <div className="customer-issue-empty">
                      No available device was
                      found for this transfer
                      type.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedAssets.length > 0 && (
              <div className="customer-issue-selected-card compact">
                <div className="customer-issue-selected-heading">
                  <div>
                    <h3>
                      Selected Device Details
                    </h3>

                    <p>
                      Review all selected
                      devices before saving.
                    </p>
                  </div>

                  <span>
                    {selectedAssets.length}{" "}
                    Selected
                  </span>
                </div>

                <div className="customer-issue-selected-list">
                  {selectedAssets.map(
                    (asset) => (
                      <div
                        className="customer-issue-selected-item"
                        key={getAssetKey(
                          asset
                        )}
                      >
                        <div>
                          <span>
                            Asset ID
                          </span>

                          <strong>
                            {asset.assetId ||
                              "-"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Device Name
                          </span>

                          <strong>
                            {asset.deviceName ||
                              "-"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            MAC Address
                          </span>

                          <strong>
                            {asset.macAddress ||
                              "-"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Serial Number
                          </span>

                          <strong>
                            {asset.serialNumber ||
                              "-"}
                          </strong>
                        </div>

                        {!isIndividualAsset(asset) && (
                          <>
                            <div>
                              <span>Available</span>
                              <strong>
                                {money(asset.availableQuantity ?? asset.quantity ?? 0)}
                              </strong>
                            </div>

                            <label className="customer-issue-selected-price">
                              <span>Quantity</span>
                              <input
                                type="number"
                                min="1"
                                max={asset.availableQuantity ?? asset.quantity ?? 1}
                                value={asset.quantity || 1}
                                onChange={(event) =>
                                  updateSelectedQuantity(asset, event.target.value)
                                }
                              />
                            </label>
                          </>
                        )}

                        <button
                        type="button"
                        className="customer-issue-full-detail-btn"
                        onClick={() => setViewAsset(asset)}
                        >
                        Full Detail
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewAsset && (
  <div
    className="customer-asset-detail-backdrop"
    onClick={() => setViewAsset(null)}
  >
    <div
      className="customer-asset-detail-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="customer-asset-detail-header">
        <div>
          <span>Asset Information</span>

          <h3>
            {viewAsset.assetId || "No Asset ID"} -{" "}
            {viewAsset.deviceName || "Unnamed Device"}
          </h3>

          <p>
            Complete specifications and current asset information.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setViewAsset(null)}
        >
          ×
        </button>
      </div>

      <div className="customer-asset-detail-grid">
        <div>
          <span>Asset ID</span>
          <strong>{viewAsset.assetId || "-"}</strong>
        </div>

        <div>
          <span>Device Name</span>
          <strong>{viewAsset.deviceName || "-"}</strong>
        </div>

        <div>
          <span>Category</span>
          <strong>{viewAsset.category || "-"}</strong>
        </div>

        <div>
          <span>Brand</span>
          <strong>{viewAsset.brand || "-"}</strong>
        </div>

        <div>
          <span>Model</span>
          <strong>{viewAsset.model || "-"}</strong>
        </div>

        <div>
          <span>MAC Address</span>
          <strong>{viewAsset.macAddress || "-"}</strong>
        </div>

        <div>
          <span>Serial Number</span>
          <strong>{viewAsset.serialNumber || "-"}</strong>
        </div>

        <div>
          <span>Quantity</span>
          <strong>{viewAsset.quantity || 1}</strong>
        </div>

        <div>
          <span>Purchase Date</span>
          <strong>
            {formatDateTime(
              viewAsset.purchaseDate,
              viewAsset.createdAt || viewAsset.updatedAt
            )}
          </strong>
        </div>

        <div>
          <span>Supplier</span>
          <strong>{viewAsset.supplierName || "-"}</strong>
        </div>

        <div>
          <span>Current Location</span>
          <strong>{viewAsset.location || "Main Stock"}</strong>
        </div>

        <div>
          <span>Current Status</span>
          <strong>{viewAsset.status || "Unknown"}</strong>
        </div>

        <div>
          <span>Ownership Type</span>
          <strong>{viewAsset.ownershipType || "-"}</strong>
        </div>

        <div>
          <span>Current Customer</span>
          <strong>{viewAsset.customerName || "-"}</strong>
        </div>

        <div>
          <span>Customer ID</span>
          <strong>{viewAsset.customerId || "-"}</strong>
        </div>

        <div>
          <span>Previous Customer</span>
          <strong>{viewAsset.previousCustomerName || "-"}</strong>
        </div>

        <div>
          <span>Last Transfer Date</span>
          <strong>
            {formatDateTime(
              viewAsset.lastTransferDate,
              viewAsset.updatedAt || viewAsset.createdAt
            )}
          </strong>
        </div>

        <div>
          <span>Created At</span>
          <strong>{formatDateTime(viewAsset.createdAt)}</strong>
        </div>

        <div>
          <span>Last Updated</span>
          <strong>{formatDateTime(viewAsset.updatedAt)}</strong>
        </div>

        <div className="customer-asset-detail-full">
          <span>Notes</span>

          <strong>
            {viewAsset.notes || "No notes have been added for this asset."}
          </strong>
        </div>
      </div>

      <div className="customer-asset-detail-footer">
        <button
          type="button"
          onClick={() => setViewAsset(null)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {viewTransfer && (
        <div
          className="customer-issue-modal-backdrop"
        >
          <div
            className="customer-issue-detail-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="customer-issue-modal-header">
              <div>
                <h3>
                  Device Transfer Details
                </h3>

                <p>
                  Complete information for
                  the selected transfer.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewTransfer(null)
                }
              >
                ×
              </button>
            </div>

            <div className="customer-issue-detail-grid">
              <div>
                <span>Transfer ID</span>
                <strong>
                  {viewTransfer.id || "-"}
                </strong>
              </div>

              <div>
                <span>Batch ID</span>
                <strong>
                  {viewTransfer.batchId || "-"}
                </strong>
              </div>

              <div>
                <span>Transfer Type</span>
                <strong>
                  {viewTransfer.transferType ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Issue Date</span>
                <strong>
                  {formatDateTime(
                    viewTransfer.issueDate,
                    viewTransfer.createdAt || viewTransfer.updatedAt
                  )}
                </strong>
              </div>

              <div>
                <span>From</span>
                <strong>
                  {viewTransfer.fromCustomerName ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>To</span>
                <strong>
                  {viewTransfer.toCustomerName ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Asset ID</span>
                <strong>
                  {viewTransfer.assetId || "-"}
                </strong>
              </div>

              <div>
                <span>Device Name</span>
                <strong>
                  {viewTransfer.category || "-"} - {viewTransfer.deviceName || "-"}
                </strong>
              </div>

              <div>
                <span>Category</span>
                <strong>
                  {viewTransfer.category || "-"}
                </strong>
              </div>

              <div>
                <span>Brand</span>
                <strong>
                  {viewTransfer.brand || "-"}
                </strong>
              </div>

              <div>
                <span>Model</span>
                <strong>
                  {viewTransfer.model || "-"}
                </strong>
              </div>

              <div>
                <span>MAC Address</span>
                <strong>
                  {viewTransfer.macAddress ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Serial Number</span>
                <strong>
                  {viewTransfer.serialNumber ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Issue Status</span>
                <strong>
                  {viewTransfer.issueStatus ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Ownership Type</span>
                <strong>
                  {viewTransfer.ownershipType ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Sale Price</span>
                <strong>
                  {money(
                    viewTransfer.salePrice
                  )}{" "}
                  AFN
                </strong>
              </div>

              <div>
                <span>Paid Amount</span>
                <strong>
                  {money(
                    viewTransfer.paidAmount
                  )}{" "}
                  AFN
                </strong>
              </div>

              <div>
                <span>
                  Remaining Amount
                </span>

                <strong>
                  {money(
                    viewTransfer.remainAmount
                  )}{" "}
                  AFN
                </strong>
              </div>

              <div>
                <span>
                  Security Deposit
                </span>

                <strong>
                  {money(
                    viewTransfer.depositAmount
                  )}{" "}
                  {viewTransfer.depositCurrency || "AFN"}
                </strong>
              </div>

              <div>
                <span>From Customer Deposit</span>
                <strong>
                  {money(viewTransfer.previousDepositAmount)} {viewTransfer.depositCurrency || "AFN"}
                </strong>
              </div>

              <div>
                <span>Refund Paid to From Customer</span>
                <strong>
                  {money(viewTransfer.depositRefundAmount)} {viewTransfer.depositCurrency || "AFN"}
                </strong>
              </div>

              <div>
                <span>Refund Remaining</span>
                <strong>
                  {money(viewTransfer.depositRemainingAmount)} {viewTransfer.depositCurrency || "AFN"}
                </strong>
              </div>

              <div>
                <span>Deposit Status</span>
                <strong>
                  {viewTransfer.depositStatus ||
                    "-"}
                </strong>
              </div>

              <div className="customer-issue-detail-full">
                <span>Notes</span>

                <strong>
                  {viewTransfer.notes ||
                    "No notes were added."}
                </strong>
              </div>

              <div>
                <span>Created At</span>
                <strong>
                  {formatDateTime(viewTransfer.createdAt)}
                </strong>
              </div>

              <div>
                <span>Last Updated</span>
                <strong>
                  {formatDateTime(viewTransfer.updatedAt)}
                </strong>
              </div>
            </div>

            <div className="customer-issue-detail-actions">
              <button
                type="button"
                onClick={() =>
                  setViewTransfer(null)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editTransfer && (
        <div
          className="customer-issue-modal-backdrop"
        >
          <div
            className="customer-issue-edit-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="customer-issue-modal-header">
              <div>
                <h3>
                  Edit Device Transfer
                </h3>

                <p>
                  {editTransfer.category ||
                    "-"}{" "}
                  -{" "}
                  {editTransfer.assetId ||
                    "-"}{" "}
                  -{" "}
                  {editTransfer.deviceName ||
                    "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeEditTransferModal
                }
              >
                ×
              </button>
            </div>

            <div className="customer-issue-edit-summary">
              <div>
                <span>From</span>

                <strong>
                  {editTransfer.fromCustomerName ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>To</span>

                <strong>
                  {editTransfer.toCustomerName ||
                    "-"}
                </strong>
              </div>

              <div>
                <span>Asset</span>

                <strong>
                  {editTransfer.assetId ||
                    "-"}
                </strong>
              </div>
            </div>

            <form
              onSubmit={saveEditedTransfer}
            >
              <div className="customer-issue-form-grid no-padding">
                <div className="customer-issue-form-group">
                  <label>Issue Date</label>

                  <input
                    type="date"
                    name="issueDate"
                    value={
                      editForm.issueDate
                    }
                    onChange={
                      handleEditChange
                    }
                  />
                </div>

                <div className="customer-issue-form-group">
                  <label>
                    Device Status
                  </label>

                  <select
                    name="issueStatus"
                    value={
                      editForm.issueStatus
                    }
                    onChange={
                      handleEditChange
                    }
                  >
                    <option value="Issued">
                      Issued
                    </option>

                    <option value="Installed">
                      Installed
                    </option>
                  </select>
                </div>

                <div className="customer-issue-form-group">
                  <label>
                    Ownership Type
                  </label>

                  <select
                    name="ownershipType"
                    value={
                      editForm.ownershipType
                    }
                    onChange={
                      handleEditChange
                    }
                  >
                    <option value="Leased">
                      Leased / Deposit
                    </option>

                    <option value="Sold">
                      Sold
                    </option>
                  </select>
                </div>

                {editForm.ownershipType ===
                  "Sold" && (
                  <>
                    <div className="customer-issue-form-group">
                      <label>
                        Sale Price
                      </label>

                      <input
                        type="number"
                        min="0"
                        name="salePrice"
                        value={
                          editForm.salePrice
                        }
                        onChange={
                          handleEditChange
                        }
                      />
                    </div>

                    <div className="customer-issue-form-group">
                      <label>
                        Paid Amount
                      </label>

                      <input
                        type="number"
                        min="0"
                        name="paidAmount"
                        value={
                          editForm.paidAmount
                        }
                        onChange={
                          handleEditChange
                        }
                      />
                    </div>

                    <div className="customer-issue-form-group">
                      <label>
                        Remaining Amount
                      </label>

                      <input
                        value={`${money(
                          editForm.remainAmount
                        )} AFN`}
                        readOnly
                      />
                    </div>
                  </>
                )}

                {editForm.ownershipType ===
                  "Leased" && (
                  <>
                    <div className="customer-issue-form-group">
                      <label>
                        Currency
                      </label>

                      <select
                        name="depositCurrency"
                        value={editForm.depositCurrency}
                        onChange={handleEditChange}
                      >
                        <option value="AFN">
                          Afghani
                        </option>
                        <option value="USD">
                          Dollar
                        </option>
                      </select>
                    </div>

                    <div className="customer-issue-form-group">
                      <label>
                        Security Deposit
                      </label>

                      <input
                        type="number"
                        min="0"
                        name="depositAmount"
                        value={
                          editForm.depositAmount
                        }
                        onChange={
                          handleEditChange
                        }
                      />
                    </div>

                    <div className="customer-issue-form-group">
                      <label>
                        Deposit Status
                      </label>

                      <select
                        name="depositStatus"
                        value={
                          editForm.depositStatus
                        }
                        onChange={
                          handleEditChange
                        }
                      >
                        <option value="Held">
                          Held
                        </option>

                        <option value="Full Received">
                          Full Received
                        </option>

                        <option value="Refunded">
                          Refunded
                        </option>

                        <option value="Outstanding">
                          Outstanding
                        </option>
                      </select>
                    </div>
                  </>
                )}

                <div className="customer-issue-form-group customer-issue-full">
                  <label>Notes</label>

                  <textarea
                    name="notes"
                    value={editForm.notes}
                    onChange={
                      handleEditChange
                    }
                    placeholder="Transfer notes..."
                  />
                </div>
              </div>

              <div className="customer-issue-modal-footer">
                <button
                  type="button"
                  onClick={
                    closeEditTransferModal
                  }
                >
                  Cancel
                </button>

                <button type="submit">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTransfer && (
        <div
          className="customer-issue-modal-backdrop"
        >
          <div
            className="customer-issue-delete-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h3>
              Delete Device Transfer
            </h3>

            <p>
              Are you sure you want to delete
              the transfer for{" "}
              <strong>
                {deleteTransfer.assetId ||
                  "-"}{" "}
                -{" "}
                {deleteTransfer.deviceName ||
                  "-"}
              </strong>
              ?
            </p>

            <small>
              If this is the latest transfer
              for the device, the asset will
              be restored to its previous
              location and customer.
            </small>

            <div>
              <button
                type="button"
                onClick={() =>
                  setDeleteTransfer(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger"
                onClick={
                  confirmDeleteTransfer
                }
              >
                Delete Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerIssueDevice;
