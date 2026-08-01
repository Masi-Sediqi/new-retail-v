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
import { formatAfghanDate, formatDateTime } from "../utils/afghanDate";
import { getDateRange, parseDate, toDateValue } from "../utils/financialAnalysis";
import "./Reports.css";
import "./CustomerReport.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");
const number = (value) => Number(value || 0);
const accountColors = {
  بدهکار: "#dc2626",
  تسویه: "#16a34a",
  بستانکار: "#2563eb",
  "بدون فعالیت": "#64748b",
};

const periodLabels = { all: "تمام تاریخ‌ها", daily: "روزانه", weekly: "هفته‌وار", monthly: "ماهانه" };
const tooltipProps = {
  contentStyle: { borderRadius: 12, border: "1px solid #e2e8f0", fontFamily: "Vazirmatn", direction: "rtl" },
  formatter: (value) => money(value),
};

function CustomerReport() {
  const [customers] = useJsonCollection("customers");
  const [customerTravels] = useJsonCollection("customerTravels");
  const [customerPayments] = useJsonCollection("customerPayments");
  const [travelExpenses] = useJsonCollection("travelExpenses");
  const [period, setPeriod] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [accountStatus, setAccountStatus] = useState("all");
  const [search, setSearch] = useState("");

  const latestDate = useMemo(() => {
    const dates = [...customerTravels, ...customerPayments].map((item) => item.date).filter(Boolean);
    return dates.sort().at(-1) || toDateValue(new Date());
  }, [customerPayments, customerTravels]);
  const activeDate = selectedDate || latestDate;
  const { start, end } = getDateRange(activeDate, period);
  const inRange = (date) => period === "all" || (date && date >= start && date <= end);
  const inactivityReference = parseDate(latestDate) || new Date();

  const customerData = customers.map((customer, customerIndex) => {
    const allRecords = customerTravels.filter((record) => Number(record.customerIndex) === customerIndex);
    const records = allRecords.filter((record) => inRange(record.date));
    const allPayments = customerPayments.filter((payment) => Number(payment.customerIndex) === customerIndex);
    const payments = allPayments.filter((payment) => inRange(payment.date));
    const billed = records.reduce((sum, record) => sum + Math.max(number(record.fare) - number(record.discount), 0), 0);
    const initialPaid = records.reduce((sum, record) => sum + number(record.paidAmount), 0);
    const laterPaid = payments.reduce((sum, payment) => sum + number(payment.amount), 0);
    const paid = initialPaid + laterPaid;
    const discount = records.reduce((sum, record) => sum + number(record.discount), 0);
    const debt = Math.max(billed - paid, 0);
    const credit = Math.max(paid - billed, 0);
    const destinations = records.reduce((result, record) => {
      const destination = record.to || "نامعلوم";
      result[destination] = (result[destination] || 0) + 1;
      return result;
    }, {});
    const favoriteDestination = Object.entries(destinations).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    const allocatedExpense = records.reduce((sum, record) => {
      const tripIndex = Number(record.travelIndex);
      const tripCustomers = customerTravels.filter((item) => Number(item.travelIndex) === tripIndex).length || 1;
      const tripExpense = travelExpenses
        .filter((expense) => Number(expense.travelIndex) === tripIndex)
        .reduce((expenseSum, expense) => expenseSum + number(expense.amount), 0);
      return sum + tripExpense / tripCustomers;
    }, 0);
    const activityDates = [...allRecords, ...allPayments].map((item) => item.date).filter(Boolean).sort();
    const firstActivity = activityDates[0] || "-";
    const lastActivity = activityDates.at(-1) || "-";
    const lastDate = parseDate(lastActivity);
    const inactiveDays = lastDate ? Math.floor((inactivityReference - lastDate) / 86400000) : null;
    const isInactive = inactiveDays === null || inactiveDays > 90;
    const status = debt > 0 ? "بدهکار" : credit > 0 ? "بستانکار" : allRecords.length + allPayments.length === 0 ? "بدون فعالیت" : "تسویه";

    return {
      ...customer,
      customerIndex,
      fullName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "مشتری بدون نام",
      tripCount: records.length,
      lifetimeTrips: allRecords.length,
      paymentCount: records.filter((record) => number(record.paidAmount) > 0).length + payments.length,
      billed,
      paid,
      discount,
      debt,
      credit,
      netValue: paid - allocatedExpense,
      allocatedExpense,
      favoriteDestination,
      destinationCount: Object.keys(destinations).length,
      firstActivity,
      lastActivity,
      inactiveDays,
      isInactive,
      status,
    };
  });

  const visibleCustomers = customerData.filter((customer) => {
    if (accountStatus === "inactive") return customer.isInactive;
    if (accountStatus === "overdue") return customer.debt > 0 && customer.inactiveDays !== null && customer.inactiveDays > 30;
    return accountStatus === "all" || customer.status === accountStatus;
  });
  const searchedCustomers = visibleCustomers
    .filter((customer) =>
      customer.fullName.includes(search) ||
      (customer.phone || "").includes(search) ||
      (customer.tazkiraNo || "").includes(search) ||
      customer.favoriteDestination.includes(search)
    )
    .sort((a, b) => b.paid - a.paid || b.tripCount - a.tripCount);

  const totals = visibleCustomers.reduce(
    (sum, customer) => ({
      trips: sum.trips + customer.tripCount,
      billed: sum.billed + customer.billed,
      paid: sum.paid + customer.paid,
      debt: sum.debt + customer.debt,
      discount: sum.discount + customer.discount,
      netValue: sum.netValue + customer.netValue,
    }),
    { trips: 0, billed: 0, paid: 0, debt: 0, discount: 0, netValue: 0 }
  );

  const accountData = Object.entries(
    customerData.reduce((result, customer) => {
      result[customer.status] = (result[customer.status] || 0) + 1;
      return result;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const financeByDate = (() => {
    const days = new Map();
    customerTravels.filter((record) => inRange(record.date)).forEach((record) => {
      const current = days.get(record.date) || { date: record.date || "-", dateLabel: formatAfghanDate(record.date, { numeric: true }), billed: 0, paid: 0, discount: 0 };
      current.billed += Math.max(number(record.fare) - number(record.discount), 0);
      current.paid += number(record.paidAmount);
      current.discount += number(record.discount);
      days.set(record.date, current);
    });
    customerPayments.filter((payment) => inRange(payment.date)).forEach((payment) => {
      const current = days.get(payment.date) || { date: payment.date || "-", dateLabel: formatAfghanDate(payment.date, { numeric: true }), billed: 0, paid: 0, discount: 0 };
      current.paid += number(payment.amount);
      days.set(payment.date, current);
    });
    return [...days.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  })();

  const destinationData = Object.entries(
    customerTravels.filter((record) => inRange(record.date)).reduce((result, record) => {
      const name = record.to || "نامعلوم";
      result[name] = (result[name] || 0) + 1;
      return result;
    }, {})
  ).map(([name, trips]) => ({ name, trips })).sort((a, b) => b.trips - a.trips).slice(0, 8);

  const topCustomers = [...visibleCustomers].sort((a, b) => b.paid - a.paid || b.tripCount - a.tripCount).slice(0, 8);
  const topDebtors = [...visibleCustomers].filter((customer) => customer.debt > 0).sort((a, b) => b.debt - a.debt).slice(0, 6);
  const newCustomersCount = customerData.filter((customer) => customer.firstActivity !== "-" && inRange(customer.firstActivity)).length;
  const overdueCount = customerData.filter((customer) => customer.debt > 0 && customer.inactiveDays !== null && customer.inactiveDays > 30).length;
  const { page, setPage, totalPages, pageItems, pageSize, setPageSize } = useTablePagination(
    searchedCustomers,
    `${search}-${accountStatus}-${period}-${activeDate}`
  );

  return (
    <div className="reports-page customer-report-page">
      <div className="customer-report-hero">
        <div><span>مرکز تحلیل مشتریان</span><h1>راپور جامع مشتری‌ها</h1><p>تحلیل سفرها، پرداخت‌ها، بدهی‌ها، تخفیف‌ها، فعالیت و ارزش مالی هر مشتری</p></div>
        <div className="customer-hero-balance"><span>مجموع طلب از مشتری‌ها</span><strong>{money(totals.debt)} افغانی</strong><small>{periodLabels[period]}</small></div>
      </div>

      <div className="report-filters customer-report-filters">
        <div className="report-filter-group"><label>حالت راپور</label><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">تمام تاریخ‌ها</option><option value="daily">روزانه</option><option value="weekly">هفته‌وار</option><option value="monthly">ماهانه</option></select></div>
        <div className="report-filter-group"><label>انتخاب تاریخ</label><AfghanDateInput value={activeDate} onChange={setSelectedDate} disabled={period === "all"} /></div>
        <div className="report-filter-group"><label>وضعیت مشتری</label><select value={accountStatus} onChange={(event) => setAccountStatus(event.target.value)}><option value="all">همه مشتری‌ها</option><option value="بدهکار">بدهکار</option><option value="overdue">بدهی سررسیدشده بیشتر از ۳۰ روز</option><option value="تسویه">تسویه‌شده</option><option value="بستانکار">پرداخت اضافه</option><option value="inactive">غیرفعال بیشتر از ۹۰ روز</option></select></div>
        <div className="report-filter-summary"><span>بازه راپور</span><strong>{period === "all" ? "تمام تاریخ‌های ثبت‌شده" : start === end ? formatAfghanDate(start) : `${formatAfghanDate(start)} تا ${formatAfghanDate(end)}`}</strong></div>
      </div>

      <div className="customer-report-stats">
        <div><span>مشتری قابل نمایش</span><strong>{visibleCustomers.length}</strong><p>از مجموع {customers.length} مشتری</p></div>
        <div><span>سفرهای مشتری‌ها</span><strong>{money(totals.trips)}</strong><p>سفر در بازه انتخاب‌شده</p></div>
        <div className="income"><span>پرداخت دریافت‌شده</span><strong>{money(totals.paid)}</strong><p>افغانی پرداخت مشتریان</p></div>
        <div className="debt"><span>طلب باقی‌مانده</span><strong>{money(totals.debt)}</strong><p>افغانی قابل دریافت</p></div>
        <div className="discount"><span>مجموع تخفیف</span><strong>{money(totals.discount)}</strong><p>افغانی تخفیف داده‌شده</p></div>
        <div className="new"><span>مشتری‌های جدید</span><strong>{newCustomersCount}</strong><p>{overdueCount} بدهی سررسیدشده</p></div>
      </div>

      <div className="customer-report-charts">
        <section className="customer-chart-card account-chart">
          <div className="customer-chart-title"><div><span>وضعیت حساب‌ها</span><h3>توزیع مشتری‌ها</h3></div><b>{customers.length}</b></div>
          <div className="customer-chart-body"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={accountData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>{accountData.map((item) => <Cell key={item.name} fill={accountColors[item.name] || "#64748b"} />)}</Pie><Tooltip {...tooltipProps} /><Legend /></PieChart></ResponsiveContainer></div>
        </section>
        <section className="customer-chart-card customer-finance-chart">
          <div className="customer-chart-title"><div><span>جریان مالی مشتری‌ها</span><h3>کرایه، پرداخت و تخفیف بر اساس تاریخ</h3></div><small>{periodLabels[period]}</small></div>
          <div className="customer-chart-body"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={financeByDate}><CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip {...tooltipProps} /><Legend /><Bar dataKey="billed" name="کرایه خالص" fill="#4f46e5" radius={[5,5,0,0]} /><Bar dataKey="paid" name="پرداخت" fill="#16a34a" radius={[5,5,0,0]} /><Line dataKey="discount" name="تخفیف" stroke="#f59e0b" strokeWidth={3} /></ComposedChart></ResponsiveContainer></div>
        </section>
        <section className="customer-chart-card destination-chart">
          <div className="customer-chart-title"><div><span>مسیرهای محبوب</span><h3>مقصدهای انتخاب‌شده مشتری‌ها</h3></div><small>۸ مقصد اول</small></div>
          <div className="customer-chart-body"><ResponsiveContainer width="100%" height="100%"><BarChart data={destinationData} layout="vertical"><CartesianGrid strokeDasharray="4 4" horizontal={false} /><XAxis type="number" tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 9 }} /><Tooltip {...tooltipProps} /><Bar dataKey="trips" name="تعداد سفر" fill="#2563eb" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer></div>
        </section>
      </div>

      <div className="customer-insight-grid">
        <section className="customer-ranking-card">
          <div className="customer-ranking-title"><div><span>مشتری‌های ممتاز</span><h3>پُردرآمد و پُرسفر</h3></div></div>
          <div className="customer-ranking-list">
            {topCustomers.slice(0, 6).map((customer, index) => (
              <Link to={`/customers/${customer.customerIndex}`} key={customer.customerIndex}>
                <b>{index + 1}</b><div><strong>{customer.fullName}</strong><span>{customer.tripCount} سفر · {customer.favoriteDestination}</span></div><em>{money(customer.paid)}</em>
              </Link>
            ))}
            {topCustomers.length === 0 && <p className="customer-report-empty">فعالیتی در این بازه ثبت نشده است.</p>}
          </div>
        </section>
        <section className="customer-ranking-card debtor-card">
          <div className="customer-ranking-title"><div><span>پیگیری مالی</span><h3>بزرگ‌ترین بدهکاران</h3></div><strong>{topDebtors.length}</strong></div>
          <div className="customer-ranking-list">
            {topDebtors.map((customer, index) => (
              <Link to={`/customers/${customer.customerIndex}`} key={customer.customerIndex}>
                <b>{index + 1}</b><div><strong>{customer.fullName}</strong><span>آخرین فعالیت: {formatDateTime(customer.lastActivity)}</span></div><em>{money(customer.debt)}</em>
              </Link>
            ))}
            {topDebtors.length === 0 && <p className="customer-report-empty">هیچ مشتری بدهکار نیست.</p>}
          </div>
        </section>
      </div>

      <div className="travel-report-table customer-report-table">
        <div className="travel-map-title report-table-title customer-report-table-title">
          <div><h3>جدول جامع مشتری‌ها</h3><p>صورت حساب، فعالیت، مسیر محبوب و ارزش مالی هر مشتری</p></div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی نام، تلفن، تذکره یا مقصد..." />
        </div>
        <div className="customer-report-table-wrap">
          <table>
            <thead><tr><th>مشتری</th><th>وضعیت</th><th>سفر</th><th>کرایه خالص</th><th>پرداخت</th><th>بدهی</th><th>تخفیف</th><th>ارزش خالص تقریبی</th><th>مسیر محبوب</th><th>اولین فعالیت</th><th>آخرین فعالیت</th><th>جزئیات</th></tr></thead>
            <tbody>
              {pageItems.map((customer) => (
                <tr key={customer.customerIndex}>
                  <td><strong>{customer.fullName}</strong><small>{customer.phone || "-"} · {customer.tazkiraNo || "بدون تذکره"}</small></td>
                  <td><span className={`customer-account-status ${customer.status === "بدهکار" ? "debt" : customer.status === "بستانکار" ? "credit" : customer.status === "تسویه" ? "settled" : "inactive"}`}>{customer.status}</span></td>
                  <td>{customer.tripCount}</td><td>{money(customer.billed)}</td><td className="customer-report-income">{money(customer.paid)}</td><td className="customer-report-debt">{money(customer.debt)}</td><td>{money(customer.discount)}</td>
                  <td className={customer.netValue >= 0 ? "customer-report-income" : "customer-report-debt"}>{money(customer.netValue)}</td><td>{customer.favoriteDestination}</td><td>{formatDateTime(customer.firstActivity)}</td><td>{formatDateTime(customer.lastActivity)}</td>
                  <td><div className="customer-report-actions"><Link className="customer-report-link" to={`/customers/${customer.customerIndex}`}>مشاهده</Link><Link className="customer-report-link print" to={`/customers/${customer.customerIndex}/statement`}>صورت‌حساب</Link></div></td>
                </tr>
              ))}
              {searchedCustomers.length === 0 && <tr><td colSpan="12" className="report-empty">مشتری مطابق فیلتر یا جستجو پیدا نشد.</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} setPage={setPage} totalItems={searchedCustomers.length} pageSize={pageSize} setPageSize={setPageSize} />
      </div>
    </div>
  );
}

export default CustomerReport;
