const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop";

const SAMPLE_CAT_NAMES = [
  "Milo", "Luna", "Oliver", "Bella", "Leo", "Chloe"
];

const SAMPLE_DOG_NAMES = [
  "Buddy", "Charlie", "Max", "Lucy", "Daisy", "Cooper"
];

const GEO_IP_URL = "https://ipapi.co/json/";
const GEO_REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";


const API_BASE = "https://petadopt-x17x.onrender.com";
const token = localStorage.getItem("token");
const petGrid = document.getElementById("petGrid");
const loadMoreBtn = document.getElementById("loadMore");
const petFilterButtons =document.querySelectorAll(".pet-switch button[data-filter]");
const searchInput = document.getElementById("searchPets");
const cityInput = document.getElementById("filterCity");
const availableCheckbox = document.getElementById("filterAvailable");
const sortSelect = document.getElementById("sortPets");

let allPets = [];
let currentFilter = "all";
let currentLimit = 9;
let petsReady = false;
let placeholderMode = false;
let searchQuery = "";
let cityFilter = "";
let availableOnly = false;
let sortOption = "newest";
let userRequests = [];
let userRequestsReady = false;

const toast = {
  info: message => showToast(message, "info"),
  success: message => showToast(message, "success"),
  error: message => showToast(message, "error")
};

function showToast(message, type = "info") {
  const fn = window.notify
    ? window.notify
    : msg => console.log(`[${type}] ${msg}`);
  fn(message, { type });
}
petFilterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const filter = btn.dataset.filter;
    if (!filter || filter === currentFilter) return;
    currentFilter = filter;
    setActiveFilterButton(filter);
    renderFilteredPets({ resetLimit: true });
  });
});

searchInput?.addEventListener("input", evt => {
  searchQuery = evt.target.value.trim().toLowerCase();
  renderFilteredPets({ resetLimit: true });
});

cityInput?.addEventListener("input", evt => {
  cityFilter = evt.target.value.trim().toLowerCase();
  renderFilteredPets({ resetLimit: true });
});

availableCheckbox?.addEventListener("change", evt => {
  availableOnly = evt.target.checked;
  renderFilteredPets({ resetLimit: true });
});

sortSelect?.addEventListener("change", evt => {
  sortOption = evt.target.value;
  renderFilteredPets({ resetLimit: false });
});

const viewPetsBtn = document.querySelector(".primary-btn");
if (viewPetsBtn) {
  viewPetsBtn.addEventListener("click", () => {
    document.getElementById("pets")?.scrollIntoView({ behavior: "smooth" });
  });
}

const modal = document.getElementById("authModal");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const closeModal = document.getElementById("closeModal");
const modalTitle = document.getElementById("modalTitle");
const submitBtn = document.getElementById("submitAuth");

if (loginBtn)
  loginBtn.onclick = () => {
    modalTitle.textContent = "Sign In";
    modal.classList.remove("hidden");
  };

if (registerBtn)
  registerBtn.onclick = () => {
    modalTitle.textContent = "Sign Up";
    modal.classList.remove("hidden");
  };

if (closeModal)
  closeModal.onclick = () => modal.classList.add("hidden");

/* login n reg*/
if (submitBtn) {
  submitBtn.addEventListener("click", async () => {
    const mode = modalTitle.textContent;

    const username = document.getElementById("authUsername")?.value;
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;

    const url =
      mode === "Sign Up"
        ? `${API_BASE}/api/auth/register`
        : `${API_BASE}/api/auth/login`;

    const body =
      mode === "Sign Up"
        ? { username, email, password }
        : { email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Authentication failed");
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        toast.success("Signed in successfully");
        location.reload();
      } else {
        toast.success("Registration complete! Please sign in.");
        modal.classList.add("hidden");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  });
}

/*nav*/
const navAuth = document.getElementById("navAuth");
const navUser = document.getElementById("navUser");
const navUsername = document.getElementById("navUsername");
const logoutBtn = document.getElementById("logoutBtn");
const profileAvatar = document.getElementById("profileAvatar");

if (!token) {
  navAuth?.classList.remove("hidden"); //sign in /sign up
  navUser?.classList.add("hidden");    //User +logout
}

if (token) {
  fetch(`${API_BASE}/api/users/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(user => {
      localStorage.setItem("userId", user._id);
      updateNavbar(user);
      window.ChatWidget?.setCurrentUser({
        id: user._id,
        username: user.username,
        city: user.city,
        phone: user.phone
      });
      loadMyRequests();
    })
    .catch(() => localStorage.removeItem("token"));
}

if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.ChatWidget?.setCurrentUser(null);
    location.reload();
  };
}

if (profileAvatar) {
  profileAvatar.onclick = () => {
    window.location.href = "/profile.html";
  };
}

function updateNavbar(user) {
  if (!navAuth || !navUser) return;
  navAuth.classList.add("hidden");
  navUser.classList.remove("hidden");
  navUsername.textContent = user.username;
  profileAvatar.src =
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.username}`;
}

function renderPets(pets) {
  if (!petGrid) return;

  petGrid.innerHTML = "";
  const favorites = getFavorites();

  pets.forEach(pet => {
    const isPlaceholder = Boolean(pet.isPlaceholder);
    const imageSrc = resolveImageSrc(pet.image);
    const ageLabel = pet.age ? `${pet.age} years` : "Age unknown";
    const typeLabel = pet.type || "Pet";
    const { html: ownerMarkup, ownerData } = buildOwnerInfo(pet, isPlaceholder);
    const card = document.createElement("div");
    card.className = "pet-card";

    card.innerHTML = `
      <div class="pet-card-header">
        <h3>${pet.name || "Unnamed friend"}</h3>
        <span class="heart">🤍</span>
      </div>
      <img src="${imageSrc}" onerror="this.src='${FALLBACK_IMAGE}'">
      <p>${ageLabel} • ${typeLabel}</p>
      ${ownerMarkup}
      <button class="secondary-btn adopt-btn">
        ${
  isPlaceholder
    ? "Sample pet"
    : pet.status === "adopted"
      ? "Adopted ✅"
      : "Adopt"
}
      </button>
      <p class="request-note"></p>
    `;

    const heart = card.querySelector(".heart");
    if (!isPlaceholder) {
      const isFavorited = favorites.some(fav => fav.id === pet._id);
      if (isFavorited) {
        heart.textContent = "❤️";
      }
      heart.onclick = () => toggleFavorite(pet, heart, favorites);
    } else {
      heart.style.cursor = "default";
      heart.onclick = () =>
        toast.info("This is a demo pet. Add a real listing on the Listings page.");
    }

    const btn = card.querySelector(".adopt-btn");
    const requestNote = card.querySelector(".request-note");
    const myRequest = token ? getRequestForPet(pet._id) : null;

    if (isPlaceholder) {
      btn.disabled = true;
      btn.classList.add("adopted");
      requestNote.textContent = "";
    } else if (pet.status === "adopted" && (!myRequest || myRequest.status !== "approved")) {
      btn.disabled = true;
      btn.classList.add("adopted");
      btn.textContent = "Adopted ✅";
      requestNote.textContent = "";
    } else if (myRequest?.status === "pending") {
      btn.disabled = true;
      btn.textContent = "Pending approval";
      requestNote.textContent = "The owner will respond soon";
    } else if (myRequest?.status === "approved") {
      btn.disabled = true;
      btn.classList.add("adopted");
      btn.textContent = "Approved 🎉";
      requestNote.textContent = "Connect with the owner via Messages";
    } else {
      btn.disabled = false;
      btn.classList.remove("adopted");
      btn.textContent = myRequest?.status === "declined" ? "Request again" : "Request adoption";
      requestNote.textContent = myRequest?.status === "declined"
        ? "Request declined. You can try again."
        : "";
      btn.addEventListener("click", () => requestAdoption(pet, btn, requestNote));
    }

    registerChatTriggers(card, ownerData);

    petGrid.appendChild(card);
  });
}

function resolveImageSrc(imagePath = "") {
  if (!imagePath) return FALLBACK_IMAGE;
  return imagePath.startsWith("http")
    ? imagePath
    : `${API_BASE}${imagePath}`;
}

function buildOwnerInfo(pet, isPlaceholder) {
  if (isPlaceholder) {
    return {
      html: `
        <div class="pet-owner muted">
          Add your phone and city in Profile to show contact info here 📍
        </div>
      `,
      ownerData: null
    };
  }

  const owner =
    typeof pet.createdBy === "object" && pet.createdBy !== null
      ? pet.createdBy
      : null;
  if (!owner) {
    return {
      html: `
        <div class="pet-owner muted">
          Owner info unavailable
        </div>
      `,
      ownerData: null
    };
  }

  const ownerId = owner._id || owner.id || owner.ownerId;
  const name = owner.username || "Pet Owner";
  const city = owner.city?.trim() || "City not specified";
  const phone = owner.phone?.trim() || "Phone not provided";
  const currentUserId = localStorage.getItem("userId");
  const canMessage =
    ownerId &&
    (!currentUserId || String(ownerId) !== String(currentUserId));

  const nameClass = canMessage
    ? "owner-name owner-chat-trigger"
    : "owner-name";
  const buttonMarkup = canMessage
    ? `<button type="button" class="owner-chat-btn">Message</button>`
    : "";
  const profileLinkMarkup = ownerId
    ? `<a class="owner-profile-link" href="/owner.html?id=${ownerId}">View profile →</a>`
    : "";

  return {
    html: `
      <div class="pet-owner">
        <div>
          <p class="${nameClass}">${name}</p>
          <p class="owner-meta">${city}</p>
          <p class="owner-meta">${phone}</p>
          ${profileLinkMarkup}
        </div>
        ${buttonMarkup}
      </div>
    `,
    ownerData: canMessage && ownerId
      ? {
        id: String(ownerId),
        name,
        city,
        phone
      }
      : null
  };
}

function registerChatTriggers(container, ownerData) {
  if (!ownerData?.id || !window.ChatWidget) return;
  const triggers = container.querySelectorAll(".owner-chat-btn, .owner-chat-trigger");
  triggers.forEach(trigger => {
    trigger.addEventListener("click", evt => {
      evt.preventDefault();
      evt.stopPropagation();
      if (!token) {
        toast.info("Login to send messages");
        return;
      }
      window.ChatWidget.open(ownerData);
    });
  });
}

async function loadMyRequests() {
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/adoptions/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load requests");
    const data = await res.json();
    userRequests = Array.isArray(data) ? data : [];
    userRequestsReady = true;
    if (petsReady) renderFilteredPets();
  } catch (err) {
    console.error(err);
    userRequests = [];
    userRequestsReady = false;
  }
}

function getFavoritesKey() {
  const userId = localStorage.getItem("userId");
  return userId ? `favorites_${userId}` : null;
}

function setActiveFilterButton(value) {
  petFilterButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === value);
  });
}

function getFavorites() {
  const key = getFavoritesKey();
  if (!key) return [];

  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  const key = getFavoritesKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(favorites));
}

function getRequestForPet(petId) {
  if (!userRequests?.length) return null;
  return userRequests.find(req => {
    const id = req.petId?._id || req.petId;
    return id && String(id) === String(petId);
  }) || null;
}

function toggleFavorite(pet, heartElement, favorites) {
  if (!token) {
    toast.info("Login to add favorites 🤍");
    return;
  }

  const key = getFavoritesKey();
  if (!key) {
    toast.info("Profile loading, try again in a second");
    return;
  }

  const idx = favorites.findIndex(fav => fav.id === pet._id);

  if (idx >= 0) {
    favorites.splice(idx, 1);
    heartElement.textContent = "🤍";
  } else {
    favorites.push({
      id: pet._id,
      name: pet.name,
      type: pet.type,
      age: pet.age,
      image: resolveImageSrc(pet.image),
      ownerId: pet.createdBy?._id || pet.createdBy?.id || pet.createdBy || "",
      owner: pet.createdBy?.username || "",
      city: pet.createdBy?.city || "",
      phone: pet.createdBy?.phone || ""
    });
    heartElement.textContent = "❤️";
  }

  saveFavorites(favorites);
}

async function requestAdoption(pet, button, noteElement) {
  if (!token) {
    toast.info("Login to adopt 🤍");
    return;
  }

  button.textContent = "Sending...";
  button.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/pets/${pet._id}/adopt`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to submit request");
    }

    const data = await res.json();
    if (data.request) {
      userRequests.push(data.request);
    }
    toast.success("Adoption request sent!");
    if (noteElement) {
      noteElement.textContent = "The owner will respond soon.";
    }
    await loadPets();
  } catch (err) {
    console.error(err);
    toast.error(err.message || "Request failed 😿");
    button.textContent = "Request adoption";
    button.disabled = false;
    if (noteElement) noteElement.textContent = "";
  }
}

function getFilteredPets() {
  if (currentFilter === "all") return allPets;
  return allPets.filter(pet =>
    (pet.type || "").toLowerCase() === currentFilter
  );
}

function applyAdvancedFilters(pets) {
  return pets.filter(pet => {
    const matchesSearch = searchQuery
      ? (pet.name || "").toLowerCase().includes(searchQuery)
      : true;

    const matchesCity = cityFilter
      ? (pet.createdBy?.city || "")
        .toLowerCase()
        .includes(cityFilter)
      : true;

    const matchesAvailability = availableOnly
      ? pet.status !== "adopted"
      : true;

    return matchesSearch && matchesCity && matchesAvailability;
  });
}

function sortPets(pets) {
  const cloned = [...pets];
  switch (sortOption) {
    case "oldest":
      return cloned.sort((a, b) =>
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
      );
    case "name-asc":
      return cloned.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
    case "name-desc":
      return cloned.sort((a, b) =>
        (b.name || "").localeCompare(a.name || "")
      );
    case "newest":
    default:
      return cloned.sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
  }
}

function renderFilteredPets({ resetLimit = false } = {}) {
  if (!petGrid || !petsReady) return;

  if (resetLimit) currentLimit = 9;

  const filtered = getFilteredPets();
  const advancedFiltered = applyAdvancedFilters(filtered);
  const sortedPets = sortPets(advancedFiltered);

  if (!sortedPets.length) {
    petGrid.innerHTML = `
      <p class="empty-pets">
        No pets in this category yet 🐾
      </p>
    `;
    setLoadMoreVisibility(false);
    return;
  }

  const visiblePets = sortedPets.slice(0, currentLimit);
  renderPets(visiblePets);
  setLoadMoreVisibility(sortedPets.length > currentLimit);
}

function setLoadMoreVisibility(show) {
  if (!loadMoreBtn) return;
  loadMoreBtn.classList.toggle("hidden", !show);
}

async function loadPlaceholderPets(limit = 9) {
  try {
    const [catsRes, dogsRes] = await Promise.all([
      fetch(`${API_BASE}/api/external/cats?limit=${Math.max(limit, 9)}`),
      fetch(`${API_BASE}/api/external/dogs`)
    ]);

    if (!catsRes.ok || !dogsRes.ok) {
      throw new Error("External APIs unavailable");
    }

    const cats = await catsRes.json();
    const dogs = await dogsRes.json();

    const placeholders = [];

    cats.forEach((cat, idx) => {
      if (!cat?.url) return;
      placeholders.push(createPlaceholderPet("Cat", cat.url, idx));
    });

    dogs.forEach((url, idx) => {
      if (!url) return;
      placeholders.push(createPlaceholderPet("Dog", url, idx));
    });

    return placeholders.slice(0, limit);
  } catch (err) {
    console.error("Placeholder load failed", err);
    return [];
  }
}

function createPlaceholderPet(type, imageUrl, index) {
  const names =
    type.toLowerCase() === "cat" ? SAMPLE_CAT_NAMES : SAMPLE_DOG_NAMES;
  const name = names[index % names.length];

  return {
    _id: `placeholder-${type}-${index}`,
    name: `${name} (demo)`,
    type,
    age: null,
    image: imageUrl,
    status: "available",
    isPlaceholder: true
  };
}

async function loadPets({ initial = false } = {}) {
  if (!petGrid) return;

  try {
    const res = await fetch(`${API_BASE}/api/pets`);
    if (!res.ok) {
      throw new Error("Failed to load pets");
    }

    const data = await res.json();
    allPets = Array.isArray(data)
      ? data.sort((a, b) => {
        const aDate = new Date(a.createdAt || 0);
        const bDate = new Date(b.createdAt || 0);
        return bDate - aDate;
      })
      : [];

    if (!allPets.length) {
      placeholderMode = true;
      allPets = await loadPlaceholderPets(currentLimit);
    } else {
      placeholderMode = false;
    }

    if (!allPets.length) {
      petGrid.innerHTML = `
        <p class="empty-pets">No pets yet. Add the first listing on the Listings page 🐾</p>
      `;
      setLoadMoreVisibility(false);
      petsReady = false;
      return;
    }

    petsReady = true;
    renderFilteredPets({ resetLimit: initial || placeholderMode });
  } catch (err) {
    console.error(err);
    petGrid.innerHTML = `
      <p class="empty-pets">Failed to load pets 😿</p>
    `;
    setLoadMoreVisibility(false);
    toast.error("Could not load pets");
  }
}

if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", () => {
    if (!petsReady) return;
    currentLimit += 9;
    renderFilteredPets();
  });
}

function initGeoBanner() {
  const banner = document.getElementById("geoBanner");
  const button = document.getElementById("locateBtn");
  if (!banner || !button) return;

  let loading = false;

  const setMessage = msg => {
    banner.textContent = msg;
  };

  const showBanner = () => {
    banner.classList.add("visible");
  };

  const setButtonState = (text, disabled) => {
    button.textContent = text;
    button.disabled = disabled;
  };

  const finishSuccess = message => {
    setButtonState("Location detected", true);
    setMessage(message);
    showBanner();
    loading = false;
  };

  const finishError = message => {
    setButtonState("Try again", false);
    setMessage(message);
    showBanner();
    loading = false;
  };

  const describeLocation = ({ city, region, country }) => {
    const pieces = [];
    if (city) pieces.push(city);
    if (region && region !== city) pieces.push(region);
    const fallback = country || "your area";
    const label = pieces.length ? pieces.join(", ") : fallback;
    finishSuccess(`Showing pets near ${label}`);
  };

  const fetchReverse = async (lat, lon) => {
    const url =
      `${GEO_REVERSE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Reverse geocode failed");
    const data = await res.json();
    describeLocation({
      city: data.city || data.locality || data.localityInfo?.locality?.name,
      region: data.principalSubdivision || data.localityInfo?.administrative?.[0]?.name,
      country: data.countryName
    });
  };

  const fetchByIp = async () => {
    try {
      const res = await fetch(GEO_IP_URL);
      if (!res.ok) throw new Error("IP lookup failed");
      const data = await res.json();
      describeLocation({
        city: data.city,
        region: data.region || data.region_code,
        country: data.country_name
      });
    } catch (err) {
      console.warn("IP lookup failed", err);
      finishError("Couldn't detect location automatically");
    }
  };

  button.addEventListener("click", () => {
    if (loading || button.disabled) return;
    loading = true;
    setButtonState("Detecting...", true);
    setMessage("Locating you...");
    showBanner();

    const handleFallback = () => fetchByIp().finally(() => {
      loading = false;
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          fetchReverse(pos.coords.latitude, pos.coords.longitude)
            .catch(handleFallback);
        },
        handleFallback,
        { timeout: 5000 }
      );
    } else {
      handleFallback();
    }
  });
}


document.addEventListener("DOMContentLoaded", () => {
  initGeoBanner();
  if (petGrid) {
    setActiveFilterButton(currentFilter);
    loadPets({ initial: true });
  }
});


const scrollTopBtn = document.getElementById("scrollTopBtn");

if (scrollTopBtn) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      scrollTopBtn.classList.add("show");
    } else {
      scrollTopBtn.classList.remove("show");
    }
  });

  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}


console.log("token:", localStorage.getItem("token"));
console.log("navAuth:", document.getElementById("navAuth"));
console.log("navUser:", document.getElementById("navUser"));
