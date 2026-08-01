import { useEffect, useMemo, useState } from "react";
import guideLogo from "../assets/logo.jpeg";
import "./UserGuide.css";

const guideSections = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "The Dashboard is the central overview of the system. It shows revenue, profit, expenses, stock, customers, loans, recent activity, and quick actions. Use it first when you want to understand the current business position before opening a detailed module.",
  },
  {
    key: "products",
    title: "Products",
    description:
      "Products is used to manage your item catalog. You can create products, assign categories, set purchase and sale prices, store barcode or SKU information, manage stock quantities, and watch low-stock or inactive product records.",
  },
  {
    key: "billing",
    title: "Billing",
    description:
      "Billing creates customer invoices. Select or create a customer, add products, set quantities, discounts, payment status, and currency, then save the invoice. Saved invoices can be reviewed later from Sales / Bills and printed with the current company settings.",
  },
  {
    key: "sales-bills",
    title: "Sales / Bills",
    description:
      "Sales / Bills stores completed invoice records. Use search and filters to find bills by invoice number, customer, date, payment state, or amount. This module helps you review revenue, paid values, remaining balances, and printable bill details.",
  },
  {
    key: "staff",
    title: "Staff",
    description:
      "Staff keeps team records such as name, role, salary, contact information, status, and notes. Staff salary and payroll information can be included in financial calculations and reports when configured.",
  },
  {
    key: "customers",
    title: "Customers",
    description:
      "Customers manages customer profiles, phone numbers, addresses, notes, purchase history, payments, balances, loans, and activity. Open a customer detail page when you need the full account view.",
  },
  {
    key: "godown",
    title: "Godown",
    description:
      "Godown controls warehouse and inventory movement. Record incoming goods, outgoing stock, supplier links, purchase values, quantities, and stock adjustments. It helps keep product inventory aligned with real warehouse movement.",
  },
  {
    key: "suppliers",
    title: "Suppliers",
    description:
      "Suppliers manages supplier accounts and purchase ledgers. You can track purchases, payments, deposits, withdrawals, balances, goods records, and supplier reports from one place.",
  },
  {
    key: "partner-investing",
    title: "Partner Investing",
    description:
      "Partner Investing tracks partner capital, investment movements, adjustments, and business share records. Use it when business funding or profit participation must be visible beside normal financial data.",
  },
  {
    key: "expenses",
    title: "Expenses",
    description:
      "Expenses records business costs by category, date, amount, currency, payment method, and notes. Expense records flow into reports and financial summaries so net profit stays accurate.",
  },
  {
    key: "loans",
    title: "Loans",
    description:
      "Loans tracks borrowed or lent money, installments, paid amounts, remaining balances, due dates, and status. Use filters to separate active, completed, customer, or business loan records.",
  },
  {
    key: "financials",
    title: "Financials",
    description:
      "Financials gives a focused view of business performance. It combines revenue, expenses, net profit, stock value, cash wallet, taxes, adjustments, and other configured financial rules.",
  },
  {
    key: "reports",
    title: "Reports",
    description:
      "Reports generates printable business analysis. Use date ranges, charts, tables, and filters to review sales, products, customers, suppliers, expenses, loans, and financial results.",
  },
  {
    key: "agent",
    title: "Agent",
    description:
      "Agent answers questions from your stored system data. Ask about products, stock, customers, suppliers, invoices, expenses, loans, cash wallet, and business summaries.",
  },
  {
    key: "recycle-bin",
    title: "Recycle Bin",
    description:
      "Recycle Bin keeps deleted records when the module supports recovery. Restore accidental deletions, filter by module, or permanently remove records that are no longer needed.",
  },
  {
    key: "settings",
    title: "Settings",
    description:
      "Settings controls company information, logo, theme, currency, printing, notifications, backup, sharing, users, security, forms, license information, and advanced sync options.",
  },
];

function TypeText({ text, speed = 6 }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue("");
    let index = 0;

    const timer = window.setInterval(() => {
      index += 3;
      setValue(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed]);

  return <>{value}</>;
}

function UserGuide() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const selectedSection = useMemo(
    () =>
      guideSections.find((section) => section.key === activeSection) ||
      guideSections[0],
    [activeSection]
  );

  return (
    <div className="user-guide-page">
      <div className="user-guide-container">
        <header className="user-guide-hero">
          <div className="user-guide-logo">
            <img src={guideLogo} alt="Smart Office Logo" />
          </div>

          <span className="user-guide-badge">Beginner Guide</span>
          <h1>User Guide</h1>
          <p>Complete guide to every module in the Smart Office system.</p>
        </header>

        <nav className="user-guide-tabs" aria-label="User guide modules">
          {guideSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={activeSection === section.key ? "active" : ""}
              onClick={() => setActiveSection(section.key)}
            >
              {section.title}
            </button>
          ))}
        </nav>

        <section className="user-guide-content-card" key={selectedSection.key}>
          <span className="user-guide-section-label">
            {selectedSection.title}
          </span>
          <h2>
            <TypeText text={selectedSection.title} speed={10} />
          </h2>
          <p>
            <TypeText text={selectedSection.description} speed={5} />
          </p>
        </section>
      </div>
    </div>
  );
}

export default UserGuide;
