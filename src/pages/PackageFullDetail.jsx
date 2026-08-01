import { Link, useParams } from "react-router-dom";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatDateTime } from "../utils/afghanDate";
import "./Packages.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");

function getCustomerName(customer) {
  return (
    customer?.customerName ||
    customer?.fullName ||
    customer?.name ||
    `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
    "Unnamed Customer"
  );
}

function PackageFullDetail() {
  const { packageId } = useParams();
  const [packages, , , packagesLoaded] = useJsonCollection("packages");
  const [customerPackages, , , customerPackagesLoaded] =
    useJsonCollection("customerPackages");
  const [customers, , , customersLoaded] = useJsonCollection("customers");

  if (!packagesLoaded || !customerPackagesLoaded || !customersLoaded) {
    return <div className="page-loading">Loading package detail...</div>;
  }

  const packageRecord = packages.find(
    (item) =>
      String(item.id || "") === String(packageId) ||
      String(item.packageCode || "") === String(packageId)
  );

  if (!packageRecord) {
    return (
      <div className="packages-page">
        <Link className="package-back-link" to="/packages">
          ← Back to Packages
        </Link>
        <section className="package-detail-page-card">
          <h1>Package Not Found</h1>
          <p>The selected package record does not exist.</p>
        </section>
      </div>
    );
  }

  const relatedCustomerPackages = customerPackages
    .filter(
      (item) =>
        String(item.packageId || "") === String(packageRecord.id || "") ||
        String(item.packageCode || "") ===
          String(packageRecord.packageCode || "") ||
        (!item.packageId &&
          String(item.packageName || "") ===
            String(packageRecord.packageName || ""))
    )
    .map((item) => {
      const customer =
        customers.find(
          (record) =>
            String(record.id || "") === String(item.customerRecordId || "") ||
            String(record.customerId || "") === String(item.customerId || "")
        ) || {};

      const price = Number(item.packagePrice || packageRecord.monthlyPrice || 0);
      const paid = Number(item.paidAmount || 0);
      const remaining = Number(item.remainAmount ?? Math.max(price - paid, 0));

      return {
        ...item,
        customerDisplayName: item.customerName || getCustomerName(customer),
        customerCode: item.customerId || customer.customerId || "",
        price,
        paid,
        remaining,
        paymentState: remaining <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid",
      };
    })
    .sort((a, b) =>
      String(b.startDate || b.createdAt || "").localeCompare(
        String(a.startDate || a.createdAt || "")
      )
    );

  const activeAssignments = relatedCustomerPackages.filter(
    (item) => item.status === "Active"
  );
  const fullyPaid = relatedCustomerPackages.filter(
    (item) => item.remaining <= 0
  );
  const partialPaid = relatedCustomerPackages.filter(
    (item) => item.remaining > 0
  );
  const totalValue = relatedCustomerPackages.reduce(
    (sum, item) => sum + item.price,
    0
  );
  const totalPaid = relatedCustomerPackages.reduce(
    (sum, item) => sum + item.paid,
    0
  );
  const totalRemaining = relatedCustomerPackages.reduce(
    (sum, item) => sum + item.remaining,
    0
  );

  return (
    <div className="packages-page">
      <Link className="package-back-link" to="/packages">
        ← Back to Packages
      </Link>

      <section className="package-detail-page-card">
        <span className="package-page-kicker">Package Full Detail</span>
        <h1>
          {packageRecord.packageCode || "No Code"} -{" "}
          {packageRecord.packageName || "Unnamed Package"}
        </h1>
        <p>
          {packageRecord.speed || "-"} / {money(packageRecord.monthlyPrice)} AFN
          / {packageRecord.durationDays || 30} days
        </p>
      </section>

      <section className="package-detail-stat-grid">
        <article>
          <span>Activated By Customers</span>
          <strong>{activeAssignments.length}</strong>
          <p>Currently active customer packages</p>
        </article>

        <article>
          <span>Total Records</span>
          <strong>{relatedCustomerPackages.length}</strong>
          <p>All customers who selected this package</p>
        </article>

        <article>
          <span>Fully Paid</span>
          <strong>{fullyPaid.length}</strong>
          <p>Customers with no remaining amount</p>
        </article>

        <article>
          <span>Partial / Unpaid</span>
          <strong>{partialPaid.length}</strong>
          <p>Customers with remaining balance</p>
        </article>
      </section>

      <section className="package-detail-stat-grid compact">
        <article>
          <span>Total Package Value</span>
          <strong>{money(totalValue)} AFN</strong>
        </article>

        <article>
          <span>Total Paid</span>
          <strong>{money(totalPaid)} AFN</strong>
        </article>

        <article>
          <span>Total Remaining</span>
          <strong>{money(totalRemaining)} AFN</strong>
        </article>
      </section>

      <section className="package-detail-page-table">
        <div className="package-detail-page-table-header">
          <h2>Customer Package History</h2>
          <p>See who paid fully and who still has a remaining amount.</p>
        </div>

        <div className="package-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Package Price</th>
                <th>Paid Amount</th>
                <th>Remaining</th>
                <th>Payment</th>
              </tr>
            </thead>

            <tbody>
              {relatedCustomerPackages.map((item) => (
                <tr key={item.id || `${item.customerId}-${item.startDate}`}>
                  <td>
                    <strong>{item.customerCode || "No ID"}</strong> -{" "}
                    {item.customerDisplayName}
                  </td>
                  <td>{item.status || "-"}</td>
                  <td>{formatDateTime(item.startDate)}</td>
                  <td>{formatDateTime(item.endDate)}</td>
                  <td>{money(item.price)} AFN</td>
                  <td>{money(item.paid)} AFN</td>
                  <td>{money(item.remaining)} AFN</td>
                  <td>
                    <span
                      className={`package-payment-status ${item.paymentState.toLowerCase()}`}
                    >
                      {item.paymentState}
                    </span>
                  </td>
                </tr>
              ))}

              {relatedCustomerPackages.length === 0 && (
                <tr>
                  <td colSpan="8" className="package-empty-cell">
                    No customer has activated this package yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default PackageFullDetail;
