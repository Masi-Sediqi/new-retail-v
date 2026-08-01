import { useMemo, useState } from "react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { formatDateTime, todayDateValue } from "../utils/afghanDate";
import "./Repair.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");
const keyOf = (value) => String(value || "");

const emptyResultForm = {
  repairStatus: "Fixed",
  repairCost: "",
  resultDate: todayDateValue(),
  quantity: "1",
  sendTo: "Main Stock",
  destinationId: "",
  customerDeal: "Leased / Deposit",
  salePricePerQuantity: "",
  paidAmount: "",
  depositAmount: "",
  depositReceivedAmount: "",
  depositStatus: "Not Received",
  responsibleUser: "",
  note: "",
};

const getAssetUnit = (asset) =>
  asset?.purchaseUsageUnit || asset?.purchaseUnit || asset?.usageUnit || "Piece";

const isIndividualAsset = (asset) =>
  String(asset?.identityTracking || "").toLowerCase().includes("individual");

const destinationStatus = (destinationType) => {
  if (destinationType === "Main Stock") return "In Stock";
  if (destinationType === "Tower") return "At Tower";
  if (destinationType === "Customer") return "Issued";
  return "Under Repair";
};

const locationName = (type, id, towers, customers) => {
  if (type === "Main Stock") return "Main Stock";

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
      ? [customer.customerId, customer.customerName || customer.fullName || customer.name]
          .filter(Boolean)
          .join(" - ")
      : "Customer";
  }

  return "Repair";
};

export default function Repair() {
  const [assets, setAssets] = useJsonCollection("assets");
  const [deviceTransfers, setDeviceTransfers] = useJsonCollection("deviceTransfers");
  const [deviceHistory, setDeviceHistory] = useJsonCollection("deviceHistory");
  const [transactions, setTransactions] = useJsonCollection("transactions");
  const [towers] = useJsonCollection("towerAssets");
  const [customers] = useJsonCollection("customers");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [resultTransfer, setResultTransfer] = useState(null);
  const [resultForm, setResultForm] = useState(emptyResultForm);
  const [activeRepairView, setActiveRepairView] = useState("");

  const repairRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return [...deviceTransfers]
      .filter((transfer) => {
        const isRepair =
          Boolean(transfer.repairResult) ||
          String(transfer.destinationType || "").toLowerCase() === "repair" ||
          String(transfer.transferType || "").toLowerCase().includes("-> repair");

        if (!isRepair) return false;

        const resultStatus = transfer.repairResult?.repairStatus || "Pending";
        const matchesStatus = statusFilter === "All" || resultStatus === statusFilter;
        const haystack = [
          transfer.assetId,
          transfer.deviceName,
          transfer.sourceLocation,
          transfer.responsibleUser,
          transfer.referenceNumber,
        ]
          .join(" ")
          .toLowerCase();

        return matchesStatus && (!keyword || haystack.includes(keyword));
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [deviceTransfers, search, statusFilter]);

  const stats = useMemo(() => {
    const pending = repairRows.filter((row) => !row.repairResult).length;
    const fixed = repairRows.filter((row) => row.repairResult?.repairStatus === "Fixed").length;
    const notFixed = repairRows.filter((row) => row.repairResult?.repairStatus === "Not Fixed").length;
    const sentByRepair = repairRows.filter((row) => Boolean(row.repairResult)).length;
    const cost = repairRows.reduce(
      (sum, row) => sum + Number(row.repairResult?.repairCost || 0),
      0
    );

    return { pending, fixed, notFixed, sentByRepair, cost };
  }, [repairRows]);

  const repairDetailRows = useMemo(() => {
    if (activeRepairView === "current") {
      return repairRows
        .filter((row) => !row.repairResult)
        .map((row) => ({
          ...row,
          detailDate: row.transferDate || row.createdAt,
          detailFrom: row.sourceLocation || row.sourceType || "-",
          detailTo: "Repair",
          detailStatus: "Under Repair",
        }));
    }

    if (activeRepairView === "sent") {
      return repairRows
        .filter((row) => Boolean(row.repairResult))
        .map((row) => ({
          ...row,
          detailDate: row.repairResult?.resultDate || row.updatedAt || row.createdAt,
          detailFrom: "Repair",
          detailTo: row.repairResult?.destinationLocation || row.repairResult?.sendTo || "-",
          detailStatus: row.repairResult?.repairStatus || "-",
        }));
    }

    return [];
  }, [activeRepairView, repairRows]);

  const repairDetailTitle =
    activeRepairView === "current"
      ? "Assets Currently Under Repair"
      : "Assets Sent By Repair";

  const repairDetailDescription =
    activeRepairView === "current"
      ? "Assets that are still waiting for a repair result."
      : "Assets that repair has sent onward after recording a result.";

  const openResultModal = (transfer) => {
    const result = transfer.repairResult || {};
    setResultTransfer(transfer);
    setResultForm({
      repairStatus: result.repairStatus || "Fixed",
      repairCost: String(result.repairCost || ""),
      resultDate: result.resultDate || todayDateValue(),
      quantity: String(result.quantity || transfer.quantity || 1),
      sendTo: result.sendTo || "Main Stock",
      destinationId: result.destinationRecordId || "",
      customerDeal: "Leased / Deposit",
      salePricePerQuantity: String(result.salePricePerQuantity || transfer.salePricePerQuantity || transfer.salePrice || transfer.unitPrice || ""),
      paidAmount: String(result.paidAmount || ""),
      depositAmount: String(result.depositAmount || ""),
      depositReceivedAmount: String(result.depositReceivedAmount || ""),
      depositStatus: result.depositStatus || "Not Received",
      responsibleUser: result.responsibleUser || "",
      note: result.note || "",
    });
  };

  const closeResultModal = () => {
    setResultTransfer(null);
    setResultForm(emptyResultForm);
  };

  const updateAssetForRepairResult = (asset, transfer, result, reverse = false) => {
    const quantity = Number(result.quantity || 0);
    const sign = reverse ? -1 : 1;
    const resultDestination = result.sendTo || "Main Stock";
    const resultLocation = reverse
      ? "Repair"
      : locationName(resultDestination, result.destinationRecordId, towers, customers);
    const nextStatus = reverse ? "Under Repair" : destinationStatus(resultDestination);

    const matchesAsset =
      keyOf(asset.id || asset.assetId) === keyOf(transfer.assetRecordId || transfer.assetId) ||
      keyOf(asset.assetId) === keyOf(transfer.assetId);

    if (!matchesAsset) return asset;

    const nextIdentityRecords = Array.isArray(asset.identityRecords)
      ? asset.identityRecords.map((record) => {
          const matchesUnit =
            transfer.unitRecordId &&
            keyOf(record.id) === keyOf(transfer.unitRecordId);

          if (!matchesUnit) return record;

          return {
            ...record,
            location: resultLocation,
            status: nextStatus,
            towerRecordId: !reverse && resultDestination === "Tower" ? result.destinationRecordId : "",
            customerRecordId:
              !reverse && resultDestination === "Customer" ? result.destinationRecordId : "",
            updatedAt: new Date().toISOString(),
          };
        })
      : asset.identityRecords;

    let nextQuantity = Number(asset.quantity || 0);
    if (resultDestination === "Main Stock") {
      nextQuantity += sign * quantity;
    }

    nextQuantity = Math.max(nextQuantity, 0);

    const wholeAssetMoves = !isIndividualAsset(asset) && resultDestination !== "Main Stock";

    return {
      ...asset,
      quantity: nextQuantity,
      location: reverse ? "Repair" : wholeAssetMoves ? resultLocation : asset.location || "Main Stock",
      status: reverse
        ? "Under Repair"
        : wholeAssetMoves
          ? nextStatus
          : nextQuantity > 0
            ? "In Stock"
            : nextStatus,
      towerRecordId:
        !reverse && wholeAssetMoves && resultDestination === "Tower"
          ? result.destinationRecordId
          : asset.towerRecordId || "",
      customerRecordId:
        !reverse && wholeAssetMoves && resultDestination === "Customer"
          ? result.destinationRecordId
          : asset.customerRecordId || "",
      identityRecords: nextIdentityRecords,
      updatedAt: new Date().toISOString(),
    };
  };

  const upsertRepairExpense = async (transfer, result) => {
    const amount = Number(result.repairCost || 0);
    const referenceId = transfer.transferId || transfer.id;

    return setTransactions((previous) => [
      ...previous.filter(
        (transaction) =>
          !(
            transaction.source === "repair-result" &&
            keyOf(transaction.referenceId) === keyOf(referenceId)
          )
      ),
      ...(amount > 0
        ? [
            {
              id: `repair-result-expense-${referenceId}`,
              type: "expense",
              title: `Repair Cost - ${transfer.assetId || "Asset"}`,
              category: "Repair",
              amount,
              date: result.resultDate,
              description: [
                `Status: ${result.repairStatus}`,
                `Send To: ${result.sendTo}`,
                result.note || "",
              ]
                .filter(Boolean)
                .join(" | "),
              source: "repair-result",
              referenceId,
              assetId: transfer.assetId || "",
              deviceName: transfer.deviceName || "",
              createdAt: transfer.repairResult?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]
        : []),
    ]);
  };

  const upsertRepairCustomerIncome = async (transfer, result) => {
    const amount = Number(result.paidAmount || 0);
    const referenceId = transfer.transferId || transfer.id;

    return setTransactions((previous) => [
      ...previous.filter(
        (transaction) =>
          !(
            transaction.source === "repair-customer-sale" &&
            keyOf(transaction.referenceId) === keyOf(referenceId)
          )
      ),
      ...(result.customerDeal === "Sold" && amount > 0
        ? [
            {
              id: `repair-customer-sale-income-${referenceId}`,
              type: "income",
              title: `Device Sale After Repair - ${transfer.assetId || "Asset"}`,
              category: "Device Sale",
              amount,
              date: result.resultDate,
              description: [
                `Customer: ${result.destinationLocation}`,
                `Total: ${money(result.totalAmount)} AFN`,
                `Paid: ${money(result.paidAmount)} AFN`,
                `Remaining: ${money(result.remainingAmount)} AFN`,
              ].join(" | "),
              source: "repair-customer-sale",
              referenceId,
              customerRecordId: result.destinationRecordId || "",
              assetId: transfer.assetId || "",
              deviceName: transfer.deviceName || "",
              createdAt: transfer.repairResult?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]
        : []),
    ]);
  };

  const saveRepairResult = async (event) => {
    event.preventDefault();
    if (!resultTransfer) return;

    const quantity = Number(resultTransfer.quantity || 1);
    const maxQuantity = Number(resultTransfer.quantity || 0);
    const repairCost = Number(resultForm.repairCost || 0);
    const salePricePerQuantity = 0;
    const totalAmount = 0;
    const paidAmount = 0;
    const depositAmount = Number(resultForm.depositAmount || 0);
    const depositReceivedAmount = 0;

    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > maxQuantity) {
      notify(`Quantity must be between 1 and ${money(maxQuantity)}.`, "error");
      return;
    }

    if (!Number.isFinite(repairCost) || repairCost < 0) {
      notify("Repair cost cannot be negative.", "error");
      return;
    }

    if (
      resultForm.repairStatus === "Fixed" &&
      ["Tower", "Customer"].includes(resultForm.sendTo) &&
      !resultForm.destinationId
    ) {
      notify(`Please select a ${resultForm.sendTo}.`, "error");
      return;
    }

    const sendTo = resultForm.repairStatus === "Fixed" ? resultForm.sendTo : "Repair";

    const now = new Date().toISOString();
    const previousResult = resultTransfer.repairResult || null;
    const result = {
      repairStatus: resultForm.repairStatus,
      repairCost,
      resultDate: resultForm.resultDate,
      quantity,
      unit: resultTransfer.unit || "Piece",
      sendTo,
      destinationRecordId: sendTo === "Customer" || sendTo === "Tower" ? resultForm.destinationId : "",
      destinationLocation: locationName(sendTo, resultForm.destinationId, towers, customers),
      customerDeal: sendTo === "Customer" ? "Leased / Deposit" : "",
      ownershipType:
        sendTo === "Customer"
          ? "Leased"
          : "",
      salePricePerQuantity: 0,
      totalAmount: 0,
      salePrice: 0,
      paidAmount: 0,
      remainingAmount: 0,
      depositAmount:
        sendTo === "Customer"
          ? depositAmount
          : 0,
      depositReceivedAmount:
        0,
      remainingDeposit: 0,
      depositStatus:
        sendTo === "Customer"
          ? resultForm.depositStatus
          : "",
      responsibleUser: "",
      note: resultForm.note.trim(),
      createdAt: previousResult?.createdAt || now,
      updatedAt: now,
    };

    let nextAssets = assets;
    if (previousResult) {
      nextAssets = nextAssets.map((asset) =>
        updateAssetForRepairResult(asset, resultTransfer, previousResult, true)
      );
    }

    nextAssets = nextAssets.map((asset) =>
      updateAssetForRepairResult(asset, resultTransfer, result, false)
    );

    const assetsSaved = await setAssets(nextAssets);
    if (!assetsSaved) return;

    const nextTransfers = deviceTransfers.map((transfer) =>
      keyOf(transfer.id) === keyOf(resultTransfer.id)
        ? {
            ...transfer,
            repairResult: result,
            repairStatus: result.repairStatus,
            repairCost: result.repairCost,
            resultDate: result.resultDate,
            transferType: `Repair -> ${result.sendTo}`,
            sourceType: "Repair",
            sourceLocation: "Repair",
            sourceRecordId: "",
            fromType: "Repair",
            currentRepairDestination: result.destinationLocation,
            destinationType: result.sendTo,
            destinationRecordId: result.destinationRecordId,
            destinationLocation: result.destinationLocation,
            toCustomerRecordId: result.sendTo === "Customer" ? result.destinationRecordId : transfer.toCustomerRecordId || "",
            toCustomerId:
              result.sendTo === "Customer"
                ? customers.find((item) => keyOf(item.id || item.customerId) === keyOf(result.destinationRecordId))?.customerId || ""
                : transfer.toCustomerId || "",
            toCustomerName:
              result.sendTo === "Customer" ? result.destinationLocation : transfer.toCustomerName || "",
            ownershipType: result.ownershipType || transfer.ownershipType || "",
            dealType: result.customerDeal || transfer.dealType || "",
            salePricePerQuantity: result.salePricePerQuantity,
            totalAmount: result.totalAmount,
            salePrice: result.salePrice,
            paidAmount: result.paidAmount,
            remainingAmount: result.remainingAmount,
            depositAmount: result.depositAmount,
            depositReceivedAmount: result.depositReceivedAmount,
            remainingDeposit: result.remainingDeposit,
            depositStatus: result.depositStatus,
            status: result.sendTo === "Customer" ? "Issued" : transfer.status,
            updatedAt: now,
          }
        : transfer
    );

    const transfersSaved = await setDeviceTransfers(nextTransfers);
    if (!transfersSaved) return;

    const referenceId = resultTransfer.transferId || resultTransfer.id;
    const historyRecord = {
      ...resultTransfer,
      id: `repair-result-history-${referenceId}`,
      historyType: "Repair Result",
      transferType: `Repair -> ${result.sendTo}`,
      sourceLocation: "Repair",
      destinationLocation: result.destinationLocation,
      destinationType: result.sendTo,
      quantity: result.quantity,
      unit: result.unit,
      previousStatus: "Under Repair",
      newStatus: result.repairStatus === "Fixed" ? destinationStatus(result.sendTo) : "Not Fixed",
      repairResult: result,
      locked: true,
      immutable: true,
      createdAt: now,
    };

    const historySaved = await setDeviceHistory([
      ...deviceHistory.filter((item) => keyOf(item.id) !== keyOf(historyRecord.id)),
      historyRecord,
    ]);
    if (!historySaved) return;

    const expenseSaved = await upsertRepairExpense(resultTransfer, result);
    if (!expenseSaved) {
      notify("Repair result saved, but its expense could not be linked.", "error");
      return;
    }

    const customerIncomeSaved = await upsertRepairCustomerIncome(resultTransfer, result);
    if (!customerIncomeSaved) {
      notify("Repair result saved, but customer sale income could not be linked.", "error");
      return;
    }

    notify("Repair result saved successfully.");
    closeResultModal();
  };

  return (
    <div className="repair-page">
      <div className="repair-header">
        <div>
          <span>Repair</span>
          <h1>Repair Management</h1>
          <p>Track all assets sent to repair, record results, and send repaired assets to the next location.</p>
        </div>
      </div>

      <section className="repair-stats">
        <div
          className="repair-clickable-stat"
          role="button"
          tabIndex={0}
          onClick={() => setActiveRepairView("current")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setActiveRepairView("current");
            }
          }}
        >
          <span>Assets Currently Under Repair</span>
          <strong>{stats.pending}</strong>
          <p>Click to view date and sender</p>
        </div>
        <div>
          <span>Total Assets Sent To Repair</span>
          <strong>{repairRows.length}</strong>
          <p className="repair-thin-lines">
            <small>Fixed: {stats.fixed}</small>
            <small>Not Fixed: {stats.notFixed}</small>
          </p>
        </div>
        <div
          className="repair-clickable-stat"
          role="button"
          tabIndex={0}
          onClick={() => setActiveRepairView("sent")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setActiveRepairView("sent");
            }
          }}
        >
          <span>Assets Sent By Repair</span>
          <strong>{stats.sentByRepair}</strong>
          <p>Click to view destination and date</p>
        </div>
      </section>

      {activeRepairView && (
        <section className="repair-card repair-detail-card">
          <div className="repair-card-header">
            <div>
              <h3>{repairDetailTitle}</h3>
              <p>{repairDetailDescription}</p>
            </div>
          </div>

          <div className="repair-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Issued from</th>
                  <th>Issued to</th>
                  <th>Sent By</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {repairDetailRows.map((transfer) => (
                  <tr key={`repair-detail-${transfer.id || transfer.transferId}`}>
                    <td>{formatDateTime(transfer.detailDate, transfer.createdAt)}</td>
                    <td>{transfer.referenceNumber || transfer.transferId || "-"}</td>
                    <td title={`${transfer.category || "-"} - ${transfer.assetId || "-"} - ${transfer.deviceName || "-"}`}>
                      {transfer.category || "-"} - {transfer.assetId || "-"} - {transfer.deviceName || "-"}
                    </td>
                    <td>{transfer.category || "-"}</td>
                    <td>{transfer.detailFrom || "-"}</td>
                    <td>{transfer.detailTo || "-"}</td>
                    <td>{transfer.responsibleUser || transfer.sourceLocation || "-"}</td>
                    <td>{money(transfer.quantity)} {transfer.unit || "Piece"}</td>
                    <td>{transfer.detailStatus || "-"}</td>
                  </tr>
                ))}

                {repairDetailRows.length === 0 && (
                  <tr>
                    <td colSpan="9" className="repair-empty">No asset was found for this view.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="repair-card">
        <div className="repair-card-header">
          <div>
            <h3>Assets Sent To Repair</h3>
            <p>Every row shows which source sent the asset to repair.</p>
          </div>
          <div className="repair-controls">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Fixed">Fixed</option>
              <option value="Not Fixed">Not Fixed</option>
            </select>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search asset, source, reference..."
            />
          </div>
        </div>

        <div className="repair-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Asset</th>
                <th>Tracking</th>
                <th>Issued from Section</th>
                <th>Sent By</th>
                <th>Quantity</th>
                <th>Repair Status</th>
                <th>Repair Cost</th>
                <th>Current Issued to</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {repairRows.map((transfer) => {
                const result = transfer.repairResult || null;
                return (
                  <tr key={transfer.id || transfer.transferId}>
                    <td>{formatDateTime(transfer.transferDate || transfer.createdAt, transfer.createdAt)}</td>
                    <td>{transfer.referenceNumber || transfer.transferId || "-"}</td>
                    <td title={`${transfer.category || "-"} - ${transfer.assetId || "-"} - ${transfer.deviceName || "-"}`}>
                      {transfer.category || "-"} - {transfer.assetId || "-"} - {transfer.deviceName || "-"}
                    </td>
                    <td><span className="repair-pill">{transfer.trackingType || "-"}</span></td>
                    <td>{transfer.sourceType || "-"}</td>
                    <td>{transfer.sourceLocation || "-"}</td>
                    <td>{money(transfer.quantity)} {transfer.unit || "Piece"}</td>
                    <td>
                      <span className={`repair-status ${result?.repairStatus === "Fixed" ? "fixed" : result?.repairStatus === "Not Fixed" ? "not-fixed" : "pending"}`}>
                        {result?.repairStatus || "Pending"}
                      </span>
                    </td>
                    <td>{result ? `${money(result.repairCost)} AFN` : "-"}</td>
                    <td>{result?.destinationLocation || "Repair"}</td>
                    <td>
                      <button type="button" className="repair-result-btn" onClick={() => openResultModal(transfer)}>
                        Repair Result
                      </button>
                    </td>
                  </tr>
                );
              })}

              {repairRows.length === 0 && (
                <tr>
                  <td colSpan="11" className="repair-empty">No asset has been sent to repair yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {resultTransfer && (
        <div className="repair-modal-backdrop">
          <div className="repair-modal">
            <div className="repair-modal-header">
              <div>
                <h3>Repair Result</h3>
                <p>{resultTransfer.assetId} - {resultTransfer.deviceName}</p>
              </div>
              <button type="button" onClick={closeResultModal}>×</button>
            </div>

            <form onSubmit={saveRepairResult}>
              <div className="repair-form-grid">
                <label>
                  Repair Status
                  <select
                    value={resultForm.repairStatus}
                    onChange={(event) =>
                      setResultForm((previous) => ({
                        ...previous,
                        repairStatus: event.target.value,
                        sendTo:
                          event.target.value === "Not Fixed"
                            ? "Repair"
                            : previous.sendTo === "Repair"
                              ? "Main Stock"
                              : previous.sendTo,
                        destinationId:
                          event.target.value === "Not Fixed"
                            ? ""
                            : previous.destinationId,
                      }))
                    }
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Not Fixed">Not Fixed</option>
                  </select>
                </label>

                <label>
                  Repair Cost
                  <input
                    type="number"
                    min="0"
                    value={resultForm.repairCost}
                    onChange={(event) => setResultForm((previous) => ({ ...previous, repairCost: event.target.value }))}
                    placeholder="Example: 500"
                  />
                </label>

                <label>
                  Result Date
                  <input
                    type="date"
                    value={resultForm.resultDate}
                    onChange={(event) => setResultForm((previous) => ({ ...previous, resultDate: event.target.value }))}
                  />
                </label>

                {resultForm.repairStatus === "Fixed" && (
                  <label>
                    Send To
                    <select
                      value={resultForm.sendTo}
                      onChange={(event) => setResultForm((previous) => ({ ...previous, sendTo: event.target.value, destinationId: "" }))}
                    >
                      <option value="Main Stock">Main Stock</option>
                      <option value="Tower">Tower</option>
                      <option value="Customer">Customer</option>
                    </select>
                  </label>
                )}

                {resultForm.repairStatus === "Fixed" && resultForm.sendTo === "Tower" && (
                  <label>
                    Select Tower
                    <select
                      value={resultForm.destinationId}
                      onChange={(event) => setResultForm((previous) => ({ ...previous, destinationId: event.target.value }))}
                    >
                      <option value="">Select Tower</option>
                      {towers.map((tower) => (
                        <option key={tower.id || tower.towerName} value={tower.id || tower.towerName}>
                          {tower.towerName || "Tower"}{tower.towerLocation ? ` - ${tower.towerLocation}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {resultForm.repairStatus === "Fixed" && resultForm.sendTo === "Customer" && (
                  <>
                    <label>
                      Select Customer
                      <select
                        value={resultForm.destinationId}
                        onChange={(event) => setResultForm((previous) => ({ ...previous, destinationId: event.target.value }))}
                      >
                        <option value="">Select Customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id || customer.customerId} value={customer.id || customer.customerId}>
                            {[customer.customerId, customer.customerName || customer.fullName || customer.name].filter(Boolean).join(" - ")}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Deposit Amount
                      <input
                        type="number"
                        min="0"
                        value={resultForm.depositAmount}
                        onChange={(event) => setResultForm((previous) => ({ ...previous, depositAmount: event.target.value }))}
                      />
                    </label>

                    <label>
                      Deposit Status
                      <select
                        value={resultForm.depositStatus}
                        onChange={(event) => setResultForm((previous) => ({ ...previous, depositStatus: event.target.value }))}
                      >
                        <option value="Not Received">Not Received</option>
                        <option value="Partially Received">Partially Received</option>
                        <option value="Full Received">Full Received</option>
                        <option value="Held">Held</option>
                        <option value="Outstanding">Outstanding</option>
                      </select>
                    </label>
                  </>
                )}

                <label className="repair-form-full">
                  Note
                  <textarea
                    value={resultForm.note}
                    onChange={(event) => setResultForm((previous) => ({ ...previous, note: event.target.value }))}
                    placeholder="Repair result notes..."
                  />
                </label>
              </div>

              <div className="repair-modal-actions">
                <button type="button" onClick={closeResultModal}>Cancel</button>
                <button type="submit">Save Repair Result</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
