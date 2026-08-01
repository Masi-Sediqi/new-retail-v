import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { createRecordId } from "../utils/ids";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import { todayDateValue } from "../utils/afghanDate";
import "./Drivers.css";

const defaultEmployeeTypes = ["دریور", "مدیر"];

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  jobType: "",
  salaryType: "",
  fixedSalary: "",
  percentage: "",
  percentageBasis: "per_customer",
  status: "فعال",
  photo: "",
  note: "",
};

function Drivers() {
  const navigate = useNavigate();
  const [employees, setEmployees, , employeesLoaded] = useJsonCollection("drivers");
  const [employeeTypes, setEmployeeTypes, , employeeTypesLoaded] = useJsonCollection("employeeTypes");
  const [showModal, setShowModal] = useState(false);
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editIndex, setEditIndex] = useState(null);
  const [openAction, setOpenAction] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [employeePayrolls, setEmployeePayrolls] = useJsonCollection("employeePayrolls");
  const [employeeEarnings, setEmployeeEarnings] = useJsonCollection("employeeEarnings");
  const [payrollMonth, setPayrollMonth] = useState(todayDateValue().slice(0, 7));
  const [newType, setNewType] = useState("");
  const [editTypeId, setEditTypeId] = useState(null);

  useEffect(() => {
    if (!employeeTypesLoaded || !employeesLoaded || employeeTypes.length > 0) return;
    setEmployeeTypes(defaultEmployeeTypes.map((name, index) => ({
      id: createRecordId() + index,
      name,
    })));
    if (employees.some((employee) => !employee.jobType && employee.licenseNo)) {
      setEmployees(employees.map((employee) =>
        !employee.jobType && employee.licenseNo ? { ...employee, jobType: "دریور" } : employee
      ));
    }
  }, [employeeTypes, employeeTypesLoaded, employees, employeesLoaded, setEmployeeTypes, setEmployees]);

  const typeNames = employeeTypes.map((item) => item.name).filter(Boolean);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "salaryType" && value === "ثابت" ? { percentage: "", percentageBasis: "per_customer" } : {}),
      ...(name === "salaryType" && value === "فیصدی" ? { fixedSalary: "", percentageBasis: current.percentageBasis || "per_customer" } : {}),
    }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditIndex(null);
  };

  const saveEmployeeType = async () => {
    const name = newType.trim();
    if (!name) return notify("نام وظیفه را وارد کنید.", "error");
    if (employeeTypes.some((item) => item.id !== editTypeId && item.name.toLowerCase() === name.toLowerCase())) {
      return notify("این وظیفه قبلاً موجود است.", "error");
    }

    const oldType = employeeTypes.find((item) => item.id === editTypeId);
    const nextTypes = editTypeId
      ? employeeTypes.map((item) => item.id === editTypeId ? { ...item, name } : item)
      : [...employeeTypes, { id: createRecordId(), name }];
    const saved = await setEmployeeTypes(nextTypes);
    if (!saved) return;
    if (oldType && oldType.name !== name) {
      await setEmployees(employees.map((employee) =>
        employee.jobType === oldType.name ? { ...employee, jobType: name } : employee
      ));
    }
    setNewType("");
    setEditTypeId(null);
    notify(editTypeId ? "نوع کارمند ویرایش شد." : "نوع کارمند اضافه شد.");
  };

  const removeEmployeeType = async (type) => {
    const assignedCount = employees.filter((employee) => employee.jobType === type.name).length;
    const message = assignedCount > 0
      ? `وظیفه «${type.name}» به ${assignedCount} کارمند اختصاص دارد. با حذف آن، وظیفه این کارمندان خالی می‌شود. ادامه می‌دهید؟`
      : `وظیفه «${type.name}» حذف شود؟`;
    const ok = await confirmAction({
      title: "Delete Employee Type",
      message,
      confirmText: "Delete",
    });
    if (!ok) return;
    const saved = await setEmployeeTypes(employeeTypes.filter((item) => item.id !== type.id));
    if (!saved) return;
    if (assignedCount > 0) {
      await setEmployees(employees.map((employee) =>
        employee.jobType === type.name ? { ...employee, jobType: "" } : employee
      ));
    }
    if (editTypeId === type.id) {
      setEditTypeId(null);
      setNewType("");
    }
    notify("نوع کارمند حذف شد.");
  };

  const editEmployeeType = (type) => {
    setEditTypeId(type.id);
    setNewType(type.name);
  };

  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      notify("حجم عکس کارمند باید کمتر از ۲ میگابایت باشد.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFormData((current) => ({ ...current, photo: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.jobType) return notify("لطفاً وظیفه کارمند را انتخاب کنید.", "error");

    const normalized = {
      ...formData,
      id: editIndex !== null ? (employees[editIndex].id || createRecordId()) : createRecordId(),
    };
    delete normalized.licenseNo;

    const nextEmployees = editIndex !== null
      ? employees.map((employee, index) => index === editIndex ? normalized : employee)
      : [...employees, normalized];
    const saved = await setEmployees(nextEmployees);
    if (!saved) return;

    notify(editIndex !== null ? "معلومات کارمند ویرایش شد." : "کارمند جدید ثبت شد.");
    resetForm();
    setShowModal(false);
  };

  const editEmployee = (index) => {
    const employee = employees[index];
    setEditIndex(index);
    setFormData({
      ...emptyForm,
      ...employee,
      jobType: employee.jobType || (employee.licenseNo ? "دریور" : ""),
    });
    setShowModal(true);
    setOpenAction(null);
  };

  const deleteEmployee = async (index) => {
    const ok = await confirmAction({
      title: "Delete Employee",
      message: "Are you sure this employee should be deleted?",
      confirmText: "Delete",
    });
    if (!ok) return;
    const saved = await setEmployees(employees.filter((_, itemIndex) => itemIndex !== index));
    if (!saved) return;
    setOpenAction(null);
    notify("کارمند حذف شد.");
  };

  const generatePayroll = async () => {
    const fixedEmployees = employees.filter((employee) => employee.salaryType === "ثابت" && Number(employee.fixedSalary || 0) > 0);
    const nextPayrolls = [...employeePayrolls];
    const nextEarnings = [...employeeEarnings];
    fixedEmployees.forEach((employee) => {
      const exists = nextPayrolls.some((item) => String(item.employeeId) === String(employee.id) && item.month === payrollMonth);
      if (exists) return;
      const payrollId = createRecordId();
      const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
      const amount = Number(employee.fixedSalary || 0);
      nextPayrolls.push({
        id: payrollId,
        employeeId: employee.id,
        employeeName: fullName,
        month: payrollMonth,
        amount,
        date: todayDateValue(),
      });
      nextEarnings.push({
        id: payrollId + 1,
        employeeId: employee.id,
        employeeName: fullName,
        amount,
        date: todayDateValue(),
        source: "fixed-payroll",
        referenceId: payrollId,
        title: `معاش ثابت ${payrollMonth}`,
        description: "Generate Payroll",
      });
    });
    await setEmployeePayrolls(nextPayrolls);
    await setEmployeeEarnings(nextEarnings);
    notify("معاشات ثابت ساخته شد.");
    setShowPayrollModal(false);
  };

  const filteredEmployees = employees
    .map((employee, originalIndex) => ({
      ...employee,
      originalIndex,
      jobType: employee.jobType || (employee.licenseNo ? "دریور" : ""),
    }))
    .filter((employee) =>
      (employee.firstName || "").includes(search) ||
      (employee.lastName || "").includes(search) ||
      (employee.phone || "").includes(search) ||
      (employee.jobType || "").includes(search)
    )
    .filter((employee) => typeFilter === "all" || employee.jobType === typeFilter);
  const pagination = useTablePagination(filteredEmployees, `${search}-${typeFilter}`);
  const activeEmployees = employees.filter((employee) => employee.status === "فعال").length;
  const driverEmployees = employees.filter((employee) =>
    ["دریور", "راننده"].includes(employee.jobType) || (!employee.jobType && employee.licenseNo)
  ).length;

  return (
    <div className="drivers-page">
      <div className="drivers-header">
        <div>
          <h1>مدیریت کارمندان</h1>
          <p>ثبت، مشاهده و مدیریت تمام کارمندان سیستم حمل و نقل</p>
        </div>
        <div className="employee-header-actions">
          <button className="employee-type-btn" onClick={() => setShowPayrollModal(true)}>
            معاشات
          </button>
          <button className="employee-type-btn" onClick={() => setShowTypesModal(true)}>
            نوع کارمندان
          </button>
          <button className="driver-add-btn" onClick={() => { resetForm(); setShowModal(true); }}>
            + ثبت کارمند جدید
          </button>
        </div>
      </div>

      <div className="drivers-stats">
        <div className="driver-stat-card"><span>کل کارمندان</span><strong>{employees.length}</strong><p>تمام کارمندان ثبت‌شده</p></div>
        <div className="driver-stat-card"><span>کارمندان فعال</span><strong>{activeEmployees}</strong><p>کارمندان در حال فعالیت</p></div>
        <div className="driver-stat-card"><span>دریورها</span><strong>{driverEmployees}</strong><p>قابل انتخاب برای سفر</p></div>
        <div className="driver-stat-card"><span>انواع وظیفه</span><strong>{typeNames.length}</strong><p>وظایف قابل انتخاب</p></div>
      </div>

      <div className="employee-types-card">
        <div><h3>نوع کارمندان</h3><p>وظایف تعریف‌شده برای کارمندان</p></div>
        <div className="employee-type-chips">
          {typeNames.map((type) => <span key={type}>{type}</span>)}
        </div>
      </div>

      <div className="drivers-table-card">
        <div className="drivers-table-header">
          <div><h3>لیست کارمندان</h3><p>تمام کارمندان ثبت‌شده در سیستم</p></div>
          <div className="employee-table-filters">
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">همه نوع کارمندان</option>
              {typeNames.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input placeholder="جستجوی کارمند..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
        <div className="drivers-table-wrap">
          <table>
            <thead>
              <tr><th>نام</th><th>تخلص</th><th>شماره تماس</th><th>وظیفه</th><th>نوع معاش</th><th>معاش / فیصدی</th><th>وضعیت</th><th>عملیات</th></tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((employee) => {
                const index = employee.originalIndex;
                return (
                  <tr key={employee.id || index}>
                    <td className="driver-name">
                      <button className="driver-name-link" onClick={() => navigate(`/employees/${employee.id ?? index}`)}>{employee.firstName}</button>
                    </td>
                    <td>{employee.lastName || "-"}</td>
                    <td>{employee.phone || "-"}</td>
                    <td>{employee.jobType || "-"}</td>
                    <td>{employee.salaryType || "-"}</td>
                    <td>{employee.salaryType === "ثابت" ? `${employee.fixedSalary || 0} افغانی` : employee.salaryType === "فیصدی" ? `${employee.percentage || 0}%` : "-"}</td>
                    <td><span className={employee.status === "فعال" ? "driver-badge active" : "driver-badge inactive"}>{employee.status || "-"}</span></td>
                    <td>
                      <div className="action-dropdown">
                        <button className="action-btn" onClick={() => setOpenAction(openAction === index ? null : index)}>⋮</button>
                        {openAction === index && (
                          <div className="action-menu">
                            <button onClick={() => navigate(`/employees/${employee.id ?? index}`)}>جزئیات</button>
                            <button onClick={() => editEmployee(index)}>ویرایش</button>
                            <button className="danger-action" onClick={() => deleteEmployee(index)}>حذف</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && <tr><td colSpan="8" className="employee-empty">هیچ کارمندی ثبت نشده است</td></tr>}
            </tbody>
          </table>
        </div>
        <TablePagination page={pagination.page} totalPages={pagination.totalPages} setPage={pagination.setPage} totalItems={filteredEmployees.length} pageSize={pagination.pageSize} setPageSize={pagination.setPageSize} />
      </div>

      {showModal && (
        <div className="driver-modal-backdrop">
          <div className="driver-modal" onClick={(event) => event.stopPropagation()}>
            <div className="driver-modal-header">
              <div><h3>{editIndex !== null ? "ویرایش کارمند" : "ثبت کارمند جدید"}</h3><p>معلومات کارمند را وارد کنید</p></div>
              <button className="driver-close-btn" onClick={() => { resetForm(); setShowModal(false); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="driver-form-grid">
                <div className="form-group"><label>نام کارمند</label><input name="firstName" value={formData.firstName} onChange={handleChange} /></div>
                <div className="form-group"><label>تخلص</label><input name="lastName" value={formData.lastName} onChange={handleChange} /></div>
                <div className="form-group"><label>شماره تماس</label><input name="phone" value={formData.phone} onChange={handleChange} /></div>
                <div className="form-group"><label>آدرس</label><input name="address" value={formData.address} onChange={handleChange} /></div>
                <div className="form-group">
                  <label>وظیفه</label>
                  <select name="jobType" value={formData.jobType} onChange={handleChange}>
                    <option value="">انتخاب وظیفه</option>
                    {typeNames.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="form-group employee-photo-field">
                  <label>عکس کارمند</label>
                  <div className="employee-photo-picker">
                    <div>{formData.photo ? <img src={formData.photo} alt="عکس کارمند" /> : <span>{(formData.firstName || "ک").slice(0, 1)}</span>}</div>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectPhoto} />
                    {formData.photo && <button type="button" onClick={() => setFormData({ ...formData, photo: "" })}>حذف عکس</button>}
                  </div>
                </div>
                <div className="form-group">
                  <label>نوع معاش</label>
                  <select name="salaryType" value={formData.salaryType} onChange={handleChange}>
                    <option value="">انتخاب نوع معاش</option><option value="ثابت">ثابت</option><option value="فیصدی">فیصدی</option>
                  </select>
                </div>
                {formData.salaryType === "ثابت" && <div className="form-group"><label>مقدار معاش ثابت</label><input type="number" name="fixedSalary" value={formData.fixedSalary} onChange={handleChange} /></div>}
                {formData.salaryType === "فیصدی" && <><div className="form-group"><label>فیصدی به اساس چی؟</label><select name="percentageBasis" value={formData.percentageBasis || "per_customer"} onChange={handleChange}><option value="per_customer">به اساس فی مشتری</option><option value="per_trip">به اساس فی سفر</option><option value="monthly_income">به اساس عواید ماهانه</option></select></div><div className="form-group"><label>مقدار فیصدی</label><input type="number" name="percentage" value={formData.percentage} onChange={handleChange} /></div></>}
                <div className="form-group">
                  <label>وضعیت</label>
                  <select name="status" value={formData.status} onChange={handleChange}>
                    <option value="فعال">فعال</option><option value="غیرفعال">غیرفعال</option>
                  </select>
                </div>
                <div className="form-group form-full"><label>توضیحات</label><textarea name="note" value={formData.note} onChange={handleChange} /></div>
              </div>
              <div className="driver-modal-actions">
                <button type="button" className="driver-cancel-btn" onClick={() => { resetForm(); setShowModal(false); }}>لغو</button>
                <button type="submit" className="driver-save-btn">{editIndex !== null ? "ذخیره تغییرات" : "ثبت کارمند"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTypesModal && (
        <div className="driver-modal-backdrop">
          <div className="employee-types-modal" onClick={(event) => event.stopPropagation()}>
            <div className="driver-modal-header"><div><h3>نوع کارمندان</h3><p>وظایف کارمندان را اضافه یا حذف کنید</p></div><button className="driver-close-btn" onClick={() => setShowTypesModal(false)}>×</button></div>
            <div className="type-manager-add">
              <input value={newType} onChange={(event) => setNewType(event.target.value)} placeholder="نام نوع کارمند جدید" />
              <button onClick={saveEmployeeType}>{editTypeId ? "ذخیره تغییر" : "افزودن نوع"}</button>
              {editTypeId && <button className="type-cancel-edit" onClick={() => { setEditTypeId(null); setNewType(""); }}>لغو</button>}
            </div>
            <div className="type-manager-list">
              {employeeTypes.map((type) => (
                <div key={type.id}>
                  <strong>{type.name}</strong>
                  <span className="type-manager-actions">
                    <button className="type-edit-btn" onClick={() => editEmployeeType(type)}>ویرایش</button>
                    <button onClick={() => removeEmployeeType(type)}>حذف</button>
                  </span>
                </div>
              ))}
              {employeeTypes.length === 0 && <p className="employee-empty">هنوز نوع کارمندی ثبت نشده است.</p>}
            </div>
          </div>
        </div>
      )}

      {showPayrollModal && (
        <div className="driver-modal-backdrop">
          <div className="employee-types-modal" onClick={(event) => event.stopPropagation()}>
            <div className="driver-modal-header"><div><h3>معاشات</h3><p>Generate Payroll فقط برای کارمندانی است که معاش ثابت دارند.</p></div><button className="driver-close-btn" onClick={() => setShowPayrollModal(false)}>×</button></div>
            <div className="type-manager-add">
              <input type="month" dir="ltr" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} />
              <button onClick={generatePayroll}>Generate Payroll</button>
            </div>
            <div className="type-manager-list">
              {employees.filter((employee) => employee.salaryType === "ثابت").map((employee) => (
                <div key={employee.id}>
                  <strong>{employee.firstName} {employee.lastName}</strong>
                  <span>{Number(employee.fixedSalary || 0).toLocaleString("en-US")} افغانی</span>
                </div>
              ))}
              {employees.filter((employee) => employee.salaryType === "ثابت").length === 0 && <p className="employee-empty">کارمند با معاش ثابت موجود نیست.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Drivers;
