/**
 * Stay&Play Client Controller
 */

/* ==========================================================================
   CONFIG
   ========================================================================== */

const IMAGE_SERVICE_BASE = "https://beta.imgservice.rentbyowner.com/640x300/";
const PRICE_PER_NIGHT = 2026;
const PLATFORM_LIMITS = { desktop: 6, mobile: 4 };
const FAVORITES_STORAGE_KEY = "stayplay.favoritePropertyIds";

/* ==========================================================================
   PLATFORM DETECTION
   ========================================================================== */

function detectPlatform() {
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
    return navigator.userAgentData.mobile ? "mobile" : "desktop";
  }

  const ua = navigator.userAgent || navigator.vendor || "";
  const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);

  return isMobileUA ? "mobile" : "desktop";
}

function getPlatformLimit() {
  const platform = detectPlatform();
  return PLATFORM_LIMITS[platform] ?? PLATFORM_LIMITS.desktop;
}

/* ==========================================================================
   APPLICATION STATE
   ========================================================================== */

const state = {
  currentSort: "most-popular", // 'most-popular' | 'lowest-price' | 'highest-price'
  limit: getPlatformLimit(),    // 6 desktop / 4 mobile
  page: 1,
  pageSize: getPlatformLimit(),
  bedroomFilter: null,
  searchQuery: "",
  properties: [],
  selectedProperty: null,
  selectedNights: 1,
  galleryImages: [],
};

/* ==========================================================================
   API SERVICES
   ========================================================================== */

async function fetchProperties(sortType = "most-popular", limit = state.limit) {
  try {
    const res = await fetch(`/get-property?${sortType}=true&limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data?.Result?.Items || [];
  } catch (err) {
    console.error("Error fetching properties:", err);
    return [];
  }
}

async function fetchGalleryImages() {
  try {
    const res = await fetch("/images?full=true");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Error fetching gallery images:", err);
    return [];
  }
}

/* ==========================================================================
   HOTEL DATEPICKER INTEGRATION
   ========================================================================== */

function initHotelDatePicker(root = document) {
  const inputs = root.querySelectorAll(".hotel-date-input-overlay");
  if (!inputs.length || typeof HotelDatepicker === "undefined") return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkoutDefault = new Date(today);
  checkoutDefault.setDate(today.getDate() + 2);

  const startFormatted = window.fecha.format(today, "YYYY-MM-DD");
  const endFormatted = window.fecha.format(checkoutDefault, "YYYY-MM-DD");

  function handleDateSelection(dateInput) {
    const value = dateInput.value;
    if (!value || !value.includes(" - ")) return;

    const [startStr, endStr] = value.split(" - ");
    const startDate = window.fecha.parse(startStr, "YYYY-MM-DD");
    const endDate = window.fecha.parse(endStr, "YYYY-MM-DD");

    if (!startDate || !endDate) return;

    const isPast = startDate < today;
    const isInvalidRange = endDate <= startDate;

    if (isPast || isInvalidRange) {
      console.warn("Invalid date selection blocked:", { startDate, endDate });
      return;
    }

    const checkinText = window.fecha.format(startDate, "DD MMM YYYY").toUpperCase();
    const checkoutText = window.fecha.format(endDate, "DD MMM YYYY").toUpperCase();

    document.querySelectorAll(".js-display-checkin").forEach((el) => {
      el.textContent = checkinText;
    });
    document.querySelectorAll(".js-display-checkout").forEach((el) => {
      el.textContent = checkoutText;
    });

    const diffTime = Math.abs(endDate - startDate);
    state.selectedNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    updateBookingTotals();
  }

  inputs.forEach((dateInput) => {
    if (dateInput.dataset.datepickerReady === "true") return;
    dateInput.dataset.datepickerReady = "true";
    dateInput.value = `${startFormatted} - ${endFormatted}`;

    new HotelDatepicker(dateInput, {
      format: "YYYY-MM-DD",
      separator: " - ",
      startDate: today,
      selectForward: true,
      minNights: 1,
      showTopbar: true,
      autoClose: true,
    });

    dateInput.addEventListener("afterClose", () => handleDateSelection(dateInput));
    dateInput.addEventListener("change", () => handleDateSelection(dateInput));
    handleDateSelection(dateInput);
  });
}

/* ==========================================================================
   PRICING
   ========================================================================== */

function updateBookingTotals() {
  const nights = Math.max(1, state.selectedNights || 1);
  const totalPrice = PRICE_PER_NIGHT * nights;
  const perNight = PRICE_PER_NIGHT.toLocaleString("en-US");
  const total = totalPrice.toLocaleString("en-US");

  document.querySelectorAll(".js-price-per-night").forEach((el) => {
    el.textContent = perNight;
  });
  document.querySelectorAll(".js-total-price").forEach((el) => {
    el.textContent = total;
  });
}

/* ==========================================================================
   DYNAMIC HERO GALLERY & FULL MODAL
   ========================================================================== */

function mountGalleryModalChrome() {
  const titleSlot = document.getElementById("gallery-modal-title-slot");
  const bookingSlot = document.getElementById("gallery-modal-booking-slot");
  const titleSource = document.querySelector(".course-header");
  const bookingSource = document.querySelector(".course-layout > .booking-card");

  if (titleSlot && titleSource && titleSlot.childElementCount === 0) {
    const title = titleSource.cloneNode(true);
    title.classList.add("gallery-modal__title");
    titleSlot.appendChild(title);
  }

  if (bookingSlot && bookingSource && bookingSlot.childElementCount === 0) {
    const booking = bookingSource.cloneNode(true);
    booking.classList.add("gallery-modal__booking");
    booking.querySelectorAll("[id]").forEach((el) => {
      el.id = `modal-${el.id}`;
    });
    bookingSlot.appendChild(booking);
    initHotelDatePicker(booking);
  }
}

window.mountGalleryModalChrome = mountGalleryModalChrome;

function setupGalleryModal() {
  const modal = document.getElementById("gallery-modal");
  const viewButton = document.querySelector(".gallery-view-button");
  const closeButton = document.getElementById("gallery-modal-close");
  const backdrop = document.getElementById("gallery-modal-backdrop");
  const grid = document.getElementById("modal-gallery-grid");
  const countEl = document.getElementById("modal-image-count");

  if (!modal || !viewButton) return;

  function openModal() {
    if (!state.galleryImages.length) return;

    mountGalleryModalChrome();

    if (grid && grid.children.length === 0) {
      grid.innerHTML = state.galleryImages
        .map(
          (img, index) => `
          <div class="gallery-modal__card">
            <img 
              src="${img.path}" 
              alt="${img.alt || `Golf course image ${index + 1}`}" 
              loading="lazy" 
            />
            <span class="gallery-modal__caption">${img.alt || `Photo ${index + 1}`}</span>
          </div>
        `
        )
        .join("");
    }

    if (countEl) countEl.textContent = state.galleryImages.length;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    if (document.getElementById("guest-modal")?.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  viewButton.addEventListener("click", openModal);
  closeButton?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
}

const FALLBACK_GALLERY_IMAGES = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  path: `/images/image${i + 1}.jpg`,
  alt: `Golf course image ${i + 1}`,
}));

async function initGallery() {
  const fetched = await fetchGalleryImages();
  const images = fetched && fetched.length ? fetched : FALLBACK_GALLERY_IMAGES;

  window.galleryImages = images;
  state.galleryImages = images;

  const mainImg = document.querySelector(".gallery-item--main img");
  const sideImgs = document.querySelectorAll(".gallery-side .gallery-item img");

  if (mainImg && images[0]) {
    mainImg.src = images[0].path;
    mainImg.alt = images[0].alt || "Main golf course image";
  }

  if (sideImgs.length) {
    sideImgs.forEach((imgEl, index) => {
      const item = images[index + 1];
      if (item) {
        imgEl.src = item.path;
        imgEl.alt = item.alt || "Resort preview image";
      }
    });
  }

  const viewAllBtn = document.querySelector(".gallery-view-button");
  if (viewAllBtn) {
    viewAllBtn.textContent = `View All ${images.length} Images`;
  }

  if (typeof window.initGalleryCarousel === "function") {
    window.initGalleryCarousel(images);
  }

  setupGalleryModal();
}

/* ==========================================================================
   PROPERTY FAVORITES (localStorage, shared across platforms)
   ========================================================================== */

function readFavoriteIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => String(id)).filter(Boolean))];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids) {
  const unique = [...new Set(ids.map((id) => String(id)).filter(Boolean))];
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(unique));
  return unique;
}

function isFavoriteProperty(propertyId) {
  return readFavoriteIds().includes(String(propertyId));
}

function toggleFavoriteProperty(propertyId) {
  const key = String(propertyId);
  if (!key) return false;

  const ids = readFavoriteIds();
  const next = ids.includes(key) ? ids.filter((id) => id !== key) : [...ids, key];
  writeFavoriteIds(next);
  return next.includes(key);
}

function applyFavoriteButtonState(button, active) {
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute(
    "aria-label",
    active ? "Remove from favorites" : "Add to favorites"
  );
}

function syncFavoriteButtons() {
  document.querySelectorAll(".property-favorite[data-property-id]").forEach((button) => {
    applyFavoriteButtonState(button, isFavoriteProperty(button.dataset.propertyId));
  });
}

function renderFavoriteButton(propertyId) {
  const safeId = String(propertyId).replace(/"/g, "&quot;");
  const active = isFavoriteProperty(propertyId);

  return `
    <button
      type="button"
      class="property-favorite${active ? " is-active" : ""}"
      data-property-id="${safeId}"
      aria-pressed="${active}"
      aria-label="${active ? "Remove from favorites" : "Add to favorites"}"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12 6.00019C10.2006 3.90317 7.19377 3.2551 4.93923 5.17534C2.68468 7.09558 2.36727 10.3061 4.13778 12.5772C5.60984 14.4654 10.0648 18.4479 11.5249 19.7369C11.6882 19.8811 11.7699 19.9532 11.8652 19.9815C11.9483 20.0062 12.0393 20.0062 12.1225 19.9815C12.2178 19.9532 12.2994 19.8811 12.4628 19.7369C13.9229 18.4479 18.3778 14.4654 19.8499 12.5772C21.6204 10.3061 21.3417 7.07538 19.0484 5.17534C16.7551 3.2753 13.7994 3.90317 12 6.00019Z"
        />
      </svg>
    </button>
  `;
}

function setupFavoriteToggles() {
  const grid = document.querySelector(".property-grid");
  if (!grid || grid.dataset.favoritesBound === "true") return;

  grid.dataset.favoritesBound = "true";

  grid.addEventListener("click", (event) => {
    const button = event.target.closest(".property-favorite");
    if (!button || !grid.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();

    const propertyId = button.dataset.propertyId;
    if (!propertyId) return;

    applyFavoriteButtonState(button, toggleFavoriteProperty(propertyId));
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== FAVORITES_STORAGE_KEY) return;
    syncFavoriteButtons();
  });
}

/* ==========================================================================
   PROPERTY RENDERING & CARD ACTIONS
   ========================================================================== */

function buildPropertyImageUrl(featureImage) {
  if (!featureImage) return "assets/images/wide-resort1.jpg";
  return `${IMAGE_SERVICE_BASE}${featureImage}`;
}

function renderProperties() {
  const grid = document.querySelector(".property-grid");
  if (!grid) return;

  const filtered = state.properties.filter((item) => {
    const p = item.Property;
    const geo = item.GeoInfo;

    const matchesSearch =
      !state.searchQuery ||
      p.PropertyName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      geo?.City?.toLowerCase().includes(state.searchQuery.toLowerCase());

    const matchesBedrooms =
      !state.bedroomFilter || p.Counts?.Bedroom === state.bedroomFilter;

    return matchesSearch && matchesBedrooms;
  });

  const startIndex = (state.page - 1) * state.pageSize;
  const paginatedItems = filtered.slice(startIndex, startIndex + state.pageSize);

  if (!paginatedItems.length) {
    grid.innerHTML = `
      <p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        No properties found matching your selection.
      </p>
    `;
    renderPagination(0);
    window.syncNearbyStayMap?.([]);
    window.syncStayPropertyCarousel?.();
    return;
  }

  grid.innerHTML = paginatedItems
    .map((item) => {
      const p = item.Property;
      const geo = item.GeoInfo;
      const price = p.Price ? `$${Math.round(p.Price)}` : "N/A";
      const rating = p.ReviewScore ? `${p.ReviewScore}.0 Exceptional` : "Top Rated";
      const reviews = p.Counts?.Reviews ? `${p.Counts.Reviews} Reviews` : "Verified";
      const location = `${geo?.City || "Orlando"}, ${geo?.Categories?.[1]?.Name || "FL"}`;
      const imageSrc = buildPropertyImageUrl(p.FeatureImage);

      const topAmenities =
        p.TopAmenities?.map((a) => a.Name).join(" • ") ||
        `Sleeps ${p.Counts?.Occupancy || 2} • ${p.PropertyType || "Resort"}`;

      return `
        <article class="property-card" data-id="${item.ID}">
          <div class="property-image">
            <img src="${imageSrc}" alt="${p.PropertyName}" onerror="this.src='assets/images/wide-resort1.jpg'" />
            <span class="course-badge">50+ Golf <br /> Courses Nearby</span>
            <div class="image-icons">
              <img src="assets/icons/leaf.svg" alt="Leaf" />
              <img src="assets/icons/marker.svg" alt="Marker" />
              ${renderFavoriteButton(item.ID)}
            </div>
          </div>
          <div class="property-body">
            <div class="property-rating">
              <img src="assets/icons/circle-star.svg" alt="Rating star" />
              ${rating}
              <strong class="property-rating-separator">|</strong>
              <span class="property-rating-reviews">${reviews}</span>
            </div>
            <h3>${p.PropertyName}</h3>
            <p class="booking-source">Booking.com</p>
            <strong class="property-price-container">
              From ${price}
              <img src="assets/icons/info.svg" alt="Info" />
            </strong>
            <p class="property-details">${topAmenities}</p>
            <p class="property-location">${location}</p>
            <div class="property-actions">
              <button class="btn btn-outline" onclick="selectProperty('${item.ID}')">Details</button>
              <a href="${item.Partner?.URL || '#'}" target="_blank" rel="noopener" class="btn btn-primary">See Dates</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  renderPagination(filtered.length);
  window.syncNearbyStayMap?.(paginatedItems);
  window.syncStayPropertyCarousel?.();
}

function renderPagination(totalCount) {
  const totalPages = Math.ceil(totalCount / state.pageSize) || 1;
  const paginationList = document.querySelector(".pagination__list");
  const prevBtn = document.querySelector(".pagination__prev");
  const nextBtn = document.querySelector(".pagination__next");

  if (!paginationList || !prevBtn || !nextBtn) return;

  prevBtn.disabled = state.page === 1;
  nextBtn.disabled = state.page === totalPages;

  let pagesHtml = "";
  for (let i = 1; i <= totalPages; i++) {
    pagesHtml += `
      <li>
        <button 
          class="pagination__page ${i === state.page ? "pagination__page--active" : ""}" 
          onclick="goToPage(${i})"
        >
          ${String(i).padStart(2, "0")}
        </button>
      </li>
    `;
  }
  paginationList.innerHTML = pagesHtml;
}

window.goToPage = function (pageNumber) {
  state.page = pageNumber;
  renderProperties();
  document.querySelector(".nearby-stay-section")?.scrollIntoView({ behavior: "smooth" });
};

window.selectProperty = function (propertyId) {
  const item = state.properties.find((p) => p.ID === propertyId);
  if (!item) return;

  state.selectedProperty = item;
  const p = item.Property;

  const bookingCard = document.querySelector(".booking-card");
  if (!bookingCard) return;

  document.querySelectorAll(".booking-card .guest-select strong").forEach((guestText) => {
    if (p.Counts?.Occupancy) {
      guestText.textContent = `${p.Counts.Occupancy} GUESTS, ${p.Counts.Bedroom || 1} BEDROOMS`;
    }
  });

  document.querySelectorAll(".booking-card .check-button").forEach((ctaButton) => {
    if (item.Partner?.URL) {
      ctaButton.onclick = () => window.open(item.Partner.URL, "_blank");
    }
  });

  updateBookingTotals();
  document.querySelector(".course-layout > .booking-card")?.scrollIntoView({ behavior: "smooth" });
};

/* ==========================================================================
   SORT DROPDOWN
   ========================================================================== */

function setupSortDropdown() {
  const sortSelect = document.getElementById("sort-select");
  if (!sortSelect) return;

  sortSelect.value = state.currentSort;

  sortSelect.addEventListener("change", async (e) => {
    const sortType = e.target.value;
    state.currentSort = sortType;
    state.page = 1;
    state.properties = await fetchProperties(sortType, state.limit);
    renderProperties();
  });
}

/* ==========================================================================
   OTHER FILTER EVENTS
   ========================================================================== */

function setupFilterEvents() {
  const bedroomButton = document.getElementById("bedroom-filter-button");

  bedroomButton?.addEventListener("click", () => {
    state.bedroomFilter = state.bedroomFilter === 2 ? null : 2;
    bedroomButton.style.borderColor = state.bedroomFilter ? "var(--teal-accent)" : "";
    bedroomButton.style.color = state.bedroomFilter ? "var(--teal-accent)" : "";
    state.page = 1;
    renderProperties();
  });

  const searchInput = document.querySelector(".nav-search input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim();
      state.page = 1;
      renderProperties();
    });
  }

  document.querySelector(".pagination__prev")?.addEventListener("click", () => {
    if (state.page > 1) window.goToPage(state.page - 1);
  });

  document.querySelector(".pagination__next")?.addEventListener("click", () => {
    window.goToPage(state.page + 1);
  });
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  initHotelDatePicker();
  setupFilterEvents();
  setupSortDropdown();
  setupFavoriteToggles();
  await initGallery();

  state.properties = await fetchProperties(state.currentSort, state.limit);
  if (state.properties.length > 0) {
    state.selectedProperty = state.properties[0];
  }

  renderProperties();
  updateBookingTotals();
});