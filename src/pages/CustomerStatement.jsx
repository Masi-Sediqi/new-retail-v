import { ArrowRight, Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatDateTime } from "../utils/afghanDate";
import "./CustomerReceipt.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");

function CustomerStatement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const customerIndex = Number(id);
  const [settings] = useJsonCollection("settings");
  const [customers] = useJsonCollection("customers");
  const [customerTravels] = useJsonCollection("customerTravels");
  const [customerPayments] = useJsonCollection("customerPayments");
  const company = settings[0] || {};
  const customer = customers[customerIndex];
  const travels = customerTravels.filter((record) => Number(record.customerIndex) === customerIndex);
  const payments = customerPayments.filter((record) => Number(record.customerIndex) === customerIndex);
  const totalFare = travels.reduce((sum, record) => sum + Number(record.fare || 0), 0);
  const totalDiscount = travels.reduce((sum, record) => sum + Number(record.discount || 0), 0);
  const totalPaid = travels.reduce((sum, record) => sum + Number(record.paidAmount || 0), 0) + payments.reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const debt = Math.max(totalFare - totalDiscount - totalPaid, 0);
  const activities = [
    ...travels.map((record) => ({ id: `travel-${record.id}`, date: record.date, timeSource: record.createdAt || record.updatedAt, type: "سفر", title: record.travelName, billed: Number(record.fare || 0) - Number(record.discount || 0), paid: Number(record.paidAmount || 0) })),
    ...payments.map((record) => ({ id: `payment-${record.id}`, date: record.date, timeSource: record.createdAt || record.updatedAt, type: "پرداخت", title: record.description || "پرداخت بدهی", billed: 0, paid: Number(record.amount || 0) })),
  ].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  if (!customer) return <div className="receipt-page"><div className="receipt-sheet"><h2>مشتری پیدا نشد</h2></div></div>;

  return <div className="receipt-page">
    <div className="receipt-toolbar"><button onClick={() => navigate("/reports/customers")}><ArrowRight size={16} /> برگشت</button><button className="receipt-print-btn" onClick={() => window.print()}><Printer size={16} /> چاپ صورت‌حساب</button></div>
    <article className="receipt-sheet statement-sheet">
      <header className="receipt-header">
        <div className="receipt-company"><div className="receipt-company-logo">{company.logo ? <img src={company.logo} alt="لوگو" /> : (company.companyName || "T").slice(0,1)}</div><div><h1>{company.companyName || "شرکت سیاحتی"}</h1><p>سیستم مدیریت سفر و حمل و نقل</p></div></div>
        <div className="receipt-number"><span>تاریخ صدور صورت‌حساب</span><strong>{formatDateTime(new Date().toISOString())}</strong><small>کد مشتری: {customerIndex + 1}</small></div>
      </header>
      <div className="receipt-title"><span>صورت‌حساب جامع مشتری</span><h2>{customer.firstName} {customer.lastName}</h2></div>
      <section className="receipt-section"><h3>مشخصات مشتری</h3><table className="receipt-info-table"><tbody><tr><th>نام کامل</th><td>{customer.firstName} {customer.lastName}</td><th>شماره تماس</th><td>{customer.phone || "-"}</td></tr><tr><th>نمبر تذکره</th><td>{customer.tazkiraNo || "-"}</td><th>جنسیت</th><td>{customer.gender || "-"}</td></tr><tr><th>توضیحات</th><td colSpan="3">{customer.note || "-"}</td></tr></tbody></table></section>
      <section className="receipt-section"><h3>خلاصه مالی</h3><table className="receipt-finance-table"><thead><tr><th>مجموع کرایه</th><th>تخفیف</th><th>پرداخت‌شده</th><th>باقی‌مانده</th></tr></thead><tbody><tr><td>{money(totalFare)} افغانی</td><td>{money(totalDiscount)} افغانی</td><td className="receipt-paid">{money(totalPaid)} افغانی</td><td className="receipt-remaining">{money(debt)} افغانی</td></tr></tbody></table></section>
      <section className="receipt-section"><h3>تاریخچه سفرها و پرداخت‌ها</h3><table className="receipt-history-table"><thead><tr><th>تاریخ</th><th>حالت</th><th>عنوان</th><th>کرایه خالص</th><th>پرداخت</th></tr></thead><tbody>{activities.map((item) => <tr key={item.id}><td>{formatDateTime(item.date, item.timeSource)}</td><td>{item.type}</td><td>{item.title || "-"}</td><td>{money(item.billed)}</td><td>{money(item.paid)}</td></tr>)}{activities.length === 0 && <tr><td colSpan="5">هنوز فعالیتی ثبت نشده است.</td></tr>}</tbody></table></section>
      <footer className="receipt-footer"><div><span>امضای مشتری</span></div><p>این صورت‌حساب توسط سیستم {company.companyName || "شرکت سیاحتی"} ایجاد شده است.</p><div><span>امضای مسئول</span></div></footer>
    </article>
  </div>;
}

export default CustomerStatement;
