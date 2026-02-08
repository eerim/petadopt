(function () {
  const API_BASE =
    window.location.origin.includes("localhost")
      ? "http://localhost:5001"
      : window.location.origin;
  const FLOATING_SELECTOR = ".notification-toggle";

  let currentUser = null;
  let threads = [];
  let overlay;
  let modal;
  let messagesEl;
  let inputEl;
  let headerNameEl;
  let headerMetaEl;
  let hintEl;
  let inboxBtn;
  let panel;
  let panelListEl;
  let panelEmptyEl;
  let badgeEl;
  let activeThread = null;

  const noopToast = (message, type = "info") => {
    const fallback = type === "success"
      ? window.notifySuccess || window.notify
      : type === "error"
        ? window.notifyError || window.notify
        : window.notifyInfo || window.notify;
    if (fallback) {
      fallback(message, { skipHistory: true, type });
    } else if (type === "error") {
      console.error(message);
    } else {
      console.log(message);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    ensureOverlay();
    ensureInboxPanel();
    initNavToggle();
  });

  function getToken() {
    return localStorage.getItem("token");
  }

  function initNavToggle() {
    const toggles = document.querySelectorAll(".nav-toggle");
    toggles.forEach(btn => {
      const navbar = btn.closest(".navbar");
      if (!navbar) return;
      btn.addEventListener("click", evt => {
        evt.stopPropagation();
        navbar.classList.toggle("nav-open");
      });
    });

    document.addEventListener("click", evt => {
      if (!evt.target.closest(".navbar")) {
        document
          .querySelectorAll(".navbar.nav-open")
          .forEach(nav => nav.classList.remove("nav-open"));
      }
    });
  }

  async function apiRequest(path, options = {}) {
    const token = getToken();
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const error = new Error(data.message || "Request failed");
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "chat-overlay";
    overlay.innerHTML = `
      <div class="chat-modal">
        <div class="chat-header">
          <div class="chat-header-info">
            <h3 id="chatOwnerName">Pet Owner</h3>
            <p id="chatOwnerMeta"></p>
          </div>
          <button class="chat-close-btn" aria-label="Close chat">×</button>
        </div>
        <p class="chat-hint"></p>
        <div class="chat-messages"></div>
        <form class="chat-form">
          <input type="text" placeholder="Write a message..." required />
          <button type="submit" class="primary-btn">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    modal = overlay.querySelector(".chat-modal");
    messagesEl = overlay.querySelector(".chat-messages");
    inputEl = overlay.querySelector(".chat-form input");
    headerNameEl = overlay.querySelector("#chatOwnerName");
    headerMetaEl = overlay.querySelector("#chatOwnerMeta");
    hintEl = overlay.querySelector(".chat-hint");

    overlay.addEventListener("click", evt => {
      if (evt.target === overlay) closeChat();
    });
    overlay.querySelector(".chat-close-btn")
      .addEventListener("click", closeChat);
    overlay.querySelector(".chat-form").addEventListener("submit", evt => {
      evt.preventDefault();
      const text = inputEl.value.trim();
      if (!text || !activeThread || !currentUser) return;
      sendMessage(activeThread.counterpart, text);
    });
  }

  function ensureInboxPanel() {
    if (document.querySelector(FLOATING_SELECTOR)) return;

    inboxBtn = document.createElement("button");
    inboxBtn.className = "notification-toggle";
    inboxBtn.type = "button";
    inboxBtn.innerHTML = `
      Messages <span class="notification-count hidden"></span>
    `;
    document.body.appendChild(inboxBtn);

    badgeEl = inboxBtn.querySelector(".notification-count");
    inboxBtn.addEventListener("click", () => {
      panel.classList.toggle("open");
    });

    panel = document.createElement("div");
    panel.className = "notification-panel";
    panel.innerHTML = `
      <div class="notification-panel-header">
        <div>
          <h3>Messages</h3>
          <p>Chat with pet owners and adopters</p>
        </div>
        <button class="notification-close" aria-label="Close messages">×</button>
      </div>
      <div class="notification-content">
        <div class="notification-empty">No conversations yet</div>
        <div class="notification-list"></div>
      </div>
    `;
    document.body.appendChild(panel);

    panelListEl = panel.querySelector(".notification-list");
    panelEmptyEl = panel.querySelector(".notification-empty");

    panel.querySelector(".notification-close").addEventListener("click", () => {
      panel.classList.remove("open");
    });

    document.addEventListener("keydown", evt => {
      if (evt.key === "Escape") {
        closeChat();
        panel.classList.remove("open");
      }
    });
  }

  function setCurrentUser(user) {
    if (!user || !user.id) {
      currentUser = null;
      threads = [];
      renderThreadList();
      return;
    }
    currentUser = {
      id: String(user.id),
      name: user.username || user.name || "You",
      city: user.city || "",
      phone: user.phone || ""
    };
    refreshThreads();
  }

  async function refreshThreads(showErrors = false) {
    if (!currentUser || !getToken()) {
      threads = [];
      renderThreadList();
      return;
    }
    try {
      const data = await apiRequest("/api/messages/threads");
      threads = data.map(item => ({
        id: item.counterpart.id,
        counterpart: { ...item.counterpart },
        lastMessage: item.lastMessage || null,
        unread: item.unread || 0,
        messages: [],
        messagesLoaded: false
      }));
      renderThreadList();
    } catch (err) {
      if (showErrors) {
        noopToast(err.message || "Failed to load messages", "error");
      }
      console.error(err);
    }
  }

  function getThreadFor(counterpart, store = threads) {
    return store.find(t => t.id === counterpart.id);
  }

  function ensureThread(counterpart, store = threads) {
    let thread = getThreadFor(counterpart, store);
    if (!thread) {
      thread = {
        id: counterpart.id,
        counterpart: { ...counterpart },
        lastMessage: null,
        unread: 0,
        messages: [],
        messagesLoaded: false
      };
      store.push(thread);
    } else {
      thread.counterpart = { ...thread.counterpart, ...counterpart };
    }
    return thread;
  }

  async function sendMessage(counterpart, text) {
    if (!currentUser) return;
    if (!getToken()) {
      noopToast("Login again to send messages", "info");
      return;
    }
    const thread = ensureThread(counterpart);
    try {
      const response = await apiRequest(`/api/messages/${counterpart.id}`, {
        method: "POST",
        body: JSON.stringify({ text })
      });
      const message = mapMessage({
        id: response.id,
        text: response.text,
        timestamp: response.timestamp,
        authorId: response.authorId
      });
      thread.messages = thread.messages || [];
      thread.messages.push(message);
      thread.messagesLoaded = true;
      thread.lastMessage = {
        text: message.text,
        timestamp: message.timestamp,
        authorId: message.authorId
      };
      thread.unread = 0;
      renderThread(thread);
      renderThreadList();
      inputEl.value = "";
      noopToast(`Message sent to ${counterpart.name}`, "success");
    } catch (err) {
      noopToast(err.message || "Failed to send message", "error");
    }
  }

  async function openChat(counterpart) {
    if (!currentUser) {
      noopToast("Login to send messages", "info");
      return;
    }
    ensureOverlay();
    const thread = ensureThread(counterpart);
    activeThread = thread;
    overlay.classList.add("open");
    document.body.classList.add("chat-open");
    panel?.classList.remove("open");
    await maybeLoadThreadMessages(thread);
    renderThread(thread);
    markThreadRead(thread.id);
    setTimeout(() => inputEl.focus(), 50);
  }

  async function maybeLoadThreadMessages(thread) {
    if (thread.messagesLoaded || !getToken()) return;
    try {
      const data = await apiRequest(`/api/messages/with/${thread.id}`);
      thread.messages = data.map(mapMessage);
      thread.messagesLoaded = true;
      thread.unread = 0;
      if (thread.messages.length) {
        const last = thread.messages[thread.messages.length - 1];
        thread.lastMessage = {
          text: last.text,
          timestamp: last.timestamp,
          authorId: last.authorId
        };
      }
      renderThreadList();
    } catch (err) {
      noopToast(err.message || "Failed to load conversation", "error");
    }
  }

  function mapMessage(payload) {
    const timestamp = new Date(payload.timestamp).getTime();
    const direction =
      payload.authorId === currentUser?.id ? "outgoing" : "incoming";
    return {
      id: payload.id,
      text: payload.text,
      timestamp,
      direction,
      authorId: payload.authorId,
      read: true
    };
  }

  function closeChat() {
    overlay?.classList.remove("open");
    document.body.classList.remove("chat-open");
    activeThread = null;
  }

  function renderThread(thread) {
    if (!thread) return;
    headerNameEl.textContent = thread.counterpart.name || "Pet Owner";
    const city = thread.counterpart.city || "City not specified";
    const phone = thread.counterpart.phone || "Phone not provided";
    headerMetaEl.textContent = `${city} • ${phone}`;
    hintEl.textContent =
      "Messages sync with your account. Follow up with a call or DM if it’s urgent.";

    messagesEl.innerHTML = "";
    const list = thread.messages || [];
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "chat-message them";
      empty.textContent =
        "Start the conversation by introducing yourself and the pet you're interested in";
      messagesEl.appendChild(empty);
    } else {
      list.forEach(msg => {
        const bubble = document.createElement("div");
        bubble.className =
          `chat-message ${msg.direction === "incoming" ? "them" : "me"}`;
        bubble.textContent = msg.text;
        messagesEl.appendChild(bubble);
      });
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderThreadList() {
    if (!panelListEl) return;
    const sorted = threads
      .map(thread => ({
        ...thread,
        preview: thread.lastMessage
          ? `${thread.lastMessage.authorId === currentUser?.id ? "You: " : ""}${thread.lastMessage.text}`
          : "No messages yet",
        time: thread.lastMessage ? formatTime(thread.lastMessage.timestamp) : ""
      }))
      .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));

    panelListEl.innerHTML = "";
    if (!sorted.length) {
      panelEmptyEl?.classList.remove("hidden");
    } else {
      panelEmptyEl?.classList.add("hidden");
    }

    sorted.forEach(thread => {
      const item = document.createElement("div");
      item.className = "notification-entry chat-thread";
      item.dataset.threadId = thread.id;
      item.innerHTML = `
        <div class="notification-entry-header">
          <span class="notification-author">${thread.counterpart.name}</span>
          <span class="notification-time">${thread.time}</span>
        </div>
        <p class="notification-message">${thread.preview}</p>
        ${thread.unread ? `<span class="notification-badge">${thread.unread}</span>` : ""}
      `;
      item.addEventListener("click", () => openChat(thread.counterpart));
      panelListEl.appendChild(item);
    });

    const unreadTotal = sorted.reduce((sum, t) => sum + (t.unread || 0), 0);
    updateBadge(unreadTotal);
  }

  function updateBadge(count) {
    if (!badgeEl) return;
    if (!count) {
      badgeEl.textContent = "";
      badgeEl.classList.add("hidden");
    } else {
      badgeEl.textContent = count > 99 ? "99+" : String(count);
      badgeEl.classList.remove("hidden");
    }
  }

  function markThreadRead(threadId) {
    if (!threadId) return;
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    thread.unread = 0;
    renderThreadList();
  }

  function formatTime(ts) {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric"
    });
  }

  window.ChatWidget = {
    setCurrentUser,
    open: openChat,
    refresh: () => refreshThreads(true)
  };
})();
