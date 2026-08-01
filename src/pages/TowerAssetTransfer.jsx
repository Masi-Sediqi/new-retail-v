import { Link, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { formatDateTime } from "../utils/afghanDate";
import "./TowerAssetTransfer.css";

function createEmptyForm(towerId = "") {
  return {
    transferType: "Tower to Tower",
    sourceTowerId: "",
    destinationTowerId: towerId,
    transferDate: new Date().toISOString().slice(0, 10),
    transferStatus: "Completed",
    responsiblePerson: "",
    notes: "",

    repairType: "Repair",
    repairProblem: "",
    repairCenter: "",
    repairTechnician: "",
    repairCost: "",
    repairSentDate: new Date().toISOString().slice(0, 10),
    expectedReturnDate: "",
    repairStatus: "Sent for Repair",

    damageLostType: "Damaged",
damageLostReason: "",
damageLostDate: new Date().toISOString().slice(0, 10),
damageLostReportedBy: "",
damageLostStatus: "Closed",
  };
}

function DetailIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function EditIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function TowerAssetTransfer() {
  const { towerId } = useParams();
  const navigate = useNavigate();

  const [towerAssets, setTowerAssets, , towerAssetsLoaded] =
    useJsonCollection("towerAssets");

  const [assets, setAssets, , assetsLoaded] =
    useJsonCollection("assets");

  const [towerTransfers, setTowerTransfers, , transfersLoaded] =
    useJsonCollection("towerAssetTransfers");

  const [assetMovements, setAssetMovements, , movementsLoaded] =
    useJsonCollection("assetMovements");

  const [formData, setFormData] = useState(() =>
    createEmptyForm(towerId)
  );

  const [selectedAssetKeys, setSelectedAssetKeys] = useState([]);
  const [search, setSearch] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [viewAsset, setViewAsset] = useState(null);

  const [openTransferActionId, setOpenTransferActionId] = useState(null);
  const [transferActionPosition, setTransferActionPosition] = useState({
  top: 0,
  left: 0,
});
const [viewTransfer, setViewTransfer] = useState(null);
const [editTransfer, setEditTransfer] = useState(null);
const [deleteTransfer, setDeleteTransfer] = useState(null);

const [editTransferForm, setEditTransferForm] = useState({
  transferType: "",
  destinationTowerId: "",
  quantity: "",
  transferDate: "",
  transferStatus: "",
  responsiblePerson: "",
  notes: "",
  repairType: "",
  repairProblem: "",
  repairCenter: "",
  repairTechnician: "",
  repairCost: "",
  repairSentDate: "",
  expectedReturnDate: "",
  repairStatus: "",

  damageLostType: "Damaged",
damageLostReason: "",
damageLostDate: "",
damageLostReportedBy: "",
damageLostStatus: "",
});

  const currentTower = towerAssets.find(
    (tower) => String(tower.id) === String(towerId)
  );

  const getAssetKey = (asset) =>
    String(
      asset?.selectionKey ||
      asset?.unitRecordId ||
      asset?.id ||
      asset?.assetId ||
      asset?.serialNumber ||
      asset?.macAddress ||
      ""
    );

  const getParentAssetId = (asset) =>
    String(asset?.assetRecordId || asset?.parentAssetId || asset?.id || "");

  const isIndividualAsset = (asset) =>
    String(asset?.identityTracking || "")
      .toLowerCase()
      .includes("individual") ||
    (asset?.identityRecords || []).length > 0;

  const buildUnitOption = (asset, record, index, sourceLabel = "") => ({
    ...asset,
    ...record,
    id: asset.id || asset.assetRecordId || "",
    parentAssetId: asset.assetRecordId || asset.parentAssetId || asset.id || "",
    assetRecordId: asset.assetRecordId || asset.parentAssetId || asset.id || "",
    assetId: asset.assetId || "",
    deviceName: asset.deviceName || "",
    category: record.category || asset.category || "",
    brand: asset.brand || "",
    unitRecordId:
      record.id ||
      record.serialNumber ||
      record.macAddress ||
      `${asset.id || asset.assetId}-unit-${index}`,
    selectionKey: `${asset.assetRecordId || asset.parentAssetId || asset.id || asset.assetId}::${
      record.id ||
      record.serialNumber ||
      record.macAddress ||
      index
    }`,
    quantity: 1,
    sourceType: sourceLabel || asset.location || "",
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
        parentAssetId: asset.assetRecordId || asset.parentAssetId || asset.id || "",
        assetRecordId: asset.assetRecordId || asset.parentAssetId || asset.id || "",
        selectionKey: asset.assetRecordId || asset.parentAssetId || asset.id || asset.assetId || "",
        unitRecordId: "",
        quantity: Number(asset.quantity || 1),
        sourceType: sourceLabel || asset.location || "",
      },
    ];
  };

  const getTowerAssets = (tower) => {
    if (!tower) return [];

    if (Array.isArray(tower.assets)) {
      return tower.assets;
    }

    return [];
  };

  const getTransferAssetKey = (transfer) =>
  String(
    transfer?.assetRecordId ||
      transfer?.assetId ||
      transfer?.serialNumber ||
      transfer?.macAddress ||
      ""
  );

const isLatestTransferForAsset = (transfer) => {
  const relatedTransfers = towerTransfers
    .filter(
      (item) =>
        getTransferAssetKey(item) ===
        getTransferAssetKey(transfer)
    )
    .sort((a, b) =>
      String(a.createdAt || a.transferDate || "").localeCompare(
        String(b.createdAt || b.transferDate || "")
      )
    );

  if (!relatedTransfers.length) return false;

  const latest = relatedTransfers[relatedTransfers.length - 1];

  return String(latest.id) === String(transfer.id);
};

  const currentTowerTransfers = useMemo(() => {
    return towerTransfers
      .filter(
        (transfer) =>
          String(transfer.sourceTowerId || "") === String(towerId) ||
          String(transfer.destinationTowerId || "") === String(towerId)
      )
      .sort((a, b) =>
        String(b.transferDate || b.createdAt || "").localeCompare(
          String(a.transferDate || a.createdAt || "")
        )
      );
  }, [towerTransfers, towerId]);

  const incomingTransfers = currentTowerTransfers.filter(
    (transfer) =>
      String(transfer.destinationTowerId || "") === String(towerId)
  ).length;

  const outgoingTransfers = currentTowerTransfers.filter(
    (transfer) =>
      String(transfer.sourceTowerId || "") === String(towerId)
  ).length;

  const completedTransfers = currentTowerTransfers.filter(
    (transfer) => transfer.transferStatus === "Completed"
  ).length;

  const isIncomingTransfer = (transfer) =>
  String(transfer.destinationTowerId || "") === String(towerId);

const isOutgoingTransfer = (transfer) =>
  String(transfer.sourceTowerId || "") === String(towerId);

const getTowerTransferRowClass = (transfer) => {
  if (isOutgoingTransfer(transfer)) {
    return "tower-transfer-row-outgoing";
  }

  if (isIncomingTransfer(transfer)) {
    return "tower-transfer-row-incoming";
  }

  return "tower-transfer-row-neutral";
};

const getVisibleTransferType = (transfer) => {
  if (transfer.transferType === "Main Stock to Tower") {
    return "-";
  }

  return transfer.transferType || "-";
};

const getTransferQuantity = (transfer) =>
  Number(
    transfer.quantity ||
      transfer.batchQuantity ||
      transfer.batchSize ||
      1
  );

const canManageTransfer = (transfer) => isOutgoingTransfer(transfer);

  const mainStockAssets = useMemo(() => {
    return assets.flatMap((asset) => {
      const location = String(asset.location || "").toLowerCase();
      const status = String(asset.status || "").toLowerCase();

      const inMainStock =
        location === "main stock" ||
        status === "in stock" ||
        status === "returned";

      return inMainStock ? expandAssetOptions(asset, "Main Stock") : [];
    });
  }, [assets]);

  const sourceTower = towerAssets.find(
    (tower) => String(tower.id) === String(formData.sourceTowerId)
  );

  const availableAssets = useMemo(() => {
    if (formData.transferType === "Main Stock to Tower") {
      return mainStockAssets;
    }

    if (formData.transferType === "Tower to Tower") {
      return getTowerAssets(sourceTower).flatMap((asset) =>
        expandAssetOptions(asset, "Tower")
      );
    }

    if (
  formData.transferType === "Tower to Main Stock" ||
  formData.transferType === "Tower to Repair" ||
  formData.transferType === "Tower to Damaged / Lost"
) {
  return getTowerAssets(currentTower).flatMap((asset) =>
    expandAssetOptions(asset, "Tower")
  );
}

    return [];
  }, [
    formData.transferType,
    mainStockAssets,
    sourceTower,
    currentTower,
  ]);
  const filteredAssets = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return availableAssets;

    return availableAssets.filter((asset) =>
      [
        asset.assetId,
        asset.deviceName,
        asset.category,
        asset.brand,
        asset.model,
        asset.macAddress,
        asset.serialNumber,
      ].some((value) =>
        String(value || "").toLowerCase().includes(keyword)
      )
    );
  }, [availableAssets, search]);

  const selectedAssets = useMemo(() => {
    const selectedKeys = new Set(
      selectedAssetKeys.map(String)
    );

    return availableAssets.filter((asset) =>
      selectedKeys.has(getAssetKey(asset))
    );
  }, [availableAssets, selectedAssetKeys]);

  const isMainStockToTower =
    formData.transferType === "Main Stock to Tower";

  const isTowerToTower =
    formData.transferType === "Tower to Tower";

  const isTowerToMainStock =
    formData.transferType === "Tower to Main Stock";

  const isTowerToRepair =
    formData.transferType === "Tower to Repair";

  const isTowerToDamagedLost =
    formData.transferType === "Tower to Damaged / Lost";

    const isCurrentTowerSource =
  isTowerToTower &&
  String(formData.sourceTowerId) === String(towerId);



  const resetTransferForm = () => {
    setFormData(createEmptyForm(towerId));
    setSelectedAssetKeys([]);
    setSearch("");
  };

  const openTransferModal = () => {
    resetTransferForm();
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    resetTransferForm();
    setViewAsset(null);
    setShowTransferModal(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      const nextData = {
        ...previous,
        [name]: value,
      };

      if (name === "transferType") {
        nextData.sourceTowerId =
          value === "Tower to Tower"
            ? towerId
            : "";

            nextData.damageLostType = "Damaged";
nextData.damageLostReason = "";
nextData.damageLostDate = new Date().toISOString().slice(0, 10);
nextData.damageLostReportedBy = "";
nextData.damageLostStatus =
  value === "Tower to Damaged / Lost" ? "Closed" : "";

        nextData.destinationTowerId =
          value === "Main Stock to Tower"
            ? towerId
            : "";

        nextData.transferStatus =
  value === "Tower to Repair"
    ? "In Repair"
    : value === "Tower to Damaged / Lost"
      ? "Closed"
      : "Completed";

        nextData.repairType = "Repair";
        nextData.repairProblem = "";
        nextData.repairCenter = "";
        nextData.repairTechnician = "";
        nextData.repairCost = "";
        nextData.repairSentDate =
          new Date().toISOString().slice(0, 10);
        nextData.expectedReturnDate = "";

        nextData.repairStatus =
          value === "Tower to Repair"
            ? "Sent for Repair"
            : "";

        setSelectedAssetKeys([]);
        setSearch("");
      }

      if (name === "sourceTowerId") {
        nextData.destinationTowerId =
          String(value) === String(towerId)
            ? ""
            : towerId;

        setSelectedAssetKeys([]);
        setSearch("");
      }
      if (name === "destinationTowerId") {
        setSelectedAssetKeys([]);
      }

      return nextData;
    });
  };

  const toggleAsset = (asset) => {
    const key = getAssetKey(asset);

    setSelectedAssetKeys((previous) => {
      const exists = previous.some(
        (item) => String(item) === String(key)
      );

      if (exists) {
        return previous.filter(
          (item) => String(item) !== String(key)
        );
      }

      return [...previous, key];
    });
  };

  const removeSelectedAsset = (asset) => {
    const key = getAssetKey(asset);

    setSelectedAssetKeys((previous) =>
      previous.filter(
        (item) => String(item) !== String(key)
      )
    );
  };

  const selectAllVisible = () => {
    setSelectedAssetKeys((previous) => {
      const keys = new Set(previous.map(String));

      filteredAssets.forEach((asset) => {
        keys.add(getAssetKey(asset));
      });

      return [...keys];
    });
  };

  const confirmDeleteTransfer = async () => {
  if (!deleteTransfer) return;

  if (!canManageTransfer(deleteTransfer)) {
    notify("This transfer can only be changed from the page that created it.", "error");
    setDeleteTransfer(null);
    return;
  }

  const latestTransfer =
    isLatestTransferForAsset(deleteTransfer);

  let nextTowerAssets = towerAssets;
  let nextAssets = assets;

  if (latestTransfer) {
    const transferAssetKey =
      getTransferAssetKey(deleteTransfer);

    nextTowerAssets = towerAssets.map((tower) => {
      let recordAssets = getTowerAssets(tower);

      const removeFromDestination =
        deleteTransfer.destinationType === "Tower" &&
        String(tower.id) ===
          String(deleteTransfer.destinationTowerId);

      if (removeFromDestination) {
        recordAssets = recordAssets.filter(
          (asset) =>
            String(getAssetKey(asset)) !==
            String(transferAssetKey)
        );
      }

      const restoreToSource =
        deleteTransfer.sourceType === "Tower" &&
        deleteTransfer.sourceTowerId &&
        String(tower.id) ===
          String(deleteTransfer.sourceTowerId);

      if (restoreToSource) {
        const originalAsset = assets.find(
          (asset) =>
            String(getAssetKey(asset)) ===
            String(transferAssetKey)
        );

        const alreadyExists = recordAssets.some(
          (asset) =>
            String(getAssetKey(asset)) ===
            String(transferAssetKey)
        );

        if (originalAsset && !alreadyExists) {
          recordAssets = [...recordAssets, originalAsset];
        }
      }

      return {
        ...tower,
        assets: recordAssets,
        assetCount: recordAssets.length,
        updatedAt: new Date().toISOString(),
      };
    });

    nextAssets = assets.map((asset) => {
      const matchesTransferAsset =
        String(getAssetKey(asset)) === String(transferAssetKey) ||
        String(asset.id || "") === String(deleteTransfer.assetRecordId || "") ||
        String(asset.id || "") === String(deleteTransfer.parentAssetId || "") ||
        String(asset.assetId || "") === String(deleteTransfer.assetId || "");

      if (!matchesTransferAsset) {
        return asset;
      }

      if (deleteTransfer.transferType === "Tower to Main Stock") {
        const deleteQuantity = Number(deleteTransfer.quantity || 1);
        const deleteUnitKey = String(
          deleteTransfer.unitRecordId ||
            deleteTransfer.serialNumber ||
            deleteTransfer.macAddress ||
            ""
        );

        return {
          ...asset,

          location:
            deleteTransfer.previousAssetLocation ||
            "Tower",
          status:
            deleteTransfer.previousAssetStatus ||
            "Installed",
          quantity: Math.max(Number(asset.quantity || 0) - deleteQuantity, 0),
          identityRecords: isIndividualAsset(asset)
            ? (asset.identityRecords || []).filter((record) => {
                if (!deleteUnitKey) return true;

                const recordKey = String(
                  record.id ||
                    record.serialNumber ||
                    record.macAddress ||
                    ""
                );

                return recordKey !== deleteUnitKey;
              })
            : asset.identityRecords || [],

          towerRecordId:
            deleteTransfer.sourceTowerId || "",
          towerName:
            deleteTransfer.sourceTowerName || "",
          towerLocation:
            deleteTransfer.sourceTowerLocation || "",

          updatedAt: new Date().toISOString(),
        };
      }

      if (deleteTransfer.sourceType === "Main Stock") {
        return {
          ...asset,

          location: "Main Stock",
          status: "In Stock",

          towerRecordId: "",
          towerName: "",
          towerLocation: "",

          updatedAt: new Date().toISOString(),
        };
      }

      if (deleteTransfer.sourceType === "Tower") {
        return {
          ...asset,

          location: "Tower",
          status: "Installed",

          towerRecordId:
            deleteTransfer.sourceTowerId || "",

          towerName:
            deleteTransfer.sourceTowerName || "",

          towerLocation:
            deleteTransfer.sourceTowerLocation || "",

          updatedAt: new Date().toISOString(),
        };
      }

      return asset;
    });
  }

  const nextTransfers = towerTransfers.filter(
    (item) =>
      String(item.id) !== String(deleteTransfer.id)
  );

  const nextMovements = removeTransferFromMovements(deleteTransfer);

  const towersSaved =
    await setTowerAssets(nextTowerAssets);

  if (!towersSaved) return;

  const assetsSaved = await setAssets(nextAssets);

  if (!assetsSaved) return;

  const transfersSaved =
    await setTowerTransfers(nextTransfers);

  if (!transfersSaved) return;

  const movementsSaved = await setAssetMovements(nextMovements);

if (!movementsSaved) return;

  notify(
    latestTransfer
      ? "Transfer deleted and asset location restored."
      : "Historical transfer deleted. Current asset location was not changed."
  );

  setDeleteTransfer(null);
};


const openEditTransfer = (transfer) => {
  if (!canManageTransfer(transfer)) {
    notify("This transfer can only be edited from the page that created it.", "error");
    setOpenTransferActionId(null);
    return;
  }

  setEditTransfer(transfer);

  setEditTransferForm({
    transferType: transfer.transferType || "Tower to Tower",
    destinationTowerId:
      transfer.destinationTowerId && String(transfer.destinationTowerId) !== String(towerId)
        ? transfer.destinationTowerId
        : "",
    quantity: String(getTransferQuantity(transfer) || 1),
    transferDate: transfer.transferDate || "",
    transferStatus: transfer.transferStatus || "Completed",
    responsiblePerson: transfer.responsiblePerson || "",
    notes: transfer.notes || "",

    repairType: transfer.repairType || "Repair",
    repairProblem: transfer.repairProblem || "",
    repairCenter: transfer.repairCenter || "",
    repairTechnician: transfer.repairTechnician || "",
    repairCost: String(transfer.repairCost || ""),
    repairSentDate: transfer.repairSentDate || "",
    expectedReturnDate: transfer.expectedReturnDate || "",
    repairStatus: transfer.repairStatus || "",
  });

  setOpenTransferActionId(null);
};

const handleEditTransferChange = (event) => {
  const { name, value } = event.target;

  setEditTransferForm((previous) => ({
    ...previous,
    [name]: value,
    ...(name === "transferType"
      ? {
          destinationTowerId: "",
          transferStatus:
            value === "Tower to Repair"
              ? "In Repair"
              : value === "Tower to Damaged / Lost"
                ? "Closed"
                : "Completed",
        }
      : {}),
  }));
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
    String(movement.date || "") ===
    String(transfer.transferDate || transfer.date || "");

  return sameAsset && sameDate;
};

const removeTransferFromMovements = (transfer) =>
  assetMovements.flatMap((movement) => {
    if (!transferMatchesMovement(transfer, movement)) {
      return [movement];
    }

    const movementQuantity = Number(movement.quantity || 0);
    const transferQuantity = Number(transfer.quantity || 1);
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
          quantity: Math.max(movementQuantity - transferQuantity, 0),
          identityRecords: nextIdentityRecords,
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    if (movementQuantity > transferQuantity) {
      return [
        {
          ...movement,
          quantity: Math.max(movementQuantity - transferQuantity, 0),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    return [];
  });

const updateTransferMovement = (oldTransfer, updatedTransfer) =>
  assetMovements.map((movement) => {
    if (!transferMatchesMovement(oldTransfer, movement)) {
      return movement;
    }

    const isDamagedLost =
      updatedTransfer.transferType === "Tower to Damaged / Lost";
    const isRepair =
      updatedTransfer.transferType === "Tower to Repair";

    return {
      ...movement,
      date: updatedTransfer.transferDate || movement.date,
      movement:
        updatedTransfer.transferType === "Tower to Main Stock"
          ? "Transfer"
          : movement.movement,
      transferType: updatedTransfer.transferType || movement.transferType,
      type: updatedTransfer.transferType || movement.type,
      quantity: Number(updatedTransfer.quantity || movement.quantity || 0),
      destinationName:
        updatedTransfer.destinationTowerName ||
        updatedTransfer.destinationType ||
        movement.destinationName,
      destinationType: updatedTransfer.destinationType || movement.destinationType,
      destinationRecordId:
        updatedTransfer.destinationTowerId || movement.destinationRecordId || "",
      batchQuantity:
        Number(updatedTransfer.quantity || movement.batchQuantity || 0),
      transferStatus:
        updatedTransfer.transferStatus ||
        updatedTransfer.repairStatus ||
        movement.transferStatus,
      responsiblePerson:
        updatedTransfer.responsiblePerson || movement.responsiblePerson,
      notes: updatedTransfer.notes || movement.notes,
      repairType: isRepair ? updatedTransfer.repairType : movement.repairType,
      repairProblem: isRepair
        ? updatedTransfer.repairProblem
        : movement.repairProblem,
      repairCenter: isRepair
        ? updatedTransfer.repairCenter
        : movement.repairCenter,
      repairTechnician: isRepair
        ? updatedTransfer.repairTechnician
        : movement.repairTechnician,
      repairCost: isRepair
        ? Number(updatedTransfer.repairCost || 0)
        : movement.repairCost,
      repairSentDate: isRepair
        ? updatedTransfer.repairSentDate
        : movement.repairSentDate,
      expectedReturnDate: isRepair
        ? updatedTransfer.expectedReturnDate
        : movement.expectedReturnDate,
      repairStatus: isRepair
        ? updatedTransfer.repairStatus
        : movement.repairStatus,
      wasteReason: isDamagedLost
        ? updatedTransfer.damageLostReason || movement.wasteReason
        : movement.wasteReason,
      damageLostType: isDamagedLost
        ? updatedTransfer.damageLostType || movement.damageLostType
        : movement.damageLostType,
      damageLostReason: isDamagedLost
        ? updatedTransfer.damageLostReason || movement.damageLostReason
        : movement.damageLostReason,
      damageLostDate: isDamagedLost
        ? updatedTransfer.damageLostDate || movement.damageLostDate
        : movement.damageLostDate,
      damageLostReportedBy: isDamagedLost
        ? updatedTransfer.damageLostReportedBy || movement.damageLostReportedBy
        : movement.damageLostReportedBy,
      damageLostStatus: isDamagedLost
        ? updatedTransfer.damageLostStatus || movement.damageLostStatus
        : movement.damageLostStatus,
      updatedAt: new Date().toISOString(),
    };
  });

const saveEditedTransfer = async (event) => {
  event.preventDefault();

  if (!editTransfer) return;

  const nextQuantity = Number(editTransferForm.quantity || 0);
  const oldQuantity = getTransferQuantity(editTransfer);
  const nextTransferType = editTransferForm.transferType || editTransfer.transferType;
  const nextDestinationTower =
    nextTransferType === "Tower to Tower"
      ? towerAssets.find(
          (tower) =>
            String(tower.id || "") === String(editTransferForm.destinationTowerId || "")
        )
      : null;

  if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
    notify("Quantity must be greater than zero.", "error");
    return;
  }

  if (nextTransferType === "Tower to Tower" && !nextDestinationTower) {
    notify("Please select the destination tower.", "error");
    return;
  }

  if (
    nextTransferType === "Tower to Repair" &&
    !editTransferForm.repairCenter.trim()
  ) {
    notify("Please enter the repair center.", "error");
    return;
  }

  const updatedAt = new Date().toISOString();

  const updatedTransfer = {
    ...editTransfer,

    transferType: nextTransferType,
    quantity: nextQuantity,
    batchQuantity: nextQuantity,
    destinationType:
      nextTransferType === "Tower to Main Stock"
        ? "Main Stock"
        : nextTransferType === "Tower to Repair"
          ? "Repair"
          : nextTransferType === "Tower to Damaged / Lost"
            ? editTransferForm.damageLostType || "Damaged"
            : "Tower",
    destinationTowerId:
      nextTransferType === "Tower to Tower" ? nextDestinationTower?.id || "" : "",
    destinationTowerName:
      nextTransferType === "Tower to Main Stock"
        ? "Main Stock"
        : nextTransferType === "Tower to Repair"
          ? "Repair / Maintenance"
          : nextTransferType === "Tower to Damaged / Lost"
            ? editTransferForm.damageLostType || "Damaged"
            : nextDestinationTower?.towerName || "",
    destinationTowerLocation:
      nextTransferType === "Tower to Tower"
        ? nextDestinationTower?.towerLocation || ""
        : "",
    transferDate: editTransferForm.transferDate,
    transferStatus: editTransferForm.transferStatus,
    responsiblePerson:
      editTransferForm.responsiblePerson.trim(),
    notes: editTransferForm.notes.trim(),

    repairType: editTransferForm.repairType,
    repairProblem: editTransferForm.repairProblem.trim(),
    repairCenter: editTransferForm.repairCenter.trim(),
    repairTechnician:
      editTransferForm.repairTechnician.trim(),
    repairCost: Number(editTransferForm.repairCost || 0),
    repairSentDate: editTransferForm.repairSentDate,
    expectedReturnDate:
      editTransferForm.expectedReturnDate,
    repairStatus: editTransferForm.repairStatus,
    damageLostType:
      nextTransferType === "Tower to Damaged / Lost"
        ? editTransferForm.damageLostType
        : "",
    damageLostReason:
      nextTransferType === "Tower to Damaged / Lost"
        ? editTransferForm.damageLostReason.trim()
        : "",
    damageLostDate:
      nextTransferType === "Tower to Damaged / Lost"
        ? editTransferForm.damageLostDate
        : "",
    damageLostReportedBy:
      nextTransferType === "Tower to Damaged / Lost"
        ? editTransferForm.damageLostReportedBy.trim()
        : "",
    damageLostStatus:
      nextTransferType === "Tower to Damaged / Lost"
        ? editTransferForm.damageLostStatus || "Closed"
        : "",

    updatedAt,
  };

  const nextTransfers = towerTransfers.map((item) =>
    String(item.id) === String(editTransfer.id)
      ? updatedTransfer
      : item
  );

  let nextAssets = assets;

  if (isLatestTransferForAsset(editTransfer)) {
    nextAssets = assets.map((asset) => {
      const matchesTransferAsset =
        String(getAssetKey(asset)) === String(getTransferAssetKey(editTransfer)) ||
        String(asset.id || "") === String(editTransfer.assetRecordId || "") ||
        String(asset.id || "") === String(editTransfer.parentAssetId || "") ||
        String(asset.assetId || "") === String(editTransfer.assetId || "");

      if (!matchesTransferAsset) {
        return asset;
      }

      const wasMainStock = editTransfer.transferType === "Tower to Main Stock";
      const isMainStock = nextTransferType === "Tower to Main Stock";
      const quantityDelta =
        (isMainStock ? nextQuantity : 0) - (wasMainStock ? oldQuantity : 0);
      const nextAsset = {
        ...asset,
        lastTowerTransferDate:
          editTransferForm.transferDate,
        updatedAt,
      };

      if (quantityDelta !== 0) {
        const transferUnitKey = String(
          editTransfer.unitRecordId ||
            editTransfer.serialNumber ||
            editTransfer.macAddress ||
            ""
        );
        const existingIdentityRecords = asset.identityRecords || [];
        const hasReturnedUnit = existingIdentityRecords.some((record) => {
          const recordKey = String(
            record.id || record.serialNumber || record.macAddress || ""
          );

          return transferUnitKey && recordKey === transferUnitKey;
        });
        const returnedIdentityRecord = {
          id: editTransfer.unitRecordId || `${editTransfer.id}-unit`,
          model: editTransfer.model || "",
          macAddress: editTransfer.macAddress || "",
          serialNumber: editTransfer.serialNumber || "",
          image: editTransfer.image || "",
          sourceType: "Tower Return",
          sourceId: editTransfer.id,
          returnedAt: updatedAt,
        };

        return {
          ...nextAsset,
          location: isMainStock && Number(asset.quantity || 0) + quantityDelta > 0
            ? "Main Stock"
            : nextAsset.location,
          status: isMainStock ? "Returned" : nextAsset.status,
          quantity: Math.max(Number(asset.quantity || 0) + quantityDelta, 0),
          identityRecords: isIndividualAsset(asset)
            ? quantityDelta > 0
              ? hasReturnedUnit
                ? existingIdentityRecords
                : [...existingIdentityRecords, returnedIdentityRecord]
              : existingIdentityRecords.filter((record) => {
                  const recordKey = String(
                    record.id || record.serialNumber || record.macAddress || ""
                  );

                  return !transferUnitKey || recordKey !== transferUnitKey;
                })
            : existingIdentityRecords,
          towerRecordId: isMainStock ? "" : nextAsset.towerRecordId || "",
          towerName: isMainStock ? "" : nextAsset.towerName || "",
          towerLocation: isMainStock ? "" : nextAsset.towerLocation || "",
        };
      }

      if (nextTransferType === "Tower to Repair") {
        return {
          ...nextAsset,

          status:
            editTransferForm.repairType === "Maintenance"
              ? "Maintenance"
              : editTransferForm.repairType === "Inspection"
                ? "Under Inspection"
                : "Under Repair",

          repairType: editTransferForm.repairType,
          repairProblem:
            editTransferForm.repairProblem.trim(),
          repairCenter:
            editTransferForm.repairCenter.trim(),
          repairTechnician:
            editTransferForm.repairTechnician.trim(),
          repairCost: Number(
            editTransferForm.repairCost || 0
          ),
          repairSentDate:
            editTransferForm.repairSentDate,
          expectedReturnDate:
            editTransferForm.expectedReturnDate,
          repairStatus:
            editTransferForm.repairStatus ||
            "Sent for Repair",
          repairResponsiblePerson:
            editTransferForm.responsiblePerson.trim(),
        };
      }

      if (nextTransferType === "Tower to Tower") {
        return {
          ...nextAsset,
          location: "Tower",
          status:
            editTransferForm.transferStatus === "Completed"
              ? "Installed"
              : editTransferForm.transferStatus,
          towerRecordId: nextDestinationTower?.id || nextAsset.towerRecordId || "",
          towerName: nextDestinationTower?.towerName || nextAsset.towerName || "",
          towerLocation:
            nextDestinationTower?.towerLocation || nextAsset.towerLocation || "",
        };
      }

      return {
        ...nextAsset,

        status:
          editTransferForm.transferStatus === "Completed"
            ? asset.location === "Main Stock"
              ? "Returned"
              : "Installed"
            : editTransferForm.transferStatus,
      };
    });
  }

  const transfersSaved =
    await setTowerTransfers(nextTransfers);

  if (!transfersSaved) return;

  const assetsSaved = await setAssets(nextAssets);

  if (!assetsSaved) return;

  const movementsSaved = await setAssetMovements(
    updateTransferMovement(editTransfer, updatedTransfer)
  );

  if (!movementsSaved) return;

  notify("Tower asset transfer updated successfully.");

  setEditTransfer(null);
};

  const saveTransfer = async (event) => {
    event.preventDefault();

    if (!selectedAssets.length) {
      notify("Please select at least one asset.", "error");
      return;
    }

    if (isTowerToRepair) {
      if (!formData.repairCenter.trim()) {
        notify("Please enter the repair center.", "error");
        return;
      }

      if (!formData.repairProblem.trim()) {
        notify("Please describe the asset problem.", "error");
        return;
      }

      if (!formData.repairSentDate) {
        notify("Please select the repair sent date.", "error");
        return;
      }

      if (Number(formData.repairCost || 0) < 0) {
        notify("Repair cost cannot be negative.", "error");
        return;
      }
    }

    if (isTowerToDamagedLost) {
  if (!formData.damageLostReason.trim()) {
    notify("Please enter the damaged / lost reason.", "error");
    return;
  }

  if (!formData.damageLostDate) {
    notify("Please select the damaged / lost date.", "error");
    return;
  }
}

    const destinationTowerId =
  isMainStockToTower
    ? towerId
    : isTowerToTower
      ? formData.destinationTowerId
      : "";

    const destinationTower = destinationTowerId
      ? towerAssets.find(
        (tower) =>
          String(tower.id) === String(destinationTowerId)
      )
      : null;

    if (
      (isMainStockToTower || isTowerToTower) &&
      !destinationTower
    ) {
      notify("Destination tower was not found.", "error");
      return;
    }
if (isTowerToTower) {
  if (!sourceTower) {
    notify("Please select a source tower.", "error");
    return;
  }

  if (!destinationTower) {
    notify("Please select a destination tower.", "error");
    return;
  }

  if (
    String(formData.sourceTowerId) ===
    String(destinationTowerId)
  ) {
    notify(
      "Source tower and destination tower cannot be the same.",
      "error"
    );

    return;
  }
}

    const timestamp = Date.now();
    const batchId = `tower-transfer-${timestamp}`;
    const referenceNumber = `TWR-TRF-${timestamp}`;
    const transferredAt = new Date().toISOString();

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

    const selectedKeySet = new Set(selectedAssets.map(getAssetKey));

    const nextTowerAssets = towerAssets.map((tower) => {
      const recordAssets = getTowerAssets(tower);

      const mustRemoveAssets =
        (
          isTowerToTower &&
          String(tower.id) === String(formData.sourceTowerId)
        ) ||
        (
          (isTowerToMainStock || isTowerToRepair || isTowerToDamagedLost) &&
String(tower.id) === String(towerId)
        );

      if (mustRemoveAssets) {
        const remainingAssets = recordAssets
          .map((asset) => {
            const selectedUnits = selectedByParent.get(getParentAssetId(asset));

            if (!selectedUnits?.length) {
              return selectedKeySet.has(getAssetKey(asset)) ? null : asset;
            }

            if (!isIndividualAsset(asset)) {
              return null;
            }

            const selectedUnitKeys = new Set(
              selectedUnits.map((unit) =>
                String(unit.unitRecordId || unit.serialNumber || unit.macAddress || "")
              )
            );
            const nextIdentityRecords = (asset.identityRecords || []).filter(
              (record) => {
                const key = String(
                  record.id || record.serialNumber || record.macAddress || ""
                );
                return !selectedUnitKeys.has(key);
              }
            );

            if (nextIdentityRecords.length === 0) {
              return null;
            }

            return {
              ...asset,
              identityRecords: nextIdentityRecords,
              quantity: nextIdentityRecords.length,
              updatedAt: transferredAt,
            };
          })
          .filter(Boolean);

        return {
          ...tower,
          assets: remainingAssets,
          assetCount: remainingAssets.length,
          updatedAt: transferredAt,
        };
      }

      const mustAddAssets =
  (isMainStockToTower || isTowerToTower) &&
  String(tower.id) === String(destinationTowerId);

      if (mustAddAssets) {
        const existingKeys = new Set(
          recordAssets.map(getAssetKey)
        );

        const assetsToAdd = selectedAssets.filter(
          (asset) =>
            !existingKeys.has(getAssetKey(asset))
        );

        const updatedAssets = [
          ...recordAssets,
          ...assetsToAdd,
        ];

        return {
          ...tower,
          assets: updatedAssets,
          assetCount: updatedAssets.length,
          updatedAt: transferredAt,
        };
      }

      return tower;
    });

    const nextAssets = assets.map((asset) => {
      const selectedUnits = getSelectedUnitsForAsset(asset);

      if (!selectedUnits?.length) {
        return asset;
      }

      const selectedQuantity = selectedUnits.reduce(
        (sum, unit) => sum + Number(unit.quantity || 1),
        0
      );
      const selectedUnitKeys = new Set(
        selectedUnits.map((unit) =>
          String(unit.unitRecordId || unit.serialNumber || unit.macAddress || "")
        )
      );
      const nextMainStockQuantity = Math.max(
        Number(asset.quantity || 0) - selectedQuantity,
        0
      );

      if (isTowerToMainStock) {
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
            unitPrice: unit.unitPrice || asset.unitPrice || 0,
            addedAt: transferredAt,
            sourceType: "Tower Return",
          }));

        return {
          ...asset,

          location: "Main Stock",
          status: "Returned",
          quantity: Number(asset.quantity || 0) + selectedQuantity,
          identityRecords: isIndividualAsset(asset)
            ? [...(asset.identityRecords || []), ...restoredIdentityRecords]
            : asset.identityRecords || [],

          previousTowerRecordId: currentTower.id,
          previousTowerName: currentTower.towerName || "",
          previousTowerLocation:
            currentTower.towerLocation || "",

          towerRecordId: "",
          towerName: "",
          towerLocation: "",

          lastTowerTransferDate: formData.transferDate,
          updatedAt: transferredAt,
        };
      }

      if (isTowerToDamagedLost) {
  return {
    ...asset,

    location: formData.damageLostType,
    status: formData.damageLostType,

    previousTowerRecordId: currentTower.id,
    previousTowerName: currentTower.towerName || "",
    previousTowerLocation:
      currentTower.towerLocation || "",

    towerRecordId: "",
    towerName: "",
    towerLocation: "",

    damageLostType: formData.damageLostType,
    damageLostReason: formData.damageLostReason.trim(),
    damageLostDate: formData.damageLostDate,
    damageLostReportedBy:
      formData.damageLostReportedBy.trim(),
    damageLostStatus: formData.damageLostStatus || "Closed",

    lastTowerTransferDate: formData.transferDate,
    updatedAt: transferredAt,
  };
}

      if (isTowerToRepair) {
        return {
          ...asset,

          location: "Repair",

          status:
            formData.repairType === "Maintenance"
              ? "Maintenance"
              : formData.repairType === "Inspection"
                ? "Under Inspection"
                : "Under Repair",

          previousTowerRecordId: currentTower.id,
          previousTowerName: currentTower.towerName || "",
          previousTowerLocation:
            currentTower.towerLocation || "",

          repairSourceTowerId: currentTower.id,
          repairSourceTowerName:
            currentTower.towerName || "",

          towerRecordId: "",
          towerName: "",
          towerLocation: "",

          repairType: formData.repairType,
          repairProblem: formData.repairProblem.trim(),
          repairCenter: formData.repairCenter.trim(),
          repairTechnician:
            formData.repairTechnician.trim(),

          repairCost: Number(formData.repairCost || 0),

          repairSentDate: formData.repairSentDate,
          expectedReturnDate: formData.expectedReturnDate,
          repairStatus: "Sent for Repair",

          repairResponsiblePerson:
            formData.responsiblePerson.trim(),

          lastTowerTransferDate: formData.transferDate,
          updatedAt: transferredAt,
        };
      }

      return {
        ...asset,

        location:
          isMainStockToTower && !isIndividualAsset(asset) && nextMainStockQuantity === 0
            ? "Tower"
            : asset.location,

        status:
          isMainStockToTower && (isIndividualAsset(asset) || nextMainStockQuantity > 0)
            ? asset.status
            :
          formData.transferStatus === "Completed"
            ? "Installed"
            : "Issued",

        quantity:
          isMainStockToTower
            ? nextMainStockQuantity
            : Number(asset.quantity || 0),
        identityRecords:
          isMainStockToTower && isIndividualAsset(asset)
            ? (asset.identityRecords || []).filter((record) => {
                const key = String(
                  record.id || record.serialNumber || record.macAddress || ""
                );
                return !selectedUnitKeys.has(key);
              })
            : asset.identityRecords || [],

        towerRecordId:
          isMainStockToTower && (isIndividualAsset(asset) || nextMainStockQuantity > 0)
            ? asset.towerRecordId || ""
            : destinationTower.id,
        towerName:
          isMainStockToTower && (isIndividualAsset(asset) || nextMainStockQuantity > 0)
            ? asset.towerName || ""
            : destinationTower.towerName || "",
        towerLocation:
          isMainStockToTower && (isIndividualAsset(asset) || nextMainStockQuantity > 0)
            ? asset.towerLocation || ""
            : destinationTower.towerLocation || "",

        previousTowerRecordId:
          isTowerToTower
            ? sourceTower?.id || ""
            : "",

        previousTowerName:
          isTowerToTower
            ? sourceTower?.towerName || ""
            : "",

        lastTowerTransferDate:
          formData.transferDate,

        updatedAt: transferredAt,
      };
    });

    const newTransferRecords = selectedAssets.map((asset, index) => ({
      id: `${timestamp}-${index}`,
      batchId,
      referenceNumber,
      batchSize: selectedAssets.length,
      quantity: Number(asset.quantity || 1),
      createdFromTowerId: towerId,
      sourcePage: "tower-asset-transfer",

      transferType: formData.transferType,

      sourceType:
        isMainStockToTower
          ? "Main Stock"
          : "Tower",

      sourceTowerId:
        isTowerToTower
          ? sourceTower?.id || ""
          : isTowerToMainStock || isTowerToRepair
            ? currentTower.id
            : "",

      sourceTowerName:
        isMainStockToTower
          ? "Main Stock"
          : isTowerToTower
            ? sourceTower?.towerName || ""
            : currentTower.towerName || "",

      sourceTowerLocation:
        isTowerToTower
          ? sourceTower?.towerLocation || ""
          : isTowerToMainStock || isTowerToRepair
            ? currentTower.towerLocation || ""
            : "",

      destinationType:
  isTowerToMainStock
    ? "Main Stock"
    : isTowerToRepair
      ? "Repair"
      : isTowerToDamagedLost
        ? formData.damageLostType
        : "Tower",

      destinationTowerId:
        destinationTower?.id || "",

      destinationTowerName:
  isTowerToMainStock
    ? "Main Stock"
    : isTowerToRepair
      ? "Repair / Maintenance"
      : isTowerToDamagedLost
        ? formData.damageLostType
        : destinationTower?.towerName || "",

      destinationTowerLocation:
        destinationTower?.towerLocation || "",

      repairType:
        isTowerToRepair
          ? formData.repairType
          : "",

      repairProblem:
        isTowerToRepair
          ? formData.repairProblem.trim()
          : "",

      repairCenter:
        isTowerToRepair
          ? formData.repairCenter.trim()
          : "",

      repairTechnician:
        isTowerToRepair
          ? formData.repairTechnician.trim()
          : "",

      repairCost:
        isTowerToRepair
          ? Number(formData.repairCost || 0)
          : 0,

      repairSentDate:
        isTowerToRepair
          ? formData.repairSentDate
          : "",

      expectedReturnDate:
        isTowerToRepair
          ? formData.expectedReturnDate
          : "",

      repairStatus:
        isTowerToRepair
          ? "Sent for Repair"
          : "",

      parentAssetId: asset.assetRecordId || asset.parentAssetId || asset.id || "",
      assetRecordId: asset.assetRecordId || asset.parentAssetId || asset.id || "",
      assetId: asset.assetId || "",
      deviceName: asset.deviceName || "",
      category: asset.category || "",
      brand: asset.brand || "",
      model: asset.model || "",
      macAddress: asset.macAddress || "",
      serialNumber: asset.serialNumber || "",

      transferDate: formData.transferDate,
      transferStatus: formData.transferStatus,
      responsiblePerson: formData.responsiblePerson.trim(),
      notes: formData.notes.trim(),

      createdAt: transferredAt,
      
      updatedAt: transferredAt,
      damageLostType:
  isTowerToDamagedLost ? formData.damageLostType : "",

damageLostReason:
  isTowerToDamagedLost
    ? formData.damageLostReason.trim()
    : "",

damageLostDate:
  isTowerToDamagedLost ? formData.damageLostDate : "",

damageLostReportedBy:
  isTowerToDamagedLost
    ? formData.damageLostReportedBy.trim()
    : "",

damageLostStatus:
  isTowerToDamagedLost
    ? formData.damageLostStatus || "Closed"
    : "",
    }));

    const movementRecords = Array.from(selectedByParent.entries()).map(
      ([parentId, units], index) => {
        const parentAsset =
          assets.find((asset) => String(asset.id || "") === String(parentId)) ||
          units[0] ||
          {};
        const quantity = units.reduce(
          (sum, unit) => sum + Number(unit.quantity || 1),
          0
        );
        const identityRecords = units
          .filter((unit) => unit.unitRecordId || unit.serialNumber || unit.macAddress)
          .map((unit) => ({
            id: unit.unitRecordId || unit.serialNumber || unit.macAddress,
            model: unit.model || "",
            macAddress: unit.macAddress || "",
            serialNumber: unit.serialNumber || "",
            category: unit.category || parentAsset.category || "",
            unitPrice: unit.unitPrice || parentAsset.unitPrice || 0,
          }));

        return {
          id: `asset-movement-${timestamp}-${index}`,
          parentAssetId: parentAsset.id || units[0]?.assetRecordId || "",
          assetRecordId: parentAsset.id || units[0]?.assetRecordId || "",
          assetId: parentAsset.assetId || units[0]?.assetId || "",
          deviceName: parentAsset.deviceName || units[0]?.deviceName || "",
          category: parentAsset.category || units[0]?.category || "",
          movementType: "Transfer",
          transferType: formData.transferType,
          batchId,
          referenceNumber,
          date: formData.transferDate,
          quantity,
          identityRecords,
          sourceName: isMainStockToTower
            ? "Main Stock"
            : isTowerToTower
              ? sourceTower?.towerName || ""
              : currentTower?.towerName || "",
          sourceRecordId: isMainStockToTower
            ? ""
            : isTowerToTower
              ? sourceTower?.id || ""
              : currentTower?.id || "",
          destinationName: isTowerToMainStock
            ? "Main Stock"
            : isTowerToRepair
              ? "Repair / Maintenance"
              : isTowerToDamagedLost
                ? formData.damageLostType
                : destinationTower?.towerName || "",
          destinationType: isTowerToMainStock
            ? "Main Stock"
            : isTowerToRepair
              ? "Repair"
              : isTowerToDamagedLost
                ? formData.damageLostType
                : "Tower",
          destinationRecordId: destinationTower?.id || "",
          estimatedLoss: isTowerToDamagedLost
            ? units.reduce(
                (sum, unit) =>
                  sum + Number(unit.unitPrice || parentAsset.unitPrice || 0),
                0
              )
            : 0,
          totalAmount: 0,
          transferStatus: formData.transferStatus,
          responsiblePerson: formData.responsiblePerson.trim(),
          notes: formData.notes.trim(),
          createdAt: transferredAt,
          updatedAt: transferredAt,
        };
      }
    );

    

    const towersSaved = await setTowerAssets(nextTowerAssets);

    if (!towersSaved) return;

    const assetsSaved = await setAssets(nextAssets);

    if (!assetsSaved) return;

    const movementsSaved = await setAssetMovements([
      ...assetMovements,
      ...movementRecords,
    ]);

    if (!movementsSaved) return;

    const transfersSaved = await setTowerTransfers([
      ...towerTransfers,
      ...newTransferRecords,
    ]);

    if (!transfersSaved) return;

    notify(
  isTowerToMainStock
    ? `${selectedAssets.length} asset${selectedAssets.length === 1 ? "" : "s"} returned to Main Stock successfully.`
    : isTowerToRepair
      ? `${selectedAssets.length} asset${selectedAssets.length === 1 ? "" : "s"} sent to Repair / Maintenance successfully.`
      : isTowerToDamagedLost
        ? `${selectedAssets.length} asset${selectedAssets.length === 1 ? "" : "s"} marked as ${formData.damageLostType} successfully.`
        : `${selectedAssets.length} asset${selectedAssets.length === 1 ? "" : "s"} transferred successfully.`
);

    closeTransferModal();
  };

  if (!towerAssetsLoaded || !assetsLoaded || !transfersLoaded || !movementsLoaded) {
    return (
      <div className="page-loading">
        Loading tower transfer information...
      </div>
    );
  }

  if (!currentTower) {
    return (
      <div className="tower-transfer-page">
        <div className="tower-transfer-not-found">
          <h1>Tower Not Found</h1>

          <p>
            The selected tower record does not exist.
          </p>

          <button
            type="button"
            onClick={() => navigate("/tower-assets")}
          >
            Back to Tower Assets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tower-transfer-page">
      <Link
        className="tower-transfer-back"
        to="/tower-assets"
      >
        ← Back to Tower Assets
      </Link>

      <div className="tower-transfer-header">
        <div>
          <span>Tower Asset Transfer</span>

          <h1>
            {currentTower.towerName || "Unnamed Tower"}
          </h1>

          <p>
            View all incoming and outgoing asset transfers for this tower.
          </p>
        </div>

        <button
          type="button"
          className="tower-transfer-open-btn"
          onClick={openTransferModal}
        >
          + Transfer Asset
        </button>
      </div>

      <div className="tower-transfer-stats">
        <div>
          <span>Total Transfers</span>
          <strong>{currentTowerTransfers.length}</strong>
          <p>All transfers related to this tower</p>
        </div>

        <div>
          <span>Incoming Transfers</span>
          <strong>{incomingTransfers}</strong>
          <p>Assets transferred to this tower</p>
        </div>

        <div>
          <span>Outgoing Transfers</span>
          <strong>{outgoingTransfers}</strong>
          <p>Assets transferred from this tower</p>
        </div>

        <div>
          <span>Completed Transfers</span>
          <strong>{completedTransfers}</strong>
          <p>Successfully completed transfers</p>
        </div>
      </div>

      <div className="tower-transfer-history-card">
        <div className="tower-transfer-history-header">
  <div>
    <h3>Tower Asset Transfer History</h3>

    <p>
      All incoming and outgoing asset transfers related to this tower.
    </p>
  </div>

  <div className="tower-transfer-legend">
    <span className="tower-transfer-legend-item incoming">
      <i />
      Asset received by this tower
    </span>

    <span className="tower-transfer-legend-item outgoing">
      <i />
      Asset sent from this tower
    </span>
  </div>
</div>

        <div className="tower-transfer-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transfer Type</th>
                <th>Issued from</th>
                <th>Issued to</th>
                <th>Asset</th>
                <th>Quantity</th>
                <th>Responsible Person</th>
                <th>Status</th>
                <th>Direction</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentTowerTransfers.map((transfer) => {
                const isIncoming =
                  String(transfer.destinationTowerId || "") ===
                  String(towerId);
                const canManage = canManageTransfer(transfer);

                const statusClass = String(
                  transfer.transferStatus || ""
                )
                  .toLowerCase()
                  .replace(/\s+/g, "-");

                return (
  <tr key={transfer.id} className={getTowerTransferRowClass(transfer)}>
                    <td>
                      {formatDateTime(
                        transfer.transferDate,
                        transfer.createdAt || transfer.updatedAt
                      )}
                    </td>

                    <td>{getVisibleTransferType(transfer)}</td>

                    <td>
                      {transfer.sourceTowerName || "Main Stock"}
                    </td>

                    <td>
                      {transfer.destinationTowerName || "-"}
                    </td>

                    <td
                      title={`${transfer.category || "-"} - ${transfer.assetId || "-"} - ${transfer.deviceName || "-"
                        }`}
                    >
                      {transfer.category || "-"} -{" "}
                      {transfer.assetId || "-"} -{" "}
                      {transfer.deviceName || "-"}
                    </td>

                    <td>{getTransferQuantity(transfer)}</td>

                    <td>
                      {transfer.responsiblePerson || "-"}
                    </td>

                    <td>
                      <span
                        className={`tower-transfer-status ${statusClass}`}
                      >
                        {transfer.transferStatus || "Unknown"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          isIncoming
                            ? "tower-transfer-direction incoming"
                            : "tower-transfer-direction outgoing"
                        }
                      >
                        {isIncoming ? "Incoming" : "Outgoing"}
                      </span>
                    </td>

                    <td>
  <div className="tower-transfer-row-actions">
    <button
  type="button"
  className="tower-transfer-action-toggle"
  aria-label="Open transfer actions"
  onClick={(event) => {
    event.stopPropagation();

    if (
      String(openTransferActionId) ===
      String(transfer.id)
    ) {
      setOpenTransferActionId(null);
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const menuWidth = 160;
const menuHeight = 128;
    const gap = 8;

    const left = Math.min(
      Math.max(rect.right - menuWidth, 12),
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

    setTransferActionPosition({
      top,
      left,
    });

    setOpenTransferActionId(transfer.id);
  }}
>
  ⋮
</button>

    {String(openTransferActionId) ===
      String(transfer.id) && (
      <div
  className="tower-transfer-action-menu"
  style={{
    top: `${transferActionPosition.top}px`,
    left: `${transferActionPosition.left}px`,
  }}
  onClick={(event) => event.stopPropagation()}
>
  <button
    type="button"
    onClick={() => {
      setViewTransfer(transfer);
      setOpenTransferActionId(null);
    }}
  >
    <DetailIcon size={16} />
    <span>Full Detail</span>
  </button>

  {canManage && (
    <>
      <button
        type="button"
        onClick={() => openEditTransfer(transfer)}
      >
        <EditIcon size={16} />
        <span>Edit</span>
      </button>

      <button
        type="button"
        className="danger"
        onClick={() => {
          setDeleteTransfer(transfer);
          setOpenTransferActionId(null);
        }}
      >
        <DeleteIcon size={16} />
        <span>Delete</span>
      </button>
    </>
  )}
</div>
    )}
  </div>
</td>
                  </tr>
                );
              })}

              {currentTowerTransfers.length === 0 && (
                <tr>
                  <td
                    colSpan="10"
                    className="tower-transfer-history-empty"
                  >
                    No asset transfer has been recorded for this tower yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewTransfer && (
  <div
    className="tower-transfer-detail-backdrop"
    onClick={() => setViewTransfer(null)}
  >
    <div
  className="tower-transfer-detail-modal tower-transfer-record-modal"
  onClick={(event) => event.stopPropagation()}
>
      <div className="tower-transfer-detail-header">
        <div>
          <span>Transfer Information</span>

          <h3>
            {viewTransfer.assetId || "No Asset ID"} -{" "}
            {viewTransfer.deviceName || "Unnamed Device"}
          </h3>

          <p>Complete tower asset transfer information.</p>
        </div>

        <button
          type="button"
          onClick={() => setViewTransfer(null)}
        >
          ×
        </button>
      </div>

      <div className="tower-transfer-detail-grid">
        <div>
          <span>Transfer ID</span>
          <strong>{viewTransfer.id || "-"}</strong>
        </div>

        <div>
          <span>Batch ID</span>
          <strong>{viewTransfer.batchId || "-"}</strong>
        </div>

        <div>
          <span>Transfer Type</span>
          <strong>{viewTransfer.transferType || "-"}</strong>
        </div>

        <div>
          <span>Transfer Date</span>
          <strong>
            {formatDateTime(
              viewTransfer.transferDate,
              viewTransfer.createdAt || viewTransfer.updatedAt
            )}
          </strong>
        </div>

        <div>
          <span>Issued from</span>
          <strong>{viewTransfer.sourceTowerName || "-"}</strong>
        </div>

        <div>
          <span>Issued from Location</span>
          <strong>
            {viewTransfer.sourceTowerLocation || "-"}
          </strong>
        </div>

        <div>
          <span>Issued to</span>
          <strong>
            {viewTransfer.destinationTowerName || "-"}
          </strong>
        </div>

        <div>
          <span>Issued to Location</span>
          <strong>
            {viewTransfer.destinationTowerLocation || "-"}
          </strong>
        </div>

        <div>
          <span>Asset ID</span>
          <strong>{viewTransfer.assetId || "-"}</strong>
        </div>

        <div>
          <span>Device Name</span>
          <strong>{viewTransfer.deviceName || "-"}</strong>
        </div>

        <div>
          <span>Quantity</span>
          <strong>{getTransferQuantity(viewTransfer)}</strong>
        </div>

        <div>
          <span>Category</span>
          <strong>{viewTransfer.category || "-"}</strong>
        </div>

        <div>
          <span>Brand</span>
          <strong>{viewTransfer.brand || "-"}</strong>
        </div>

        <div>
          <span>Model</span>
          <strong>{viewTransfer.model || "-"}</strong>
        </div>

        <div>
          <span>MAC Address</span>
          <strong>{viewTransfer.macAddress || "-"}</strong>
        </div>

        <div>
          <span>Serial Number</span>
          <strong>{viewTransfer.serialNumber || "-"}</strong>
        </div>

        <div>
          <span>Transfer Status</span>
          <strong>{viewTransfer.transferStatus || "-"}</strong>
        </div>

        <div>
          <span>Responsible Person</span>
          <strong>
            {viewTransfer.responsiblePerson || "-"}
          </strong>
        </div>

        {viewTransfer.transferType === "Tower to Repair" && (
          <>
            <div>
              <span>Repair Type</span>
              <strong>{viewTransfer.repairType || "-"}</strong>
            </div>

            <div>
              <span>Repair Center</span>
              <strong>{viewTransfer.repairCenter || "-"}</strong>
            </div>

            <div>
              <span>Repair Technician</span>
              <strong>
                {viewTransfer.repairTechnician || "-"}
              </strong>
            </div>

            <div>
              <span>Repair Cost</span>
              <strong>
                {Number(
                  viewTransfer.repairCost || 0
                ).toLocaleString("en-US")}{" "}
                AFN
              </strong>
            </div>

            <div>
              <span>Sent to Repair Date</span>
              <strong>
                {formatDateTime(
                  viewTransfer.repairSentDate,
                  viewTransfer.createdAt || viewTransfer.updatedAt
                )}
              </strong>
            </div>

            <div>
              <span>Expected Return Date</span>
              <strong>
                {formatDateTime(
                  viewTransfer.expectedReturnDate,
                  viewTransfer.updatedAt || viewTransfer.createdAt
                )}
              </strong>
            </div>

            <div className="tower-transfer-detail-full">
              <span>Problem Description</span>
              <strong>
                {viewTransfer.repairProblem || "-"}
              </strong>
            </div>
          </>
        )}

        <div className="tower-transfer-detail-full">
          <span>Notes</span>
          <strong>{viewTransfer.notes || "No notes."}</strong>
        </div>

        <div>
          <span>Created At</span>
          <strong>{formatDateTime(viewTransfer.createdAt)}</strong>
        </div>

        <div>
          <span>Last Updated</span>
          <strong>{formatDateTime(viewTransfer.updatedAt)}</strong>
        </div>
      </div>

      <div className="tower-transfer-detail-footer">
        <button
          type="button"
          onClick={() => setViewTransfer(null)}
        >
          Close
        </button>

        {canManageTransfer(viewTransfer) && (
          <button
            type="button"
            onClick={() => {
              const transfer = viewTransfer;
              setViewTransfer(null);
              openEditTransfer(transfer);
            }}
          >
            Edit Transfer
          </button>
        )}
      </div>
    </div>
  </div>
)}{editTransfer && (
  <div
    className="tower-transfer-detail-backdrop"
    onClick={() => setEditTransfer(null)}
  >
    <div
  className="tower-transfer-detail-modal tower-transfer-edit-modal"
  onClick={(event) => event.stopPropagation()}
>
      <div className="tower-transfer-detail-header">
        <div>
          <span>Edit Transfer</span>

          <h3>
            {editTransfer.assetId || "-"} -{" "}
            {editTransfer.deviceName || "-"}
          </h3>

          <p>
            Update transfer route, quantity, status, and notes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditTransfer(null)}
        >
          ×
        </button>
      </div>

      <form onSubmit={saveEditedTransfer}>
        <div className="tower-transfer-form-grid">
          <div className="tower-transfer-form-group">
            <label>Transfer Type</label>

            <select
              name="transferType"
              value={editTransferForm.transferType}
              onChange={handleEditTransferChange}
            >
              <option value="Tower to Tower">Tower to Tower</option>
              <option value="Tower to Main Stock">Tower to Main Stock</option>
              <option value="Tower to Repair">Tower to Repair</option>
              <option value="Tower to Damaged / Lost">
                Tower to Damaged / Lost
              </option>
            </select>
          </div>

          <div className="tower-transfer-form-group">
            <label>Issued from</label>

            <input
              value={
                editTransfer.sourceTowerName ||
                editTransfer.sourceType ||
                "-"
              }
              readOnly
            />
          </div>

          <div className="tower-transfer-form-group">
            <label>Issued to</label>

            {editTransferForm.transferType === "Tower to Tower" ? (
              <select
                name="destinationTowerId"
                value={editTransferForm.destinationTowerId}
                onChange={handleEditTransferChange}
              >
                <option value="">Select Destination Tower</option>
                {towerAssets
                  .filter((tower) => String(tower.id || "") !== String(towerId))
                  .map((tower) => (
                    <option key={tower.id} value={tower.id}>
                      {tower.towerName || "Tower"}{" "}
                      {tower.towerLocation ? `- ${tower.towerLocation}` : ""}
                    </option>
                  ))}
              </select>
            ) : editTransferForm.transferType === "Tower to Damaged / Lost" ? (
              <select
                name="damageLostType"
                value={editTransferForm.damageLostType}
                onChange={handleEditTransferChange}
              >
                <option value="Damaged">Damaged</option>
                <option value="Lost">Lost</option>
              </select>
            ) : (
              <input
                value={
                  editTransferForm.transferType === "Tower to Main Stock"
                    ? "Main Stock"
                    : "Repair / Maintenance"
                }
                readOnly
              />
            )}
          </div>

          <div className="tower-transfer-form-group">
            <label>Quantity</label>

            <input
              type="number"
              min="1"
              name="quantity"
              value={editTransferForm.quantity}
              onChange={handleEditTransferChange}
            />
          </div>

          <div className="tower-transfer-form-group tower-transfer-full">
            <label>Asset</label>

            <input
              value={`${editTransfer.assetId || "-"} - ${
                editTransfer.deviceName || "-"
              }${
                editTransfer.serialNumber
                  ? ` / SN: ${editTransfer.serialNumber}`
                  : ""
              }${
                editTransfer.macAddress
                  ? ` / MAC: ${editTransfer.macAddress}`
                  : ""
              }`}
              readOnly
            />
          </div>

          <div className="tower-transfer-form-group">
            <label>Transfer Date</label>

            <input
              type="date"
              name="transferDate"
              value={editTransferForm.transferDate}
              onChange={handleEditTransferChange}
            />
          </div>

          <div className="tower-transfer-form-group">
            <label>Transfer Status</label>

            <select
              name="transferStatus"
              value={editTransferForm.transferStatus}
              onChange={handleEditTransferChange}
            >
              {editTransferForm.transferType ===
              "Tower to Repair" ? (
                <option value="In Repair">In Repair</option>
              ) : editTransferForm.transferType === "Tower to Damaged / Lost" ? (
                <>
                  <option value="Closed">Closed</option>
                  <option value="Pending">Pending</option>
                </>
              ) : (
                <>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="In Transit">In Transit</option>
                </>
              )}
            </select>
          </div>

          <div className="tower-transfer-form-group">
            <label>Responsible Person</label>

            <input
              name="responsiblePerson"
              value={editTransferForm.responsiblePerson}
              onChange={handleEditTransferChange}
            />
          </div>

          {editTransferForm.transferType === "Tower to Repair" && (
            <>
              <div className="tower-transfer-form-group">
                <label>Repair Type</label>

                <select
                  name="repairType"
                  value={editTransferForm.repairType}
                  onChange={handleEditTransferChange}
                >
                  <option value="Repair">Repair</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inspection">Inspection</option>
                </select>
              </div>

              <div className="tower-transfer-form-group">
                <label>Repair Center</label>

                <input
                  name="repairCenter"
                  value={editTransferForm.repairCenter}
                  onChange={handleEditTransferChange}
                />
              </div>

              <div className="tower-transfer-form-group">
                <label>Repair Technician</label>

                <input
                  name="repairTechnician"
                  value={editTransferForm.repairTechnician}
                  onChange={handleEditTransferChange}
                />
              </div>

              <div className="tower-transfer-form-group">
                <label>Repair Cost</label>

                <input
                  type="number"
                  min="0"
                  name="repairCost"
                  value={editTransferForm.repairCost}
                  onChange={handleEditTransferChange}
                />
              </div>

              <div className="tower-transfer-form-group">
                <label>Sent to Repair Date</label>

                <input
                  type="date"
                  name="repairSentDate"
                  value={editTransferForm.repairSentDate}
                  onChange={handleEditTransferChange}
                />
              </div>

              <div className="tower-transfer-form-group">
                <label>Expected Return Date</label>

                <input
                  type="date"
                  name="expectedReturnDate"
                  value={editTransferForm.expectedReturnDate}
                  onChange={handleEditTransferChange}
                />
              </div>

              <div className="tower-transfer-form-group tower-transfer-full">
                <label>Problem Description</label>

                <textarea
                  name="repairProblem"
                  value={editTransferForm.repairProblem}
                  onChange={handleEditTransferChange}
                />
              </div>
            </>
          )}

          {editTransferForm.transferType === "Tower to Damaged / Lost" && (
            <>
              <div className="tower-transfer-form-group">
                <label>Reason</label>

                <input
                  name="damageLostReason"
                  value={editTransferForm.damageLostReason}
                  onChange={handleEditTransferChange}
                />
              </div>

              <div className="tower-transfer-form-group">
                <label>Date</label>

                <input
                  type="date"
                  name="damageLostDate"
                  value={editTransferForm.damageLostDate}
                  onChange={handleEditTransferChange}
                />
              </div>

              <div className="tower-transfer-form-group">
                <label>Reported By</label>

                <input
                  name="damageLostReportedBy"
                  value={editTransferForm.damageLostReportedBy}
                  onChange={handleEditTransferChange}
                />
              </div>

              <div className="tower-transfer-form-group">
                <label>Damage / Lost Status</label>

                <select
                  name="damageLostStatus"
                  value={editTransferForm.damageLostStatus}
                  onChange={handleEditTransferChange}
                >
                  <option value="Closed">Closed</option>
                  <option value="Pending">Pending</option>
                  <option value="Investigating">Investigating</option>
                </select>
              </div>
            </>
          )}

          <div className="tower-transfer-form-group tower-transfer-full">
            <label>Notes</label>

            <textarea
              name="notes"
              value={editTransferForm.notes}
              onChange={handleEditTransferChange}
            />
          </div>
        </div>

        <div className="tower-transfer-actions">
          <button
            type="button"
            onClick={() => setEditTransfer(null)}
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
)}{deleteTransfer && (
  <div
    className="tower-transfer-detail-backdrop"
    onClick={() => setDeleteTransfer(null)}
  >
    <div
      className="tower-transfer-delete-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <h3>Delete Tower Asset Transfer</h3>

      <p>
        Are you sure you want to delete the transfer for{" "}
        <strong>
          {deleteTransfer.assetId || "-"} -{" "}
          {deleteTransfer.deviceName || "-"}
        </strong>
        ?
      </p>

      <small>
        If this is the latest transfer, the asset will be restored
        to its previous source.
      </small>

      <div>
        <button
          type="button"
          onClick={() => setDeleteTransfer(null)}
        >
          Cancel
        </button>

        <button
          type="button"
          className="danger"
          onClick={confirmDeleteTransfer}
        >
          Delete Transfer
        </button>
      </div>
    </div>
  </div>
)}

      {showTransferModal && (
        <div
          className="tower-transfer-modal-backdrop"
        >
          <div
            className="tower-transfer-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tower-transfer-modal-header">
              <div>
                <h3>Transfer Asset</h3>

                <p>
                  Transfer assets from Main Stock or between Towers.
                </p>
              </div>

              <button
                type="button"
                onClick={closeTransferModal}
              >
                ×
              </button>
            </div>

            <form
              className="tower-transfer-layout"
              onSubmit={saveTransfer}
            >
              <section className="tower-transfer-card">
                <div className="tower-transfer-card-header">
                  <h3>Transfer Information</h3>

                  <p>
                    Enter source, destination, and transfer details.
                  </p>
                </div>

                <div className="tower-transfer-form-grid">
                  <div className="tower-transfer-form-group">
                    <label>Transfer Type</label>

                    <select
                      name="transferType"
                      value={formData.transferType}
                      onChange={handleChange}
                    >

                      <option value="Tower to Tower">
                        Tower to Tower
                      </option>

                      <option value="Tower to Main Stock">
                        Tower to Main Stock
                      </option>

                      <option value="Tower to Repair">
                        Tower to Repair / Maintenance
                      </option>

                      <option value="Tower to Damaged / Lost">
                        Tower to Damaged / Lost
                      </option>
                    </select>
                  </div>

                  {formData.transferType === "Tower to Tower" && (
                    <div className="tower-transfer-form-group">
                      <label>Source Tower</label>

                      <select
                        name="sourceTowerId"
                        value={formData.sourceTowerId}
                        onChange={handleChange}
                      >
                        <option value="">
                          Select Source Tower
                        </option>

                        {towerAssets.map((tower) => (
                          <option
                            key={tower.id}
                            value={tower.id}
                          >
                            {tower.towerName || "Unnamed Tower"} -{" "}
                            {tower.towerLocation || "No Location"}
                            {String(tower.id) === String(towerId)
                              ? " (Current Tower)"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="tower-transfer-form-group">
                    <label>Issued from</label>

                    <input
                      value={
                        formData.transferType === "Main Stock to Tower"
                          ? "Main Stock"
                          : formData.transferType === "Tower to Tower"
                            ? sourceTower
                              ? `${sourceTower.towerName || "Unnamed Tower"} - ${sourceTower.towerLocation || "No Location"
                              }`
                              : "Select Source Tower"
                            : `${currentTower.towerName || "Unnamed Tower"} - ${currentTower.towerLocation || "No Location"
                            }`
                      }
                      readOnly
                    />
                  </div>

                  <div className="tower-transfer-form-group">
                    <label>Issued to</label>

                    {isTowerToTower && isCurrentTowerSource ? (
                      <select
                        name="destinationTowerId"
                        value={formData.destinationTowerId}
                        onChange={handleChange}
                      >
                        <option value="">
                          Select Destination Tower
                        </option>

                        {towerAssets
                          .filter(
                            (tower) =>
                              String(tower.id) !== String(towerId)
                          )
                          .map((tower) => (
                            <option
                              key={tower.id}
                              value={tower.id}
                            >
                              {tower.towerName || "Unnamed Tower"} -{" "}
                              {tower.towerLocation || "No Location"}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <input
                        value={
                          formData.transferType === "Tower to Main Stock"
  ? "Main Stock"
  : formData.transferType === "Tower to Repair"
    ? "Repair / Maintenance"
    : formData.transferType === "Tower to Damaged / Lost"
      ? formData.damageLostType
      : `${currentTower.towerName || "Unnamed Tower"} - ${currentTower.towerLocation || "No Location"}`
                        }
                        readOnly
                      />
                    )}
                  </div>

                  <div className="tower-transfer-form-group">
                    <label>Transfer Date</label>

                    <input
                      type="date"
                      name="transferDate"
                      value={formData.transferDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tower-transfer-form-group">
                    <label>Transfer Status</label>

                    <select
                      name="transferStatus"
                      value={formData.transferStatus}
                      onChange={handleChange}
                      disabled={isTowerToRepair}
                    >
                      {isTowerToRepair ? (
                        <option value="In Repair">
                          In Repair
                        </option>
                      ) : (
                        <>
                          <option value="Completed">
                            Completed
                          </option>

                          <option value="Pending">
                            Pending
                          </option>

                          <option value="In Transit">
                            In Transit
                          </option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="tower-transfer-form-group">
                    <label>Responsible Person</label>

                    <input
                      name="responsiblePerson"
                      value={formData.responsiblePerson}
                      onChange={handleChange}
                      placeholder="Example: Ahmad"
                    />
                  </div>

                  {formData.transferType === "Tower to Repair" && (
                    <>
                      <div className="tower-transfer-form-group">
                        <label>Repair Type</label>

                        <select
                          name="repairType"
                          value={formData.repairType}
                          onChange={handleChange}
                        >
                          <option value="Repair">Repair</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Inspection">Inspection</option>
                        </select>
                      </div>

                      <div className="tower-transfer-form-group">
                        <label>Repair Center</label>

                        <input
                          name="repairCenter"
                          value={formData.repairCenter}
                          onChange={handleChange}
                          placeholder="Example: Kabul Technical Center"
                        />
                      </div>

                      <div className="tower-transfer-form-group">
                        <label>Repair Technician</label>

                        <input
                          name="repairTechnician"
                          value={formData.repairTechnician}
                          onChange={handleChange}
                          placeholder="Technician or company name"
                        />
                      </div>

                      <div className="tower-transfer-form-group">
                        <label>Repair Cost per Asset</label>

                        <input
                          type="number"
                          min="0"
                          name="repairCost"
                          value={formData.repairCost}
                          onChange={handleChange}
                          placeholder="Example: 1500"
                        />
                      </div>

                      <div className="tower-transfer-form-group">
                        <label>Sent to Repair Date</label>

                        <input
                          type="date"
                          name="repairSentDate"
                          value={formData.repairSentDate}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="tower-transfer-form-group">
                        <label>Expected Return Date</label>

                        <input
                          type="date"
                          name="expectedReturnDate"
                          value={formData.expectedReturnDate}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="tower-transfer-form-group tower-transfer-full">
                        <label>Problem Description</label>

                        <textarea
                          name="repairProblem"
                          value={formData.repairProblem}
                          onChange={handleChange}
                          placeholder="Describe the device problem or maintenance..."
                        />
                      </div>
                    </>
                  )}

                  {formData.transferType === "Tower to Damaged / Lost" && (
  <>
    <div className="tower-transfer-form-group">
      <label>Damage / Lost Type</label>

      <select
        name="damageLostType"
        value={formData.damageLostType}
        onChange={handleChange}
      >
        <option value="Damaged">Damaged</option>
        <option value="Lost">Lost</option>
      </select>
    </div>

    <div className="tower-transfer-form-group">
      <label>Damage / Lost Date</label>

      <input
        type="date"
        name="damageLostDate"
        value={formData.damageLostDate}
        onChange={handleChange}
      />
    </div>

    <div className="tower-transfer-form-group">
      <label>Reported By</label>

      <input
        name="damageLostReportedBy"
        value={formData.damageLostReportedBy}
        onChange={handleChange}
        placeholder="Example: Technician / Admin"
      />
    </div>

    <div className="tower-transfer-form-group">
      <label>Record Status</label>

      <select
        name="damageLostStatus"
        value={formData.damageLostStatus}
        onChange={handleChange}
      >
        <option value="Closed">Closed</option>
        <option value="Pending Investigation">
          Pending Investigation
        </option>
      </select>
    </div>

    <div className="tower-transfer-form-group tower-transfer-full">
      <label>Reason / Description</label>

      <textarea
        name="damageLostReason"
        value={formData.damageLostReason}
        onChange={handleChange}
        placeholder="Describe why this asset is damaged or lost..."
      />
    </div>
  </>
)}

                  <div className="tower-transfer-form-group tower-transfer-full">
                    <label>Notes</label>

                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Transfer notes..."
                    />
                  </div>
                </div>
              </section>

              <section className="tower-transfer-card">
                <div className="tower-transfer-card-header tower-transfer-picker-header">
                  <div>
                    <h3>Select Assets</h3>

                    <p>
                      {selectedAssets.length} asset(s) selected.
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={selectAllVisible}
                    >
                      Select All Visible
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedAssetKeys([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="tower-transfer-search">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search by asset ID, device, MAC, or serial..."
                  />
                </div>

                <div className="tower-transfer-assets">
                  {filteredAssets.map((asset) => {
                    const key = getAssetKey(asset);

                    const selected = selectedAssetKeys.some(
                      (item) => String(item) === String(key)
                    );

                    return (
                      <button
                        key={key}
                        type="button"
                        className={
                          selected
                            ? "tower-transfer-asset selected"
                            : "tower-transfer-asset"
                        }
                        onClick={() => toggleAsset(asset)}
                      >
                        <span className="tower-transfer-check">
                          {selected ? "✓" : ""}
                        </span>

                        <span>
                          <strong>
                            {asset.assetId || "No Asset ID"} -{" "}
                            {asset.deviceName || "Unnamed Device"}
                          </strong>

                          <small>
                            {asset.category || "-"} /{" "}
                            {asset.macAddress || "No MAC"} /{" "}
                            {asset.serialNumber || "No Serial"}
                          </small>
                        </span>
                      </button>
                    );
                  })}

                  {filteredAssets.length === 0 && (
                    <div className="tower-transfer-empty">
                      No available asset was found.
                    </div>
                  )}
                </div>
              </section>

              {selectedAssets.length > 0 && (
                <section className="tower-transfer-selected-card">
                  <div className="tower-transfer-selected-header">
                    <div>
                      <h3>Selected Asset Details</h3>

                      <p>
                        Review all selected assets before completing the transfer.
                      </p>
                    </div>

                    <span>
                      {selectedAssets.length} Selected
                    </span>
                  </div>

                  <div className="tower-transfer-selected-table-wrap">
                    <table className="tower-transfer-selected-table">
                      <thead>
                        <tr>
                          <th>Asset ID</th>
                          <th>Category</th>
                          <th>Device Name</th>
                          <th>Brand</th>
                          <th>Model</th>
                          <th>MAC Address</th>
                          <th>Serial Number</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedAssets.map((asset) => (
                          <tr key={getAssetKey(asset)}>
                            <td>
                              <strong>{asset.assetId || "-"}</strong>
                            </td>

                            <td>{asset.category || "-"}</td>

                            <td>{asset.deviceName || "-"}</td>

                            <td>{asset.brand || "-"}</td>

                            <td>{asset.model || "-"}</td>

                            <td>{asset.macAddress || "-"}</td>

                            <td>{asset.serialNumber || "-"}</td>

                            <td>{asset.status || "Unknown"}</td>

                            <td>
                              <div className="tower-transfer-selected-actions">
                                <button
                                  type="button"
                                  className="tower-transfer-full-detail-btn"
                                  onClick={() => setViewAsset(asset)}
                                >
                                  Full Detail
                                </button>

                                <button
                                  type="button"
                                  className="tower-transfer-remove-btn"
                                  onClick={() => removeSelectedAsset(asset)}
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <div className="tower-transfer-actions">
                <button
                  type="button"
                  onClick={closeTransferModal}
                >
                  Cancel
                </button>

                <button type="submit">
                  Transfer{" "}
                  {selectedAssets.length || "Selected"} Asset
                  {selectedAssets.length === 1 ? "" : "s"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewAsset && (
        <div
          className="tower-transfer-detail-backdrop"
          onClick={() => setViewAsset(null)}
        >
          <div
            className="tower-transfer-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tower-transfer-detail-header">
              <div>
                <span>Asset Information</span>

                <h3>
                  {viewAsset.assetId || "No Asset ID"} -{" "}
                  {viewAsset.deviceName || "Unnamed Device"}
                </h3>

                <p>
                  Complete information for the selected asset.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewAsset(null)}
              >
                ×
              </button>
            </div>

            <div className="tower-transfer-detail-grid">
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
                <span>Unit Price</span>
                <strong>
                  {Number(viewAsset.unitPrice || 0).toLocaleString("en-US")} AFN
                </strong>
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
                <strong>{viewAsset.location || "-"}</strong>
              </div>

              <div>
                <span>Current Status</span>
                <strong>{viewAsset.status || "Unknown"}</strong>
              </div>

              <div>
                <span>Current Tower</span>
                <strong>{viewAsset.towerName || "-"}</strong>
              </div>

              <div>
                <span>Previous Tower</span>
                <strong>{viewAsset.previousTowerName || "-"}</strong>
              </div>

              <div>
                <span>Last Tower Transfer Date</span>
                <strong>
                  {formatDateTime(
                    viewAsset.lastTowerTransferDate,
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

              <div className="tower-transfer-detail-full">
                <span>Notes</span>

                <strong>
                  {viewAsset.notes ||
                    "No notes have been added for this asset."}
                </strong>
              </div>
            </div>

            <div className="tower-transfer-detail-footer">
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
    </div>
  );
}

export default TowerAssetTransfer;
