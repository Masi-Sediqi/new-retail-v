import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import TablePagination from "../components/TablePagination";
import { useTablePagination } from "../hooks/useTablePagination";
import AfghanDateInput from "../components/AfghanDateInput";
import { formatDateTime, todayDateValue } from "../utils/afghanDate";
import "./RecordDetails.css";

const today = todayDateValue;
const money = (value) => Number(value || 0).toLocaleString("en-US");
const expenseLabel = (category) => ({
  maintenance: "مصرف عادی موتر",
  documents: "تمدید اسناد موتر",
  "oil-change": "موبلایل تبدیلی",
  repair: "ترمیم موتر",
  other: "سایر",
}[category] || category || "مصرف موتر");

function CarDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const carId = Number(id);
  const [cars, setCars] = useJsonCollection("cars");
  const [travels] = useJsonCollection("travels");
  const [repairs, setRepairs] = useJsonCollection("carRepairs");
  const [transactions, setTransactions] = useJsonCollection("transactions");
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [search, setSearch] = useState("");
  const [recordType, setRecordType] = useState("all");
  const [repairForm, setRepairForm] = useState({
    date: today(),
    category: "maintenance",
    title: "",
    takenBy: "",
    repairerAddress: "",
    expiryDate: "",
    amount: "",
    description: "",
  });

  const car = cars.find((item) => Number(item.id) === carId);

  const carTravels = travels
    .map((travel, index) => ({ ...travel, originalIndex: index }))
    .filter((travel) => travel.car === car?.plate);
  const activeCarTravel = carTravels.find((travel) => travel.status === "در جریان");
  const carRepairs = repairs.filter(
    (repair) => Number(repair.carId) === carId || repair.carPlate === car?.plate
  );
  const totalRepairCost = carRepairs.reduce((sum, repair) => sum + Number(repair.amount || 0), 0);
  const currentCarStatus = activeCarTravel
    ? "در سفر"
    : car?.status === "غیرفعال"
        ? "توقف"
        : (car?.status || "فعال");

  const records = [
    ...carTravels.map((travel) => ({
      id: `travel-${travel.originalIndex}`,
      type: "travel",
      date: travel.date,
      timeSource: travel.createdAt || travel.updatedAt,
      title: travel.name,
      detail: `${travel.from || "-"} - ${travel.to || "-"}`,
      person: travel.driver,
      amount: Number(travel.fare || 0),
      status: travel.status,
      description: travel.note,
      travelIndex: travel.originalIndex,
    })),
    ...carRepairs.map((repair) => ({
      id: `repair-${repair.id}`,
      type: "repair",
      date: repair.date,
      timeSource: repair.createdAt || repair.updatedAt,
      title: repair.title || "مصرف موتر",
      detail: repair.repairerAddress,
      person: repair.takenBy,
      amount: Number(repair.amount || 0),
      status: expenseLabel(repair.category || repair.status),
      description: repair.description,
    })),
  ]
    .filter((record) => recordType === "all" || record.type === recordType)
    .filter((record) =>
      (record.title || "").includes(search) ||
      (record.detail || "").includes(search) ||
      (record.person || "").includes(search) ||
      (record.date || "").includes(search)
    )
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const recordsPagination = useTablePagination(records, `${search}-${recordType}`);

  if (!car) {
    return (
      <div className="record-details-page">
        <div className="record-card record-empty">
          <h3>موتر پیدا نشد</h3>
          <button className="record-btn" onClick={() => navigate("/cars")}>برگشت</button>
        </div>
      </div>
    );
  }

  const saveRepair = (event) => {
    event.preventDefault();
    const amount = Number(repairForm.amount || 0);
    const repairId = Date.now();
    const repair = {
      id: repairId,
      carId,
      carPlate: car.plate,
      ...repairForm,
      amount,
      source: "manual",
      createdAt: new Date().toISOString(),
    };
    const nextStatus = repairForm.category === "repair" ? "در ترمیم" : (car.status || "فعال");

    setRepairs([...repairs, repair]);
    setTransactions([
      ...transactions,
      {
        id: repairId + 1,
        type: "expense",
        title: `مصرف موتر ${car.plate}: ${repairForm.title}`,
        amount,
        date: repairForm.date,
        description: repairForm.description,
        source: "car-expense",
        referenceId: repairId,
        carId,
        createdAt: new Date().toISOString(),
      },
    ]);
    setCars(cars.map((item) => Number(item.id) === carId ? { ...item, status: nextStatus } : item));
    setRepairForm({
      date: today(),
      category: "maintenance",
      title: "",
      takenBy: "",
      repairerAddress: "",
      expiryDate: "",
      amount: "",
      description: "",
    });
    setShowRepairModal(false);
    notify("مصرف موتر ثبت شد.");
  };

  return (
    <div className="record-details-page">
      <div className="record-header">
        <div>
          <h1>جزئیات موتر</h1>
          <p>{car.plate} - {car.type} {car.model}</p>
        </div>
        <div className="record-actions">
          <button className="record-btn repair-action" onClick={() => setShowRepairModal(true)}>
            + ثبت مصرف برای موتر
          </button>
          <button className="record-btn" onClick={() => navigate("/cars")}>برگشت به موترها</button>
        </div>
      </div>

      <div className="record-stats">
        <div className="record-stat"><span>کل سفرها</span><strong>{carTravels.length}</strong><p>سفرهای استفاده‌شده</p></div>
        <div className="record-stat"><span>کل مصارف موتر</span><strong>{carRepairs.length}</strong><p>مصارف بیرون از سفر و ترمیم</p></div>
        <div className="record-stat expense"><span>مصرف موتر</span><strong>{money(totalRepairCost)}</strong><p>افغانی</p></div>
        <div className="record-stat"><span>وضعیت فعلی</span><strong className="record-status-text">{currentCarStatus}</strong><p>{activeCarTravel ? activeCarTravel.name : `نمبر شاسی: ${car.chassisNo || car.phone || "-"}`}</p></div>
      </div>

      <div className="record-card">
        <div className="record-card-header">
          <div><h3>تاریخچه سفرها و مصارف موتر</h3><p>تمام سفرها، ترمیم‌ها و مصارف بیرون از سفر برای این موتر</p></div>
          <div className="record-filters">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجو در تاریخچه..." />
            <select value={recordType} onChange={(event) => setRecordType(event.target.value)}>
              <option value="all">همه حالات</option>
              <option value="travel">تنها سفرها</option>
              <option value="repair">تنها مصارف موتر</option>
            </select>
          </div>
        </div>
        <div className="record-table-wrap">
          <table>
            <thead><tr><th>تاریخ</th><th>حالت</th><th>عنوان</th><th>مسیر / آدرس ترمیم‌کار</th><th>راننده / انتقال‌دهنده</th><th>مقدار</th><th>وضعیت</th><th>توضیحات</th></tr></thead>
            <tbody>
              {recordsPagination.pageItems.map((record) => (
                <tr key={record.id} onDoubleClick={() => record.travelIndex !== undefined && navigate(`/travels/${record.travelIndex}`)}>
                  <td>{formatDateTime(record.date, record.timeSource)}</td>
                  <td><span className={`record-type ${record.type}`}>{record.type === "travel" ? "سفر" : "مصرف موتر"}</span></td>
                  <td>{record.title}</td><td>{record.detail || "-"}</td><td>{record.person || "-"}</td>
                  <td className={record.type === "repair" ? "record-expense" : ""}>{money(record.amount)}</td>
                  <td>{record.status || "-"}</td><td>{record.description || "-"}</td>
                </tr>
              ))}
              {records.length === 0 && <tr><td colSpan="8" className="record-empty">ریکاردی پیدا نشد</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePagination page={recordsPagination.page} totalPages={recordsPagination.totalPages} setPage={recordsPagination.setPage} totalItems={records.length} pageSize={recordsPagination.pageSize} setPageSize={recordsPagination.setPageSize} />
      </div>

      {showRepairModal && (
        <div className="record-modal-backdrop">
          <div className="record-modal" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-header"><div><h3>ثبت مصرف برای موتر</h3><p>مصرف خود موتر بیرون از مصرف سفر را وارد کنید</p></div><button onClick={() => setShowRepairModal(false)}>×</button></div>
            <form onSubmit={saveRepair}>
              <div className="record-form-grid">
                <div className="record-form-group"><label>تاریخ مصرف</label><AfghanDateInput value={repairForm.date} onChange={(date) => setRepairForm({ ...repairForm, date })} /></div>
                <div className="record-form-group"><label>حالت مصرف</label><select value={repairForm.category} onChange={(e) => setRepairForm({ ...repairForm, category: e.target.value })}><option value="maintenance">مصرف عادی موتر</option><option value="documents">تمدید اسناد موتر</option><option value="oil-change">موبلایل تبدیلی</option><option value="repair">ترمیم موتر</option><option value="other">سایر</option></select></div>
                {repairForm.category === "documents" && <div className="record-form-group"><label>ختم تمدید موتر</label><AfghanDateInput value={repairForm.expiryDate} onChange={(expiryDate) => setRepairForm({ ...repairForm, expiryDate })} /></div>}
                <div className="record-form-group"><label>عنوان مصرف</label><input value={repairForm.title} onChange={(e) => setRepairForm({ ...repairForm, title: e.target.value })} /></div>
                <div className="record-form-group"><label>کی پرداخت/انتقال کرده</label><input value={repairForm.takenBy} onChange={(e) => setRepairForm({ ...repairForm, takenBy: e.target.value })} /></div>
                <div className="record-form-group"><label>آدرس / مرجع</label><input value={repairForm.repairerAddress} onChange={(e) => setRepairForm({ ...repairForm, repairerAddress: e.target.value })} /></div>
                <div className="record-form-group"><label>مقدار مصرف</label><input type="number" min="0" value={repairForm.amount} onChange={(e) => setRepairForm({ ...repairForm, amount: e.target.value })} /></div>
                <div className="record-form-group record-form-full"><label>توضیحات</label><textarea value={repairForm.description} onChange={(e) => setRepairForm({ ...repairForm, description: e.target.value })} /></div>
              </div>
              <div className="record-modal-actions"><button type="button" className="record-cancel" onClick={() => setShowRepairModal(false)}>لغو</button><button type="submit" className="record-save">ثبت مصرف</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CarDetails;
