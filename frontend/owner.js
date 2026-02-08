const API_BASE = "http://localhost:5001";
const toast = {
  info: message => pushToast(message, "info"),
  success: message => pushToast(message, "success"),
  error: message => pushToast(message, "error")
};
const params = new URLSearchParams(window.location.search);
const ownerId = params.get("id");
const grid = document.getElementById("ownerPetsGrid");
const ownerNameEl = document.getElementById("ownerName");
const ownerCityEl = document.getElementById("ownerCity");
const ownerPhoneEl = document.getElementById("ownerPhone");
const ownerAvatar = document.getElementById("ownerAvatar");
const messageOwnerBtn = document.getElementById("messageOwnerBtn");
const navAuth = document.getElementById("navAuth");
const navUser = document.getElementById("navUser");
const navUsername = document.getElementById("navUsername");
const profileAvatar = document.getElementById("profileAvatar");
const logoutBtn = document.getElementById("logoutBtn");
const token = localStorage.getItem("token");

if (!ownerId) {
  grid.innerHTML = "<p>Owner not specified.</p>";
} else {
  loadOwnerProfile();
  loadOwnerPets();
}

if (token) {
  fetch(`${API_BASE}/api/users/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(user => {
      navAuth?.classList.add("hidden");
      navUser?.classList.remove("hidden");
      logoutBtn?.classList.remove("hidden");
      navUsername.textContent = user.username;
      profileAvatar.src =
        `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.username}`;
      window.ChatWidget?.setCurrentUser({
        id: user._id,
        username: user.username,
        city: user.city,
        phone: user.phone
      });
    })
    .catch(() => {
      localStorage.removeItem("token");
    });
} else {
  navAuth?.classList.remove("hidden");
  navUser?.classList.add("hidden");
  logoutBtn?.classList.add("hidden");
}

profileAvatar?.addEventListener("click", () => {
  window.location.href = "/profile.html";
});

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.ChatWidget?.setCurrentUser(null);
  window.location.href = "/";
});

function loadOwnerProfile() {
  fetch(`${API_BASE}/api/users/${ownerId}/public`)
    .then(res => {
      if (!res.ok) throw new Error("Failed to load owner");
      return res.json();
    })
    .then(owner => {
      ownerNameEl.textContent = owner.username;
      ownerCityEl.textContent = owner.city
        ? owner.city
        : "City not specified";
      ownerPhoneEl.textContent = owner.phone
        ? owner.phone
        : "Phone not provided";
      ownerAvatar.src =
        `https://api.dicebear.com/7.x/thumbs/svg?seed=${owner.username}`;

      messageOwnerBtn.addEventListener("click", () => {
        if (!window.ChatWidget) return;
        const currentUserId = localStorage.getItem("userId");
        if (currentUserId && currentUserId === ownerId) {
          toast.info("You can't message yourself.");
          return;
        }
        window.ChatWidget.open({
          id: ownerId,
          name: owner.username,
          city: owner.city,
          phone: owner.phone
        });
      });
    })
    .catch(() => {
      ownerNameEl.textContent = "Owner unavailable";
      messageOwnerBtn.disabled = true;
    });
}

function loadOwnerPets() {
  grid.innerHTML = "<p>Loading pets...</p>";
  fetch(`${API_BASE}/api/pets/owner/${ownerId}`)
    .then(res => res.json())
    .then(pets => {
      if (!pets.length) {
        grid.innerHTML = "<p class=\"empty-pets\">No pets listed yet.</p>";
        return;
      }

      grid.innerHTML = "";
      pets.forEach(pet => {
        const card = document.createElement("div");
        card.className = "pet-card";
        const img = pet.image
          ? (pet.image.startsWith("http")
            ? pet.image
            : `${API_BASE}${pet.image}`)
          : "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600";

        card.innerHTML = `
          <img src="${img}" onerror="this.src='${img}'">
          <h3>${pet.name}</h3>
          <p>${pet.age || "?"} years • ${pet.type}</p>
          <button class="secondary-btn" disabled>
            ${pet.status === "adopted" ? "Adopted ✅" : "Available"}
          </button>
        `;

        grid.appendChild(card);
      });
    })
    .catch(() => {
      grid.innerHTML = "<p class=\"empty-pets\">Failed to load pets.</p>";
    });
}

function pushToast(message, type = "info") {
  const fn =
    type === "success"
      ? window.notifySuccess || window.notify
      : type === "error"
        ? window.notifyError || window.notify
        : window.notifyInfo || window.notify;
  if (fn) {
    fn(message, { skipHistory: true, type });
  } else if (type === "error") {
    console.error(message);
  } else {
    console.log(message);
  }
}
