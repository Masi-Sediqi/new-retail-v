import { translations } from "../data/translations";

const extraFa = {
  "Settings": "تنظیمات", "Manage your system preferences": "تنظیمات سیستم خود را مدیریت کنید", "Save Changes": "ذخیره تغییرات",
  "General": "عمومی", "Themes": "قالب‌ها", "Currency": "واحد پول", "Printing": "چاپ", "Notifications": "اعلان‌ها", "Sharing": "اشتراک‌گذاری", "Backup": "پشتیبان‌گیری", "Advanced sync": "همگام‌سازی پیشرفته", "Security": "امنیت", "Users": "کاربران", "Forms": "فورم‌ها",
  "Add": "افزودن", "Add User": "افزودن کاربر", "Add Field": "افزودن فیلد", "Create User": "ایجاد کاربر", "Delete": "حذف", "Edit": "ویرایش", "View": "مشاهده", "Print": "چاپ", "Export": "صدور", "Import": "وارد کردن", "Cancel": "انصراف", "Close": "بستن", "Reset": "بازنشانی", "Preview": "پیش‌نمایش", "Search": "جستجو", "Actions": "عملیات", "Status": "وضعیت", "Date": "تاریخ", "Description": "توضیحات", "Amount": "مبلغ", "Total": "مجموع", "Paid": "پرداخت‌شده", "Remaining": "باقی‌مانده",
  "Notification Sounds": "صداهای اعلان", "Choose a notification sound for alerts.": "برای هشدارها یک صدای اعلان انتخاب کنید.", "Enable notifications": "فعال‌سازی اعلان‌ها", "Low stock alerts": "هشدار موجودی کم", "Due payment alerts": "هشدار پرداخت‌های سررسید", "Daily summary": "خلاصه روزانه",
  "Sharing Settings": "تنظیمات اشتراک‌گذاری", "WhatsApp Number": "شماره واتساپ", "Email Address": "آدرس ایمیل", "Business profile sharing": "اشتراک‌گذاری پروفایل تجاری", "Public report links": "لینک‌های عمومی گزارش",
  "Backup & Restore": "پشتیبان‌گیری و بازیابی", "Export Data": "صدور اطلاعات", "Import Data": "وارد کردن اطلاعات", "Clear Data": "پاک‌کردن اطلاعات", "Automatically Backup": "پشتیبان‌گیری خودکار", "Backup Schedule": "برنامه پشتیبان‌گیری", "Daily": "روزانه", "Weekly": "هفتگی", "Monthly": "ماهانه", "Custom": "دلخواه", "Off": "خاموش",
  "One-time migration": "انتقال یک‌باره", "Export backup": "صدور پشتیبان", "Import & restore": "وارد کردن و بازیابی", "Sync bridge": "پل همگام‌سازی", "Enable sync": "فعال‌سازی همگام‌سازی", "Sync endpoint": "نشانی همگام‌سازی", "Interval minutes": "فاصله زمانی به دقیقه",
  "Security Settings": "تنظیمات امنیتی", "Password Protection": "محافظت با رمز عبور", "No password set": "رمز عبور تعیین نشده", "Password is configured": "رمز عبور تنظیم شده است", "Lock on startup": "قفل هنگام شروع", "Session timeout (minutes)": "مهلت نشست (دقیقه)", "New security password": "رمز امنیتی جدید", "Confirm security password": "تأیید رمز امنیتی",
  "User Management": "مدیریت کاربران", "Create New User": "ایجاد کاربر جدید", "Username *": "نام کاربری *", "Display Name *": "نام نمایشی *", "Password *": "رمز عبور *", "Confirm Password": "تأیید رمز عبور", "Module Permissions": "مجوزهای بخش‌ها", "Module Access": "دسترسی بخش", "No users created yet. Admin has full access by default.": "هنوز کاربری ایجاد نشده است. مدیر به‌صورت پیش‌فرض دسترسی کامل دارد.",
  "Custom Form Fields": "فیلدهای سفارشی فورم", "Field Label *": "عنوان فیلد *", "Placeholder": "متن راهنما", "Field Type": "نوع فیلد", "Required": "اجباری", "No custom fields for this module yet.": "هنوز برای این بخش فیلد سفارشی وجود ندارد.",
  "Theme Selection": "انتخاب قالب", "Appearance": "ظاهر", "System": "سیستم", "Light": "روشن", "Dark": "تاریک", "Accent color": "رنگ برجسته", "Interface density": "تراکم رابط", "Corner style": "سبک گوشه‌ها", "Compact sidebar": "نوار کناری فشرده",
  "Exchange Rates": "نرخ‌های تبدیل", "Base currency": "ارز پایه", "Calculation rule": "قاعده محاسبه", "Save Rates": "ذخیره نرخ‌ها",
  "Print Studio": "استودیوی چاپ", "Business identity": "هویت تجاری", "Brand colors": "رنگ‌های برند", "Typography": "تایپوگرافی", "Layout": "چیدمان", "Logo": "لوگو", "Watermark": "واترمارک", "Watermark opacity": "شفافیت واترمارک", "Paper size": "اندازه کاغذ", "Footer text": "متن پایین صفحه", "Show timestamp": "نمایش زمان چاپ", "Show logo": "نمایش لوگو", "Show signature": "نمایش امضا",
  "Dashboard": "داشبورد", "Products": "محصولات", "Billing": "صورت‌حساب", "Sales/Bills": "فروش/فاکتورها", "Staff": "کارمندان", "Customers": "مشتریان", "Godown": "گدام", "Suppliers": "تأمین‌کنندگان", "Expenses": "مصارف", "Loans": "قرضه‌ها", "Financials": "مالی", "Reports": "گزارش‌ها", "Recycle Bin": "سطل بازیافت", "Agent": "دستیار",
  "Name": "نام", "Role": "نقش", "Email": "ایمیل", "Phone": "تلفن", "Address": "آدرس", "Website": "وب‌سایت", "Title": "عنوان", "Subtitle": "زیرعنوان", "Body": "متن اصلی", "Footer": "پایین صفحه", "Active": "فعال", "Inactive": "غیرفعال", "Yes": "بله", "No": "خیر", "On": "روشن", "All": "همه", "No data available": "اطلاعاتی موجود نیست", "Loading...": "در حال بارگذاری..."
  ,"Product Inventory": "موجودی محصولات", "Manage product stock, pricing, suppliers, barcodes and expiry alerts.": "موجودی، قیمت‌ها، تأمین‌کنندگان، بارکودها و هشدارهای انقضای محصولات را مدیریت کنید.", "All registered products and their current stock status": "تمام محصولات ثبت‌شده و وضعیت فعلی موجودی آن‌ها", "Stock Value": "ارزش موجودی", "Low Stock": "موجودی کم", "Expiry Alerts": "هشدارهای انقضا", "Add Product": "افزودن محصول", "No product has been registered yet.": "هنوز محصولی ثبت نشده است.", "Rows per page": "ردیف در هر صفحه", "Previous": "قبلی", "Next": "بعدی", "Page 1 of 1": "صفحه ۱ از ۱", "Product": "محصول", "Code": "کُد", "Barcode": "بارکود", "Category": "دسته‌بندی", "Stock": "موجودی", "Purchase": "خرید", "Selling": "فروش", "Expiry": "انقضا", "Add New Product": "افزودن محصول جدید", "Product Name *": "نام محصول *", "Enter product name": "نام محصول را وارد کنید", "Search or select category": "دسته‌بندی را جستجو یا انتخاب کنید", "Purchase Price": "قیمت خرید", "Selling Price": "قیمت فروش", "Margin % Helper": "محاسبه‌گر فیصدی سود", "Calculate selling price based on purchase price": "محاسبه قیمت فروش بر اساس قیمت خرید", "Apply %": "اعمال فیصدی", "Expiry date": "تاریخ انقضا", "Alert me before": "پیش از انقضا هشدار بده", "Low Stock Threshold": "حد هشدار موجودی کم", "Quantity": "تعداد", "Unit": "واحد", "Supplier": "تأمین‌کننده", "Search products...": "جستجوی محصولات...", "All products": "تمام محصولات"
};

const extraPs = { "Settings": "تنظیمات", "Save Changes": "بدلونونه خوندي کړئ", "Dashboard": "ډشبورډ", "Products": "محصولات", "Customers": "پېرودونکي", "Reports": "راپورونه", "Users": "کاروونکي", "Forms": "فورمونه", "Product Inventory": "د محصولاتو موجودي", "Manage product stock, pricing, suppliers, barcodes and expiry alerts.": "د محصولاتو موجودي، بیې، عرضه کوونکي، بارکوډونه او د ختمېدو خبرتیاوې اداره کړئ.", "All registered products and their current stock status": "ټول ثبت شوي محصولات او د هغوی اوسنۍ موجودي", "Stock Value": "د موجودۍ ارزښت", "Low Stock": "کمه موجودي", "Expiry Alerts": "د ختمېدو خبرتیاوې", "Add Product": "محصول زیات کړئ", "No product has been registered yet.": "تر اوسه کوم محصول نه دی ثبت شوی.", "Rows per page": "په هره پاڼه کې کتارونه", "Previous": "مخکینی", "Next": "بل", "Product": "محصول", "Code": "کوډ", "Barcode": "بارکوډ", "Category": "کټګوري", "Stock": "موجودي", "Purchase": "پېرود", "Selling": "پلور", "Expiry": "د ختمېدو نېټه", "Add New Product": "نوی محصول زیات کړئ", "Product Name *": "د محصول نوم *", "Enter product name": "د محصول نوم ولیکئ", "Purchase Price": "د پېرود بیه", "Selling Price": "د پلور بیه", "Quantity": "شمېر", "Unit": "واحد", "Supplier": "عرضه کوونکی", "Search products...": "محصولات ولټوئ...", "All products": "ټول محصولات" };
const originals = new WeakMap();
let observer;

const exactDictionary = (language) => {
  const target = translations[language] || translations.en;
  const mapped = {};
  Object.entries(translations.en).forEach(([key, english]) => { if (typeof english === "string" && target[key]) mapped[english] = target[key]; });
  return { ...mapped, ...(language === "fa" ? extraFa : language === "ps" ? extraPs : {}) };
};

const translateValue = (value, dictionary) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return value;
  let translated = dictionary[trimmed];
  const isDari = dictionary.Products === "محصولات" && dictionary.Settings === "تنظیمات";
  const isPashto = dictionary.Products === "محصولات" && dictionary.Dashboard === "ډشبورډ";
  let match;
  if (!translated && (match = trimmed.match(/^Showing (\d+) to (\d+) of (\d+) records$/))) translated = isPashto ? `له ${match[1]} څخه تر ${match[2]}، د ${match[3]} ریکارډونو څخه` : isDari ? `نمایش ${match[1]} تا ${match[2]} از ${match[3]} رکورد` : null;
  if (!translated && (match = trimmed.match(/^Page (\d+) of (\d+)$/))) translated = isPashto ? `پاڼه ${match[1]} له ${match[2]}` : isDari ? `صفحه ${match[1]} از ${match[2]}` : null;
  if (!translated) return value;
  return String(value).replace(trimmed, translated);
};

const applyToElement = (element, language, dictionary) => {
  if (!(element instanceof Element) || element.closest("script,style,[data-no-translate]") || element.matches("input[type=file],input[type=password]")) return;
  ["placeholder", "title", "aria-label"].forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const key = `${attribute}Original`;
    if (!element.dataset[key]) element.dataset[key] = element.getAttribute(attribute);
    const original = element.dataset[key];
    element.setAttribute(attribute, language === "en" ? original : translateValue(original, dictionary));
  });
};

const walk = (root, language, dictionary) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = root;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && !parent.closest("script,style,[data-no-translate]") && !parent.matches("textarea")) {
        const current = node.nodeValue;
        let record = originals.get(node);
        if (!record || (current !== record.original && current !== record.translated)) {
          record = { original: current, translated: current };
          originals.set(node, record);
        }
        const next = language === "en" ? record.original : translateValue(record.original, dictionary);
        record.translated = next;
        if (current !== next) node.nodeValue = next;
      }
    } else applyToElement(node, language, dictionary);
    node = walker.nextNode();
  }
};

export const installRuntimeI18n = (language) => {
  observer?.disconnect();
  const dictionary = exactDictionary(language);
  walk(document.body, language, dictionary);
  observer = new MutationObserver((mutations) => mutations.forEach((mutation) => {
    if (mutation.type === "characterData") {
      walk(mutation.target, language, dictionary);
      return;
    }
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) walk(node, language, dictionary);
    });
  }));
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  return () => observer?.disconnect();
};
