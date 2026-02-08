(function () {
  const STORE_PREFIX = "chat_store_v2_";
  const FLOATING_SELECTOR = ".notification-toggle";

  let currentUser = null;
  let storageKey = null;
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
  });

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
      storageKey = null;
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
    storageKey = STORE_PREFIX + currentUser.id;
    threads = loadThreads(storageKey);
    renderThreadList();
  }

  function loadThreads(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveThreads(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
    }
  }

  function getThreadFor(counterpart, store = threads) {
    return store.find(t => t.id === counterpart.id);
  }

  function ensureThread(store, counterpart) {
    let thread = getThreadFor(counterpart, store);
    if (!thread) {
      thread = {
        id: counterpart.id,
        counterpart: { ...counterpart },
        messages: []
      };
      store.push(thread);
    } else {
      thread.counterpart = { ...thread.counterpart, ...counterpart };
    }
    return thread;
  }

  function sendMessage(counterpart, text) {
    if (!currentUser) return;
    const message = {
      id: crypto.randomUUID?.() || String(Date.now()),
      authorId: currentUser.id,
      authorName: currentUser.name,
      text,
      timestamp: Date.now(),
      direction: "outgoing",
      read: true
    };

    appendMessageTo(currentUser.id, counterpart, message);

    if (counterpart.id) {
      const recipientMessage = {
        ...message,
        direction: "incoming",
        read: false
      };
      appendMessageTo(counterpart.id, currentUser, recipientMessage);
    }

    inputEl.value = "";
    noopToast(`Message sent to ${counterpart.name}`, "success");
  }

  function appendMessageTo(userId, counterpart, message) {
    const key = STORE_PREFIX + userId;
    const isCurrent = currentUser && userId === currentUser.id;
    const store = isCurrent ? threads : loadThreads(key);
    const thread = ensureThread(store, counterpart);
    thread.messages.push(message);

    if (isCurrent) {
      saveThreads(storageKey, store);
      renderThreadList();
      if (activeThread && activeThread.id === thread.id) {
        renderThread(thread);
      }
    } else {
      saveThreads(key, store);
    }
  }

  function openChat(counterpart) {
    if (!currentUser) {
      noopToast("Login to send messages", "info");
      return;
    }
    ensureOverlay();
    const thread = ensureThread(threads, counterpart);
    activeThread = thread;
    renderThread(thread);
    overlay.classList.add("open");
    document.body.classList.add("chat-open");
    panel?.classList.remove("open");
    markThreadRead(thread.id);
    setTimeout(() => inputEl.focus(), 50);
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
      "Messages sync only on this device. Use phone or social to make sure the owner sees it";

    messagesEl.innerHTML = "";
    if (!thread.messages.length) {
      const empty = document.createElement("div");
      empty.className = "chat-message them";
      empty.textContent =
        "Start the conversation by introducing yourself and the pet you're interested in";
      messagesEl.appendChild(empty);
    } else {
      thread.messages.forEach(msg => {
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
        lastMessage: thread.messages[thread.messages.length - 1] || null,
        unread: thread.messages.filter(
          msg => msg.direction === "incoming" && !msg.read
        ).length
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
      const preview = thread.lastMessage
        ? `${thread.lastMessage.authorId === currentUser?.id ? "You: " : ""}${thread.lastMessage.text}`
        : "No messages yet";
      const timeLabel = thread.lastMessage
        ? formatTime(thread.lastMessage.timestamp)
        : "";
      item.innerHTML = `
        <div class="notification-entry-header">
          <span class="notification-author">${thread.counterpart.name}</span>
          <span class="notification-time">${timeLabel}</span>
        </div>
        <p class="notification-message">${preview}</p>
        ${thread.unread ? `<span class="notification-badge">${thread.unread}</span>` : ""}
      `;
      item.addEventListener("click", () => openChat(thread.counterpart));
      panelListEl.appendChild(item);
    });

    const unreadTotal = sorted.reduce((sum, t) => sum + t.unread, 0);
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
    let changed = false;
    thread.messages.forEach(msg => {
      if (msg.direction === "incoming" && !msg.read) {
        msg.read = true;
        changed = true;
      }
    });
    if (changed) {
      saveThreads(storageKey, threads);
      renderThreadList();
    }
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
    open: openChat
  };
})();
