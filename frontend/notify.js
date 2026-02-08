(function () {
  const DEFAULT_DURATION = 4200;
  const TYPES = ["info", "success", "error"];
  let container = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
    return container;
  }

  function sanitize(message) {
    if (typeof message === "string") return message;
    if (message && message.message) return String(message.message);
    return String(message ?? "");
  }

  function notify(message, options = {}) {
    const text = sanitize(message).trim();
    if (!text) return;

    const type = TYPES.includes(options.type) ? options.type : "info";
    const duration = Number.isFinite(options.duration)
      ? Math.max(1000, options.duration)
      : DEFAULT_DURATION;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = text;

    const closeBtn = document.createElement("span");
    closeBtn.className = "toast-close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => dismissToast(toast));
    toast.appendChild(closeBtn);

    ensureContainer().appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));

    const timeoutId = setTimeout(() => dismissToast(toast), duration);
    toast.dataset.timeoutId = timeoutId;
  }

  function dismissToast(toast) {
    if (!toast || toast.classList.contains("hiding")) return;
    toast.classList.add("hiding");
    const timeoutId = toast.dataset.timeoutId;
    if (timeoutId) clearTimeout(Number(timeoutId));
    setTimeout(() => toast.remove(), 250);
  }

  window.notify = notify;
  window.notifyInfo = (message, opts = {}) =>
    notify(message, { ...opts, type: "info" });
  window.notifySuccess = (message, opts = {}) =>
    notify(message, { ...opts, type: "success" });
  window.notifyError = (message, opts = {}) =>
    notify(message, { ...opts, type: "error" });
})();
