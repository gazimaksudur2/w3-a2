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
const FALLBACK_PROPERTY_IMAGE = "assets/images/wide-resort1.jpg";
const FALLBACK_PROPERTY_NAME = "Stay details unavailable";

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
    const res = await fetch(
      `/get-property?${encodeURIComponent(sortType)}=true&limit=${encodeURIComponent(limit)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return sanitizeProperties(data?.Result?.Items);
  } catch {
    return [];
  }
}

async function fetchGalleryImages() {
  try {
    const res = await fetch("/images?full=true");
    if (!res.ok) return [];
    return sanitizeGalleryImages(await res.json());
  } catch {
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

const FALLBACK_GALLERY_IMAGES = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  path: `/images/image${i + 1}.jpg`,
  alt: `Golf course image ${i + 1}`,
}));

async function initGallery() {
  const fetched = await fetchGalleryImages();
  const images = sanitizeGalleryImages(
    fetched && fetched.length ? fetched : FALLBACK_GALLERY_IMAGES
  );

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
  const safeId = escapeHtml(propertyId);
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
    const favorite = event.target.closest(".property-favorite");
    if (favorite && grid.contains(favorite)) {
      event.preventDefault();
      event.stopPropagation();

      const propertyId = favorite.dataset.propertyId;
      if (!propertyId) return;

      applyFavoriteButtonState(favorite, toggleFavoriteProperty(propertyId));
      return;
    }

    const details = event.target.closest("[data-select-property]");
    if (!details || !grid.contains(details)) return;

    selectProperty(details.dataset.selectProperty);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== FAVORITES_STORAGE_KEY) return;
    syncFavoriteButtons();
  });
}

/* ==========================================================================
   PROPERTY SANITIZATION & CARD ACTIONS
   ========================================================================== */

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textValue(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function finiteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeGalleryImages(raw) {
  if (!Array.isArray(raw)) return [];

  const usable = [];
  for (const image of raw) {
    if (typeof image === "string" && image.trim()) {
      usable.push({ path: image.trim(), alt: "" });
      continue;
    }
    if (!isPlainObject(image)) continue;
    const path = textValue(image.path);
    if (!path) continue;
    usable.push({
      id: image.id,
      path,
      alt: textValue(image.alt),
    });
  }

  return usable.map((image, index) => ({
    id: image.id ?? index + 1,
    path: image.path,
    alt: image.alt || `Golf course image ${index + 1}`,
  }));
}

function sanitizeProperties(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((item) => {
      if (!isPlainObject(item)) return null;
      const ID = textValue(item.ID);
      if (!ID) return null;

      const geo = isPlainObject(item.GeoInfo) ? item.GeoInfo : {};
      const property = isPlainObject(item.Property) ? item.Property : {};
      const partner = isPlainObject(item.Partner) ? item.Partner : {};
      const counts = isPlainObject(property.Counts) ? property.Counts : {};
      const lat = finiteNumber(geo.Lat);
      const lng = finiteNumber(geo.Lng);

      return {
        ...item,
        ID,
        GeoInfo: {
          ...geo,
          City: textValue(geo.City),
          Country: textValue(geo.Country),
          Display: textValue(geo.Display),
          Categories: Array.isArray(geo.Categories) ? geo.Categories.filter(isPlainObject) : [],
          Lat: lat === null ? null : geo.Lat,
          Lng: lng === null ? null : geo.Lng,
        },
        Property: {
          ...property,
          PropertyName: textValue(property.PropertyName),
          PropertyType: textValue(property.PropertyType),
          FeatureImage: textValue(property.FeatureImage),
          Price: finiteNumber(property.Price),
          ReviewScore: finiteNumber(property.ReviewScore),
          TopAmenities: Array.isArray(property.TopAmenities)
            ? property.TopAmenities.filter((entry) => isPlainObject(entry) && textValue(entry.Name))
            : [],
          Counts: {
            ...counts,
            Bedroom: finiteNumber(counts.Bedroom),
            Bathroom: finiteNumber(counts.Bathroom),
            Reviews: finiteNumber(counts.Reviews),
            Occupancy: finiteNumber(counts.Occupancy),
          },
        },
        Partner: {
          ...partner,
          URL: textValue(partner.URL) || textValue(partner.CacheURL),
        },
      };
    })
    .filter(Boolean);
}

function categoryName(categories, type) {
  if (!Array.isArray(categories)) return "";
  const match = categories.find(
    (entry) => textValue(entry?.Type).toLowerCase() === type && textValue(entry?.Name)
  );
  return match ? textValue(match.Name) : "";
}

function displayName(item) {
  return textValue(item?.Property?.PropertyName) || FALLBACK_PROPERTY_NAME;
}

function displayLocation(item) {
  const geo = item?.GeoInfo || {};
  const city = textValue(geo.City);
  const state = categoryName(geo.Categories, "state");
  const country = textValue(geo.Country);

  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  if (country) return country;
  return "Location unavailable";
}

function displayPrice(item) {
  const price = finiteNumber(item?.Property?.Price);
  if (price === null) return "Price unavailable";
  return `$${Math.round(price)}`;
}

function displayRating(item) {
  const score = finiteNumber(item?.Property?.ReviewScore);
  if (score === null) return "Rating unavailable";
  const label = Number.isInteger(score) ? `${score}.0` : String(score);
  return `${label} Exceptional`;
}

function displayReviews(item) {
  const reviews = finiteNumber(item?.Property?.Counts?.Reviews);
  if (reviews === null) return "No reviews yet";
  return `${reviews} Reviews`;
}

function displayAmenities(item) {
  const names = (item?.Property?.TopAmenities || [])
    .map((entry) => textValue(entry?.Name))
    .filter(Boolean);

  if (names.length) return names.join(" • ");

  const occupancy = finiteNumber(item?.Property?.Counts?.Occupancy);
  const type = textValue(item?.Property?.PropertyType);
  const parts = [];
  if (occupancy !== null) parts.push(`Sleeps ${occupancy}`);
  if (type) parts.push(type);
  return parts.join(" • ") || "Amenities unavailable";
}

function bookingSource(item) {
  return safeExternalUrl(item?.Partner?.URL) ? "Booking.com" : "Dates unavailable";
}

function safeExternalUrl(value) {
  const raw = textValue(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return "";
  }
  return "";
}

function buildPropertyImageUrl(featureImage) {
  if (!textValue(featureImage)) return FALLBACK_PROPERTY_IMAGE;
  return `${IMAGE_SERVICE_BASE}${featureImage}`;
}

function matchesSearch(item, query) {
  if (!query) return true;
  const needle = query.toLowerCase();
  const haystacks = [
    displayName(item),
    textValue(item?.GeoInfo?.City),
    textValue(item?.GeoInfo?.Display),
    textValue(item?.GeoInfo?.Country),
    categoryName(item?.GeoInfo?.Categories, "state"),
  ];
  return haystacks.some((value) => value.toLowerCase().includes(needle));
}

function getFilteredProperties() {
  return state.properties.filter((item) => {
    const matchesBedrooms =
      !state.bedroomFilter || item.Property?.Counts?.Bedroom === state.bedroomFilter;
    return matchesSearch(item, state.searchQuery) && matchesBedrooms;
  });
}

function renderSeeDatesAction(url) {
  if (!url) {
    return `<button type="button" class="btn btn-primary" disabled>See Dates</button>`;
  }

  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="btn btn-primary">See Dates</a>`;
}

function renderProperties() {
  const grid = document.querySelector(".property-grid");
  if (!grid) return;

  const filtered = getFilteredProperties();
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize) || 1);
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  const startIndex = (state.page - 1) * state.pageSize;
  const paginatedItems = filtered.slice(startIndex, startIndex + state.pageSize);

  if (!paginatedItems.length) {
    const emptyMessage = state.properties.length
      ? "No properties found matching your selection."
      : "No stays are available right now.";
    grid.innerHTML = `<p class="property-grid__empty">${emptyMessage}</p>`;
    renderPagination(0);
    window.syncNearbyStayMap?.([]);
    window.syncStayPropertyCarousel?.();
    return;
  }

  grid.innerHTML = paginatedItems
    .map((item) => {
      const name = displayName(item);
      const price = displayPrice(item);
      const rating = displayRating(item);
      const reviews = displayReviews(item);
      const location = displayLocation(item);
      const imageSrc = buildPropertyImageUrl(item.Property?.FeatureImage);
      const topAmenities = displayAmenities(item);
      const partnerUrl = safeExternalUrl(item.Partner?.URL);
      const incomplete = !textValue(item.Property?.PropertyName);

      return `
        <article class="property-card${incomplete ? " is-incomplete" : ""}" data-id="${escapeHtml(item.ID)}">
          <div class="property-image">
            <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.src='${FALLBACK_PROPERTY_IMAGE}'" />
            <span class="course-badge">50+ Golf <br /> Courses Nearby</span>
            <div class="image-icons">
              <img src="assets/icons/leaf.svg" alt="" />
              <img src="assets/icons/marker.svg" alt="" />
              ${renderFavoriteButton(item.ID)}
            </div>
          </div>
          <div class="property-body">
            <div class="property-rating">
              <img src="assets/icons/circle-star.svg" alt="" />
              ${escapeHtml(rating)}
              <strong class="property-rating-separator">|</strong>
              <span class="property-rating-reviews">${escapeHtml(reviews)}</span>
            </div>
            <h3>${escapeHtml(name)}</h3>
            <p class="booking-source">${escapeHtml(bookingSource(item))}</p>
            <strong class="property-price-container">
              From ${escapeHtml(price)}
              <img src="assets/icons/info.svg" alt="" />
            </strong>
            <p class="property-details">${escapeHtml(topAmenities)}</p>
            <p class="property-location">${escapeHtml(location)}</p>
            <div class="property-actions">
              <button type="button" class="btn btn-outline" data-select-property="${escapeHtml(item.ID)}">Details</button>
              ${renderSeeDatesAction(partnerUrl)}
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
  const totalPages = Math.max(1, Math.ceil(getFilteredProperties().length / state.pageSize) || 1);
  const nextPage = Math.min(totalPages, Math.max(1, Number(pageNumber) || 1));
  if (nextPage === state.page) return;
  state.page = nextPage;
  renderProperties();
  document.querySelector(".nearby-stay-section")?.scrollIntoView({ behavior: "smooth" });
};

window.selectProperty = function (propertyId) {
  const item = state.properties.find((property) => property.ID === String(propertyId));
  if (!item) return;

  state.selectedProperty = item;

  const occupancy = finiteNumber(item.Property?.Counts?.Occupancy);
  const bedrooms = finiteNumber(item.Property?.Counts?.Bedroom);
  if (occupancy !== null) {
    const bedroomLabel = bedrooms !== null ? `${bedrooms} BEDROOMS` : "BEDROOMS UNAVAILABLE";
    document.querySelectorAll(".booking-card .guest-select strong").forEach((guestText) => {
      guestText.textContent = `${occupancy} GUESTS, ${bedroomLabel}`;
    });
  }

  const partnerUrl = safeExternalUrl(item.Partner?.URL);
  document.querySelectorAll(".booking-card .check-button").forEach((ctaButton) => {
    ctaButton.onclick = partnerUrl ? () => window.open(partnerUrl, "_blank") : null;
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

document.addEventListener("DOMContentLoaded", () => {
  void bootstrapApp();
});

async function bootstrapApp() {
  try {
    initHotelDatePicker();
    setupFilterEvents();
    setupSortDropdown();
    setupFavoriteToggles();
    await initGallery();

    state.properties = await fetchProperties(state.currentSort, state.limit);
    state.selectedProperty = state.properties[0] || null;

    renderProperties();
    updateBookingTotals();
  } catch {
    state.properties = Array.isArray(state.properties) ? state.properties : [];
    renderProperties();
    updateBookingTotals();
  }
}