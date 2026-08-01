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
import { getDateRange, toDateValue } from "../utils/financialAnalysis";
import "./Reports.css";
import "./CarReport.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");
const number = (value) => Number(value || 0);
const statusColors = {
  فعال: "#16a34a",
  "در ترمیم": "#f59e0b",
  غیرفعال: "#dc2626",
  نامعلوم: "#64748b",
};

const periodLabels = {
  all: "تمام تاریخ‌ها",
  daily: "روزانه",
  weekly: "هفته‌وار",
  monthly: "ماهانه",
};

const chartTooltip = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    fontFamily: "Vazirmatn",
    direction: "rtl",
  },
  formatter: (value) => money(value),
};

function CarReport() {
  const [cars] = useJsonCollection("cars");
  const [travels] = useJsonCollection("travels");
  const [customerTravels] = useJsonCollection("customerTravels");
  const [travelExpenses] = useJsonCollection("travelExpenses");
  const [repairs] = useJsonCollection("carRepairs");
  const [period, setPeriod] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const latestDate = useMemo(() => {
    const dates = [
      ...travels.map((item) => item.date),
      ...travelExpenses.map((item) => item.date),
      ...repairs.map((item) => item.date),
    ].filter(Boolean);
    return dates.sort().at(-1) || toDateValue(new Date());
  }, [repairs, travelExpenses, travels]);

  const activeDate = selectedDate || latestDate;
  const { start, end } = getDateRange(activeDate, period);
  const inRange = (date) => period === "all" || (date && date >= start && date <= end);

  const carData = cars.map((car) => {
    const allCarTravels = travels
      .map((travel, index) => ({ ...travel, originalIndex: index }))
      .filter((travel) => travel.car === car.plate);
    const carTravels = allCarTravels.filter((travel) => inRange(travel.date));
    const tripIndexes = new Set(carTravels.map((travel) => travel.originalIndex));
    const allTripIndexes = new Set(allCarTravels.map((travel) => travel.originalIndex));
    const customerRecords = customerTravels.filter((record) => tripIndexes.has(Number(record.travelIndex)));
    const expenses = travelExpenses.filter((expense) =>
      inRange(expense.date) &&
      (expense.carPlate === car.plate || tripIndexes.has(Number(expense.travelIndex)))
    );
    const manualRepairs = repairs.filter((repair) =>
      inRange(repair.date) &&
      repair.source !== "travel-expense" &&
      (Number(repair.carId) === Number(car.id) || repair.carPlate === car.plate)
    );
    const carRepairs = repairs.filter((repair) =>
      inRange(repair.date) &&
      (Number(repair.carId) === Number(car.id) || repair.carPlate === car.plate)
    );

    const receivedIncome = customerRecords.reduce((sum, record) => sum + number(record.paidAmount), 0);
    const billedIncome = customerRecords.reduce(
      (sum, record) => sum + Math.max(number(record.fare) - number(record.discount), 0),
      0
    );
    const fuelExpense = expenses
      .filter((expense) => expense.category === "fuel")
      .reduce((sum, expense) => sum + number(expense.amount), 0);
    const travelRepairExpense = expenses
      .filter((expense) => expense.category === "repair")
      .reduce((sum, expense) => sum + number(expense.amount), 0);
    const otherExpense = expenses
      .filter((expense) => expense.category !== "fuel" && expense.category !== "repair")
      .reduce((sum, expense) => sum + number(expense.amount), 0);
    const manualRepairExpense = manualRepairs.reduce((sum, repair) => sum + number(repair.amount), 0);
    const repairExpense = travelRepairExpense + manualRepairExpense;
    const totalExpense = fuelExpense + repairExpense + otherExpense;
    const kilometers = carTravels.reduce((sum, travel) => sum + number(travel.kilometers), 0);
    const drivers = new Set(carTravels.map((travel) => travel.driver).filter(Boolean));
    const destinations = new Set(carTravels.map((travel) => travel.to).filter(Boolean));
    const lastTrip = allCarTravels.map((travel) => travel.date).filter(Boolean).sort().at(-1) || "-";

    return {
      ...car,
      status: car.status || "نامعلوم",
      tripCount: carTravels.length,
      lifetimeTripCount: allTripIndexes.size,
      completed: carTravels.filter((travel) => travel.status === "تکمیل شده").length,
      activeTrips: carTravels.filter((travel) => travel.status === "در جریان").length,
      pending: carTravels.filter((travel) => travel.status === "در انتظار").length,
      kilometers,
      receivedIncome,
      billedIncome,
      outstanding: Math.max(billedIncome - receivedIncome, 0),
      fuelExpense,
      repairExpense,
      otherExpense,
      totalExpense,
      net: receivedIncome - totalExpense,
      repairCount: carRepairs.length,
      driverCount: drivers.size,
      destinationCount: destinations.size,
      costPerKilometer: kilometers > 0 ? totalExpense / kilometers : 0,
      fuelPerKilometer: kilometers > 0 ? fuelExpense / kilometers : 0,
      lastTrip,
    };
  });

  const visibleCars = carData.filter((car) => status === "all" || car.status === status);
  const searchedCars = visibleCars
    .filter((car) =>
      (car.plate || "").includes(search) ||
      (car.type || "").includes(search) ||
      (car.model || "").includes(search) ||
      (car.color || "").includes(search) ||
      (car.status || "").includes(search)
    )
    .sort((a, b) => b.tripCount - a.tripCount || b.kilometers - a.kilometers);

  const totals = visibleCars.reduce(
    (sum, car) => ({
      trips: sum.trips + car.tripCount,
      kilometers: sum.kilometers + car.kilometers,
      income: sum.income + car.receivedIncome,
      expense: sum.expense + car.totalExpense,
      repairs: sum.repairs + car.repairCount,
    }),
    { trips: 0, kilometers: 0, income: 0, expense: 0, repairs: 0 }
  );
  totals.net = totals.income - totals.expense;

  const statusData = Object.entries(
    cars.reduce((result, car) => {
      const name = car.status || "نامعلوم";
      result[name] = (result[name] || 0) + 1;
      return result;
    }, {})
  ).map(([name, value]) => ({ name, value }));
  const chartCars = [...visibleCars]
    .sort((a, b) => b.tripCount - a.tripCount || b.receivedIncome - a.receivedIncome)
    .slice(0, 8);
  const topCar = chartCars[0];
  const { page, setPage, totalPages, pageItems, pageSize, setPageSize } = useTablePagination(
    searchedCars,
    `${search}-${status}-${period}-${activeDate}`
  );

  return (
    <div className="reports-page car-report-page">
      <div className="car-report-hero">
        <div>
          <span className="car-report-kicker">مرکز تحلیل ناوگان</span>
          <h1>راپور جامع موترها</h1>
          <p>تحلیل استفاده، عاید، مصارف، سود، تیل و ترمیم هر موتر بر اساس اطلاعات واقعی سیستم</p>
        </div>
        <div className="car-hero-highlight">
          <span>سود خالص ناوگان</span>
          <strong className={totals.net >= 0 ? "positive" : "negative"}>{money(totals.net)} افغانی</strong>
          <small>{periodLabels[period]}</small>
        </div>
      </div>

      <div className="report-filters car-report-filters">
        <div className="report-filter-group">
          <label>حالت راپور</label>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="all">تمام تاریخ‌ها</option>
            <option value="daily">روزانه</option>
            <option value="weekly">هفته‌وار</option>
            <option value="monthly">ماهانه</option>
          </select>
        </div>
        <div className="report-filter-group">
          <label>انتخاب تاریخ</label>
          <AfghanDateInput value={activeDate} onChange={setSelectedDate} disabled={period === "all"} />
        </div>
        <div className="report-filter-group">
          <label>وضعیت موتر</label>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">همه وضعیت‌ها</option>
            <option value="فعال">فعال</option>
            <option value="در ترمیم">در ترمیم</option>
            <option value="غیرفعال">غیرفعال</option>
          </select>
        </div>
        <div className="report-filter-summary">
          <span>بازه راپور</span>
          <strong>{period === "all" ? "تمام تاریخ‌های ثبت‌شده" : start === end ? formatAfghanDate(start) : `${formatAfghanDate(start)} تا ${formatAfghanDate(end)}`}</strong>
        </div>
      </div>

      <div className="car-report-stats">
        <div className="fleet-stat blue"><span>موترهای قابل نمایش</span><strong>{visibleCars.length}</strong><p>از مجموع {cars.length} موتر</p></div>
        <div className="fleet-stat violet"><span>سفر و کیلومتر</span><strong>{money(totals.trips)} سفر</strong><p>{money(totals.kilometers)} کیلومتر پیموده‌شده</p></div>
        <div className="fleet-stat green"><span>عاید دریافت‌شده</span><strong>{money(totals.income)}</strong><p>افغانی از سفرهای مشتریان</p></div>
        <div className="fleet-stat red"><span>تمام مصارف</span><strong>{money(totals.expense)}</strong><p>{totals.repairs} ریکارد ترمیم</p></div>
        <div className={`fleet-stat ${totals.net >= 0 ? "emerald" : "red"}`}><span>{totals.net >= 0 ? "سود خالص" : "ضرر خالص"}</span><strong>{money(Math.abs(totals.net))}</strong><p>تفاوت عاید و مصارف</p></div>
      </div>

      <div className="car-report-charts">
        <section className="car-chart-card status-chart-card">
          <div className="car-chart-title"><div><span>وضعیت ناوگان</span><h3>توزیع موترها</h3></div><b>{cars.length}</b></div>
          <div className="car-chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
                  {statusData.map((item) => <Cell key={item.name} fill={statusColors[item.name] || statusColors.نامعلوم} />)}
                </Pie>
                <Tooltip {...chartTooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="car-chart-card finance-chart-card">
          <div className="car-chart-title"><div><span>کارایی مالی</span><h3>عاید، مصرف و سود هر موتر</h3></div><small>۸ موتر پُرکار</small></div>
          <div className="car-chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartCars} margin={{ top: 10, right: 8, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="plate" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip {...chartTooltip} />
                <Legend />
                <Bar dataKey="receivedIncome" name="عاید" fill="#16a34a" radius={[5, 5, 0, 0]} />
                <Bar dataKey="totalExpense" name="مصرف" fill="#ef4444" radius={[5, 5, 0, 0]} />
                <Line dataKey="net" name="سود خالص" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="car-chart-card usage-chart-card">
          <div className="car-chart-title"><div><span>میزان استفاده</span><h3>سفر و کیلومتر موترها</h3></div><small>رتبه‌بندی عملیاتی</small></div>
          <div className="car-chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartCars} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="plate" width={70} tick={{ fontSize: 10 }} />
                <Tooltip {...chartTooltip} />
                <Legend />
                <Bar dataKey="tripCount" name="تعداد سفر" fill="#2563eb" radius={[0, 6, 6, 0]} />
                <Bar dataKey="kilometers" name="کیلومتر" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="fleet-analysis">
        <div className="fleet-analysis-copy">
          <span>موتر ممتاز این بازه</span>
          <h3>{topCar ? `${topCar.plate} · ${topCar.type || "موتر"}` : "هنوز سفری ثبت نشده"}</h3>
          <p>رتبه‌بندی بر اساس تعداد سفر و عاید دریافت‌شده انجام شده است.</p>
        </div>
        {topCar && (
          <div className="fleet-analysis-metrics">
            <div><span>سفر</span><strong>{topCar.tripCount}</strong></div>
            <div><span>کیلومتر</span><strong>{money(topCar.kilometers)}</strong></div>
            <div><span>عاید</span><strong>{money(topCar.receivedIncome)}</strong></div>
            <div><span>سود</span><strong className={topCar.net >= 0 ? "positive" : "negative"}>{money(topCar.net)}</strong></div>
          </div>
        )}
      </div>

      <div className="car-report-ranking">
        <div className="car-report-section-title">
          <div><span>تحلیل مصارف</span><h3>تیل، ترمیم و هزینه هر کیلومتر</h3><p>مقایسه سریع موترهای پُرکار برای تصمیم‌گیری بهتر</p></div>
        </div>
        <div className="car-cost-grid">
          {chartCars.slice(0, 6).map((car, index) => {
            const maximum = Math.max(car.fuelExpense, car.repairExpense, car.otherExpense, 1);
            return (
              <Link to={`/cars/${car.id}`} className="car-cost-card" key={car.id || car.plate}>
                <div className="car-cost-heading"><b>{index + 1}</b><div><h4>{car.plate}</h4><span>{car.type || "نوع نامعلوم"} · {car.model || "بدون مدل"}</span></div><strong>{money(car.totalExpense)}</strong></div>
                <div className="car-cost-bars">
                  <div><span>تیل</span><i><em style={{ width: `${(car.fuelExpense / maximum) * 100}%` }} /></i><b>{money(car.fuelExpense)}</b></div>
                  <div className="repair"><span>ترمیم</span><i><em style={{ width: `${(car.repairExpense / maximum) * 100}%` }} /></i><b>{money(car.repairExpense)}</b></div>
                  <div className="other"><span>سایر</span><i><em style={{ width: `${(car.otherExpense / maximum) * 100}%` }} /></i><b>{money(car.otherExpense)}</b></div>
                </div>
                <footer><span>{money(car.costPerKilometer)} افغانی / کیلومتر</span><strong>جزئیات ←</strong></footer>
              </Link>
            );
          })}
          {chartCars.length === 0 && <div className="car-report-empty">برای نمایش تحلیل، ابتدا موتر و سفر ثبت کنید.</div>}
        </div>
      </div>

      <div className="travel-report-table car-report-table">
        <div className="travel-map-title report-table-title car-report-table-title">
          <div><h3>جدول جامع عملکرد موترها</h3><p>تمام ارقام مالی به افغانی است؛ برای مشاهده جزئیات روی موتر کلیک کنید</p></div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی پلیت، نوع، مدل یا وضعیت..." />
        </div>
        <div className="car-report-table-wrap">
          <table>
            <thead>
              <tr>
                <th>موتر</th><th>وضعیت</th><th>سفر</th><th>کیلومتر</th><th>عاید</th><th>مصرف</th><th>سود / ضرر</th><th>تیل</th><th>ترمیم</th><th>طلب</th><th>آخرین سفر</th><th>جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((car) => (
                <tr key={car.id || car.plate}>
                  <td><strong className="car-table-plate">{car.plate}</strong><small>{car.type || "-"} · {car.model || "-"}</small></td>
                  <td><span className={`fleet-status ${car.status === "فعال" ? "active" : car.status === "در ترمیم" ? "repair" : "inactive"}`}>{car.status}</span></td>
                  <td>{money(car.tripCount)}</td><td>{money(car.kilometers)}</td><td className="fleet-income">{money(car.receivedIncome)}</td><td className="fleet-expense">{money(car.totalExpense)}</td>
                  <td><strong className={car.net >= 0 ? "fleet-income" : "fleet-expense"}>{money(car.net)}</strong></td>
                  <td>{money(car.fuelExpense)}</td><td>{car.repairCount} / {money(car.repairExpense)}</td><td>{money(car.outstanding)}</td><td>{formatDateTime(car.lastTrip)}</td>
                  <td><Link className="car-detail-link" to={`/cars/${car.id}`}>مشاهده</Link></td>
                </tr>
              ))}
              {searchedCars.length === 0 && <tr><td colSpan="12" className="report-empty">موتر مطابق فیلتر یا جستجو پیدا نشد.</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} setPage={setPage} totalItems={searchedCars.length} pageSize={pageSize} setPageSize={setPageSize} />
      </div>
    </div>
  );
}

export default CarReport;
