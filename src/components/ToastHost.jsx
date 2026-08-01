import { useEffect, useState } from "react";

function ToastHost() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const showMessage = (event) => {
      const message = event.detail;
      setMessages((current) => [...current, message]);
      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== message.id));
      }, 3500);
    };

    window.addEventListener("app-notification", showMessage);
    return () => window.removeEventListener("app-notification", showMessage);
  }, []);

  return (
    <div className="toast-host" aria-live="polite">
      {messages.map((message) => (
        <div key={message.id} className={`app-toast ${message.type}`}>
          <span>{message.type === "error" ? "!" : "✓"}</span>
          <p>{message.message}</p>
        </div>
      ))}
    </div>
  );
}

export default ToastHost;
