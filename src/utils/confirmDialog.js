export function confirmAction(options) {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("app-confirm-request", {
        detail: {
          title: "Confirm Action",
          message: "Are you sure you want to continue?",
          confirmText: "Confirm",
          cancelText: "Cancel",
          tone: "danger",
          ...options,
          resolve,
        },
      })
    );
  });
}
