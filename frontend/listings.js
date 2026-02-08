const API_BASE = "https://petadopt-x17x.onrender.com";
const token = localStorage.getItem("token");

const grid = document.getElementById("listingsGrid");
const navUsername = document.getElementById("navUsername");
const profileAvatar = document.getElementById("profileAvatar");
const logoutBtn = document.getElementById("logoutBtn");
const navUser = document.getElementById("navUser");
const navAuth = document.getElementById("navAuth");
const addPetBtn = document.getElementById("addPetBtn");

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

navUser?.addEventListener("click", () => {
  window.location.href = "/profile.html";
});

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600";

const modal = document.getElementById("addPetModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const createPetBtn = document.getElementById("createPetBtn");
const modalTitle = document.querySelector("#addPetModal h2");

const petNameInput = document.getElementById("petName");
const petTypeInput = document.getElementById("petType");
const petAgeInput = document.getElementById("petAge");
const petImageInput = document.getElementById("petImageInput");
const imagePreview = document.getElementById("imagePreview");
const formError = document.getElementById("formError");
let editingPetId = null;

if (!token) {
  toast.info("Please login first");
  window.location.href = "/";
}

fetch(`${API_BASE}/api/users/profile`, {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(res => res.json())
  .then(user => {
    localStorage.setItem("userId", user._id);
    navAuth?.classList.add("hidden");
    navUser?.classList.remove("hidden");
    navUsername.textContent = user.username;
    profileAvatar.src =
      `https://api.dicebear.com/7.x/thumbs/svg?seed=${user.username}`;

    window.ChatWidget?.setCurrentUser({
      id: user._id,
      username: user.username,
      city: user.city,
      phone: user.phone
    });

    loadListings();
  })
  .catch(() => {
    toast.error("Session expired. Please login again.");
    localStorage.removeItem("token");
    window.location.href = "/";
  });

logoutBtn?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/";
});

async function loadListings() {
  try {
    const res = await fetch(`${API_BASE}/api/pets`);
    const pets = await res.json();

    grid.innerHTML = "";
    const myId = localStorage.getItem("userId");

    if (!myId) {
      grid.innerHTML = "<p>Please login again to view your listings.</p>";
      return;
    }

    const myPets = pets.filter(pet => {
      const creator =
        typeof pet.createdBy === "object" && pet.createdBy !== null
          ? pet.createdBy._id || pet.createdBy.id
          : pet.createdBy;
      return creator && String(creator) === String(myId);
    });

    if (!myPets.length) {
      grid.innerHTML = `
        <div class="empty-pets">
          You haven't added any pets yet.<br>
          Click “Add Pet” to create your first listing.
        </div>
      `;
      return;
    }

    myPets.forEach(pet => {
      const img = pet.image
        ? pet.image.startsWith("http")
          ? pet.image
          : `${API_BASE}${pet.image}`
        : FALLBACK_IMAGE;

      const createdById =
        typeof pet.createdBy === "object" && pet.createdBy !== null
          ? pet.createdBy._id || pet.createdBy.id
          : pet.createdBy;

      const ownerName =
        typeof pet.createdBy === "object" && pet.createdBy !== null
          ? pet.createdBy.username || "Unknown rescuer"
          : "Unknown rescuer";

      const ownerCity =
        typeof pet.createdBy === "object" && pet.createdBy?.city?.trim()
          ? pet.createdBy.city
          : "City not specified";

      const ownerPhone =
        typeof pet.createdBy === "object" && pet.createdBy?.phone?.trim()
          ? pet.createdBy.phone
          : "Phone not provided";

      const currentUserId = localStorage.getItem("userId");

      const ownerData =
        createdById && String(createdById) !== String(currentUserId)
          ? {
              id: String(createdById),
              name: ownerName,
              city: ownerCity,
              phone: ownerPhone
            }
          : null;

      const profileLinkMarkup = createdById
        ? `<a class="owner-profile-link" href="/owner.html?id=${createdById}">View profile →</a>`
        : "";

      const nameClass = ownerData
        ? "owner-name owner-chat-trigger"
        : "owner-name";

      const card = document.createElement("div");
      card.className = "pet-card";

      card.innerHTML = `
        <img src="${img}" onerror="this.src='${FALLBACK_IMAGE}'">
        <h3>${pet.name}</h3>
        <p>${pet.age || "?"} years • ${pet.type}</p>

        <div class="pet-owner compact">
          <p class="${nameClass}">${ownerName}</p>
          <p class="owner-meta">${ownerCity}</p>
          <p class="owner-meta">${ownerPhone}</p>
          ${profileLinkMarkup}
          ${ownerData ? '<button type="button" class="owner-chat-btn small">Message</button>' : ""}
        </div>

        <div class="pet-actions">
          <button class="secondary-btn edit">Edit</button>
          <button class="secondary-btn delete">Delete</button>
        </div>

        <div class="request-section">
          <h4>Requests</h4>
          <div class="request-list" data-pet-id="${pet._id}">Loading...</div>
        </div>
      `;

      card.querySelector(".edit")?.addEventListener("click", () => {
        openEditModal(pet);
      });

      card.querySelector(".delete")?.addEventListener("click", async () => {
        if (!confirm("Delete this pet?")) return;

        try {
          const res = await fetch(`${API_BASE}/api/pets/${pet._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || "Failed to delete pet");
          }

          toast.success("Listing deleted");
          loadListings();
        } catch (err) {
          toast.error(err.message || "Failed to delete pet");
        }
      });

      if (ownerData && window.ChatWidget) {
        const triggers = card.querySelectorAll(
          ".owner-chat-btn, .owner-chat-trigger"
        );

        triggers.forEach(trigger => {
          trigger.addEventListener("click", evt => {
            evt.preventDefault();
            evt.stopPropagation();

            if (!token) {
              toast.info("Please login first");
              return;
            }

            window.ChatWidget.open(ownerData);
          });
        });
      }

      loadRequestsForPet(pet, card);
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = "<p>Error loading pets 😿</p>";
    toast.error("Failed to load listings");
  }
}

addPetBtn.addEventListener("click", openCreateModal);

closeModalBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  formError.classList.add("hidden");
  document.body.style.overflow = "auto";
  resetForm();
});

function resetForm() {
  editingPetId = null;
  modalTitle.textContent = "Add new pet 🐾";
  createPetBtn.textContent = "Create";
  petNameInput.value = "";
  petTypeInput.value = "";
  petAgeInput.value = "";
  petImageInput.value = "";
  imagePreview.classList.add("hidden");
  formError.classList.add("hidden");
}

function openCreateModal() {
  resetForm();
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function openEditModal(pet) {
  editingPetId = pet._id;
  modalTitle.textContent = "Edit pet";
  createPetBtn.textContent = "Save changes";
  petNameInput.value = pet.name || "";
  petTypeInput.value = pet.type || "";
  petAgeInput.value = pet.age || "";
  petImageInput.value = "";

  if (pet.image) {
    const src = pet.image.startsWith("http")
      ? pet.image
      : `${API_BASE}${pet.image}`;
    imagePreview.src = src;
    imagePreview.classList.remove("hidden");
  } else {
    imagePreview.classList.add("hidden");
  }

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

petImageInput.addEventListener("change", () => {
  const file = petImageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.src = reader.result;
    imagePreview.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

createPetBtn.addEventListener("click", async () => {
  if (!petNameInput.value || !petTypeInput.value) {
    formError.textContent = "Name and type are required 🐾";
    formError.classList.remove("hidden");
    return;
  }

  if (!petImageInput.files[0] && !editingPetId) {
    formError.textContent = "Please select an image 🖼️";
    formError.classList.remove("hidden");
    return;
  }

  formError.classList.add("hidden");

  const formData = new FormData();
  formData.append("name", petNameInput.value);
  formData.append("type", petTypeInput.value);
  formData.append("age", petAgeInput.value);

  if (petImageInput.files[0]) {
    formData.append("image", petImageInput.files[0]);
  }

  try {
    const url = editingPetId
      ? `${API_BASE}/api/pets/${editingPetId}`
      : `${API_BASE}/api/pets`;

    const method = editingPetId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const text = await res.text();

    if (!res.ok) {
      formError.textContent = text || "Failed to add pet 😿";
      formError.classList.remove("hidden");
      toast.error(formError.textContent);
      return;
    }

    const wasEditing = Boolean(editingPetId);

    modal.classList.add("hidden");
    document.body.style.overflow = "auto";
    resetForm();

    loadListings();
    toast.success(wasEditing ? "Pet updated!" : "Pet added successfully!");
  } catch (err) {
    formError.textContent = "Server error 😿";
    formError.classList.remove("hidden");
    toast.error("Server error while adding pet");
  }
});

async function loadRequestsForPet(pet, card) {
  const listEl = card.querySelector(".request-list");
  if (!listEl) return;

  try {
    const res = await fetch(
      `${API_BASE}/api/pets/${pet._id}/requests`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error();

    const requests = await res.json();

    if (!requests.length) {
      listEl.innerHTML =
        `<p class="request-note">No requests yet.</p>`;
      return;
    }

    listEl.innerHTML = "";

    requests.forEach(request => {
      const cardEl = document.createElement("div");
      cardEl.className = `request-card ${request.status}`;

      cardEl.innerHTML = `
        <div class="request-info">
          <strong>${request.userId?.username || "User"}</strong>
          <span>${request.userId?.city || "City unknown"}</span>
          <span>Status: ${request.status}</span>
        </div>
        <div class="request-actions"></div>
      `;

      const actions = cardEl.querySelector(".request-actions");

      if (request.status === "pending") {
        const approve = document.createElement("button");
        approve.className = "secondary-btn";
        approve.textContent = "Approve";
        approve.addEventListener("click", () =>
          updateRequestStatus(pet._id, request._id, "approved", card)
        );

        const decline = document.createElement("button");
        decline.className = "secondary-btn";
        decline.textContent = "Decline";
        decline.addEventListener("click", () =>
          updateRequestStatus(pet._id, request._id, "declined", card)
        );

        actions.appendChild(approve);
        actions.appendChild(decline);
      }

      listEl.appendChild(cardEl);
    });
  } catch {
    listEl.innerHTML =
      `<p class="request-note">Failed to load requests.</p>`;
  }
}

async function updateRequestStatus(petId, requestId, status) {
  try {
    const res = await fetch(
      `${API_BASE}/api/pets/${petId}/requests/${requestId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: status === "declined" ? "declined" : "approved"
        })
      }
    );

    if (!res.ok) throw new Error();

    toast.success("Request updated");
    loadListings();
  } catch {
    toast.error("Failed to update request");
  }
}