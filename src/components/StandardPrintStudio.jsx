import { useMemo, useRef, useState } from "react";
import {
  FileDown,
  FileSpreadsheet,
  Printer,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";
import defaultLogo from "../assets/logo.jpeg";
import { normalizePrintSettings } from "../utils/printStudio";

const paperSizes = {
  A4: [210, 297],
  A5: [148, 210],
  Letter: [216, 279],
  Legal: [216, 356],
  T80: [80, 220],
  T58: [58, 190],
  Custom: [210, 297],
};

const marginSizes = {
  narrow: 7,
  normal: 14,
  wide: 22,
};

const safeFileName = (value) =>
  String(value || "report")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "report";

const quoteCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function StandardPrintStudio({
  columns,
  company,
  filename,
  Icon = WalletCards,
  rows,
  stats = [],
  subtitle = "All filtered records",
  title,
  onClose,
}) {
  const reportRef = useRef(null);
  const saved = normalizePrintSettings(company?.printSettings || {}, company || {});
  const [paper, setPaper] = useState(saved.paperSize || "A4");
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState("normal");
  const [rowsPerPage, setRowsPerPage] = useState(Number(saved.rowsPerPage || 25));
  const [scale, setScale] = useState(73);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sizes, setSizes] = useState({
    title: saved.titleSize,
    subtitle: saved.subtitleSize,
    header: saved.headerTextSize,
    body: saved.bodyTextSize,
    footer: saved.footerTextSize,
  });

  const normalizedRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const reportColumns = useMemo(
    () => (columns?.length ? columns : Object.keys(normalizedRows[0] || {})),
    [columns, normalizedRows]
  );
  const reportRows = normalizedRows.slice(0, Math.max(1, rowsPerPage));
  const basePaperSize = paperSizes[paper] || paperSizes.A4;
  const isThermal = paper === "T80" || paper === "T58";
  const paperSize =
    orientation === "landscape" && !isThermal
      ? [basePaperSize[1], basePaperSize[0]]
      : basePaperSize;
  const marginSize = marginSizes[margin] || marginSizes.normal;
  const fileBase = safeFileName(filename || title);

  const exportPdf = async () => {
    if (!reportRef.current) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const originalScale = reportRef.current.style.getPropertyValue("--report-scale");
    reportRef.current.style.setProperty("--report-scale", "1");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });
    reportRef.current.style.setProperty("--report-scale", originalScale || String(scale / 100));
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: [paperSize[0], paperSize[1]],
      compress: true,
    });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, paperSize[0], paperSize[1]);
    pdf.save(`${fileBase}.pdf`);
  };

  const exportExcel = () => {
    const csv = [reportColumns, ...normalizedRows.map((row) => reportColumns.map((column) => row[column]))]
      .map((row) => row.map(quoteCell).join(","))
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileBase}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="standard-print-backdrop">
      <style>{`@media print { @page { size: ${paperSize[0]}mm ${paperSize[1]}mm; margin: 0; } }`}</style>
      <section className="standard-print-studio">
        <header className="standard-print-toolbar">
          <div className="standard-print-titlebar">
            <button
              type="button"
              className={`standard-print-settings-toggle${settingsOpen ? " active" : ""}`}
              onClick={() => setSettingsOpen((current) => !current)}
              title="Print settings"
            >
              <SlidersHorizontal size={17} />
            </button>
            <strong><Printer size={16} /> {title}</strong>
          </div>
          <div className="standard-print-toolbar-actions">
            <button type="button" onClick={() => setScale((value) => Math.max(55, value - 8))}>-</button>
            <span>{scale}%</span>
            <button type="button" onClick={() => setScale((value) => Math.min(110, value + 8))}>+</button>
            <button type="button" onClick={exportPdf}><FileDown size={15} /> PDF</button>
            <button type="button" onClick={exportExcel}><FileSpreadsheet size={15} /> Excel</button>
            <button type="button" className="primary" onClick={() => window.print()}><Printer size={15} /> Print</button>
            <button type="button" className="close" onClick={onClose}><X size={17} /></button>
          </div>
        </header>
        <div className="standard-print-body">
          <aside className={`standard-print-controls${settingsOpen ? " open" : ""}`}>
            <div className="standard-print-controls-head">
              <strong>Print setup</strong>
              <button type="button" onClick={() => setSettingsOpen(false)}><X size={15} /></button>
            </div>
            <StandardControl title="Paper" values={["A4", "A5", "Letter", "Legal", "T80", "T58", "Custom"]} value={paper} onChange={setPaper} />
            <StandardControl title="Orientation" values={["Portrait", "Landscape"]} value={orientation === "portrait" ? "Portrait" : "Landscape"} onChange={(value) => setOrientation(value.toLowerCase())} />
            <StandardControl title="Page Margin" values={["Narrow", "Normal", "Wide"]} value={margin[0].toUpperCase() + margin.slice(1)} onChange={(value) => setMargin(value.toLowerCase())} />
            <h4>Rows / Page</h4>
            <input type="number" min="5" max="100" value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value) || 5)} />
            <h4>Live Typography</h4>
            {Object.entries(sizes).map(([key, value]) => (
              <label className="standard-print-range" key={key}>
                <span>{key}<b>{value}px</b></span>
                <input
                  type="range"
                  min="7"
                  max={key === "title" ? "34" : "20"}
                  value={value}
                  onChange={(event) => setSizes((current) => ({ ...current, [key]: Number(event.target.value) }))}
                />
              </label>
            ))}
            <small>{paper} - {orientation} - {marginSize}mm</small>
          </aside>
          <main className="standard-print-canvas">
            <article
              ref={reportRef}
              className={`standard-report-paper ${orientation}${isThermal ? " thermal" : ""}`}
              style={{
                width: `${paperSize[0]}mm`,
                minHeight: `${paperSize[1]}mm`,
                "--report-scale": scale / 100,
                "--report-margin": `${isThermal ? Math.min(marginSize, 5) : marginSize}mm`,
                "--report-primary": saved.primaryColor,
                "--report-accent": saved.accentColor,
                "--report-title": `${sizes.title}px`,
                "--report-subtitle": `${sizes.subtitle}px`,
                "--report-header": `${sizes.header}px`,
                "--report-body": `${sizes.body}px`,
                "--report-footer": `${sizes.footer}px`,
              }}
            >
              <div className="standard-report-header">
                {saved.showLogo && saved.logo ? <img src={saved.logo} alt="" /> : <div className="standard-report-logo"><Icon size={28} /></div>}
                <div><strong>{saved.businessNameEn}</strong><span>{saved.subtitleEn}</span></div>
                <p>{[saved.phone, saved.email, saved.address].filter(Boolean).join(" - ")}</p>
              </div>
              {(saved.watermark || saved.logo || defaultLogo) && (
                <img
                  className="standard-report-watermark"
                  src={saved.watermark || saved.logo || defaultLogo}
                  alt=""
                  style={{ opacity: saved.watermark ? Number(saved.watermarkOpacity || 0) / 100 : 0.055 }}
                />
              )}
              <div className="standard-report-heading">
                <div><small>REPORT</small><h1>{title}</h1><p>{subtitle}</p></div>
                <div><b>{new Date().toLocaleString()}</b><span>Records {normalizedRows.length}</span><span>Page 1 of 1</span></div>
              </div>
              {!!stats.length && (
                <div className="standard-report-stats">
                  {stats.slice(0, 6).map((item) => (
                    <div key={item.label}><span>{item.label}</span><b>{item.value}</b></div>
                  ))}
                </div>
              )}
              <p className="standard-report-contents">Contents: <span>1 - {Math.min(reportRows.length, normalizedRows.length)} Records</span></p>
              <table data-table-enhancer="off">
                <thead>
                  <tr>{reportColumns.map((column) => <th key={column}>{column}</th>)}</tr>
                </thead>
                <tbody>
                  {reportRows.length ? (
                    reportRows.map((row, rowIndex) => (
                      <tr key={row.id || rowIndex}>
                        {reportColumns.map((column) => <td key={column}>{row[column] ?? "-"}</td>)}
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={Math.max(1, reportColumns.length)}>No records found.</td></tr>
                  )}
                </tbody>
              </table>
              <footer><span>{saved.footerText || "Powered by Smart Office"}</span>{saved.showTimestamp && <span>{new Date().toLocaleString()}</span>}</footer>
            </article>
          </main>
        </div>
      </section>
    </div>
  );
}

function StandardControl({ title, values, value, onChange }) {
  return (
    <>
      <h4>{title}</h4>
      <div className="standard-print-choices">
        {values.map((item) => (
          <button type="button" className={value === item ? "active" : ""} key={item} onClick={() => onChange(item)}>
            {item}
          </button>
        ))}
      </div>
    </>
  );
}
