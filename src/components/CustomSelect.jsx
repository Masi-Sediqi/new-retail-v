import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import "./CustomSelect.css";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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
          <span>{option.label}</span>
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
        <span className="smooth-select-label">{selected?.label || "Select"}</span>
        <ChevronDown className={open ? "rotate" : ""} size={16} />
      </button>
      {open && createPortal(menu, document.body)}
    </div>
  );
}

export default CustomSelect;
