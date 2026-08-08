const recentMessages = new Map();

export function notify(message, type = "success") {
  const key = `${type}:${message}`;
  const now = Date.now();
  const lastShownAt = recentMessages.get(key) || 0;

  if (now - lastShownAt < 3500) {
    return;
  }

  recentMessages.set(key, now);

  window.dispatchEvent(new CustomEvent("app-notification", {
    detail: { id: `${now}-${Math.random().toString(36).slice(2)}`, message, type },
  }));
}
