import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import TablePagination from "../components/TablePagination";
import AfghanDateInput from "../components/AfghanDateInput";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import { formatAfghanDate, formatDateTime, todayDateValue } from "../utils/afghanDate";
import { calculateTravelCommission, findEmployeeByName } from "../utils/employeeFinance";
import "./DestinationDetails.css";
import "./Travels.css";

const today = todayDateValue;
const money = (value) => Number(value || 0).toLocaleString("en-US");

function DestinationDetails() {
  const { name } = useParams();
  const destinationName = decodeURIComponent(name);
  const navigate = useNavigate();
  const [travels, setTravels] = useJsonCollection("travels");
  const [customerTravels, setCustomerTravels] = useJsonCollection("customerTravels");
  const [travelExpenses, setTravelExpenses] = useJsonCollection("travelExpenses");
  const [carRepairs, setCarRepairs] = useJsonCollection("carRepairs");
  const [transactions, setTransactions] = useJsonCollection("transactions");
  const [employeeEarnings, setEmployeeEarnings] = useJsonCollection("employeeEarnings");
  const [cars, setCars] = useJsonCollection("cars");
  const [destinations] = useJsonCollection("destinations");
  const [drivers] = useJsonCollection("drivers");
  const availableDrivers = drivers.filter((employee) =>
    employee.status !== "غیرفعال" &&
    (["دریور", "راننده"].includes(employee.jobType) || (!employee.jobType && employee.licenseNo))
  );
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTravelIndex, setEditTravelIndex] = useState(null);
  const [finishTravelIndex, setFinishTravelIndex] = useState(null);
  const [finishDateTime, setFinishDateTime] = useState("");
  const destination = destinations.find((item) => item.name === destinationName);
  const [form, setForm] = useState({
    name: `سفر به ${destinationName}`,
    date: today(),
    driver: "",
    car: "",
    from: "",
    to: destinationName,
    kilometers: destination?.kilometers || "",
    duration: "",
    fare: "",
    status: "در انتظار",
    note: "",
  });
  const resetForm = () => {
    setForm({
      name: `سفر به ${destinationName}`,
      date: today(),
      driver: "",
      car: "",
      from: "",
      to: destinationName,
      kilometers: destination?.kilometers || "",
      duration: "",
      fare: "",
      status: "در انتظار",
      note: "",
    });
    setEditTravelIndex(null);
  };

  const destinationTravels = travels
    .map((travel, originalIndex) => ({ ...travel, originalIndex }))
    .filter((travel) => travel.to === destinationName)
    .filter((travel) =>
      (travel.name || "").includes(search) ||
      (travel.date || "").includes(search) ||
      (travel.driver || "").includes(search) ||
      (travel.car || "").includes(search) ||
      (travel.status || "").includes(search)
    )
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const chartData = useMemo(() => {
    const byDate = new Map();
    travels.filter((travel) => travel.to === destinationName).forEach((travel) => {
      const current = byDate.get(travel.date) || { date: travel.date || "-", trips: 0, fare: 0 };
      current.trips += 1;
      current.fare += Number(travel.fare || 0);
      byDate.set(travel.date, current);
    });
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [destinationName, travels]);

  const { page, setPage, totalPages, pageItems, pageSize, setPageSize } = useTablePagination(destinationTravels, search);
  const allDestinationTravels = travels.filter((travel) => travel.to === destinationName);
  const completed = allDestinationTravels.filter((travel) => travel.status === "تکمیل شده").length;
  const waiting = allDestinationTravels.filter((travel) => travel.status === "در انتظار").length;
  const totalFare = allDestinationTravels.reduce((sum, travel) => sum + Number(travel.fare || 0), 0);

  const saveTravel = (event) => {
    event.preventDefault();
    if (editTravelIndex !== null) {
      setTravels(travels.map((travel, index) => index === editTravelIndex ? { ...form, updatedAt: new Date().toISOString() } : travel));
      setCars(cars.map((car) => car.plate === form.car ? { ...car, status: form.status === "در جریان" ? "در سفر" : car.status } : car));
      notify("سفر ویرایش شد.");
    } else {
      setTravels([...travels, { ...form, createdAt: new Date().toISOString() }]);
      setCars(cars.map((car) => car.plate === form.car ? { ...car, status: form.status === "در جریان" ? "در سفر" : car.status } : car));
      notify("سفر جدید برای این مقصد ثبت شد.");
    }
    setShowModal(false);
    resetForm();
  };

  const openNewTravel = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditTravel = (travel) => {
    setForm({
      name: travel.name || "",
      date: travel.date || today(),
      driver: travel.driver || "",
      car: travel.car || "",
      from: travel.from || "",
      to: travel.to || destinationName,
      kilometers: travel.kilometers || "",
      duration: travel.duration || "",
      fare: travel.fare || "",
      status: travel.status === "تکمیل شده" ? "در جریان" : (travel.status || "در انتظار"),
      note: travel.note || "",
    });
    setEditTravelIndex(travel.originalIndex);
    setShowModal(true);
  };

  const deleteTravel = async (travelIndex) => {
    const ok = await confirmAction({
      title: "Delete Travel",
      message: "Delete this travel? Related customer and expense records will also be removed.",
      confirmText: "Delete",
    });
    if (!ok) return;
    const indexMap = new Map();
    const remainingTravels = [];
    travels.forEach((travel, index) => {
      if (index !== travelIndex) {
        indexMap.set(index, remainingTravels.length);
        remainingTravels.push(travel);
      }
    });
    const remap = (items) => items
      .filter((item) => Number(item.travelIndex) !== travelIndex)
      .map((item) => item.travelIndex === undefined
        ? item
        : { ...item, travelIndex: indexMap.get(Number(item.travelIndex)) });
    const removedCustomerTravelIds = new Set(
      customerTravels
        .filter((item) => Number(item.travelIndex) === travelIndex)
        .map((item) => Number(item.id))
    );
    const removedExpenseIds = new Set(
      travelExpenses
        .filter((item) => Number(item.travelIndex) === travelIndex)
        .map((item) => Number(item.id))
    );

    setTravels(remainingTravels);
    setCustomerTravels(remap(customerTravels));
    setTravelExpenses(remap(travelExpenses));
    setCarRepairs(remap(carRepairs));
    setTransactions(transactions
      .filter((transaction) =>
        Number(transaction.travelIndex) !== travelIndex &&
        !(transaction.source === "customer-travel" && removedCustomerTravelIds.has(Number(transaction.referenceId))) &&
        !(transaction.source === "travel-expense" && removedExpenseIds.has(Number(transaction.referenceId)))
      )
      .map((transaction) => transaction.travelIndex === undefined
        ? transaction
        : { ...transaction, travelIndex: indexMap.get(Number(transaction.travelIndex)) })
    );
    notify("سفر حذف شد.");
  };

  const openFinishTravel = (travelIndex) => {
    const now = new Date();
    const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setFinishTravelIndex(travelIndex);
    setFinishDateTime(value);
  };

  const finishTravel = (event) => {
    event.preventDefault();
    const finishedTravel = travels[finishTravelIndex];
    setTravels(travels.map((travel, index) => index === finishTravelIndex
      ? { ...travel, status: "تکمیل شده", completedAt: finishDateTime }
      : travel
    ));
    if (finishedTravel?.car) {
      setCars(cars.map((car) => car.plate === finishedTravel.car ? { ...car, status: "فعال" } : car));
    }
    const employee = findEmployeeByName(drivers, finishedTravel?.driver);
    const commission = calculateTravelCommission(employee, finishTravelIndex, travels, customerTravels);
    if (employee && commission > 0 && !employeeEarnings.some((item) => item.source === "travel-commission" && Number(item.referenceId) === Number(finishTravelIndex))) {
      setEmployeeEarnings([
        ...employeeEarnings,
        {
          id: Date.now(),
          employeeId: employee.id,
          employeeName: finishedTravel.driver,
          amount: commission,
          date: String(finishDateTime).slice(0, 10),
          source: "travel-commission",
          referenceId: finishTravelIndex,
          title: `فیصدی سفر ${finishedTravel.name || ""}`,
          description: employee.percentageBasis === "per_customer" ? "محاسبه به اساس فی مشتری" : "محاسبه به اساس فی سفر",
        },
      ]);
    }
    setFinishTravelIndex(null);
    setFinishDateTime("");
    notify("سفر اتمام شد.");
  };

  if (!destination && !travels.some((travel) => travel.to === destinationName)) {
    return <div className="destination-details-page"><div className="destination-empty-card"><h3>مقصد پیدا نشد</h3><button onClick={() => navigate("/travels")}>برگشت</button></div></div>;
  }

  return (
    <div className="destination-details-page">
      <div className="destination-details-header">
        <div>
          <h1>جزئیات مقصد {destinationName}</h1>
          <p>{destination?.description || "تمام سفرها، تاریخ‌ها و تحلیل این مقصد"}</p>
        </div>
        <div>
          <button className="destination-primary" onClick={openNewTravel}>+ ثبت سفر</button>
          <button className="destination-secondary" onClick={() => navigate("/travels")}>برگشت</button>
        </div>
      </div>

      <div className="destination-detail-stats">
        <div><span>کل سفرها</span><strong>{allDestinationTravels.length}</strong><p>تمام ریکاردهای مقصد</p></div>
        <div><span>در انتظار</span><strong>{waiting}</strong><p>سفر آماده ثبت مشتری</p></div>
        <div><span>تکمیل‌شده</span><strong>{completed}</strong><p>سفر انجام‌شده</p></div>
        <div><span>مجموع کرایه‌ها</span><strong>{money(totalFare)}</strong><p>افغانی</p></div>
      </div>

      <div className="destination-charts">
        <div className="destination-chart-card">
          <div><h3>تعداد سفرها بر اساس تاریخ</h3><p>در هر تاریخ چند سفر به این مقصد ثبت شده است</p></div>
          <div className="destination-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}><CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="trips" name="تعداد سفر" fill="#2563eb" radius={[8, 8, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="destination-chart-card">
          <div><h3>کرایه سفرها بر اساس تاریخ</h3><p>مجموع کرایه ثبت‌شده در هر تاریخ</p></div>
          <div className="destination-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}><CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value) => money(value)} /><Line type="monotone" dataKey="fare" name="کرایه" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="destination-records">
        <div className="destination-records-header">
          <div><h3>ریکارد تمام سفرها</h3><p>جزئیات سفرهای ثبت‌شده برای {destinationName}</p></div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی سفر، تاریخ، راننده..." />
        </div>
        <div className="destination-records-wrap">
          <table>
            <thead><tr><th>تاریخ</th><th>نام سفر</th><th>راننده</th><th>موتر</th><th>مسیر</th><th>کرایه</th><th>وضعیت</th><th>عملیات</th></tr></thead>
            <tbody>
              {pageItems.map((travel) => <tr key={travel.originalIndex}><td>{formatDateTime(travel.date, travel.createdAt || travel.updatedAt)}</td><td>{travel.name || "-"}</td><td>{travel.driver || "-"}</td><td>{travel.car || "-"}</td><td>{travel.from || "-"} - {travel.to}</td><td>{money(travel.fare)}</td><td>{travel.status}</td><td><div className="destination-row-actions"><button className="destination-detail-link" onClick={() => navigate(`/travels/${travel.originalIndex}`)}>جزئیات</button><button type="button" onClick={() => openEditTravel(travel)}>ویرایش</button><button type="button" onClick={() => openFinishTravel(travel.originalIndex)} disabled={travel.status === "تکمیل شده"}>اتمام سفر</button><button type="button" className="danger-action" onClick={() => deleteTravel(travel.originalIndex)}>حذف</button></div></td></tr>)}
              {!pageItems.length && <tr><td colSpan="8" className="destination-record-empty">ریکاردی پیدا نشد</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} setPage={setPage} totalItems={destinationTravels.length} pageSize={pageSize} setPageSize={setPageSize} />
      </div>

      {showModal && <div className="travel-modal-backdrop"><div className="travel-modal" onClick={(event) => event.stopPropagation()}>
        <div className="travel-modal-header"><div><h3>{editTravelIndex !== null ? "ویرایش سفر" : `ثبت سفر برای ${destinationName}`}</h3><p>معلومات سفر را وارد کنید</p></div><button className="travel-close-btn" onClick={() => { setShowModal(false); resetForm(); }}>×</button></div>
        <form onSubmit={saveTravel}><div className="travel-form-grid">
          <div className="form-group"><label>نام سفر</label><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div className="form-group"><label>تاریخ</label><AfghanDateInput value={form.date} onChange={(date) => setForm({ ...form, date })} /></div>
          <div className="form-group"><label>راننده</label><select value={form.driver} onChange={(event) => setForm({ ...form, driver: event.target.value })}><option value="">انتخاب راننده</option>{availableDrivers.map((driver, index) => <option key={driver.id || index} value={`${driver.firstName} ${driver.lastName}`.trim()}>{driver.firstName} {driver.lastName}</option>)}</select></div>
          <div className="form-group"><label>موتر</label><select value={form.car} onChange={(event) => setForm({ ...form, car: event.target.value })}><option value="">انتخاب موتر</option>{cars.map((car) => <option key={car.id} value={car.plate}>{car.plate} - {car.type}</option>)}</select></div>
          <div className="form-group"><label>مبدأ</label><input value={form.from} onChange={(event) => setForm({ ...form, from: event.target.value })} /></div>
          <div className="form-group"><label>مقصد</label><input value={form.to} readOnly /></div>
          <div className="form-group"><label>کیلومتر</label><input type="number" min="0" value={form.kilometers} onChange={(event) => setForm({ ...form, kilometers: event.target.value })} /></div>
          <div className="form-group"><label>کرایه</label><input type="number" min="0" value={form.fare} onChange={(event) => setForm({ ...form, fare: event.target.value })} /></div>
          <div className="form-group"><label>وضعیت</label><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="در انتظار">در انتظار</option><option value="در جریان">در حال سفر</option></select></div>
          <div className="form-group form-full"><label>توضیحات</label><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></div>
        </div><div className="travel-modal-actions"><button type="button" className="travel-cancel-btn" onClick={() => { setShowModal(false); resetForm(); }}>لغو</button><button type="submit" className="travel-save-btn">{editTravelIndex !== null ? "ذخیره تغییرات" : "ثبت سفر"}</button></div></form>
      </div></div>}

      {finishTravelIndex !== null && <div className="travel-modal-backdrop"><div className="travel-modal destination-finish-modal" onClick={(event) => event.stopPropagation()}>
        <div className="travel-modal-header"><div><h3>اتمام سفر</h3><p>تاریخ و ساعت اتمام سفر را بررسی و ثبت کنید</p></div><button className="travel-close-btn" onClick={() => setFinishTravelIndex(null)}>×</button></div>
        <form onSubmit={finishTravel}>
          <div className="travel-form-grid">
            <div className="form-group form-full"><label>تاریخ و ساعت اتمام</label><input type="datetime-local" value={finishDateTime} onChange={(event) => setFinishDateTime(event.target.value)} /></div>
          </div>
          <div className="travel-modal-actions"><button type="button" className="travel-cancel-btn" onClick={() => setFinishTravelIndex(null)}>لغو</button><button type="submit" className="travel-save-btn">ثبت اتمام سفر</button></div>
        </form>
      </div></div>}
    </div>
  );
}

export default DestinationDetails;
