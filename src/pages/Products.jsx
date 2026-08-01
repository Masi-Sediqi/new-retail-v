import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Barcode,
  Boxes,
  Eye,
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

function Products() {
  const [products, setProducts] = useJsonCollection("products");
  const [suppliers, setSuppliers] = useJsonCollection("suppliers");
  const [categories, setCategories] = useJsonCollection("productCategories");
  const [, setDeletedItems] = useJsonCollection("deletedItems");


  const [formData, setFormData] = useState(emptyProduct);
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [showModal, setShowModal] = useState(false);
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
    { value: "all", label: "All products" },
    { value: "active", label: "Active stock" },
    { value: "low", label: "Low or out" },
    { value: "expiry", label: "Expiry alerts" },
  ];

  return (
    <div className="products-page">
      <div className="products-header">
        <div>
          <h1>Products</h1>
          <p>Manage product stock, pricing, suppliers, barcodes and expiry alerts.</p>
        </div>

        <button type="button" className="products-add-btn" onClick={openAddModal}>
          <Plus size={17} />
          Add Product
        </button>
      </div>

      <section className="products-stats">
        <StatCard icon={Package} label="Active Products" value={stats.totalProducts} />
        <StatCard icon={Archive} label="Stock Quantity" value={stats.totalQuantity} />
        <StatCard icon={Boxes} label="Stock Value" value={money(stats.stockValue)} />
        <StatCard icon={AlertTriangle} label="Low Stock" value={stats.lowStock} tone="warning" />
        <StatCard icon={AlertTriangle} label="Expiry Alerts" value={stats.expiring} tone="danger" />
      </section>

      <section className="products-table-card">
        <div className="products-table-header">
          <div>
            <h3>Product Inventory</h3>
            <p>All registered products and their current stock status</p>
          </div>

          <div className="products-table-tools">
            <label className="products-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
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
                <th>Product</th>
                <th>Code</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Purchase</th>
                <th>Selling</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Actions</th>
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
                    No product has been registered yet.
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
      <div className="products-modal products-product-modal">
        <div className="products-modal-header">
          <div>
            <h3>{editMode ? "Edit Product" : "Add New Product"}</h3>
          </div>
          <button type="button" className="products-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="products-form-grid">
            <Field label="Product Name *" className="full">
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter product name"
              />
            </Field>

            <Field label="Code" className="full">
              <input
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Enter unique code"
              />
            </Field>

            <Field label="Barcode" className="full label-with-icon" icon={<Barcode size={14} />}>
              <div className="products-input-action">
                <input
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  placeholder="Enter or generate barcode"
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

            <Field label="Category" className="full field-with-actions">
  <SearchableTextInput
    options={categoryList}
    placeholder="Search or select category"
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

            <Field label="Purchase Price" className="half">
              <input
                name="purchase"
                value={formData.purchase}
                onChange={handleChange}
                inputMode="decimal"
                placeholder="0.00"
              />
            </Field>

            <Field label="Selling Price" className="half">
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
      <strong>Margin % Helper</strong>
      <small>
        Calculate selling price based on purchase price
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
      Apply %
    </button>
  </div>

  <div className="products-margin-description">
    <span>
      Selling = Purchase × (1 + Margin ÷ 100)
    </span>

    {purchaseAmount > 0 &&
      parseNumber(marginPercent) > 0 && (
        <strong>
          Result:{" "}
          {(
            purchaseAmount +
            purchaseAmount *
              (parseNumber(marginPercent) / 100)
          ).toFixed(2)}
        </strong>
      )}
  </div>
</div>

            <Field label="Expiry date" className="half label-with-icon" icon={<AlertTriangle size={14} />}>
              <input
                type="date"
                name="expiry"
                value={formData.expiry}
                onChange={handleChange}
              />
            </Field>

            <Field label="Alert me before" className="half">
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

            <Field label="Low Stock Threshold" className="full label-with-icon" icon={<Package size={14} />}>
              <input
                name="lowStock"
                value={formData.lowStock}
                onChange={handleChange}
                inputMode="decimal"
                placeholder="e.g. 10 pcs"
              />
              <small>Alert fires when stock reaches this count. Leave blank to disable.</small>
            </Field>

            <Field label="Quantity" className="third">
              <input
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                inputMode="decimal"
                placeholder="0"
              />
            </Field>

            <Field label="Unit" className="third field-with-actions">
  <SearchableTextInput
                options={unitOptions}
    placeholder="Search or select unit"
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

            <Field label="Currency" className="third">
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

            <Field label="Supplier" className="full">
              <div className="products-supplier-box">
                <span className="products-supplier-hint">
                  optional - auto-creates Godown entry & supplier ledger
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

            <Field label="Notes" className="full products-optional-field">
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Optional notes"
              />
            </Field>

            <div className="products-image-field full products-optional-field">
              <div>
                <label>Product Images</label>
                <p>Upload product photos for quick visual identification.</p>
              </div>
              <div className="products-image-actions">
                <button
                  type="button"
                  className="products-light-btn"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload size={15} />
                  Upload Images
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
                    <span>No image uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="products-modal-actions">
            <button type="submit" className="products-save-btn">
              {editMode ? "Save Changes" : "Add Product"}
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

export default Products;
