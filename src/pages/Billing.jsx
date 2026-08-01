import { useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  CalendarDays,
  Camera,
  CreditCard,
  Mail,
  MessageCircle,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import {
  convertCurrencyAmount,
  currencies,
  formatCurrencyAmount,
} from "../utils/currencyExchange";
import "./Billing.css";

const parseMoney = (value) => Number.parseFloat(value || 0) || 0;
const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const defaultPaymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "creditCard", label: "Credit Card" },
  { value: "bankTransfer", label: "Bank Transfer" },
  { value: "onlinePayment", label: "Online Payment" },
];

const getProductName = (product) =>
  product.name || product.productName || product.deviceName || "Unnamed Product";

const getProductCode = (product) =>
  product.code || product.productCode || product.assetId || product.barcode || "";

const getCustomerName = (customer) =>
  customer.customerName ||
  customer.fullName ||
  customer.name ||
  `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
  "Customer";

function ScannerModal({ onClose, onScan }) {
  const [manualCode, setManualCode] = useState("");
  const [cameraState, setCameraState] = useState("idle");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(0);

  const stopCamera = () => {
    window.cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const closeScanner = () => {
    stopCamera();
    onClose();
  };

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    setManualCode("");
  };

  const startCamera = async () => {
    try {
      setCameraState("starting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraState("active");

      if (!("BarcodeDetector" in window)) {
        setCameraState("manual");
        return;
      }

      const detector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"],
      });

      const scan = async () => {
        try {
          if (videoRef.current?.readyState >= 2) {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onScan(codes[0].rawValue);
              closeScanner();
              return;
            }
          }
        } catch {
          setCameraState("manual");
        }
        frameRef.current = window.requestAnimationFrame(scan);
      };

      frameRef.current = window.requestAnimationFrame(scan);
    } catch {
      setCameraState("denied");
    }
  };

  useEffect(() => stopCamera, []);

  return (
    <div className="billing-modal-backdrop" onClick={closeScanner}>
      <section className="billing-scanner-modal" onClick={(event) => event.stopPropagation()}>
        <div className="billing-preview-top">
          <strong><Camera size={16} /> Barcode Scanner</strong>
          <button type="button" onClick={closeScanner}>
            <X size={14} />
            Close
          </button>
        </div>

        <div className="billing-scanner-view">
          <video ref={videoRef} muted playsInline />
          {cameraState !== "active" && (
            <div className="billing-scanner-placeholder">
              <Camera size={42} />
              <span>
                {cameraState === "denied"
                  ? "Camera permission was denied. Enter barcode manually."
                  : cameraState === "manual"
                    ? "Camera is active, but automatic barcode detection is not available in this browser."
                    : "Point camera at barcode to scan."}
              </span>
              <button type="button" onClick={startCamera}>
                {cameraState === "starting" ? "Starting..." : "Start Camera"}
              </button>
            </div>
          )}
        </div>

        <label className="billing-field">
          <span>Manual barcode</span>
          <div className="billing-scanner-manual">
            <input
              autoFocus
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitManual();
                }
              }}
              placeholder="Enter barcode number..."
            />
            <button type="button" onClick={submitManual}>
              <Search size={15} />
              Add
            </button>
          </div>
        </label>
      </section>
    </div>
  );
}

function Billing() {
  const [products, setProducts] = useJsonCollection("products");
  const [customers, setCustomers] = useJsonCollection("customers");
  const [settings] = useJsonCollection("settings");
  const [sales, setSales] = useJsonCollection("billingInvoices");
  const [, setTransactions] = useJsonCollection("transactions");

  const company = settings[0] || {};
  const baseCurrency = company.baseCurrency || "AFN";
  const exchangeRates = company.exchangeRates || {};

  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [discountMode, setDiscountMode] = useState("flat");
  const [discount, setDiscount] = useState("0");
  const [billDate, setBillDate] = useState(formatDateInput(new Date()));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatusMode, setPaymentStatusMode] = useState("paid");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const searchInputRef = useRef(null);

  const currencyOptions = currencies.map((item) => ({
    value: item.code,
    label: `${item.symbol} ${item.name} (${item.code})`,
  }));

  const customerOptions = [
    { value: "", label: "Walk-in customer" },
    ...customers.map((customer) => ({
      value: String(customer.id || customer.customerId),
      label: getCustomerName(customer),
    })),
  ];

  const convertMoney = (value, fromCurrency, targetCurrency = currency) =>
    convertCurrencyAmount(value, {
      baseCurrency,
      exchangeRates,
      fromCurrency: fromCurrency || baseCurrency,
      targetCurrency: targetCurrency || baseCurrency,
    });

  const availableProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        name: getProductName(product),
        code: getProductCode(product),
        quantity: parseMoney(product.quantity),
        selling: parseMoney(product.selling || product.sellingPrice || product.unitPrice),
        currency: product.currency || baseCurrency,
      })),
    [baseCurrency, products]
  );

  const suggestions = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return [];

    return availableProducts
      .filter((product) =>
        [product.name, product.code, product.barcode, product.category]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
      )
      .slice(0, 7);
  }, [availableProducts, searchTerm]);

  const findProduct = (query) => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return null;

    return (
      availableProducts.find((product) =>
        [product.barcode, product.code, product.name].some(
          (value) => String(value || "").toLowerCase() === keyword
        )
      ) ||
      availableProducts.find((product) =>
        [product.barcode, product.code, product.name].some((value) =>
          String(value || "").toLowerCase().includes(keyword)
        )
      )
    );
  };

  const addProductToBill = (query) => {
    const product = typeof query === "object" ? query : findProduct(query);
    if (!product) {
      notify("Product not found.", "error");
      return;
    }

    if (parseMoney(product.quantity) <= 0) {
      notify("This product is out of stock.", "error");
      return;
    }

    const productCurrency = product.currency || baseCurrency;
    const billCurrency = items.length === 0 ? productCurrency : currency;
    const convertedPrice =
      productCurrency === billCurrency
        ? product.selling
        : convertMoney(product.selling, productCurrency, billCurrency);

    if (convertedPrice === null) {
      notify("Exchange rate for this currency has not been added.", "error");
      return;
    }

    if (!items.length) setCurrency(productCurrency);

    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= parseMoney(product.quantity)) {
          notify("Insufficient stock.", "error");
          return current;
        }

        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          code: product.code || product.barcode || "-",
          unit: product.unit || "Piece",
          currency: billCurrency,
          originalCurrency: productCurrency,
          price: roundMoney(convertedPrice),
          discount: 0,
          quantity: 1,
          stock: parseMoney(product.quantity),
        },
      ];
    });

    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const changeCurrency = (nextCurrency) => {
    if (nextCurrency === currency) return;

    const convertedItems = items.map((item) => {
      const convertedPrice = convertMoney(item.price, item.currency, nextCurrency);
      const convertedDiscount = convertMoney(item.discount, item.currency, nextCurrency);
      if (convertedPrice === null || convertedDiscount === null) return null;
      return {
        ...item,
        currency: nextCurrency,
        price: roundMoney(convertedPrice),
        discount: roundMoney(convertedDiscount),
      };
    });

    if (convertedItems.some((item) => item === null)) {
      notify("Exchange rate for this currency has not been added.", "error");
      return;
    }

    if (discountMode === "flat" && parseMoney(discount) > 0) {
      const convertedDiscount = convertMoney(discount, currency, nextCurrency);
      if (convertedDiscount === null) {
        notify("Exchange rate for this currency has not been added.", "error");
        return;
      }
      setDiscount(String(roundMoney(convertedDiscount)));
    }

    if (paidAmountInput !== "") {
      const convertedPaid = convertMoney(paidAmountInput, currency, nextCurrency);
      if (convertedPaid === null) {
        notify("Exchange rate for this currency has not been added.", "error");
        return;
      }
      setPaidAmountInput(String(roundMoney(convertedPaid)));
    }

    setItems(convertedItems);
    setCurrency(nextCurrency);
  };

  const updateItem = (productId, patch) => {
    setItems((current) =>
      current.map((item) => {
        if (item.productId !== productId) return item;
        const next = { ...item, ...patch };
        next.quantity = Math.max(1, Math.min(parseMoney(next.quantity), item.stock));
        next.price = Math.max(0, parseMoney(next.price));
        next.discount = Math.max(0, parseMoney(next.discount));
        return next;
      })
    );
  };

  const removeItem = (productId) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const lineTotal = (item) =>
    Math.max(0, parseMoney(item.price) * parseMoney(item.quantity) - parseMoney(item.discount));

  const subtotal = items.reduce(
    (sum, item) => sum + parseMoney(item.price) * parseMoney(item.quantity),
    0
  );
  const itemDiscountTotal = items.reduce((sum, item) => sum + parseMoney(item.discount), 0);
  const invoiceDiscount =
    discountMode === "percent"
      ? (subtotal - itemDiscountTotal) * (parseMoney(discount) / 100)
      : parseMoney(discount);
  const total = Math.max(0, subtotal - itemDiscountTotal - invoiceDiscount);
  const paidAmount = paymentStatusMode === "paid" ? total : parseMoney(paidAmountInput);
  const balance = Math.max(0, total - paidAmount);
  const paidTooHigh = paymentStatusMode === "loan" && paidAmount > total;

  const createInvoice = () => {
    const selectedCustomer = customers.find(
      (customer) => String(customer.id || customer.customerId) === String(customerId)
    );
    const invoiceNumber = `INV-${billDate.replaceAll("-", "").slice(2)}-${String(
      sales.length + 1
    ).padStart(3, "0")}`;

    return {
      id: `invoice-${Date.now()}`,
      invoiceNumber,
      date: billDate,
      customerId,
      customerName: selectedCustomer ? getCustomerName(selectedCustomer) : walkInName || "Walk-in customer",
      currency,
      items: items.map((item) => ({
        ...item,
        lineTotal: roundMoney(lineTotal(item)),
      })),
      subtotal: roundMoney(subtotal),
      itemDiscountTotal: roundMoney(itemDiscountTotal),
      discountMode,
      discount: parseMoney(discount),
      discountTotal: roundMoney(itemDiscountTotal + invoiceDiscount),
      total: roundMoney(total),
      paidAmount: roundMoney(paidAmount),
      balance: roundMoney(balance),
      paymentMethod,
      paymentStatus: balance <= 0 ? "paid" : "loan",
      createdAt: new Date().toISOString(),
    };
  };

  const resetBill = () => {
    setItems([]);
    setCustomerId("");
    setWalkInName("");
    setCurrency(baseCurrency);
    setDiscountMode("flat");
    setDiscount("0");
    setBillDate(formatDateInput(new Date()));
    setPaymentMethod("cash");
    setPaymentStatusMode("paid");
    setPaidAmountInput("");
    setSearchTerm("");
  };

  const saveInvoice = async (shouldPrint = false) => {
    if (!items.length) {
      notify("Please add at least one product.", "error");
      return;
    }

    if (paidTooHigh) {
      notify("Paid amount cannot exceed invoice total.", "error");
      return;
    }

    const invoice = createInvoice();

    const stockSaved = await setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const soldItem = invoice.items.find((item) => String(item.productId) === String(product.id));
        if (!soldItem) return product;
        return {
          ...product,
          quantity: Math.max(0, parseMoney(product.quantity) - parseMoney(soldItem.quantity)),
          updatedAt: new Date().toISOString(),
        };
      })
    );
    if (!stockSaved) return;

    const salesSaved = await setSales((currentSales) => [invoice, ...currentSales]);
    if (!salesSaved) return;

    await setTransactions((currentTransactions) => [
      {
        id: `billing-${invoice.id}`,
        type: "income",
        title: `Invoice ${invoice.invoiceNumber}`,
        amount: invoice.paidAmount,
        date: invoice.date,
        description: invoice.customerName,
        source: "billing",
        category: "sales",
        referenceId: invoice.id,
        currency: invoice.currency,
      },
      ...currentTransactions,
    ]);

    if (invoice.customerId) {
      await setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          String(customer.id || customer.customerId) === String(invoice.customerId)
            ? {
                ...customer,
                purchases: roundMoney(parseMoney(customer.purchases) + invoice.total),
                pending: roundMoney(parseMoney(customer.pending) + invoice.balance),
                updatedAt: new Date().toISOString(),
              }
            : customer
        )
      );
    }

    notify("Invoice saved successfully.");
    if (shouldPrint) setPreviewInvoice(invoice);
    resetBill();
  };

  const openPrintableInvoice = (invoice) => {
    const rows = invoice.items
      .map(
        (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.code}</td>
            <td>${item.quantity} ${item.unit}</td>
            <td>${formatCurrencyAmount(item.price, invoice.currency)}</td>
            <td><strong>${formatCurrencyAmount(item.lineTotal, invoice.currency)}</strong></td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${invoice.invoiceNumber}</title>
          <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body { margin: 0; background: #e5e7eb; font-family: Arial, sans-serif; color: #111827; }
            .invoice-paper { width: 190mm; min-height: 270mm; margin: 0 auto; background: #fff; position: relative; overflow: hidden; }
            .invoice-ribbon { height: 62px; background: linear-gradient(100deg, #252525, #4338ca); border-bottom-left-radius: 58% 22px; }
            .invoice-head { display: flex; justify-content: space-between; gap: 24px; padding: 22px 38px 12px; }
            .invoice-brand { display: flex; align-items: center; gap: 16px; }
            .invoice-logo { width: 58px; height: 58px; border-radius: 16px; object-fit: contain; background: #f8fafc; display: grid; place-items: center; font-weight: 900; }
            .invoice-title-box { border: 1px solid #c7d2fe; background: #eef2ff; border-radius: 8px; padding: 12px 18px; text-align: right; }
            .invoice-title-box h1 { margin: 0; color: #3730a3; letter-spacing: 3px; font-size: 18px; }
            .invoice-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 28px; margin: 28px 38px 8px; font-size: 12px; }
            table { width: calc(100% - 76px); margin: 16px 38px; border-collapse: collapse; }
            th, td { padding: 11px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: left; }
            th { background: #f8fafc; color: #475569; }
            .summary { width: 300px; margin: 18px 38px 0 auto; display: grid; gap: 7px; font-size: 12px; }
            .summary div { display: flex; justify-content: space-between; gap: 20px; }
            .grand { border-top: 1px solid #cbd5e1; padding-top: 8px; font-weight: 900; }
            @media print { body { background: #fff; } .invoice-paper { width: 190mm; min-height: auto; } }
          </style>
        </head>
        <body>
          <article class="invoice-paper">
            <div class="invoice-ribbon"></div>
            <header class="invoice-head">
              <div class="invoice-brand">
                <div class="invoice-logo">${company.logo ? `<img src="${company.logo}" style="width:100%;height:100%;object-fit:contain">` : (company.companyName || "R").slice(0, 1)}</div>
                <div><h2>${company.companyName || "Smart Office"}</h2><p>${company.systemSubtitle || "Business Management System"}</p></div>
              </div>
              <div class="invoice-title-box"><h1>INVOICE</h1><span>#${invoice.invoiceNumber}</span></div>
            </header>
            <section class="invoice-meta">
              <span>Bill To: <strong>${invoice.customerName}</strong></span>
              <span>Status: <strong>${invoice.paymentStatus}</strong></span>
              <span>Date: <strong>${invoice.date}</strong></span>
              <span>Total: <strong>${formatCurrencyAmount(invoice.total, invoice.currency)}</strong></span>
            </section>
            <table><thead><tr><th>Item</th><th>Code</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="summary">
              <div><span>Subtotal</span><strong>${formatCurrencyAmount(invoice.subtotal, invoice.currency)}</strong></div>
              <div><span>Discount</span><strong>${formatCurrencyAmount(invoice.discountTotal, invoice.currency)}</strong></div>
              <div><span>Paid</span><strong>${formatCurrencyAmount(invoice.paidAmount, invoice.currency)}</strong></div>
              <div><span>Remaining</span><strong>${formatCurrencyAmount(invoice.balance, invoice.currency)}</strong></div>
              <div class="grand"><span>Total</span><strong>${formatCurrencyAmount(invoice.total, invoice.currency)}</strong></div>
            </div>
          </article>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div>
          <h1>Billing</h1>
          <p>Create invoices, scan barcodes, manage payments and update product stock.</p>
        </div>
        <div className="billing-header-actions">
          <button
            type="button"
            className={`billing-light-btn ${scannerEnabled ? "billing-scanner-enabled" : ""}`}
            onClick={() => setScannerEnabled((current) => !current)}
            aria-pressed={scannerEnabled}
          >
            <Barcode size={16} />
            {scannerEnabled ? "Scanner Active" : "Scanner Off"}
          </button>
          <button
            type="button"
            className="billing-light-btn"
            disabled={!scannerEnabled}
            onClick={() => setScannerOpen(true)}
          >
            <Camera size={16} />
            Scan
          </button>
          <button type="button" className="billing-light-btn" onClick={resetBill}>
            <X size={16} />
            Clear
          </button>
          <button type="button" className="billing-primary-btn" onClick={() => saveInvoice(true)}>
            <Printer size={16} />
            Save & Print
          </button>
        </div>
      </div>

      <section className="billing-grid">
        <div className="billing-card billing-cart-card">
          <div className="billing-card-title">
            <div>
              <h2>
                <ShoppingCart size={18} />
                Current Bill
              </h2>
              <p>Add products by name, code or barcode.</p>
            </div>
            <CustomSelect
              ariaLabel="Invoice currency"
              className="billing-currency-select"
              options={currencyOptions}
              value={currency}
              onChange={changeCurrency}
            />
          </div>

          <div className="billing-product-search">
            <Search size={17} />
            <input
              ref={searchInputRef}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addProductToBill(searchTerm);
                }
              }}
              placeholder="Search or scan product..."
            />
            <button type="button" onClick={() => addProductToBill(searchTerm)}>
              <Barcode size={16} />
              Add
            </button>
            {!!suggestions.length && (
              <div className="billing-suggestions">
                {suggestions.map((product) => (
                  <button
                    type="button"
                    key={product.id || product.code}
                    onClick={() => addProductToBill(product)}
                  >
                    <span>{product.name}</span>
                    <small>
                      {product.code || product.barcode || "-"} · {product.quantity} {product.unit || ""}
                    </small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="billing-cart-table">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId}>
                    <td>
                      <strong>{item.name}</strong>
                      <span>{item.code}</span>
                    </td>
                    <td>
                      <div className="qty-control">
                        <button
                          type="button"
                          onClick={() => updateItem(item.productId, { quantity: item.quantity - 1 })}
                        >
                          <Minus size={13} />
                        </button>
                        <input
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(item.productId, { quantity: event.target.value })
                          }
                        />
                        <button
                          type="button"
                          onClick={() => updateItem(item.productId, { quantity: item.quantity + 1 })}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <input
                        className="money-cell-input"
                        value={item.price}
                        onChange={(event) =>
                          updateItem(item.productId, { price: event.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="money-cell-input"
                        value={item.discount}
                        onChange={(event) =>
                          updateItem(item.productId, { discount: event.target.value })
                        }
                      />
                    </td>
                    <td className="billing-strong">
                      {formatCurrencyAmount(lineTotal(item), currency)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="billing-icon-danger"
                        onClick={() => removeItem(item.productId)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan="6" className="billing-empty">
                      No product added to this bill yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="billing-card billing-side-card">
          <div className="billing-card-title compact">
            <h2>
              <ReceiptText size={18} />
              Invoice Details
            </h2>
          </div>

          <div className="billing-field">
            <span>Customer</span>
            <CustomSelect
              ariaLabel="Customer"
              options={customerOptions}
              value={customerId}
              onChange={setCustomerId}
            />
          </div>

          {!customerId && (
            <label className="billing-field">
              <span>Walk-in Name</span>
              <input
                value={walkInName}
                onChange={(event) => setWalkInName(event.target.value)}
                placeholder="Optional customer name"
              />
            </label>
          )}

          <label className="billing-field">
            <span>Date</span>
            <div className="billing-date-field">
              <CalendarDays size={16} />
              <input
                type="date"
                value={billDate}
                onChange={(event) => setBillDate(event.target.value)}
              />
            </div>
          </label>

          <div className="billing-field-grid">
            <label className="billing-field">
              <span>Discount</span>
              <input
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </label>
            <div className="billing-field">
              <span>Mode</span>
              <CustomSelect
                ariaLabel="Discount mode"
                options={[
                  { value: "flat", label: "Flat" },
                  { value: "percent", label: "Percent" },
                ]}
                value={discountMode}
                onChange={setDiscountMode}
              />
            </div>
          </div>

          <div className="billing-field">
            <span>Payment Method</span>
            <CustomSelect
              ariaLabel="Payment method"
              options={defaultPaymentMethods}
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </div>

          <div className="billing-field">
            <span>Payment Status</span>
            <CustomSelect
              ariaLabel="Payment status"
              options={[
                { value: "paid", label: "Paid in full" },
                { value: "loan", label: "Loan / Partially paid" },
              ]}
              value={paymentStatusMode}
              onChange={setPaymentStatusMode}
            />
          </div>

          {paymentStatusMode === "loan" && (
            <label className="billing-field">
              <span>Paid Amount</span>
              <input
                className={paidTooHigh ? "field-invalid" : ""}
                value={paidAmountInput}
                onChange={(event) => setPaidAmountInput(event.target.value)}
              />
              <small className={paidTooHigh ? "billing-error" : ""}>
                {paidTooHigh
                  ? "Paid amount cannot exceed invoice total."
                  : `Remaining: ${formatCurrencyAmount(balance, currency)}`}
              </small>
            </label>
          )}

          <div className="billing-summary">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrencyAmount(subtotal, currency)}</strong>
            </div>
            <div>
              <span>Item Discounts</span>
              <strong>{formatCurrencyAmount(itemDiscountTotal, currency)}</strong>
            </div>
            <div>
              <span>Invoice Discount</span>
              <strong>{formatCurrencyAmount(invoiceDiscount, currency)}</strong>
            </div>
            <div>
              <span>Paid</span>
              <strong>{formatCurrencyAmount(paidAmount, currency)}</strong>
            </div>
            <div className="remaining">
              <span>Remaining</span>
              <strong>{formatCurrencyAmount(balance, currency)}</strong>
            </div>
            <div className="grand">
              <span>Total</span>
              <strong>{formatCurrencyAmount(total, currency)}</strong>
            </div>
          </div>

          <div className="billing-save-actions">
            <button
              type="button"
              className="billing-light-btn"
              onClick={() => {
                if (!items.length) {
                  notify("Please add at least one product.", "error");
                  return;
                }
                setPreviewInvoice(createInvoice());
              }}
            >
              Preview
            </button>
            <button type="button" className="billing-primary-btn" onClick={() => saveInvoice(false)}>
              <CreditCard size={16} />
              Save Bill
            </button>
          </div>
        </aside>
      </section>

      {previewInvoice && (
        <InvoicePreviewModal
          company={company}
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onPrint={() => openPrintableInvoice(previewInvoice)}
        />
      )}

      {scannerOpen && (
        <ScannerModal
          onClose={() => setScannerOpen(false)}
          onScan={(code) => {
            addProductToBill(code);
            setSearchTerm("");
          }}
        />
      )}
    </div>
  );
}

function InvoicePreviewModal({ company, invoice, onClose, onPrint }) {
  const encodedSubject = encodeURIComponent(`Invoice ${invoice.invoiceNumber}`);
  const encodedBody = encodeURIComponent(
    `${invoice.invoiceNumber}\n${invoice.customerName}\n${formatCurrencyAmount(
      invoice.total,
      invoice.currency
    )}`
  );

  return (
    <div className="billing-modal-backdrop">
      <div className="billing-preview-modal">
        <div className="billing-preview-top">
          <strong>Invoice Preview - {invoice.invoiceNumber}</strong>
          <div>
            <button type="button" onClick={onClose}>
              <X size={14} />
              Cancel
            </button>
            <a href={`https://wa.me/?text=${encodedSubject}%20${encodedBody}`} target="_blank" rel="noreferrer">
              <MessageCircle size={14} />
              WhatsApp
            </a>
            <a href={`mailto:?subject=${encodedSubject}&body=${encodedBody}`}>
              <Mail size={14} />
              Email
            </a>
            <button type="button" className="billing-primary-btn" onClick={onPrint}>
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        <article className="billing-invoice-paper">
          <div className="billing-invoice-ribbon" />
          <header>
            <div className="billing-invoice-brand">
              <div className="billing-invoice-logo">
                {company.logo ? <img src={company.logo} alt="" /> : (company.companyName || "R").slice(0, 1)}
              </div>
              <div>
                <h2>{company.companyName || "Smart Office"}</h2>
                <p>{company.systemSubtitle || "Retail Management System"}</p>
              </div>
            </div>
            <div className="billing-invoice-title">
              <h1>INVOICE</h1>
              <span>#{invoice.invoiceNumber}</span>
            </div>
          </header>

          <section className="billing-invoice-meta">
            <span>Bill To: <strong>{invoice.customerName}</strong></span>
            <span>Date: <strong>{invoice.date}</strong></span>
            <span>Status: <strong>{invoice.paymentStatus}</strong></span>
            <span>Total: <strong>{formatCurrencyAmount(invoice.total, invoice.currency)}</strong></span>
          </section>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Code</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.productId}>
                  <td>{item.name}</td>
                  <td>{item.code}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{formatCurrencyAmount(item.price, invoice.currency)}</td>
                  <td><strong>{formatCurrencyAmount(item.lineTotal, invoice.currency)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="billing-invoice-summary">
            <div><span>Subtotal</span><strong>{formatCurrencyAmount(invoice.subtotal, invoice.currency)}</strong></div>
            <div><span>Discount</span><strong>{formatCurrencyAmount(invoice.discountTotal, invoice.currency)}</strong></div>
            <div><span>Paid</span><strong>{formatCurrencyAmount(invoice.paidAmount, invoice.currency)}</strong></div>
            <div><span>Remaining</span><strong>{formatCurrencyAmount(invoice.balance, invoice.currency)}</strong></div>
            <div className="grand"><span>Total</span><strong>{formatCurrencyAmount(invoice.total, invoice.currency)}</strong></div>
          </div>
        </article>
      </div>
    </div>
  );
}

export default Billing;
