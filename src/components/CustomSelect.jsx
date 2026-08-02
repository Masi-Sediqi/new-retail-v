import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import "./CustomSelect.css";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const selectLabelTranslations = {
  fa: {
    "All balances": "تمام بیلانس‌ها",
    "All categories": "تمام کتگوری‌ها",
    "All methods": "تمام روش‌ها",
    "All products": "تمام محصولات",
    "All statuses": "تمام وضعیت‌ها",
    "All stock": "تمام گدام",
    "All suppliers": "تمام تأمین‌کنندگان",
    "All time": "تمام زمان‌ها",
    Annual: "سالانه",
    Custom: "دلخواه",
    "Custom range": "بازه دلخواه",
    Expired: "منقضی",
    "Expiring soon": "نزدیک به انقضا",
    "In stock": "موجود",
    Monthly: "ماهانه",
    Overdue: "دیرشده",
    Paid: "پرداخت‌شده",
    Payable: "پرداختنی",
    Pending: "در انتظار",
    Receivable: "دریافتنی",
    Settled: "تصفیه‌شده",
    Today: "امروز",
    Weekly: "هفتگی",
    "Low stock": "کمبود موجودی",
    "Out of stock": "ناموجود",
  },
  ps: {
    "All balances": "ټول بیلانسونه",
    "All categories": "ټولې کټګورۍ",
    "All methods": "ټولې طریقې",
    "All products": "ټول محصولات",
    "All statuses": "ټول حالتونه",
    "All stock": "ټول ګدام",
    "All suppliers": "ټول تأمین کوونکي",
    "All time": "ټول وختونه",
    Annual: "کلنی",
    Custom: "د خوښې",
    "Custom range": "د خوښې موده",
    Expired: "تېر شوی",
    "Expiring soon": "ژر پای ته رسېږي",
    "In stock": "موجود",
    Monthly: "میاشتنی",
    Overdue: "ناوخته",
    Paid: "ورکړل شوی",
    Payable: "ورکول کېدونکی",
    Pending: "په تمه",
    Receivable: "ترلاسه کېدونکی",
    Settled: "تصفیه شوی",
    Today: "نن",
    Weekly: "اونیز",
    "Low stock": "کم موجودي",
    "Out of stock": "ناموجود",
  },
};

const normalizeLanguage = (language) => {
  const value = String(language || "en").toLowerCase();
  if (value.startsWith("fa") || value.includes("dari") || value === "prs") return "fa";
  if (value.startsWith("ps") || value.includes("pashto")) return "ps";
  return "en";
};

const currentLanguage = () => {
  if (typeof document !== "undefined" && document.documentElement?.lang) {
    return normalizeLanguage(document.documentElement.lang);
  }
  if (typeof localStorage !== "undefined") {
    return normalizeLanguage(localStorage.getItem("isp-selected-language"));
  }
  return "en";
};

const translateSelectLabel = (label) => {
  const text = String(label ?? "");
  const language = currentLanguage();
  return selectLabelTranslations[language]?.[text] || text;
};

function CustomSelect({
  ariaLabel,
  buttonClassName = "",
  className = "",
  menuClassName = "",
  onChange,
  options = [],
  value,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;

    const close = (event) => {
      if (
        rootRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 10;
      const menuWidth = Math.max(rect.width, 180);
      const naturalHeight = Math.min(options.length * 34 + 14, 224);
      const menuHeight = Math.min(menuRef.current?.offsetHeight || naturalHeight, naturalHeight);
      const below = rect.bottom + 8;
      const above = rect.top - menuHeight - 8;
      const top =
        below + menuHeight > window.innerHeight - viewportPadding &&
        above > viewportPadding
          ? above
          : below;
      const left = clamp(
        rect.left,
        viewportPadding,
        window.innerWidth - menuWidth - viewportPadding
      );
      const availableHeight =
        top < rect.top
          ? rect.top - viewportPadding - 8
          : window.innerHeight - top - viewportPadding;

      setPosition({
        left,
        maxHeight: Math.max(96, Math.min(naturalHeight, availableHeight)),
        top,
        width: menuWidth,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  const menu = (
    <div
      className={`smooth-select-menu floating-select-menu ${menuClassName} ${
        open ? "open" : ""
      }`.trim()}
      ref={menuRef}
      role="listbox"
      style={{
        ...(position || { left: -9999, top: -9999 }),
        zIndex: 2147483002,
      }}
    >
      {options.map((option) => (
        <button
          aria-selected={option.value === value}
          className={option.value === value ? "selected" : ""}
          key={option.value}
          onClick={() => {
            onChange?.(option.value);
            setOpen(false);
          }}
          role="option"
          type="button"
        >
          <span>{translateSelectLabel(option.label)}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className={`smooth-select ${className}`.trim()} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`smooth-select-btn ${buttonClassName} ${open ? "active" : ""}`.trim()}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="smooth-select-label">
          {translateSelectLabel(selected?.label || "Select")}
        </span>
        <ChevronDown className={open ? "rotate" : ""} size={16} />
      </button>
      {open && createPortal(menu, document.body)}
    </div>
  );
}

export default CustomSelect;
