import { ArrowRight, Printer } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatAfghanDate, formatDateTime } from "../utils/afghanDate";
import {
  categoryLabel,
  getAllTransactions,
  getDateRange,
  isInRange,
  money,
  sourceLabel,
  summarizeTransactions,
  toDateValue,
} from "../utils/financialAnalysis";
import "./CustomerReceipt.css";

function FinancialStatement() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const period = params.get("period") || "all";
  const date = params.get("date") || toDateValue(new Date());
  const [settings] = useJsonCollection("settings");
  const [transactions] = useJsonCollection("transactions");
  const [customerTravels] = useJsonCollection("customerTravels");
  const [customerPayments] = useJsonCollection("customerPayments");
  const [travelExpenses] = useJsonCollection("travelExpenses");
  const [budgets] = useJsonCollection("financeBudgets");
  const company = settings[0] || {};
  const { start, end } = getDateRange(date, period);
  const items = getAllTransactions(transactions, customerTravels, customerPayments, travelExpenses)
    .filter((item) => isInRange(item.date, period, start, end))
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const totals = summarizeTransactions(items);
  const budgetTotal = budgets
    .filter((budget) => period === "all" || (budget.startDate && budget.endDate && budget.startDate <= end && budget.endDate >= start))
    .reduce((sum, budget) => sum + Number(budget.amount || 0), 0);
  const categoryRows = Object.values(items.filter((item) => item.type === "expense").reduce((result, item) => {
    const current = result[item.category] || { category: item.category, amount: 0, count: 0 };
    current.amount += Number(item.amount || 0); current.count += 1; result[item.category] = current; return result;
  }, {})).sort((a, b) => b.amount - a.amount);

  return <div className="receipt-page">
    <div className="receipt-toolbar"><button onClick={() => navigate("/reports/finance")}><ArrowRight size={16} /> برگشت</button><button className="receipt-print-btn" onClick={() => window.print()}><Printer size={16} /> چاپ صورت‌حساب مالی</button></div>
    <article className="receipt-sheet financial-statement-sheet">
      <header className="receipt-header">
        <div className="receipt-company"><div className="receipt-company-logo">{company.logo ? <img src={company.logo} alt="لوگو" /> : (company.companyName || "T").slice(0,1)}</div><div><h1>{company.companyName || "شرکت سیاحتی"}</h1><p>سیستم مدیریت سفر و حمل و نقل</p></div></div>
        <div className="receipt-number"><span>تاریخ صدور</span><strong>{formatDateTime(new Date().toISOString())}</strong><small>بازه: {period === "all" ? "تمام تاریخ‌ها" : `${formatAfghanDate(start)} تا ${formatAfghanDate(end)}`}</small></div>
      </header>
      <div className="receipt-title"><span>صورت‌حساب جامع مالی</span><h2>راپور عواید، مصارف و سود خالص</h2></div>
      <section className="receipt-section"><h3>خلاصه وضعیت مالی</h3><table className="receipt-finance-table"><thead><tr><th>مجموع عواید</th><th>مجموع مصارف</th><th>سود / ضرر خالص</th><th>حاشیه سود</th><th>بودجه</th></tr></thead><tbody><tr><td className="receipt-paid">{money(totals.income)}</td><td className="receipt-remaining">{money(totals.expense)}</td><td className={totals.net >= 0 ? "receipt-paid" : "receipt-remaining"}>{money(totals.net)}</td><td>{totals.margin.toFixed(1)}%</td><td>{money(budgetTotal)}</td></tr></tbody></table></section>
      <section className="receipt-section"><h3>دسته‌بندی مصارف</h3><table className="receipt-history-table"><thead><tr><th>دسته‌بندی</th><th>تعداد ریکارد</th><th>مقدار مصرف</th><th>سهم از کل مصرف</th></tr></thead><tbody>{categoryRows.map((row) => <tr key={row.category}><td>{categoryLabel(row.category)}</td><td>{row.count}</td><td>{money(row.amount)}</td><td>{totals.expense > 0 ? ((row.amount / totals.expense) * 100).toFixed(1) : 0}%</td></tr>)}{categoryRows.length === 0 && <tr><td colSpan="4">مصرفی ثبت نشده است.</td></tr>}</tbody></table></section>
      <section className="receipt-section"><h3>تمام تعاملات مالی</h3><table className="receipt-history-table financial-statement-table"><thead><tr><th>تاریخ</th><th>حالت</th><th>عنوان</th><th>دسته‌بندی</th><th>منبع</th><th>مقدار</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{formatDateTime(item.date, item.createdAt || item.updatedAt)}</td><td>{item.type === "income" ? "عاید" : "مصرف"}</td><td>{item.title || "-"}</td><td>{categoryLabel(item.category)}</td><td>{sourceLabel(item.source)}</td><td>{money(item.amount)}</td></tr>)}{items.length === 0 && <tr><td colSpan="6">ریکارد مالی وجود ندارد.</td></tr>}</tbody></table></section>
      <footer className="receipt-footer"><div><span>امضای حسابدار</span></div><p>این صورت‌حساب توسط سیستم {company.companyName || "شرکت سیاحتی"} ایجاد شده است.</p><div><span>امضای مسئول</span></div></footer>
    </article>
  </div>;
}

export default FinancialStatement;
