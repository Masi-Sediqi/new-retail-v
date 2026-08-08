import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import { formatDateTime } from "../utils/afghanDate";
import { LedgerAmount } from "../utils/ledgerDisplay";
import "./CustomerDetails.css";

function money(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function getPaymentDirection(payment) {
  return payment?.direction || payment?.paymentDirection || "customer-to-us";
}

function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customers, setCustomers, , customersLoaded] = useJsonCollection("customers");
  const [billingInvoices, , , invoicesLoaded] = useJsonCollection("billingInvoices");
  const [customerPackages, setCustomerPackages, , packagesLoaded] =
    useJsonCollection("customerPackages");
  const [customerPayments, setCustomerPayments, , paymentsLoaded] =
    useJsonCollection("customerPayments");
  const [deviceTransfers, , , transfersLoaded] =
    useJsonCollection("deviceTransfers");
  const [customerDeviceBuybacks, setCustomerDeviceBuybacks, , buybacksLoaded] =
    useJsonCollection("customerDeviceBuybacks");
  const [customerDisconnections, setCustomerDisconnections] =
    useJsonCollection("disconnections");
  const [, setTransactions] = useJsonCollection("transactions");

  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBuybackModal, setShowBuybackModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [buybackForm, setBuybackForm] = useState({
    purchaseDate: new Date().toISOString().slice(0, 10),
    selectedTransferIds: [],
    purchasePrices: {},
    purchasedBy: "",
    paidAmount: "",
    notes: "",
  });

  const [openPackageAction, setOpenPackageAction] = useState(null);
  const [packageActionPosition, setPackageActionPosition] = useState({
    top: 0,
    left: 0,
  });

  const [openPaymentAction, setOpenPaymentAction] = useState(null);
  const [paymentActionPosition, setPaymentActionPosition] = useState({
    top: 0,
    left: 0,
  });

  const [editPackage, setEditPackage] = useState(null);
  const [deletePackage, setDeletePackage] = useState(null);

  const [editPayment, setEditPayment] = useState(null);
  const [deletePayment, setDeletePayment] = useState(null);

  const [editPackageForm, setEditPackageForm] = useState({
    packageName: "",
    speed: "",
    packagePrice: "",
    paidAmount: "",
    remainAmount: "",
    startDate: "",
    endDate: "",
    status: "Active",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    direction: "customer-to-us",
    amount: "",
    method: "Cash",
    notes: "",
  });

  const [disconnectForm, setDisconnectForm] = useState({
    disconnectionDate: new Date().toISOString().slice(0, 10),
    disconnectionReason: "",
    notes: "",
    devices: {},
  });

  const [reconnectForm, setReconnectForm] = useState({
    reconnectDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const customer = customers.find(
    (item) =>
      String(item.id) === String(id) ||
      String(item.customerId) === String(id)
  );

  const packages = customer
    ? customerPackages.filter(
        (item) =>
          String(item.customerId) === String(customer.customerId) ||
          String(item.customerRecordId) === String(customer.id)
      )
    : [];

  const billingSales = customer
    ? billingInvoices.filter((item) => {
        const invoiceCustomerId = String(item.customerId || item.customerRecordId || "");
        const invoiceCustomerName = String(item.customerName || "").trim().toLowerCase();
        const customerName = String(customer.customerName || customer.name || "").trim().toLowerCase();
        return (
          invoiceCustomerId === String(customer.customerId || "") ||
          invoiceCustomerId === String(customer.id || "") ||
          (!invoiceCustomerId && invoiceCustomerName && invoiceCustomerName === customerName)
        );
      })
    : [];

  const today = new Date().toISOString().slice(0, 10);
  const activePackages = packages.filter(
    (item) => String(item.status || "").toLowerCase() === "active"
  );
  const expiredActivePackages = activePackages.filter(
    (item) => item.endDate && String(item.endDate) < today
  );

  const customerPaymentRecords = customer
    ? customerPayments.filter(
        (item) =>
          String(item.customerId) === String(customer.customerId) ||
          String(item.customerRecordId) === String(customer.id)
      )
    : [];

  const soldDeviceTransfers = customer
    ? deviceTransfers.filter(
        (item) =>
          item.ownershipType === "Sold" &&
          (String(item.toCustomerId || "") === String(customer.customerId) ||
            String(item.toCustomerRecordId || "") === String(customer.id))
      )
    : [];

  const customerDamageTransfers = customer
    ? deviceTransfers.filter(
        (item) =>
          item.sourceType === "Customer" &&
          item.destinationType === "Waste" &&
          Number(item.customerDamageAmount || 0) > 0 &&
          (String(item.fromCustomerId || "") === String(customer.customerId) ||
            String(item.fromCustomerRecordId || "") === String(customer.id) ||
            String(item.sourceRecordId || "") === String(customer.id) ||
            String(item.sourceRecordId || "") === String(customer.customerId))
      )
    : [];

  const companyPayableDeviceTransfers = customer
    ? deviceTransfers.filter(
        (item) =>
          Number(item.customerPayableAmount || item.remainingDeposit || 0) > 0 &&
          (item.companyOwesCustomer || Number(item.customerPayableAmount || 0) > 0) &&
          (String(item.fromCustomerId || "") === String(customer.customerId) ||
            String(item.fromCustomerRecordId || "") === String(customer.id) ||
            String(item.sourceRecordId || "") === String(customer.id) ||
            String(item.sourceRecordId || "") === String(customer.customerId))
      )
    : [];

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

  const buybackAvailableDevices = soldDeviceTransfers.filter(
    (item) => !boughtBackTransferIds.has(String(item.id || ""))
  );

  const customerCurrentDevices = customer
    ? Array.from(
        deviceTransfers
          .filter((item) => {
            const recordKind =
              item.summaryType ||
              item.issueStatus ||
              item.transferType ||
              item.ownershipType ||
              item.dealType ||
              "";

            return (
              !item.isSummaryRecord &&
              !item.summaryType &&
              !["Deposit", "Withdrawal"].includes(String(recordKind)) &&
              Number(item.quantity || 0) > 0 &&
              Boolean(item.assetRecordId || item.assetId || item.unitRecordId)
            );
          })
          .reduce((map, item) => {
            const incoming =
              item.destinationType === "Customer" &&
              (String(item.toCustomerId || "") === String(customer.customerId) ||
                String(item.toCustomerRecordId || "") === String(customer.id) ||
                String(item.destinationRecordId || "") === String(customer.id) ||
                String(item.destinationRecordId || "") === String(customer.customerId));
            const outgoing =
              item.sourceType === "Customer" &&
              (String(item.fromCustomerId || "") === String(customer.customerId) ||
                String(item.fromCustomerRecordId || "") === String(customer.id) ||
                String(item.sourceRecordId || "") === String(customer.id) ||
                String(item.sourceRecordId || "") === String(customer.customerId));

            if (!incoming && !outgoing) return map;

            const assetKey = [
              item.assetRecordId || item.assetId,
              item.unitRecordId || item.serialNumber || item.macAddress || "bulk",
            ].join("::");
            const previous = map.get(assetKey) || {
              id: assetKey,
              transferId: item.id,
              assetId: item.assetId || "",
              deviceName: item.deviceName || item.assetName || "",
              model: item.model || "",
              macAddress: item.macAddress || "",
              serialNumber: item.serialNumber || "",
              quantity: 0,
              ownershipType: item.ownershipType || item.dealType || "-",
              status: item.status || item.transferStatus || item.newStatus || "Issued",
            };

            map.set(assetKey, {
              ...previous,
              ...item,
              id: assetKey,
              transferId: item.id,
              quantity:
                Number(previous.quantity || 0) +
                Number(item.quantity || 0) * (incoming ? 1 : -1),
              ownershipType: item.ownershipType || item.dealType || previous.ownershipType || "-",
              status: incoming
                ? item.status || item.transferStatus || item.newStatus || "Issued"
                : previous.status,
            });

            return map;
          }, new Map())
          .values()
      ).filter((item) => Number(item.quantity || 0) > 0)
    : [];

  const resetDisconnectForm = () => {
    const devices = {};
    customerCurrentDevices.forEach((device) => {
      devices[String(device.id)] = {
        recoveryStatus: "Pending Collection",
        collectionDate: "",
        collectedBy: "",
        deviceCondition: "",
        pendingDevices: device.deviceName || device.assetId || "",
        notes: "",
      };
    });

    setDisconnectForm({
      disconnectionDate: new Date().toISOString().slice(0, 10),
      disconnectionReason: "",
      notes: "",
      devices,
    });
  };

  const updateDisconnectDevice = (deviceId, field, value) => {
    setDisconnectForm((previous) => ({
      ...previous,
      devices: {
        ...previous.devices,
        [String(deviceId)]: {
          ...(previous.devices[String(deviceId)] || {}),
          [field]: value,
        },
      },
    }));
  };

  const saveDisconnect = async (event) => {
    event.preventDefault();

    if (!customer) return;

    const devices = customerCurrentDevices.map((device) => {
      const deviceForm = disconnectForm.devices[String(device.id)] || {};
      return {
        ...device,
        recoveryStatus: deviceForm.recoveryStatus || "Pending Collection",
        collectionDate: deviceForm.collectionDate || "",
        collectedBy: (deviceForm.collectedBy || "").trim(),
        deviceCondition: (deviceForm.deviceCondition || "").trim(),
        pendingDevices: (deviceForm.pendingDevices || "").trim(),
        notes: (deviceForm.notes || "").trim(),
      };
    });

    const fullyCollected =
      devices.length > 0 &&
      devices.every((device) => device.recoveryStatus === "Fully Collected");

    const partiallyCollected =
      devices.some((device) => device.recoveryStatus === "Fully Collected") &&
      !fullyCollected;

    const recoveryGroup = fullyCollected
      ? "Devices Collected"
      : "Devices Pending Collection";

    const record = {
      id: `disconnect-${Date.now()}`,
      customerRecordId: customer.id || "",
      customerId: customer.customerId || "",
      customerName: customer.customerName || "",
      disconnectionDate: disconnectForm.disconnectionDate,
      disconnectionReason: disconnectForm.disconnectionReason.trim(),
      recoveryGroup,
      recoverySummary: fullyCollected
        ? "Fully Collected"
        : partiallyCollected
          ? "Partially Collected"
          : "Pending Collection",
      deviceDetails: devices,
      notes: disconnectForm.notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const disconnectionSaved = await setCustomerDisconnections([
      ...customerDisconnections,
      record,
    ]);

    if (!disconnectionSaved) return;

    const customersSaved = await setCustomers(
      customers.map((item) =>
        String(item.id || item.customerId) === String(customer.id || customer.customerId)
          ? {
              ...item,
              status: "Suspend",
              disconnectionStatus: recoveryGroup,
              disconnectionDate: disconnectForm.disconnectionDate,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );

    if (!customersSaved) return;

    notify("Customer suspended successfully.");
    setShowDisconnectModal(false);
  };

  const openReconnectModal = () => {
    setReconnectForm({
      reconnectDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setShowReconnectModal(true);
  };

  const saveReconnect = async (event) => {
    event.preventDefault();

    if (!customer) return;

    const now = new Date().toISOString();
    const record = {
      id: `reconnect-${Date.now()}`,
      recordType: "Reconnect",
      customerRecordId: customer.id || "",
      customerId: customer.customerId || "",
      customerName: customer.customerName || "",
      reconnectDate: reconnectForm.reconnectDate,
      notes: reconnectForm.notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    const reconnectSaved = await setCustomerDisconnections([
      ...customerDisconnections,
      record,
    ]);

    if (!reconnectSaved) return;

    const customersSaved = await setCustomers(
      customers.map((item) =>
        String(item.id || item.customerId) === String(customer.id || customer.customerId)
          ? {
              ...item,
              status: "Active",
              reconnectDate: reconnectForm.reconnectDate,
              reconnectedAt: now,
              updatedAt: now,
            }
          : item
      )
    );

    if (!customersSaved) return;

    notify("Customer reconnected successfully.");
    setShowReconnectModal(false);
  };

  const selectedBuybackDevices = buybackAvailableDevices.filter((item) =>
    buybackForm.selectedTransferIds.includes(String(item.id || ""))
  );

  const buybackTotal = selectedBuybackDevices.reduce(
    (sum, item) =>
      sum +
      Number(
        buybackForm.purchasePrices[String(item.id || "")] ??
          item.salePrice ??
          0
      ),
    0
  );

  const buybackPaid = Number(buybackForm.paidAmount || 0);
  const buybackRemaining = Math.max(buybackTotal - buybackPaid, 0);

  const legacyPackagePayments = packages.flatMap((item) =>
    Array.isArray(item.payments)
      ? item.payments.map((payment) => ({
          ...payment,
          packageId: item.id,
          packageCode: item.packageCode,
          packageName: item.packageName,
          customerId: item.customerId,
          customerRecordId: item.customerRecordId,
        }))
      : []
  );

  const allocatedPaymentTotal = customerPaymentRecords.reduce((sum, payment) => {
    if (getPaymentDirection(payment) !== "customer-to-us") return sum;
    if (!Array.isArray(payment.allocations)) return sum;

    return (
      sum +
      payment.allocations.reduce(
        (allocationSum, allocation) =>
          allocationSum + Number(allocation.amount || 0),
        0
      )
    );
  }, 0);

  const legacyPaymentTotal = legacyPackagePayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const packagePaidTotal = packages.reduce(
    (sum, item) => sum + Number(item.paidAmount || 0),
    0
  );

  const initialPaidTotal = Math.max(
    packagePaidTotal - allocatedPaymentTotal - legacyPaymentTotal,
    0
  );

  const totalPrice = packages.reduce(
    (sum, item) => sum + Number(item.packagePrice || 0),
    0
  );

  const totalDeviceSaleValue = soldDeviceTransfers.reduce(
    (sum, item) => sum + Number(item.salePrice || 0),
    0
  );

  const totalDamageChargeValue = customerDamageTransfers.reduce(
    (sum, item) => sum + Number(item.customerDamageAmount || 0),
    0
  );

  const totalBillingSaleValue = billingSales.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  const totalAccountValue = totalPrice + totalDeviceSaleValue + totalDamageChargeValue + totalBillingSaleValue;

  const deviceSalePaidTotal = soldDeviceTransfers.reduce(
    (sum, item) => sum + Number(item.paidAmount || 0),
    0
  );

  const damagePaidTotal = customerDamageTransfers.reduce(
    (sum, item) => sum + Number(item.customerDamagePaidAmount || item.paidAmount || 0),
    0
  );

  const billingSalePaidTotal = billingSales.reduce(
    (sum, item) => sum + Number(item.paidAmount || 0),
    0
  );

  const buybackTotalValue = customerBuybackRecords.reduce(
    (sum, item) => sum + Number(item.totalAmount || 0),
    0
  );

  const companyPayableDeviceTotal = companyPayableDeviceTransfers.reduce(
    (sum, item) => sum + Number(item.customerPayableAmount || item.remainingDeposit || 0),
    0
  );

  const buybackPaidTotal = customerBuybackRecords.reduce(
    (sum, item) => sum + Number(item.paidAmount || 0),
    0
  );

  const totalPaid =
    initialPaidTotal +
    legacyPaymentTotal +
    deviceSalePaidTotal +
    damagePaidTotal +
    billingSalePaidTotal +
    customerPaymentRecords.reduce(
      (sum, item) =>
        getPaymentDirection(item) === "customer-to-us"
          ? sum + Number(item.amount || 0)
          : sum,
      0
    );

  const totalPaidToCustomer = customerPaymentRecords.reduce(
    (sum, item) =>
      getPaymentDirection(item) === "us-to-customer"
        ? sum + Number(item.amount || 0)
        : sum,
    0
  );

  const balance =
    totalAccountValue -
    totalPaid -
    buybackTotalValue +
    buybackPaidTotal +
    totalPaidToCustomer -
    companyPayableDeviceTotal;
  const customerOwes = balance > 0 ? balance : 0;
  const weOwe = balance < 0 ? Math.abs(balance) : 0;

  const initialPaymentRows =
    initialPaidTotal > 0 && packages.length
      ? [
          {
            id: "initial-paid",
            type: "Payment",
            date: packages[0]?.startDate || packages[0]?.createdAt?.slice(0, 10) || "-",
            timeSource: packages[0]?.createdAt || packages[0]?.updatedAt || "",
            description: "Initial package payment",
            debit: 0,
            credit: initialPaidTotal,
            status: "Initial",
          },
        ]
      : [];

  const ledgerRows = [
    ...packages.map((item) => ({
      id: `purchase-${item.id}`,
      type: "Package Purchase",
      date: item.startDate || item.createdAt?.slice(0, 10) || "-",
      timeSource: item.createdAt || item.updatedAt || "",
      description: `${item.packageCode || "-"} - ${item.packageName || "-"}`,
      debit: Number(item.packagePrice || 0),
      credit: 0,
      status: item.status || "-",
      record: item,
    })),

    ...initialPaymentRows,

    ...billingSales.map((item) => ({
      id: `billing-sale-${item.id}`,
      type: "Product Sale",
      date: item.gregorianDate || item.date || item.createdAt?.slice(0, 10) || "-",
      timeSource: item.createdAt || item.updatedAt || "",
      description: `${item.invoiceNumber || "-"} - ${(item.items || []).length} item(s)`,
      debit: Number(item.total || 0),
      credit: Number(item.paidAmount || 0),
      status: Number(item.balance || 0) > 0 ? "Loan" : "Paid",
      record: item,
    })),

    ...soldDeviceTransfers.map((item) => ({
      id: `device-sale-${item.id}`,
      type: "Device Sale",
      date: item.issueDate || item.date || item.createdAt?.slice(0, 10) || "-",
      timeSource: item.createdAt || item.updatedAt || "",
      description: `${item.assetId || "-"} - ${item.deviceName || "Device"}${
        item.serialNumber ? ` / SN: ${item.serialNumber}` : ""
      }`,
      debit: Number(item.salePrice || 0),
      credit: Number(item.paidAmount || 0),
      status: item.issueStatus || item.transferType || "Sold",
      record: item,
    })),

    ...customerDamageTransfers.map((item) => ({
      id: `customer-damage-${item.id}`,
      type: "Customer Damage",
      date: item.transferDate || item.date || item.createdAt?.slice(0, 10) || "-",
      timeSource: item.createdAt || item.updatedAt || "",
      description: `${item.assetId || "-"} - ${item.deviceName || "Asset"} damage / waste charge`,
      debit: Number(item.customerDamageAmount || 0),
      credit: Number(item.customerDamagePaidAmount || item.paidAmount || 0),
      status: Number(item.customerDamageRemainingAmount || item.remainingAmount || 0) > 0 ? "Partial" : "Paid",
      record: item,
    })),

    ...companyPayableDeviceTransfers.map((item) => ({
      id: `company-payable-${item.id}`,
      type: "Deposit Payable",
      date: item.transferDate || item.date || item.createdAt?.slice(0, 10) || "-",
      timeSource: item.createdAt || item.updatedAt || "",
      description: `${item.assetId || "-"} - ${item.deviceName || "Asset"} return amount payable to customer`,
      debit: 0,
      credit: Number(item.customerPayableAmount || item.remainingDeposit || 0),
      status: "Company Owes",
      record: item,
    })),

    ...customerBuybackRecords.map((item) => ({
      id: `customer-buyback-${item.id}`,
      type: "Customer Purchase",
      date: item.purchaseDate || item.createdAt?.slice(0, 10) || "-",
      timeSource: item.createdAt || item.updatedAt || "",
      description: `${(item.items || []).length} device(s) purchased from customer`,
      debit: Number(item.paidAmount || 0),
      credit: Number(item.totalAmount || 0),
      status: Number(item.remainingAmount || 0) > 0 ? "Partial" : "Paid",
      record: item,
    })),

    ...customerDisconnections
      .filter(
        (item) =>
          String(item.customerId || "") === String(customer?.customerId || "") ||
          String(item.customerRecordId || "") === String(customer?.id || "")
      )
      .map((item) => ({
        id: `${item.recordType === "Reconnect" ? "reconnect" : "disconnect"}-ledger-${item.id}`,
        type: item.recordType === "Reconnect" ? "Reconnect" : "Suspend",
        date:
          item.recordType === "Reconnect"
            ? item.reconnectDate || item.createdAt?.slice(0, 10) || "-"
            : item.disconnectionDate || item.createdAt?.slice(0, 10) || "-",
        timeSource: item.createdAt || item.updatedAt || "",
        description:
          item.recordType === "Reconnect"
            ? `Customer reconnected. Notes: ${item.notes || "-"}`
            : `Customer package suspended. Reason: ${item.disconnectionReason || "-"}`,
        debit: 0,
        credit: 0,
        status: item.recordType === "Reconnect" ? "Active" : "Suspend",
        record: item,
      })),

    ...legacyPackagePayments.map((item) => ({
      id: `legacy-payment-${item.id}`,
      type: "Payment",
      date: item.paymentDate || item.createdAt?.slice(0, 10) || "-",
      timeSource: item.createdAt || item.updatedAt || "",
      description: item.notes || `${item.packageCode || "-"} - ${item.packageName || "-"}`,
      debit: 0,
      credit: Number(item.amount || 0),
      status: item.method || "Cash",
    })),

    ...customerPaymentRecords.map((item) => {
      const isPaidToCustomer = getPaymentDirection(item) === "us-to-customer";

      return {
        id: `payment-${item.id}`,
        type: isPaidToCustomer ? "Customer Payout" : "Payment",
        date: item.paymentDate || item.createdAt?.slice(0, 10) || "-",
        timeSource: item.createdAt || item.updatedAt || "",
        description:
          item.notes ||
          (isPaidToCustomer ? "Paid to customer" : "Customer payment"),
        debit: isPaidToCustomer ? Number(item.amount || 0) : 0,
        credit: isPaidToCustomer ? 0 : Number(item.amount || 0),
        status: item.method || "Cash",
        record: item,
        editablePayment: true,
      };
    }),
 ].sort((a, b) =>
  String(b.date || "").localeCompare(String(a.date || ""))
);

  const recalculateRemain = (price, paid) => {
    return Math.max(Number(price || 0) - Number(paid || 0), 0);
  };

  const reversePaymentAllocations = (payment, packageList) => {
  const allocations = Array.isArray(payment?.allocations)
    ? payment.allocations
    : [];

  if (!allocations.length) return packageList;

  return packageList.map((item) => {
    const allocation = allocations.find(
      (entry) => String(entry.packageId) === String(item.id)
    );

    if (!allocation) return item;

    const nextPaid = Math.max(
      Number(item.paidAmount || 0) - Number(allocation.amount || 0),
      0
    );

    return {
      ...item,
      paidAmount: nextPaid,
      remainAmount: recalculateRemain(item.packagePrice, nextPaid),
      updatedAt: new Date().toISOString(),
    };
  });
};

const applyPaymentToCustomerPackages = (basePackages, amount) => {
  let remainingPayment = Number(amount || 0);
  const allocations = [];

  const sortedPackages = [...packages].sort((a, b) =>
    String(a.startDate || "").localeCompare(String(b.startDate || ""))
  );

  const packageOrder = sortedPackages.map((item) => String(item.id));

  const nextPackages = basePackages.map((item) => {
    if (!packageOrder.includes(String(item.id))) return item;
    if (remainingPayment <= 0) return item;

    const currentRemain = Math.max(
      Number(item.packagePrice || 0) - Number(item.paidAmount || 0),
      0
    );

    if (currentRemain <= 0) return item;

    const appliedAmount = Math.min(currentRemain, remainingPayment);
    remainingPayment -= appliedAmount;

    allocations.push({
      packageId: item.id,
      packageCode: item.packageCode || "",
      packageName: item.packageName || "",
      amount: appliedAmount,
    });

    const nextPaid = Number(item.paidAmount || 0) + appliedAmount;

    return {
      ...item,
      paidAmount: nextPaid,
      remainAmount: recalculateRemain(item.packagePrice, nextPaid),
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    nextPackages,
    allocations,
    unappliedAmount: remainingPayment,
  };
};

const saveCustomerPaymentTransaction = async (payment) => {
  const direction = getPaymentDirection(payment);
  const isPaidToCustomer = direction === "us-to-customer";
  const updatedAt = new Date().toISOString();

  const transactionRecord = {
    id: `customer-payment-${payment.id}`,
    type: isPaidToCustomer ? "expense" : "income",
    title: isPaidToCustomer
      ? `Paid to Customer - ${payment.customerName || customer?.customerName || "Customer"}`
      : `Customer Payment - ${payment.customerName || customer?.customerName || "Customer"}`,
    category: isPaidToCustomer ? "Customer Refund" : "Customer Payment",
    amount: Number(payment.amount || 0),
    date: payment.paymentDate,
    description:
      payment.notes ||
      (isPaidToCustomer
        ? "Money paid to customer account"
        : "Money received from customer account"),
    source: "customer-payment",
    referenceId: payment.id,
    customerRecordId: payment.customerRecordId || customer?.id || "",
    customerId: payment.customerId || customer?.customerId || "",
    customerName: payment.customerName || customer?.customerName || "",
    createdAt: payment.createdAt || updatedAt,
    updatedAt,
  };

  return setTransactions((previousTransactions) => [
    ...previousTransactions.filter(
      (transaction) =>
        !(
          transaction.source === "customer-payment" &&
          String(transaction.referenceId || "") === String(payment.id)
        )
    ),
    transactionRecord,
  ]);
};

const removeCustomerPaymentTransaction = async (paymentId) =>
  setTransactions((previousTransactions) =>
    previousTransactions.filter(
      (transaction) =>
        !(
          transaction.source === "customer-payment" &&
          String(transaction.referenceId || "") === String(paymentId)
        )
    )
  );

const upsertCustomerPackageIncome = async (packageRecord) => {
  const amount = Number(packageRecord.paidAmount || 0);

  return setTransactions((previousTransactions) => [
    ...previousTransactions.filter(
      (transaction) =>
        !(
          transaction.source === "customer-package" &&
          String(transaction.referenceId || "") === String(packageRecord.id)
        )
    ),
    ...(amount > 0
      ? [
          {
            id: `customer-package-income-${packageRecord.id}`,
            type: "income",
            title: `Package Payment - ${packageRecord.customerName || customer?.customerName || "Customer"}`,
            category: "Package Payment",
            amount,
            date: packageRecord.startDate,
            description: [
              packageRecord.packageName ? `Package: ${packageRecord.packageName}` : "",
              packageRecord.speed ? `Speed: ${packageRecord.speed}` : "",
              `Package Price: ${money(packageRecord.packagePrice)} AFN`,
              `Paid: ${money(packageRecord.paidAmount)} AFN`,
              `Remaining: ${money(packageRecord.remainAmount)} AFN`,
              packageRecord.notes || "",
            ]
              .filter(Boolean)
              .join(" | "),
            source: "customer-package",
            referenceId: packageRecord.id,
            customerRecordId: packageRecord.customerRecordId || customer?.id || "",
            customerId: packageRecord.customerId || customer?.customerId || "",
            customerName: packageRecord.customerName || customer?.customerName || "",
            createdAt: packageRecord.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]
      : []),
  ]);
};

const removeCustomerPackageIncome = async (packageId) =>
  setTransactions((previousTransactions) =>
    previousTransactions.filter(
      (transaction) =>
        !(
          transaction.source === "customer-package" &&
          String(transaction.referenceId || "") === String(packageId)
        )
    )
  );

  const getActionMenuPosition = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 150;
    const menuHeight = 88;
    const screenGap = 12;

    const left = Math.min(
      Math.max(rect.right - menuWidth, screenGap),
      window.innerWidth - menuWidth - screenGap
    );

    const openAbove =
      rect.bottom + menuHeight + screenGap > window.innerHeight;

    return {
      top: openAbove ? rect.top - menuHeight - 8 : rect.bottom + 8,
      left,
    };
  };

  const togglePackageActionMenu = (event, packageId) => {
    setPackageActionPosition(getActionMenuPosition(event));
    setOpenPaymentAction(null);
    setOpenPackageAction((current) =>
      current === packageId ? null : packageId
    );
  };

  const togglePaymentActionMenu = (event, paymentId) => {
    setPaymentActionPosition(getActionMenuPosition(event));
    setOpenPackageAction(null);
    setOpenPaymentAction((current) =>
      current === paymentId ? null : paymentId
    );
};

  const resetBuybackForm = () => {
    setBuybackForm({
      purchaseDate: new Date().toISOString().slice(0, 10),
      selectedTransferIds: [],
      purchasePrices: {},
      purchasedBy: "",
      paidAmount: "",
      notes: "",
    });
  };

  const toggleBuybackDevice = (transfer) => {
    const transferId = String(transfer.id || "");

    setBuybackForm((previous) => {
      const selected = previous.selectedTransferIds.includes(transferId);

      return {
        ...previous,
        selectedTransferIds: selected
          ? previous.selectedTransferIds.filter((id) => id !== transferId)
          : [...previous.selectedTransferIds, transferId],
        purchasePrices: {
          ...previous.purchasePrices,
          [transferId]:
            previous.purchasePrices[transferId] ??
            transfer.salePrice ??
            "",
        },
      };
    });
  };

  const saveBuyback = async (event) => {
    event.preventDefault();

    if (!selectedBuybackDevices.length) {
      notify("Please select at least one sold device to buy back.", "error");
      return;
    }

    if (buybackPaid > buybackTotal) {
      notify("Paid amount cannot be greater than total purchase amount.", "error");
      return;
    }

    const timestamp = Date.now();
    const items = selectedBuybackDevices.map((item) => ({
      transferId: item.id || "",
      assetRecordId: item.assetRecordId || "",
      assetId: item.assetId || "",
      deviceName: item.deviceName || "",
      category: item.category || "",
      brand: item.brand || "",
      model: item.model || "",
      macAddress: item.macAddress || "",
      serialNumber: item.serialNumber || "",
      purchasePrice: Number(
        buybackForm.purchasePrices[String(item.id || "")] ??
          item.salePrice ??
          0
      ),
    }));

    const saved = await setCustomerDeviceBuybacks([
      ...customerDeviceBuybacks,
      {
        id: `customer-buyback-${timestamp}`,
        customerRecordId: customer.id || "",
        customerId: customer.customerId || "",
        customerName: customer.customerName || "",
        purchaseDate: buybackForm.purchaseDate,
        purchasedBy: buybackForm.purchasedBy.trim(),
        totalAmount: buybackTotal,
        paidAmount: buybackPaid,
        remainingAmount: buybackRemaining,
        notes: buybackForm.notes.trim(),
        items,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    if (!saved) return;

    notify("Customer device purchase saved successfully.");
    resetBuybackForm();
    setShowBuybackModal(false);
  };

  const openEditPackageModal = (item) => {
    setEditPackage(item);
    setEditPackageForm({
      packageName: item.packageName || "",
      speed: item.speed || "",
      packagePrice: String(item.packagePrice || ""),
      paidAmount: String(item.paidAmount || ""),
      remainAmount: String(item.remainAmount || ""),
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      status: item.status || "Active",
      notes: item.notes || "",
    });
  };

  const openEditPaymentModal = (payment) => {
  setOpenPaymentAction(null);
  setEditPayment(payment);
  setPaymentForm({
    paymentDate: payment.paymentDate || new Date().toISOString().slice(0, 10),
    direction: getPaymentDirection(payment),
    amount: String(payment.amount || ""),
    method: payment.method || "Cash",
    notes: payment.notes || "",
  });
  setShowPaymentModal(true);
};

const saveEditedPayment = async (event) => {
  event.preventDefault();

  if (!editPayment) return;

  const amount = Number(paymentForm.amount || 0);

  if (amount <= 0) {
    notify("Please enter a valid payment amount.", "error");
    return;
  }

  const reversedPackages = reversePaymentAllocations(
    editPayment,
    customerPackages
  );

  const direction = paymentForm.direction || "customer-to-us";
  const paymentApplication =
    direction === "customer-to-us"
      ? applyPaymentToCustomerPackages(reversedPackages, amount)
      : {
          nextPackages: reversedPackages,
          allocations: [],
          unappliedAmount: amount,
        };

  const { nextPackages, allocations, unappliedAmount } = paymentApplication;

  const nextPayments = customerPayments.map((payment) => {
    if (String(payment.id) !== String(editPayment.id)) return payment;

    return {
      ...payment,
      paymentDate: paymentForm.paymentDate,
      direction,
      amount,
      method: paymentForm.method,
      notes: paymentForm.notes.trim(),
      allocations,
      unappliedAmount,
      updatedAt: new Date().toISOString(),
    };
  });

  const packagesSaved = await setCustomerPackages(nextPackages);
  if (!packagesSaved) return;

  const paymentsSaved = await setCustomerPayments(nextPayments);

  if (!paymentsSaved) return;

  const updatedPayment = nextPayments.find(
    (payment) => String(payment.id) === String(editPayment.id)
  );
  const transactionSaved = await saveCustomerPaymentTransaction(updatedPayment);

  if (!transactionSaved) {
    notify("Payment was updated, but Financial could not be updated.", "error");
    return;
  }

  notify("Payment updated successfully.");
  closePaymentModal();
};

const confirmDeletePayment = async () => {
  if (!deletePayment) return;

  const reversedPackages = reversePaymentAllocations(
    deletePayment,
    customerPackages
  );

  const packagesSaved = await setCustomerPackages(reversedPackages);
  if (!packagesSaved) return;

  const paymentsSaved = await setCustomerPayments(
    customerPayments.filter(
      (payment) => String(payment.id) !== String(deletePayment.id)
    )
  );

  if (!paymentsSaved) return;

  const transactionRemoved = await removeCustomerPaymentTransaction(
    deletePayment.id
  );

  if (!transactionRemoved) {
    notify("Payment deleted, but Financial could not be updated.", "error");
    return;
  }

  notify("Payment deleted successfully.");
  setDeletePayment(null);
};

  const handleEditPackageChange = (event) => {
    const { name, value } = event.target;

    setEditPackageForm((previous) => {
      const nextData = {
        ...previous,
        [name]: value,
      };

      const price =
        name === "packagePrice"
          ? Number(value || 0)
          : Number(nextData.packagePrice || 0);

      const paid =
        name === "paidAmount"
          ? Number(value || 0)
          : Number(nextData.paidAmount || 0);

      return {
        ...nextData,
        remainAmount: recalculateRemain(price, paid),
      };
    });
  };

  const saveEditedPackage = async (event) => {
    event.preventDefault();

    if (!editPackage) return;

    const nextPackages = customerPackages.map((item) => {
      if (String(item.id) !== String(editPackage.id)) return item;

      return {
        ...item,
        packageName: editPackageForm.packageName.trim(),
        speed: editPackageForm.speed.trim(),
        packagePrice: Number(editPackageForm.packagePrice || 0),
        paidAmount: Number(editPackageForm.paidAmount || 0),
        remainAmount: recalculateRemain(
          editPackageForm.packagePrice,
          editPackageForm.paidAmount
        ),
        startDate: editPackageForm.startDate,
        endDate: editPackageForm.endDate,
        status: editPackageForm.status,
        notes: editPackageForm.notes.trim(),
        updatedAt: new Date().toISOString(),
      };
    });

    const saved = await setCustomerPackages(nextPackages);

    if (saved) {
      const updatedPackage = nextPackages.find(
        (item) => String(item.id) === String(editPackage.id)
      );
      const incomeSaved = await upsertCustomerPackageIncome(updatedPackage);

      if (!incomeSaved) {
        notify("Package updated, but its income could not be updated in Financial.", "error");
        return;
      }

      notify("Package updated successfully.");
      setEditPackage(null);
    }
  };

  const confirmDeletePackage = async () => {
    if (!deletePackage) return;

    const saved = await setCustomerPackages(
      customerPackages.filter(
        (item) => String(item.id) !== String(deletePackage.id)
      )
    );

    if (saved) {
      const incomeRemoved = await removeCustomerPackageIncome(deletePackage.id);

      if (!incomeRemoved) {
        notify("Package deleted, but its income could not be removed from Financial.", "error");
        return;
      }

      notify("Package deleted successfully.");
      setDeletePackage(null);
    }
  };

const openPaymentModal = () => {
  setEditPayment(null);
  setPaymentForm({
    paymentDate: new Date().toISOString().slice(0, 10),
    direction: "customer-to-us",
    amount: "",
    method: "Cash",
    notes: "",
  });

  setShowPaymentModal(true);
};

const closePaymentModal = () => {
  setEditPayment(null);
  setShowPaymentModal(false);
  setPaymentForm({
    paymentDate: new Date().toISOString().slice(0, 10),
    direction: "customer-to-us",
    amount: "",
    method: "Cash",
    notes: "",
  });
};

  const handlePaymentChange = (event) => {
    const { name, value } = event.target;

    setPaymentForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

const saveCustomerPayment = async (event) => {
  event.preventDefault();

  if (!customer) return;

  const amount = Number(paymentForm.amount || 0);

  if (amount <= 0) {
    notify("Please enter a valid payment amount.", "error");
    return;
  }

  const direction = paymentForm.direction || "customer-to-us";
  const paymentApplication =
    direction === "customer-to-us"
      ? applyPaymentToCustomerPackages(customerPackages, amount)
      : {
          nextPackages: customerPackages,
          allocations: [],
          unappliedAmount: amount,
        };

  const { nextPackages, allocations, unappliedAmount } = paymentApplication;

  const paymentRecord = {
    id: Date.now(),
    customerRecordId: customer.id,
    customerId: customer.customerId,
    customerName: customer.customerName,
    paymentDate: paymentForm.paymentDate,
    direction,
    amount,
    method: paymentForm.method,
    notes: paymentForm.notes.trim(),
    allocations,
    unappliedAmount,
    type: "Payment",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const packagesSaved = await setCustomerPackages(nextPackages);
  if (!packagesSaved) return;

  const paymentsSaved = await setCustomerPayments([
    ...customerPayments,
    paymentRecord,
  ]);

  if (!paymentsSaved) return;

  const transactionSaved = await saveCustomerPaymentTransaction(paymentRecord);

  if (!transactionSaved) {
    notify("Payment was saved, but Financial could not be updated.", "error");
    return;
  }

  notify("Payment saved successfully.");
  closePaymentModal();
};

  if (
    !customersLoaded ||
    !invoicesLoaded ||
    !packagesLoaded ||
    !paymentsLoaded ||
    !transfersLoaded ||
    !buybacksLoaded
  ) {
    return <div className="page-loading">Loading customer details...</div>;
  }

  if (!customer) {
    return (
      <div className="customer-details-page">
        <div className="customer-details-not-found">
          <h1>Customer Not Found</h1>
          <p>The selected customer record does not exist.</p>
          <button type="button" onClick={() => navigate("/customers")}>
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-details-page">
      <Link className="customer-details-back" to="/customers">
        ← Back to Customers
      </Link>

      <div className="customer-details-header">
        <div>
          <h1>{customer.customerName || "Unnamed Customer"}</h1>
          <p>Customer account ledger, payments, and balance summary.</p>
        </div>

        <div className="customer-details-header-actions">
          {String(customer.status || "").toLowerCase() === "suspend" && (
            <button
              type="button"
              className="customer-details-payment-btn"
              onClick={openReconnectModal}
            >
              Reconnect
            </button>
          )}

          <button
            type="button"
            className="customer-details-toggle-btn"
            onClick={() => setShowCustomerInfo((value) => !value)}
          >
            {showCustomerInfo ? "Hide Customer Info" : "Show Customer Info"}
          </button>
        </div>
      </div>

      {showCustomerInfo && (
        <>
          <div className="customer-details-profile">
            <div>
              <span>Customer ID</span>
              <strong>{customer.customerId || "-"}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{customer.phone || "-"}</strong>
            </div>
            <div>
              <span>Electricity Bill Number</span>
              <strong>{customer.electricityBillNumber || "-"}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{customer.status || "-"}</strong>
            </div>
            <div>
              <span>Registration Date</span>
              <strong>
                {formatDateTime(
                  customer.registrationDate,
                  customer.createdAt || customer.updatedAt
                )}
              </strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{customer.email || "-"}</strong>
            </div>
          </div>

          <div className="customer-details-card">
            <div className="customer-details-card-header">
              <div>
                <h3>Address & Notes</h3>
                <p>Additional customer information.</p>
              </div>
            </div>

            <div className="customer-details-notes-grid">
              <div>
                <span>Address</span>
                <p>{customer.address || "No address has been added."}</p>
              </div>
              <div>
                <span>Notes</span>
                <p>{customer.notes || "No notes have been added."}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {false && (
      <div className="customer-details-card">
        <div className="customer-details-card-header customer-details-card-header-row">
          <div>
            <h3>Customer Purchases</h3>
            <p>Buy back sold devices from this customer.</p>
          </div>

          <button
            type="button"
            className="customer-details-payment-btn"
            onClick={() => {
              resetBuybackForm();
              setShowBuybackModal(true);
            }}
          >
            Add Purchase
          </button>
        </div>

        <div className="customer-details-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Items</th>
                <th>Purchased By</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Notes</th>
              </tr>
            </thead>

            <tbody>
              {customerBuybackRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    {formatDateTime(
                      record.purchaseDate,
                      record.createdAt || record.updatedAt
                    )}
                  </td>
                  <td>{(record.items || []).length}</td>
                  <td>{record.purchasedBy || "-"}</td>
                  <td>{money(record.totalAmount)} AFN</td>
                  <td>{money(record.paidAmount)} AFN</td>
                  <td>{money(record.remainingAmount)} AFN</td>
                  <td>{record.notes || "-"}</td>
                </tr>
              ))}

              {customerBuybackRecords.length === 0 && (
                <tr>
                  <td colSpan="7" className="customer-details-empty">
                    No device purchase has been recorded for this customer yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <div className="customer-details-card customer-ledger-card">
        <div className="customer-details-card-header customer-details-card-header-row">
          <div>
            <h3>Customer Account Ledger</h3>
            <p>Device and payment history in one account record.</p>
          </div>
        </div>

        <div className="customer-details-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Status / Method</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {ledgerRows.map((row) => (
                <tr
                  key={row.id}
                >
                  <td>{formatDateTime(row.date, row.timeSource)}</td>
                  <td>
                    <span
                      className={
                        row.type === "Payment"
                          ? "ledger-type payment"
                          : "ledger-type purchase"
                      }
                    >
                      {row.type}
                    </span>
                  </td>
                  <td>{row.description || "-"}</td>
                  <td>
                    <LedgerAmount
                      type="debit"
                      value={row.debit}
                      currency="AFN"
                      formatter={(value, currency) => `${money(value)} ${currency}`}
                    />
                  </td>
                  <td>
                    <LedgerAmount
                      type="credit"
                      value={row.credit}
                      currency="AFN"
                      formatter={(value, currency) => `${money(value)} ${currency}`}
                    />
                  </td>
                  <td>{row.status || "-"}</td>
                  <td>
  {row.type === "Package Purchase" ? (
    <div className="customer-package-action-cell">
      <button
        type="button"
        className="customer-package-action-btn"
        aria-label="Open package actions"
        onClick={(event) =>
          togglePackageActionMenu(event, row.record.id)
        }
      >
        ⋮
      </button>

      {openPackageAction === row.record.id && (
        <div
          className="customer-package-action-menu"
          style={{
            top: `${packageActionPosition.top}px`,
            left: `${packageActionPosition.left}px`,
          }}
        >
          <button
            type="button"
            onClick={() => {
              openEditPackageModal(row.record);
              setOpenPackageAction(null);
            }}
          >
            Edit
          </button>

          <button
            type="button"
            className="danger"
            onClick={() => {
              setDeletePackage(row.record);
              setOpenPackageAction(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  ) : row.editablePayment ? (
    <div className="customer-payment-action-cell">
      <button
        type="button"
        className="customer-payment-action-btn"
        aria-label="Open payment actions"
        onClick={(event) =>
          togglePaymentActionMenu(event, row.record.id)
        }
      >
        ⋮
      </button>

      {openPaymentAction === row.record.id && (
        <div
          className="customer-payment-action-menu"
          style={{
            top: `${paymentActionPosition.top}px`,
            left: `${paymentActionPosition.left}px`,
          }}
        >
          <button
            type="button"
            onClick={() => openEditPaymentModal(row.record)}
          >
            Edit
          </button>

          <button
            type="button"
            className="danger"
            onClick={() => {
              setDeletePayment(row.record);
              setOpenPaymentAction(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  ) : (
    "-"
  )}
</td>
                </tr>
              ))}

              {ledgerRows.length === 0 && (
                <tr>
                  <td colSpan="7" className="customer-details-empty">
                    No package, device sale, or payment has been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {false && showBuybackModal && (
        <div
          className="customer-details-modal-backdrop"
        >
          <div
            className="customer-details-modal customer-buyback-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-details-modal-header">
              <div>
                <h3>Purchase From Customer</h3>
                <p>Select sold devices and record buyback payment.</p>
              </div>

              <button type="button" onClick={() => setShowBuybackModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={saveBuyback} className="customer-buyback-form">
              <div className="customer-details-form-grid">
                <label className="customer-buyback-field">
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

                <label className="customer-buyback-field">
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

                <div className="customer-buyback-section full">
                  <div className="customer-buyback-section-title">
                    <h4>Select Sold Devices</h4>
                    <span>{selectedBuybackDevices.length} selected</span>
                  </div>

                <div className="customer-buyback-device-list">
                  {buybackAvailableDevices.map((item) => {
                    const id = String(item.id || "");
                    const selected = buybackForm.selectedTransferIds.includes(id);

                    return (
                      <label
                        key={id}
                        className={
                          selected
                            ? "customer-buyback-device selected"
                            : "customer-buyback-device"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleBuybackDevice(item)}
                        />

                        <div className="customer-buyback-device-info">
                          <strong>
                            {item.category || "-"} - {item.assetId || "-"} - {item.deviceName || "Device"}
                          </strong>
                          <span>
                            SN: {item.serialNumber || "-"} / MAC:{" "}
                            {item.macAddress || "-"}
                          </span>
                        </div>

                        <label className="customer-buyback-price-field">
                          <span>Purchase Price</span>
                        <input
                          type="number"
                          min="0"
                          value={
                            buybackForm.purchasePrices[id] ??
                            item.salePrice ??
                            ""
                          }
                          onChange={(event) =>
                            setBuybackForm((previous) => ({
                              ...previous,
                              purchasePrices: {
                                ...previous.purchasePrices,
                                [id]: event.target.value,
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
                    <div className="customer-details-empty">
                      No sold device is available to purchase from this customer.
                    </div>
                  )}
                </div>
                </div>

                <label className="customer-buyback-field">
                  Total Amount
                  <input value={`${money(buybackTotal)} AFN`} readOnly />
                </label>

                <label className="customer-buyback-field">
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
                          Math.min(
                            Number(event.target.value || 0),
                            buybackTotal
                          )
                        ),
                      }))
                    }
                  />
                </label>

                <label className="customer-buyback-field">
                  Remaining Amount
                  <input value={`${money(buybackRemaining)} AFN`} readOnly />
                </label>

                <label className="customer-buyback-field full">
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

              <div className="customer-details-modal-actions">
                <button type="button" onClick={() => setShowBuybackModal(false)}>
                  Cancel
                </button>
                <button type="submit">Save Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editPackage && (
        <div
          className="customer-details-modal-backdrop"
        >
          <div
            className="customer-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-details-modal-header">
              <div>
                <h3>Edit Package</h3>
                <p>Update package price, payment, dates, and status.</p>
              </div>

              <button type="button" onClick={() => setEditPackage(null)}>
                ×
              </button>
            </div>

            <form onSubmit={saveEditedPackage}>
              <div className="customer-details-form-grid">
                <div>
                  <label>Package Name</label>
                  <input
                    name="packageName"
                    value={editPackageForm.packageName}
                    onChange={handleEditPackageChange}
                  />
                </div>

                <div>
                  <label>Speed</label>
                  <input
                    name="speed"
                    value={editPackageForm.speed}
                    onChange={handleEditPackageChange}
                  />
                </div>

                <div>
                  <label>Package Price</label>
                  <input
                    type="number"
                    min="0"
                    name="packagePrice"
                    value={editPackageForm.packagePrice}
                    onChange={handleEditPackageChange}
                  />
                </div>

                <div>
                  <label>Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    name="paidAmount"
                    value={editPackageForm.paidAmount}
                    onChange={handleEditPackageChange}
                  />
                </div>

                <div>
                  <label>Remain Amount</label>
                  <input
                    value={`${money(editPackageForm.remainAmount)} AFN`}
                    readOnly
                  />
                </div>

                <div>
                  <label>Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={editPackageForm.startDate}
                    onChange={handleEditPackageChange}
                  />
                </div>

                <div>
                  <label>End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={editPackageForm.endDate}
                    onChange={handleEditPackageChange}
                  />
                </div>

                <div>
                  <label>Status</label>
                  <select
                    name="status"
                    value={editPackageForm.status}
                    onChange={handleEditPackageChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>

                <div className="customer-details-form-full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={editPackageForm.notes}
                    onChange={handleEditPackageChange}
                  />
                </div>
              </div>

              <div className="customer-details-modal-actions">
                <button type="button" onClick={() => setEditPackage(null)}>
                  Cancel
                </button>
                <button type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="customer-details-modal-backdrop">
          <div
            className="customer-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-details-modal-header">
              <div>
                <h3>{editPayment ? "Edit Payment" : "Add Payment"}</h3>
                <p>
                  Customer owes us: {money(customerOwes)} AFN. We owe customer:{" "}
                  {money(weOwe)} AFN.
                </p>
              </div>

              <button type="button" onClick={closePaymentModal}>
                ×
              </button>
            </div>

            <form onSubmit={editPayment ? saveEditedPayment : saveCustomerPayment}>
              <div className="customer-details-form-grid">
                <div>
                  <label>Payment Date</label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={paymentForm.paymentDate}
                    onChange={handlePaymentChange}
                  />
                </div>

                <div>
                  <label>Payment Direction</label>
                  <select
                    name="direction"
                    value={paymentForm.direction}
                    onChange={handlePaymentChange}
                  >
                    <option value="customer-to-us">Customer pays us</option>
                    <option value="us-to-customer">We pay customer</option>
                  </select>
                </div>

                <div>
                  <label>Amount</label>
                  <input
                    type="number"
                    min="1"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentChange}
                    placeholder="Example: 500"
                  />
                </div>

                <div>
                  <label>Payment Method</label>
                  <select
                    name="method"
                    value={paymentForm.method}
                    onChange={handlePaymentChange}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="customer-details-form-full">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={paymentForm.notes}
                    onChange={handlePaymentChange}
                    placeholder="Payment notes..."
                  />
                </div>
              </div>

              <div className="customer-details-modal-actions">
                <button type="button" onClick={closePaymentModal}>
                  Cancel
                </button>
                <button type="submit">
                  {editPayment ? "Save Changes" : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {false && (
  <div
    className="customer-details-modal-backdrop"
  >
    <div
      className="customer-details-modal customer-disconnect-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="customer-details-modal-header">
        <div>
          <h3>Suspend Customer</h3>
          <p>
            Record the suspend details and manage the recovery status
            of customer devices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDisconnectModal(false)}
          aria-label="Close disconnect form"
        >
          ×
        </button>
      </div>

      <form onSubmit={saveDisconnect}>
        <div className="customer-details-form-grid customer-disconnect-form-grid">
          <div>
            <label>Customer Name</label>
            <input
              value={customer.customerName || ""}
              readOnly
              className="customer-disconnect-readonly"
            />
          </div>

          <div>
            <label>Customer ID</label>
            <input
              value={customer.customerId || ""}
              readOnly
              className="customer-disconnect-readonly"
            />
          </div>

          <div>
            <label>Suspend Date</label>
            <input
              type="date"
              value={disconnectForm.disconnectionDate}
              onChange={(event) =>
                setDisconnectForm((previous) => ({
                  ...previous,
                  disconnectionDate: event.target.value,
                }))
              }
            />
          </div>

          <div>
            <label>Suspend Reason</label>
            <input
              type="text"
              value={disconnectForm.disconnectionReason}
              onChange={(event) =>
                setDisconnectForm((previous) => ({
                  ...previous,
                  disconnectionReason: event.target.value,
                }))
              }
              placeholder="Enter the reason for suspend"
            />
          </div>
        </div>

        <div className="customer-disconnect-device-list">
          <div className="customer-disconnect-device-list-header">
            <h4>Customer Devices</h4>
            <span>{customerCurrentDevices.length} device(s)</span>
          </div>

          {customerCurrentDevices.length > 0 ? (
            customerCurrentDevices.map((device) => (
              <div
                className="customer-disconnect-device-row"
                key={device.id || device.transferId}
              >
                <div>
                  <strong>
                    {device.category || "-"} - {device.assetId || "-"} - {device.deviceName || "-"}
                  </strong>
                  <span>
                    {device.model || "-"} / {device.macAddress || "-"} /{" "}
                    {device.serialNumber || "-"}
                  </span>
                </div>
                <small>{device.status || "-"}</small>
              </div>
            ))
          ) : (
            <p className="customer-details-empty">
              No device is currently recorded with this customer.
            </p>
          )}
        </div>

        <div className="customer-disconnect-notes-field">
          <label>Additional Notes</label>

          <textarea
            value={disconnectForm.notes}
            onChange={(event) =>
              setDisconnectForm((previous) => ({
                ...previous,
                notes: event.target.value,
              }))
            }
            placeholder="Enter any additional notes about this suspend..."
          />
        </div>

        <div className="customer-details-modal-actions">
          <button
            type="button"
            className="customer-details-cancel-btn"
            onClick={() => setShowDisconnectModal(false)}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="customer-details-save-btn"
          >
            Save Suspend
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {showReconnectModal && (
        <div className="customer-details-modal-backdrop">
          <div
            className="customer-details-modal customer-disconnect-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-details-modal-header">
              <div>
                <h3>Reconnect Customer</h3>
                <p>Record the date this suspended customer became active again.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowReconnectModal(false)}
                aria-label="Close reconnect form"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveReconnect}>
              <div className="customer-details-form-grid customer-disconnect-form-grid">
                <div>
                  <label>Customer Name</label>
                  <input
                    value={customer.customerName || ""}
                    readOnly
                    className="customer-disconnect-readonly"
                  />
                </div>

                <div>
                  <label>Customer ID</label>
                  <input
                    value={customer.customerId || ""}
                    readOnly
                    className="customer-disconnect-readonly"
                  />
                </div>

                <div>
                  <label>Reconnect Date</label>
                  <input
                    type="date"
                    value={reconnectForm.reconnectDate}
                    onChange={(event) =>
                      setReconnectForm((previous) => ({
                        ...previous,
                        reconnectDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="customer-disconnect-notes-field">
                <label>Additional Notes</label>
                <textarea
                  value={reconnectForm.notes}
                  onChange={(event) =>
                    setReconnectForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Enter any notes about this reconnect..."
                />
              </div>

              <div className="customer-details-modal-actions">
                <button
                  type="button"
                  className="customer-details-cancel-btn"
                  onClick={() => setShowReconnectModal(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="customer-details-save-btn">
                  Save Reconnect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletePackage && (
        <div
          className="customer-details-modal-backdrop"
        >
          <div
            className="customer-details-delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Delete Package</h3>
            <p>Are you sure you want to delete this customer package?</p>

            <div>
              <button type="button" onClick={() => setDeletePackage(null)}>
                Cancel
              </button>

              <button
                type="button"
                className="danger"
                onClick={confirmDeletePackage}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePayment && (
  <div
    className="customer-details-modal-backdrop"
  >
    <div
      className="customer-details-delete-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <h3>Delete Payment</h3>
      <p>Are you sure you want to delete this payment?</p>

      <div>
        <button type="button" onClick={() => setDeletePayment(null)}>
          Cancel
        </button>

        <button
          type="button"
          className="danger"
          onClick={confirmDeletePayment}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

export default CustomerDetails;
