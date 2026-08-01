import { useMemo, useState } from "react";
import { ArrowRight, Calculator, KeyRound, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { createRecordId } from "../utils/ids";
import { notify } from "../utils/notify";
import { formatDateTime, todayDateValue } from "../utils/afghanDate";
import { calculateMonthlyIncomeCommission, employeeBalance } from "../utils/employeeFinance";
import "./Accounts.css";
import "./EmployeeDetails.css";

const emptyAccountForm = {
  email: "",
  password: "",
  confirmPassword: "",
};

function EmployeeDetails({ accounts, setAccounts }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employees] = useJsonCollection("drivers");
  const [transactions] = useJsonCollection("transactions");
  const [employeeEarnings, setEmployeeEarnings] = useJsonCollection("employeeEarnings");
  const [employeePayments, setEmployeePayments] = useJsonCollection("employeePayments");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [paymentAmount, setPaymentAmount] = useState("");

  const employee = useMemo(() => {
    const byId = employees.find((item) => String(item.id) === String(id));
    return byId || employees[Number(id)];
  }, [employees, id]);
  const employeeKey = employee?.id ?? id;

  const employeeAccount = employee
    ? accounts.find((account) => String(account.employeeId) === String(employeeKey))
    : null;
  const balance = employee ? employeeBalance(employeeKey, employeeEarnings, employeePayments) : { earned: 0, paid: 0, balance: 0 };
  const currentMonth = todayDateValue().slice(0, 7);

  const openAccountModal = () => {
    setAccountForm({
      email: employeeAccount?.email || "",
      password: "",
      confirmPassword: "",
    });
    setShowAccountModal(true);
  };

  const closeAccountModal = () => {
    setShowAccountModal(false);
    setAccountForm(emptyAccountForm);
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    const email = accountForm.email.trim().toLowerCase();

    if (!email) return notify("لطفاً ایمیل کارمند را وارد کنید.", "error");
    if (!employeeAccount && !accountForm.password) return notify("لطفاً رمز عبور را وارد کنید.", "error");
    if (accountForm.password && accountForm.password.length < 4) {
      return notify("رمز عبور باید حداقل چهار حرف باشد.", "error");
    }
    if (accountForm.password !== accountForm.confirmPassword) {
      return notify("رمز عبور و تکرار آن یکسان نیست.", "error");
    }
    if (accounts.some((account) =>
      account.id !== employeeAccount?.id &&
      String(account.email || "").toLowerCase() === email
    )) {
      return notify("این ایمیل قبلاً برای یک اکانت استفاده شده است.", "error");
    }

    const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
    const nextAccounts = employeeAccount
      ? accounts.map((account) => account.id === employeeAccount.id
        ? {
            ...account,
            fullName,
            email,
            role: employee.jobType || "کارمند",
            ...(accountForm.password ? { password: accountForm.password } : {}),
          }
        : account)
      : [
          ...accounts,
          {
            id: createRecordId(),
            employeeId: employeeKey,
            fullName,
            email,
            password: accountForm.password,
            role: employee.jobType || "کارمند",
            createdAt: new Date().toISOString(),
          },
        ];

    const saved = await setAccounts(nextAccounts);
    if (!saved) return;
    notify(employeeAccount ? "اکانت کارمند ویرایش شد." : "اکانت کارمند ساخته شد.");
    closeAccountModal();
  };

  const openCalculation = async () => {
    if (employee?.salaryType === "فیصدی" && employee.percentageBasis === "monthly_income") {
      const amount = calculateMonthlyIncomeCommission(employee, currentMonth, transactions);
      const exists = employeeEarnings.some((item) =>
        String(item.employeeId) === String(employeeKey) &&
        item.source === "monthly-income-commission" &&
        item.month === currentMonth
      );
      if (amount > 0 && !exists) {
        await setEmployeeEarnings([
          ...employeeEarnings,
          {
            id: createRecordId(),
            employeeId: employeeKey,
            employeeName: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
            amount,
            date: todayDateValue(),
            month: currentMonth,
            createdAt: new Date().toISOString(),
            source: "monthly-income-commission",
            title: `فیصدی عواید ماهانه ${currentMonth}`,
            description: "محاسبه به اساس عواید ماهانه",
          },
        ]);
      }
    }
    setShowCalcModal(true);
  };

  const payEmployee = async (event) => {
    event.preventDefault();
    const amount = Number(paymentAmount || 0);
    const currentBalance = employeeBalance(employeeKey, employeeEarnings, employeePayments).balance;
    if (amount <= 0 || amount > currentBalance) return notify("مقدار پرداخت باید بیشتر از صفر و کمتر یا مساوی بیلانس باشد.", "error");
    await setEmployeePayments([
      ...employeePayments,
      {
        id: createRecordId(),
        employeeId: employeeKey,
        employeeName: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
        amount,
        date: todayDateValue(),
        createdAt: new Date().toISOString(),
        description: "پرداخت از بیلانس کارمند",
      },
    ]);
    setPaymentAmount("");
    notify("پرداخت کارمند ثبت شد.");
  };

  if (!employee) {
    return (
      <div className="employee-details-page">
        <div className="employee-not-found">
          <h2>کارمند پیدا نشد</h2>
          <button onClick={() => navigate("/employees")}>برگشت به کارمندان</button>
        </div>
      </div>
    );
  }

  const salary = employee.salaryType === "ثابت"
    ? `${employee.fixedSalary || 0} افغانی`
    : employee.salaryType === "فیصدی"
      ? `${employee.percentage || 0}%`
      : "-";

  return (
    <div className="employee-details-page">
      <div className="employee-details-header">
        <div>
          <button className="employee-back-btn" onClick={() => navigate("/employees")}>
            <ArrowRight size={17} /> برگشت به کارمندان
          </button>
          <h1>{employee.firstName} {employee.lastName}</h1>
          <p>جزئیات کارمند و مدیریت اکانت ورود به سیستم</p>
        </div>
        <div className="employee-detail-actions">
          <button className="employee-account-btn" onClick={openCalculation}>
            <Calculator size={17} /> محاسبه
          </button>
          <button className="employee-account-btn" onClick={openAccountModal}>
            {employeeAccount ? <Pencil size={17} /> : <KeyRound size={17} />}
            {employeeAccount ? "ویرایش اکانت" : "ساخت اکانت"}
          </button>
        </div>
      </div>

      <div className="employee-detail-grid">
        <section className="employee-profile-card">
          <div className="employee-profile-avatar">
            {employee.photo ? <img src={employee.photo} alt={`عکس ${employee.firstName}`} /> : (employee.firstName || "ک").slice(0, 1)}
          </div>
          <div>
            <span className={employee.status === "فعال" ? "employee-status active" : "employee-status inactive"}>
              {employee.status || "نامعلوم"}
            </span>
            <h2>{employee.firstName} {employee.lastName}</h2>
            <p>{employee.jobType || (employee.licenseNo ? "دریور" : "وظیفه تعیین نشده")}</p>
          </div>
        </section>

        <section className="employee-info-card">
          <h3>معلومات کارمند</h3>
          <div className="employee-info-list">
            <div><span>شماره تماس</span><strong>{employee.phone || "-"}</strong></div>
            <div><span>آدرس</span><strong>{employee.address || "-"}</strong></div>
            <div><span>وظیفه</span><strong>{employee.jobType || (employee.licenseNo ? "دریور" : "-")}</strong></div>
            <div><span>نوع معاش</span><strong>{employee.salaryType || "-"}</strong></div>
            <div><span>معاش / فیصدی</span><strong>{salary}</strong></div>
            <div><span>بیلانس فعلی</span><strong>{balance.balance.toLocaleString("en-US")} افغانی</strong></div>
            <div><span>توضیحات</span><strong>{employee.note || "-"}</strong></div>
          </div>
        </section>

        <section className="employee-account-card">
          <div>
            <h3>اکانت ورود به سیستم</h3>
            <p>این اکانت مستقیماً به همین کارمند وصل می‌شود.</p>
          </div>
          {employeeAccount ? (
            <div className="employee-account-summary">
              <span>ایمیل ورود</span>
              <strong>{employeeAccount.email}</strong>
              <small>وظیفه اکانت: {employeeAccount.role || employee.jobType || "کارمند"}</small>
            </div>
          ) : (
            <div className="employee-account-empty">
              هنوز برای این کارمند اکانت ساخته نشده است.
            </div>
          )}
        </section>
      </div>

      {showAccountModal && (
        <div className="account-modal-backdrop">
          <div className="account-modal employee-account-modal" onClick={(event) => event.stopPropagation()}>
            <div className="account-modal-header">
              <div>
                <h3>{employeeAccount ? "ویرایش اکانت کارمند" : "ساخت اکانت کارمند"}</h3>
                <p>{employee.firstName} {employee.lastName} پس از ذخیره می‌تواند با این ایمیل و رمز وارد سیستم شود.</p>
              </div>
              <button onClick={closeAccountModal}>×</button>
            </div>
            <form onSubmit={saveAccount} noValidate>
              <label>
                ایمیل
                <input type="email" value={accountForm.email} onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })} placeholder="name@example.com" />
              </label>
              <label>
                {employeeAccount ? "رمز جدید (اختیاری)" : "رمز عبور"}
                <input type="password" value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} />
              </label>
              <label>
                تکرار رمز عبور
                <input type="password" value={accountForm.confirmPassword} onChange={(event) => setAccountForm({ ...accountForm, confirmPassword: event.target.value })} />
              </label>
              <div>
                <button type="button" onClick={closeAccountModal}>لغو</button>
                <button type="submit">ذخیره اکانت</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCalcModal && (
        <div className="account-modal-backdrop">
          <div className="account-modal employee-account-modal" onClick={(event) => event.stopPropagation()}>
            <div className="account-modal-header">
              <div>
                <h3>محاسبه بیلانس کارمند</h3>
                <p>بیلانس فعلی: {employeeBalance(employeeKey, employeeEarnings, employeePayments).balance.toLocaleString("en-US")} افغانی</p>
              </div>
              <button onClick={() => setShowCalcModal(false)}>×</button>
            </div>
            <div className="employee-ledger-list">
              {employeeEarnings.filter((item) => String(item.employeeId) === String(employeeKey)).map((item) => (
                <div key={item.id}><span>{item.title || item.source}</span><strong>{Number(item.amount || 0).toLocaleString("en-US")}</strong><small>{formatDateTime(item.date, item.createdAt || item.updatedAt)}</small></div>
              ))}
              {employeeEarnings.filter((item) => String(item.employeeId) === String(employeeKey)).length === 0 && <p>هنوز عایدی برای این کارمند ثبت نشده است.</p>}
            </div>
            <form onSubmit={payEmployee}>
              <label>
                مقدار پرداخت
                <input type="number" dir="ltr" min="1" max={employeeBalance(employeeKey, employeeEarnings, employeePayments).balance} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
              </label>
              <div>
                <button type="button" onClick={() => setShowCalcModal(false)}>لغو</button>
                <button type="submit">پرداخت</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeDetails;
