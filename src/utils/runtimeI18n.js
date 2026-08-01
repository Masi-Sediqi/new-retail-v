import { translations } from "../data/translations";

// Covers shared UI phrases that are still hard-coded in older pages. Most text
// comes from translations.js; this table fills common gaps until every legacy
// page is migrated to direct translation keys.
const common = {
  fa: {
    "Add": "افزودن", "Edit": "ویرایش", "Delete": "حذف", "View": "مشاهده", "Save": "ذخیره", "Save Changes": "ذخیرهٔ تغییرات",
    "Cancel": "انصراف", "Close": "بستن", "Search": "جستجو", "Print": "چاپ", "Export": "صدور", "Import": "واردکردن",
    "Actions": "عملیات", "Status": "وضعیت", "Date": "تاریخ", "Description": "توضیحات", "Amount": "مبلغ", "Total": "مجموع",
    "Name": "نام", "Code": "کُد", "Phone": "شماره تماس", "Email": "ایمیل", "Address": "نشانی", "Notes": "یادداشت‌ها",
    "Active": "فعال", "Inactive": "غیرفعال", "Paid": "پرداخت‌شده", "Pending": "در انتظار", "Previous": "قبلی", "Next": "بعدی",
    "Rows per page": "ردیف در هر صفحه", "No data available": "اطلاعاتی موجود نیست", "No records found": "موردی یافت نشد",
    "Loading...": "در حال بارگذاری...", "All": "همه", "Yes": "بلی", "No": "خیر", "Required": "ضروری", "Optional": "اختیاری",
    "Dashboard": "داشبورد", "Products": "محصولات", "Billing": "صورت‌حساب", "Sales/Bills": "فروش/بل‌ها", "Staff": "کارمندان",
    "Customers": "مشتریان", "Godown": "گدام", "Suppliers": "تأمین‌کنندگان", "Expenses": "مصارف", "Loans": "قرضه‌ها",
    "Financials": "امور مالی", "Reports": "گزارش‌ها", "Recycle Bin": "سطل بازیافت", "Settings": "تنظیمات",
    "Create invoices, scan barcodes, manage payments and update product stock.": "صورت‌حساب بسازید، بارکدها را اسکن کنید، پرداخت‌ها و موجودی محصولات را مدیریت نمایید.",
    "Scanner Active": "اسکنر فعال", "Scanner Off": "اسکنر خاموش", "Scan": "اسکن", "Clear": "پاک‌کردن", "Save & Print": "ذخیره و چاپ",
    "Current Bill": "بل فعلی", "Add products by name, code or barcode.": "محصولات را با نام، کُد یا بارکد اضافه کنید.",
    "Invoice currency": "ارز بل", "Search or scan product...": "محصول را جستجو یا اسکن کنید...", "Item": "جنس", "Qty": "تعداد", "Price": "قیمت", "Discount": "تخفیف",
    "No product added to this bill yet.": "هنوز محصولی به این بل افزوده نشده است.", "Invoice Details": "جزئیات بل", "Customer": "مشتری",
    "Walk-in customer": "مشتری آزاد", "Walk-in Name": "نام مشتری آزاد", "Optional customer name": "نام مشتری اختیاری",
    "Mode": "نوع", "Flat": "مبلغ ثابت", "Percent": "فیصدی", "Payment Method": "روش پرداخت", "Payment Status": "وضعیت پرداخت",
    "Paid in full": "پرداخت کامل", "Loan / Partially paid": "قرض / پرداخت قسمی", "Paid Amount": "مبلغ پرداخت‌شده",
    "Subtotal": "جمع فرعی", "Item Discounts": "تخفیف اجناس", "Invoice Discount": "تخفیف بل", "Remaining": "باقی‌مانده", "Preview": "پیش‌نمایش", "Save Bill": "ذخیرهٔ بل",
    "Sales / Bills": "فروش / بل‌ها", "Review invoices, print bills, collect remaining payments and record refunds.": "بل‌ها را مرور و چاپ کنید، باقی‌مانده‌ها را دریافت و برگشتی‌ها را ثبت نمایید.",
    "Invoices": "بل‌ها", "Revenue": "درآمد", "Refunds": "برگشتی‌ها", "Search invoice, customer, item...": "جستجوی بل، مشتری یا جنس...",
    "All bills": "تمام بل‌ها", "Loan": "قرض", "Refunded": "برگشت‌شده", "Invoice": "بل", "Items": "اجناس", "Balance": "باقی‌مانده",
    "No sales bill has been recorded yet.": "هنوز هیچ بل فروشی ثبت نشده است.", "View Details": "مشاهدهٔ جزئیات", "Print Invoice": "چاپ بل", "Payment History": "تاریخچهٔ پرداخت", "Add Payment": "افزودن پرداخت", "Mark as Paid": "ثبت به‌عنوان پرداخت‌شده", "Refund": "برگشت وجه",
    "Manage staff profiles, monthly salary, payroll payments and payable balances.": "مشخصات کارمندان، معاش ماهانه، پرداخت‌ها و باقی‌مانده‌های قابل پرداخت را مدیریت کنید.",
    "Add Staff": "افزودن کارمند", "Total Staff": "مجموع کارمندان", "Active Staff": "کارمندان فعال", "Monthly Salary": "معاش ماهانه", "Paid Payroll": "معاش پرداخت‌شده", "Payable": "قابل پرداخت",
    "Search staff...": "جستجوی کارمند...", "All staff": "تمام کارمندان", "Paid payroll": "معاش پرداخت‌شده", "Has payable": "دارای باقی‌مانده", "Role": "وظیفه", "Department": "بخش", "Type": "نوع", "Salary": "معاش",
    "No contact": "بدون اطلاعات تماس", "No staff member has been registered yet.": "هنوز هیچ کارمندی ثبت نشده است.", "View Profile": "مشاهدهٔ مشخصات", "Pay Salary": "پرداخت معاش",
    "Manage stock purchases, supplier balances, product quantity and warehouse value.": "خریدهای گدام، حساب تأمین‌کنندگان، تعداد محصولات و ارزش موجودی را مدیریت کنید.",
    "Add Purchase": "افزودن خرید", "Stock Entries": "ورودی‌های گدام", "Total Quantity": "تعداد کل", "Expected Profit": "سود پیش‌بینی‌شده", "Payable To Suppliers": "قابل پرداخت به تأمین‌کنندگان",
    "Search product or supplier...": "جستجوی محصول یا تأمین‌کننده...", "All products": "تمام محصولات", "All suppliers": "تمام تأمین‌کنندگان", "All stock": "تمام موجودی", "All time": "تمام زمان‌ها",
    "Entries": "ورودی‌ها", "Hide sold out": "پنهان‌کردن تمام‌شده‌ها", "Imported": "واردشده", "In Stock": "در گدام", "Sold": "فروخته‌شده", "History": "تاریخچه", "No products found.": "محصولی یافت نشد.", "No stock entries found.": "ورودی گدامی یافت نشد.",
    "Multi Product Purchase Bill": "بل خرید چند محصول", "Add one bill with one or more product rows.": "یک بل با یک یا چند ردیف محصول اضافه کنید.", "Bill Number": "شماره بل", "Product name": "نام محصول", "Add Row": "افزودن ردیف", "New category": "دسته‌بندی جدید", "Grand Total": "مجموع کل", "Paid Now": "پرداخت فعلی", "Save Purchase": "ذخیرهٔ خرید",
    "Track customer loan invoices, balances, overdue records and payments.": "بل‌های قرض مشتریان، باقی‌مانده‌ها، موارد سررسیدگذشته و پرداخت‌ها را پیگیری کنید.", "Active Loans": "قرض‌های فعال", "Paid Loans": "قرض‌های پرداخت‌شده", "Pending Loans": "قرض‌های در انتظار", "Overdue Loans": "قرض‌های سررسیدگذشته", "Search invoice or customer...": "جستجوی بل یا مشتری...", "No loans found.": "قرضی یافت نشد.", "Make Payment": "انجام پرداخت", "Loan Details": "جزئیات قرض", "Record Payment": "ثبت پرداخت", "Payment Amount": "مبلغ پرداخت",
    "Track revenue, expenses, profit, pending payments, and stock value.": "درآمد، مصارف، سود، پرداخت‌های معلق و ارزش موجودی را پیگیری کنید.", "Gross Profit": "سود ناخالص", "Net Profit": "سود خالص", "Total Discounts": "مجموع تخفیف‌ها", "Pending Payments": "پرداخت‌های معلق", "Staff Paid": "پرداخت کارمندان", "Financial Summary": "خلاصهٔ مالی", "Financial Ledger": "دفتر مالی", "Search financial records...": "جستجوی سوابق مالی...", "No financial record found.": "سابقهٔ مالی یافت نشد.",
    "Accounts": "حساب‌ها", "Purchase Value": "ارزش خرید", "Payables": "پرداختنی‌ها", "Receivables": "دریافتنی‌ها", "Net Balance": "بیلانس خالص", "Search suppliers...": "جستجوی تأمین‌کنندگان...", "No supplier account has been registered yet.": "هنوز حساب تأمین‌کننده‌ای ثبت نشده است.", "No activity recorded yet.": "هنوز فعالیتی ثبت نشده است.", "Create Supplier Account": "ایجاد حساب تأمین‌کننده", "Edit Supplier Account": "ویرایش حساب تأمین‌کننده", "Business Type": "نوع تجارت", "Opening Balance": "بیلانس آغازین", "Supply Items": "اقلام تأمین‌شده",
    "Filtered Total": "مجموع فیلترشده", "This Month": "این ماه", "Expense Count": "تعداد مصارف", "Highest Expense": "بیشترین مصرف", "Search expenses...": "جستجوی مصارف...", "No expenses found.": "مصرفی یافت نشد.", "Add Expense": "افزودن مصرف", "Edit Expense": "ویرایش مصرف", "Expense description": "توضیح مصرف", "Additional notes": "یادداشت‌های اضافی",
    "Total Sales": "مجموع فروش", "Pure Profit": "سود خالص واقعی", "Staff Payable": "قابل پرداخت به کارمندان", "Upcoming Payroll": "پرداخت معاش آینده", "No upcoming": "مورد آینده‌ای نیست", "Revenue vs Expenses": "درآمد در برابر مصارف", "Weekly Trends": "روند هفتگی", "Category Breakdown": "تفکیک دسته‌بندی", "Paid vs Pending": "پرداخت‌شده در برابر معلق", "Top Customers": "مشتریان برتر", "Report Summary": "خلاصهٔ گزارش", "Search report rows...": "جستجوی ردیف‌های گزارش...",
    "Empty Bin": "خالی‌کردن سطل", "Search deleted records...": "جستجوی موارد حذف‌شده...", "Recycle bin is empty.": "سطل بازیافت خالی است.", "Restore": "بازیابی", "Delete Permanently": "حذف دائمی",
  },
  ps: {
    "Add": "زیاتول", "Edit": "سمول", "Delete": "ړنګول", "View": "کتل", "Save": "خوندي کول", "Save Changes": "بدلونونه خوندي کړئ",
    "Cancel": "لغوه", "Close": "تړل", "Search": "لټون", "Print": "چاپ", "Export": "صادرول", "Import": "واردول",
    "Actions": "کړنې", "Status": "حالت", "Date": "نېټه", "Description": "تشریح", "Amount": "مبلغ", "Total": "ټول",
    "Name": "نوم", "Code": "کوډ", "Phone": "تلیفون", "Email": "برېښنالیک", "Address": "پته", "Notes": "یادښتونه",
    "Active": "فعال", "Inactive": "غیرفعال", "Paid": "ورکړل شوی", "Pending": "پاتې", "Previous": "مخکینی", "Next": "بل",
    "Rows per page": "په هره پاڼه کې کتارونه", "No data available": "معلومات نشته", "No records found": "ریکارډ ونه موندل شو",
    "Loading...": "بارېږي...", "All": "ټول", "Yes": "هو", "No": "نه", "Required": "اړین", "Optional": "اختیاري",
    "Dashboard": "ډشبورډ", "Products": "محصولات", "Billing": "بل جوړول", "Sales/Bills": "پلور/بلونه", "Staff": "کارکوونکي",
    "Customers": "پېرودونکي", "Godown": "ګدام", "Suppliers": "عرضه کوونکي", "Expenses": "لګښتونه", "Loans": "پورونه",
    "Financials": "مالي چارې", "Reports": "راپورونه", "Recycle Bin": "د بېرته راګرځولو صندوق", "Settings": "تنظیمات",
    "Create invoices, scan barcodes, manage payments and update product stock.": "بلونه جوړ کړئ، بارکوډونه سکن کړئ، تادیات او د محصولاتو موجودي اداره کړئ.",
    "Scanner Active": "سکنر فعال", "Scanner Off": "سکنر بند", "Scan": "سکن", "Clear": "پاکول", "Save & Print": "خوندي او چاپ",
    "Current Bill": "اوسنی بل", "Add products by name, code or barcode.": "محصولات د نوم، کوډ یا بارکوډ له مخې زیات کړئ.",
    "Invoice currency": "د بل اسعار", "Search or scan product...": "محصول ولټوئ یا سکن کړئ...", "Item": "توکی", "Qty": "شمېر", "Price": "بیه", "Discount": "تخفیف",
    "No product added to this bill yet.": "تر اوسه دې بل ته محصول نه دی زیات شوی.", "Invoice Details": "د بل جزئیات", "Customer": "پېرودونکی",
    "Walk-in customer": "عمومي پېرودونکی", "Walk-in Name": "د عمومي پېرودونکي نوم", "Optional customer name": "اختیاري د پېرودونکي نوم",
    "Mode": "ډول", "Flat": "ثابت مبلغ", "Percent": "سلنه", "Payment Method": "د تادیې طریقه", "Payment Status": "د تادیې حالت",
    "Paid in full": "بشپړ ورکړل شوی", "Loan / Partially paid": "پور / نیمه ورکړه", "Paid Amount": "ورکړل شوی مبلغ",
    "Subtotal": "فرعي مجموعه", "Item Discounts": "د توکو تخفیف", "Invoice Discount": "د بل تخفیف", "Remaining": "پاتې", "Preview": "مخکتنه", "Save Bill": "بل خوندي کړئ",
    "Sales / Bills": "پلور / بلونه", "Review invoices, print bills, collect remaining payments and record refunds.": "بلونه وګورئ او چاپ یې کړئ، پاتې تادیات ترلاسه او بېرته ورکړې ثبت کړئ.",
    "Invoices": "بلونه", "Revenue": "عواید", "Refunds": "بېرته ورکړې", "Search invoice, customer, item...": "بل، پېرودونکی یا توکی ولټوئ...",
    "All bills": "ټول بلونه", "Loan": "پور", "Refunded": "بېرته ورکړل شوی", "Invoice": "بل", "Items": "توکي", "Balance": "پاتې حساب",
    "No sales bill has been recorded yet.": "تر اوسه د پلور بل نه دی ثبت شوی.", "View Details": "جزئیات وګورئ", "Print Invoice": "بل چاپ کړئ", "Payment History": "د تادیې تاریخچه", "Add Payment": "تادیه زیاته کړئ", "Mark as Paid": "د ورکړل شوي په توګه ثبت", "Refund": "بېرته ورکول",
    "Manage staff profiles, monthly salary, payroll payments and payable balances.": "د کارکوونکو معلومات، میاشتنی معاش، تادیات او پاتې حسابونه اداره کړئ.",
    "Add Staff": "کارکوونکی زیات کړئ", "Total Staff": "ټول کارکوونکي", "Active Staff": "فعال کارکوونکي", "Monthly Salary": "میاشتنی معاش", "Paid Payroll": "ورکړل شوی معاش", "Payable": "د ورکړې وړ",
    "Search staff...": "کارکوونکي ولټوئ...", "All staff": "ټول کارکوونکي", "Paid payroll": "ورکړل شوی معاش", "Has payable": "پاتې حساب لري", "Role": "دنده", "Department": "څانګه", "Type": "ډول", "Salary": "معاش",
    "No contact": "د اړیکې معلومات نشته", "No staff member has been registered yet.": "تر اوسه کارکوونکی نه دی ثبت شوی.", "View Profile": "معلومات وګورئ", "Pay Salary": "معاش ورکړئ",
    "Manage stock purchases, supplier balances, product quantity and warehouse value.": "د ګدام پېرودونه، د عرضه کوونکو حسابونه، د محصولاتو شمېر او د موجودۍ ارزښت اداره کړئ.",
    "Add Purchase": "پېرود زیات کړئ", "Stock Entries": "د ګدام داخلې", "Total Quantity": "ټول شمېر", "Expected Profit": "اټکلی ګټه", "Payable To Suppliers": "عرضه کوونکو ته د ورکړې وړ",
    "Search product or supplier...": "محصول یا عرضه کوونکی ولټوئ...", "All products": "ټول محصولات", "All suppliers": "ټول عرضه کوونکي", "All stock": "ټوله موجودي", "All time": "ټول وخت",
    "Entries": "داخلې", "Hide sold out": "ختم شوي پټ کړئ", "Imported": "وارد شوي", "In Stock": "په ګدام کې", "Sold": "پلورل شوي", "History": "تاریخچه", "No products found.": "محصول ونه موندل شو.", "No stock entries found.": "د ګدام داخله ونه موندل شوه.",
    "Multi Product Purchase Bill": "د څو محصولاتو پېرود بل", "Add one bill with one or more product rows.": "یو بل د یوه یا ډېرو محصولاتو له کتارونو سره زیات کړئ.", "Bill Number": "د بل شمېره", "Product name": "د محصول نوم", "Add Row": "کتار زیات کړئ", "New category": "نوې کټګوري", "Grand Total": "ټولیزه مجموعه", "Paid Now": "اوس ورکړل شوی", "Save Purchase": "پېرود خوندي کړئ",
    "Track customer loan invoices, balances, overdue records and payments.": "د پېرودونکو پور بلونه، پاتې حسابونه، ځنډېدلي ریکارډونه او تادیات وڅارئ.", "Active Loans": "فعال پورونه", "Paid Loans": "ورکړل شوي پورونه", "Pending Loans": "پاتې پورونه", "Overdue Loans": "ځنډېدلي پورونه", "Search invoice or customer...": "بل یا پېرودونکی ولټوئ...", "No loans found.": "پور ونه موندل شو.", "Make Payment": "تادیه وکړئ", "Loan Details": "د پور جزئیات", "Record Payment": "تادیه ثبت کړئ", "Payment Amount": "د تادیې مبلغ",
    "Track revenue, expenses, profit, pending payments, and stock value.": "عواید، لګښتونه، ګټه، پاتې تادیات او د موجودۍ ارزښت وڅارئ.", "Gross Profit": "ناخالصه ګټه", "Net Profit": "خالصه ګټه", "Total Discounts": "ټول تخفیفونه", "Pending Payments": "پاتې تادیات", "Staff Paid": "کارکوونکو ته ورکړه", "Financial Summary": "مالي لنډیز", "Financial Ledger": "مالي دفتر", "Search financial records...": "مالي ریکارډونه ولټوئ...", "No financial record found.": "مالي ریکارډ ونه موندل شو.",
    "Accounts": "حسابونه", "Purchase Value": "د پېرود ارزښت", "Payables": "ورکړې", "Receivables": "ترلاسه کېدونکي", "Net Balance": "خالص بیلانس", "Search suppliers...": "عرضه کوونکي ولټوئ...", "No supplier account has been registered yet.": "تر اوسه د عرضه کوونکي حساب نه دی ثبت شوی.", "No activity recorded yet.": "تر اوسه فعالیت نه دی ثبت شوی.", "Create Supplier Account": "د عرضه کوونکي حساب جوړول", "Edit Supplier Account": "د عرضه کوونکي حساب سمول", "Business Type": "د سوداګرۍ ډول", "Opening Balance": "پیل بیلانس", "Supply Items": "عرضه شوي توکي",
    "Filtered Total": "فلټر شوی ټول", "This Month": "دا میاشت", "Expense Count": "د لګښتونو شمېر", "Highest Expense": "تر ټولو لوړ لګښت", "Search expenses...": "لګښتونه ولټوئ...", "No expenses found.": "لګښت ونه موندل شو.", "Add Expense": "لګښت زیات کړئ", "Edit Expense": "لګښت سم کړئ", "Expense description": "د لګښت تشریح", "Additional notes": "اضافي یادښتونه",
    "Total Sales": "ټول پلور", "Pure Profit": "سوچه ګټه", "Staff Payable": "کارکوونکو ته د ورکړې وړ", "Upcoming Payroll": "راتلونکی معاش", "No upcoming": "راتلونکی مورد نشته", "Revenue vs Expenses": "عواید د لګښتونو پر وړاندې", "Weekly Trends": "اونیز بهیر", "Category Breakdown": "د کټګوریو وېش", "Paid vs Pending": "ورکړل شوي او پاتې", "Top Customers": "غوره پېرودونکي", "Report Summary": "د راپور لنډیز", "Search report rows...": "د راپور کتارونه ولټوئ...",
    "Empty Bin": "صندوق تش کړئ", "Search deleted records...": "ړنګ شوي ریکارډونه ولټوئ...", "Recycle bin is empty.": "د بېرته راګرځولو صندوق تش دی.", "Restore": "بېرته راګرځول", "Delete Permanently": "تلپاتې ړنګول",
  },
};

const textState = new WeakMap();
const attributeState = new WeakMap();
let activeCleanup;

function makeDictionary(language) {
  const target = translations[language] || translations.en;
  const result = {};
  for (const [key, english] of Object.entries(translations.en)) {
    if (typeof english === "string" && typeof target[key] === "string") result[english.trim()] = target[key];
  }
  return { ...result, ...(common[language] || {}) };
}

function dynamicTranslation(text, language) {
  let match = text.match(/^Showing (\d+) to (\d+) of (\d+) records$/i);
  if (match) return language === "fa" ? `نمایش ${match[1]} تا ${match[2]} از ${match[3]} مورد` : `له ${match[3]} ریکارډونو څخه ${match[1]} تر ${match[2]} ښودل کېږي`;
  match = text.match(/^Page (\d+) of (\d+)$/i);
  if (match) return language === "fa" ? `صفحه ${match[1]} از ${match[2]}` : `پاڼه ${match[1]} له ${match[2]}`;
  return null;
}

function translate(raw, language, dictionary) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return raw;
  const value = dictionary[trimmed] || dynamicTranslation(trimmed, language);
  return value ? String(raw).replace(trimmed, value) : raw;
}

function excluded(element) {
  return !element || element.closest("script,style,[data-no-translate]") || element.matches("textarea,input[type=password],input[type=file]");
}

function translateTextNode(node, language, dictionary) {
  if (excluded(node.parentElement)) return;
  const current = node.nodeValue;
  let state = textState.get(node);
  if (!state || (current !== state.source && current !== state.output)) state = { source: current, output: current };
  const output = language === "en" ? state.source : translate(state.source, language, dictionary);
  state.output = output;
  textState.set(node, state);
  if (current !== output) node.nodeValue = output;
}

function translateElement(element, language, dictionary) {
  if (!(element instanceof Element) || excluded(element)) return;
  let states = attributeState.get(element);
  if (!states) { states = {}; attributeState.set(element, states); }
  for (const name of ["placeholder", "title", "aria-label"]) {
    if (!element.hasAttribute(name)) continue;
    const current = element.getAttribute(name);
    const old = states[name];
    if (!old || (current !== old.source && current !== old.output)) states[name] = { source: current, output: current };
    const state = states[name];
    const output = language === "en" ? state.source : translate(state.source, language, dictionary);
    state.output = output;
    if (current !== output) element.setAttribute(name, output);
  }
}

function scan(language, dictionary) {
  if (!document.body) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.currentNode;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, language, dictionary);
    else translateElement(node, language, dictionary);
    node = walker.nextNode();
  }
}

export function installRuntimeI18n(language) {
  activeCleanup?.();
  const dictionary = makeDictionary(language);
  let queued = false;
  const run = () => { queued = false; scan(language, dictionary); };
  const queue = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(run);
  };
  const observer = new MutationObserver(queue);
  observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
  const interval = window.setInterval(scan, 350, language, dictionary);
  run();
  const cleanup = () => { observer.disconnect(); window.clearInterval(interval); };
  activeCleanup = cleanup;
  return cleanup;
}
