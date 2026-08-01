import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AfghanDateInput from "../components/AfghanDateInput";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { formatAfghanDate, formatDateTime } from "../utils/afghanDate";
import {
  categoryLabel,
  getAllTransactions,
  getDateRange,
  getPreviousRange,
  isInRange,
  money,
  number,
  sourceLabel,
  summarizeTransactions,
  toDateValue,
} from "../utils/financialAnalysis";
import "./Reports.css";
import "./FinancialReport.css";

const periodLabels = { all: "تمام تاریخ‌ها", daily: "روزانه", weekly: "هفته‌وار", monthly: "ماهانه", yearly: "سالانه" };
const expenseColors = { fuel: "#f59e0b", repair: "#dc2626", salary: "#8b5cf6", purchase: "#2563eb", other: "#64748b" };
const tooltipProps = {
  contentStyle: { borderRadius: 12, border: "1px solid #e2e8f0", fontFamily: "Vazirmatn", direction: "rtl" },
  formatter: (value) => money(value),
};

function FinancialReport() {
  const [transactions] = useJsonCollection("transactions");
  const [customerTravels] = useJsonCollection("customerTravels");
  const [customerPayments] = useJsonCollection("customerPayments");
  const [travelExpenses] = useJsonCollection("travelExpenses");
  const [travels] = useJsonCollection("travels");
  const [cars] = useJsonCollection("cars");
  const [customers] = useJsonCollection("customers");
  const [budgets, setBudgets] = useJsonCollection("financeBudgets");
  const [period, setPeriod] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ title: "", amount: "", startDate: toDateValue(new Date()), endDate: toDateValue(new Date()), note: "" });

  const allTransactions = useMemo(
    () => getAllTransactions(transactions, customerTravels, customerPayments, travelExpenses),
    [customerPayments, customerTravels, transactions, travelExpenses]
  );
  const latestDate = useMemo(
    () => allTransactions.map((item) => item.date).filter(Boolean).sort().at(-1) || toDateValue(new Date()),
    [allTransactions]
  );
  const activeDate = selectedDate || latestDate;
  const { start, end } = getDateRange(activeDate, period);
  const previousRange = getPreviousRange(start, end, period);
  const periodTransactions = allTransactions.filter((item) => isInRange(item.date, period, start, end));
  const filteredTransactions = periodTransactions
    .filter((item) => typeFilter === "all" || item.type === typeFilter)
    .filter((item) => categoryFilter === "all" || item.category === categoryFilter)
    .filter((item) => (item.title || "").includes(search) || (item.description || "").includes(search) || (item.date || "").includes(search) || sourceLabel(item.source).includes(search))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.id).localeCompare(String(a.id)));
  const totals = summarizeTransactions(periodTransactions);
  const previousTotals = summarizeTransactions(
    previousRange ? allTransactions.filter((item) => item.date && item.date >= previousRange.start && item.date <= previousRange.end) : []
  );
  const growth = previousRange && previousTotals.income > 0 ? ((totals.income - previousTotals.income) / previousTotals.income) * 100 : null;
  const discountTotal = customerTravels.filter((record) => isInRange(record.date, period, start, end)).reduce((sum, record) => sum + number(record.discount), 0);
  const customerDebt = customers.reduce((sum, _, customerIndex) => {
    const records = customerTravels.filter((record) => Number(record.customerIndex) === customerIndex && isInRange(record.date, period, start, end));
    const payments = customerPayments.filter((payment) => Number(payment.customerIndex) === customerIndex && isInRange(payment.date, period, start, end));
    const billed = records.reduce((value, record) => value + Math.max(number(record.fare) - number(record.discount), 0), 0);
    const paid = records.reduce((value, record) => value + number(record.paidAmount), 0) + payments.reduce((value, payment) => value + number(payment.amount), 0);
    return sum + Math.max(billed - paid, 0);
  }, 0);

  const activeBudgets = budgets.filter((budget) =>
    period === "all" || (budget.startDate && budget.endDate && budget.startDate <= end && budget.endDate >= start)
  );
  const budgetTotal = activeBudgets.reduce((sum, budget) => sum + number(budget.amount), 0);
  const budgetUsage = budgetTotal > 0 ? (totals.expense / budgetTotal) * 100 : 0;
  const budgetRemaining = budgetTotal - totals.expense;

  const cashFlowData = (() => {
    const days = new Map();
    periodTransactions.forEach((item) => {
      const current = days.get(item.date) || { date: item.date || "-", dateLabel: formatAfghanDate(item.date, { numeric: true }), income: 0, expense: 0, net: 0 };
      current[item.type === "income" ? "income" : "expense"] += item.amount;
      current.net = current.income - current.expense;
      days.set(item.date, current);
    });
    return [...days.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  })();

  const expenseCategoryData = Object.entries(
    periodTransactions.filter((item) => item.type === "expense").reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + item.amount;
      return result;
    }, {})
  ).map(([category, amount]) => ({ category, name: categoryLabel(category), amount })).sort((a, b) => b.amount - a.amount);

  const incomeSourceData = Object.entries(
    periodTransactions.filter((item) => item.type === "income").reduce((result, item) => {
      const name = sourceLabel(item.source);
      result[name] = (result[name] || 0) + item.amount;
      return result;
    }, {})
  ).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

  const tripData = travels.map((travel, travelIndex) => {
    const records = customerTravels.filter((record) => Number(record.travelIndex) === travelIndex && isInRange(record.date || travel.date, period, start, end));
    const expenses = travelExpenses.filter((expense) => Number(expense.travelIndex) === travelIndex && isInRange(expense.date || travel.date, period, start, end));
    const billed = records.reduce((sum, record) => sum + Math.max(number(record.fare) - number(record.discount), 0), 0);
    const income = records.reduce((sum, record) => sum + number(record.paidAmount), 0);
    const expense = expenses.reduce((sum, item) => sum + number(item.amount), 0);
    return { ...travel, travelIndex, billed, income, expense, net: income - expense, margin: income > 0 ? ((income - expense) / income) * 100 : 0, customers: records.length };
  }).filter((travel) => travel.customers > 0 || travel.expense > 0).sort((a, b) => b.net - a.net);

  const routeData = Object.values(tripData.reduce((result, trip) => {
    const name = `${trip.from || "-"} - ${trip.to || "-"}`;
    const current = result[name] || { name, income: 0, expense: 0, net: 0, trips: 0 };
    current.income += trip.income; current.expense += trip.expense; current.net = current.income - current.expense; current.trips += 1;
    result[name] = current; return result;
  }, {})).sort((a, b) => b.net - a.net);

  const carData = cars.map((car) => {
    const items = tripData.filter((trip) => trip.car === car.plate);
    const income = items.reduce((sum, item) => sum + item.income, 0);
    const manualRepairExpense = periodTransactions
      .filter((item) => item.type === "expense" && item.source === "car-repair" && Number(item.carId) === Number(car.id))
      .reduce((sum, item) => sum + item.amount, 0);
    const expense = items.reduce((sum, item) => sum + item.expense, 0) + manualRepairExpense;
    return { id: car.id, plate: car.plate, type: car.type, income, expense, net: income - expense, trips: items.length };
  }).filter((car) => car.trips > 0 || car.expense > 0).sort((a, b) => b.net - a.net);

  const customerData = customers.map((customer, customerIndex) => {
    const records = customerTravels.filter((record) => Number(record.customerIndex) === customerIndex && isInRange(record.date, period, start, end));
    const payments = customerPayments.filter((payment) => Number(payment.customerIndex) === customerIndex && isInRange(payment.date, period, start, end));
    const billed = records.reduce((sum, record) => sum + Math.max(number(record.fare) - number(record.discount), 0), 0);
    const paid = records.reduce((sum, record) => sum + number(record.paidAmount), 0) + payments.reduce((sum, payment) => sum + number(payment.amount), 0);
    return { name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(), customerIndex, billed, paid, debt: Math.max(billed - paid, 0), discount: records.reduce((sum, record) => sum + number(record.discount), 0) };
  }).filter((customer) => customer.billed > 0 || customer.paid > 0).sort((a, b) => b.paid - a.paid);

  const largestExpenses = periodTransactions.filter((item) => item.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 7);
  const largestDebtors = [...customerData].filter((item) => item.debt > 0).sort((a, b) => b.debt - a.debt).slice(0, 7);
  const { page, setPage, totalPages, pageItems, pageSize, setPageSize } = useTablePagination(filteredTransactions, `${search}-${typeFilter}-${categoryFilter}-${period}-${activeDate}`);

  const saveBudget = (event) => {
    event.preventDefault();
    const amount = number(budgetForm.amount);
    if (amount <= 0 || budgetForm.endDate < budgetForm.startDate) return notify("مقدار و تاریخ بودجه را درست وارد کنید.", "error");
    setBudgets([...budgets, { id: Date.now(), ...budgetForm, amount }]);
    setBudgetForm({ title: "", amount: "", startDate: start, endDate: end, note: "" });
    setShowBudgetModal(false);
    notify("بودجه مالی ثبت شد.");
  };

  return (
    <div className="reports-page financial-report-page">
      <div className="financial-report-hero">
        <div><span>مرکز تحلیل مالی</span><h1>راپور جامع عواید و مصارف</h1><p>جریان نقدی، سودآوری سفرها، موترها، مشتری‌ها، مسیرها، بودجه و تمام تعاملات مالی</p></div>
        <div className="financial-hero-actions">
          <div><span>سود یا ضرر خالص</span><strong className={totals.net >= 0 ? "positive" : "negative"}>{money(totals.net)} افغانی</strong><small>حاشیه سود {totals.margin.toFixed(1)}%</small></div>
          <Link to={`/reports/finance/statement?period=${period}&date=${activeDate}`}>چاپ صورت‌حساب</Link>
          <button onClick={() => { setBudgetForm({ ...budgetForm, startDate: start, endDate: end }); setShowBudgetModal(true); }}>+ ثبت بودجه</button>
        </div>
      </div>

      <div className="report-filters financial-report-filters">
        <div className="report-filter-group"><label>حالت راپور</label><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">تمام تاریخ‌ها</option><option value="daily">روزانه</option><option value="weekly">هفته‌وار</option><option value="monthly">ماهانه</option><option value="yearly">سالانه</option></select></div>
        <div className="report-filter-group"><label>انتخاب تاریخ</label><AfghanDateInput value={activeDate} onChange={setSelectedDate} disabled={period === "all"} /></div>
        <div className="report-filter-group"><label>حالت تعامل</label><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">عاید و مصرف</option><option value="income">تنها عواید</option><option value="expense">تنها مصارف</option></select></div>
        <div className="report-filter-group"><label>دسته‌بندی</label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">همه دسته‌ها</option><option value="travel">عاید سفر</option><option value="customer">پرداخت مشتری</option><option value="fuel">تیل</option><option value="repair">ترمیم</option><option value="salary">معاش</option><option value="purchase">خریداری</option><option value="other">سایر</option></select></div>
        <div className="report-filter-summary"><span>بازه راپور</span><strong>{period === "all" ? "تمام تاریخ‌های ثبت‌شده" : start === end ? formatAfghanDate(start) : `${formatAfghanDate(start)} تا ${formatAfghanDate(end)}`}</strong></div>
      </div>

      <div className="financial-report-stats">
        <div className="income"><span>مجموع عواید</span><strong>{money(totals.income)}</strong><p>{periodTransactions.filter((item) => item.type === "income").length} ریکارد عاید</p></div>
        <div className="expense"><span>مجموع مصارف</span><strong>{money(totals.expense)}</strong><p>{periodTransactions.filter((item) => item.type === "expense").length} ریکارد مصرف</p></div>
        <div className={totals.net >= 0 ? "profit" : "expense"}><span>{totals.net >= 0 ? "سود خالص" : "ضرر خالص"}</span><strong>{money(Math.abs(totals.net))}</strong><p>حاشیه سود {totals.margin.toFixed(1)}%</p></div>
        <div className={growth !== null && growth >= 0 ? "profit" : "expense"}><span>رشد عاید</span><strong>{growth === null ? "-" : `${growth.toFixed(1)}%`}</strong><p>مقایسه با دوره قبلی</p></div>
        <div className="debt"><span>طلب مشتری‌ها</span><strong>{money(customerDebt)}</strong><p>{money(discountTotal)} افغانی تخفیف</p></div>
        <div className="budget"><span>بودجه ثبت‌شده</span><strong>{money(budgetTotal)}</strong><p>{budgetUsage.toFixed(1)}% مصرف‌شده</p></div>
      </div>

      <div className="financial-overview-grid">
        <section className="financial-card budget-card">
          <div className="financial-card-title"><div><span>بودجه در برابر واقعیت</span><h3>کنترول مصرف</h3></div><b className={budgetTotal > 0 && budgetRemaining < 0 ? "negative" : "positive"}>{budgetTotal > 0 ? money(budgetRemaining) : "ثبت نشده"}</b></div>
          <div className="budget-gauge"><div><i style={{ width: `${Math.min(budgetUsage, 100)}%` }} className={budgetUsage > 100 ? "over" : ""} /></div><span><b>مصرف واقعی: {money(totals.expense)}</b><strong>بودجه: {money(budgetTotal)}</strong></span></div>
          <div className="budget-records">{activeBudgets.slice(0, 4).map((budget) => <div key={budget.id}><span>{budget.title}</span><strong>{money(budget.amount)}</strong><small>{formatAfghanDate(budget.startDate)} تا {formatAfghanDate(budget.endDate)}</small></div>)}{activeBudgets.length === 0 && <p>هنوز برای این بازه بودجه ثبت نشده است.</p>}</div>
        </section>
        <section className="financial-card cashflow-card">
          <div className="financial-card-title"><div><span>جریان نقدی</span><h3>عاید، مصرف و سود بر اساس تاریخ</h3></div><small>{periodLabels[period]}</small></div>
          <div className="financial-chart-body"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={cashFlowData}><CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip {...tooltipProps} /><Legend /><Bar dataKey="income" name="عاید" fill="#16a34a" radius={[5,5,0,0]} /><Bar dataKey="expense" name="مصرف" fill="#dc2626" radius={[5,5,0,0]} /><Line dataKey="net" name="سود خالص" stroke="#4f46e5" strokeWidth={3} /></ComposedChart></ResponsiveContainer></div>
        </section>
      </div>

      <div className="financial-chart-grid">
        <section className="financial-card"><div className="financial-card-title"><div><span>دسته‌بندی مصارف</span><h3>تیل، ترمیم، معاش و سایر</h3></div></div><div className="financial-chart-body"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseCategoryData} dataKey="amount" nameKey="name" innerRadius={55} outerRadius={88} paddingAngle={4}>{expenseCategoryData.map((item) => <Cell key={item.category} fill={expenseColors[item.category] || "#64748b"} />)}</Pie><Tooltip {...tooltipProps} /><Legend /></PieChart></ResponsiveContainer></div></section>
        <section className="financial-card"><div className="financial-card-title"><div><span>منابع عاید</span><h3>عاید از کجا دریافت شده؟</h3></div></div><div className="financial-chart-body"><ResponsiveContainer width="100%" height="100%"><BarChart data={incomeSourceData} layout="vertical"><CartesianGrid strokeDasharray="4 4" horizontal={false} /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 8 }} /><Tooltip {...tooltipProps} /><Bar dataKey="amount" name="عاید" fill="#16a34a" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer></div></section>
        <section className="financial-card"><div className="financial-card-title"><div><span>عواید مسیرها</span><h3>پردرآمدترین مسیرها و مقصدها</h3></div></div><div className="financial-chart-body"><ResponsiveContainer width="100%" height="100%"><BarChart data={routeData.slice(0, 8)} layout="vertical"><CartesianGrid strokeDasharray="4 4" horizontal={false} /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 8 }} /><Tooltip {...tooltipProps} /><Legend /><Bar dataKey="income" name="عاید" fill="#2563eb" radius={[0,6,6,0]} /><Bar dataKey="net" name="سود" fill="#8b5cf6" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer></div></section>
      </div>

      <div className="financial-performance-grid">
        <section className="financial-ranking-card"><div className="financial-ranking-title"><span>سودآوری سفرها</span><h3>بهترین و ضعیف‌ترین سفرها</h3></div>{tripData.slice(0, 6).map((trip, index) => <Link to={`/travels/${trip.travelIndex}`} key={trip.travelIndex}><b>{index + 1}</b><div><strong>{trip.name || `${trip.from} - ${trip.to}`}</strong><span>{trip.customers} مشتری · مصرف {money(trip.expense)}</span></div><em className={trip.net >= 0 ? "positive" : "negative"}>{money(trip.net)}</em></Link>)}{tripData.length === 0 && <p className="financial-empty">سفر مالی در این بازه وجود ندارد.</p>}</section>
        <section className="financial-ranking-card"><div className="financial-ranking-title"><span>راپور مالی موترها</span><h3>عاید، مصرف و سود موتر</h3></div>{carData.slice(0, 6).map((car, index) => <Link to={`/cars/${car.id}`} key={car.plate}><b>{index + 1}</b><div><strong>{car.plate} · {car.type || "-"}</strong><span>{car.trips} سفر · عاید {money(car.income)}</span></div><em className={car.net >= 0 ? "positive" : "negative"}>{money(car.net)}</em></Link>)}{carData.length === 0 && <p className="financial-empty">ریکارد موتر در این بازه وجود ندارد.</p>}</section>
        <section className="financial-ranking-card"><div className="financial-ranking-title"><span>راپور مالی مشتری‌ها</span><h3>پرداخت و بدهی مشتریان</h3></div>{customerData.slice(0, 6).map((customer, index) => <Link to={`/customers/${customer.customerIndex}`} key={customer.customerIndex}><b>{index + 1}</b><div><strong>{customer.name}</strong><span>پرداخت {money(customer.paid)} · تخفیف {money(customer.discount)}</span></div><em className={customer.debt > 0 ? "negative" : "positive"}>{money(customer.debt)}</em></Link>)}{customerData.length === 0 && <p className="financial-empty">ریکارد مشتری در این بازه وجود ندارد.</p>}</section>
      </div>

      <div className="financial-alert-grid">
        <section className="financial-ranking-card expense-list"><div className="financial-ranking-title"><span>بزرگ‌ترین مصارف</span><h3>مصارف نیازمند بررسی</h3></div>{largestExpenses.map((item, index) => <div className="financial-ranking-row" key={item.id}><b>{index + 1}</b><div><strong>{item.title}</strong><span>{formatDateTime(item.date, item.createdAt || item.updatedAt)} · {categoryLabel(item.category)}</span></div><em>{money(item.amount)}</em></div>)}{largestExpenses.length === 0 && <p className="financial-empty">مصرفی ثبت نشده است.</p>}</section>
        <section className="financial-ranking-card debt-list"><div className="financial-ranking-title"><span>بدهی مشتری‌ها</span><h3>طلب‌های قابل دریافت</h3></div>{largestDebtors.map((customer, index) => <Link to={`/customers/${customer.customerIndex}`} key={customer.customerIndex}><b>{index + 1}</b><div><strong>{customer.name}</strong><span>کرایه خالص {money(customer.billed)} · پرداخت {money(customer.paid)}</span></div><em>{money(customer.debt)}</em></Link>)}{largestDebtors.length === 0 && <p className="financial-empty">هیچ بدهی‌ای در این بازه وجود ندارد.</p>}</section>
      </div>

      <div className="travel-report-table financial-report-table">
        <div className="travel-map-title report-table-title financial-report-table-title"><div><h3>جدول جامع عواید و مصارف</h3><p>تمام تعاملات مالی دستی و خودکار سیستم</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی عنوان، توضیحات، تاریخ یا منبع..." /></div>
        <div className="financial-report-table-wrap"><table><thead><tr><th>تاریخ</th><th>حالت</th><th>عنوان</th><th>مقدار</th><th>دسته‌بندی</th><th>منبع</th><th>توضیحات</th></tr></thead><tbody>{pageItems.map((item) => <tr key={item.id}><td>{formatDateTime(item.date, item.createdAt || item.updatedAt)}</td><td><span className={`financial-type ${item.type}`}>{item.type === "income" ? "عاید" : "مصرف"}</span></td><td>{item.title || "-"}</td><td className={item.type === "income" ? "financial-income" : "financial-expense"}>{money(item.amount)}</td><td>{categoryLabel(item.category)}</td><td>{sourceLabel(item.source)}</td><td>{item.description || "-"}</td></tr>)}{filteredTransactions.length === 0 && <tr><td colSpan="7" className="report-empty">ریکارد مطابق فیلتر یا جستجو پیدا نشد.</td></tr>}</tbody></table></div>
        <TablePagination page={page} totalPages={totalPages} setPage={setPage} totalItems={filteredTransactions.length} pageSize={pageSize} setPageSize={setPageSize} />
      </div>

      {showBudgetModal && <div className="financial-modal-backdrop"><div className="financial-modal" onClick={(event) => event.stopPropagation()}><div className="financial-modal-title"><div><h3>ثبت بودجه مالی</h3><p>بودجه تعیین‌شده با مصرف واقعی مقایسه می‌شود.</p></div><button onClick={() => setShowBudgetModal(false)}>×</button></div><form onSubmit={saveBudget}><label>عنوان بودجه<input value={budgetForm.title} onChange={(event) => setBudgetForm({ ...budgetForm, title: event.target.value })} /></label><label>مقدار بودجه<input type="number" min="1" value={budgetForm.amount} onChange={(event) => setBudgetForm({ ...budgetForm, amount: event.target.value })} /></label><label>تاریخ شروع<AfghanDateInput value={budgetForm.startDate} onChange={(startDate) => setBudgetForm({ ...budgetForm, startDate })} /></label><label>تاریخ پایان<AfghanDateInput value={budgetForm.endDate} onChange={(endDate) => setBudgetForm({ ...budgetForm, endDate })} /></label><label className="full">توضیحات<textarea value={budgetForm.note} onChange={(event) => setBudgetForm({ ...budgetForm, note: event.target.value })} /></label><div className="financial-modal-actions"><button type="button" onClick={() => setShowBudgetModal(false)}>لغو</button><button type="submit">ثبت بودجه</button></div></form></div></div>}
    </div>
  );
}

export default FinancialReport;

