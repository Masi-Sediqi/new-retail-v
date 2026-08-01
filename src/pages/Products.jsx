import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Barcode,
  Boxes,
  Eye,
  FileDown,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import FloatingActionMenu from "../components/FloatingActionMenu";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import {
  productCategories,
  productUnits,
} from "../data/dashboardData";
import { createRecycleEntry } from "../utils/recycleBin";
import { notify } from "../utils/notify";
import { normalizePrintSettings } from "../utils/printStudio";
import "./Products.css";

const emptyProduct = {
  name: "",
  code: "",
  barcode: "",
  category: "",
  images: [],
  purchase: "",
  selling: "",
  expiry: "",
  alertBefore: "1 month",
  lowStock: "",
  quantity: "",
  unit: "Pieces (pcs)",
  currency: "AFN",
  supplierId: "",
  cashWalletPaid: "",
  supplierAdvanceUsed: "",
  notes: "",
  customFields: {},
};

const alertBeforeOptions = ["1 week", "2 weeks", "1 month", "3 months", "6 months", "1 year"];
const currencyOptions = ["AFN", "USD", "EUR", "GBP", "SAR", "PKR", "INR", "IRR", "AED", "CNY"];

const parseNumber = (value) => Number.parseFloat(value || 0) || 0;
const money = (value, currency = "AFN") =>
  `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency}`;

const normalizeAmountInput = (value) =>
  String(value ?? "")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => (value ? new Date(`${value}T12:00:00`) : null);

const formatShortDate = (value) => {
  const date = parseDateInput(value);
  return date
    ? date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
};

const alertBeforeToDays = (value) =>
  ({
    "1 week": 7,
    "2 weeks": 14,
    "1 month": 30,
    "3 months": 90,
    "6 months": 180,
    "1 year": 365,
  })[value] || 30;

const normalizeProductImages = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  if (images.length) return images;
  return product?.image
    ? [{ id: "legacy-image", name: product.name || "Product image", src: product.image }]
    : [];
};

const getProductName = (product) =>
  product.name || product.deviceName || product.productName || "Unnamed Product";

const getProductCode = (product) =>
  product.code || product.assetId || product.productCode || "";

const getSupplierLabel = (supplier) =>
  supplier.supplierName || supplier.companyName || supplier.name || "Supplier";

const productPageText = {
  en: {
    title: "Products", description: "Manage product stock, pricing, suppliers, barcodes and expiry alerts.", add: "Add Product",
    active: "Active Products", quantity: "Stock Quantity", value: "Stock Value", low: "Low Stock", expiryAlerts: "Expiry Alerts",
    inventory: "Product Inventory", inventoryHint: "All registered products and their current stock status", search: "Search products...",
    all: "All products", activeStock: "Active stock", lowOrOut: "Low or out", product: "Product", code: "Code", barcode: "Barcode",
    category: "Category", stock: "Stock", purchase: "Purchase", selling: "Selling", expiry: "Expiry", status: "Status", actions: "Actions",
    empty: "No product has been registered yet.", rows: "Rows per page", previous: "Previous", next: "Next",
    showing: (a, b, c) => `Showing ${a} to ${b} of ${c} records`, page: (a, b) => `Page ${a} of ${b}`,
  },
  fa: {
    title: "محصولات", description: "موجودی، قیمت‌ها، تأمین‌کنندگان، بارکدها و هشدارهای انقضای محصولات را مدیریت کنید.", add: "افزودن محصول",
    active: "محصولات فعال", quantity: "تعداد موجودی", value: "ارزش موجودی", low: "موجودی کم", expiryAlerts: "هشدارهای انقضا",
    inventory: "موجودی محصولات", inventoryHint: "تمام محصولات ثبت‌شده و وضعیت فعلی موجودی آن‌ها", search: "جستجوی محصولات...",
    all: "تمام محصولات", activeStock: "موجودی فعال", lowOrOut: "کم یا تمام‌شده", product: "محصول", code: "کُد", barcode: "بارکد",
    category: "دسته‌بندی", stock: "موجودی", purchase: "خرید", selling: "فروش", expiry: "انقضا", status: "وضعیت", actions: "عملیات",
    empty: "هنوز محصولی ثبت نشده است.", rows: "ردیف در هر صفحه", previous: "قبلی", next: "بعدی",
    showing: (a, b, c) => `نمایش ${a} تا ${b} از ${c} مورد`, page: (a, b) => `صفحه ${a} از ${b}`,
  },
  ps: {
    title: "محصولات", description: "د محصولاتو موجودي، بیې، عرضه کوونکي، بارکوډونه او د ختمېدو خبرتیاوې اداره کړئ.", add: "محصول زیات کړئ",
    active: "فعال محصولات", quantity: "د موجودۍ شمېر", value: "د موجودۍ ارزښت", low: "کمه موجودي", expiryAlerts: "د ختمېدو خبرتیاوې",
    inventory: "د محصولاتو موجودي", inventoryHint: "ټول ثبت شوي محصولات او د هغوی اوسنۍ موجودي", search: "محصولات ولټوئ...",
    all: "ټول محصولات", activeStock: "فعاله موجودي", lowOrOut: "کم یا ختم", product: "محصول", code: "کوډ", barcode: "بارکوډ",
    category: "کټګوري", stock: "موجودي", purchase: "پېرود", selling: "پلور", expiry: "د ختمېدو نېټه", status: "حالت", actions: "کړنې",
    empty: "تر اوسه کوم محصول نه دی ثبت شوی.", rows: "په هره پاڼه کې کتارونه", previous: "مخکینی", next: "بل",
    showing: (a, b, c) => `له ${c} ریکارډونو څخه ${a} تر ${b} ښودل کېږي`, page: (a, b) => `پاڼه ${a} له ${b}`,
  },
};

const productFormText = {
  en: { addNew: "Add New Product", edit: "Edit Product", name: "Product Name *", enterName: "Enter product name", code: "Code", enterCode: "Enter unique code", barcode: "Barcode", enterBarcode: "Enter or generate barcode", category: "Category", searchCategory: "Search or select category", purchase: "Purchase Price", selling: "Selling Price", margin: "Margin % Helper", marginHint: "Calculate selling price based on purchase price", apply: "Apply %", result: "Result", expiry: "Expiry date", alert: "Alert me before", low: "Low Stock Threshold", lowPlaceholder: "e.g. 10 pcs", lowHint: "Alert fires when stock reaches this count. Leave blank to disable.", quantity: "Quantity", unit: "Unit", searchUnit: "Search or select unit", currency: "Currency", supplier: "Supplier", supplierHint: "Optional — automatically creates a Godown entry and supplier ledger", notes: "Notes", notesPlaceholder: "Optional notes", images: "Product Images", imagesHint: "Upload product photos for quick visual identification.", upload: "Upload Images", noImage: "No image uploaded", save: "Save Changes", add: "Add Product" },
  fa: { addNew: "افزودن محصول جدید", edit: "ویرایش محصول", name: "نام محصول *", enterName: "نام محصول را وارد کنید", code: "کُد", enterCode: "کُد یکتا را وارد کنید", barcode: "بارکد", enterBarcode: "بارکد را وارد یا تولید کنید", category: "دسته‌بندی", searchCategory: "دسته‌بندی را جستجو یا انتخاب کنید", purchase: "قیمت خرید", selling: "قیمت فروش", margin: "محاسبه‌گر فیصدی سود", marginHint: "محاسبهٔ قیمت فروش بر اساس قیمت خرید", apply: "اعمال فیصدی", result: "نتیجه", expiry: "تاریخ انقضا", alert: "زمان هشدار پیش از انقضا", low: "حد هشدار موجودی کم", lowPlaceholder: "مثلاً ۱۰ عدد", lowHint: "در این تعداد موجودی هشدار داده می‌شود؛ برای غیرفعال‌کردن خالی بگذارید.", quantity: "تعداد", unit: "واحد", searchUnit: "واحد را جستجو یا انتخاب کنید", currency: "ارز", supplier: "تأمین‌کننده", supplierHint: "اختیاری — ورودی گدام و حساب تأمین‌کننده خودکار ایجاد می‌شود", notes: "یادداشت‌ها", notesPlaceholder: "یادداشت اختیاری", images: "تصاویر محصول", imagesHint: "برای شناسایی سریع، تصاویر محصول را بارگذاری کنید.", upload: "بارگذاری تصاویر", noImage: "تصویری بارگذاری نشده است", save: "ذخیرهٔ تغییرات", add: "افزودن محصول" },
  ps: { addNew: "نوی محصول زیات کړئ", edit: "محصول سمول", name: "د محصول نوم *", enterName: "د محصول نوم ولیکئ", code: "کوډ", enterCode: "ځانګړی کوډ ولیکئ", barcode: "بارکوډ", enterBarcode: "بارکوډ ولیکئ یا جوړ یې کړئ", category: "کټګوري", searchCategory: "کټګوري ولټوئ یا وټاکئ", purchase: "د پېرود بیه", selling: "د پلور بیه", margin: "د ګټې سلنې محاسبه", marginHint: "د پېرود بیې پر بنسټ د پلور بیه محاسبه کړئ", apply: "سلنه تطبیق کړئ", result: "پایله", expiry: "د ختمېدو نېټه", alert: "مخکې خبرتیا", low: "د کمې موجودۍ حد", lowPlaceholder: "لکه ۱۰ دانې", lowHint: "په دې شمېر کې خبرتیا ورکول کېږي؛ د بندولو لپاره یې تش پرېږدئ.", quantity: "شمېر", unit: "واحد", searchUnit: "واحد ولټوئ یا وټاکئ", currency: "اسعار", supplier: "عرضه کوونکی", supplierHint: "اختیاري — د ګدام داخله او د عرضه کوونکي حساب پخپله جوړوي", notes: "یادښتونه", notesPlaceholder: "اختیاري یادښت", images: "د محصول انځورونه", imagesHint: "د ژر پېژندنې لپاره انځورونه پورته کړئ.", upload: "انځورونه پورته کړئ", noImage: "انځور نه دی پورته شوی", save: "بدلونونه خوندي کړئ", add: "محصول زیات کړئ" },
};

function Products({ language = "en" }) {
  const tx = productPageText[language] || productPageText.en;
  const formTx = productFormText[language] || productFormText.en;
  const [products, setProducts] = useJsonCollection("products");
  const [suppliers, setSuppliers] = useJsonCollection("suppliers");
  const [categories, setCategories] = useJsonCollection("productCategories");
  const [systemSettings] = useJsonCollection("settings");
  const [, setDeletedItems] = useJsonCollection("deletedItems");


  const [formData, setFormData] = useState(emptyProduct);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [printReportOpen, setPrintReportOpen] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [customUnits, setCustomUnits] = useState([]);
  const imageInputRef = useRef(null);

  

  const categoryList = useMemo(() => {
    const custom = categories.map((item) => item.name || item).filter(Boolean);
    return [...new Set([...productCategories, ...custom])].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [categories]);

const unitList = useMemo(() => {
  const usedUnits = products
    .map((product) => product.unit)
    .filter(Boolean);

  return [
    ...new Set([
      ...productUnits,
      ...usedUnits,
      ...customUnits,
    ]),
  ].sort((a, b) => a.localeCompare(b));
}, [customUnits, products]);

  const normalizedProducts = useMemo(
    () =>
      products.map((product, originalIndex) => ({
        ...emptyProduct,
        ...product,
        name: getProductName(product),
        code: getProductCode(product),
        images: normalizeProductImages(product),
        originalIndex,
      })),
    [products]
  );

  const today = formatDateInput(new Date());

  const productStatus = useCallback((product) => {
    const quantity = parseNumber(product.quantity);
    const lowStock = parseNumber(product.lowStock);
    const expiryDate = parseDateInput(product.expiry);
    const now = parseDateInput(today);

    if (expiryDate && now && expiryDate < now) return "expired";
    if (expiryDate && now) {
      const alertDate = new Date(expiryDate);
      alertDate.setDate(alertDate.getDate() - alertBeforeToDays(product.alertBefore));
      if (now >= alertDate) return "expiring";
    }
    if (lowStock > 0 && quantity <= lowStock) return "low";
    if (quantity <= 0) return "out";
    return "active";
  }, [today]);

  const stats = useMemo(() => {
    const totalQuantity = normalizedProducts.reduce(
      (sum, product) => sum + parseNumber(product.quantity),
      0
    );
    const stockValue = normalizedProducts.reduce(
      (sum, product) =>
        sum + parseNumber(product.quantity) * parseNumber(product.purchase),
      0
    );
    const retailValue = normalizedProducts.reduce(
      (sum, product) =>
        sum + parseNumber(product.quantity) * parseNumber(product.selling),
      0
    );
    const lowStock = normalizedProducts.filter(
      (product) => productStatus(product) === "low" || productStatus(product) === "out"
    ).length;
    const expiring = normalizedProducts.filter(
      (product) =>
        productStatus(product) === "expiring" || productStatus(product) === "expired"
    ).length;

    return {
      totalProducts: normalizedProducts.length,
      totalQuantity,
      stockValue,
      retailValue,
      lowStock,
      expiring,
    };
  }, [normalizedProducts, productStatus]);

  const filteredProducts = normalizedProducts.filter((product) => {
    const keyword = search.trim().toLowerCase();
    const status = productStatus(product);
    const supplier = suppliers.find((item) => String(item.id) === String(product.supplierId));
    const matchesSearch =
      !keyword ||
      [
        product.name,
        product.code,
        product.barcode,
        product.category,
        product.unit,
        getSupplierLabel(supplier || {}),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);

    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "low" && ["low", "out"].includes(status)) ||
      (stockFilter === "expiry" && ["expiring", "expired"].includes(status)) ||
      stockFilter === status;

    return matchesSearch && matchesStock;
  });

  const pagination = useTablePagination(filteredProducts, `${search}-${stockFilter}`);

  const supplierOptions = [
    { value: "", label: "No supplier" },
    ...suppliers.map((supplier) => ({
      value: String(supplier.id || supplier.supplierId || getSupplierLabel(supplier)),
      label: getSupplierLabel(supplier),
    })),
  ];

  const openAddModal = () => {
    setFormData({
      ...emptyProduct,
      code: generateProductCode(),
      barcode: generateBarcode(),
    });
    setEditIndex(null);
    setCategoryQuery("");
    setUnitQuery("");
    setShowModal(true);
  };

  const editProduct = (product) => {
    setFormData({ ...emptyProduct, ...product });
    setEditIndex(product.originalIndex);
    setCategoryQuery(product.category || "");
    setUnitQuery(product.unit || "");
    setShowModal(true);
  };

  const resetModal = () => {
    setFormData(emptyProduct);
    setEditIndex(null);
    setCategoryQuery("");
    setUnitQuery("");
    setShowModal(false);
  };

  const generateProductCode = () => {
    const maxNumber = products.reduce((max, product) => {
      const match = String(getProductCode(product)).match(/^PRD-(\d+)$/i);
      if (!match) return max;
      return Math.max(max, Number(match[1] || 0));
    }, 0);

    return `PRD-${String(maxNumber + 1).padStart(4, "0")}`;
  };

  const generateBarcode = () => {
    const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return seed.slice(-12).padStart(12, "0");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const amountFields = [
      "purchase",
      "selling",
      "lowStock",
      "quantity",
      "cashWalletPaid",
      "supplierAdvanceUsed",
    ];

    setFormData((previous) => ({
      ...previous,
      [name]: amountFields.includes(name) ? normalizeAmountInput(value) : value,
    }));
  };

  const addCustomCategory = async (categoryName) => {
    const cleanName = categoryName.trim();
    if (!cleanName) return;

    const exists = categoryList.some(
      (category) => category.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) return;

    await setCategories([
      ...categories,
      {
        id: Date.now(),
        name: cleanName,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const addCustomUnit = (unitName) => {
    const cleanName = unitName.trim();
    if (!cleanName) return;
    const exists = unitList.some((unit) => unit.toLowerCase() === cleanName.toLowerCase());
    if (!exists) setCustomUnits((previous) => [...previous, cleanName]);
  };

  const handleSupplierFormChange = (event) => {
    const { name, value } = event.target;
    setSupplierForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSupplierSubmit = async (event) => {
    event.preventDefault();
    const name = supplierForm.name.trim();
    if (!name) {
      notify("Please enter the supplier name.", "error");
      return;
    }

    const now = new Date().toISOString();
    const nextSupplier = {
      id: `supplier-${Date.now()}`,
      accountType: "supplier",
      name,
      supplierName: name,
      phone: supplierForm.phone.trim(),
      email: supplierForm.email.trim(),
      address: supplierForm.address.trim(),
      currency: formData.currency || "AFN",
      items: [],
      balance: "",
      status: "Active",
      notes: "",
      customFields: {},
      createdAt: now,
      updatedAt: now,
    };

    const saved = await setSuppliers([nextSupplier, ...suppliers]);
    if (!saved) return;

    setFormData((previous) => ({ ...previous, supplierId: nextSupplier.id }));
    setSupplierForm({ name: "", phone: "", email: "", address: "" });
    setShowSupplierModal(false);
    notify("Supplier added successfully.");
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        notify("Please select image files only.", "error");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFormData((previous) => ({
          ...previous,
          images: [
            ...normalizeProductImages(previous),
            {
              id: `${Date.now()}-${file.name}`,
              name: file.name,
              src: String(reader.result || ""),
            },
          ],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (imageId) => {
    setFormData((previous) => ({
      ...previous,
      images: normalizeProductImages(previous).filter((image) => image.id !== imageId),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = formData.name.trim();
    if (!name) {
      notify("Please enter the product name.", "error");
      return;
    }

    const code = formData.code.trim() || generateProductCode();
    const duplicateCode = products.some((product, index) => {
      if (index === editIndex) return false;
      return (
        code &&
        getProductCode(product) &&
        code.toLowerCase() === getProductCode(product).toLowerCase()
      );
    });

    if (duplicateCode) {
      notify("A product with this code already exists.", "error");
      return;
    }

    if (formData.category.trim()) {
      await addCustomCategory(formData.category);
    }

    const nextProduct = {
      ...formData,
      id: formData.id || `product-${Date.now()}`,
      name,
      code,
      barcode: formData.barcode.trim() || generateBarcode(),
      category: formData.category.trim(),
      unit: formData.unit.trim() || "Pieces (pcs)",
      images: normalizeProductImages(formData),
      purchase: parseNumber(formData.purchase),
      selling: parseNumber(formData.selling),
      lowStock: parseNumber(formData.lowStock),
      quantity: parseNumber(formData.quantity),
      cashWalletPaid: parseNumber(formData.cashWalletPaid),
      supplierAdvanceUsed: parseNumber(formData.supplierAdvanceUsed),
      updatedAt: new Date().toISOString(),
      createdAt: formData.createdAt || new Date().toISOString(),
    };

    const nextProducts =
      editIndex === null
        ? [nextProduct, ...products]
        : products.map((product, index) => (index === editIndex ? nextProduct : product));

    const saved = await setProducts(nextProducts);
    if (!saved) return;

    notify(editIndex === null ? "Product added successfully." : "Product updated successfully.");
    resetModal();
  };

  const confirmDelete = async () => {
    if (!deleteProduct) return;

    const archived = await setDeletedItems((current) => [
      createRecycleEntry("products", deleteProduct, deleteProduct.name),
      ...current,
    ]);
    if (!archived) return;

    const saved = await setProducts(
      products.filter((_, index) => index !== deleteProduct.originalIndex)
    );
    if (!saved) return;

    notify("Product deleted successfully.");
    setDeleteProduct(null);
  };

  const printBarcode = (product) => {
    const printWindow = window.open("", "_blank", "width=420,height=360");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${product.name} Barcode</title>
          <style>
            body { margin: 0; font-family: Arial, sans-serif; display: grid; place-items: center; min-height: 100vh; }
            .label { width: 320px; border: 1px solid #111827; padding: 18px; text-align: center; }
            h1 { margin: 0 0 8px; font-size: 18px; }
            .bars { height: 72px; margin: 12px 0; background: repeating-linear-gradient(90deg,#111 0 3px,#fff 3px 6px,#111 6px 8px,#fff 8px 12px); }
            strong { letter-spacing: 3px; }
            p { margin: 6px 0 0; color: #475569; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="label">
            <h1>${product.name}</h1>
            <div class="bars"></div>
            <strong>${product.barcode || product.code}</strong>
            <p>${product.code || ""}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  const stockFilterOptions = [
    { value: "all", label: tx.all },
    { value: "active", label: tx.activeStock },
    { value: "low", label: tx.lowOrOut },
    { value: "expiry", label: tx.expiryAlerts },
  ];

  return (
    <div className="products-page">
      <div className="products-header">
        <div>
          <h1>{tx.title}</h1>
          <p>{tx.description}</p>
        </div>

        <div className="products-header-actions">
          <button type="button" className="products-report-btn" onClick={() => setPrintReportOpen(true)}>
            <Printer size={16} /> {language === "fa" ? "چاپ گزارش" : language === "ps" ? "راپور چاپ" : "Print Report"}
          </button>
          <button type="button" className="products-add-btn" onClick={openAddModal}>
            <Plus size={17} /> {tx.add}
          </button>
        </div>
      </div>

      <section className="products-stats">
        <StatCard icon={Package} label={tx.active} value={stats.totalProducts} />
        <StatCard icon={Archive} label={tx.quantity} value={stats.totalQuantity} />
        <StatCard icon={Boxes} label={tx.value} value={money(stats.stockValue)} />
        <StatCard icon={AlertTriangle} label={tx.low} value={stats.lowStock} tone="warning" />
        <StatCard icon={AlertTriangle} label={tx.expiryAlerts} value={stats.expiring} tone="danger" />
      </section>

      <section className="products-table-card">
        <div className="products-table-header">
          <div>
            <h3>{tx.inventory}</h3>
            <p>{tx.inventoryHint}</p>
          </div>

          <div className="products-table-tools">
            <label className="products-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tx.search}
              />
            </label>
            <CustomSelect
              ariaLabel="Filter products"
              className="products-filter-select"
              options={stockFilterOptions}
              value={stockFilter}
              onChange={setStockFilter}
            />
          </div>
        </div>

        <div className="products-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{tx.product}</th><th>{tx.code}</th><th>{tx.barcode}</th><th>{tx.category}</th><th>{tx.stock}</th>
                <th>{tx.purchase}</th><th>{tx.selling}</th><th>{tx.expiry}</th><th>{tx.status}</th><th>{tx.actions}</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((product) => {
                const firstImage = normalizeProductImages(product)[0];
                const status = productStatus(product);
                return (
                  <tr key={product.id || product.code || product.originalIndex}>
                    <td>
                      <div className="product-name-cell">
                        <div className="product-thumb">
                          {firstImage ? (
                            <img src={firstImage.src} alt={product.name} />
                          ) : (
                            <Package size={18} />
                          )}
                        </div>
                        <div>
                          <strong>{product.name}</strong>
                          <span>{product.notes || "Product record"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="products-strong">{product.code || "-"}</td>
                    <td>{product.barcode || "-"}</td>
                    <td>{product.category || "-"}</td>
                    <td>
                      <strong>{parseNumber(product.quantity)}</strong> {product.unit || "Piece"}
                    </td>
                    <td>{money(product.purchase, product.currency)}</td>
                    <td>{money(product.selling, product.currency)}</td>
                    <td>{formatShortDate(product.expiry)}</td>
                    <td>
                      <StatusBadge status={status} />
                    </td>
                    <td>
                      <FloatingActionMenu
                        ariaLabel="Product actions"
                        actions={[
                          {
                            icon: <Eye size={15} />,
                            label: "View",
                            onClick: () => setViewProduct(product),
                          },
                          {
                            icon: <Pencil size={15} />,
                            label: "Edit",
                            onClick: () => editProduct(product),
                          },
                          {
                            icon: <Printer size={15} />,
                            label: "Print Barcode",
                            onClick: () => printBarcode(product),
                          },
                          {
                            danger: true,
                            icon: <Trash2 size={15} />,
                            label: "Delete",
                            onClick: () => setDeleteProduct(product),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}

              {!filteredProducts.length && (
                <tr>
                  <td colSpan="10" className="products-empty">
                    {tx.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          setPage={pagination.setPage}
          totalItems={filteredProducts.length}
          pageSize={pagination.pageSize}
          setPageSize={pagination.setPageSize}
          labels={{ showing: tx.showing, page: tx.page, rowsPerPage: tx.rows, previous: tx.previous, next: tx.next }}
        />
      </section>

      {showModal && (
        <ProductModal
          addCustomCategory={addCustomCategory}
          alertBeforeOptions={alertBeforeOptions}
          categoryList={categoryList}
          categoryQuery={categoryQuery}
          currencyOptions={currencyOptions}
          editMode={editIndex !== null}
          formData={formData}
          generateBarcode={generateBarcode}
          handleChange={handleChange}
          handleImageUpload={handleImageUpload}
          imageInputRef={imageInputRef}
          onClose={resetModal}
          onOpenSupplierForm={() => setShowSupplierModal(true)}
          onSubmit={handleSubmit}
          removeImage={removeImage}
          setCategoryQuery={setCategoryQuery}
          setFormData={setFormData}
          setUnitQuery={setUnitQuery}
          supplierOptions={supplierOptions}
          unitOptions={unitList}
          addCustomUnit={addCustomUnit}
          unitQuery={unitQuery}
          tx={formTx}
          rtl={language === "fa" || language === "ps"}
        />
      )}

      {printReportOpen && (
        <ProductPrintStudio
          company={systemSettings[0] || {}}
          language={language}
          products={filteredProducts}
          onClose={() => setPrintReportOpen(false)}
        />
      )}

      {showSupplierModal && (
        <SupplierCreateModal
          formData={supplierForm}
          onChange={handleSupplierFormChange}
          onClose={() => setShowSupplierModal(false)}
          onSubmit={handleSupplierSubmit}
        />
      )}

      {viewProduct && (
        <ProductDetailModal
          product={viewProduct}
          supplier={suppliers.find((item) => String(item.id) === String(viewProduct.supplierId))}
          status={productStatus(viewProduct)}
          onClose={() => setViewProduct(null)}
        />
      )}

      {deleteProduct && (
        <div className="products-modal-backdrop">
          <div className="products-delete-modal">
            <h3>Delete Product</h3>
            <p>
              Are you sure you want to delete <strong>{deleteProduct.name}</strong>? This
              action cannot be undone.
            </p>
            <div className="products-modal-actions">
              <button type="button" className="products-light-btn" onClick={() => setDeleteProduct(null)}>
                Cancel
              </button>
              <button type="button" className="products-danger-btn" onClick={confirmDelete}>
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "" }) {
  return (
    <div className={`products-stat-card ${tone}`.trim()}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={20} />
    </div>
  );
}

function StatusBadge({ status }) {
  const labels = {
    active: "Active",
    low: "Low Stock",
    out: "Out of Stock",
    expiring: "Expiring Soon",
    expired: "Expired",
  };

  return <span className={`product-status ${status}`}>{labels[status] || "Active"}</span>;
}

function SearchableTextInput({
  options,
  placeholder,
  value,
  query,
  setQuery,
  onChange,
  onAdd,
}) {
  const [open, setOpen] = useState(false);
  const searchTerm = String(query || "").trim().toLowerCase();
  const matches = searchTerm
    ? options.filter((option) => option.toLowerCase().includes(searchTerm))
    : options;

  const commit = (nextValue) => {
    const cleanValue = nextValue.trim();
    if (!cleanValue) return;
    onAdd?.(cleanValue);
    onChange(cleanValue);
    setQuery(cleanValue);
    setOpen(false);
  };

  return (
    <div className="products-searchable-input">
      <input
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && query.trim()) {
            event.preventDefault();
            commit(query);
          }
        }}
      />
      {open && (
        <div className="products-searchable-menu">
          {matches.map((option) => (
            <button key={option} type="button" onMouseDown={() => commit(option)}>
              {option}
            </button>
          ))}
          {query.trim() &&
            !options.some((option) => option.toLowerCase() === query.trim().toLowerCase()) && (
              <button
                type="button"
                className="products-add-option"
                onMouseDown={() => commit(query)}
              >
                + Add: {query.trim()}
              </button>
            )}
        </div>
      )}
    </div>
  );
}

function ProductModal({
  addCustomUnit,
  addCustomCategory,
  alertBeforeOptions,
  categoryList,
  categoryQuery,
  currencyOptions,
  editMode,
  formData,
  generateBarcode,
  handleChange,
  handleImageUpload,
  imageInputRef,
  onClose,
  onOpenSupplierForm,
  onSubmit,
  removeImage,
  setCategoryQuery,
  setFormData,
  setUnitQuery,
  supplierOptions,
  unitOptions,
  unitQuery,
  tx,
  rtl,
}) {
  const imageList = normalizeProductImages(formData);
  const [marginPercent, setMarginPercent] = useState("");
  const purchaseAmount = parseNumber(formData.purchase);
  const quantityAmount = parseNumber(formData.quantity);
  const grandTotal = purchaseAmount * quantityAmount;
  const showGrandTotal = purchaseAmount > 0 && quantityAmount > 0;
  const creditAmount = Math.max(
    0,
    grandTotal - parseNumber(formData.cashWalletPaid) - parseNumber(formData.supplierAdvanceUsed)
  );

  const applyMargin = () => {
    const margin = parseNumber(marginPercent);
    if (!purchaseAmount || !margin) return;
    const selling = purchaseAmount + purchaseAmount * (margin / 100);
    setFormData((previous) => ({
      ...previous,
      selling: String(Math.round((selling + Number.EPSILON) * 100) / 100),
    }));
  };

  return (
    <div className="products-modal-backdrop">
      <div className={`products-modal products-product-modal${rtl ? " products-modal-rtl" : ""}`} dir={rtl ? "rtl" : "ltr"}>
        <div className="products-modal-header">
          <div>
            <h3>{editMode ? tx.edit : tx.addNew}</h3>
          </div>
          <button type="button" className="products-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="products-form-grid">
            <Field label={tx.name} className="full">
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={tx.enterName}
              />
            </Field>

            <Field label={tx.code} className="full">
              <input
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder={tx.enterCode}
              />
            </Field>

            <Field label={tx.barcode} className="full label-with-icon" icon={<Barcode size={14} />}>
              <div className="products-input-action">
                <input
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  placeholder={tx.enterBarcode}
                />
                <button
                  type="button"
                  className="products-inline-add-btn"
                  onClick={() =>
                    setFormData((previous) => ({ ...previous, barcode: generateBarcode() }))
                  }
                  title="Generate barcode"
                >
                  <Barcode size={16} />
                </button>
              </div>
            </Field>

            <Field label={tx.category} className="full field-with-actions">
  <SearchableTextInput
    options={categoryList}
    placeholder={tx.searchCategory}
    value={formData.category}
    query={categoryQuery}
    setQuery={setCategoryQuery}
    onAdd={addCustomCategory}
    onChange={(value) => {
      setFormData((previous) => ({
        ...previous,
        category: value,
      }));
    }}
  />
</Field>

            <Field label={tx.purchase} className="half">
              <input
                name="purchase"
                value={formData.purchase}
                onChange={handleChange}
                inputMode="decimal"
                placeholder="0.00"
              />
            </Field>

            <Field label={tx.selling} className="half">
              <input
                name="selling"
                value={formData.selling}
                onChange={handleChange}
                inputMode="decimal"
                placeholder="0.00"
              />
            </Field>
<div className="products-margin-helper full">
  <div className="products-margin-title">
    <span className="products-margin-icon">%</span>

    <div>
      <strong>{tx.margin}</strong>
      <small>
        {tx.marginHint}
      </small>
    </div>
  </div>

  <div className="products-margin-row">
    <div className="products-margin-input">
      <input
        type="text"
        value={marginPercent}
        onChange={(event) =>
          setMarginPercent(
            normalizeAmountInput(event.target.value)
          )
        }
        inputMode="decimal"
        placeholder="e.g. 30"
      />

      <span>%</span>
    </div>

    <button
      type="button"
      onClick={applyMargin}
      disabled={
        !purchaseAmount ||
        !parseNumber(marginPercent)
      }
    >
      {tx.apply}
    </button>
  </div>

  <div className="products-margin-description">
    <span>
      Selling = Purchase × (1 + Margin ÷ 100)
    </span>

    {purchaseAmount > 0 &&
      parseNumber(marginPercent) > 0 && (
        <strong>
          {tx.result}:{" "}
          {(
            purchaseAmount +
            purchaseAmount *
              (parseNumber(marginPercent) / 100)
          ).toFixed(2)}
        </strong>
      )}
  </div>
</div>

            <Field label={tx.expiry} className="half label-with-icon" icon={<AlertTriangle size={14} />}>
              <input
                type="date"
                name="expiry"
                value={formData.expiry}
                onChange={handleChange}
              />
            </Field>

            <Field label={tx.alert} className="half">
              <CustomSelect
                ariaLabel="Alert before expiry"
                options={alertBeforeOptions.map((option) => ({
                  value: option,
                  label: option,
                }))}
                value={formData.alertBefore}
                onChange={(value) =>
                  setFormData((previous) => ({ ...previous, alertBefore: value }))
                }
              />
            </Field>

            <Field label={tx.low} className="full label-with-icon" icon={<Package size={14} />}>
              <input
                name="lowStock"
                value={formData.lowStock}
                onChange={handleChange}
                inputMode="decimal"
                placeholder={tx.lowPlaceholder}
              />
              <small>{tx.lowHint}</small>
            </Field>

            <Field label={tx.quantity} className="third">
              <input
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                inputMode="decimal"
                placeholder="0"
              />
            </Field>

            <Field label={tx.unit} className="third field-with-actions">
  <SearchableTextInput
                options={unitOptions}
    placeholder={tx.searchUnit}
    value={formData.unit}
    query={unitQuery}
    setQuery={setUnitQuery}
    onAdd={addCustomUnit}
    onChange={(value) => {
      setFormData((previous) => ({
        ...previous,
        unit: value,
      }));
    }}
  />
</Field>

            <Field label={tx.currency} className="third">
              <CustomSelect
                ariaLabel="Currency"
                options={currencyOptions.map((currency) => ({
                  value: currency,
                  label: currency,
                }))}
                value={formData.currency}
                onChange={(value) =>
                  setFormData((previous) => ({ ...previous, currency: value }))
                }
              />
            </Field>

            <Field label={tx.supplier} className="full">
              <div className="products-supplier-box">
                <span className="products-supplier-hint">
                  {tx.supplierHint}
                </span>
                <div className="products-inline-select">
                  <CustomSelect
                    ariaLabel="Supplier"
                    options={supplierOptions}
                    value={formData.supplierId}
                    onChange={(value) =>
                      setFormData((previous) => ({ ...previous, supplierId: value }))
                    }
                  />
                  <button
                    type="button"
                    className="products-inline-add-btn"
                    onClick={onOpenSupplierForm}
                    title="Add supplier"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {showGrandTotal && (
                  <small>
                    Adding this product will create a Godown import entry of{" "}
                    {quantityAmount.toLocaleString("en-US")} {formData.unit || "pcs"}.
                  </small>
                )}
              </div>
            </Field>

            {showGrandTotal && (
              <div className="products-grand-total full">
                <div className="products-grand-head">
                  <span>
                    {quantityAmount.toLocaleString("en-US")} {formData.unit || "pcs"} x{" "}
                    {money(purchaseAmount, formData.currency)}
                  </span>
                  <strong>Grand Total: {money(grandTotal, formData.currency)}</strong>
                </div>

                <div className="products-payment-grid">
                  <label>
                    <span>Pay from cash wallet</span>
                    <input
                      name="cashWalletPaid"
                      value={formData.cashWalletPaid}
                      onChange={handleChange}
                      inputMode="decimal"
                      placeholder="0"
                    />
                    <small>Records a wallet withdrawal.</small>
                  </label>
                  <label>
                    <span>Use supplier advance</span>
                    <input
                      name="supplierAdvanceUsed"
                      value={formData.supplierAdvanceUsed}
                      onChange={handleChange}
                      inputMode="decimal"
                      placeholder="0"
                    />
                    <small>Available advance: 0 AFN</small>
                  </label>
                  <label>
                    <span>On credit (payable)</span>
                    <input value={money(creditAmount, formData.currency)} readOnly />
                    <small>Auto-calculated remainder.</small>
                  </label>
                </div>

                <div className="products-funding-row">
                  <span>FUNDING SOURCE: <strong>CREDIT</strong></span>
                  <span>Paid now <strong>{money(parseNumber(formData.cashWalletPaid), formData.currency)}</strong></span>
                </div>
              </div>
            )}

            <Field label={tx.notes} className="full products-optional-field">
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder={tx.notesPlaceholder}
              />
            </Field>

            <div className="products-image-field full products-optional-field">
              <div>
                <label>{tx.images}</label>
                <p>{tx.imagesHint}</p>
              </div>
              <div className="products-image-actions">
                <button
                  type="button"
                  className="products-light-btn"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload size={15} />
                  {tx.upload}
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={handleImageUpload}
                />
              </div>

              <div className="products-image-grid">
                {imageList.map((image) => (
                  <div className="products-image-preview" key={image.id}>
                    <img src={image.src} alt={image.name} />
                    <button type="button" onClick={() => removeImage(image.id)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {!imageList.length && (
                  <div className="products-image-empty">
                    <ImagePlus size={22} />
                    <span>{tx.noImage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="products-modal-actions">
            <button type="submit" className="products-save-btn">
              {editMode ? tx.save : tx.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SupplierCreateModal({ formData, onChange, onClose, onSubmit }) {
  return (
    <div className="products-modal-backdrop products-nested-backdrop">
      <div className="products-delete-modal products-supplier-modal">
        <div className="products-modal-header">
          <div>
            <h3>Add Supplier</h3>
            <p>Create a supplier without leaving the product form.</p>
          </div>
          <button type="button" className="products-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="products-form-grid products-supplier-grid">
            <Field label="Supplier Name" className="full">
              <input
                name="name"
                value={formData.name}
                onChange={onChange}
                placeholder="Supplier name"
              />
            </Field>
            <Field label="Phone Number">
              <input
                name="phone"
                value={formData.phone}
                onChange={onChange}
                placeholder="Phone"
              />
            </Field>
            <Field label="Email Address">
              <input
                name="email"
                value={formData.email}
                onChange={onChange}
                placeholder="Email"
              />
            </Field>
            <Field label="Address" className="full">
              <textarea
                name="address"
                value={formData.address}
                onChange={onChange}
                placeholder="Address"
              />
            </Field>
          </div>

          <div className="products-modal-actions">
            <button type="button" className="products-light-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="products-save-btn">
              Add Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, className = "", icon = null }) {
  return (
    <label className={`products-form-group ${className}`.trim()}>
      <span>{icon}{label}</span>
      {children}
    </label>
  );
}

function ProductDetailModal({ product, supplier, status, onClose }) {
  const images = normalizeProductImages(product);

  return (
    <div className="products-modal-backdrop">
      <div className="products-detail-modal">
        <div className="products-modal-header">
          <div>
            <h3>{product.name}</h3>
            <p>{product.code || "Product details"}</p>
          </div>
          <button type="button" className="products-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="products-detail-body">
          <div className="products-detail-gallery">
            {images[0] ? (
              <img src={images[0].src} alt={product.name} />
            ) : (
              <Package size={34} />
            )}
          </div>

          <div className="products-detail-grid">
            <DetailItem label="Barcode" value={product.barcode || "-"} icon={Barcode} />
            <DetailItem label="Category" value={product.category || "-"} />
            <DetailItem label="Supplier" value={getSupplierLabel(supplier || {})} />
            <DetailItem label="Quantity" value={`${parseNumber(product.quantity)} ${product.unit || ""}`} />
            <DetailItem label="Purchase" value={money(product.purchase, product.currency)} />
            <DetailItem label="Selling" value={money(product.selling, product.currency)} />
            <DetailItem label="Expiry" value={formatShortDate(product.expiry)} />
            <DetailItem label="Status" value={<StatusBadge status={status} />} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="products-detail-item">
      <span>
        {Icon && <Icon size={14} />}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function ProductPrintStudio({ company, language, products, onClose }) {
  const saved = normalizePrintSettings(company.printSettings || {}, company);
  const [paper, setPaper] = useState(saved.paperSize || "A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState("normal");
  const [rowsPerPage, setRowsPerPage] = useState(Number(saved.rowsPerPage || 25));
  const [scale, setScale] = useState(82);
  const [sizes, setSizes] = useState({ title: saved.titleSize, subtitle: saved.subtitleSize, header: saved.headerTextSize, body: saved.bodyTextSize, footer: saved.footerTextSize });
  const rtl = language === "fa" || language === "ps";
  const labels = language === "fa"
    ? { title: "گزارش موجودی محصولات", all: "تمام محصولات", total: "مجموع محصولات", stock: "موجود", out: "تمام‌شده", contents: "محتویات", records: "رکورد", page: "صفحه ۱ از ۱", paper: "کاغذ", orientation: "جهت", portrait: "عمودی", landscape: "افقی", margin: "حاشیه صفحه", narrow: "کم", normal: "عادی", wide: "زیاد", rows: "ردیف در صفحه", typography: "اندازه نوشته", print: "چاپ", pdf: "PDF", product: "محصول", code: "کُد", category: "دسته‌بندی", quantity: "تعداد", value: "ارزش موجودی" }
    : language === "ps"
      ? { title: "د محصولاتو موجودۍ راپور", all: "ټول محصولات", total: "ټول محصولات", stock: "موجود", out: "ختم", contents: "منځپانګه", records: "ریکارډونه", page: "پاڼه ۱ له ۱", paper: "کاغذ", orientation: "لوری", portrait: "عمودي", landscape: "افقي", margin: "د پاڼې حاشیه", narrow: "کمه", normal: "عادي", wide: "زیاته", rows: "په پاڼه کې کتارونه", typography: "د لیک اندازه", print: "چاپ", pdf: "PDF", product: "محصول", code: "کوډ", category: "کټګوري", quantity: "شمېر", value: "د موجودۍ ارزښت" }
      : { title: "Product Inventory Report", all: "All Products", total: "Total Products", stock: "In Stock", out: "Out of Stock", contents: "Contents", records: "Records", page: "Page 1 of 1", paper: "Paper", orientation: "Orientation", portrait: "Portrait", landscape: "Landscape", margin: "Page Margin", narrow: "Narrow", normal: "Normal", wide: "Wide", rows: "Rows / Page", typography: "Live Typography", print: "Print", pdf: "PDF", product: "Product", code: "Code", category: "Category", quantity: "Quantity", value: "Stock Value" };
  const inStock = products.filter((product) => parseNumber(product.quantity) > 0).length;
  const reportRows = products.slice(0, Math.max(1, rowsPerPage));
  const marginSize = { narrow: 7, normal: 14, wide: 22 }[margin];
  const basePaperSize = {
    A4: [210, 297], A5: [148, 210], Letter: [216, 279], Legal: [216, 356],
    T80: [80, 220], T58: [58, 190], Custom: [210, 297],
  }[paper] || [210, 297];
  const isThermal = paper === "T80" || paper === "T58";
  const paperSize = orientation === "landscape" && !isThermal
    ? [basePaperSize[1], basePaperSize[0]]
    : basePaperSize;
  const businessName = rtl ? (language === "fa" ? saved.businessNameFa : saved.businessNamePs) || saved.businessNameEn : saved.businessNameEn;
  const subtitle = rtl ? (language === "fa" ? saved.subtitleFa : saved.subtitlePs) || saved.subtitleEn : saved.subtitleEn;
  const printNow = () => window.print();

  return (
    <div className="product-print-backdrop">
      <style>{`@media print { @page { size: ${paperSize[0]}mm ${paperSize[1]}mm; margin: 0; } }`}</style>
      <section className="product-print-studio" dir={rtl ? "rtl" : "ltr"}>
        <header className="product-print-toolbar">
          <strong><Printer size={16} /> {labels.title}</strong>
          <div className="product-print-toolbar-actions">
            <button type="button" onClick={() => setScale((value) => Math.max(55, value - 8))}>−</button><span>{scale}%</span><button type="button" onClick={() => setScale((value) => Math.min(110, value + 8))}>+</button>
            <button type="button" onClick={printNow}><FileDown size={15} /> {labels.pdf}</button>
            <button type="button" className="primary" onClick={printNow}><Printer size={15} /> {labels.print}</button>
            <button type="button" className="close" onClick={onClose}><X size={17} /></button>
          </div>
        </header>
        <div className="product-print-body">
          <aside className="product-print-controls">
            <ControlTitle>{labels.paper}</ControlTitle><ChoiceGrid values={["A4", "A5", "Letter", "Legal", "T80", "T58", "Custom"]} value={paper} onChange={setPaper} />
            <ControlTitle>{labels.orientation}</ControlTitle><ChoiceGrid values={[labels.portrait, labels.landscape]} value={orientation === "portrait" ? labels.portrait : labels.landscape} onChange={(value) => setOrientation(value === labels.portrait ? "portrait" : "landscape")} />
            <ControlTitle>{labels.margin}</ControlTitle><ChoiceGrid values={[labels.narrow, labels.normal, labels.wide]} value={labels[margin]} onChange={(value) => setMargin(value === labels.narrow ? "narrow" : value === labels.wide ? "wide" : "normal")} />
            <ControlTitle>{labels.rows}</ControlTitle><input type="number" min="5" max="100" value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value) || 5)} />
            <ControlTitle>{labels.typography}</ControlTitle>
            {Object.entries(sizes).map(([key, value]) => <label className="product-print-range" key={key}><span>{key}<b>{value}px</b></span><input type="range" min="7" max={key === "title" ? 34 : 20} value={value} onChange={(event) => setSizes((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}
            <small>{paper} · {orientation} · {marginSize}mm</small>
          </aside>
          <main className="product-print-canvas">
            <article className={`product-report-paper ${orientation}${isThermal ? " thermal" : ""}`} style={{ width: `${paperSize[0]}mm`, minHeight: `${paperSize[1]}mm`, "--report-scale": scale / 100, "--report-margin": `${isThermal ? Math.min(marginSize, 5) : marginSize}mm`, "--report-primary": saved.primaryColor, "--report-accent": saved.accentColor, "--report-title": `${sizes.title}px`, "--report-subtitle": `${sizes.subtitle}px`, "--report-header": `${sizes.header}px`, "--report-body": `${sizes.body}px`, "--report-footer": `${sizes.footer}px` }}>
              <div className="product-report-header">{saved.showLogo && saved.logo ? <img src={saved.logo} alt="" /> : <div className="product-report-logo"><Package size={28} /></div>}<div><strong>{businessName}</strong><span>{subtitle}</span></div><p>{[saved.phone, saved.email, saved.address].filter(Boolean).join(" · ")}</p></div>
              {saved.watermark && <img className="product-report-watermark" src={saved.watermark} alt="" style={{ opacity: Number(saved.watermarkOpacity || 0) / 100 }} />}
              <div className="product-report-heading"><div><small>REPORT</small><h1>{labels.title}</h1><p>{labels.all}</p></div><div><b>{new Date().toLocaleString()}</b><span>{labels.records} {products.length}</span><span>{labels.page}</span></div></div>
              <div className="product-report-stats"><div><span>{labels.total}</span><b>{products.length}</b></div><div><span>{labels.stock}</span><b>{inStock}</b></div><div><span>{labels.out}</span><b>{products.length - inStock}</b></div></div>
              <p className="product-report-contents">{labels.contents}: <span>1 — {Math.min(reportRows.length, products.length)} {labels.records}</span></p>
              {!!reportRows.length && <table><thead><tr><th>{labels.product}</th><th>{labels.code}</th><th>{labels.category}</th><th>{labels.quantity}</th><th>{labels.value}</th></tr></thead><tbody>{reportRows.map((product, index) => <tr key={product.id || index}><td>{getProductName(product)}</td><td>{getProductCode(product) || "-"}</td><td>{product.category || "-"}</td><td>{parseNumber(product.quantity)} {product.unit || ""}</td><td>{money(parseNumber(product.purchase) * parseNumber(product.quantity), product.currency)}</td></tr>)}</tbody></table>}
              <footer><span>{saved.footerText || "Powered by Smart Office"}</span>{saved.showTimestamp && <span>{new Date().toLocaleString()}</span>}</footer>
            </article>
          </main>
        </div>
      </section>
    </div>
  );
}

function ControlTitle({ children }) { return <h4 className="product-print-control-title">{children}</h4>; }
function ChoiceGrid({ values, value, onChange }) { return <div className="product-print-choice-grid">{values.map((item) => <button type="button" className={value === item ? "active" : ""} key={item} onClick={() => onChange(item)}>{item}</button>)}</div>; }

export default Products;
