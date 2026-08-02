import { useState } from "react";
import { ChevronDown } from "lucide-react";
import faqLogo from "../assets/logo.jpeg";
import "./FAQ.css";

const faqItems = [
  {
    id: "product",
    question: "How do I create a new product?",
    answer:
      "Open Products, click Add Product, enter the product name, category, unit, purchase price, selling price, stock quantity, and optional barcode or SKU. Save the record to make it available in billing and reports.",
  },
  {
    id: "bill",
    question: "How do I create a bill or invoice?",
    answer:
      "Open Billing, select a customer, add products, set quantities and discounts, choose payment details, then save the invoice. You can print the invoice immediately or review it later from Sales / Bills.",
  },
  {
    id: "sales",
    question: "Where can I review old sales bills?",
    answer:
      "Open Sales / Bills. Use search and filters to find invoices by customer, invoice number, date, amount, or payment status. Open a bill to view details or print it again.",
  },
  {
    id: "supplier",
    question: "How do I track supplier payments?",
    answer:
      "Open Suppliers, select the supplier, and review the ledger. Purchases, payments, deposits, withdrawals, remaining balances, and goods records are tracked in the supplier workflow.",
  },
  {
    id: "godown",
    question: "How do I record warehouse stock movement?",
    answer:
      "Open Godown to record imports, exports, stock adjustments, supplier references, quantities, and cost values. Godown movement helps keep product stock aligned with real inventory.",
  },
  {
    id: "expense",
    question: "How do expenses affect profit?",
    answer:
      "Expenses are subtracted from business profit and appear in Reports and Financials. Record each expense with category, date, amount, currency, payment method, and notes for accurate reporting.",
  },
  {
    id: "loan",
    question: "How do I manage customer or business loans?",
    answer:
      "Open Loans, create a loan record, enter borrower or lender details, amount, paid value, due date, and status. Update the loan whenever a payment is made.",
  },
  {
    id: "currency",
    question: "How do I manage multiple currencies?",
    answer:
      "Open Settings and configure the default currency and exchange rates. Financial summaries and reports can use the configured currency logic when modules store values in different currencies.",
  },
  {
    id: "staff",
    question: "How do I manage staff and payroll?",
    answer:
      "Open Staff to add employees, roles, salaries, contact information, and status. Salary values can be included in financial calculations when your setup uses payroll costs.",
  },
  {
    id: "reports",
    question: "How do I print or export reports?",
    answer:
      "Open Reports, choose the report type and date range, then use the available print or export action. Print appearance follows your company and printing settings.",
  },
  {
    id: "backup",
    question: "Where is data stored and how do I back it up?",
    answer:
      "The local API stores system data on Drive C in the configured data folder. Use Settings backup tools to export a backup file and import only backup files you trust.",
  },
  {
    id: "recycle",
    question: "Can I restore a deleted record?",
    answer:
      "Supported deleted records go to Recycle Bin. Open Recycle Bin, filter by module if needed, then restore the record or permanently delete it.",
  },
  {
    id: "agent",
    question: "What can the Agent answer?",
    answer:
      "Agent can answer questions from saved system data, including products, stock, customers, suppliers, bills, expenses, loans, reports, and financial summaries.",
  },
  {
    id: "theme",
    question: "How do I change the theme or system preferences?",
    answer:
      "Open Settings. The settings tabs include company information, themes, currency, printing, notifications, sharing, backup, security, users, and forms.",
  },
];

function FAQ() {
  const [openId, setOpenId] = useState(faqItems[0].id);

  const toggleItem = (id) => {
    setOpenId((currentId) => (currentId === id ? "" : id));
  };

  return (
    <div className="faq-page">
      <div className="faq-container">
        <header className="faq-hero">
          <div className="faq-logo">
            <img src={faqLogo} alt="Smart Office Logo" />
          </div>

          <h1>FAQ</h1>
          <p>Frequently asked questions about the Smart Office system.</p>
        </header>

        <section className="faq-list">
          {faqItems.map((item) => {
            const isOpen = openId === item.id;

            return (
              <article
                key={item.id}
                className={`faq-item ${isOpen ? "open" : ""}`}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                >
                  <span>{item.question}</span>

                  <ChevronDown size={18} className={isOpen ? "open" : ""} />
                </button>

                <div
                  id={`faq-answer-${item.id}`}
                  className="faq-answer"
                  hidden={!isOpen}
                >
                  <p>{item.answer}</p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export default FAQ;
