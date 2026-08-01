import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { notify } from "../utils/notify";
import TablePagination from "../components/TablePagination";
import { useTablePagination } from "../hooks/useTablePagination";
import AfghanDateInput from "../components/AfghanDateInput";
import { formatDateTime, todayDateValue } from "../utils/afghanDate";
import { calculateTravelCommission, findEmployeeByName } from "../utils/employeeFinance";
import "./RecordDetails.css";
import { getSeatAssignments, getSeatCount } from "../utils/seatManagement";

const today = todayDateValue;
const money = (value) => Number(value || 0).toLocaleString("en-US");

function TravelDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const travelIndex = Number(id);
  const [travels, setTravels] = useJsonCollection("travels");
  const [customers] = useJsonCollection("customers");
  const [customerTravels] = useJsonCollection("customerTravels");
  const [travelExpenses, setTravelExpenses] = useJsonCollection("travelExpenses");
  const [repairs, setRepairs] = useJsonCollection("carRepairs");
  const [transactions, setTransactions] = useJsonCollection("transactions");
  const [cars, setCars] = useJsonCollection("cars");
  const [employees] = useJsonCollection("drivers");
  const [employeeEarnings, setEmployeeEarnings] = useJsonCollection("employeeEarnings");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishDateTime, setFinishDateTime] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseType, setExpenseType] = useState("all");
  const [expenseForm, setExpenseForm] = useState({
    date: today(),
    category: "fuel",
    title: "",
    amount: "",
    paidBy: "",
    repairerAddress: "",
    description: "",
  });

  const travel = travels[travelIndex];
  const openFinishModal = () => {
    const now = new Date();
    setFinishDateTime(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setShowFinishModal(true);
  };

  const travelCustomerRecords = customerTravels.filter(
    (record) => Number(record.travelIndex) === travelIndex
  );
  const allCustomerRows = travelCustomerRecords.map((record) => {
      const customer = customers[Number(record.customerIndex)] || {};
      const fare = Number(record.fare || 0);
      const discount = Number(record.discount || 0);
      const paid = Number(record.paidAmount || 0);
      return {
        ...record,
        customerName: `${customer.firstName || "مشتری"} ${customer.lastName || ""}`.trim(),
        phone: customer.phone || "-",
        tazkiraNo: customer.tazkiraNo || "-",
        fare,
        discount,
        paid,
        remaining: Math.max(fare - discount - paid, 0),
      };
    });
  const customerRows = allCustomerRows
    .filter((record) =>
      record.customerName.includes(customerSearch) ||
      record.phone.includes(customerSearch) ||
      record.tazkiraNo.includes(customerSearch)
    );
  const expenses = travelExpenses
    .filter((expense) => Number(expense.travelIndex) === travelIndex)
    .filter((expense) => expenseType === "all" || expense.category === expenseType)
    .filter((expense) =>
      (expense.title || "").includes(expenseSearch) ||
      (expense.description || "").includes(expenseSearch) ||
      (expense.paidBy || "").includes(expenseSearch) ||
      (expense.date || "").includes(expenseSearch)
    )
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const totalExpenses = travelExpenses
    .filter((expense) => Number(expense.travelIndex) === travelIndex)
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const totalPaid = allCustomerRows.reduce((sum, record) => sum + record.paid, 0);
  const totalRemaining = allCustomerRows.reduce((sum, record) => sum + record.remaining, 0);
  const travelCar = travel ? cars.find((item) => item.plate === travel.car) : null;
  const travelSeatCount = getSeatCount(travelCar);
  const travelSeatAssignments = getSeatAssignments(travelCar, allCustomerRows);
  const customerPagination = useTablePagination(customerRows, customerSearch);
  const expensePagination = useTablePagination(expenses, `${expenseSearch}-${expenseType}`);

  if (!travel) {
    return (
      <div className="record-details-page">
        <div className="record-card record-empty">
          <h3>سفر پیدا نشد</h3>
          <button className="record-btn" onClick={() => navigate("/travels")}>برگشت</button>
        </div>
      </div>
    );
  }

  const saveExpense = (event) => {
    event.preventDefault();
    const amount = Number(expenseForm.amount || 0);
    const expenseId = Date.now();
    const expense = {
      id: expenseId,
      travelIndex,
      travelName: travel.name,
      carPlate: travel.car,
      ...expenseForm,
      amount,
      createdAt: new Date().toISOString(),
    };

    setTravelExpenses([...travelExpenses, expense]);
    setTransactions([
      ...transactions,
      {
        id: expenseId + 1,
        type: "expense",
        title: `مصرف سفر ${travel.name}: ${expenseForm.title}`,
        amount,
        date: expenseForm.date,
        description: expenseForm.description,
        source: "travel-expense",
        referenceId: expenseId,
        travelIndex,
        createdAt: new Date().toISOString(),
      },
    ]);

    if (expenseForm.category === "repair") {
      const car = cars.find((item) => item.plate === travel.car);
      setRepairs([
        ...repairs,
        {
          id: expenseId,
          carId: car?.id,
          carPlate: travel.car,
          date: expenseForm.date,
          title: expenseForm.title || "ترمیم در جریان سفر",
          takenBy: expenseForm.paidBy || travel.driver,
          repairerAddress: expenseForm.repairerAddress,
          amount,
          description: expenseForm.description,
          source: "travel-expense",
          travelIndex,
          createdAt: new Date().toISOString(),
        },
      ]);
      setCars(cars.map((item) => item.plate === travel.car ? { ...item, status: "در ترمیم" } : item));
    }

    setExpenseForm({
      date: today(),
      category: "fuel",
      title: "",
      amount: "",
      paidBy: "",
      repairerAddress: "",
      description: "",
    });
    setShowExpenseModal(false);
    notify("مصرف سفر ثبت شد.");
  };

  const finishTravel = (event) => {
    event.preventDefault();
    setTravels(travels.map((item, index) => index === travelIndex
      ? { ...item, status: "تکمیل شده", completedAt: finishDateTime }
      : item
    ));
    setCars(cars.map((item) => item.plate === travel.car ? { ...item, status: "فعال" } : item));
    const employee = findEmployeeByName(employees, travel.driver);
    const commission = calculateTravelCommission(employee, travelIndex, travels, customerTravels);
    if (employee && commission > 0 && !employeeEarnings.some((item) => item.source === "travel-commission" && Number(item.referenceId) === Number(travelIndex))) {
      setEmployeeEarnings([
        ...employeeEarnings,
        {
          id: Date.now(),
          employeeId: employee.id,
          employeeName: travel.driver,
          amount: commission,
          date: String(finishDateTime).slice(0, 10),
          source: "travel-commission",
          referenceId: travelIndex,
          title: `فیصدی سفر ${travel.name || ""}`,
          description: employee.percentageBasis === "per_customer" ? "محاسبه به اساس فی مشتری" : "محاسبه به اساس فی سفر",
        },
      ]);
    }
    setShowFinishModal(false);
    notify("سفر اتمام شد.");
  };

  const categoryLabel = (category) => ({
    fuel: "تیل",
    repair: "ترمیم موتر",
    other: "سایر",
  }[category] || category);

  return (
    <div className="record-details-page">
      <div className="record-header">
        <div>
          <h1>جزئیات سفر</h1>
          <p>{travel.name} | {travel.from} - {travel.to}</p>
        </div>
        <div className="record-actions">
          {travel.status !== "تکمیل شده" && (
            <button className="record-btn" onClick={openFinishModal}>
              اتمام سفر
            </button>
          )}
          <button className="record-btn expense-action" onClick={() => setShowExpenseModal(true)}>
            + ثبت مصرف سفر
          </button>
          <button className="record-btn" onClick={() => navigate("/travels")}>برگشت به سفرها</button>
        </div>
      </div>

      <div className="record-stats travel-detail-stats">
        <div className="record-stat"><span>کرایه این سفر</span><strong>{money(travel.fare)}</strong><p>افغانی برای هر مشتری</p></div>
        <div className="record-stat"><span>تعداد مشتری‌ها</span><strong>{travelCustomerRecords.length}</strong><p>مشتری‌های ثبت‌شده</p></div>
        <div className="record-stat income"><span>پرداخت مشتری‌ها</span><strong>{money(totalPaid)}</strong><p>افغانی دریافت‌شده</p></div>
        <div className="record-stat expense"><span>باقی‌مانده مشتری‌ها</span><strong>{money(totalRemaining)}</strong><p>افغانی طلب</p></div>
        <div className="record-stat expense"><span>مصارف سفر</span><strong>{money(totalExpenses)}</strong><p>افغانی مصرف‌شده</p></div>
        <div className="record-stat"><span>مصرف تیل فی کیلومتر</span><strong>{travel.fuelPerKm || 0}</strong><p>برای هر کیلومتر</p></div>
      </div>

      <div className="record-card">
        <div className="record-card-header">
          <div>
            <h3>مدیریت چوکی‌های موتر</h3>
            <p>
              {travelCar
                ? `موتر ${travel.car} دارای ${travelSeatCount} چوکی است و وضعیت رزرف آن در زیر دیده می‌شود.`
                : "برای این سفر موتر ثبت نشده است."}
            </p>
          </div>
        </div>
        <div className="seat-management-grid">
          {travelSeatAssignments.map(({ seatNo, record }) => (
            <div key={seatNo} className={`seat-card ${record ? "occupied" : "free"}`}>
              <strong>چوکی {seatNo}</strong>
              {record ? (
                <>
                  <span>{record.customerName}</span>
                  <small>{formatDateTime(record.date, record.createdAt || record.updatedAt)}</small>
                </>
              ) : (
                <span>خالی</span>
              )}
            </div>
          ))}
          {!travelCar && <div className="seat-management-empty">برای نمایش چوکی‌ها، ابتدا برای این سفر موتر را ثبت کنید.</div>}
          {travelCar && travelSeatCount === 0 && <div className="seat-management-empty">برای این موتر هنوز مقدار چوکی ثبت نشده است.</div>}
        </div>
      </div>

      <div className="record-card">
        <div className="record-card-header">
          <div><h3>مشتری‌های این سفر</h3><p>معلومات، پرداخت و باقی‌مانده هر مشتری</p></div>
          <div className="record-filters"><input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="جستجوی مشتری..." /></div>
        </div>
        <div className="record-table-wrap">
          <table>
            <thead><tr><th>نام مشتری</th><th>شماره تماس</th><th>نمبر تذکره</th><th>کرایه</th><th>تخفیف</th><th>پرداخت</th><th>باقی‌مانده</th><th>توضیحات</th></tr></thead>
            <tbody>
              {customerPagination.pageItems.map((record) => (
                <tr key={record.id}>
                  <td>{record.customerName}</td><td>{record.phone}</td><td>{record.tazkiraNo}</td>
                  <td>{money(record.fare)}</td><td>{money(record.discount)}</td>
                  <td className={record.paid > 0 ? "record-income" : ""}>{money(record.paid)}</td>
                  <td className={record.remaining > 0 ? "record-expense" : ""}>{money(record.remaining)}</td>
                  <td>{record.note || "-"}</td>
                </tr>
              ))}
              {customerRows.length === 0 && <tr><td colSpan="8" className="record-empty">مشتری‌ای برای این سفر پیدا نشد</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePagination page={customerPagination.page} totalPages={customerPagination.totalPages} setPage={customerPagination.setPage} totalItems={customerRows.length} pageSize={customerPagination.pageSize} setPageSize={customerPagination.setPageSize} />
      </div>

      <div className="record-card">
        <div className="record-card-header">
          <div><h3>مصارف سفر</h3><p>تیل، ترمیم و سایر مصارف سفر</p></div>
          <div className="record-filters">
            <input value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)} placeholder="جستجوی مصرف..." />
            <select value={expenseType} onChange={(e) => setExpenseType(e.target.value)}>
              <option value="all">همه مصارف</option><option value="fuel">تیل</option><option value="repair">ترمیم موتر</option><option value="other">سایر</option>
            </select>
          </div>
        </div>
        <div className="record-table-wrap">
          <table>
            <thead><tr><th>تاریخ</th><th>حالت</th><th>عنوان</th><th>پرداخت‌کننده</th><th>مقدار</th><th>توضیحات</th></tr></thead>
            <tbody>
              {expensePagination.pageItems.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDateTime(expense.date, expense.createdAt || expense.updatedAt)}</td><td><span className={`record-type ${expense.category === "repair" ? "repair" : "expense"}`}>{categoryLabel(expense.category)}</span></td>
                  <td>{expense.title}</td><td>{expense.paidBy || "-"}</td><td className="record-expense">{money(expense.amount)}</td><td>{expense.description || "-"}</td>
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan="6" className="record-empty">مصرفی برای این سفر ثبت نشده است</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePagination page={expensePagination.page} totalPages={expensePagination.totalPages} setPage={expensePagination.setPage} totalItems={expenses.length} pageSize={expensePagination.pageSize} setPageSize={expensePagination.setPageSize} />
      </div>

      {showExpenseModal && (
        <div className="record-modal-backdrop">
          <div className="record-modal" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-header"><div><h3>ثبت مصرف سفر</h3><p>مصرف سفر در عواید و مصارف نیز ثبت می‌شود</p></div><button onClick={() => setShowExpenseModal(false)}>×</button></div>
            <form onSubmit={saveExpense}>
              <div className="record-form-grid">
                <div className="record-form-group"><label>تاریخ</label><AfghanDateInput value={expenseForm.date} onChange={(date) => setExpenseForm({ ...expenseForm, date })} /></div>
                <div className="record-form-group"><label>حالت مصرف</label><select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}><option value="fuel">تیل موتر</option><option value="repair">ترمیم موتر</option><option value="other">سایر</option></select></div>
                <div className="record-form-group"><label>عنوان</label><input value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} /></div>
                <div className="record-form-group"><label>مقدار مصرف</label><input type="number" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
                <div className="record-form-group"><label>کی پرداخت کرده</label><select value={expenseForm.paidBy} onChange={(e) => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}><option value="">انتخاب کارمند</option>{employees.map((employee, index) => { const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || employee.phone || `کارمند ${index + 1}`; return <option key={employee.id || index} value={fullName}>{fullName} - {employee.jobType || "کارمند"}</option>; })}</select></div>
                {expenseForm.category === "repair" && <div className="record-form-group"><label>آدرس ترمیم‌کار</label><input value={expenseForm.repairerAddress} onChange={(e) => setExpenseForm({ ...expenseForm, repairerAddress: e.target.value })} /></div>}
                <div className="record-form-group record-form-full"><label>توضیحات</label><textarea value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} /></div>
              </div>
              <div className="record-modal-actions"><button type="button" className="record-cancel" onClick={() => setShowExpenseModal(false)}>لغو</button><button type="submit" className="record-save">ثبت مصرف</button></div>
            </form>
          </div>
        </div>
      )}

      {showFinishModal && (
        <div className="record-modal-backdrop">
          <div className="record-modal" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-header"><div><h3>اتمام سفر</h3><p>تاریخ و ساعت اتمام را بررسی و ثبت کنید</p></div><button onClick={() => setShowFinishModal(false)}>×</button></div>
            <form onSubmit={finishTravel}>
              <div className="record-form-grid">
                <div className="record-form-group record-form-full"><label>تاریخ و ساعت اتمام</label><input type="datetime-local" value={finishDateTime} onChange={(event) => setFinishDateTime(event.target.value)} /></div>
              </div>
              <div className="record-modal-actions"><button type="button" className="record-cancel" onClick={() => setShowFinishModal(false)}>لغو</button><button type="submit" className="record-save">ثبت اتمام سفر</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TravelDetails;
