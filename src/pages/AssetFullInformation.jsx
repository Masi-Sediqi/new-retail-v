import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Eye,
  Info,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { formatDateTime, todayDateValue } from "../utils/afghanDate";
import "./AssetFullInformation.css";

const today = () => todayDateValue();

const emptyPurchaseForm = {
    quantity: "",
    unitPrice: "",
    salePrice: "",
    location: "Main Stock",
    identityRecords: [],
};

const emptyPurchaseRecordForm = {
    purchaseCode: "",
    invoiceNumber: "",
    supplierRecordId: "",
    supplierName: "",
    purchaseDate: today(),
    quantity: "",
    unitPrice: "",
    billNumber: "",
    billImage: "",
    purchasedBy: "",
    identityRecords: [],
    notes: "",
};

const emptyWasteForm = {
    wasteDate: today(),
    quantity: "",
    wasteReason: "",
    reportedBy: "",
    selectedIdentityIds: [],
    wasteSearch: "",
    wasteCategory: "All",
    notes: "",
};

const emptyTransferForm = {
    transferType: "To Tower",
    sourceName: "",

    destinationType: "Tower",
    destinationRecordId: "",
    destinationName: "",

    quantity: "",
    transferDate: today(),
    responsiblePerson: "",
    transferStatus: "Completed",
    referenceNumber: "",
    selectedIdentityIds: [],
    transferSearch: "",
    transferCategory: "All",
    dealType: "Leased / Deposit",
    securityDepositPerDevice: "",
    salePricePerDevice: "",
    paidAmountPerDevice: "",
    totalAmount: "",
    trustAmount: "",
    paidAmount: "",
    salePrices: {},
    paidPrices: {},
    depositPrices: {},
    notes: "",
};

function money(value) {
    return Number(value || 0).toLocaleString("en-US");
}

function createIdentityRecord(index, existingRecord = {}) {
    return {
        id: existingRecord.id || `identity-${Date.now()}-${index}`,
        model: existingRecord.model || "",
        macAddress: existingRecord.macAddress || "",
        serialNumber: existingRecord.serialNumber || "",
        image: existingRecord.image || "",
    };
}

function syncIdentityRecords(quantity, existingRecords = []) {
    const count = Math.max(Number(quantity || 0), 0);

    return Array.from({ length: count }, (_, index) =>
        createIdentityRecord(index, existingRecords[index])
    );
}

function AssetFullInformation() {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [assets, setAssets, , assetsLoaded] =
        useJsonCollection("assets");

    const [suppliers, , , suppliersLoaded] =
        useJsonCollection("suppliers");

    const [towerAssets, setTowerAssets, , towerAssetsLoaded] =
        useJsonCollection("towerAssets");

    const [customers, , , customersLoaded] =
        useJsonCollection("customers");

    const [movements, setMovements, , movementsLoaded] =
        useJsonCollection("assetMovements");

    const [supplierPurchases] =
        useJsonCollection("supplierPurchases");

    const [deviceTransfers, setDeviceTransfers] =
        useJsonCollection("deviceTransfers");

    const [towerAssetTransfers, setTowerAssetTransfers] =
        useJsonCollection("towerAssetTransfers");

    const [, setTransactions] =
        useJsonCollection("transactions");

    const [modalType, setModalType] = useState("");
    const [openMovementAction, setOpenMovementAction] = useState("");
    const [movementActionPosition, setMovementActionPosition] =
        useState({ top: 0, left: 0 });
    const [viewMovement, setViewMovement] = useState(null);
    const [viewMovementUnit, setViewMovementUnit] = useState(null);
    const [editMovement, setEditMovement] = useState(null);
    const [editMovementForm, setEditMovementForm] = useState({});
    const [deleteMovementRecord, setDeleteMovementRecord] = useState(null);
    const [repairResultMovement, setRepairResultMovement] = useState(null);
    const [openRepairResultDetailId, setOpenRepairResultDetailId] =
        useState("");
    const [repairResultForm, setRepairResultForm] = useState({
        repairStatus: "Fixed",
        supplierRecordId: "",
        supplierName: "",
        repairCost: "",
        paidAmount: "",
        repairDate: today(),
        nextDestination: "Main Stock",
        destinationRecordId: "",
        destinationName: "",
        notes: "",
    });
    const [purchaseForm, setPurchaseForm] =
        useState(emptyPurchaseForm);
    const [purchaseRecordForm, setPurchaseRecordForm] =
        useState(emptyPurchaseRecordForm);
    const [wasteForm, setWasteForm] =
        useState(emptyWasteForm);

    const [transferForm, setTransferForm] =
        useState(emptyTransferForm);

    const asset = assets.find(
        (item) =>
            String(item.id) === String(assetId) ||
            String(item.assetId) === String(assetId)
    );

    const assetKey = String(asset?.id || asset?.assetId || "");
    const purchaseUsageUnit =
        asset?.purchaseUsageUnit ||
        asset?.purchaseUnit ||
        asset?.usageUnit ||
        "Piece";
    const getDefaultSalePrice = (record = {}) =>
        record.salePrice ??
        asset?.salePrice ??
        record.unitPrice ??
        asset?.unitPrice ??
        "";

    const repairSupplierOptions = suppliers.filter((supplier) => {
        const supplierTypes = supplier.supplierTypes || [];

        return supplierTypes.some((type) => {
            const normalizedType = String(type || "").toLowerCase();
            return (
                normalizedType === "repair service" ||
                normalizedType.includes("repair")
            );
        });
    });

    const getSupplierOptionKey = (supplier, index = 0) =>
        String(
            supplier?.id ||
            supplier?.supplierName ||
            supplier?.companyName ||
            `supplier-${index}`
        );

   const assetMovements = useMemo(() => {
    const getMovementTimestamp = (movement) => {
        const createdAtTime = new Date(
            movement.createdAt ||
            movement.updatedAt ||
            movement.date ||
            0
        ).getTime();

        return Number.isFinite(createdAtTime)
            ? createdAtTime
            : 0;
    };

    return movements
        .filter(
            (item) =>
                String(item.parentAssetId || "") === String(assetKey) ||
                String(item.assetRecordId || item.assetId || "") ===
                    String(assetKey) ||
                String(item.assetId || "") === String(asset?.assetId || "")
        )
        .sort(
            (firstMovement, secondMovement) =>
                getMovementTimestamp(secondMovement) -
                getMovementTimestamp(firstMovement)
        );
}, [movements, assetKey, asset?.assetId]);

    const getMovementDeviceName = (movement) =>
        movement?.deviceName ||
        movement?.assetName ||
        movement?.assetDeviceName ||
        asset?.deviceName ||
        "-";
    const getMovementImage = (movement) =>
        (movement?.identityRecords || []).find((record) => record?.image)?.image ||
        movement?.assetImage ||
        movement?.image ||
        asset?.assetImage ||
        "";
const getMovementRowClass = (movement) => {
    const movementType = String(
        movement?.movementType || ""
    )
        .trim()
        .toLowerCase();

    const sourceName = String(
        movement?.sourceName || ""
    )
        .trim()
        .toLowerCase();

    if (movementType === "waste") {
        return "asset-movement-row-waste";
    }

    if (movementType === "purchase") {
        return "asset-movement-row-purchase";
    }

    if (sourceName === "main stock") {
        return "asset-movement-row-main-stock";
    }

    if (sourceName && sourceName !== "main stock") {
        return "asset-movement-row-external-source";
    }

    return "";
};

const canManageMovementRecord = (movement) => {
    const movementType = String(movement?.movementType || "").trim();
    const sourceName = String(movement?.sourceName || "").trim().toLowerCase();

    if (movementType === "Transfer" && sourceName && sourceName !== "main stock") {
        return false;
    }

    return true;
};
    const totalBalanceAdded = assetMovements
        .filter((item) => item.movementType === "Balance")
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const totalPurchased = assetMovements
        .filter((item) => item.movementType === "Purchase")
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const totalWasted = assetMovements
        .filter((item) => item.movementType === "Waste")
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const totalTransferred = assetMovements
        .filter((item) => item.movementType === "Transfer")
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const totalPurchaseValue = assetMovements
        .filter((item) => item.movementType === "Purchase")
        .reduce(
            (sum, item) =>
                sum +
                Number(item.quantity || 0) *
                Number(item.unitPrice || 0),
            0
        );

    const currentQuantity = Number(asset?.quantity || 0);
    const currentStock = Math.max(currentQuantity, 0);
    const isIndividualAsset = String(
        asset?.identityTracking || ""
    )
        .toLowerCase()
        .includes("individual") ||
        (asset?.identityRecords || []).length > 0;

    const availableIdentityRecords = (asset?.identityRecords || []).map(
        (record, index) => ({
            ...record,
            id: record.id || `identity-existing-${assetKey}-${index}`,
        })
    );

    const mainStockQuantity =
        String(asset?.location || "").toLowerCase() === "main stock"
            ? currentQuantity
            : 0;

    const editMovementIncludedRecords = (
        editMovement?.identityRecords || []
    ).map((record, index) => ({
        ...record,
        id: record.id || `movement-${editMovement?.id || "record"}-${index}`,
    }));

    const editMovementUnitOptions = [
        ...editMovementIncludedRecords,
        ...availableIdentityRecords.filter(
            (record) =>
                !editMovementIncludedRecords.some(
                    (included) => String(included.id) === String(record.id)
                )
        ),
    ];

    const editMovementCategoryOptions = [
        "All",
        ...new Set(
            editMovementUnitOptions
                .map((record) => record.category || asset?.category || "")
                .filter(Boolean)
        ),
    ];

    const filteredEditMovementUnitOptions = editMovementUnitOptions.filter(
        (record) => {
            const keyword = String(
                editMovementForm.transferSearch || ""
            )
                .trim()
                .toLowerCase();
            const recordCategory = record.category || asset?.category || "";
            const matchesCategory =
                !editMovementForm.transferCategory ||
                editMovementForm.transferCategory === "All" ||
                recordCategory === editMovementForm.transferCategory;
            const matchesSearch =
                !keyword ||
                String(record.model || "").toLowerCase().includes(keyword) ||
                String(record.macAddress || "").toLowerCase().includes(keyword) ||
                String(record.serialNumber || "").toLowerCase().includes(keyword);

            return matchesCategory && matchesSearch;
        }
    );

    const selectedEditMovementRecords = editMovementUnitOptions.filter((record) =>
        (editMovementForm.selectedIdentityIds || []).includes(record.id)
    );

    const editMovementQuantity = Number(editMovementForm.quantity || 0);
    const editMovementSalePricePerQuantity = Number(
        editMovementForm.salePricePerDevice ||
            editMovementForm.securityDepositPerDevice ||
            getDefaultSalePrice() ||
            0
    );

    const editTransferSaleTotal = isIndividualAsset
        ? selectedEditMovementRecords.reduce(
            (sum, record) =>
                sum +
                Number(
                    editMovementForm.salePrices?.[record.id] ||
                    getDefaultSalePrice(record) ||
                    0
                ),
            0
        )
        : editMovementForm.transferType === "To Customer" &&
            editMovementForm.dealType === "Sold"
            ? editMovementQuantity * editMovementSalePricePerQuantity
            : Number(editMovementForm.totalAmount || 0);

    const editTransferDepositTotal = isIndividualAsset
        ? selectedEditMovementRecords.reduce(
            (sum, record) =>
                sum +
                Number(
                    editMovementForm.depositPrices?.[record.id] ||
                    editMovementForm.securityDepositPerDevice ||
                    0
            ),
            0
        )
        : editMovementForm.transferType === "To Customer" &&
            editMovementForm.dealType === "Leased / Deposit"
            ? editMovementQuantity * editMovementSalePricePerQuantity
            : Number(editMovementForm.totalAmount || editMovementForm.trustAmount || 0);

    const editTransferPaidTotal =
        editMovementForm.transferType === "To Customer" &&
            editMovementForm.dealType === "Sold"
            ? isIndividualAsset
                ? Number(editMovementForm.paidAmount || 0)
                : Number(editMovementForm.paidAmount || 0)
            : 0;

    const editTransferRemainingTotal = Math.max(
        editTransferSaleTotal - editTransferPaidTotal,
        0
    );

    const editDepositPaidTotal =
        editMovementForm.transferType === "To Customer" &&
            editMovementForm.dealType === "Leased / Deposit"
            ? Number(editMovementForm.paidAmount || 0)
            : 0;

    const editDepositRemainingTotal = Math.max(
        editTransferDepositTotal - editDepositPaidTotal,
        0
    );

    const editWasteMaxQuantity =
        editMovement?.movementType === "Waste"
            ? currentQuantity + Number(editMovement?.quantity || 0)
            : currentQuantity;

    const editWasteLossAmount =
        editMovement?.movementType === "Waste" && isIndividualAsset
            ? selectedEditMovementRecords.reduce(
                (sum, record) =>
                    sum + Number(record.unitPrice || asset?.unitPrice || 0),
                0
            )
            : editMovement?.movementType === "Waste"
                ? Number(editMovementForm.quantity || 0) *
                  Number(asset?.unitPrice || 0)
                : 0;

    const wasteCategoryOptions = [
        "All",
        ...new Set(
            availableIdentityRecords
                .map((record) => record.category || asset?.category || "")
                .filter(Boolean)
        ),
    ];

    const filteredWasteIdentityRecords = availableIdentityRecords.filter(
        (record) => {
            const keyword = wasteForm.wasteSearch.trim().toLowerCase();
            const recordCategory = record.category || asset?.category || "";
            const matchesCategory =
                wasteForm.wasteCategory === "All" ||
                recordCategory === wasteForm.wasteCategory;

            const matchesSearch =
                !keyword ||
                (record.model || "").toLowerCase().includes(keyword) ||
                (record.macAddress || "").toLowerCase().includes(keyword) ||
                (record.serialNumber || "").toLowerCase().includes(keyword);

            return matchesCategory && matchesSearch;
        }
    );

    const selectedWasteIdentityRecords = availableIdentityRecords.filter(
        (record) => wasteForm.selectedIdentityIds.includes(record.id)
    );

    const selectedWasteLoss = selectedWasteIdentityRecords.reduce(
        (sum, record) =>
            sum + Number(record.unitPrice || asset?.unitPrice || 0),
        0
    );

    const transferCategoryOptions = wasteCategoryOptions;

    const filteredTransferIdentityRecords = availableIdentityRecords.filter(
        (record) => {
            const keyword = transferForm.transferSearch.trim().toLowerCase();
            const recordCategory = record.category || asset?.category || "";
            const matchesCategory =
                transferForm.transferCategory === "All" ||
                recordCategory === transferForm.transferCategory;

            const matchesSearch =
                !keyword ||
                (record.model || "").toLowerCase().includes(keyword) ||
                (record.macAddress || "").toLowerCase().includes(keyword) ||
                (record.serialNumber || "").toLowerCase().includes(keyword);

            return matchesCategory && matchesSearch;
        }
    );

    const selectedTransferIdentityRecords = availableIdentityRecords.filter(
        (record) => transferForm.selectedIdentityIds.includes(record.id)
    );

    const selectedTransferSaleTotal = selectedTransferIdentityRecords.reduce(
        (sum, record) =>
            sum +
            Number(
                transferForm.salePrices[record.id] ||
                getDefaultSalePrice(record) ||
                0
            ),
        0
    );

    const transferPaidAmount = Number(transferForm.paidAmount || 0);

    const selectedTransferDepositTotal = selectedTransferIdentityRecords.reduce(
        (sum, record) =>
            sum +
            Number(
                transferForm.depositPrices[record.id] ||
                transferForm.securityDepositPerDevice ||
                0
            ),
        0
    );

    const selectedTransferRemainingTotal = Math.max(
        selectedTransferSaleTotal - transferPaidAmount,
        0
    );

    const isCustomerTransfer =
        transferForm.transferType === "To Customer";

    const customerTransferQuantity = isIndividualAsset
        ? selectedTransferIdentityRecords.length
        : Number(transferForm.quantity || 0);

    const securityDepositPerDevice = Number(
        transferForm.securityDepositPerDevice || 0
    );

    const customerDepositTotal = Number(
        transferForm.securityDepositPerDevice || 0
    );

    const customerDepositPaidTotal =
        isCustomerTransfer && transferForm.dealType === "Leased / Deposit"
            ? 0
            : 0;

    const customerDepositRemainingTotal = Math.max(
        customerDepositTotal - customerDepositPaidTotal,
        0
    );

    const defaultBulkCustomerSaleTotal =
        customerTransferQuantity * Number(getDefaultSalePrice() || 0);
    const bulkCustomerSaleTotal = Number(
        transferForm.totalAmount || defaultBulkCustomerSaleTotal || 0
    );
    const bulkCustomerPaidTotal = Number(transferForm.paidAmount || 0);
    const bulkSalePricePerDevice =
        customerTransferQuantity > 0
            ? bulkCustomerSaleTotal / customerTransferQuantity
            : 0;

    const customerSaleTotal = isIndividualAsset
        ? selectedTransferSaleTotal
        : bulkCustomerSaleTotal;

    const customerPaidTotal = isIndividualAsset
        ? transferPaidAmount
        : bulkCustomerPaidTotal;

    const customerRemainingTotal = isIndividualAsset
        ? selectedTransferRemainingTotal
        : Math.max(customerSaleTotal - customerPaidTotal, 0);

    const transferQuantityValue = isIndividualAsset
        ? selectedTransferIdentityRecords.reduce(
            (sum, record) =>
                sum + Number(record.unitPrice || asset?.unitPrice || 0),
            0
        )
        : Number(transferForm.quantity || 0) * Number(asset?.unitPrice || 0);

    const limitQuantityToCurrentStock = (
  value,
  setForm,
  fieldName = "quantity"
) => {
  if (value === "") {
    setForm((previous) => ({
      ...previous,
      [fieldName]: "",
    }));

    return;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return;
  }

  if (numericValue > currentStock) {
    notify(
      `Quantity cannot be greater than current stock (${currentStock}).`,
      "error"
    );

    setForm((previous) => ({
      ...previous,
      [fieldName]: String(currentStock),
    }));

    return;
  }

  setForm((previous) => ({
    ...previous,
    [fieldName]: value,
  }));
};

    const selectedTower =
        transferForm.transferType === "To Tower"
            ? towerAssets.find(
                (tower) =>
                    String(tower.id) ===
                    String(transferForm.destinationRecordId)
            )
            : null;

    const selectedCustomer =
        transferForm.transferType === "To Customer"
            ? customers.find(
                (customer) =>
                    String(customer.id) ===
                    String(transferForm.destinationRecordId)
            )
            : null;

    const generateNextPurchaseCode = () => {
        const maxNumber = [...movements, ...supplierPurchases].reduce((max, movement) => {
            const match = String(
                movement.referenceNumber || movement.purchaseCode || movement.invoiceNumber || ""
            ).match(/^(?:REF|PUR)-(\d+)$/i);

            if (!match) return max;

            const number = Number(match[1] || 0);
            return number > max ? number : max;
        }, 0);

        return `REF-${String(maxNumber + 1).padStart(4, "0")}`;
    };

    useEffect(() => {
        if (!openMovementAction) {
            return undefined;
        }

        const closeMenu = () => {
            setOpenMovementAction("");
        };

        document.addEventListener("mousedown", closeMenu);
        window.addEventListener("resize", closeMenu);
        window.addEventListener("scroll", closeMenu, true);

        return () => {
            document.removeEventListener("mousedown", closeMenu);
            window.removeEventListener("resize", closeMenu);
            window.removeEventListener("scroll", closeMenu, true);
        };
    }, [openMovementAction]);

    useEffect(() => {
        const requestedModal = location.state?.openAssetModal;

        if (!asset || !requestedModal) {
            return;
        }

        if (requestedModal === "waste") {
            setWasteForm(emptyWasteForm);
            setModalType("waste");
        }

        if (requestedModal === "transfer") {
            setTransferForm({
                ...emptyTransferForm,
                sourceName: "Main Stock",
                destinationType: "Tower",
            });
            setModalType("transfer");
        }

        navigate(location.pathname, { replace: true, state: {} });
    }, [asset, location.pathname, location.state, navigate]);

    const toggleMovementActionMenu = (event, movementId) => {
        event.stopPropagation();

        if (String(openMovementAction) === String(movementId)) {
            setOpenMovementAction("");
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const menuWidth = 160;
        const menuHeight = 170;
        const gap = 8;

        const left = Math.min(
            Math.max(rect.right - menuWidth, 12),
            window.innerWidth - menuWidth - 12
        );

        const hasSpaceBelow =
            window.innerHeight - rect.bottom >= menuHeight + gap;

        const top = hasSpaceBelow
            ? rect.bottom + gap
            : Math.max(12, rect.top - menuHeight - gap);

        setMovementActionPosition({ top, left });
        setOpenMovementAction(movementId);
    };

    const updateAssetQuantity = async (nextQuantity, extraData = {}) => {
        const updatedAssets = assets.map((item) => {
            const matches =
                String(item.id || item.assetId) === String(assetKey);

            if (!matches) return item;

            return {
                ...item,
                quantity: Math.max(Number(nextQuantity || 0), 0),
                ...extraData,
                updatedAt: new Date().toISOString(),
            };
        });

        return setAssets(updatedAssets);
    };

    const getStatusForLocation = (location) => {
        if (location === "Tower") return "Installed";
        if (location === "Customer") return "Issued";
        if (location === "Repair") return "Under Repair";
        if (location === "Returned Stock") return "Returned";
        return "In Stock";
    };

    const saveMovement = async (movement) => {
        const createdAt = new Date().toISOString();
        const movementRecord = {
            id: `asset-movement-${Date.now()}`,
            assetRecordId: asset.id || "",
            assetId: asset.assetId || "",
            deviceName: asset.deviceName || "",
            category: asset.category || "",
            assetImage: asset.assetImage || "",
            ...movement,
            createdAt,
            updatedAt: createdAt,
        };
        const saved = await setMovements([
            ...movements,
            movementRecord,
        ]);

        return saved ? movementRecord : false;
    };

    const getIdentityValue = (record, field) =>
        String(record?.[field] || "").trim().toLowerCase();

    const hasRequiredIdentity = (record) =>
        Boolean(record.model && (record.macAddress || record.serialNumber));

    const hasDuplicateIdentityValues = (identityRecords, field) => {
        const values = identityRecords
            .map((record) => getIdentityValue(record, field))
            .filter(Boolean);

        return new Set(values).size !== values.length;
    };

    const hasExistingIdentityValue = (identityRecords, field) => {
        const existingValues = new Set(
            (asset?.identityRecords || [])
                .map((record) => getIdentityValue(record, field))
                .filter(Boolean)
        );

        return identityRecords.some((record) =>
            existingValues.has(getIdentityValue(record, field))
        );
    };

    const updateBalanceIdentityRecord = (index, field, value) => {
        setPurchaseForm((previous) => {
            const nextRecords = syncIdentityRecords(
                previous.quantity,
                previous.identityRecords
            );

            nextRecords[index] = {
                ...nextRecords[index],
                [field]: value,
            };

            return {
                ...previous,
                identityRecords: nextRecords,
            };
        });
    };

    const handleBalanceRecordImageChange = (index, event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            notify("Image size must be 2 MB or less.", "error");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            updateBalanceIdentityRecord(
                index,
                "image",
                String(reader.result || "")
            );
        };

        reader.readAsDataURL(file);
    };

    const updatePurchaseIdentityRecord = (index, field, value) => {
        setPurchaseRecordForm((previous) => {
            const nextRecords = syncIdentityRecords(
                previous.quantity,
                previous.identityRecords
            );

            nextRecords[index] = {
                ...nextRecords[index],
                [field]: value,
            };

            return {
                ...previous,
                identityRecords: nextRecords,
            };
        });
    };

    const updateEditPurchaseIdentityRecord = (
    index,
    field,
    value
) => {
    setEditMovementForm((previous) => {
        const nextRecords = [
            ...(previous.identityRecords || []),
        ];

        nextRecords[index] = {
            ...nextRecords[index],
            [field]: value,
        };

        return {
            ...previous,
            identityRecords: nextRecords,
            selectedIdentityIds: nextRecords.map(
                (record) => record.id
            ),
            quantity: nextRecords.length,
        };
    });
};

const handleEditPurchaseRecordImageChange = (
    index,
    event
) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        notify(
            "Image size must be 2 MB or less.",
            "error"
        );
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        updateEditPurchaseIdentityRecord(
            index,
            "image",
            String(reader.result || "")
        );
    };

    reader.readAsDataURL(file);
};

const handleEditPurchaseBillImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        notify(
            "Bill image size must be 2 MB or less.",
            "error"
        );
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        setEditMovementForm((previous) => ({
            ...previous,
            billImage: String(reader.result || ""),
        }));
    };

    reader.readAsDataURL(file);
};

    const handlePurchaseRecordImageChange = (index, event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            notify("Image size must be 2 MB or less.", "error");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            updatePurchaseIdentityRecord(
                index,
                "image",
                String(reader.result || "")
            );
        };

        reader.readAsDataURL(file);
    };

    const handlePurchaseBillImageChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            notify("Bill image size must be 2 MB or less.", "error");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            setPurchaseRecordForm((previous) => ({
                ...previous,
                billImage: String(reader.result || ""),
            }));
        };

        reader.readAsDataURL(file);
    };

    const saveBalance = async (event) => {
        event.preventDefault();

        const quantity = Number(purchaseForm.quantity || 0);
        const unitPrice = 0;
        const totalAmount = quantity * unitPrice;
        const location = "Main Stock";
        const identityRecords = isIndividualAsset
            ? syncIdentityRecords(
                quantity,
                purchaseForm.identityRecords
            ).map((record) => ({
                ...record,
                model: record.model.trim(),
                macAddress: record.macAddress.trim(),
                serialNumber: record.serialNumber.trim(),
            }))
            : [];

        if (!Number.isFinite(quantity) || quantity <= 0) {
            notify("Balance quantity must be greater than zero.", "error");
            return;
        }

        if (
            isIndividualAsset &&
            (!Number.isInteger(quantity) ||
                identityRecords.length !== quantity)
        ) {
            notify(
                "Individual balance quantity must be a whole number.",
                "error"
            );
            return;
        }

        if (
            isIndividualAsset &&
            identityRecords.some(
                (record) => !hasRequiredIdentity(record)
            )
        ) {
            notify(
                "Model and either MAC Address or Serial Number are for every individual record.",
                "error"
            );
            return;
        }

        if (
            isIndividualAsset &&
            hasDuplicateIdentityValues(identityRecords, "serialNumber")
        ) {
            notify(
                "Serial Number must be unique for every individual record.",
                "error"
            );
            return;
        }

        if (
            isIndividualAsset &&
            hasDuplicateIdentityValues(identityRecords, "macAddress")
        ) {
            notify(
                "MAC Address must be unique for every individual record.",
                "error"
            );
            return;
        }

        if (
            isIndividualAsset &&
            hasExistingIdentityValue(identityRecords, "serialNumber")
        ) {
            notify(
                "Serial Number already exists for this asset.",
                "error"
            );
            return;
        }

        if (
            isIndividualAsset &&
            hasExistingIdentityValue(identityRecords, "macAddress")
        ) {
            notify(
                "MAC Address already exists for this asset.",
                "error"
            );
            return;
        }

        const nextQuantity = currentQuantity + quantity;

        const assetSaved = await updateAssetQuantity(nextQuantity, {
            purchaseUnit: purchaseUsageUnit,
            unitPrice,
            location,
            status: getStatusForLocation(location),
            identityRecords: isIndividualAsset
                ? [
                    ...(asset.identityRecords || []),
                    ...identityRecords.map((record) => ({
                        ...record,
                        category: asset.category || "",
                        unitPrice,
                        addedAt: new Date().toISOString(),
                    })),
                ]
                : asset.identityRecords || [],
        });

        if (!assetSaved) return;

        const movementSaved = await saveMovement({
            movementType: "Balance",
            date: today(),
            quantity,
            unitPrice,
            totalAmount,
            sourceName: "Balance",
            destinationName: location,
            paymentStatus: "Added",
            identityRecords: isIndividualAsset
                ? identityRecords
                : asset?.assetImage
                    ? [
                        {
                            id: `single-identity-${assetKey}`,
                            model: asset?.model || "",
                            macAddress: asset?.macAddress || "",
                            serialNumber: asset?.serialNumber || "",
                            image: asset.assetImage,
                            category: asset.category || "",
                            unitPrice,
                        },
                    ]
                    : [],
            assetImage: asset?.assetImage || "",
            notes: "",
        });

        if (!movementSaved) return;

        notify("Asset balance added successfully.");
        setPurchaseForm(emptyPurchaseForm);
        setModalType("");
    };

    const savePurchaseExpense = async ({
    movementId,
    purchaseCode,
    purchaseDate,
    supplierName,
    quantity,
    unitPrice,
    paidAmount,
    remainingAmount,
    billNumber,
    invoiceNumber,
    notes,
}) => {
    const createdAt = new Date().toISOString();

    const expenseRecord = {
        id: `asset-purchase-expense-${movementId}`,

        type: "expense",
        title: `Asset Purchase - ${asset?.deviceName || "Asset"}`,
        category: "Purchases",
        amount: Number(paidAmount || 0),
        date: purchaseDate,

        description: [
            purchaseCode
                ? `Reference Number: ${purchaseCode}`
                : "",
            supplierName
                ? `Supplier: ${supplierName}`
                : "",
            `Quantity: ${quantity}`,
            `Unit Price: ${money(unitPrice)} AFN`,
            invoiceNumber || billNumber
                ? `Invoice Number: ${invoiceNumber || billNumber}`
                : "",
            `Paid: ${money(paidAmount)} AFN`,
            `Remaining: ${money(remainingAmount)} AFN`,
            notes || "",
        ]
            .filter(Boolean)
            .join(" | "),

        source: "asset-purchase",
        referenceId: movementId,
        purchaseCode: purchaseCode || "",
        referenceNumber: purchaseCode || "",
        assetRecordId: asset?.id || "",
        assetId: asset?.assetId || "",
        supplierName: supplierName || "",
        billNumber: billNumber || "",
        invoiceNumber: invoiceNumber || billNumber || "",

        createdAt,
        updatedAt: createdAt,
    };

    return setTransactions((previousTransactions) => [
        ...previousTransactions.filter(
            (transaction) =>
                !(
                    transaction.source === "asset-purchase" &&
                    String(transaction.referenceId || "") ===
                        String(movementId)
                )
        ),
        expenseRecord,
    ]);
};

    const removePurchaseExpense = async (movementId) =>
        setTransactions((previousTransactions) =>
            previousTransactions.filter(
                (transaction) =>
                    !(
                        transaction.source === "asset-purchase" &&
                        String(transaction.referenceId || "") ===
                            String(movementId)
                )
            )
        );

    const saveWasteExpense = async (movement) => {
        const amount = Number(movement?.estimatedLoss || 0);

        if (!movement?.id || amount <= 0) {
            return setTransactions((previousTransactions) =>
                previousTransactions.filter(
                    (transaction) =>
                        !(
                            transaction.source === "asset-waste" &&
                            String(transaction.referenceId || "") ===
                                String(movement?.id || "")
                        )
                )
            );
        }

        const updatedAt = new Date().toISOString();
        const expenseRecord = {
            id: `asset-waste-expense-${movement.id}`,
            type: "expense",
            title: `Asset Waste - ${movement.deviceName || asset?.deviceName || "Asset"}`,
            category: "Asset Waste",
            amount,
            date: movement.date,
            description: [
                movement.wasteReason ? `Reason: ${movement.wasteReason}` : "",
                `Quantity: ${movement.quantity || 0}`,
                `Unit Price: ${money(movement.unitPrice || asset?.unitPrice || 0)} AFN`,
                `Loss: ${money(amount)} AFN`,
                movement.notes || "",
            ]
                .filter(Boolean)
                .join(" | "),
            source: "asset-waste",
            referenceId: movement.id,
            assetRecordId: movement.assetRecordId || asset?.id || "",
            assetId: movement.assetId || asset?.assetId || "",
            createdAt: movement.createdAt || updatedAt,
            updatedAt,
        };

        return setTransactions((previousTransactions) => [
            ...previousTransactions.filter(
                (transaction) =>
                    !(
                        transaction.source === "asset-waste" &&
                        String(transaction.referenceId || "") ===
                            String(movement.id)
                    )
            ),
            expenseRecord,
        ]);
    };

    const saveRepairExpense = async (movement) => {
        const repairResult = movement?.repairResult || {};
        const amount = Number(repairResult.repairCost || 0);

        if (!movement?.id || amount <= 0) {
            return setTransactions((previousTransactions) =>
                previousTransactions.filter(
                    (transaction) =>
                        !(
                            transaction.source === "asset-repair" &&
                            String(transaction.referenceId || "") ===
                                String(movement?.id || "")
                        )
                )
            );
        }

        const updatedAt = new Date().toISOString();
        const expenseRecord = {
            id: `asset-repair-expense-${movement.id}`,
            type: "expense",
            title: `Asset Repair - ${movement.deviceName || asset?.deviceName || "Asset"}`,
            category: "Repairs",
            amount,
            date: repairResult.repairDate || movement.date,
            description: [
                repairResult.repairStatus ? `Status: ${repairResult.repairStatus}` : "",
                repairResult.supplierName ? `Supplier: ${repairResult.supplierName}` : "",
                `Cost: ${money(repairResult.repairCost || 0)} AFN`,
                `Paid: ${money(amount)} AFN`,
                `Remaining: ${money(repairResult.remainingAmount || 0)} AFN`,
                repairResult.notes || "",
            ]
                .filter(Boolean)
                .join(" | "),
            source: "asset-repair",
            referenceId: movement.id,
            assetRecordId: movement.assetRecordId || asset?.id || "",
            assetId: movement.assetId || asset?.assetId || "",
            supplierRecordId: repairResult.supplierRecordId || "",
            supplierName: repairResult.supplierName || "",
            createdAt: movement.createdAt || updatedAt,
            updatedAt,
        };

        return setTransactions((previousTransactions) => [
            ...previousTransactions.filter(
                (transaction) =>
                    !(
                        transaction.source === "asset-repair" &&
                        String(transaction.referenceId || "") ===
                            String(movement.id)
                    )
            ),
            expenseRecord,
        ]);
    };

    const saveCustomerSaleIncome = async (movement) => {
        const isCustomerSale =
            movement?.movementType === "Transfer" &&
            movement?.transferType === "To Customer" &&
            movement?.dealType === "Sold";
        const paidAmount = Number(movement?.paidAmount || 0);

        if (!isCustomerSale || paidAmount <= 0) {
            return setTransactions((previousTransactions) =>
                previousTransactions.filter(
                    (transaction) =>
                        !(
                            transaction.source === "customer-device-sale" &&
                            String(transaction.referenceId || "") ===
                                String(movement?.id || "")
                        )
                )
            );
        }

        const updatedAt = new Date().toISOString();
        const incomeRecord = {
            id: `customer-device-sale-income-${movement.id}`,
            type: "income",
            title: `Device Sale - ${movement.deviceName || asset?.deviceName || "Asset"}`,
            category: "Customer Payment",
            amount: paidAmount,
            date: movement.date,
            description: [
                movement.destinationName
                    ? `Customer: ${movement.destinationName}`
                    : "",
                `Total: ${money(movement.totalAmount || 0)} AFN`,
                `Paid: ${money(paidAmount)} AFN`,
                `Remaining: ${money(movement.remainingAmount || 0)} AFN`,
                movement.referenceNumber
                    ? `Reference: ${movement.referenceNumber}`
                    : "",
                movement.notes || "",
            ]
                .filter(Boolean)
                .join(" | "),
            source: "customer-device-sale",
            referenceId: movement.id,
            assetRecordId: movement.assetRecordId || asset?.id || "",
            assetId: movement.assetId || asset?.assetId || "",
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
                        String(transaction.referenceId || "") ===
                            String(movement.id)
                    )
            ),
            incomeRecord,
        ]);
    };

   const savePurchaseRecord = async (event) => {
    event.preventDefault();

    const quantity = Number(
        purchaseRecordForm.quantity || 0
    );

    const totalAmount = 0;
    const unitPrice = 0;
    const paidAmount = 0;
    const remainingAmount = 0;

    const identityRecords = isIndividualAsset
        ? syncIdentityRecords(
              quantity,
              purchaseRecordForm.identityRecords
          ).map((record) => ({
              ...record,
              model: record.model.trim(),
              macAddress:
                  record.macAddress.trim(),
              serialNumber:
                  record.serialNumber.trim(),
          }))
        : [];

    /*
      تمام Validationهای فعلی خودت
      در همین قسمت باقی بمانند.
    */

    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {
        notify(
            "Purchase quantity must be greater than zero.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        (!Number.isInteger(quantity) || identityRecords.length !== quantity)
    ) {
        notify(
            "The quantity must match the number of individual devices.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        identityRecords.some((record) => !hasRequiredIdentity(record))
    ) {
        notify(
            "Model and either MAC Address or Serial Number are for every device.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        hasDuplicateIdentityValues(identityRecords, "serialNumber")
    ) {
        notify(
            "Serial Number must be unique for every device.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        hasDuplicateIdentityValues(identityRecords, "macAddress")
    ) {
        notify(
            "MAC Address must be unique for every device.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        hasExistingIdentityValue(identityRecords, "serialNumber")
    ) {
        notify(
            "Serial Number already exists for this asset.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        hasExistingIdentityValue(identityRecords, "macAddress")
    ) {
        notify(
            "MAC Address already exists for this asset.",
            "error"
        );
        return;
    }

    const referenceNumber =
        purchaseRecordForm.purchaseCode.trim() || generateNextPurchaseCode();

    const duplicateReference = [...movements, ...supplierPurchases].some(
        (movement) =>
            String(movement.referenceNumber || movement.purchaseCode || "")
                .trim()
                .toLowerCase() === referenceNumber.toLowerCase()
    );

    if (duplicateReference) {
        notify("Reference Number must be unique for every purchase.", "error");
        return;
    }

    const nextQuantity =
        currentQuantity + quantity;

    const assetSaved =
        await updateAssetQuantity(nextQuantity, {
            purchaseUnit: purchaseUsageUnit,
            unitPrice,
            location: "Main Stock",
            status: "In Stock",

            identityRecords: isIndividualAsset
                ? [
                      ...(asset.identityRecords || []),

                      ...identityRecords.map(
                          (record) => ({
                              ...record,
                              category:
                                  asset.category || "",
                              unitPrice,
                              addedAt:
                                  new Date().toISOString(),
                              sourceType: "Purchase",
                              purchaseCode: referenceNumber,
                              referenceNumber,
                          })
                      ),
                  ]
                : asset.identityRecords || [],
        });

    if (!assetSaved) return;

    const movementId =
        `asset-movement-${Date.now()}`;

    const createdAt =
        new Date().toISOString();

    const purchaseMovement = {
        id: movementId,

        assetRecordId: asset?.id || "",
        assetId: asset?.assetId || "",
        deviceName: asset?.deviceName || "",
        category: asset?.category || "",
        assetImage: asset?.assetImage || "",

        movementType: "Purchase",
        purchaseCode: referenceNumber,
        referenceNumber,

        date:
            purchaseRecordForm.purchaseDate,

        quantity,
        unitPrice,
        totalAmount,
        paidAmount,
        remainingAmount,

        supplierName:
            purchaseRecordForm.supplierName.trim(),

        supplierRecordId:
            purchaseRecordForm.supplierRecordId,

        billNumber:
            purchaseRecordForm.invoiceNumber.trim(),

        invoiceNumber:
            purchaseRecordForm.invoiceNumber.trim(),

        billImage:
            purchaseRecordForm.billImage,

        responsiblePerson:
            purchaseRecordForm.purchasedBy.trim(),

        sourceName:
            purchaseRecordForm.supplierName.trim() ||
            "Supplier",

        destinationName: "Main Stock",

        paymentStatus:
            remainingAmount === 0
                ? "Paid"
                : paidAmount > 0
                    ? "Partial"
                    : "Unpaid",

        identityRecords,

        notes:
            purchaseRecordForm.notes.trim(),

        createdAt,
        updatedAt: createdAt,
    };

    const movementSaved =
        await setMovements([
            ...movements,
            purchaseMovement,
        ]);

    if (!movementSaved) return;

    const expenseSaved =
        await savePurchaseExpense({
            movementId,

            purchaseCode: referenceNumber,
            referenceNumber,

            purchaseDate:
                purchaseRecordForm.purchaseDate,

            supplierName:
                purchaseRecordForm.supplierName.trim(),

            quantity,
            unitPrice,
            totalAmount,
            paidAmount,
            remainingAmount,

            billNumber:
                purchaseRecordForm.invoiceNumber.trim(),

            invoiceNumber:
                purchaseRecordForm.invoiceNumber.trim(),

            notes:
                purchaseRecordForm.notes.trim(),
        });

    if (!expenseSaved) {
        notify(
            "Purchase was recorded, but its expense could not be saved.",
            "error"
        );
        return;
    }

    notify(
        "Asset purchase and expense recorded successfully."
    );

    setPurchaseRecordForm(
        emptyPurchaseRecordForm
    );

    setModalType("");
};

    const saveWaste = async (event) => {
        event.preventDefault();

        const quantity = isIndividualAsset
            ? selectedWasteIdentityRecords.length
            : Number(wasteForm.quantity || 0);
        const estimatedLoss = isIndividualAsset
            ? selectedWasteLoss
            : quantity * Number(asset?.unitPrice || 0);

        if (isIndividualAsset && quantity <= 0) {
            notify("Please select at least one individual unit.", "error");
            return;
        }

        if (!isIndividualAsset && quantity <= 0) {
            notify("Waste quantity must be greater than zero.", "error");
            return;
        }

        if (quantity > currentStock) {
  notify(
    `Waste quantity cannot be greater than current stock (${currentStock}).`,
    "error"
  );

  return;
}

        const nextQuantity = currentQuantity - quantity;

        const assetSaved = await updateAssetQuantity(nextQuantity, {
            status: nextQuantity > 0 ? asset.status : "Damaged",
            identityRecords: isIndividualAsset
                ? availableIdentityRecords.filter(
                    (record) =>
                        !wasteForm.selectedIdentityIds.includes(record.id)
                )
                : availableIdentityRecords,
        });

        if (!assetSaved) return;

        const movementSaved = await saveMovement({
            movementType: "Waste",
            date: wasteForm.wasteDate,
            quantity,
            unitPrice: asset?.unitPrice || 0,
            wasteReason: wasteForm.wasteReason.trim(),
            responsiblePerson: wasteForm.reportedBy.trim(),
            estimatedLoss,
            identityRecords: selectedWasteIdentityRecords,
            sourceName: "Main Stock",
            destinationName: "Waste / Damaged",
            notes: wasteForm.notes.trim(),
        });

        if (!movementSaved) return;

        const expenseSaved = await saveWasteExpense(movementSaved);

        if (!expenseSaved) {
            notify(
                "Waste was recorded, but its expense could not be saved.",
                "error"
            );
            return;
        }

        notify("Asset waste recorded successfully.");
        setWasteForm(emptyWasteForm);
        setModalType("");
    };

    const getCustomerName = (customer) => {
        return (
            customer?.customerName ||
            customer?.fullName ||
            customer?.name ||
            `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
            "Unnamed Customer"
        );
    };

    const generateNextTransferReference = () => {
    const existingReferences = new Set([
        ...movements.map((movement) => String(movement.referenceNumber || "")),
        ...deviceTransfers.map((transfer) => String(transfer.referenceNumber || "")),
        ...towerAssetTransfers.map((transfer) => String(transfer.referenceNumber || "")),
    ]);

    let referenceNumber = "";

    do {
        const timePart = String(Date.now()); // 13 digits
        const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, "0"); // 4 digits

        referenceNumber = `${timePart}${randomPart}`;
    } while (existingReferences.has(referenceNumber));

    return referenceNumber;
};

    const getAssetKey = (record) =>
        String(
            record?.id ||
            record?.assetRecordId ||
            record?.assetId ||
            record?.serialNumber ||
            record?.macAddress ||
            ""
        );

    const getMovementStockDirection = (movement) => {
        if (["Balance", "Purchase"].includes(movement?.movementType)) return 1;
        if (["Waste", "Transfer"].includes(movement?.movementType)) return -1;
        return 0;
    };

    const movementMatchesCounterpart = (movement, record) => {
  if (!movement || !record) return false;

  if (
    movement.batchId &&
    record.batchId &&
    String(movement.batchId) === String(record.batchId)
  ) {
    return true;
  }

  if (
    movement.referenceNumber &&
    record.referenceNumber &&
    String(movement.referenceNumber) === String(record.referenceNumber)
  ) {
    return true;
  }

  const sameAsset =
    String(record.assetRecordId || record.parentAssetId || "") ===
      String(movement.assetRecordId || movement.parentAssetId || asset?.id || "") ||
    String(record.assetId || "") === String(movement.assetId || asset?.assetId || "");

  const sameDate =
    String(record.transferDate || record.date || "") ===
    String(movement.date || "");

  return sameAsset && sameDate;
};

    const buildCounterpartUnits = (movement, quantity) => {
        const identityRecords = (movement?.identityRecords || []).map(
            (record, index) => ({
                ...record,
                id: record.id || `movement-unit-${movement?.id || "record"}-${index}`,
                assetRecordId: asset?.id || "",
                assetId: asset?.assetId || "",
                deviceName: asset?.deviceName || "",
                category: record.category || asset?.category || "",
                brand: asset?.brand || "",
                unitPrice: record.unitPrice || asset?.unitPrice || 0,
                quantity: 1,
            })
        );

        if (identityRecords.length > 0) return identityRecords;

        return [
            {
                ...asset,
                id: asset?.id || asset?.assetId || "",
                assetRecordId: asset?.id || "",
                assetId: asset?.assetId || "",
                deviceName: asset?.deviceName || "",
                category: asset?.category || "",
                brand: asset?.brand || "",
                unitPrice: movement?.unitPrice || asset?.unitPrice || 0,
                quantity,
            },
        ];
    };

    const removeMovementCounterparts = async (movement) => {
        if (movement?.movementType !== "Transfer") return true;

        const repairResult = movement.repairResult || {};

        if (
            repairResult.destinationSynced &&
            repairResult.nextDestination === "Customer" &&
            repairResult.destinationBatchId
        ) {
            const transfersSaved = await setDeviceTransfers((previousTransfers) =>
                previousTransfers.filter(
                    (record) =>
                        String(record.batchId || "") !==
                        String(repairResult.destinationBatchId || "")
                )
            );

            if (!transfersSaved) return false;
        }

        if (
            repairResult.destinationSynced &&
            repairResult.nextDestination === "Tower" &&
            repairResult.destinationBatchId
        ) {
            const removedKeys = new Set(
                buildCounterpartUnits(
                    movement,
                    Number(movement.quantity || 0)
                ).map(getAssetKey)
            );

            const towerSaved = await setTowerAssets((previousTowers) =>
                previousTowers.map((tower) => {
                    if (
                        String(tower.id || "") !==
                        String(repairResult.destinationRecordId || "")
                    ) {
                        return tower;
                    }

                    const nextAssets = (tower.assets || []).filter(
                        (towerAsset) => !removedKeys.has(getAssetKey(towerAsset))
                    );

                    return {
                        ...tower,
                        assets: nextAssets,
                        assetCount: nextAssets.length,
                        updatedAt: new Date().toISOString(),
                    };
                })
            );

            if (!towerSaved) return false;

            const towerTransfersSaved = await setTowerAssetTransfers(
                (previousTransfers) =>
                    previousTransfers.filter(
                        (record) =>
                            String(record.batchId || "") !==
                            String(repairResult.destinationBatchId || "")
                    )
            );

            if (!towerTransfersSaved) return false;
        }

        if (movement.transferType === "To Customer") {
            return setDeviceTransfers((previousTransfers) =>
                previousTransfers.filter(
                    (record) => !movementMatchesCounterpart(movement, record)
                )
            );
        }

        if (movement.transferType === "To Tower") {
            const towerSaved = await setTowerAssets((previousTowers) =>
                previousTowers.map((tower) => {
                    if (
                        String(tower.id || "") !==
                        String(movement.destinationRecordId || "")
                    ) {
                        return tower;
                    }

                    const removedKeys = new Set(
                        buildCounterpartUnits(
                            movement,
                            Number(movement.quantity || 0)
                        ).map(getAssetKey)
                    );

                    const nextAssets = (tower.assets || []).filter(
                        (towerAsset) => !removedKeys.has(getAssetKey(towerAsset))
                    );

                    return {
                        ...tower,
                        assets: nextAssets,
                        assetCount: nextAssets.length,
                        updatedAt: new Date().toISOString(),
                    };
                })
            );

            if (!towerSaved) return false;

            return setTowerAssetTransfers((previousTransfers) =>
                previousTransfers.filter(
                    (record) => !movementMatchesCounterpart(movement, record)
                )
            );
        }

        return true;
    };

    const syncEditedMovementCounterparts = async (movement) => {
        if (movement?.movementType !== "Transfer") return true;

        const updatedAt = new Date().toISOString();
        const quantity = Number(movement.quantity || 0);
        const units = buildCounterpartUnits(movement, quantity);

        if (movement.transferType === "To Customer") {
            const customer = customers.find(
                (item) =>
                    String(item.id || "") ===
                    String(movement.destinationRecordId || "")
            );

            let remainingEditedPaidAmount =
                movement.dealType === "Sold"
                    ? Number(movement.paidAmount || 0)
                    : 0;

            const nextRecords = units.map((unit, index) => {
                const salePrice =
                    movement.dealType === "Sold"
                        ? !isIndividualAsset
                            ? Number(movement.totalAmount || 0)
                            : Number(
                                movement.unitSalePrices?.[unit.id] ||
                                movement.salePricePerDevice ||
                                getDefaultSalePrice(unit) ||
                                0
                            )
                        : 0;
                let paidAmount = 0;

                if (movement.dealType === "Sold") {
                    if (!isIndividualAsset) {
                        paidAmount = Number(movement.paidAmount || 0);
                    } else if (movement.unitPaidPrices?.[unit.id]) {
                        paidAmount = Number(movement.unitPaidPrices[unit.id]);
                    } else if (movement.paidAmountPerDevice) {
                        paidAmount = Number(movement.paidAmountPerDevice);
                    } else {
                        paidAmount = Math.min(
                            salePrice,
                            Math.max(remainingEditedPaidAmount, 0)
                        );
                        remainingEditedPaidAmount = Math.max(
                            remainingEditedPaidAmount - paidAmount,
                            0
                        );
                    }
                }

                return {
                    id: `${movement.id || Date.now()}-customer-${index}`,
                    batchId: movement.batchId || movement.id || "",
                    batchSize: units.length,
                    transferType: "Main Stock to Customer",
                    referenceNumber: movement.referenceNumber || "",
                    date: movement.date,
                    quantity: Number(unit.quantity || 1),
                    fromType: "Main Stock",
                    fromCustomerRecordId: "",
                    fromCustomerId: "",
                    fromCustomerName: "Main Stock",
                    toCustomerRecordId:
                        movement.destinationRecordId || customer?.id || "",
                    toCustomerId: customer?.customerId || "",
                    toCustomerName:
                        movement.destinationName ||
                        (customer ? getCustomerName(customer) : "Customer"),
                    assetRecordId: asset?.id || "",
                    assetId: asset?.assetId || "",
                    deviceName: asset?.deviceName || "",
                    category: unit.category || asset?.category || "",
                    brand: asset?.brand || "",
                    model: unit.model || "",
                    macAddress: unit.macAddress || "",
                    serialNumber: unit.serialNumber || "",
                    previousAssetLocation: "Main Stock",
                    previousAssetStatus: "In Stock",
                    issueDate: movement.date,
                    issueStatus:
                        movement.transferStatus === "Completed"
                            ? "Issued"
                            : movement.transferStatus || "",
                    ownershipType:
                        movement.dealType === "Sold" ? "Sold" : "Leased",
                    salePrice,
                    paidAmount,
                    remainAmount: Math.max(salePrice - paidAmount, 0),
                    depositAmount:
                        movement.dealType === "Leased / Deposit"
                            ? !isIndividualAsset
                                ? Number(movement.trustAmount || movement.totalAmount || 0)
                                : Number(
                                    movement.unitDepositPrices?.[unit.id] ||
                                    movement.securityDepositPerDevice ||
                                    0
                                )
                            : 0,
                    depositPaidAmount:
                        movement.dealType === "Leased / Deposit"
                            ? Number(movement.paidAmount || 0)
                            : 0,
                    depositRemainingAmount:
                        movement.dealType === "Leased / Deposit"
                            ? Number(movement.remainingAmount || 0)
                            : 0,
                    depositStatus:
                        movement.dealType === "Leased / Deposit"
                            ? Number(movement.remainingAmount || 0) > 0
                                ? "Partial"
                                : "Held"
                            : "",
                    notes: movement.notes || "",
                    createdAt: movement.createdAt || updatedAt,
                    updatedAt,
                };
            });

            return setDeviceTransfers((previousTransfers) => [
                ...previousTransfers.filter(
                    (record) => !movementMatchesCounterpart(movement, record)
                ),
                ...nextRecords,
            ]);
        }

        if (movement.transferType === "To Tower") {
            const tower = towerAssets.find(
                (item) =>
                    String(item.id || "") ===
                    String(movement.destinationRecordId || "")
            );

            const towerSaved = await setTowerAssets((previousTowers) =>
                previousTowers.map((item) => {
                    if (
                        String(item.id || "") !==
                        String(movement.destinationRecordId || "")
                    ) {
                        return item;
                    }

                    const nextKeys = new Set(units.map(getAssetKey));
                    const retainedAssets = (item.assets || []).filter(
                        (towerAsset) => !nextKeys.has(getAssetKey(towerAsset))
                    );
                    const nextAssets = [
                        ...retainedAssets,
                        ...units.map((unit) => ({
                            ...unit,
                            location: "Tower",
                            status: "Installed",
                            towerRecordId: item.id,
                            towerName: item.towerName || "",
                            towerLocation: item.towerLocation || "",
                            lastTowerTransferDate: movement.date,
                            updatedAt,
                        })),
                    ];

                    return {
                        ...item,
                        assets: nextAssets,
                        assetCount: nextAssets.length,
                        updatedAt,
                    };
                })
            );

            if (!towerSaved) return false;

            const nextRecords = units.map((unit, index) => ({
                id: `${movement.id || Date.now()}-tower-${index}`,
                batchId: movement.batchId || movement.id || "",
                batchSize: units.length,
                sourcePage: "asset-full-information",
                transferType: "Main Stock to Tower",
                referenceNumber: movement.referenceNumber || "",
                quantity: Number(unit.quantity || 1),
                sourceType: "Main Stock",
                sourceTowerId: "",
                sourceTowerName: "Main Stock",
                sourceTowerLocation: "",
                destinationType: "Tower",
                destinationTowerId: movement.destinationRecordId || tower?.id || "",
                destinationTowerName:
                    movement.destinationName || tower?.towerName || "",
                destinationTowerLocation: tower?.towerLocation || "",
                assetRecordId: asset?.id || "",
                assetId: asset?.assetId || "",
                deviceName: asset?.deviceName || "",
                category: unit.category || asset?.category || "",
                brand: asset?.brand || "",
                model: unit.model || "",
                macAddress: unit.macAddress || "",
                serialNumber: unit.serialNumber || "",
                transferDate: movement.date,
                transferStatus: movement.transferStatus || "",
                responsiblePerson: movement.responsiblePerson || "",
                notes: movement.notes || "",
                createdAt: movement.createdAt || updatedAt,
                updatedAt,
            }));

            return setTowerAssetTransfers((previousTransfers) => [
                ...previousTransfers.filter(
                    (record) => !movementMatchesCounterpart(movement, record)
                ),
                ...nextRecords,
            ]);
        }

        return true;
    };

    const buildTransferredUnitAssets = (quantity) => {
        if (isIndividualAsset) {
            return selectedTransferIdentityRecords.map((record, index) => ({
                ...asset,
                ...record,
                id: record.id || `${assetKey}-unit-${index}`,
                assetRecordId: asset?.id || "",
                assetId: asset?.assetId || "",
                deviceName: asset?.deviceName || "",
                category: record.category || asset?.category || "",
                brand: asset?.brand || "",
                unitPrice: record.unitPrice || asset?.unitPrice || 0,
                quantity: 1,
            }));
        }

        return [
            {
                ...asset,
                assetRecordId: asset?.id || "",
                quantity,
            },
        ];
    };

    const saveTransfer = async (event) => {
        event.preventDefault();

        const quantity = isIndividualAsset
            ? selectedTransferIdentityRecords.length
            : Number(transferForm.quantity || 0);

        if (isIndividualAsset && quantity <= 0) {
            notify("Please select at least one individual unit.", "error");
            return;
        }

        if (!isIndividualAsset && quantity <= 0) {
            notify("Transfer quantity must be greater than zero.", "error");
            return;
        }

        if (quantity > currentStock) {
  notify(
    `Transfer quantity cannot be greater than current stock (${currentStock}).`,
    "error"
  );

  return;
}

        const needsSelectedDestination =
            transferForm.transferType === "To Tower" ||
            transferForm.transferType === "To Customer";

        if (
            needsSelectedDestination &&
            !transferForm.destinationRecordId
        ) {
            notify(
                transferForm.transferType === "To Tower"
                    ? "Please select a tower."
                    : "Please select a customer.",
                "error"
            );

            return;
        }

        const hasInvalidRecordSale = selectedTransferIdentityRecords.some(
            (record) => {
                const saleAmount = Number(
                    transferForm.salePrices[record.id] ||
                    getDefaultSalePrice(record) ||
                    0
                );

                return saleAmount < 0;
            }
        );

        if (
            isCustomerTransfer &&
            transferForm.dealType === "Leased / Deposit" &&
            (!Number.isFinite(customerDepositTotal) ||
                customerDepositTotal < 0)
        ) {
            notify("Deposit amount cannot be negative.", "error");
            return;
        }

        if (
            isCustomerTransfer &&
            transferForm.dealType === "Sold" &&
            ((isIndividualAsset && hasInvalidRecordSale) ||
                (!isIndividualAsset &&
                    (!Number.isFinite(customerSaleTotal) ||
                        customerSaleTotal < 0 ||
                        !Number.isFinite(customerPaidTotal) ||
                        customerPaidTotal < 0)))
        ) {
            notify("Total sale and paid amounts cannot be negative.", "error");
            return;
        }

        if (
            isCustomerTransfer &&
            transferForm.dealType === "Sold" &&
            (!Number.isFinite(customerPaidTotal) || customerPaidTotal < 0)
        ) {
            notify("Total paid amount cannot be negative.", "error");
            return;
        }

        if (
            isCustomerTransfer &&
            transferForm.dealType === "Sold" &&
            customerPaidTotal > customerSaleTotal
        ) {
            notify("Total paid amount cannot be greater than total amount.", "error");
            return;
        }

        const transferDestinations = {
    "To Tower": "Tower",
    "To Customer": "Customer",
    "To Repair": "Repair",
};
        const nextLocation =
            transferDestinations[transferForm.transferType] ||
            asset.location;

        const remainingQuantity = currentQuantity - quantity;
        const referenceNumber =
            transferForm.referenceNumber.trim() ||
            generateNextTransferReference();
        const transferTimestamp = Date.now();
        const destinationBatchId = `asset-transfer-${transferTimestamp}`;
        const createdAt = new Date().toISOString();

        const assetSaved = await updateAssetQuantity(
            isIndividualAsset
                ? remainingQuantity
                : remainingQuantity === 0
                    ? quantity
                    : remainingQuantity,
            {
                location: isIndividualAsset
                    ? remainingQuantity === 0
                        ? nextLocation
                        : asset.location
                    : remainingQuantity === 0
                        ? nextLocation
                        : asset.location,

                status: isIndividualAsset && remainingQuantity > 0
                    ? asset.status
                    : nextLocation === "Repair"
                        ? "Under Repair"
                            : nextLocation === "Tower"
                                ? "Installed"
                                : nextLocation === "Customer"
                                    ? "Issued"
                                    : "In Stock",

                identityRecords: isIndividualAsset
                    ? availableIdentityRecords.filter(
                        (record) =>
                            !transferForm.selectedIdentityIds.includes(record.id)
                    )
                    : availableIdentityRecords,

                lastTransferDate: transferForm.transferDate,
                towerRecordId:
                    nextLocation === "Tower"
                        ? selectedTower?.id || ""
                        : "",

                towerName:
                    nextLocation === "Tower"
                        ? selectedTower?.towerName || ""
                        : "",

                towerLocation:
                    nextLocation === "Tower"
                        ? selectedTower?.towerLocation || ""
                        : "",

                customerRecordId:
                    nextLocation === "Customer"
                        ? selectedCustomer?.id || ""
                        : "",

                customerId:
                    nextLocation === "Customer"
                        ? selectedCustomer?.customerId || ""
                        : "",

                customerName:
                    nextLocation === "Customer"
                        ? getCustomerName(selectedCustomer)
                        : "",
            }
        );



        if (!assetSaved) return;

        const movementSaved = await saveMovement({
            movementType: "Transfer",
            transferType: transferForm.transferType,
            dealType: isCustomerTransfer ? transferForm.dealType : "",
            date: transferForm.transferDate,
            quantity,
            identityRecords: selectedTransferIdentityRecords,
            unitDepositPrices: transferForm.depositPrices,
            unitPaidPrices: transferForm.paidPrices,
            unitSalePrices: transferForm.salePrices,
            securityDepositPerDevice:
                isCustomerTransfer &&
                    transferForm.dealType === "Leased / Deposit"
                    ? customerDepositTotal
                    : 0,
            salePricePerDevice:
                isCustomerTransfer &&
                    transferForm.dealType === "Sold" &&
                    !isIndividualAsset
                    ? bulkSalePricePerDevice
                    : 0,
            paidAmountPerDevice:
                isCustomerTransfer &&
                    transferForm.dealType === "Sold" &&
                    !isIndividualAsset
                    ? customerTransferQuantity > 0
                        ? customerPaidTotal / customerTransferQuantity
                        : 0
                    : 0,
            remainingAmountPerDevice:
                isCustomerTransfer &&
                    transferForm.dealType === "Sold" &&
                    !isIndividualAsset
                    ? customerTransferQuantity > 0
                        ? customerRemainingTotal / customerTransferQuantity
                        : 0
                    : 0,
            totalAmount:
                isCustomerTransfer && transferForm.dealType === "Sold"
                    ? customerSaleTotal
                    : isCustomerTransfer &&
                        transferForm.dealType === "Leased / Deposit"
                        ? customerDepositTotal
                        : 0,
            paidAmount:
                isCustomerTransfer && transferForm.dealType === "Sold"
                    ? customerPaidTotal
                    : isCustomerTransfer &&
                        transferForm.dealType === "Leased / Deposit"
                        ? 0
                        : 0,
            remainingAmount:
                isCustomerTransfer && transferForm.dealType === "Sold"
                    ? customerRemainingTotal
                    : isCustomerTransfer &&
                        transferForm.dealType === "Leased / Deposit"
                        ? 0
                        : 0,
            trustAmount:
                isCustomerTransfer &&
                    transferForm.dealType === "Leased / Deposit"
                    ? customerDepositTotal
                    : 0,
            sourceName: "Main Stock",
            destinationType: transferForm.destinationType,
            batchId: destinationBatchId,

            destinationRecordId:
                transferForm.destinationRecordId || "",

            destinationName:
                transferForm.transferType === "To Repair"
                    ? "Repair / Maintenance"
                        : transferForm.destinationName.trim(),
            responsiblePerson:
                transferForm.responsiblePerson.trim(),
            transferStatus: transferForm.transferStatus,
            referenceNumber,
            notes: transferForm.notes.trim(),
        });

        if (!movementSaved) return;

        const saleIncomeSaved = await saveCustomerSaleIncome(movementSaved);

        if (!saleIncomeSaved) {
            notify(
                "Transfer was saved, but paid amount could not be linked to Financial.",
                "error"
            );
            return;
        }

        const destinationUnitAssets = buildTransferredUnitAssets(quantity);

        if (transferForm.transferType === "To Tower" && selectedTower) {
  const towerRecords = destinationUnitAssets.map((unit, index) => ({
    id: `${transferTimestamp}-tower-${index}`,
    batchId: destinationBatchId,
    batchSize: destinationUnitAssets.length,
    sourcePage: "asset-full-information",
    transferType: "Main Stock to Tower",
    referenceNumber,
    quantity: Number(unit.quantity || 1),

    sourceType: "Main Stock",
    sourceTowerId: "",
    sourceTowerName: "Main Stock",
    sourceTowerLocation: "",

    destinationType: "Tower",
    destinationTowerId: selectedTower.id,
    destinationTowerName: selectedTower.towerName || "",
    destinationTowerLocation: selectedTower.towerLocation || "",

    parentAssetId: unit.parentAssetId || unit.assetRecordId || asset?.id || "",
    assetRecordId: unit.assetRecordId || asset?.id || "",
    assetId: unit.assetId || asset?.assetId || "",
    deviceName: unit.deviceName || asset?.deviceName || "",
    category: unit.category || asset?.category || "",
    brand: unit.brand || asset?.brand || "",
    model: unit.model || "",
    macAddress: unit.macAddress || "",
    serialNumber: unit.serialNumber || "",

    transferDate: transferForm.transferDate,
    transferStatus: transferForm.transferStatus,
    responsiblePerson: transferForm.responsiblePerson.trim(),
    notes: transferForm.notes.trim(),

    createdAt,
    updatedAt: createdAt,
  }));

  const towersSaved = await setTowerAssets((previousTowers) =>
    previousTowers.map((tower) => {
      if (String(tower.id) !== String(selectedTower.id)) {
        return tower;
      }

      const existingAssets = Array.isArray(tower.assets) ? tower.assets : [];
      const existingKeys = new Set(existingAssets.map(getAssetKey));

      const nextAssets = [
        ...existingAssets,
        ...destinationUnitAssets
          .filter((unit) => !existingKeys.has(getAssetKey(unit)))
          .map((unit) => ({
            ...unit,
            location: "Tower",
            status: "Installed",
            towerRecordId: selectedTower.id,
            towerName: selectedTower.towerName || "",
            towerLocation: selectedTower.towerLocation || "",
            lastTowerTransferDate: transferForm.transferDate,
            updatedAt: createdAt,
          })),
      ];

      return {
        ...tower,
        assets: nextAssets,
        assetCount: nextAssets.length,
        updatedAt: createdAt,
      };
    })
  );

  if (!towersSaved) return;

  const towerTransfersSaved = await setTowerAssetTransfers((previousTransfers) => [
    ...previousTransfers,
    ...towerRecords,
  ]);

  if (!towerTransfersSaved) return;
}

        if (transferForm.transferType === "To Customer" && selectedCustomer) {
  let remainingCustomerPaidAmount =
    transferForm.dealType === "Sold" && isIndividualAsset
      ? customerPaidTotal
      : 0;

  const customerTransferRecords = destinationUnitAssets.map((unit, index) => {
    const unitKey = getAssetKey(unit);

    const salePrice =
      transferForm.dealType === "Sold"
        ? Number(
            isIndividualAsset
              ? transferForm.salePrices[unitKey] ||
                  transferForm.salePrices[unit.id] ||
                  getDefaultSalePrice(unit) ||
                  0
              : customerSaleTotal
          )
        : 0;

    const paidAmount =
      transferForm.dealType === "Sold"
        ? isIndividualAsset
          ? Math.min(
              salePrice,
              Math.max(remainingCustomerPaidAmount, 0)
            )
          : customerPaidTotal
        : 0;

    if (transferForm.dealType === "Sold" && isIndividualAsset) {
      remainingCustomerPaidAmount = Math.max(
        remainingCustomerPaidAmount - paidAmount,
        0
      );
    }

    const depositAmount =
      transferForm.dealType === "Leased / Deposit"
        ? customerDepositTotal
        : 0;

    return {
      id: `${transferTimestamp}-customer-${index}`,
      batchId: destinationBatchId,
      batchSize: destinationUnitAssets.length,

      transferType: "Main Stock to Customer",
      referenceNumber,

      date: transferForm.transferDate,
      issueDate: transferForm.transferDate,
      quantity: Number(unit.quantity || 1),

      fromType: "Main Stock",
      fromCustomerRecordId: "",
      fromCustomerId: "",
      fromCustomerName: "Main Stock",

      toCustomerRecordId: selectedCustomer.id || "",
      toCustomerId: selectedCustomer.customerId || "",
      toCustomerName: getCustomerName(selectedCustomer),

      parentAssetId: unit.parentAssetId || unit.assetRecordId || asset?.id || "",
      assetRecordId: unit.assetRecordId || asset?.id || "",
      assetId: unit.assetId || asset?.assetId || "",
      deviceName: unit.deviceName || asset?.deviceName || "",
      category: unit.category || asset?.category || "",
      brand: unit.brand || asset?.brand || "",
      model: unit.model || "",
      macAddress: unit.macAddress || "",
      serialNumber: unit.serialNumber || "",
      unitRecordId: unit.unitRecordId || unit.id || unit.serialNumber || unit.macAddress || "",

      previousAssetLocation: "Main Stock",
      previousAssetStatus: "In Stock",
      previousOwnershipType: "",
      previousCustomerRecordId: "",
      previousCustomerId: "",
      previousCustomerName: "",

      issueStatus:
        transferForm.transferStatus === "Completed"
          ? "Issued"
          : transferForm.transferStatus,

      ownershipType:
        transferForm.dealType === "Sold" ? "Sold" : "Leased",

      salePrice,
      paidAmount,
      remainAmount:
        transferForm.dealType === "Leased / Deposit"
          ? 0
          : Math.max(salePrice - paidAmount, 0),

      depositAmount,
      depositPaidAmount:
        transferForm.dealType === "Leased / Deposit"
          ? 0
          : 0,
      depositRemainingAmount:
        transferForm.dealType === "Leased / Deposit"
          ? 0
          : 0,
      depositStatus:
        transferForm.dealType === "Leased / Deposit"
          ? "Held"
          : "",

      notes: transferForm.notes.trim(),
      createdAt,
      updatedAt: createdAt,
    };
  });

  const transfersSaved = await setDeviceTransfers((previousTransfers) => [
    ...previousTransfers,
    ...customerTransferRecords,
  ]);

  if (!transfersSaved) return;
}

        notify("Asset transfer recorded successfully.");
        setTransferForm(emptyTransferForm);
        setModalType("");
    };

    const openEditMovement = (movement) => {
    if (!canManageMovementRecord(movement)) {
        notify(
            "This movement can only be edited from the page that created it.",
            "error"
        );
        return;
    }

    const normalizedIdentityRecords = (
        movement.identityRecords || []
    ).map((record, index) => ({
        ...record,
        id:
            record.id ||
            `movement-${movement.id || "record"}-${index}`,
        model: record.model || "",
        macAddress: record.macAddress || "",
        serialNumber: record.serialNumber || "",
        image: record.image || "",
    }));

    const selectedIdentityIds = normalizedIdentityRecords.map(
        (record) => record.id
    );

    const matchedCustomer =
        movement.transferType === "To Customer"
            ? customers.find(
                  (customer) =>
                      String(customer.id || "") ===
                          String(
                              movement.destinationRecordId || ""
                          ) ||
                      getCustomerName(customer) ===
                          movement.destinationName
              )
            : null;

    const matchedTower =
        movement.transferType === "To Tower"
            ? towerAssets.find(
                  (tower) =>
                      String(tower.id || "") ===
                          String(
                              movement.destinationRecordId || ""
                          ) ||
                      tower.towerName === movement.destinationName
              )
            : null;

    setEditMovement({
        ...movement,
        identityRecords: normalizedIdentityRecords,
    });

    const movementQuantity = Number(movement.quantity || 0);
    const inferredSalePricePerDevice =
        movement.salePricePerDevice ||
        movement.securityDepositPerDevice ||
        (movementQuantity > 0
            ? Number(movement.totalAmount || movement.trustAmount || 0) /
              movementQuantity
            : "") ||
        getDefaultSalePrice() ||
        "";

    setEditMovementForm({
        date: movement.date || "",
        purchaseDate: movement.date || today(),
        movementType: movement.movementType || "",
        transferType: movement.transferType || "",
        dealType: movement.dealType || "Leased / Deposit",

        purchaseCode: movement.purchaseCode || "",
        referenceNumber: movement.referenceNumber || movement.purchaseCode || "",
        supplierRecordId: movement.supplierRecordId || "",
        supplierName:
            movement.supplierName ||
            movement.sourceName ||
            "",

        quantity: movement.quantity || "",
        unitPrice: movement.unitPrice || "",
        salePrice: movement.salePrice || getDefaultSalePrice() || "",
        billNumber:
            movement.billNumber ||
            movement.invoiceNumber ||
            "",
        paidAmount: movement.paidAmount || "",
        salePricePerDevice: inferredSalePricePerDevice,
        paidAmountPerDevice: movement.paidAmountPerDevice || "",
        remainingAmountPerDevice: movement.remainingAmountPerDevice || "",
        securityDepositPerDevice:
            movement.securityDepositPerDevice || inferredSalePricePerDevice,
        salePrices: movement.unitSalePrices || {},
        paidPrices: movement.unitPaidPrices || {},
        depositPrices: movement.unitDepositPrices || {},
        transferSearch: "",
        transferCategory: "All",

        billImage: movement.billImage || "",

        purchasedBy:
            movement.responsiblePerson || "",

        identityRecords: normalizedIdentityRecords,
        selectedIdentityIds,

        sourceName: movement.sourceName || "",
        destinationName: movement.destinationName || "",

        destinationRecordId:
            movement.destinationRecordId ||
            matchedCustomer?.id ||
            matchedTower?.id ||
            "",

        destinationType: movement.destinationType || "",

        totalAmount:
            movement.totalAmount ||
            movement.estimatedLoss ||
            movement.trustAmount ||
            "",

        responsiblePerson:
            movement.responsiblePerson || "",

        status:
            movement.transferStatus ||
            movement.paymentStatus ||
            movement.status ||
            "",

        notes: movement.notes || "",
    });

    setOpenMovementAction("");
};

    const openRepairResult = (movement) => {
        setRepairResultMovement(movement);
        setRepairResultForm({
            repairStatus: movement.repairResult?.repairStatus || "Fixed",
            supplierRecordId: movement.repairResult?.supplierRecordId || "",
            supplierName: movement.repairResult?.supplierName || "",
            repairCost: movement.repairResult?.repairCost || "",
            paidAmount: movement.repairResult?.paidAmount || "",
            repairDate: movement.repairResult?.repairDate || today(),
            nextDestination:
                movement.repairResult?.nextDestination || "Main Stock",
            destinationRecordId:
                movement.repairResult?.destinationRecordId || "",
            destinationName:
                movement.repairResult?.destinationName || "",
            notes: movement.repairResult?.notes || "",
        });
        setOpenMovementAction("");
    };

    const saveRepairResult = async (event) => {
        event.preventDefault();

        const repairCost = Number(repairResultForm.repairCost || 0);
        const isNotFixed = repairResultForm.repairStatus === "Not Fixed";
        const paidAmount = Number(repairResultForm.paidAmount || 0);
        const nextDestination = isNotFixed
            ? "Damaged / Lost"
            : repairResultForm.nextDestination;
        const selectedRepairTower =
            nextDestination === "Tower"
                ? towerAssets.find(
                    (tower) =>
                        String(tower.id || "") ===
                        String(repairResultForm.destinationRecordId || "")
                )
                : null;
        const selectedRepairCustomer =
            nextDestination === "Customer"
                ? customers.find(
                    (customer) =>
                        String(customer.id || "") ===
                        String(repairResultForm.destinationRecordId || "")
                )
                : null;

        if (repairCost < 0 || paidAmount < 0) {
            notify("Repair cost and paid amount cannot be negative.", "error");
            return;
        }

        if (paidAmount > repairCost) {
            notify("Paid amount cannot be greater than repair cost.", "error");
            return;
        }

        if (!repairResultForm.repairDate) {
            notify("Please select the repair result date.", "error");
            return;
        }

        if (nextDestination === "Tower" && !selectedRepairTower) {
            notify("Please select the destination tower.", "error");
            return;
        }

        if (nextDestination === "Customer" && !selectedRepairCustomer) {
            notify("Please select the destination customer.", "error");
            return;
        }

        const shouldRestoreToStock =
            repairResultForm.repairStatus === "Fixed" &&
            nextDestination === "Main Stock";
        const wasAlreadyRestored =
            repairResultMovement?.repairResult?.stockRestored === true;
        const repairResultQuantity = Number(repairResultMovement?.quantity || 0);
        const restoredIdentityRecords = (
            repairResultMovement?.identityRecords || []
        ).map((record, index) => ({
            ...record,
            id:
                record.id ||
                record.serialNumber ||
                record.macAddress ||
                `repair-return-${repairResultMovement?.id || "record"}-${index}`,
            category: record.category || asset?.category || "",
            unitPrice: record.unitPrice || asset?.unitPrice || 0,
            addedAt: new Date().toISOString(),
            sourceType: "Repair Return",
        }));

        if (shouldRestoreToStock && !wasAlreadyRestored) {
            const existingKeys = new Set(
                availableIdentityRecords.map(getAssetKey)
            );
            const nextIdentityRecords = isIndividualAsset
                ? [
                    ...availableIdentityRecords,
                    ...restoredIdentityRecords.filter(
                        (record) => !existingKeys.has(getAssetKey(record))
                    ),
                ]
                : availableIdentityRecords;

            const assetSaved = await updateAssetQuantity(
                currentQuantity + repairResultQuantity,
                {
                    location: "Main Stock",
                    status: "In Stock",
                    identityRecords: nextIdentityRecords,
                }
            );

            if (!assetSaved) return;
        }

        if (wasAlreadyRestored && !shouldRestoreToStock) {
            const restoredKeys = new Set(restoredIdentityRecords.map(getAssetKey));
            const nextIdentityRecords = isIndividualAsset
                ? availableIdentityRecords.filter(
                    (record) => !restoredKeys.has(getAssetKey(record))
                )
                : availableIdentityRecords;
            const nextQuantity = Math.max(currentQuantity - repairResultQuantity, 0);
            const nextLocation =
                nextQuantity > 0
                    ? asset.location
                    : nextDestination === "Damaged / Lost"
                        ? "Damaged / Lost"
                        : nextDestination;
            const nextStatus =
                nextQuantity > 0
                    ? asset.status
                    : nextDestination === "Damaged / Lost"
                        ? "Damaged"
                        : asset.status;

            const assetSaved = await updateAssetQuantity(nextQuantity, {
                location: nextLocation,
                status: nextStatus,
                identityRecords: nextIdentityRecords,
            });

            if (!assetSaved) return;
        }

        const repairedUnits = buildCounterpartUnits(
            repairResultMovement,
            Number(repairResultMovement?.quantity || 0)
        );
        const repairDestinationBatchId =
            repairResultMovement?.repairResult?.destinationBatchId ||
            `repair-result-${repairResultMovement?.id || Date.now()}`;
        const repairRecordedAt = new Date().toISOString();
        const wasAlreadySentToDestination =
            repairResultMovement?.repairResult?.destinationSynced === true &&
            repairResultMovement?.repairResult?.nextDestination === nextDestination &&
            String(repairResultMovement?.repairResult?.destinationRecordId || "") ===
            String(repairResultForm.destinationRecordId || "");

        if (
            repairResultForm.repairStatus === "Fixed" &&
            nextDestination === "Tower" &&
            !wasAlreadySentToDestination
        ) {
            const towerSaved = await setTowerAssets((previousTowers) =>
                previousTowers.map((tower) => {
                    if (String(tower.id || "") !== String(selectedRepairTower.id || "")) {
                        return tower;
                    }

                    const existingAssets = Array.isArray(tower.assets) ? tower.assets : [];
                    const existingKeys = new Set(existingAssets.map(getAssetKey));
                    const nextAssets = [
                        ...existingAssets,
                        ...repairedUnits
                            .filter((unit) => !existingKeys.has(getAssetKey(unit)))
                            .map((unit) => ({
                                ...unit,
                                location: "Tower",
                                status: "Installed",
                                towerRecordId: selectedRepairTower.id,
                                towerName: selectedRepairTower.towerName || "",
                                towerLocation: selectedRepairTower.towerLocation || "",
                                lastTowerTransferDate: repairResultForm.repairDate,
                                sourceType: "Repair Result",
                                updatedAt: repairRecordedAt,
                            })),
                    ];

                    return {
                        ...tower,
                        assets: nextAssets,
                        assetCount: nextAssets.length,
                        updatedAt: repairRecordedAt,
                    };
                })
            );

            if (!towerSaved) return;

            const towerRecords = repairedUnits.map((unit, index) => ({
                id: `${repairDestinationBatchId}-tower-${index}`,
                batchId: repairDestinationBatchId,
                batchSize: repairedUnits.length,
                transferType: "Repair to Tower",
                referenceNumber: repairResultMovement?.referenceNumber || "",
                quantity: Number(unit.quantity || 1),
                sourceType: "Repair / Maintenance",
                sourceTowerId: "",
                sourceTowerName: "Repair / Maintenance",
                sourceTowerLocation: "",
                destinationType: "Tower",
                destinationTowerId: selectedRepairTower.id,
                destinationTowerName: selectedRepairTower.towerName || "",
                destinationTowerLocation: selectedRepairTower.towerLocation || "",
                parentAssetId: unit.parentAssetId || unit.assetRecordId || asset?.id || "",
                assetRecordId: unit.assetRecordId || asset?.id || "",
                assetId: unit.assetId || asset?.assetId || "",
                deviceName: unit.deviceName || asset?.deviceName || "",
                category: unit.category || asset?.category || "",
                brand: unit.brand || asset?.brand || "",
                model: unit.model || "",
                macAddress: unit.macAddress || "",
                serialNumber: unit.serialNumber || "",
                transferDate: repairResultForm.repairDate,
                transferStatus: "Repair Completed",
                responsiblePerson: repairResultMovement?.responsiblePerson || "",
                notes: repairResultForm.notes.trim(),
                createdAt: repairRecordedAt,
                updatedAt: repairRecordedAt,
            }));

            const towerTransfersSaved = await setTowerAssetTransfers((previousTransfers) => [
                ...previousTransfers.filter(
                    (record) => String(record.batchId || "") !== repairDestinationBatchId
                ),
                ...towerRecords,
            ]);

            if (!towerTransfersSaved) return;
        }

        if (
            repairResultForm.repairStatus === "Fixed" &&
            nextDestination === "Customer" &&
            !wasAlreadySentToDestination
        ) {
            const customerRecords = repairedUnits.map((unit, index) => ({
                id: `${repairDestinationBatchId}-customer-${index}`,
                batchId: repairDestinationBatchId,
                batchSize: repairedUnits.length,
                transferType: "Repair to Customer",
                referenceNumber: repairResultMovement?.referenceNumber || "",
                date: repairResultForm.repairDate,
                issueDate: repairResultForm.repairDate,
                quantity: Number(unit.quantity || 1),
                fromType: "Repair / Maintenance",
                fromCustomerRecordId: "",
                fromCustomerId: "",
                fromCustomerName: "Repair / Maintenance",
                toCustomerRecordId: selectedRepairCustomer.id || "",
                toCustomerId: selectedRepairCustomer.customerId || "",
                toCustomerName: getCustomerName(selectedRepairCustomer),
                parentAssetId: unit.parentAssetId || unit.assetRecordId || asset?.id || "",
                assetRecordId: unit.assetRecordId || asset?.id || "",
                assetId: unit.assetId || asset?.assetId || "",
                deviceName: unit.deviceName || asset?.deviceName || "",
                category: unit.category || asset?.category || "",
                brand: unit.brand || asset?.brand || "",
                model: unit.model || "",
                macAddress: unit.macAddress || "",
                serialNumber: unit.serialNumber || "",
                unitRecordId: unit.unitRecordId || unit.id || unit.serialNumber || unit.macAddress || "",
                previousAssetLocation: "Repair / Maintenance",
                previousAssetStatus: "In Repair",
                previousOwnershipType: "",
                previousCustomerRecordId: "",
                previousCustomerId: "",
                previousCustomerName: "",
                issueStatus: "Issued",
                ownershipType: "Leased",
                salePrice: 0,
                paidAmount: 0,
                remainAmount: 0,
                depositAmount: 0,
                depositStatus: "",
                notes: repairResultForm.notes.trim(),
                createdAt: repairRecordedAt,
                updatedAt: repairRecordedAt,
            }));

            const transfersSaved = await setDeviceTransfers((previousTransfers) => [
                ...previousTransfers.filter(
                    (record) => String(record.batchId || "") !== repairDestinationBatchId
                ),
                ...customerRecords,
            ]);

            if (!transfersSaved) return;
        }

        const repairResultRecord = {
            repairStatus: repairResultForm.repairStatus,
            supplierRecordId: repairResultForm.supplierRecordId,
            supplierName: repairResultForm.supplierName,
            repairCost,
            paidAmount,
            remainingAmount: Math.max(repairCost - paidAmount, 0),
            repairDate: repairResultForm.repairDate,
            nextDestination,
            destinationRecordId:
                nextDestination === "Tower" || nextDestination === "Customer"
                    ? repairResultForm.destinationRecordId
                    : "",
            destinationName:
                nextDestination === "Tower"
                    ? selectedRepairTower?.towerName || ""
                    : nextDestination === "Customer"
                        ? getCustomerName(selectedRepairCustomer)
                        : "",
            destinationBatchId: repairDestinationBatchId,
            destinationSynced:
                repairResultForm.repairStatus === "Fixed" &&
                (nextDestination === "Tower" || nextDestination === "Customer"),
            stockRestored: shouldRestoreToStock,
            notes: repairResultForm.notes.trim(),
            recordedAt: new Date().toISOString(),
        };

        const updatedRepairMovement = {
            ...repairResultMovement,
            repairResult: repairResultRecord,
            transferStatus:
                repairResultForm.repairStatus === "Fixed"
                    ? "Repair Completed"
                    : "Repair Failed",
            updatedAt: new Date().toISOString(),
        };

        const saved = await setMovements(
            movements.map((movement) =>
                String(movement.id) === String(repairResultMovement?.id)
                    ? updatedRepairMovement
                    : movement
            )
        );

        if (!saved) return;

        const repairExpenseSaved = await saveRepairExpense(updatedRepairMovement);

        if (!repairExpenseSaved) {
            notify(
                "Repair result was saved, but its expense could not be updated.",
                "error"
            );
            return;
        }

        notify("Repair result saved successfully.");
        setRepairResultMovement(null);
    };

    const saveEditedMovement = async (event) => {
        event.preventDefault();

        if (editMovement?.movementType === "Purchase") {
    const quantity = Number(
        editMovementForm.quantity || 0
    );

    const unitPrice = Number(
        editMovementForm.unitPrice || 0
    );

    const paidAmount = Number(
        editMovementForm.paidAmount || 0
    );

    const totalAmount = quantity * unitPrice;
    const remainingAmount = Math.max(
        totalAmount - paidAmount,
        0
    );

    const identityRecords = isIndividualAsset
        ? (editMovementForm.identityRecords || []).map(
              (record) => ({
                  ...record,
                  model: String(
                      record.model || ""
                  ).trim(),
                  macAddress: String(
                      record.macAddress || ""
                  ).trim(),
                  serialNumber: String(
                      record.serialNumber || ""
                  ).trim(),
                  image: record.image || "",
              })
          )
        : [];

    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {
        notify(
            "Purchase quantity must be greater than zero.",
            "error"
        );
        return;
    }

    if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
    ) {
        notify(
            "Purchase price cannot be negative.",
            "error"
        );
        return;
    }

    if (
        !Number.isFinite(paidAmount) ||
        paidAmount < 0
    ) {
        notify(
            "Paid amount cannot be negative.",
            "error"
        );
        return;
    }

    if (paidAmount > totalAmount) {
        notify(
            "Paid amount cannot be greater than total amount.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        identityRecords.length !== quantity
    ) {
        notify(
            "The quantity must match the number of individual devices.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        identityRecords.some(
            (record) => !hasRequiredIdentity(record)
        )
    ) {
        notify(
            "Model and either MAC Address or Serial Number are for every device.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        hasDuplicateIdentityValues(identityRecords, "serialNumber")
    ) {
        notify(
            "Serial Number must be unique for every device.",
            "error"
        );
        return;
    }

    if (
        isIndividualAsset &&
        hasDuplicateIdentityValues(identityRecords, "macAddress")
    ) {
        notify(
            "MAC Address must be unique for every device.",
            "error"
        );
        return;
    }

    const originalQuantity = Number(
        editMovement.quantity || 0
    );

    const quantityDifference =
        quantity - originalQuantity;

    const originalRecordIds = new Set(
        (editMovement.identityRecords || []).map(
            (record) => String(record.id || "")
        )
    );

    const editedRecordsById = new Map(
        identityRecords.map((record) => [
            String(record.id || ""),
            record,
        ])
    );

    const nextAssetIdentityRecords = isIndividualAsset
        ? (asset.identityRecords || []).map((record) => {
              const editedRecord =
                  editedRecordsById.get(
                      String(record.id || "")
                  );

              if (!editedRecord) return record;

              return {
                  ...record,
                  ...editedRecord,
                  category:
                      record.category ||
                      asset.category ||
                      "",
                  unitPrice,
                  purchaseCode:
                      editMovementForm.purchaseCode ||
                      "",
                  updatedAt:
                      new Date().toISOString(),
              };
          })
        : asset.identityRecords || [];

    const assetSaved = await updateAssetQuantity(
        currentQuantity + quantityDifference,
        {
            unitPrice,
            identityRecords: nextAssetIdentityRecords,
        }
    );

    if (!assetSaved) return;

    const updatedAt = new Date().toISOString();

        const updatedPurchaseMovement = {
        ...editMovement,
        purchaseCode:
            editMovementForm.purchaseCode ||
            editMovement.purchaseCode ||
            "",
        referenceNumber:
            editMovementForm.referenceNumber ||
            editMovementForm.purchaseCode ||
            editMovement.referenceNumber ||
            editMovement.purchaseCode ||
            "",

        date:
            editMovementForm.purchaseDate ||
            editMovementForm.date,

        quantity,
        unitPrice,
        totalAmount,
        paidAmount,
        remainingAmount,

        supplierRecordId:
            editMovementForm.supplierRecordId,

        supplierName:
            editMovementForm.supplierName.trim(),

        sourceName:
            editMovementForm.supplierName.trim() ||
            "Supplier",

        destinationName: "Main Stock",

        billNumber:
            editMovementForm.billNumber.trim(),

        invoiceNumber:
            editMovementForm.billNumber.trim(),

        billImage:
            editMovementForm.billImage || "",

        responsiblePerson:
            editMovementForm.purchasedBy.trim(),

        paymentStatus:
            remainingAmount === 0
                ? "Paid"
                : paidAmount > 0
                    ? "Partial"
                    : "Unpaid",

        identityRecords,
        notes:
            editMovementForm.notes.trim(),

        updatedAt,
    };

    const saved = await setMovements(
        movements.map((movement) => {
            if (
                String(movement.id) !==
                String(editMovement.id)
            ) {
                return movement;
            }

            return updatedPurchaseMovement;
        })
    );

    if (!saved) return;

    const expenseSaved = await savePurchaseExpense({
        movementId: updatedPurchaseMovement.id,
        purchaseCode: updatedPurchaseMovement.purchaseCode,
        purchaseDate: updatedPurchaseMovement.date,
        supplierName: updatedPurchaseMovement.supplierName,
        quantity,
        unitPrice,
        totalAmount,
        paidAmount,
        remainingAmount,
        billNumber: updatedPurchaseMovement.billNumber,
        notes: updatedPurchaseMovement.notes,
    });

    if (!expenseSaved) {
        notify(
            "Purchase was updated, but its expense could not be updated.",
            "error"
        );
        return;
    }

    notify(
        "Purchase record updated successfully."
    );

    setEditMovement(null);
    setEditMovementForm({});

    return;
}

        if (editMovement?.movementType === "Balance") {
            const quantity = Number(editMovementForm.quantity || 0);
            const unitPrice = Number(editMovementForm.unitPrice || 0);
            const totalAmount = quantity * unitPrice;

            const identityRecords = isIndividualAsset
                ? syncIdentityRecords(
                      quantity,
                      editMovementForm.identityRecords || []
                  ).map((record) => ({
                      ...record,
                      model: String(record.model || "").trim(),
                      macAddress: String(record.macAddress || "").trim(),
                      serialNumber: String(record.serialNumber || "").trim(),
                      image: record.image || "",
                      category: asset?.category || record.category || "",
                      unitPrice,
                  }))
                : [];

            if (!Number.isFinite(quantity) || quantity <= 0) {
                notify("Balance quantity must be greater than zero.", "error");
                return;
            }

            if (
                isIndividualAsset &&
                (!Number.isInteger(quantity) || identityRecords.length !== quantity)
            ) {
                notify("Individual balance quantity must be a whole number.", "error");
                return;
            }

            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                notify("Unit price cannot be negative.", "error");
                return;
            }

            if (
                isIndividualAsset &&
                identityRecords.some(
                    (record) => !hasRequiredIdentity(record)
                )
            ) {
                notify(
                    "Model and either MAC Address or Serial Number are for every individual record.",
                    "error"
                );
                return;
            }

            if (isIndividualAsset && hasDuplicateIdentityValues(identityRecords, "serialNumber")) {
                notify("Serial Number must be unique for every individual record.", "error");
                return;
            }

            if (isIndividualAsset && hasDuplicateIdentityValues(identityRecords, "macAddress")) {
                notify("MAC Address must be unique for every individual record.", "error");
                return;
            }

            if (isIndividualAsset) {
                const originalRecordIds = new Set(
                    (editMovement.identityRecords || []).map((record) =>
                        String(record.id || "")
                    )
                );
                const otherSerials = new Set(
                    (asset.identityRecords || [])
                        .filter((record) => !originalRecordIds.has(String(record.id || "")))
                        .map((record) =>
                            String(record.serialNumber || "")
                                .trim()
                                .toLowerCase()
                        )
                        .filter(Boolean)
                );
                const otherMacAddresses = new Set(
                    (asset.identityRecords || [])
                        .filter((record) => !originalRecordIds.has(String(record.id || "")))
                        .map((record) =>
                            String(record.macAddress || "")
                                .trim()
                                .toLowerCase()
                        )
                        .filter(Boolean)
                );

                if (
                    identityRecords.some((record) =>
                        otherSerials.has(
                            String(record.serialNumber || "")
                                .trim()
                                .toLowerCase()
                        )
                    )
                ) {
                    notify("Serial Number already exists for this asset.", "error");
                    return;
                }

                if (
                    identityRecords.some((record) =>
                        otherMacAddresses.has(
                            String(record.macAddress || "")
                                .trim()
                                .toLowerCase()
                        )
                    )
                ) {
                    notify("MAC Address already exists for this asset.", "error");
                    return;
                }
            }

            const originalQuantity = Number(editMovement.quantity || 0);
            const quantityDifference = quantity - originalQuantity;

            const originalRecordIds = new Set(
                (editMovement.identityRecords || []).map((record) =>
                    String(record.id || "")
                )
            );
            const editedRecordsById = new Map(
                identityRecords.map((record) => [String(record.id || ""), record])
            );
            const assetRecordIds = new Set(
                (asset.identityRecords || []).map((record) => String(record.id || ""))
            );

            const updatedExistingAssetRecords = (asset.identityRecords || [])
                .filter((record) => {
                    const recordId = String(record.id || "");
                    return !originalRecordIds.has(recordId) || editedRecordsById.has(recordId);
                })
                .map((record) => {
                    const editedRecord = editedRecordsById.get(String(record.id || ""));
                    return editedRecord
                        ? {
                              ...record,
                              ...editedRecord,
                              unitPrice,
                              updatedAt: new Date().toISOString(),
                          }
                        : record;
                });

            const newAssetRecords = isIndividualAsset
                ? identityRecords
                      .filter((record) => !assetRecordIds.has(String(record.id || "")))
                      .map((record) => ({
                          ...record,
                          category: asset?.category || "",
                          unitPrice,
                          addedAt: new Date().toISOString(),
                      }))
                : [];

            const nextAssetQuantity = currentQuantity + quantityDifference;

            if (nextAssetQuantity < 0) {
                notify("Edited quantity would make stock negative.", "error");
                return;
            }

            const assetSaved = await updateAssetQuantity(nextAssetQuantity, {
                unitPrice,
                location: "Main Stock",
                status: getStatusForLocation("Main Stock"),
                identityRecords: isIndividualAsset
                    ? [...updatedExistingAssetRecords, ...newAssetRecords]
                    : asset.identityRecords || [],
            });

            if (!assetSaved) return;

            const updatedBalanceMovement = {
                ...editMovement,
                date: editMovementForm.date,
                quantity,
                unitPrice,
                totalAmount,
                identityRecords: isIndividualAsset
                    ? identityRecords
                    : editMovement.identityRecords || [],
                paymentStatus: editMovementForm.status || "Added",
                responsiblePerson: editMovementForm.responsiblePerson || "",
                notes: editMovementForm.notes || "",
                updatedAt: new Date().toISOString(),
            };

            const saved = await setMovements(
                movements.map((movement) =>
                    String(movement.id) === String(editMovement.id)
                        ? updatedBalanceMovement
                        : movement
                )
            );

            if (!saved) return;

            notify("Balance record updated successfully.");
            setEditMovement(null);
            setEditMovementForm({});
            return;
        }

        const canEditUnits =
            editMovementUnitOptions.length > 0 &&
            (editMovement?.identityRecords || []).length > 0;

        const originalQuantity = Number(editMovement?.quantity || 0);
        const editedQuantity = canEditUnits
            ? (editMovementForm.selectedIdentityIds || []).length
            : Number(editMovementForm.quantity || 0);

        if (!Number.isFinite(editedQuantity) || editedQuantity < 0) {
            notify("Quantity cannot be negative.", "error");
            return;
        }

        const selectedUnitIds = editMovementForm.selectedIdentityIds || [];

        const nextIdentityRecords = canEditUnits
            ? editMovementUnitOptions.filter((record) =>
                selectedUnitIds.includes(record.id)
            )
            : editMovement?.identityRecords || [];

        const originalIds = new Set(
            (editMovement?.identityRecords || []).map((record, index) =>
                String(record.id || `movement-${editMovement?.id || "record"}-${index}`)
            )
        );

        const nextIds = new Set(
            nextIdentityRecords.map((record) => String(record.id))
        );

        const restoredRecords = editMovementIncludedRecords.filter(
            (record) => !nextIds.has(String(record.id))
        );

        const newlyConsumedRecords = availableIdentityRecords.filter(
            (record) =>
                nextIds.has(String(record.id)) && !originalIds.has(String(record.id))
        );

        const shouldSyncAssetUnits = ["Transfer", "Waste"].includes(
            editMovement?.movementType
        );

        if (canEditUnits && selectedUnitIds.length === 0) {
            notify("Please keep at least one unit in this movement.", "error");
            return;
        }

        if (!canEditUnits && editedQuantity === 0) {
            notify("Quantity must be greater than zero.", "error");
            return;
        }

        if (
            editMovement?.movementType === "Waste" &&
            !canEditUnits &&
            editedQuantity > editWasteMaxQuantity
        ) {
            notify(
                `Waste quantity cannot be greater than available stock (${editWasteMaxQuantity}).`,
                "error"
            );
            return;
        }

        if (
            editMovement?.movementType === "Transfer" &&
            ["To Customer", "To Tower"].includes(editMovementForm.transferType) &&
            !editMovementForm.destinationRecordId
        ) {
            notify(
                editMovementForm.transferType === "To Customer"
                    ? "Please select a customer."
                    : "Please select a tower.",
                "error"
            );
            return;
        }

        if (
            editMovement?.movementType === "Transfer" &&
            editMovementForm.transferType === "To Customer" &&
            editMovementForm.dealType === "Sold" &&
            editTransferPaidTotal > editTransferSaleTotal
        ) {
            notify("Paid amount cannot be greater than total amount.", "error");
            return;
        }

        if (
            editMovement?.movementType === "Transfer" &&
            editMovementForm.transferType === "To Customer" &&
            editMovementForm.dealType === "Leased / Deposit" &&
            editDepositPaidTotal > editTransferDepositTotal
        ) {
            notify("Paid amount cannot be greater than total deposit.", "error");
            return;
        }

        const direction = getMovementStockDirection(editMovement);
        const quantityDifference = editedQuantity - originalQuantity;

        if (shouldSyncAssetUnits && canEditUnits) {
            const nextAssetIdentityRecords = [
                ...availableIdentityRecords.filter(
                    (record) =>
                        !newlyConsumedRecords.some(
                            (consumed) => String(consumed.id) === String(record.id)
                        )
                ),
                ...restoredRecords,
            ];

            const assetSaved = await updateAssetQuantity(
                currentQuantity +
                restoredRecords.length -
                newlyConsumedRecords.length,
                {
                    identityRecords: nextAssetIdentityRecords,
                }
            );

            if (!assetSaved) return;
        }

        if (!canEditUnits && direction !== 0 && quantityDifference !== 0) {
            const nextAssetQuantity =
                currentQuantity + direction * quantityDifference;

            if (nextAssetQuantity < 0) {
                notify("Edited quantity would make stock negative.", "error");
                return;
            }

            const assetSaved = await updateAssetQuantity(nextAssetQuantity);
            if (!assetSaved) return;
        }

        let updatedMovementRecord = null;

        const updatedMovements = movements.map((movement) => {
            if (movement.id !== editMovement?.id) return movement;

            const nextTotalAmount =
                canEditUnits && movement.movementType === "Waste"
                    ? nextIdentityRecords.reduce(
                        (sum, record) =>
                            sum + Number(record.unitPrice || asset?.unitPrice || 0),
                        0
                    )
                    : canEditUnits &&
                        movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Customer" &&
                        editMovementForm.dealType === "Sold"
                        ? nextIdentityRecords.reduce(
                            (sum, record) =>
                                sum +
                                Number(
                                    editMovementForm.salePrices?.[record.id] ||
                                    editMovementForm.salePricePerDevice ||
                                    getDefaultSalePrice(record) ||
                                    0
                                ),
                            0
                        )
                        : canEditUnits &&
                            movement.movementType === "Transfer" &&
                            editMovementForm.transferType === "To Customer" &&
                            editMovementForm.dealType === "Leased / Deposit"
                            ? nextIdentityRecords.reduce(
                                (sum, record) =>
                                    sum +
                                    Number(
                                        editMovementForm.depositPrices?.[record.id] ||
                                        editMovementForm.securityDepositPerDevice ||
                                        0
                                    ),
                                0
                            )
                            : movement.movementType === "Transfer" &&
                                editMovementForm.transferType === "To Customer" &&
                                editMovementForm.dealType === "Sold"
                                ? editTransferSaleTotal
                                : movement.movementType === "Transfer" &&
                                    editMovementForm.transferType === "To Customer" &&
                                    editMovementForm.dealType === "Leased / Deposit"
                                    ? editTransferDepositTotal
                            : movement.movementType === "Transfer"
                                ? 0
                            : movement.movementType === "Waste"
                                ? editWasteLossAmount
                                : movement.totalAmount;

            const editedTotalAmount = Number(editMovementForm.totalAmount || 0);
            const nextPaidAmount =
                movement.movementType === "Transfer" &&
                    editMovementForm.transferType === "To Customer" &&
                    editMovementForm.dealType === "Sold"
                    ? editTransferPaidTotal
                    : movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Customer" &&
                        editMovementForm.dealType === "Leased / Deposit"
                        ? editDepositPaidTotal
                    : movement.paidAmount;

            updatedMovementRecord = {
                ...movement,
                movementType: movement.movementType,
                transferType:
                    movement.movementType === "Transfer"
                        ? editMovementForm.transferType || movement.transferType
                        : movement.transferType,
                date: editMovementForm.date,
                quantity: canEditUnits
                    ? nextIdentityRecords.length
                    : editedQuantity,
                identityRecords: nextIdentityRecords,
                totalAmount:
                    movement.movementType === "Transfer"
                        ? nextTotalAmount
                        : movement.movementType === "Waste"
                            ? nextTotalAmount
                        : canEditUnits
                            ? nextTotalAmount
                            : Number.isFinite(editedTotalAmount)
                                ? editedTotalAmount
                                : movement.totalAmount,
                estimatedLoss:
                    movement.movementType === "Waste"
                        ? nextTotalAmount
                        : movement.estimatedLoss,
                paidAmount: nextPaidAmount,
                remainingAmount:
                    movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Customer" &&
                        editMovementForm.dealType === "Sold"
                        ? Math.max(nextTotalAmount - nextPaidAmount, 0)
                        : movement.movementType === "Transfer" &&
                            editMovementForm.transferType === "To Customer" &&
                            editMovementForm.dealType === "Leased / Deposit"
                            ? editDepositRemainingTotal
                        : movement.movementType === "Transfer"
                            ? 0
                            : movement.remainingAmount,
                trustAmount:
                    movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Customer" &&
                        editMovementForm.dealType === "Leased / Deposit"
                        ? nextTotalAmount
                        : movement.movementType === "Transfer"
                            ? 0
                            : movement.trustAmount,
                dealType:
                    movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Customer"
                        ? editMovementForm.dealType
                        : "",
                unitDepositPrices:
                    movement.movementType === "Transfer"
                        ? editMovementForm.depositPrices || {}
                        : movement.unitDepositPrices,
                unitPaidPrices:
                    movement.movementType === "Transfer"
                        ? editMovementForm.paidPrices || {}
                        : movement.unitPaidPrices,
                unitSalePrices:
                    movement.movementType === "Transfer"
                        ? editMovementForm.salePrices || {}
                        : movement.unitSalePrices,
                securityDepositPerDevice:
                    movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Customer" &&
                        editMovementForm.dealType === "Leased / Deposit" &&
                        !isIndividualAsset
                        ? editedQuantity > 0
                            ? editTransferDepositTotal / editedQuantity
                            : 0
                        : 0,
                salePricePerDevice:
                    movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Customer" &&
                        editMovementForm.dealType === "Sold" &&
                        !isIndividualAsset
                        ? editedQuantity > 0
                            ? editTransferSaleTotal / editedQuantity
                            : 0
                        : 0,
                paidAmountPerDevice:
                    movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Customer" &&
                        editMovementForm.dealType === "Sold" &&
                        !isIndividualAsset
                        ? editedQuantity > 0
                            ? editTransferPaidTotal / editedQuantity
                            : 0
                        : 0,
                remainingAmountPerDevice:
                    movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Customer" &&
                        editMovementForm.dealType === "Sold" &&
                        !isIndividualAsset
                        ? editedQuantity > 0
                            ? editTransferRemainingTotal / editedQuantity
                            : 0
                        : 0,
                sourceName:
                    editMovementForm.sourceName || movement.sourceName || "",
                destinationName:
                    movement.movementType === "Transfer" &&
                        editMovementForm.transferType === "To Repair"
                        ? "Repair / Maintenance"
                        : movement.movementType === "Transfer" &&
                            editMovementForm.transferType === "Mark as Lost"
                            ? "Lost"
                            : editMovementForm.destinationName ||
                            movement.destinationName ||
                            "",
                destinationRecordId:
                    ["To Customer", "To Tower"].includes(
                        editMovementForm.transferType
                    )
                        ? editMovementForm.destinationRecordId || ""
                        : "",
                destinationType:
                    editMovementForm.transferType === "To Customer"
                        ? "Customer"
                        : editMovementForm.transferType === "To Tower"
                            ? "Tower"
                            : editMovementForm.transferType === "To Repair"
                                ? "Repair"
                                : editMovementForm.transferType === "Mark as Lost"
                                    ? "Lost"
                                    : movement.destinationType || "",
                responsiblePerson: editMovementForm.responsiblePerson,
                referenceNumber:
                    movement.movementType === "Transfer"
                        ? editMovementForm.referenceNumber || ""
                        : movement.referenceNumber,
                transferStatus:
                    movement.movementType === "Transfer"
                        ? editMovementForm.status
                        : movement.transferStatus,
                paymentStatus:
                    movement.movementType !== "Transfer"
                        ? editMovementForm.status
                        : movement.paymentStatus,
                notes: editMovementForm.notes,
                updatedAt: new Date().toISOString(),
            };

            return updatedMovementRecord;
        });

        const saved = await setMovements(updatedMovements);

        if (!saved) return;

        const oldCounterpartsRemoved = await removeMovementCounterparts(
            editMovement
        );

        if (!oldCounterpartsRemoved) return;

        const counterpartsSaved = await syncEditedMovementCounterparts(
            updatedMovementRecord
        );

        if (!counterpartsSaved) return;

        const saleIncomeSaved = await saveCustomerSaleIncome(updatedMovementRecord);

        if (!saleIncomeSaved) {
            notify(
                "Movement was updated, but paid amount could not be updated in Financial.",
                "error"
            );
            return;
        }

        if (updatedMovementRecord.movementType === "Waste") {
            const wasteExpenseSaved = await saveWasteExpense(updatedMovementRecord);

            if (!wasteExpenseSaved) {
                notify(
                    "Movement was updated, but waste expense could not be updated in Financial.",
                    "error"
                );
                return;
            }
        }

        notify("Movement updated successfully.");
        setEditMovement(null);
        setEditMovementForm({});
    };

    const deleteMovement = async (movementId) => {
        const movementToDelete = movements.find(
            (movement) => String(movement.id) === String(movementId)
        );

        if (!movementToDelete) return;

        if (!canManageMovementRecord(movementToDelete)) {
            notify(
                "This movement can only be deleted from the page that created it.",
                "error"
            );
            setDeleteMovementRecord(null);
            return;
        }

        const quantity = Number(movementToDelete.quantity || 0);
        const direction = getMovementStockDirection(movementToDelete);
        const restoredRepairQuantity =
            movementToDelete.transferType === "To Repair" &&
            movementToDelete.repairResult?.stockRestored === true
                ? quantity
                : 0;
        const nextQuantity =
            currentQuantity - direction * quantity - restoredRepairQuantity;

        if (nextQuantity < 0) {
            notify("Deleting this movement would make stock negative.", "error");
            return;
        }

        const movementIdentityRecords = (
            movementToDelete.identityRecords || []
        ).map((record, index) => ({
            ...record,
            id: record.id || `deleted-movement-${movementToDelete.id}-${index}`,
        }));

        let nextIdentityRecords = availableIdentityRecords;

        if (isIndividualAsset && movementIdentityRecords.length > 0) {
            const movementKeys = new Set(movementIdentityRecords.map(getAssetKey));

            if (["Balance", "Purchase"].includes(movementToDelete.movementType)) {
                nextIdentityRecords = availableIdentityRecords.filter(
                    (record) => !movementKeys.has(getAssetKey(record))
                );
            }

            if (["Waste", "Transfer"].includes(movementToDelete.movementType)) {
                const existingKeys = new Set(
                    availableIdentityRecords.map(getAssetKey)
                );
                nextIdentityRecords = [
                    ...availableIdentityRecords,
                    ...movementIdentityRecords.filter(
                        (record) => !existingKeys.has(getAssetKey(record))
                    ),
                ];
            }
        }

        const assetSaved = await updateAssetQuantity(nextQuantity, {
            identityRecords: isIndividualAsset
                ? nextIdentityRecords
                : availableIdentityRecords,
            location:
                nextQuantity > 0 &&
                ["Waste", "Transfer"].includes(movementToDelete.movementType)
                    ? "Main Stock"
                    : asset.location,
            status:
                nextQuantity > 0 &&
                ["Waste", "Transfer"].includes(movementToDelete.movementType)
                    ? "In Stock"
                    : asset.status,
        });

        if (!assetSaved) return;

        const counterpartsRemoved = await removeMovementCounterparts(
            movementToDelete
        );

        if (!counterpartsRemoved) return;

        const saved = await setMovements(
            movements.filter((movement) => movement.id !== movementId)
        );

        if (!saved) return;

        if (movementToDelete.movementType === "Purchase") {
            const expenseRemoved = await removePurchaseExpense(movementToDelete.id);

            if (!expenseRemoved) {
                notify(
                    "Movement deleted, but its expense could not be removed.",
                    "error"
                );
                return;
            }
        }

        if (movementToDelete.movementType === "Waste") {
            const expenseRemoved = await saveWasteExpense({
                ...movementToDelete,
                estimatedLoss: 0,
            });

            if (!expenseRemoved) {
                notify(
                    "Movement deleted, but its waste expense could not be removed.",
                    "error"
                );
                return;
            }
        }

        if (movementToDelete.repairResult) {
            const repairExpenseRemoved = await saveRepairExpense({
                ...movementToDelete,
                repairResult: {
                    ...movementToDelete.repairResult,
                    paidAmount: 0,
                },
            });

            if (!repairExpenseRemoved) {
                notify(
                    "Movement deleted, but its repair expense could not be removed.",
                    "error"
                );
                return;
            }
        }

        if (
            movementToDelete.movementType === "Transfer" &&
            movementToDelete.transferType === "To Customer" &&
            movementToDelete.dealType === "Sold"
        ) {
            const incomeRemoved = await saveCustomerSaleIncome({
                ...movementToDelete,
                paidAmount: 0,
            });

            if (!incomeRemoved) {
                notify(
                    "Movement deleted, but its sale income could not be removed.",
                    "error"
                );
                return;
            }
        }

        notify("Movement deleted successfully.");
        setOpenMovementAction("");
        setDeleteMovementRecord(null);
    };

    if (
        !assetsLoaded ||
        !suppliersLoaded ||
        !movementsLoaded ||
        !towerAssetsLoaded ||
        !customersLoaded
    ) {
        return <div className="page-loading">Loading asset information...</div>;
    }

    if (!asset) {
        return (
            <div className="asset-detail-page">
                <div className="asset-detail-not-found">
                    <h1>Asset Not Found</h1>
                    <p>The selected asset record does not exist.</p>

                    <button
                        type="button"
                        onClick={() => navigate("/assets")}
                    >
                        Back to Asset Inventory
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="asset-detail-page">
            <Link className="asset-detail-back" to="/assets">
                ← Back to Asset Inventory
            </Link>

            <div className="asset-detail-header">
                <div>
                    <span>Asset Full Information</span>

                    <h1>
                        {asset.assetId || "No Asset ID"} -{" "}
                        {asset.deviceName || "Unnamed Asset"}
                    </h1>

                    <p>
                        View stock balance, purchases, waste, transfers, and complete
                        asset movement history.
                    </p>
                </div>

                <div className="asset-detail-header-actions">
                    <button
                        type="button"
                        className="balance"
                        disabled={assetMovements.length > 0}
                        title={
                            assetMovements.length > 0
                                ? "Balance can only be added before any movement record exists."
                                : "Add opening balance"
                        }
                        onClick={() => {
                            if (assetMovements.length > 0) {
                                notify(
                                    "Balance is locked because this asset already has movement history.",
                                    "error"
                                );
                                return;
                            }

                            setPurchaseForm({
                                ...emptyPurchaseForm,
                                identityRecords: [],
                            });
                            setModalType("balance");
                        }}
                    >
                        + Balance
                    </button>

                    <button
                        type="button"
                        className="purchase"
                        onClick={() => {
                            setPurchaseRecordForm({
                                ...emptyPurchaseRecordForm,
                                purchaseCode: generateNextPurchaseCode(),
                                identityRecords: [],
                            });
                            setModalType("purchase");
                        }}
                    >
                        + Purchase
                    </button>

                </div>
            </div>

            {false && <div className="asset-detail-stats">
                <article
                    onClick={() =>
                        navigate(`/assets/${asset.assetId || asset.id}/details/insights/current`)
                    }
                >
                    <span>Current Quantity</span>
                    <strong>{currentQuantity}</strong>
                    <p>Current recorded asset quantity</p>
                </article>

                <article
                    onClick={() =>
                        navigate(`/assets/${asset.assetId || asset.id}/details/insights/main-stock`)
                    }
                >
                    <span>Main Stock Quantity</span>
                    <strong>{mainStockQuantity}</strong>
                    <p>Currently available in warehouse</p>
                </article>

                <article
                    onClick={() =>
                        navigate(`/assets/${asset.assetId || asset.id}/details/insights/balance`)
                    }
                >
                    <span>Total Balance Added</span>
                    <strong>{totalBalanceAdded}</strong>
                    <p>Quantity added through Add Balance</p>
                </article>

                <article
                    onClick={() =>
                        navigate(`/assets/${asset.assetId || asset.id}/details/insights/purchase`)
                    }
                >
                    <span>Total Purchased</span>
                    <strong>{totalPurchased}</strong>
                    <p>Quantity added through purchases</p>
                </article>

                <article
                    onClick={() =>
                        navigate(`/assets/${asset.assetId || asset.id}/details/insights/waste`)
                    }
                >
                    <span>Total Wasted</span>
                    <strong>{totalWasted}</strong>
                    <p>Damaged or disposed quantity</p>
                </article>

                <article
                    onClick={() =>
                        navigate(`/assets/${asset.assetId || asset.id}/details/insights/transfer`)
                    }
                >
                    <span>Total Transferred</span>
                    <strong>{totalTransferred}</strong>
                    <p>Quantity moved between locations</p>
                </article>

                <article
                    onClick={() =>
                        navigate(`/assets/${asset.assetId || asset.id}/details/insights/purchase-value`)
                    }
                >
                    <span>Total Purchase Value</span>
                    <strong>{money(totalPurchaseValue)} AFN</strong>
                    <p>Total value of recorded purchases</p>
                </article>
            </div>}

            <div className="asset-detail-table-card">
                <div className="asset-detail-table-header">
    <div>
        <h3>Asset Movement History</h3>
        <p>Balance additions, waste, transfers, repairs, and adjustments.</p>
    </div>

    <div className="asset-movement-legend" aria-label="Movement row color guide">
        <span className="asset-movement-legend-item purchase">
            <i />
            Purchase Record
        </span>

        <span className="asset-movement-legend-item main-stock">
            <i />
            Source: Main Stock
        </span>

        <span className="asset-movement-legend-item external-source">
            <i />
            Source: Not Main Stock
        </span>

        <span className="asset-movement-legend-item lost">
            <i />
            Lost Record
        </span>
    </div>
</div>

                <div className="asset-detail-table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Movement</th>
                                <th>Category</th>
                                <th>Device Name</th>
                                <th>Image</th>
                                <th>Type</th>
                                <th>Issued from</th>
                                <th className="asset-route-arrow-head"></th>
                                <th>Issued to</th>
                                <th>Quantity</th>
                                <th>Responsible Person</th>
                                <th>Received By</th>
                                <th>Status</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {assetMovements.map((movement) => (
                                <Fragment key={movement.id}>
                                <tr className={getMovementRowClass(movement)}>
                                    <td className="asset-movement-date-cell">
                                        {formatDateTime(
                                            movement.date,
                                            movement.createdAt ||
                                                movement.updatedAt
                                        )}
                                    </td>

                                    <td>
                                        <span
                                            className={`asset-movement-badge ${String(
                                                movement.movementType || ""
                                            ).toLowerCase()}`}
                                        >
                                            {movement.movementType || "-"}
                                        </span>
                                    </td>

                                    <td>{movement.category || asset?.category || "-"}</td>

                                    <td
                                        className="asset-device-name-cell"
                                        title={getMovementDeviceName(movement)}
                                    >
                                        {getMovementDeviceName(movement)}
                                    </td>

                                    <td className="asset-movement-image-cell">
                                        {getMovementImage(movement) ? (
                                            <img
                                                src={getMovementImage(movement)}
                                                alt={getMovementDeviceName(movement)}
                                            />
                                        ) : (
                                            <span>-</span>
                                        )}
                                    </td>

                                    <td className="asset-type-soft">
                                        {movement.transferType ||
                                            movement.wasteReason ||
                                            movement.paymentStatus ||
                                            "-"}
                                    </td>

                                    <td className="asset-route-source">{movement.sourceName || "-"}</td>

                                    <td className="asset-route-arrow">
                                        <span>→</span>
                                    </td>

                                    <td className="asset-route-destination">{movement.destinationName || "-"}</td>

                                    <td>{movement.quantity || 0}</td>

                                    <td>{movement.responsiblePerson || movement.responsibleUser || "-"}</td>

                                    <td>{movement.receivedBy || "-"}</td>

                                    <td>
                                        <div className="asset-movement-status-cell">
                                            <span>
                                                {movement.transferStatus ||
                                                    movement.paymentStatus ||
                                                    "Completed"}
                                            </span>

                                            {movement.transferType === "To Repair" &&
                                                (movement.repairResult ? (
                                                    <button
                                                        type="button"
                                                        className="asset-result-inline-btn"
                                                        onClick={() =>
                                                            setOpenRepairResultDetailId((previous) =>
                                                                String(previous) === String(movement.id)
                                                                    ? ""
                                                                    : movement.id
                                                            )
                                                        }
                                                    >
                                                        Result
                                                    </button>
                                                ) : (
                                                    <span className="asset-result-inline-badge pending">
                                                        No Result
                                                    </span>
                                                ))}
                                        </div>
                                    </td>

                                    <td title={movement.notes || "-"}>
                                        {movement.notes || "-"}
                                    </td>

                                    <td>
                                        <div className="asset-movement-actions">
                                            <button
  type="button"
  className="asset-movement-action-toggle"
  aria-label="Open movement actions"
  aria-expanded={
    String(openMovementAction) === String(movement.id)
  }
  onClick={(event) =>
    toggleMovementActionMenu(
      event,
      movement.id
    )
  }
>
  <MoreVertical size={18} strokeWidth={2} />
</button>

                                            {String(openMovementAction) ===
                                                String(movement.id) && (
                                               <div
  className="asset-movement-action-menu"
  style={{
    top: `${movementActionPosition.top}px`,
    left: `${movementActionPosition.left}px`,
  }}
  onMouseDown={(event) =>
    event.stopPropagation()
  }
>
  <button
    type="button"
    onClick={() => {
      setViewMovement(movement);
      setOpenMovementAction("");
    }}
  >
    <Info size={14} />
    Full Information
  </button>

  {canManageMovementRecord(movement) && (
    <>
      <button
        type="button"
        onClick={() => {
          openEditMovement(movement);
          setOpenMovementAction("");
        }}
      >
        <Pencil size={14} />
        Edit
      </button>

      {movement.transferType === "To Repair" && (
        <button
          type="button"
          onClick={() => openRepairResult(movement)}
        >
          <Pencil size={14} />
          Repair Result
        </button>
      )}

      <button
        type="button"
        className="danger"
        onClick={() => {
          setDeleteMovementRecord(movement);
          setOpenMovementAction("");
        }}
      >
        <Trash2 size={14} />
        Delete
      </button>
    </>
  )}
</div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {movement.repairResult &&
                                    String(openRepairResultDetailId) ===
                                    String(movement.id) && (
                                    <tr
                                        className={`asset-repair-result-row ${
                                            movement.repairResult.repairStatus ===
                                            "Not Fixed"
                                                ? "not-fixed"
                                                : "fixed"
                                        }`}
                                    >
                                        <td colSpan="15" className="asset-detail-empty">
                                            <div className="asset-repair-result-content">
                                                <strong>
                                                    Repair Result:{" "}
                                                    {movement.repairResult.repairStatus || "-"}
                                                </strong>
                                                <span>
                                                    Date:{" "}
                                                    {formatDateTime(
                                                        movement.repairResult.repairDate,
                                                        movement.repairResult.recordedAt ||
                                                            movement.updatedAt ||
                                                            movement.createdAt
                                                    )}
                                                </span>
                                                <span>
                                                    Supplier: {movement.repairResult.supplierName || "-"}
                                                </span>
                                                <span>
                                                    Cost: {money(movement.repairResult.repairCost || 0)} AFN
                                                </span>
                                                <span>
                                                    Paid: {money(movement.repairResult.paidAmount || 0)} AFN
                                                </span>
                                                <span>
                                                    Remaining: {money(movement.repairResult.remainingAmount || 0)} AFN
                                                </span>
                                                <span>
                                                    Next Destination: {movement.repairResult.nextDestination || "-"}
                                                </span>
                                                {movement.repairResult.destinationName && (
                                                    <span>
                                                        Destination: {movement.repairResult.destinationName}
                                                    </span>
                                                )}
                                                {movement.repairResult.notes && (
                                                    <em>{movement.repairResult.notes}</em>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                </Fragment>
                            ))}

                            {assetMovements.length === 0 && (
                                <tr>
                                    <td colSpan="15" className="asset-detail-empty">
                                        No balance, purchase, waste, or transfer record has been added
                                        for this asset yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalType === "balance" && (
                <div
                    className="asset-detail-modal-backdrop"
                >
                    <div
                        className="asset-detail-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="asset-detail-modal-header">
                            <div>
                                <h3>Add Balance</h3>
                                <p>Add quantity and value for this asset.</p>
                            </div>

                            <button
  type="button"
  className="asset-detail-modal-close"
  aria-label="Close modal"
  onClick={() => setModalType("")}
>
  ×
</button>
                        </div>

                        <form onSubmit={saveBalance}>
                            <div className="asset-detail-form-grid">
                                <label>
                                    Quantity ({purchaseUsageUnit})
                                    <input
                                        type="number"
                                        min="1"
                                        value={purchaseForm.quantity}
                                        onChange={(event) => {
                                            const quantity = event.target.value;

                                            setPurchaseForm((previous) => {
                                                const nextQuantity = isIndividualAsset
                                                    ? quantity === ""
                                                        ? ""
                                                        : String(Math.max(
                                                            Math.floor(Number(quantity || 0)),
                                                            0
                                                        ))
                                                    : quantity;

                                                return {
                                                    ...previous,
                                                    quantity: nextQuantity,
                                                    identityRecords:
                                                        isIndividualAsset
                                                            ? syncIdentityRecords(
                                                                nextQuantity,
                                                                previous.identityRecords
                                                            )
                                                            : [],
                                                };
                                            });
                                        }}
                                        step={isIndividualAsset ? "1" : "any"}
                                    />
                                </label>

                                <label>
                                    Location
                                    <input
                                        value="Main Stock"
                                        readOnly
                                        className="asset-detail-calculated-input"
                                    />
                                </label>

                                {isIndividualAsset &&
                                    purchaseForm.identityRecords.length > 0 && (
                                        <div className="asset-balance-records">
                                            <div className="asset-balance-records-header">
                                                <h4>Individual Unit Records</h4>
                                                <span>
                                                    {purchaseForm.identityRecords.length} record(s)
                                                </span>
                                            </div>

                                            {purchaseForm.identityRecords.map((record, index) => (
                                                <div
                                                    className="asset-balance-record"
                                                    key={record.id}
                                                >
                                                    <strong>Record {index + 1}</strong>

                                                    <label>
                                                        Model
                                                        <input
                                                            value={record.model}
                                                            onChange={(event) =>
                                                                updateBalanceIdentityRecord(
                                                                    index,
                                                                    "model",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="Example: RB750Gr3"
                                                        />
                                                    </label>

                                                    <label>
                                                        MAC Address
                                                        <input
                                                            value={record.macAddress}
                                                            onChange={(event) =>
                                                                updateBalanceIdentityRecord(
                                                                    index,
                                                                    "macAddress",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="Example: AA:BB:CC:DD:EE:FF"
                                                        />
                                                    </label>

                                                    <label>
                                                        Serial Number
                                                        <input
                                                            value={record.serialNumber}
                                                            onChange={(event) =>
                                                                updateBalanceIdentityRecord(
                                                                    index,
                                                                    "serialNumber",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="Example: SN-123456"
                                                        />
                                                    </label>

                                                    <label>
                                                        Image
                                                        <div className="asset-balance-image-field">
                                                            <div>
                                                                {record.image ? (
                                                                    <img
                                                                        src={record.image}
                                                                        alt={`Record ${index + 1}`}
                                                                    />
                                                                ) : (
                                                                    <span>No Image</span>
                                                                )}
                                                            </div>

                                                            <input
                                                                type="file"
                                                                accept="image/png,image/jpeg,image/webp"
                                                                onChange={(event) =>
                                                                    handleBalanceRecordImageChange(
                                                                        index,
                                                                        event
                                                                    )
                                                                }
                                                            />

                                                            {record.image && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        updateBalanceIdentityRecord(
                                                                            index,
                                                                            "image",
                                                                            ""
                                                                        )
                                                                    }
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>

                            <div className="asset-detail-modal-actions">
                                <button type="button" onClick={() => setModalType("")}>
                                    Cancel
                                </button>

                                <button type="submit">Save Balance</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalType === "purchase" && (
                <div
                    className="asset-detail-modal-backdrop"
                >
                    <div
                        className="asset-detail-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="asset-detail-modal-header">
                            <div>
                                <h3>
                                    Purchase {asset.deviceName || "Asset"}
                                </h3>
                                <p>Record a purchased quantity for this asset.</p>
                            </div>

                            <button
                            type="button"
                            className="asset-detail-modal-close"
                            aria-label="Close purchase modal"
                            onClick={() => setModalType("")}
                            >
                            ×
                            </button>
                        </div>

                        <form onSubmit={savePurchaseRecord}>
                            <div className="asset-detail-form-grid">
                                <label>
                                    Reference Number
                                    <input
                                        value={purchaseRecordForm.purchaseCode}
                                        readOnly
                                        className="asset-detail-calculated-input"
                                    />
                                </label>

                                <label>
                                    Quantity ({purchaseUsageUnit})
                                    <input
                                        type="number"
                                        min="1"
                                        value={purchaseRecordForm.quantity}
                                        onChange={(event) => {
                                            const quantity = event.target.value;

                                            setPurchaseRecordForm((previous) => {
                                                const nextQuantity = isIndividualAsset
                                                    ? quantity === ""
                                                        ? ""
                                                        : String(Math.max(
                                                            Math.floor(Number(quantity || 0)),
                                                            0
                                                        ))
                                                    : quantity;
                                                return {
                                                    ...previous,
                                                    quantity: nextQuantity,
                                                    identityRecords:
                                                        isIndividualAsset
                                                            ? syncIdentityRecords(
                                                                nextQuantity,
                                                                previous.identityRecords
                                                            )
                                                            : [],
                                                };
                                            });
                                        }}
                                        step={isIndividualAsset ? "1" : "any"}
                                    />
                                </label>

                                <label>
                                    Purchase Date
                                    <input
                                        type="date"
                                        value={purchaseRecordForm.purchaseDate}
                                        onChange={(event) =>
                                            setPurchaseRecordForm((previous) => ({
                                                ...previous,
                                                purchaseDate: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    Supplier
                                    <select
                                        value={purchaseRecordForm.supplierRecordId}
                                        onChange={(event) => {
                                            const selectedSupplier = suppliers.find(
                                                (supplier) =>
                                                    String(
                                                        supplier.id ||
                                                        supplier.supplierName
                                                    ) ===
                                                    String(event.target.value)
                                            );

                                            setPurchaseRecordForm((previous) => ({
                                                ...previous,
                                                supplierRecordId: event.target.value,
                                                supplierName:
                                                    selectedSupplier?.supplierName || "",
                                            }));
                                        }}
                                    >
                                        <option value="">Select Supplier</option>

                                        {suppliers.map((supplier) => (
                                            <option
                                                key={supplier.id || supplier.supplierName}
                                                value={supplier.id || supplier.supplierName}
                                            >
                                                {supplier.supplierName || "Unnamed Supplier"}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Invoice Number
                                    <input
                                        value={purchaseRecordForm.invoiceNumber}
                                        onChange={(event) =>
                                            setPurchaseRecordForm((previous) => ({
                                                ...previous,
                                                invoiceNumber: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    Bill Image
                                    <div className="asset-balance-image-field">
                                        <div>
                                            {purchaseRecordForm.billImage ? (
                                                <img
                                                    src={purchaseRecordForm.billImage}
                                                    alt="Purchase bill"
                                                />
                                            ) : (
                                                <span>No Image</span>
                                            )}
                                        </div>

                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handlePurchaseBillImageChange}
                                        />

                                        {purchaseRecordForm.billImage && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPurchaseRecordForm((previous) => ({
                                                        ...previous,
                                                        billImage: "",
                                                    }))
                                                }
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </label>

                                <label>
                                    Purchased By
                                    <input
                                        value={purchaseRecordForm.purchasedBy}
                                        onChange={(event) =>
                                            setPurchaseRecordForm((previous) => ({
                                                ...previous,
                                                purchasedBy: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    Location
                                    <input
                                        value="Main Stock"
                                        readOnly
                                        className="asset-detail-calculated-input"
                                    />
                                </label>

                                {isIndividualAsset &&
                                    purchaseRecordForm.identityRecords.length > 0 && (
                                        <div className="asset-balance-records">
                                            <div className="asset-balance-records-header">
                                                <h4>Purchased Unit Records</h4>
                                                <span>
                                                    {purchaseRecordForm.identityRecords.length} record(s)
                                                </span>
                                            </div>

                                            {purchaseRecordForm.identityRecords.map((record, index) => (
                                                <div
                                                    className="asset-balance-record"
                                                    key={record.id}
                                                >
                                                    <strong>Record {index + 1}</strong>

                                                    <label>
                                                        Model
                                                        <input
                                                            value={record.model}
                                                            onChange={(event) =>
                                                                updatePurchaseIdentityRecord(
                                                                    index,
                                                                    "model",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="Example: RB750Gr3"
                                                        />
                                                    </label>

                                                    <label>
                                                        MAC Address
                                                        <input
                                                            value={record.macAddress}
                                                            onChange={(event) =>
                                                                updatePurchaseIdentityRecord(
                                                                    index,
                                                                    "macAddress",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="Example: AA:BB:CC:DD:EE:FF"
                                                        />
                                                    </label>

                                                    <label>
                                                        Serial Number
                                                        <input
                                                            value={record.serialNumber}
                                                            onChange={(event) =>
                                                                updatePurchaseIdentityRecord(
                                                                    index,
                                                                    "serialNumber",
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder="Example: SN-123456"
                                                        />
                                                    </label>

                                                    <label>
                                                        Image
                                                        <div className="asset-balance-image-field">
                                                            <div>
                                                                {record.image ? (
                                                                    <img
                                                                        src={record.image}
                                                                        alt={`Record ${index + 1}`}
                                                                    />
                                                                ) : (
                                                                    <span>No Image</span>
                                                                )}
                                                            </div>

                                                            <input
                                                                type="file"
                                                                accept="image/png,image/jpeg,image/webp"
                                                                onChange={(event) =>
                                                                    handlePurchaseRecordImageChange(
                                                                        index,
                                                                        event
                                                                    )
                                                                }
                                                            />

                                                            {record.image && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        updatePurchaseIdentityRecord(
                                                                            index,
                                                                            "image",
                                                                            ""
                                                                        )
                                                                    }
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                <label className="full">
                                    Notes
                                    <textarea
                                        value={purchaseRecordForm.notes}
                                        onChange={(event) =>
                                            setPurchaseRecordForm((previous) => ({
                                                ...previous,
                                                notes: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            </div>

                            <div className="asset-detail-modal-actions">
                                <button type="button" onClick={() => setModalType("")}>
                                    Cancel
                                </button>

                                <button type="submit">Save Purchase</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalType === "waste" && (
                <div
                    className="asset-detail-modal-backdrop"
                >
                    <div
                        className="asset-detail-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="asset-detail-modal-header">
                            <div>
                                <h3>Waste {asset.deviceName || "Asset"}</h3>
                                <p>Record damaged, expired, or disposed asset quantity.</p>
                            </div>

                           <button
  type="button"
  className="asset-detail-modal-close"
  aria-label="Close modal"
  onClick={() => setModalType("")}
>
  ×
</button>
                        </div>

                        <form onSubmit={saveWaste}>
                            <div className="asset-detail-form-grid">
                                <label>
                                    Waste Date
                                    <input
                                        type="date"
                                        value={wasteForm.wasteDate}
                                        onChange={(event) =>
                                            setWasteForm((previous) => ({
                                                ...previous,
                                                wasteDate: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                {!isIndividualAsset && (
                                    <label>
                                      Quantity ({purchaseUsageUnit})

                                      <input
                                        type="number"
                                        min="1"
                                        max={currentStock}
                                        value={wasteForm.quantity}
                                        onChange={(event) =>
                                          limitQuantityToCurrentStock(
                                            event.target.value,
                                            setWasteForm
                                          )
                                        }
                                        disabled={currentStock <= 0}
                                      />

                                      <small className="asset-detail-stock-hint">
                                        Available stock: {currentStock}
                                      </small>
                                    </label>
                                )}

                                {isIndividualAsset && (
                                    <div className="asset-waste-picker">
                                        <div className="asset-waste-tools">
                                            <label>
                                                Search Units
                                                <input
                                                    value={wasteForm.wasteSearch}
                                                    onChange={(event) =>
                                                        setWasteForm((previous) => ({
                                                            ...previous,
                                                            wasteSearch: event.target.value,
                                                        }))
                                                    }
                                                    placeholder="Search model, MAC, or serial..."
                                                />
                                            </label>

                                            <label>
                                                Category
                                                <select
                                                    value={wasteForm.wasteCategory}
                                                    onChange={(event) =>
                                                        setWasteForm((previous) => ({
                                                            ...previous,
                                                            wasteCategory: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    {wasteCategoryOptions.map((category) => (
                                                        <option
                                                            key={category}
                                                            value={category}
                                                        >
                                                            {category}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>

                                        <div className="asset-waste-summary">
                                            <span>
                                                Selected: {selectedWasteIdentityRecords.length}
                                            </span>
                                            <strong>
                                                Loss: {money(selectedWasteLoss)} AFN
                                            </strong>
                                        </div>

                                        <div className="asset-waste-unit-list">
                                            {filteredWasteIdentityRecords.map((record) => {
                                                const selected =
                                                    wasteForm.selectedIdentityIds.includes(record.id);
                                                const unitValue = Number(
                                                    record.unitPrice || asset.unitPrice || 0
                                                );
                                                const rowSalePrice =
                                                    transferForm.salePrices[record.id] ??
                                                    getDefaultSalePrice(record) ??
                                                    "";
                                                const rowDepositPrice =
                                                    transferForm.depositPrices[record.id] ??
                                                    transferForm.securityDepositPerDevice ??
                                                    "";

                                                return (
                                                    <label
                                                        key={record.id}
                                                        className={
                                                            selected
                                                                ? "asset-waste-unit selected"
                                                                : "asset-waste-unit"
                                                        }
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={(event) =>
                                                                setWasteForm((previous) => ({
                                                                    ...previous,
                                                                    selectedIdentityIds:
                                                                        event.target.checked
                                                                            ? [
                                                                                ...previous.selectedIdentityIds,
                                                                                record.id,
                                                                            ]
                                                                            : previous.selectedIdentityIds.filter(
                                                                                (id) => id !== record.id
                                                                            ),
                                                                }))
                                                            }
                                                        />

                                                        <div>
                                                            <strong>
                                                                {record.serialNumber || "No Serial"}
                                                            </strong>
                                                            <span>
                                                                {record.model || "-"} / {record.macAddress || "-"}
                                                            </span>
                                                        </div>

                                                        <em>{record.category || asset.category || "-"}</em>
                                                        {transferForm.transferType === "To Customer" &&
                                                            selected &&
                                                            transferForm.dealType === "Sold" ? (
                                                            <div
                                                                className="asset-transfer-row-amounts"
                                                                onClick={(event) => event.stopPropagation()}
                                                            >
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={rowSalePrice}
                                                                    placeholder="Sale Price"
                                                                    aria-label="Sale price for this unit"
                                                                    onChange={(event) =>
                                                                        setTransferForm((previous) => ({
                                                                            ...previous,
                                                                            salePrices: {
                                                                                ...previous.salePrices,
                                                                                [record.id]: event.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                />
                                                                <b>{money(Number(rowSalePrice || 0))} AFN</b>
                                                            </div>
                                                        ) : transferForm.transferType === "To Customer" &&
                                                            selected &&
                                                            transferForm.dealType === "Leased / Deposit" ? (
                                                            <div
                                                                className="asset-transfer-row-amounts single"
                                                                onClick={(event) => event.stopPropagation()}
                                                            >
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={rowDepositPrice}
                                                                    placeholder="Deposit"
                                                                    aria-label="Security deposit for this unit"
                                                                    onChange={(event) =>
                                                                        setTransferForm((previous) => ({
                                                                            ...previous,
                                                                            depositPrices: {
                                                                                ...previous.depositPrices,
                                                                                [record.id]: event.target.value,
                                                                            },
                                                                        }))
                                                                    }
                                                                />
                                                            </div>
                                                        ) : (
                                                            <b>{money(unitValue)} AFN</b>
                                                        )}
                                                    </label>
                                                );
                                            })}

                                            {filteredWasteIdentityRecords.length === 0 && (
                                                <div className="asset-waste-empty">
                                                    No individual unit was found.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <label>
                                    Waste Reason
                                    <input
                                        value={wasteForm.wasteReason}
                                        onChange={(event) =>
                                            setWasteForm((previous) => ({
                                                ...previous,
                                                wasteReason: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    Reported By
                                    <input
                                        value={wasteForm.reportedBy}
                                        onChange={(event) =>
                                            setWasteForm((previous) => ({
                                                ...previous,
                                                reportedBy: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label className="full">
                                    Notes
                                    <textarea
                                        value={wasteForm.notes}
                                        onChange={(event) =>
                                            setWasteForm((previous) => ({
                                                ...previous,
                                                notes: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            </div>

                            <div className="asset-detail-modal-actions">
                                <button type="button" onClick={() => setModalType("")}>
                                    Cancel
                                </button>

                                <button
  type="submit"
  className="danger"
  disabled={currentStock <= 0}
>
  Save Waste
</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalType === "transfer" && (
                <div
                    className="asset-detail-modal-backdrop"
                >
                    <div
                        className="asset-detail-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="asset-detail-modal-header">
                            <div>
                                <h3>Transfer Asset</h3>
                                <p>Move asset quantity between system locations.</p>
                            </div>

                            <button
  type="button"
  className="asset-detail-modal-close"
  aria-label="Close modal"
  onClick={() => setModalType("")}
>
  ×
</button>
                        </div>

                        <form onSubmit={saveTransfer}>
                            <div className="asset-detail-form-grid">
                                <label>
                                    Transfer Type
                                    <select
                                        value={transferForm.transferType}
                                       onChange={(event) => {
    const value = event.target.value;

    setTransferForm((previous) => ({
        ...previous,

        transferType: value,
        sourceName: "Main Stock",

        dealType: "Leased / Deposit",
        securityDepositPerDevice: "",
        salePricePerDevice: "",
        paidAmountPerDevice: "",
        totalAmount: "",
        paidAmount: "",
        trustAmount: "",
        salePrices: {},
        paidPrices: {},
        depositPrices: {},

        destinationType:
            value === "To Tower"
                ? "Tower"
                : value === "To Customer"
                    ? "Customer"
                    : "Repair",

        destinationRecordId: "",

        destinationName:
            value === "To Repair"
                ? "Repair / Maintenance"
                : "",

        transferStatus:
            value === "To Repair"
                ? "In Repair"
                : "Completed",
    }));
}}
                                    >

                                        <option value="To Tower">
                                            To Tower
                                        </option>

                                        <option value="To Customer">
                                            To Customer
                                        </option>

                                        <option value="To Repair">
                                            To Repair / Maintenance
                                        </option>

                                    </select>
                                </label>

                                <label>
  Current Location
  <input
    value="Main Stock"
    readOnly
    className="asset-detail-calculated-input"
  />
</label>

                                <label>
                                    Destination

                                    {transferForm.transferType === "To Tower" ? (
                                        <select
                                            value={transferForm.destinationRecordId}
                                            onChange={(event) => {
                                                const selectedTower = towerAssets.find(
                                                    (tower) =>
                                                        String(tower.id) === String(event.target.value)
                                                );

                                                setTransferForm((previous) => ({
                                                    ...previous,

                                                    destinationType: "Tower",
                                                    destinationRecordId: event.target.value,

                                                    destinationName: selectedTower
                                                        ? `${selectedTower.towerName || "Unnamed Tower"}${selectedTower.towerLocation
                                                            ? ` - ${selectedTower.towerLocation}`
                                                            : ""
                                                        }`
                                                        : "",
                                                }));
                                            }}
                                        >
                                            <option value="">Select Tower</option>

                                            {towerAssets.map((tower) => (
                                                <option
                                                    key={tower.id}
                                                    value={tower.id}
                                                >
                                                    {tower.towerName || "Unnamed Tower"}
                                                    {tower.towerLocation
                                                        ? ` - ${tower.towerLocation}`
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>
                                    ) : transferForm.transferType === "To Customer" ? (
                                        <select
                                            value={transferForm.destinationRecordId}
                                            onChange={(event) => {
                                                const selectedCustomer = customers.find(
                                                    (customer) =>
                                                        String(customer.id) === String(event.target.value)
                                                );

                                                setTransferForm((previous) => ({
                                                    ...previous,

                                                    destinationType: "Customer",
                                                    destinationRecordId: event.target.value,

                                                    destinationName: selectedCustomer
                                                        ? `${selectedCustomer.customerId || "No Customer ID"
                                                        } - ${getCustomerName(selectedCustomer)}`
                                                        : "",
                                                }));
                                            }}
                                        >
                                            <option value="">Select Customer</option>

                                            {customers.map((customer) => (
                                                <option
                                                    key={customer.id}
                                                    value={customer.id}
                                                >
                                                    {customer.customerId || "No Customer ID"} -{" "}
                                                    {getCustomerName(customer)}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            value={
                                                transferForm.transferType === "To Repair"
                                                    ? "Repair / Maintenance"
                                                    : "Lost"
                                            }
                                            readOnly
                                            className="asset-detail-calculated-input"
                                        />
                                    )}
                                </label>

                                {!isIndividualAsset && (
                                    <label>
                                        Quantity ({purchaseUsageUnit})

                                        <input
                                            type="number"
                                            min="1"
                                            max={currentStock}
                                            value={transferForm.quantity}
                                            onChange={(event) =>
                                                limitQuantityToCurrentStock(
                                                    event.target.value,
                                                    setTransferForm
                                                )
                                            }
                                            disabled={currentStock <= 0}
                                        />

                                        <small className="asset-detail-stock-hint">
                                            Available stock: {currentStock}
                                        </small>

                                    </label>
                                )}

                                {transferForm.transferType === "To Customer" &&
                                    transferForm.dealType === "Leased / Deposit" && (
                                        <label>
                                            Deposit Amount
                                            <input
                                                type="text"
                                                value={
                                                    transferForm.securityDepositPerDevice
                                                }
                                                onChange={(event) =>
                                                    setTransferForm((previous) => ({
                                                        ...previous,
                                                        securityDepositPerDevice: event.target.value,
                                                    }))
                                                }
                                            />
                                        </label>
                                    )}

                                {isIndividualAsset && (
                                    <div className="asset-waste-picker">
                                        <div className="asset-waste-tools">
                                            <label>
                                                Search Units
                                                <input
                                                    value={transferForm.transferSearch}
                                                    onChange={(event) =>
                                                        setTransferForm((previous) => ({
                                                            ...previous,
                                                            transferSearch: event.target.value,
                                                        }))
                                                    }
                                                    placeholder="Search model, MAC, or serial..."
                                                />
                                            </label>

                                            <label>
                                                Category
                                                <select
                                                    value={transferForm.transferCategory}
                                                    onChange={(event) =>
                                                        setTransferForm((previous) => ({
                                                            ...previous,
                                                            transferCategory: event.target.value,
                                                        }))
                                                    }
                                                >
                                                    {transferCategoryOptions.map((category) => (
                                                        <option
                                                            key={category}
                                                            value={category}
                                                        >
                                                            {category}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        </div>

                                        <div className="asset-waste-summary">
                                            <span>
                                                Selected: {selectedTransferIdentityRecords.length}
                                            </span>
                                            <strong>
                                                Available: {availableIdentityRecords.length}
                                            </strong>
                                        </div>

                                        <div className="asset-waste-unit-list">
                                            {filteredTransferIdentityRecords.map((record) => {
                                                const selected =
                                                    transferForm.selectedIdentityIds.includes(record.id);
                                                return (
                                                    <label
                                                        key={record.id}
                                                        className={
                                                            selected
                                                                ? "asset-waste-unit selected"
                                                                : "asset-waste-unit"
                                                        }
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={(event) =>
                                                                setTransferForm((previous) => ({
                                                                    ...previous,
                                                                    selectedIdentityIds:
                                                                        event.target.checked
                                                                            ? [
                                                                                ...previous.selectedIdentityIds,
                                                                                record.id,
                                                                            ]
                                                                            : previous.selectedIdentityIds.filter(
                                                                                (id) => id !== record.id
                                                                            ),
                                                                }))
                                                            }
                                                        />

                                                        <div>
                                                            <strong>
                                                                {record.serialNumber || "No Serial"}
                                                            </strong>
                                                            <span>
                                                                {record.model || "-"} / {record.macAddress || "-"}
                                                            </span>
                                                        </div>

                                                        <em>{record.category || asset.category || "-"}</em>
                                                    </label>
                                                );
                                            })}

                                            {filteredTransferIdentityRecords.length === 0 && (
                                                <div className="asset-waste-empty">
                                                    No individual unit was found.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <label>
                                    Transfer Date
                                    <input
                                        type="date"
                                        value={transferForm.transferDate}
                                        onChange={(event) =>
                                            setTransferForm((previous) => ({
                                                ...previous,
                                                transferDate: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    Responsible Person
                                    <input
                                        value={transferForm.responsiblePerson}
                                        onChange={(event) =>
                                            setTransferForm((previous) => ({
                                                ...previous,
                                                responsiblePerson: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    Transfer Status

                                    {transferForm.transferType === "To Repair" ? (
                                        <input
                                            value="In Repair"
                                            readOnly
                                            className="asset-detail-calculated-input"
                                        />
                                    ) : transferForm.transferType === "Mark as Lost" ? (
                                        <input
                                            value="Lost"
                                            readOnly
                                            className="asset-detail-calculated-input"
                                        />
                                    ) : (
                                        <select
                                            value={transferForm.transferStatus}
                                            onChange={(event) =>
                                                setTransferForm((previous) => ({
                                                    ...previous,
                                                    transferStatus: event.target.value,
                                                }))
                                            }
                                        >
                                            <option value="Completed">Completed</option>
                                            <option value="Pending">Pending</option>
                                            <option value="In Transit">In Transit</option>
                                        </select>
                                    )}
                                </label>

                                <label>
                                    Reference Number
                                    <div className="asset-detail-inline-action">
                                        <input
                                            value={transferForm.referenceNumber}
                                            onChange={(event) =>
                                                setTransferForm((previous) => ({
                                                    ...previous,
                                                    referenceNumber: event.target.value,
                                                }))
                                            }
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setTransferForm((previous) => ({
                                                    ...previous,
                                                    referenceNumber:
                                                        generateNextTransferReference(),
                                                }))
                                            }
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </label>

                                <label className="full">
                                    Notes
                                    <textarea
                                        value={transferForm.notes}
                                        onChange={(event) =>
                                            setTransferForm((previous) => ({
                                                ...previous,
                                                notes: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            </div>

                            <div className="asset-detail-modal-actions">
                                <button type="button" onClick={() => setModalType("")}>
                                    Cancel
                                </button>

                                <button
  type="submit"
  disabled={currentStock <= 0}
>
  Save Transfer
</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {viewMovement && (
                <div
                    className="asset-detail-modal-backdrop"
                >
                    <div
                        className="asset-detail-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="asset-detail-modal-header">
                            <div>
                                <h3>Movement Full Information</h3>
                                <p>
                                    {viewMovement.movementType || "-"} /{" "}
                                    {formatDateTime(
                                        viewMovement.date,
                                        viewMovement.createdAt ||
                                            viewMovement.updatedAt
                                    )}
                                </p>
                            </div>

                            <button type="button" onClick={() => setViewMovement(null)}>
                                ×
                            </button>
                        </div>

                        <div className="asset-movement-detail-grid">
                            <div><span>Type</span><strong>{viewMovement.movementType || "-"}</strong></div>
                            <div><span>Issued from</span><strong>{viewMovement.sourceName || "-"}</strong></div>
                            <div><span>Issued to</span><strong>{viewMovement.destinationName || "-"}</strong></div>
                            <div><span>Quantity</span><strong>{viewMovement.quantity || 0}</strong></div>
                            <div><span>Status</span><strong>{viewMovement.transferStatus || viewMovement.paymentStatus || "-"}</strong></div>
                            {viewMovement.transferType === "To Customer" && (
                                <>
                                    {viewMovement.dealType === "Leased / Deposit" ? (
                                        <>
                                            <div><span>Total Deposit</span><strong>{money(viewMovement.trustAmount || viewMovement.totalAmount || 0)} AFN</strong></div>
                                        </>
                                    ) : (
                                        null
                                    )}
                                </>
                            )}
                        </div>

                        {(viewMovement.identityRecords || []).length > 0 && (
                            <div className="asset-movement-units">
                                <h4>Included Units</h4>
                                {(viewMovement.identityRecords || []).map((record, index) => (
                                    <div key={record.id || index}>
                                        <div>
                                            <strong>{record.serialNumber || "No Serial"}</strong>
                                            <span>{record.model || "-"} / {record.macAddress || "-"}</span>
                                            <small>
                                                Category: {record.category || asset?.category || "-"}
                                            </small>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setViewMovementUnit(record)}
                                        >
                                            <Eye size={14} />
                                            Full Information
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewMovementUnit && (
                <div
                    className="asset-detail-modal-backdrop"
                >
                    <div
                        className="asset-detail-modal compact"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="asset-detail-modal-header">
                            <div>
                                <h3>Unit Full Information</h3>
                                <p>{viewMovementUnit.serialNumber || "No Serial"}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setViewMovementUnit(null)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="asset-movement-detail-grid">
                            <div><span>Model</span><strong>{viewMovementUnit.model || "-"}</strong></div>
                            <div><span>MAC Address</span><strong>{viewMovementUnit.macAddress || "-"}</strong></div>
                            <div><span>Serial Number</span><strong>{viewMovementUnit.serialNumber || "-"}</strong></div>
                            <div><span>Category</span><strong>{viewMovementUnit.category || asset?.category || "-"}</strong></div>
                            <div><span>Brand</span><strong>{asset?.brand || "-"}</strong></div>
                            <div><span>Location</span><strong>{asset?.location || "-"}</strong></div>
                            <div><span>Status</span><strong>{asset?.status || "-"}</strong></div>
                        </div>

                        {viewMovementUnit.image && (
                            <div className="asset-unit-image-preview">
                                <img src={viewMovementUnit.image} alt="Unit" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {deleteMovementRecord && (
                <div
                    className="asset-detail-modal-backdrop"
                >
                    <div
  className="asset-detail-modal asset-delete-movement-modal"
  onClick={(event) => event.stopPropagation()}
>
                        <div className="asset-detail-modal-header">
                            <div>
                                <h3>Delete Movement</h3>
                                <p>
                                    This action will remove the selected movement record.
                                </p>
                            </div>

                            <button
  type="button"
  className="asset-detail-modal-close"
  aria-label="Close delete modal"
  onClick={() => setDeleteMovementRecord(null)}
>
  ×
</button>
                        </div>

                        <div className="asset-delete-warning">
                            <strong>
                                Are you sure you want to delete this movement?
                            </strong>
                            <span>
                                {deleteMovementRecord.movementType || "-"} /{" "}
                                {formatDateTime(
                                    deleteMovementRecord.date,
                                    deleteMovementRecord.createdAt ||
                                        deleteMovementRecord.updatedAt
                                )}{" "}
                                / Quantity:{" "}
                                {deleteMovementRecord.quantity || 0}
                            </span>
                        </div>

                        <div className="asset-detail-modal-actions">
                            <button
                                type="button"
                                onClick={() => setDeleteMovementRecord(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="danger"
                                onClick={() =>
                                    deleteMovement(deleteMovementRecord.id)
                                }
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {repairResultMovement && (
                <div
                    className="asset-detail-modal-backdrop"
                >
                    <div
                        className="asset-detail-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="asset-detail-modal-header">
                            <div>
                                <h3>Repair Result</h3>
                                <p>
                                    Record whether the device was fixed and where it goes next.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setRepairResultMovement(null)}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={saveRepairResult}>
                            <div className="asset-detail-form-grid">
                                <label>
                                    Repair Status
                                    <select
                                        value={repairResultForm.repairStatus}
                                        onChange={(event) =>
                                            setRepairResultForm((previous) => ({
                                                ...previous,
                                                repairStatus: event.target.value,
                                                paidAmount:
                                                    event.target.value === "Not Fixed"
                                                        ? ""
                                                        : previous.paidAmount,
                                                nextDestination:
                                                    event.target.value === "Not Fixed"
                                                        ? "Damaged / Lost"
                                                        : previous.nextDestination === "Damaged / Lost"
                                                            ? "Main Stock"
                                                            : previous.nextDestination,
                                                destinationRecordId: "",
                                                destinationName: "",
                                            }))
                                        }
                                    >
                                        <option value="Fixed">Fixed</option>
                                        <option value="Not Fixed">Not Fixed</option>
                                    </select>
                                </label>

                                <label>
                                    Repair Supplier
                                    <select
                                        value={repairResultForm.supplierRecordId}
                                        onChange={(event) => {
                                            const supplier = repairSupplierOptions.find(
                                                (item, index) =>
                                                    getSupplierOptionKey(item, index) ===
                                                    event.target.value
                                            );

                                            setRepairResultForm((previous) => ({
                                                ...previous,
                                                supplierRecordId: event.target.value,
                                                supplierName:
                                                    supplier?.supplierName ||
                                                    supplier?.companyName ||
                                                    "",
                                            }));
                                        }}
                                    >
                                        <option value="">Select Supplier</option>
                                        {repairSupplierOptions.map((supplier, index) => (
                                            <option
                                                key={getSupplierOptionKey(supplier, index)}
                                                value={getSupplierOptionKey(supplier, index)}
                                            >
                                                {supplier.supplierName ||
                                                    supplier.companyName ||
                                                    "Unnamed Supplier"}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Repair Cost
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={repairResultForm.repairCost}
                                        onChange={(event) =>
                                            setRepairResultForm((previous) => ({
                                                ...previous,
                                                repairCost: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    Paid Amount
                                    <input
                                        type="number"
                                        min="0"
                                        max={Number(repairResultForm.repairCost || 0)}
                                        step="any"
                                        value={repairResultForm.paidAmount}
                                        onChange={(event) =>
                                            setRepairResultForm((previous) => ({
                                                ...previous,
                                                paidAmount: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    Remaining Amount
                                    <input
                                        value={`${money(
                                            Math.max(
                                                Number(repairResultForm.repairCost || 0) -
                                                    Number(repairResultForm.paidAmount || 0),
                                                0
                                            )
                                        )} AFN`}
                                        readOnly
                                        className="asset-detail-calculated-input"
                                    />
                                </label>

                                <label>
                                    Result Date
                                    <input
                                        type="date"
                                        value={repairResultForm.repairDate}
                                        onChange={(event) =>
                                            setRepairResultForm((previous) => ({
                                                ...previous,
                                                repairDate: event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                {repairResultForm.repairStatus !== "Not Fixed" && (
                                    <label>
                                        Send To
                                        <select
                                            value={repairResultForm.nextDestination}
                                            onChange={(event) =>
                                                setRepairResultForm((previous) => ({
                                                    ...previous,
                                                    nextDestination: event.target.value,
                                                    destinationRecordId: "",
                                                    destinationName: "",
                                                }))
                                            }
                                        >
                                            <option value="Main Stock">Main Stock</option>
                                            <option value="Tower">Tower</option>
                                            <option value="Customer">Customer</option>
                                        </select>
                                    </label>
                                )}

                                {repairResultForm.repairStatus !== "Not Fixed" &&
                                    repairResultForm.nextDestination === "Tower" && (
                                        <label>
                                            Destination Tower
                                            <select
                                                value={repairResultForm.destinationRecordId}
                                                onChange={(event) => {
                                                    const tower = towerAssets.find(
                                                        (item) =>
                                                            String(item.id || "") ===
                                                            String(event.target.value || "")
                                                    );

                                                    setRepairResultForm((previous) => ({
                                                        ...previous,
                                                        destinationRecordId: event.target.value,
                                                        destinationName: tower?.towerName || "",
                                                    }));
                                                }}
                                            >
                                                <option value="">Select Tower</option>
                                                {towerAssets.map((tower) => (
                                                    <option key={tower.id} value={tower.id}>
                                                        {tower.towerName || "Unnamed Tower"}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )}

                                {repairResultForm.repairStatus !== "Not Fixed" &&
                                    repairResultForm.nextDestination === "Customer" && (
                                        <label>
                                            Destination Customer
                                            <select
                                                value={repairResultForm.destinationRecordId}
                                                onChange={(event) => {
                                                    const customer = customers.find(
                                                        (item) =>
                                                            String(item.id || "") ===
                                                            String(event.target.value || "")
                                                    );

                                                    setRepairResultForm((previous) => ({
                                                        ...previous,
                                                        destinationRecordId: event.target.value,
                                                        destinationName: customer
                                                            ? getCustomerName(customer)
                                                            : "",
                                                    }));
                                                }}
                                            >
                                                <option value="">Select Customer</option>
                                                {customers.map((customer) => (
                                                    <option key={customer.id} value={customer.id}>
                                                        {customer.customerId
                                                            ? `${customer.customerId} - ${getCustomerName(customer)}`
                                                            : getCustomerName(customer)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )}

                                {repairResultForm.repairStatus !== "Not Fixed" && (
                                    <label>
                                        Remaining Amount
                                        <input
                                            value={`${money(
                                                Math.max(
                                                    Number(repairResultForm.repairCost || 0) -
                                                    Number(repairResultForm.paidAmount || 0),
                                                    0
                                                )
                                            )} AFN`}
                                            readOnly
                                            className="asset-detail-calculated-input"
                                        />
                                    </label>
                                )}

                                <label className="full">
                                    Notes
                                    <textarea
                                        value={repairResultForm.notes}
                                        onChange={(event) =>
                                            setRepairResultForm((previous) => ({
                                                ...previous,
                                                notes: event.target.value,
                                            }))
                                        }
                                        placeholder="Repair result notes..."
                                    />
                                </label>
                            </div>

                            <div className="asset-detail-modal-actions">
                                <button
                                    type="button"
                                    onClick={() => setRepairResultMovement(null)}
                                >
                                    Cancel
                                </button>

                                <button type="submit">Save Repair Result</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editMovement && (
                <div
                    className="asset-detail-modal-backdrop"
                >
                    <div
  className="asset-detail-modal asset-edit-movement-modal"
  onClick={(event) => event.stopPropagation()}
>
                        <div className="asset-detail-modal-header">
                            <div>
                                <h3>Edit Movement</h3>
                                <p>Update movement date, status, person, and notes.</p>
                            </div>

                            <button type="button" onClick={() => setEditMovement(null)}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={saveEditedMovement}>
    {editMovement?.movementType === "Purchase" ? (
        <div className="asset-purchase-edit-content">
            <div className="asset-detail-form-grid">
                <label>
                    Reference Number
                    <input
                        value={
                            editMovementForm.purchaseCode || ""
                        }
                        readOnly
                    />
                </label>

                <label>
                    Supplier
                    <select
                        value={
                            editMovementForm.supplierRecordId ||
                            ""
                        }
                        onChange={(event) => {
                            const selectedSupplier =
                                suppliers.find(
                                    (supplier, index) =>
                                        getSupplierOptionKey(
                                            supplier,
                                            index
                                        ) === event.target.value
                                );

                            setEditMovementForm(
                                (previous) => ({
                                    ...previous,
                                    supplierRecordId:
                                        event.target.value,
                                    supplierName:
                                        selectedSupplier
                                            ?.supplierName ||
                                        selectedSupplier
                                            ?.companyName ||
                                        "",
                                    sourceName:
                                        selectedSupplier
                                            ?.supplierName ||
                                        selectedSupplier
                                            ?.companyName ||
                                        "",
                                })
                            );
                        }}
                    >
                        <option value="">
                            Select Supplier
                        </option>

                        {suppliers.map(
                            (supplier, index) => {
                                const supplierKey =
                                    getSupplierOptionKey(
                                        supplier,
                                        index
                                    );

                                return (
                                    <option
                                        key={supplierKey}
                                        value={supplierKey}
                                    >
                                        {supplier.supplierName ||
                                            supplier.companyName ||
                                            "Unnamed Supplier"}
                                    </option>
                                );
                            }
                        )}
                    </select>
                </label>

                <label>
                    Purchase Date
                    <input
                        type="date"
                        value={
                            editMovementForm.purchaseDate ||
                            ""
                        }
                        onChange={(event) =>
                            setEditMovementForm(
                                (previous) => ({
                                    ...previous,
                                    purchaseDate:
                                        event.target.value,
                                    date: event.target.value,
                                })
                            )
                        }
                    />
                </label>

                <label>
                    Quantity ({purchaseUsageUnit})
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                            editMovementForm.quantity || ""
                        }
                        readOnly={isIndividualAsset}
                        onChange={(event) => {
                            const value = event.target.value;

                            if (isIndividualAsset) return;

                            setEditMovementForm((previous) => {
                                const nextTotalAmount =
                                    Number(value || 0) *
                                    Number(previous.unitPrice || 0);
                                const currentPaidAmount = Number(
                                    previous.paidAmount || 0
                                );

                                return {
                                    ...previous,
                                    quantity: value,
                                    paidAmount:
                                        currentPaidAmount > nextTotalAmount
                                            ? String(nextTotalAmount)
                                            : previous.paidAmount,
                                };
                            });
                        }}
                    />
                </label>

                <label>
                    Purchase Price
                    <input
                        type="number"
                        min="0"
                        step="any"
                        value={
                            editMovementForm.unitPrice || ""
                        }
                        onChange={(event) => {
                            const nextUnitPrice = event.target.value;
                            const nextTotalAmount =
                                Number(editMovementForm.quantity || 0) *
                                Number(nextUnitPrice || 0);
                            const currentPaidAmount = Number(
                                editMovementForm.paidAmount || 0
                            );

                            setEditMovementForm((previous) => ({
                                ...previous,
                                unitPrice: nextUnitPrice,
                                paidAmount:
                                    currentPaidAmount > nextTotalAmount
                                        ? String(nextTotalAmount)
                                        : previous.paidAmount,
                            }));
                        }}
                    />
                </label>

                <label>
                    Total Amount
                    <input
                        value={money(
                            Number(
                                editMovementForm.quantity || 0
                            ) *
                                Number(
                                    editMovementForm.unitPrice ||
                                        0
                                )
                        )}
                        readOnly
                    />
                </label>

                <label>
                    Paid Amount
                    <input
                        type="number"
                        min="0"
                        step="any"
                        max={
                            Number(editMovementForm.quantity || 0) *
                            Number(editMovementForm.unitPrice || 0)
                        }
                        value={
                            editMovementForm.paidAmount || ""
                        }
                        onChange={(event) => {
                            const value = event.target.value;

                            if (value === "") {
                                setEditMovementForm((previous) => ({
                                    ...previous,
                                    paidAmount: "",
                                }));
                                return;
                            }

                            const paidAmount = Number(value);
                            const totalAmount =
                                Number(editMovementForm.quantity || 0) *
                                Number(editMovementForm.unitPrice || 0);

                            if (!Number.isFinite(paidAmount) || paidAmount < 0) {
                                return;
                            }

                            if (paidAmount > totalAmount) {
                                notify(
                                    `Paid amount cannot be greater than total amount (${money(totalAmount)} AFN).`,
                                    "error"
                                );
                                setEditMovementForm((previous) => ({
                                    ...previous,
                                    paidAmount: String(totalAmount),
                                }));
                                return;
                            }

                            setEditMovementForm((previous) => ({
                                ...previous,
                                paidAmount: value,
                            }));
                        }}
                    />
                </label>

                <label>
                    Remaining Amount
                    <input
                        value={money(
                            Math.max(
                                Number(
                                    editMovementForm.quantity ||
                                        0
                                ) *
                                    Number(
                                        editMovementForm.unitPrice ||
                                            0
                                    ) -
                                    Number(
                                        editMovementForm.paidAmount ||
                                            0
                                    ),
                                0
                            )
                        )}
                        readOnly
                    />
                </label>

                <label>
                    Invoice Number
                    <input
                        value={
                            editMovementForm.billNumber || ""
                        }
                        onChange={(event) =>
                            setEditMovementForm(
                                (previous) => ({
                                    ...previous,
                                    billNumber:
                                        event.target.value,
                                })
                            )
                        }
                    />
                </label>

                <label>
                    Purchased By
                    <input
                        value={
                            editMovementForm.purchasedBy || ""
                        }
                        onChange={(event) =>
                            setEditMovementForm(
                                (previous) => ({
                                    ...previous,
                                    purchasedBy:
                                        event.target.value,
                                    responsiblePerson:
                                        event.target.value,
                                })
                            )
                        }
                    />
                </label>

                <label className="asset-detail-form-full">
                    Bill Image
                    <input
                        type="file"
                        accept="image/*"
                        onChange={
                            handleEditPurchaseBillImageChange
                        }
                    />

                    {editMovementForm.billImage && (
                        <div className="asset-edit-image-preview">
                            <img
                                src={
                                    editMovementForm.billImage
                                }
                                alt="Purchase bill"
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    setEditMovementForm(
                                        (previous) => ({
                                            ...previous,
                                            billImage: "",
                                        })
                                    )
                                }
                            >
                                Remove Image
                            </button>
                        </div>
                    )}
                </label>
            </div>

            {isIndividualAsset && (
                <div className="asset-edit-individual-records">
                    <div className="asset-edit-unit-section-header">
                        <div>
                            <h4>Individual Devices</h4>
                            <p>
                                Edit Model, MAC Address,
                                Serial Number and Image for
                                every purchased device.
                            </p>
                        </div>

                        <span>
                            {
                                (
                                    editMovementForm.identityRecords ||
                                    []
                                ).length
                            }{" "}
                            selected
                        </span>
                    </div>

                    {(editMovementForm.identityRecords || []).map(
                        (record, index) => (
                            <article
                                className="asset-purchase-identity-card"
                                key={record.id}
                            >
                                <div className="asset-purchase-identity-card-header">
                                    <strong>
                                        Device {index + 1}
                                    </strong>

                                    <span>Selected</span>
                                </div>

                                <div className="asset-detail-form-grid">
                                    <label>
                                        Model
                                        <input
                                            value={
                                                record.model || ""
                                            }
                                            onChange={(event) =>
                                                updateEditPurchaseIdentityRecord(
                                                    index,
                                                    "model",
                                                    event.target
                                                        .value
                                                )
                                            }
                                        />
                                    </label>

                                    <label>
                                        MAC Address
                                        <input
                                            value={
                                                record.macAddress ||
                                                ""
                                            }
                                            onChange={(event) =>
                                                updateEditPurchaseIdentityRecord(
                                                    index,
                                                    "macAddress",
                                                    event.target
                                                        .value
                                                )
                                            }
                                        />
                                    </label>

                                    <label>
                                        Serial Number
                                        <input
                                            value={
                                                record.serialNumber ||
                                                ""
                                            }
                                            onChange={(event) =>
                                                updateEditPurchaseIdentityRecord(
                                                    index,
                                                    "serialNumber",
                                                    event.target
                                                        .value
                                                )
                                            }
                                        />
                                    </label>

                                    <label>
                                        Image
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(event) =>
                                                handleEditPurchaseRecordImageChange(
                                                    index,
                                                    event
                                                )
                                            }
                                        />
                                    </label>
                                </div>

                                {record.image && (
                                    <div className="asset-edit-image-preview">
                                        <img
                                            src={record.image}
                                            alt={`Device ${
                                                index + 1
                                            }`}
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateEditPurchaseIdentityRecord(
                                                    index,
                                                    "image",
                                                    ""
                                                )
                                            }
                                        >
                                            Remove Image
                                        </button>
                                    </div>
                                )}
                            </article>
                        )
                    )}
                </div>
            )}

            <label className="asset-detail-form-full">
                Notes
                <textarea
                    rows="4"
                    value={editMovementForm.notes || ""}
                    onChange={(event) =>
                        setEditMovementForm((previous) => ({
                            ...previous,
                            notes: event.target.value,
                        }))
                    }
                />
            </label>
        </div>
    ) : editMovement?.movementType === "Balance" ? (
        <div className="asset-purchase-edit-content">
            <div className="asset-detail-form-grid">
                <label>
                    Balance Date
                    <input
                        type="date"
                        value={editMovementForm.date || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                date: event.target.value,
                            }))
                        }
                    />
                </label>

                <label>
                    Quantity ({purchaseUsageUnit})
                    <input
                        type="number"
                        min="1"
                        step={isIndividualAsset ? "1" : "any"}
                        value={editMovementForm.quantity || ""}
                        onChange={(event) => {
                            const value = event.target.value;

                            setEditMovementForm((previous) => ({
                                ...previous,
                                quantity: value,
                                identityRecords: isIndividualAsset
                                    ? syncIdentityRecords(
                                          value,
                                          previous.identityRecords || []
                                      )
                                    : previous.identityRecords || [],
                            }));
                        }}
                    />
                </label>

                <label>
                    Total Amount
                    <input
                        value={`${money(
                            Number(editMovementForm.quantity || 0) *
                                Number(editMovementForm.unitPrice || 0)
                        )} AFN`}
                        readOnly
                    />
                </label>

                <label>
                    Status
                    <input
                        value={editMovementForm.status || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                status: event.target.value,
                            }))
                        }
                    />
                </label>

                <label>
                    Responsible Person
                    <input
                        value={editMovementForm.responsiblePerson || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                responsiblePerson: event.target.value,
                            }))
                        }
                    />
                </label>
            </div>

            {isIndividualAsset && (
                <div className="asset-edit-individual-records">
                    <div className="asset-edit-unit-section-header">
                        <div>
                            <h4>Individual Unit Records</h4>
                            <p>
                                Edit Model, MAC Address, Serial Number and Image for every balance unit.
                            </p>
                        </div>

                        <span>
                            {(editMovementForm.identityRecords || []).length} record(s)
                        </span>
                    </div>

                    {(editMovementForm.identityRecords || []).map((record, index) => (
                        <article className="asset-purchase-identity-card" key={record.id}>
                            <div className="asset-purchase-identity-card-header">
                                <strong>Record {index + 1}</strong>
                                <span>Balance</span>
                            </div>

                            <div className="asset-detail-form-grid">
                                <label>
                                    Model
                                    <input
                                        value={record.model || ""}
                                        onChange={(event) =>
                                            updateEditPurchaseIdentityRecord(
                                                index,
                                                "model",
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    MAC Address
                                    <input
                                        value={record.macAddress || ""}
                                        onChange={(event) =>
                                            updateEditPurchaseIdentityRecord(
                                                index,
                                                "macAddress",
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Serial Number
                                    <input
                                        value={record.serialNumber || ""}
                                        onChange={(event) =>
                                            updateEditPurchaseIdentityRecord(
                                                index,
                                                "serialNumber",
                                                event.target.value
                                            )
                                        }
                                    />
                                </label>

                                <label>
                                    Image
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) =>
                                            handleEditPurchaseRecordImageChange(index, event)
                                        }
                                    />
                                </label>
                            </div>

                            {record.image && (
                                <div className="asset-edit-image-preview">
                                    <img src={record.image} alt={`Record ${index + 1}`} />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateEditPurchaseIdentityRecord(index, "image", "")
                                        }
                                    >
                                        Remove Image
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            <label className="asset-detail-form-full">
                Notes
                <textarea
                    rows="4"
                    value={editMovementForm.notes || ""}
                    onChange={(event) =>
                        setEditMovementForm((previous) => ({
                            ...previous,
                            notes: event.target.value,
                        }))
                    }
                />
            </label>
        </div>
    ) : editMovement?.movementType === "Waste" ? (
        <div className="asset-purchase-edit-content">
            <div className="asset-detail-form-grid">
                <label>
                    Waste Date
                    <input
                        type="date"
                        value={editMovementForm.date || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                date: event.target.value,
                            }))
                        }
                    />
                </label>

                {!isIndividualAsset && (
                    <label>
                        Quantity ({purchaseUsageUnit})
                        <input
                            type="number"
                            min="1"
                            max={editWasteMaxQuantity}
                            value={editMovementForm.quantity || ""}
                            onChange={(event) => {
                                const quantity = Math.min(
                                    Math.max(Number(event.target.value || 1), 1),
                                    Math.max(editWasteMaxQuantity, 1)
                                );
                                const lossAmount =
                                    quantity * Number(asset?.unitPrice || 0);

                                setEditMovementForm((previous) => ({
                                    ...previous,
                                    quantity: String(quantity),
                                    estimatedLoss: String(lossAmount),
                                    totalAmount: String(lossAmount),
                                }));
                            }}
                        />
                        <small className="asset-detail-stock-hint">
                            Available stock: {editWasteMaxQuantity}
                        </small>
                    </label>
                )}

                {isIndividualAsset && (
                    <div className="asset-waste-picker asset-detail-form-full">
                        <div className="asset-waste-tools">
                            <label>
                                Search Units
                                <input
                                    value={editMovementForm.transferSearch || ""}
                                    onChange={(event) =>
                                        setEditMovementForm((previous) => ({
                                            ...previous,
                                            transferSearch: event.target.value,
                                        }))
                                    }
                                    placeholder="Search model, MAC, or serial..."
                                />
                            </label>

                            <label>
                                Category
                                <select
                                    value={editMovementForm.transferCategory || "All"}
                                    onChange={(event) =>
                                        setEditMovementForm((previous) => ({
                                            ...previous,
                                            transferCategory: event.target.value,
                                        }))
                                    }
                                >
                                    {editMovementCategoryOptions.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="asset-waste-summary">
                            <span>
                                Selected: {selectedEditMovementRecords.length}
                            </span>
                            <strong>
                                Loss: {money(editWasteLossAmount)} AFN
                            </strong>
                        </div>

                        <div className="asset-waste-unit-list">
                            {filteredEditMovementUnitOptions.map((record) => {
                                const selected = (
                                    editMovementForm.selectedIdentityIds || []
                                ).includes(record.id);
                                const unitValue = Number(
                                    record.unitPrice || asset?.unitPrice || 0
                                );

                                return (
                                    <label
                                        key={record.id}
                                        className={
                                            selected
                                                ? "asset-waste-unit selected"
                                                : "asset-waste-unit"
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={(event) =>
                                                setEditMovementForm((previous) => ({
                                                    ...previous,
                                                    selectedIdentityIds:
                                                        event.target.checked
                                                            ? [
                                                                  ...(previous.selectedIdentityIds ||
                                                                      []),
                                                                  record.id,
                                                              ]
                                                            : (
                                                                  previous.selectedIdentityIds ||
                                                                  []
                                                              ).filter(
                                                                  (id) => id !== record.id
                                                              ),
                                                }))
                                            }
                                        />

                                        <div>
                                            <strong>
                                                {record.serialNumber || "No Serial"}
                                            </strong>
                                            <span>
                                                {record.model || "-"} /{" "}
                                                {record.macAddress || "-"}
                                            </span>
                                        </div>

                                        <em>{record.category || asset?.category || "-"}</em>
                                        <b>{money(unitValue)} AFN</b>
                                    </label>
                                );
                            })}

                            {filteredEditMovementUnitOptions.length === 0 && (
                                <div className="asset-waste-empty">
                                    No individual unit was found.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <label>
                    Waste Reason
                    <select
                        value={editMovementForm.wasteReason || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                wasteReason: event.target.value,
                                transferType: event.target.value,
                            }))
                        }
                    >
                        <option value="">Select Reason</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Lost">Lost</option>
                        <option value="Expired">Expired</option>
                        <option value="Disposed">Disposed</option>
                    </select>
                </label>

                <label>
                    Loss Amount
                    <input
                        value={`${money(editWasteLossAmount)} AFN`}
                        readOnly
                        className="asset-detail-calculated-input"
                    />
                </label>

                <label>
                    Responsible Person
                    <input
                        value={editMovementForm.responsiblePerson || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                responsiblePerson: event.target.value,
                            }))
                        }
                    />
                </label>

                <label className="asset-detail-form-full">
                    Notes
                    <textarea
                        rows="4"
                        value={editMovementForm.notes || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                notes: event.target.value,
                            }))
                        }
                    />
                </label>
            </div>
        </div>
    ) : editMovement?.movementType === "Transfer" ? (
        <div className="asset-purchase-edit-content">
            <div className="asset-detail-form-grid">
                <label>
                    Transfer Type
                    <select
                        value={editMovementForm.transferType || ""}
                        onChange={(event) => {
                            const value = event.target.value;

                            setEditMovementForm((previous) => ({
                                ...previous,
                                transferType: value,
                                destinationRecordId: "",
                                destinationName:
                                    value === "To Repair"
                                        ? "Repair / Maintenance"
                                        : value === "Mark as Lost"
                                            ? "Lost"
                                            : "",
                                destinationType:
                                    value === "To Customer"
                                        ? "Customer"
                                        : value === "To Tower"
                                            ? "Tower"
                                            : value === "To Repair"
                                                ? "Repair"
                                                : "Lost",
                                status:
                                    value === "To Repair"
                                        ? "In Repair"
                                        : value === "Mark as Lost"
                                            ? "Lost"
                                            : "Completed",
                                dealType:
                                    value === "To Customer"
                                        ? previous.dealType || "Leased / Deposit"
                                        : "",
                            }));
                        }}
                    >
                        <option value="To Tower">To Tower</option>
                        <option value="To Customer">To Customer</option>
                        <option value="To Repair">To Repair / Maintenance</option>
                    </select>
                </label>

                <label>
                    Current Location
                    <input
                        value={editMovementForm.sourceName || "Main Stock"}
                        readOnly
                        className="asset-detail-calculated-input"
                    />
                </label>

                <label>
                    Destination
                    {editMovementForm.transferType === "To Customer" ? (
                        <select
                            value={editMovementForm.destinationRecordId || ""}
                            onChange={(event) => {
                                const selectedCustomer = customers.find(
                                    (customer) =>
                                        String(customer.id) ===
                                        String(event.target.value)
                                );

                                setEditMovementForm((previous) => ({
                                    ...previous,
                                    destinationType: "Customer",
                                    destinationRecordId: event.target.value,
                                    destinationName: selectedCustomer
                                        ? getCustomerName(selectedCustomer)
                                        : "",
                                }));
                            }}
                        >
                            <option value="">Select Customer</option>
                            {customers.map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.customerId || "No Customer ID"} -{" "}
                                    {getCustomerName(customer)}
                                </option>
                            ))}
                        </select>
                    ) : editMovementForm.transferType === "To Tower" ? (
                        <select
                            value={editMovementForm.destinationRecordId || ""}
                            onChange={(event) => {
                                const selectedTower = towerAssets.find(
                                    (tower) =>
                                        String(tower.id) ===
                                        String(event.target.value)
                                );

                                setEditMovementForm((previous) => ({
                                    ...previous,
                                    destinationType: "Tower",
                                    destinationRecordId: event.target.value,
                                    destinationName: selectedTower
                                        ? `${selectedTower.towerName || "Unnamed Tower"}${selectedTower.towerLocation ? ` - ${selectedTower.towerLocation}` : ""}`
                                        : "",
                                }));
                            }}
                        >
                            <option value="">Select Tower</option>
                            {towerAssets.map((tower) => (
                                <option key={tower.id} value={tower.id}>
                                    {tower.towerName || "Unnamed Tower"}
                                    {tower.towerLocation
                                        ? ` - ${tower.towerLocation}`
                                        : ""}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            value={
                                editMovementForm.transferType === "To Repair"
                                    ? "Repair / Maintenance"
                                    : "Lost"
                            }
                            readOnly
                            className="asset-detail-calculated-input"
                        />
                    )}
                </label>

                {!isIndividualAsset && (
                    <label>
                        Quantity ({purchaseUsageUnit})
                        <input
                            type="number"
                            min="1"
                            value={editMovementForm.quantity || ""}
                            onChange={(event) =>
                                setEditMovementForm((previous) => ({
                                    ...previous,
                                    quantity: event.target.value,
                                }))
                            }
                        />
                    </label>
                )}

                {editMovementForm.transferType === "To Customer" && (
                    <label>
                        Deposit Amount
                        <input
                            type="text"
                            value={
                                editMovementForm.securityDepositPerDevice ||
                                editMovementForm.trustAmount ||
                                ""
                            }
                            onChange={(event) =>
                                setEditMovementForm((previous) => ({
                                    ...previous,
                                    dealType: "Leased / Deposit",
                                    securityDepositPerDevice: event.target.value,
                                    trustAmount: event.target.value,
                                    paidAmount: "",
                                    remainingAmount: "",
                                }))
                            }
                        />
                    </label>
                )}

                {isIndividualAsset && (
                    <div className="asset-waste-picker">
                        <div className="asset-waste-tools">
                            <label>
                                Search Units
                                <input
                                    value={
                                        editMovementForm.transferSearch || ""
                                    }
                                    onChange={(event) =>
                                        setEditMovementForm((previous) => ({
                                            ...previous,
                                            transferSearch: event.target.value,
                                        }))
                                    }
                                    placeholder="Search model, MAC, or serial..."
                                />
                            </label>

                            <label>
                                Category
                                <select
                                    value={
                                        editMovementForm.transferCategory ||
                                        "All"
                                    }
                                    onChange={(event) =>
                                        setEditMovementForm((previous) => ({
                                            ...previous,
                                            transferCategory:
                                                event.target.value,
                                        }))
                                    }
                                >
                                    {editMovementCategoryOptions.map(
                                        (category) => (
                                            <option
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>
                        </div>

                        <div className="asset-waste-summary">
                            <span>
                                Selected:{" "}
                                {selectedEditMovementRecords.length}
                            </span>
                            <strong>
                                Available: {editMovementUnitOptions.length}
                            </strong>
                        </div>

                        <div className="asset-waste-unit-list">
                            {filteredEditMovementUnitOptions.map((record) => {
                                const selected = (
                                    editMovementForm.selectedIdentityIds || []
                                ).includes(record.id);
                                return (
                                    <label
                                        key={record.id}
                                        className={
                                            selected
                                                ? "asset-waste-unit selected"
                                                : "asset-waste-unit"
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={(event) =>
                                                setEditMovementForm(
                                                    (previous) => ({
                                                        ...previous,
                                                        selectedIdentityIds:
                                                            event.target.checked
                                                                ? [
                                                                      ...(previous.selectedIdentityIds ||
                                                                          []),
                                                                      record.id,
                                                                  ]
                                                                : (
                                                                      previous.selectedIdentityIds ||
                                                                      []
                                                                  ).filter(
                                                                      (id) =>
                                                                          id !==
                                                                          record.id
                                                                  ),
                                                    })
                                                )
                                            }
                                        />

                                        <div>
                                            <strong>
                                                {record.serialNumber ||
                                                    "No Serial"}
                                            </strong>
                                            <span>
                                                {record.model || "-"} /{" "}
                                                {record.macAddress || "-"}
                                            </span>
                                        </div>

                                        <em>
                                            {record.category ||
                                                asset?.category ||
                                                "-"}
                                        </em>

                                    </label>
                                );
                            })}

                            {filteredEditMovementUnitOptions.length === 0 && (
                                <div className="asset-waste-empty">
                                    No individual unit was found.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <label>
                    Transfer Date
                    <input
                        type="date"
                        value={editMovementForm.date || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                date: event.target.value,
                            }))
                        }
                    />
                </label>

                <label>
                    Responsible Person
                    <input
                        value={editMovementForm.responsiblePerson || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                responsiblePerson: event.target.value,
                            }))
                        }
                    />
                </label>

                <label>
                    Transfer Status
                    <select
                        value={editMovementForm.status || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                status: event.target.value,
                            }))
                        }
                    >
                        <option value="Completed">Completed</option>
                        <option value="Pending">Pending</option>
                        <option value="In Repair">In Repair</option>
                        <option value="Repair Completed">
                            Repair Completed
                        </option>
                        <option value="Lost">Lost</option>
                    </select>
                </label>

                <label>
                    Reference Number
                    <input
                        value={editMovementForm.referenceNumber || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                referenceNumber: event.target.value,
                            }))
                        }
                    />
                </label>

                <label className="asset-detail-form-full">
                    Notes
                    <textarea
                        rows="4"
                        value={editMovementForm.notes || ""}
                        onChange={(event) =>
                            setEditMovementForm((previous) => ({
                                ...previous,
                                notes: event.target.value,
                            }))
                        }
                    />
                </label>
            </div>
        </div>
    ) : (
        <div className="asset-detail-form-grid">
            <label>
                Date
                <input
                    type="date"
                    value={editMovementForm.date || ""}
                    onChange={(event) =>
                        setEditMovementForm((previous) => ({
                            ...previous,
                            date: event.target.value,
                        }))
                    }
                />
            </label>

            <label>
                Status
                <input
                    value={editMovementForm.status || ""}
                    onChange={(event) =>
                        setEditMovementForm((previous) => ({
                            ...previous,
                            status: event.target.value,
                        }))
                    }
                />
            </label>

            <label>
                Responsible Person
                <input
                    value={editMovementForm.responsiblePerson || ""}
                    onChange={(event) =>
                        setEditMovementForm((previous) => ({
                            ...previous,
                            responsiblePerson: event.target.value,
                        }))
                    }
                />
            </label>

            <label className="asset-detail-form-full">
                Notes
                <textarea
                    rows="4"
                    value={editMovementForm.notes || ""}
                    onChange={(event) =>
                        setEditMovementForm((previous) => ({
                            ...previous,
                            notes: event.target.value,
                        }))
                    }
                />
            </label>
        </div>
    )}

    <div className="asset-detail-modal-actions">
        <button
            type="button"
            className="secondary"
            onClick={() => setEditMovement(null)}
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
        </div>
    );
}

export default AssetFullInformation;
