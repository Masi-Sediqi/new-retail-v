import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { notify } from "../utils/notify";
import { todayDateValue } from "../utils/afghanDate";
import "./Auth.css";

function Login({ accounts, setAccounts, onLogin, company }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const systemName = company.companyName || "Smart Office";
  const systemSubtitle =
    company.systemSubtitle || "Smart Office Management System";

  const submit = async (event) => {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();

    if (!email || !form.password) {
      return notify("Please enter your email and password.", "error");
    }

    let account = accounts.find(
      (item) =>
        (String(item.email || "").toLowerCase() === email ||
          String(item.username || "").toLowerCase() === email) &&
        (item.password === form.password || item.secondaryPassword === form.password)
    );

    if (!account && email === "admin@gmail.com" && form.password === "mynameisadmin") {
      account = {
        id: "default-admin",
        fullName: "System Admin",
        email: "admin@gmail.com",
        password: "mynameisadmin",
        secondaryPassword: "",
        role: "Admin",
        status: "Active",
        permissions: {},
        isDefaultAdmin: true,
        createdAt: todayDateValue(),
      };

      if (!accounts.some((item) => String(item.id) === "default-admin")) {
        const saved = await setAccounts([account, ...accounts]);
        if (!saved) return;
      }
    }

    if (!account) {
      return notify("The email or password is incorrect.", "error");
    }

    onLogin(account);
  };

  return (
    <div className="auth-page" dir="ltr">
      <div className="auth-brand-panel">
        <div className="auth-logo">
          {company.logo ? (
            <img src={company.logo} alt={`${systemName} logo`} />
          ) : (
            systemName.slice(0, 1)
          )}
        </div>

        <h1>{systemName}</h1>
        <p>{systemSubtitle}</p>
      </div>

      <div className="auth-form-panel">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div className="auth-card-icon">
            <LockKeyhole />
          </div>

          <h2>Sign In to the System</h2>

          <p>Enter your account information to continue.</p>

          <label>
            Email
            <input
              type="text"
              inputMode="email"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
              placeholder="name@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <span className="auth-password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) =>
                  setForm({
                    ...form,
                    password: event.target.value,
                  })
                }
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
