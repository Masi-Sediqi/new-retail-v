import {
  Braces,
  Building2,
  Cloud,
  Code2,
  Cpu,
  Database,
  Gauge,
  MapPin,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";

import developerLogo from "../assets/logo.jpeg";
import "./Developer.css";

const systemFeatures = [
  {
    key: "offline",
    title: "Offline-First",
    description:
      "System data is stored locally and remains available without a permanent internet connection.",
    icon: Database,
  },
  {
    key: "sync",
    title: "Real-Time Data Sync",
    description:
      "Inventory, customers, suppliers, towers, repair, and finance modules remain connected.",
    icon: Zap,
  },
  {
    key: "secure",
    title: "Secure",
    description:
      "Includes account protection, permissions, passwords, system access control, and audit records.",
    icon: ShieldCheck,
  },
  {
    key: "performance",
    title: "Optimized Performance",
    description:
      "Designed for fast loading, smooth navigation, and efficient management of large records.",
    icon: Gauge,
  },
  {
    key: "modern",
    title: "Modern Technology",
    description:
      "Built with a modern React interface and structured data management architecture.",
    icon: Braces,
  },
  {
    key: "isp",
    title: "Complete Smart Office Management",
    description:
      "Manages assets, suppliers, customers, packages, towers, transfers, repairs, finance, and reports.",
    icon: Cpu,
  },
];

const developerSkills = [
  "React",
  "JavaScript",
  "CSS",
  "Django",
  "Python",
  "REST API",
];

function Developer() {
  return (
    <div className="developer-page">
      <div className="developer-container">
        <header className="developer-hero">
          <div className="developer-logo">
            <img
              src={developerLogo}
              alt="AFGHAN POWER Logo"
            />
          </div>

          <h1>AFGHAN POWER</h1>

          <p>Smart Office Management System</p>

          <span>Version 0.0.1</span>
        </header>

        <section className="developer-section developer-features-section">
          <div className="developer-section-heading">
            <Cpu size={20} />

            <div>
              <h2>System Features</h2>
              <p>
                Core capabilities and technical features of the
                system.
              </p>
            </div>
          </div>

          <div className="developer-feature-grid">
            {systemFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  className="developer-feature-card"
                  key={feature.key}
                >
                  <span className="developer-feature-icon">
                    <Icon size={19} strokeWidth={1.8} />
                  </span>

                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="developer-section developer-profile-section">
          <div className="developer-section-heading">
            <Code2 size={20} />

            <div>
              <h2>Developer</h2>
              <p>
                Developer information and technical expertise.
              </p>
            </div>
          </div>

          <div className="developer-profile">
            <div className="developer-avatar">
              <Users size={28} strokeWidth={1.7} />
            </div>

            <div className="developer-profile-content">
              <h3>Masi Sediqi</h3>

              <div className="developer-location">
                <MapPin size={14} />
                <span>Kabul, Afghanistan</span>
              </div>

              <p>
                Full-stack software developer specializing in
                modern business systems, Smart Office management,
                inventory management, financial applications,
                customer management, and responsive web
                interfaces.
              </p>

              <div className="developer-skills">
                {developerSkills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="developer-section developer-partnership-section">
          <div className="developer-section-heading">
            <Building2 size={20} />

            <div>
              <h2>Partnership</h2>
              <p>
                Technology development and software partnership.
              </p>
            </div>
          </div>

          <article className="developer-company-card">
            <div className="developer-company-icon">
              <Cloud size={24} strokeWidth={1.7} />
            </div>

            <div>
              <h3>
                Afghan Power Tech Development Company
              </h3>

              <div className="developer-location">
                <MapPin size={14} />
                <span>Shahr-e-Naw, Kabul, Afghanistan</span>
              </div>

              <p>
                Technology development company specializing in
                software systems, websites, business
                applications, Smart Office management solutions, and
                professional digital services.
              </p>
            </div>
          </article>

          <footer className="developer-footer">
            © 2026 AFGHAN POWER. All rights reserved.
          </footer>
        </section>
      </div>
    </div>
  );
}

export default Developer;
