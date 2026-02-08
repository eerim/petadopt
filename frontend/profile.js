const API_BASE = "http://localhost:5001";
const token = localStorage.getItem("token");
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop";

const toast = {
  info: message => showToast(message, "info"),
  success: message => showToast(message, "success"),
  error: message => showToast(message, "error")
};

function showToast(message, type = "info") {
  const map = {
    info: window.notifyInfo,
    success: window.notifySuccess,
    error: window.notifyError
  };
  const fn = map[type] || window.notify;
  if (fn) {
    fn(message, { type });
  } else if (type === "error") {
    console.error(message);
  } else {
    console.log(message);
  }
}

if (!token) {
  toast.info("Please login first");
  window.location.href = "/";
}

const phoneDisplay = document.getElementById("phoneDisplay");
const cityDisplay = document.getElementById("cityDisplay");
const phoneInput = document.getElementById("profilePhone");
const cityInput = document.getElementById("profileCity");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileStatus = document.getElementById("profileStatus");

fetch(`${API_BASE}/api/users/profile`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(user => {
    const usernameEl = document.getElementById("username");
    const emailEl = document.getElementById("email");
    const avatarEl = document.getElementById("avatar");

    if (usernameEl) usernameEl.textContent = user.username;
    if (emailEl) emailEl.textContent = user.email;
    if (user?._id) {
      localStorage.setItem("userId", user._id);
    }
    if (phoneDisplay) {
      phoneDisplay.textContent =
        `Phone: ${user.phone?.trim() ? user.phone : "—"}`;
    }
    if (cityDisplay) {
      cityDisplay.textContent =
        `City: ${user.city?.trim() ? user.city : "—"}`;
    }

    if (phoneInput) phoneInput.value = user.phone || "";
    if (cityInput) cityInput.value = user.city || "";

    if (avatarEl) {
      avatarEl.src =
        `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.username}`;
    }
    window.ChatWidget?.setCurrentUser({
      id: user._id,
      username: user.username,
      city: user.city,
      phone: user.phone
    });
  })
  .catch(err => {
    console.error(err);
    toast.error("Failed to load profile");
  });

saveProfileBtn?.addEventListener("click", async () => {
  if (!phoneInput || !cityInput) return;

  if (profileStatus) {
    profileStatus.textContent = "Saving...";
  }
  saveProfileBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        phone: phoneInput.value.trim(),
        city: cityInput.value.trim()
      })
    });

    if (!res.ok) {
      throw new Error("Failed to update profile");
    }

    const updated = await res.json();
    if (phoneDisplay) {
      phoneDisplay.textContent =
        `Phone: ${updated.phone?.trim() ? updated.phone : "—"}`;
    }
    if (cityDisplay) {
      cityDisplay.textContent =
        `City: ${updated.city?.trim() ? updated.city : "—"}`;
    }

    if (profileStatus) {
      profileStatus.textContent = "Saved ✅";
      setTimeout(() => {
        profileStatus.textContent = "";
      }, 2500);
    }
    toast.success("Contact info updated");
  } catch (err) {
    console.error(err);
    if (profileStatus) {
      profileStatus.textContent = "Error saving profile";
    }
    toast.error("Failed to update profile");
  } finally {
    saveProfileBtn.disabled = false;
  }
});

fetch(`${API_BASE}/api/adoptions/my`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
})
  .then(res => res.json())
  .then(requests => {
    renderAdoptedPets(requests);
    renderMyRequests(requests);
  })
  .catch(err => console.error(err));

const favoritesGrid = document.getElementById("favoritesGrid");
const userId = localStorage.getItem("userId");
const favoritesKey = userId ? `favorites_${userId}` : null;
let favorites = [];

if (favoritesKey) {
  try {
    favorites = JSON.parse(localStorage.getItem(favoritesKey)) || [];
  } catch {
    favorites = [];
  }
}

renderFavorites();

function renderFavorites() {
  if (!favoritesGrid) return;

  favoritesGrid.innerHTML = "";

  if (!favorites.length) {
    favoritesGrid.innerHTML = `
      <p class="empty-pets">
        Favorites list is empty.<br />
        Tap the heart on any pet in Home to save it here.
      </p>
    `;
    return;
  }

  favorites.forEach(fav => {
    const ageLabel = fav.age ? `${fav.age} years` : "Age unknown";
    const typeLabel = fav.type || "Pet";
    const imgSrc = resolveFavoriteImage(fav.image);
    const { html: ownerHtml, ownerData } = buildFavoriteOwnerSection(fav);
    const card = document.createElement("div");
    card.className = "pet-card";
    card.innerHTML = `
      <div class="pet-card-header">
        <h3>${fav.name || "Unnamed friend"}</h3>
        <button type="button" class="heart">❤️</button>
      </div>
      <img src="${imgSrc}" onerror="this.src='${FALLBACK_IMAGE}'">
      <p>${ageLabel} • ${typeLabel}</p>
      ${ownerHtml}
    `;

    const heart = card.querySelector(".heart");
    heart?.addEventListener("click", evt => {
      evt.preventDefault();
      removeFavorite(fav.id);
    });

    attachFavoriteChatTriggers(card, ownerData);
    favoritesGrid.appendChild(card);
  });
}

function resolveFavoriteImage(imagePath = "") {
  if (!imagePath) return FALLBACK_IMAGE;
  return imagePath.startsWith("http")
    ? imagePath
    : `${API_BASE}${imagePath}`;
}

function buildFavoriteOwnerSection(fav) {
  const ownerId = fav.ownerId;
  const ownerName = fav.owner?.trim() || "Pet owner";
  const city = fav.city?.trim() || "City not specified";
  const phone = fav.phone?.trim() || "Phone not provided";
  const canMessage =
    ownerId && userId && String(ownerId) !== String(userId);

  const nameClass = canMessage
    ? "owner-name owner-chat-trigger"
    : "owner-name";

  const profileLinkMarkup = ownerId
    ? `<a class="owner-profile-link" href="/owner.html?id=${ownerId}">View profile →</a>`
    : "";

  const buttonMarkup = canMessage
    ? `<button type="button" class="owner-chat-btn">Message</button>`
    : "";

  return {
    html: `
      <div class="pet-owner">
        <div>
          <p class="${nameClass}">${ownerName}</p>
          <p class="owner-meta">${city}</p>
          <p class="owner-meta">${phone}</p>
          ${profileLinkMarkup}
        </div>
        ${buttonMarkup}
      </div>
    `,
    ownerData: canMessage
      ? { id: String(ownerId), name: ownerName, city, phone }
      : null
  };
}

function attachFavoriteChatTriggers(card, ownerData) {
  if (!ownerData || !window.ChatWidget) return;
  const triggers = card.querySelectorAll(".owner-chat-btn, .owner-chat-trigger");
  triggers.forEach(trigger => {
    trigger.addEventListener("click", evt => {
      evt.preventDefault();
      window.ChatWidget.open(ownerData);
    });
  });
}

function removeFavorite(petId) {
  favorites = favorites.filter(fav => fav.id !== petId);
  persistFavorites();
  renderFavorites();
  toast.info("Removed from favorites");
}

function persistFavorites() {
  if (!favoritesKey) return;
  localStorage.setItem(favoritesKey, JSON.stringify(favorites));
}

function renderAdoptedPets(requests) {
  const grid = document.getElementById("myPetsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const approved = (requests || []).filter(r => r.status === "approved");
  if (!approved.length) {
    grid.innerHTML = `
      <p class="empty-pets">
        You haven't adopted any pets yet 🐾<br>
        <span>Go to Home and find your new friend ✨</span>
      </p>
    `;
    return;
  }

  approved.forEach(a => {
    const pet = a.petId;
    if (!pet) return;
    const card = document.createElement("div");
    card.className = "pet-card";

    const img = pet.image?.startsWith("http")
      ? pet.image
      : pet.image
        ? `${API_BASE}${pet.image}`
        : "https://placekitten.com/300/220";

    card.innerHTML = `
      <img src="${img}">
      <h4>${pet.name}</h4>
      <p>${pet.type}</p>
    `;

    grid.appendChild(card);
  });
}

function renderMyRequests(requests) {
  const list = document.getElementById("myRequestsList");
  if (!list) return;

  const pending = (requests || []).filter(r => r.status !== "approved");
  if (!pending.length) {
    list.innerHTML = "<p class=\"request-note\">No pending requests.</p>";
    return;
  }

  list.innerHTML = "";
  pending.forEach(req => {
    const pet = req.petId;
    if (!pet) return;
    const card = document.createElement("div");
    card.className = `request-card ${req.status}`;
    card.innerHTML = `
      <div class="request-info">
        <strong>${pet.name}</strong>
        <span>Status: ${req.status}</span>
      </div>
    `;
    list.appendChild(card);
  });
}

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem("token");
    window.ChatWidget?.setCurrentUser(null);
    window.location.href = "/";
  };
}