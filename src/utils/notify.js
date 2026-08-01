export function notify(message, type = "success") {
  window.dispatchEvent(new CustomEvent("app-notification", {
    detail: { id: Date.now(), message, type },
  }));
}
