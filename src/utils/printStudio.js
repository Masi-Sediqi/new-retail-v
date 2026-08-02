const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

export const defaultPrintStudio = {
  template: "Standard", paperSize: "A4", businessNameEn: "", businessNameFa: "", businessNamePs: "",
  subtitleEn: "", subtitleFa: "", subtitlePs: "", address: "", phone: "", email: "", website: "", hours: "", registrationNumber: "",
  primaryColor: "#0f7c8a", accentColor: "#1d6fb8", headerTextColor: "#ffffff", footerTextColor: "#64748b",
  titleColor: "#0f172a", subtitleColor: "#64748b", bodyTextColor: "#0f172a", logo: "", watermark: "", watermarkOpacity: 6,
  titleSize: 22, subtitleSize: 12, headerTextSize: 12, bodyTextSize: 11, footerTextSize: 10,
  headerHeight: 40, footerHeight: 22, rowsPerPage: 25, showTimestamp: true, footerText: "", showLogo: true, showSignature: true,
};

export const normalizePrintSettings = (settings = {}, company = {}) => ({
  ...defaultPrintStudio, ...settings,
  businessNameEn: settings.businessNameEn || company.companyName || "Smart Office",
  subtitleEn: settings.subtitleEn || company.systemSubtitle || "Smart Office Management System",
  address: settings.address || company.address || "", phone: settings.phone || company.phoneNumber || "",
  email: settings.email || company.emailAddress || "", website: settings.website || company.website || "",
  logo: settings.logo || company.logo || "",
});

const studioCss = (s) => `
  :root{--ps-primary:${s.primaryColor};--ps-accent:${s.accentColor};--ps-title:${s.titleColor};--ps-subtitle:${s.subtitleColor};--ps-body:${s.bodyTextColor};--ps-footer:${s.footerTextColor}}
  @page{size:${s.paperSize === "80mm Thermal" ? "80mm auto" : s.paperSize};margin:${s.paperSize === "80mm Thermal" ? "5mm" : "12mm"}}
  body{color:var(--ps-body)!important;font-size:${s.bodyTextSize}px!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  h1{color:var(--ps-title)!important;font-size:${s.titleSize}px!important} h2,h3{color:var(--ps-title)!important} p,small{color:var(--ps-subtitle)}
  table thead th{background:var(--ps-primary)!important;color:${s.headerTextColor}!important;font-size:${s.headerTextSize}px!important}
  .print-studio-header{min-height:${s.headerHeight}mm;border-radius:8px;background:linear-gradient(135deg,var(--ps-primary),var(--ps-accent));color:${s.headerTextColor};padding:10px 14px;display:flex;align-items:center;gap:12px;margin-bottom:14px}
  .print-studio-header img{width:44px;height:44px;object-fit:contain;background:#fff;border-radius:7px}.print-studio-header strong{font-size:${s.titleSize}px}.print-studio-header span{display:block;font-size:${s.subtitleSize}px;margin-top:3px}
  .print-studio-contact{margin-left:auto;text-align:right;font-size:${s.headerTextSize}px;line-height:1.55}.print-studio-watermark{position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;z-index:0;opacity:${Number(s.watermarkOpacity || 0) / 100}}
  .print-studio-watermark img{max-width:58%;max-height:58%}.print-studio-footer{min-height:${s.footerHeight}mm;color:var(--ps-footer);border-top:1px solid #dbe3ef;margin-top:16px;padding-top:8px;display:flex;justify-content:space-between;font-size:${s.footerTextSize}px}
  @media print{.print-studio-header,.print-studio-footer,.print-studio-watermark{display:flex!important}body{background:#fff!important}}
`;

export const decoratePrintHtml = (html, rawSettings = {}, company = {}) => {
  if (!/<html|<body/i.test(html) || html.includes("data-print-studio")) return html;
  const s = normalizePrintSettings(rawSettings, company);
  const logo = s.showLogo && s.logo ? `<img src="${s.logo}" alt="Logo">` : "";
  const watermark = s.watermark ? `<div class="print-studio-watermark"><img src="${s.watermark}" alt=""></div>` : "";
  const timestamp = s.showTimestamp ? new Date().toLocaleString() : "";
  const header = `<div class="print-studio-header" data-print-studio>${logo}<div><strong>${escapeHtml(s.businessNameEn)}</strong><span>${escapeHtml(s.subtitleEn)}</span></div><div class="print-studio-contact">${[s.phone,s.email,s.address].filter(Boolean).map(escapeHtml).join("<br>")}</div></div>${watermark}`;
  const footer = `<div class="print-studio-footer"><span>${escapeHtml(s.footerText)}</span><span>${escapeHtml(timestamp)}</span></div>`;
  let output = html.replace(/<\/head>/i, `<style>${studioCss(s)}</style></head>`);
  output = output.replace(/<body([^>]*)>/i, `<body$1>${header}`);
  return output.replace(/<\/body>/i, `${footer}</body>`);
};

let originalOpen;
export const installPrintStudio = (getConfiguration) => {
  if (originalOpen) return () => {};
  originalOpen = window.open.bind(window);
  window.open = (...args) => {
    const popup = originalOpen(...args);
    if (!popup) return popup;
    const nativeWrite = popup.document.write.bind(popup.document);
    popup.document.write = (...chunks) => {
      const { settings, company } = getConfiguration();
      return nativeWrite(decoratePrintHtml(chunks.join(""), settings, company));
    };
    return popup;
  };
  const beforePrint = () => {
    const { settings, company } = getConfiguration();
    const s = normalizePrintSettings(settings, company);
    const host = document.createElement("div");
    host.id = "global-print-studio-branding";
    host.innerHTML = `${s.showLogo && s.logo ? `<img src="${s.logo}" alt="">` : ""}<div><strong>${escapeHtml(s.businessNameEn)}</strong><span>${escapeHtml(s.subtitleEn)}</span></div><small>${escapeHtml(s.footerText)}${s.showTimestamp ? ` · ${escapeHtml(new Date().toLocaleString())}` : ""}</small><style>@media print{#global-print-studio-branding{display:flex!important;align-items:center;gap:10px;border-bottom:4px solid ${s.primaryColor};padding:8px 0 12px;margin-bottom:12px;color:${s.titleColor}}#global-print-studio-branding img{width:42px;height:42px;object-fit:contain}#global-print-studio-branding div span{display:block;color:${s.subtitleColor};font-size:${s.subtitleSize}px}#global-print-studio-branding small{margin-left:auto;color:${s.footerTextColor}}body{font-size:${s.bodyTextSize}px!important}}</style>`;
    document.body.prepend(host);
  };
  const afterPrint = () => document.getElementById("global-print-studio-branding")?.remove();
  window.addEventListener("beforeprint", beforePrint);
  window.addEventListener("afterprint", afterPrint);
  return () => { if (originalOpen) window.open = originalOpen; originalOpen = null; window.removeEventListener("beforeprint", beforePrint); window.removeEventListener("afterprint", afterPrint); afterPrint(); };
};

export const openPrintPreview = (settings, company) => {
  const popup = window.open("", "_blank", "width=900,height=1000");
  if (!popup) return;
  popup.document.write(decoratePrintHtml(`<!doctype html><html><head><title>Print Preview</title><style>body{font-family:Arial;padding:24px}.sample{padding:18px;border:1px solid #ddd;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{padding:9px;border:1px solid #ddd;text-align:left}</style></head><body><div class="sample"><h1>Invoice Preview</h1><p>This preview shows how documents will use your saved print branding.</p><table><thead><tr><th>Item</th><th>Quantity</th><th>Amount</th></tr></thead><tbody><tr><td>Sample product</td><td>2</td><td>1,250.00</td></tr></tbody></table></div></body></html>`, settings, company));
  popup.document.close();
};
