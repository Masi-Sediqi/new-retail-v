import { ArrowRight, Printer } from "lucide-react";
import { formatDateTime } from "../utils/afghanDate";
import { useNavigate, useParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatSeatNumbers } from "../utils/seatManagement";
import "./CustomerReceipt.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");

function CustomerReceipt() {
  const { id, type, recordId } = useParams();
  const navigate = useNavigate();
  const customerIndex = Number(id);
  const [settings] = useJsonCollection("settings");
  const [customers] = useJsonCollection("customers");
  const [customerTravels] = useJsonCollection("customerTravels");
  const [customerPayments] = useJsonCollection("customerPayments");
  const company = settings[0] || {};
  const systemName = company.companyName || "Smart Office";
  const customer = customers[customerIndex];
  const record =
    type === "travel"
      ? customerTravels.find((item) => Number(item.id) === Number(recordId))
      : customerPayments.find((item) => Number(item.id) === Number(recordId));

  if (!customer || !record) {
    return (
      <div className="receipt-page">
        <div className="receipt-sheet">
          <h2>Receipt record was not found.</h2>
          <button type="button" onClick={() => navigate(`/customers/${customerIndex}`)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const fare = Number(record.fare || 0);
  const discount = Number(record.discount || 0);
  const paid = Number(type === "travel" ? record.paidAmount : record.amount || 0);
  const remaining = type === "travel" ? Math.max(fare - discount - paid, 0) : null;
  const receiptTitle = type === "travel" ? "Travel Receipt" : "Payment Receipt";

  return (
    <div className="receipt-page">
      <div className="receipt-toolbar">
        <button type="button" onClick={() => navigate(`/customers/${customerIndex}`)}>
          <ArrowRight size={16} /> Back
        </button>
        <button type="button" className="receipt-print-btn" onClick={() => window.print()}>
          <Printer size={16} /> Print Receipt
        </button>
      </div>

      <article className="receipt-sheet">
        <header className="receipt-header">
          <div className="receipt-company">
            <div className="receipt-company-logo">
              {company.logo ? <img src={company.logo} alt="System logo" /> : systemName.slice(0, 1)}
            </div>
            <div>
              <h1>{systemName}</h1>
              <p>{company.systemSubtitle || "Business Management System"}</p>
            </div>
          </div>

          <div className="receipt-title">
            <span>Receipt</span>
            <h2>{receiptTitle}</h2>
            <p>{type === "travel" ? record.travelName || "Customer travel" : "Customer payment"}</p>
          </div>

          <div className="receipt-number">
            <span>Receipt Number</span>
            <strong>{record.ticketNo || record.receiptNumber || record.id}</strong>
            <small>Issued: {formatDateTime(record.date, record.createdAt || record.updatedAt)}</small>
          </div>
        </header>

        <section className="receipt-section">
          <h3>Customer Information</h3>
          <table className="receipt-info-table">
            <tbody>
              <tr>
                <th>Full Name</th>
                <td>{customer.customerName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "-"}</td>
                <th>Phone</th>
                <td>{customer.phone || "-"}</td>
              </tr>
              <tr>
                <th>Customer ID</th>
                <td>{customer.customerId || customerIndex + 1}</td>
                <th>Status</th>
                <td>{customer.status || "-"}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {type === "travel" && (
          <section className="receipt-section">
            <h3>Travel Information</h3>
            <table className="receipt-info-table">
              <tbody>
                <tr>
                  <th>Route</th>
                  <td>{record.from || "-"} to {record.to || "-"}</td>
                  <th>Driver</th>
                  <td>{record.driver || "-"}</td>
                </tr>
                <tr>
                  <th>Vehicle</th>
                  <td>{record.car || "-"}</td>
                  <th>Seats</th>
                  <td>{formatSeatNumbers(record)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        <section className="receipt-section">
          <h3>Financial Summary</h3>
          <table className="receipt-finance-table">
            <thead>
              <tr>
                {type === "travel" && <th>Total Fare</th>}
                {type === "travel" && <th>Discount</th>}
                <th>Paid Amount</th>
                {type === "travel" && <th>Remaining</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                {type === "travel" && <td>{money(fare)} AFN</td>}
                {type === "travel" && <td>{money(discount)} AFN</td>}
                <td className="receipt-paid">{money(paid)} AFN</td>
                {type === "travel" && <td className="receipt-remaining">{money(remaining)} AFN</td>}
              </tr>
            </tbody>
          </table>
        </section>

        <section className="receipt-section">
          <h3>Note</h3>
          <table className="receipt-info-table">
            <tbody>
              <tr>
                <th>Description</th>
                <td colSpan="3">{record.note || record.description || "No description."}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="receipt-footer">
          <div><span>Customer Signature</span></div>
          <p>This receipt was generated by {systemName}.</p>
          <div><span>Authorized Signature</span></div>
        </footer>
      </article>
    </div>
  );
}

export default CustomerReceipt;
