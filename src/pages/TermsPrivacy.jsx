import { useEffect, useState } from "react";
import legalLogo from "../assets/logo.jpeg";
import "./TermsPrivacy.css";

const termsItems = [
  {
    title: "LICENSE",
    text:
      "This software is licensed, not sold. You are granted a non-exclusive and non-transferable license to use the system for your business operations.",
  },
  {
    title: "OWNERSHIP",
    text:
      "The application design, interface, compiled application, structure, and related intellectual property are owned by AFGHAN POWER unless a separate written agreement states otherwise.",
  },
  {
    title: "USAGE",
    text:
      "You may use this system to manage products, billing, sales, staff, customers, godown, suppliers, expenses, loans, financials, reports, settings, backups, users, and related business records.",
  },
  {
    title: "RESTRICTIONS",
    text:
      "You may not reverse engineer, redistribute, sublicense, resell, copy, or attempt to extract proprietary source code without written authorization from AFGHAN POWER.",
  },
  {
    title: "DATA",
    text:
      "Your business data belongs to you. You are responsible for entering accurate records, managing access, keeping backups secure, and using the data lawfully.",
  },
  {
    title: "BACKUPS",
    text:
      "Backup files should be stored safely. Import only backup files that you trust, because restored data can replace or merge with current system records.",
  },
  {
    title: "UPDATES",
    text:
      "Updates may be provided to improve features, printing, reports, performance, security, compatibility, and data workflows.",
  },
  {
    title: "SUPPORT",
    text:
      "Support information is available from the Help Center and the contact details provided inside the application.",
  },
];

const privacyItems = [
  {
    title: "DATA COLLECTION",
    text:
      "The application is designed to work with the operational data you enter into the system, including products, customers, suppliers, bills, expenses, loans, reports, users, and settings.",
  },
  {
    title: "LOCAL STORAGE",
    text:
      "System data is stored through the configured local data service. In this project setup, the local API stores JSON data on Drive C in the configured data folder.",
  },
  {
    title: "NO ADVERTISING TRACKING",
    text:
      "The system is not designed to track usage for advertising purposes or sell business information to advertisers.",
  },
  {
    title: "SECURITY",
    text:
      "You should protect computer accounts, user passwords, exported files, printed reports, and backups. User permissions should be configured carefully for each staff account.",
  },
  {
    title: "SHARING",
    text:
      "When you use print, PDF, email, messaging, import, export, or sharing features, data may be handled by the applications, folders, printers, or services selected by you.",
  },
  {
    title: "CHANGES",
    text:
      "This policy may be updated as the application evolves. Continued use of the system after an update means you accept the revised policy.",
  },
];

function TypeText({ text, speed = 8 }) {
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

function TermsPrivacy() {
  const [activeTab, setActiveTab] = useState("terms");

  const isTerms = activeTab === "terms";
  const activeItems = isTerms ? termsItems : privacyItems;
  const activeTitle = isTerms ? "Terms & Conditions" : "Privacy Policy";
  const activeBadge = isTerms ? "Legal Agreement" : "Data Protection";
  const activeIntro = isTerms
    ? "By using the Smart Office Management System, you agree to the following terms and conditions:"
    : "AFGHAN POWER Smart Office Management System Privacy Policy";

  return (
    <div className="terms-privacy-page">
      <div className="terms-privacy-container">
        <header className="terms-privacy-hero">
          <div className="terms-privacy-logo">
            <img src={legalLogo} alt="Smart Office Logo" />
          </div>

          <h1>Terms &amp; Privacy</h1>
          <p>Software usage rules, ownership, security, and privacy information.</p>
        </header>

        <div
          className="terms-privacy-tabs"
          role="tablist"
          aria-label="Terms and privacy sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isTerms}
            className={isTerms ? "active" : ""}
            onClick={() => setActiveTab("terms")}
          >
            Terms &amp; Conditions
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={!isTerms}
            className={!isTerms ? "active" : ""}
            onClick={() => setActiveTab("privacy")}
          >
            Privacy Policy
          </button>
        </div>

        <section className="terms-privacy-card" key={activeTab}>
          <div className="terms-privacy-card-head">
            <span>{activeBadge}</span>
            <h2>
              <TypeText text={activeTitle} speed={10} />
            </h2>
            <p>
              <TypeText text={activeIntro} speed={6} />
            </p>
          </div>

          <div className="terms-privacy-content">
            {activeItems.map((item, index) => (
              <article
                className="terms-privacy-item"
                key={item.title}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <p>
                  <strong>
                    {index + 1}. {item.title}:
                  </strong>{" "}
                  {item.text}
                </p>
              </article>
            ))}
          </div>

          {!isTerms && (
            <p className="terms-privacy-contact">
              For questions about privacy, contact:{" "}
              <a href="mailto:info@afghanpower.com">info@afghanpower.com</a>
            </p>
          )}
        </section>

        <footer className="terms-privacy-footer">
          &copy; 2026 AFGHAN POWER. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default TermsPrivacy;
