import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

function ConfirmDialogHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const openDialog = (event) => {
      setDialog(event.detail);
    };

    window.addEventListener("app-confirm-request", openDialog);
    return () => window.removeEventListener("app-confirm-request", openDialog);
  }, []);

  if (!dialog) return null;

  const close = (answer) => {
    dialog.resolve?.(answer);
    setDialog(null);
  };

  return (
    <div className="app-confirm-overlay" role="presentation">
      <section className="app-confirm-modal" role="dialog" aria-modal="true">
        <div className={`app-confirm-icon ${dialog.tone || "danger"}`}>
          <AlertTriangle size={23} />
        </div>
        <div className="app-confirm-content">
          <h2>{dialog.title || "Confirm Action"}</h2>
          <p>{dialog.message || "Are you sure you want to continue?"}</p>
        </div>
        <div className="app-confirm-actions">
          <button type="button" className="app-confirm-cancel" onClick={() => close(false)}>
            {dialog.cancelText || "Cancel"}
          </button>
          <button type="button" className="app-confirm-danger" onClick={() => close(true)}>
            {dialog.confirmText || "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmDialogHost;
