import { useState } from "react";
import { ArrowLeft, Crown, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { notify } from "../utils/notify";
import "./LockScreen.css";

export default function LockScreen({ accounts, company, onUnlock }) {
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState("");
  const activeAccounts = accounts.filter((account) => String(account.status || "Active").toLowerCase() === "active");
  const submit = (event) => {
    event.preventDefault();
    if (!selected) return;
    const masterPassword = company.securitySettings?.password || "";
    if (password !== selected.password && password !== selected.secondaryPassword && password !== masterPassword) {
      notify("Password is incorrect.", "error"); return;
    }
    onUnlock(selected); setPassword("");
  };
  return <div className="lock-screen"><section className="lock-card">
    <div className="lock-brand-icon"><ShieldCheck size={24}/></div>
    <h1>{company.companyName || "Smart Office"}</h1>
    {!selected ? <><p>Select your account to continue</p><div className="lock-account-list">{activeAccounts.map((account) => {
      const admin = String(account.role || "").toLowerCase() === "admin";
      const label = account.fullName || account.name || account.username || account.email;
      return <button type="button" key={account.id} onClick={()=>setSelected(account)}><span className={admin?"admin":""}>{admin?<Crown size={17}/>:<UserRound size={17}/>}</span><span><b>{label}</b><small>{admin?"Full system access":`@${account.username || account.email || "user"}`}</small></span></button>;
    })}</div></> : <form onSubmit={submit} className="lock-password-form"><button className="lock-back" type="button" onClick={()=>{setSelected(null);setPassword("");}}><ArrowLeft size={14}/> Accounts</button><div className="lock-selected-user"><UserRound size={19}/><span><b>{selected.fullName || selected.name || selected.username}</b><small>{selected.role || "User"}</small></span></div><label><span>Password</span><div><LockKeyhole size={16}/><input autoFocus type="password" value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="Enter password"/></div></label><button className="lock-unlock" type="submit">Unlock</button></form>}
  </section></div>;
}
