import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./FloatingActionMenu.css";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function FloatingActionMenu({ actions = [], ariaLabel, className = "", width = 176 }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 12;
      const menuHeight = menuRef.current?.offsetHeight || Math.min(actions.length * 38 + 18, 280);
      const below = rect.bottom + 8;
      const above = rect.top - menuHeight - 8;
      const top =
        below + menuHeight > window.innerHeight - viewportPadding &&
        above > viewportPadding
          ? above
          : below;
      const preferredLeft = rect.right - width;
      const left = clamp(
        preferredLeft,
        viewportPadding,
        window.innerWidth - width - viewportPadding
      );

      setPosition({ left, top, width });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [actions.length, open, width]);

  useEffect(() => {
    if (!open) return undefined;

    const close = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const runAction = (action) => {
    setOpen(false);
    action.onClick?.();
  };

  return (
    <div className="row-actions">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="dots-btn"
        onClick={() => setOpen((current) => !current)}
        ref={buttonRef}
        type="button"
      >
        ...
      </button>
      {open &&
        createPortal(
          <div
            className={`row-action-menu floating-row-action-menu ${className}`.trim()}
            ref={menuRef}
            role="menu"
            style={position || { left: -9999, top: -9999, width }}
          >
            {actions.map((action) => (
              <button
                className={action.danger ? "danger" : action.className || ""}
                key={action.label}
                onClick={() => runAction(action)}
                role="menuitem"
                type="button"
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

export default FloatingActionMenu;
