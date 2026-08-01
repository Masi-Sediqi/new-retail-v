import { useNavigate } from "react-router-dom";
import helpCenterLogo from "../assets/logo.jpeg";
import {
  Banknote,
  Bot,
  Boxes,
  BriefcaseBusiness,
  FileBarChart,
  FileQuestion,
  HelpCircle,
  LayoutDashboard,
  Mail,
  Phone,
  ReceiptText,
  Recycle,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  Users,
  WalletCards,
  Warehouse,
  Globe2,
} from "lucide-react";

import "./HelpCenter.css";

const helpModules = [
  {
    key: "dashboard",
    title: "Dashboard",
    description:
      "Review system totals, recent activity, revenue, stock, customer, expense, loan, and financial summaries from one overview.",
    icon: LayoutDashboard,
    path: "/",
    tone: "violet",
  },
  {
    key: "products",
    title: "Products",
    description:
      "Manage product records, categories, barcodes, purchase and sale prices, available quantity, low stock, and product status.",
    icon: Boxes,
    path: "/products",
    tone: "blue",
  },
  {
    key: "billing",
    title: "Billing",
    description:
      "Create invoices, add products, calculate totals, record payment status, save bills, and open print-ready invoice views.",
    icon: ReceiptText,
    path: "/billing",
    tone: "cyan",
  },
  {
    key: "sales-bills",
    title: "Sales / Bills",
    description:
      "Search completed invoices, review customer sales history, payment status, discounts, profit, and printable bill records.",
    icon: ShoppingCart,
    path: "/sales-bills",
    tone: "indigo",
  },
  {
    key: "staff",
    title: "Staff",
    description:
      "Register team members, roles, salaries, status, payroll information, and staff-related business records.",
    icon: BriefcaseBusiness,
    path: "/staff",
    tone: "slate",
  },
  {
    key: "customers",
    title: "Customers",
    description:
      "Manage customer profiles, contact details, notes, purchases, payments, balances, loans, and customer activity.",
    icon: Users,
    path: "/customers",
    tone: "purple",
  },
  {
    key: "godown",
    title: "Godown",
    description:
      "Track warehouse entries, imports, exports, stock movement, supplier links, quantities, and costing information.",
    icon: Warehouse,
    path: "/godown",
    tone: "emerald",
  },
  {
    key: "suppliers",
    title: "Suppliers",
    description:
      "Manage supplier accounts, purchases, payments, balances, goods tracking, settlements, and supplier reports.",
    icon: Truck,
    path: "/suppliers",
    tone: "orange",
  },
  {
    key: "partner-investing",
    title: "Partner Investing",
    description:
      "Track business partners, invested amounts, adjustments, profit share, and partner-related financial movement.",
    icon: Store,
    path: "/partner-investing",
    tone: "pink",
  },
  {
    key: "expenses",
    title: "Expenses",
    description:
      "Record expenses by category, date, amount, currency, notes, payment method, and generate expense summaries.",
    icon: WalletCards,
    path: "/expenses",
    tone: "red",
  },
  {
    key: "loans",
    title: "Loans",
    description:
      "Track customer and business loans, installments, paid amounts, remaining balances, and loan status.",
    icon: Banknote,
    path: "/loans",
    tone: "green",
  },
  {
    key: "financials",
    title: "Financials",
    description:
      "Review revenue, expenses, profit, stock value, cash wallet, liabilities, and business financial performance.",
    icon: Scale,
    path: "/financials",
    tone: "amber",
  },
  {
    key: "reports",
    title: "Reports",
    description:
      "Generate business reports with date filters, charts, record tables, print views, and export-friendly layouts.",
    icon: FileBarChart,
    path: "/reports",
    tone: "fuchsia",
  },
  {
    key: "recycle-bin",
    title: "Recycle Bin",
    description:
      "Restore deleted records, permanently delete old items, and filter deleted records by module.",
    icon: Recycle,
    path: "/recycle-bin",
    tone: "gray",
  },
  {
    key: "settings",
    title: "Settings",
    description:
      "Configure company information, theme, currency, printing, notifications, backups, users, security, and sharing.",
    icon: Settings,
    path: "/settings",
    tone: "slate",
  },
  {
    key: "agent",
    title: "Agent",
    description:
      "Ask questions about stored system data, including customers, products, invoices, expenses, loans, and reports.",
    icon: Bot,
    path: "/agent",
    tone: "blue",
  },
];

const quickLinks = [
  {
    title: "User Guide",
    description: "Open the full beginner guide for every module.",
    icon: HelpCircle,
    path: "/user-guide",
  },
  {
    title: "FAQ",
    description: "Find answers to common operational questions.",
    icon: FileQuestion,
    path: "/faq",
  },
  {
    title: "Terms & Privacy",
    description: "Read software usage rules and privacy information.",
    icon: ShieldCheck,
    path: "/terms-privacy",
  },
];

function HelpCenter() {
  const navigate = useNavigate();

  return (
    <div className="help-center-page">
      <div className="help-center-container">
        <header className="help-center-hero">
          <div className="help-center-logo">
            <img src={helpCenterLogo} alt="Smart Office Logo" />
          </div>

          <h1>Help Center</h1>
          <p>Get help with any module in the Smart Office system.</p>
        </header>

        <section className="help-quick-grid" aria-label="Quick help links">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.title}
                type="button"
                className="help-quick-card"
                onClick={() => navigate(item.path)}
              >
                <span>
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </button>
            );
          })}
        </section>

        <section className="help-center-modules">
          {helpModules.map((module) => {
            const Icon = module.icon;

            return (
              <button
                key={module.key}
                type="button"
                className="help-center-module-card"
                onClick={() => navigate(module.path)}
              >
                <span className={`help-center-module-icon tone-${module.tone}`}>
                  <Icon size={22} strokeWidth={1.8} />
                </span>

                <span className="help-center-module-content">
                  <strong>{module.title}</strong>
                  <small>{module.description}</small>
                </span>
              </button>
            );
          })}
        </section>

        <section className="help-center-support">
          <h2>Contact Support</h2>

          <div className="help-center-support-list">
            <a href="mailto:info@afghanpower.com">
              <span>
                <Mail size={19} />
              </span>

              <div>
                <small>Email</small>
                <strong>info@afghanpower.com</strong>
              </div>
            </a>

            <a href="tel:+93794948698">
              <span>
                <Phone size={19} />
              </span>

              <div>
                <small>Phone</small>
                <strong>+93 79 494 8698</strong>
              </div>
            </a>

            <a
              href="https://www.afghanpower.com"
              target="_blank"
              rel="noreferrer"
            >
              <span>
                <Globe2 size={19} />
              </span>

              <div>
                <small>Website</small>
                <strong>www.afghanpower.com</strong>
              </div>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HelpCenter;
