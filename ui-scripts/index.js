/**
 * Stay&Play Client Controller
 */

// Application State
const state = {
  currentSort: "most-popular", // 'most-popular' | 'lowest-price' | 'highest-price'
  limit: 24,
  page: 1,
  pageSize: 6,
  bedroomFilter: null,
  searchQuery: "",
  properties: [],
  selectedProperty: null,
  selectedNights: 1,
  galleryImages: [], // Cached images for the hero section and modal[cite: 2]
};

/* ==========================================================================
   API SERVICES
   ========================================================================== */

async function fetchProperties(sortType = "most-popular", limit = 24) {
  try {
    const res = await fetch(`/get-property?${sortType}=true&limit=${limit}`); //[cite: 2]
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data?.Result?.Items || []; //[cite: 2]
  } catch (err) {
    console.error("Error fetching properties:", err);
    return [];
  }
}

async function fetchGalleryImages() {
  try {
    const res = await fetch("/images?full=true"); //[cite: 2]
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

function initHotelDatePicker() {
  const dateInput = document.getElementById("hotel-datepicker-input");
  if (!dateInput || typeof HotelDatepicker === "undefined") return;

  // Zero out the time so "today" means the whole day, not "from this exact hour"
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkoutDefault = new Date(today);
  checkoutDefault.setDate(today.getDate() + 2);

  const startFormatted = window.fecha.format(today, "YYYY-MM-DD");
  const endFormatted = window.fecha.format(checkoutDefault, "YYYY-MM-DD");
  dateInput.value = `${startFormatted} - ${endFormatted}`;

  new HotelDatepicker(dateInput, {
    format: "YYYY-MM-DD",
    separator: " - ",

    // Criterion 1: Past dates must not be selectable
    startDate: today,          // disables every day before "today"
    selectForward: true,       // prevents navigating/selecting backward past startDate

    // Criterion 2: check-out must be at least 1 day after check-in
    minNights: 1,               // enforces a minimum 1-night gap between check-in/check-out

    showTopbar: true,
    autoClose: true,
  });

  function handleDateSelection() {
    const value = dateInput.value;
    if (!value || !value.includes(" - ")) return;

    const [startStr, endStr] = value.split(" - ");
    const startDate = window.fecha.parse(startStr, "YYYY-MM-DD");
    const endDate = window.fecha.parse(endStr, "YYYY-MM-DD");

    if (!startDate || !endDate) return;

    // Defensive re-validation, in case the input value was ever set
    // programmatically or the field was edited outside the picker UI
    const isPast = startDate < today;
    const isInvalidRange = endDate <= startDate;

    if (isPast || isInvalidRange) {
      console.warn("Invalid date selection blocked:", { startDate, endDate });
      return; // don't update UI/state with an invalid range
    }

    document.getElementById("display-checkin").textContent =
      window.fecha.format(startDate, "DD MMM YYYY").toUpperCase();
    document.getElementById("display-checkout").textContent =
      window.fecha.format(endDate, "DD MMM YYYY").toUpperCase();

    const diffTime = Math.abs(endDate - startDate);
    state.selectedNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    updateBookingTotals();
  }

  dateInput.addEventListener("afterClose", handleDateSelection);
  dateInput.addEventListener("change", handleDateSelection);

  handleDateSelection();
}

/* ==========================================================================
   PRICING
   ========================================================================== */

const PRICE_PER_NIGHT = 2026;

function updateBookingTotals() {
  const pricePerNightEl = document.getElementById("price-per-night");
  const totalPriceEl = document.getElementById("total-price");
  if (!pricePerNightEl || !totalPriceEl) return;

  const nights = Math.max(1, state.selectedNights || 1);
  const totalPrice = PRICE_PER_NIGHT * nights;

  pricePerNightEl.textContent = PRICE_PER_NIGHT.toLocaleString("en-US");
  totalPriceEl.textContent = totalPrice.toLocaleString("en-US");
}

/* ==========================================================================
   DYNAMIC HERO GALLERY & FULL MODAL
   ========================================================================== */

function setupGalleryModal() {
  const modal = document.getElementById("gallery-modal");
  const viewButton = document.querySelector(".gallery-view-button"); //[cite: 2]
  const closeButton = document.getElementById("gallery-modal-close");
  const backdrop = document.getElementById("gallery-modal-backdrop");
  const grid = document.getElementById("modal-gallery-grid");
  const countEl = document.getElementById("modal-image-count");

  if (!modal || !viewButton) return;

  function openModal() {
    if (!state.galleryImages.length) return;

    // Populate modal images if not already rendered
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
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  viewButton.addEventListener("click", openModal);
  closeButton?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  // Close with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
}

async function initGallery() {
  const images = await fetchGalleryImages();
  if (!images || !images.length) return;

  // Cache globally on window so modal.js has immediate access
  window.galleryImages = images;

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
}

/* ==========================================================================
   PROPERTY RENDERING & CARD ACTIONS
   ========================================================================== */

function renderProperties() {
  const grid = document.querySelector(".property-grid"); //[cite: 2]
  if (!grid) return;

  // Filter properties by search query and bedrooms
  const filtered = state.properties.filter((item) => {
    const p = item.Property; //[cite: 2]
    const geo = item.GeoInfo; //[cite: 2]

    const matchesSearch =
      !state.searchQuery ||
      p.PropertyName.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      geo?.City?.toLowerCase().includes(state.searchQuery.toLowerCase());

    const matchesBedrooms =
      !state.bedroomFilter || p.Counts?.Bedroom === state.bedroomFilter; //[cite: 2]

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
    return;
  }

  grid.innerHTML = paginatedItems
    .map((item) => {
      const p = item.Property; //[cite: 2]
      const geo = item.GeoInfo; //[cite: 2]
      const price = p.Price ? `$${Math.round(p.Price)}` : "N/A"; //[cite: 2]
      const rating = p.ReviewScore ? `${p.ReviewScore}.0 Exceptional` : "Top Rated"; //[cite: 2]
      const reviews = p.Counts?.Reviews ? `${p.Counts.Reviews} Reviews` : "Verified"; //[cite: 2]
      const location = `${geo?.City || "Orlando"}, ${geo?.Categories?.[1]?.Name || "FL"}`; //[cite: 2]
      const imageSrc = p.FeatureImage
        ? `/images/${p.FeatureImage}` //[cite: 2]
        : "assets/images/wide-resort1.jpg"; //[cite: 2]

      const topAmenities =
        p.TopAmenities?.map((a) => a.Name).join(" • ") || //[cite: 2]
        `Sleeps ${p.Counts?.Occupancy || 2} • ${p.PropertyType || "Resort"}`; //[cite: 2]

      return `
        <article class="property-card" data-id="${item.ID}">
          <div class="property-image">
            <img src="${imageSrc}" alt="${p.PropertyName}" onerror="this.src='assets/images/wide-resort1.jpg'" />
            <span class="course-badge">50+ Golf <br /> Courses Nearby</span>
            <div class="image-icons">
              <img src="assets/icons/leaf.svg" alt="Leaf" />
              <img src="assets/icons/marker.svg" alt="Marker" />
              <img src="assets/icons/heart.svg" alt="Save" />
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
      `; //[cite: 2]
    })
    .join("");

  renderPagination(filtered.length);
}

function renderPagination(totalCount) {
  const totalPages = Math.ceil(totalCount / state.pageSize) || 1;
  const paginationList = document.querySelector(".pagination__list"); //[cite: 2]
  const prevBtn = document.querySelector(".pagination__prev"); //[cite: 2]
  const nextBtn = document.querySelector(".pagination__next"); //[cite: 2]

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
    `; //[cite: 2]
  }
  paginationList.innerHTML = pagesHtml;
}

window.goToPage = function (pageNumber) {
  state.page = pageNumber;
  renderProperties();
  document.querySelector(".nearby-stay-section")?.scrollIntoView({ behavior: "smooth" }); //[cite: 2]
};

window.selectProperty = function (propertyId) {
  const item = state.properties.find((p) => p.ID === propertyId);
  if (!item) return;

  state.selectedProperty = item;
  const p = item.Property; //[cite: 2]

  const bookingCard = document.querySelector(".booking-card"); //[cite: 2]
  if (!bookingCard) return;

  const formattedNightPrice = `$${Math.round(p.Price || 0)}`; //[cite: 2]

  const mainHeader = bookingCard.querySelector("h2"); //[cite: 2]
  if (mainHeader) {
    mainHeader.innerHTML = `USD ${formattedNightPrice} <small>AVG PER NIGHT</small>`; //[cite: 2]
  }

  const priceRowNight = bookingCard.querySelector(".price-row-night strong"); //[cite: 2]
  if (priceRowNight) priceRowNight.textContent = `USD ${formattedNightPrice}`;

  const guestText = bookingCard.querySelector(".guest-select strong"); //[cite: 2]
  if (guestText && p.Counts?.Occupancy) { //[cite: 2]
    guestText.textContent = `${p.Counts.Occupancy} GUESTS, ${p.Counts.Bedroom || 1} BEDROOMS`; //[cite: 2]
  }

  const ctaButton = bookingCard.querySelector(".check-button"); //[cite: 2]
  if (ctaButton && item.Partner?.URL) { //[cite: 2]
    ctaButton.onclick = () => window.open(item.Partner.URL, "_blank");
  }

  updateBookingTotals();
  bookingCard.scrollIntoView({ behavior: "smooth" });
};

/* ==========================================================================
   EVENT LISTENERS & FILTER CONTROLS
   ========================================================================== */

function setupFilterEvents() {
  const filterButtons = document.querySelectorAll(".stay-filters .filter-button"); //[cite: 2]

  if (filterButtons.length >= 4) {
    // 1: Lowest Price
    filterButtons[0].childNodes[0].nodeValue = "Lowest Price ";
    filterButtons[0].addEventListener("click", async () => {
      setActiveFilterButton(filterButtons[0]);
      state.currentSort = "lowest-price";
      state.page = 1;
      state.properties = await fetchProperties("lowest-price", state.limit); //[cite: 2]
      renderProperties();
    });

    // 2: Highest Price
    filterButtons[1].childNodes[0].nodeValue = "Highest Price ";
    filterButtons[1].addEventListener("click", async () => {
      setActiveFilterButton(filterButtons[1]);
      state.currentSort = "highest-price";
      state.page = 1;
      state.properties = await fetchProperties("highest-price", state.limit); //[cite: 2]
      renderProperties();
    });

    // 3: 2-Bedroom filter toggle
    filterButtons[2].addEventListener("click", () => {
      state.bedroomFilter = state.bedroomFilter === 2 ? null : 2;
      filterButtons[2].style.borderColor = state.bedroomFilter ? "var(--teal-accent)" : ""; //[cite: 2]
      filterButtons[2].style.color = state.bedroomFilter ? "var(--teal-accent)" : ""; //[cite: 2]
      state.page = 1;
      renderProperties();
    });

    // 4: Most Popular
    filterButtons[3].childNodes[0].nodeValue = "Most Popular ";
    filterButtons[3].addEventListener("click", async () => {
      setActiveFilterButton(filterButtons[3]);
      state.currentSort = "most-popular";
      state.page = 1;
      state.properties = await fetchProperties("most-popular", state.limit); //[cite: 2]
      renderProperties();
    });
  }

  function setActiveFilterButton(activeBtn) {
    [filterButtons[0], filterButtons[1], filterButtons[3]].forEach((btn) => {
      btn.style.borderColor = "";
      btn.style.color = "";
    });
    activeBtn.style.borderColor = "var(--green-primary)"; //[cite: 2]
    activeBtn.style.color = "var(--green-primary)"; //[cite: 2]
  }

  // Search Input Handler
  const searchInput = document.querySelector(".nav-search input"); //[cite: 2]
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim();
      state.page = 1;
      renderProperties();
    });
  }

  // Pagination navigation buttons
  document.querySelector(".pagination__prev")?.addEventListener("click", () => { //[cite: 2]
    if (state.page > 1) window.goToPage(state.page - 1);
  });

  document.querySelector(".pagination__next")?.addEventListener("click", () => { //[cite: 2]
    window.goToPage(state.page + 1);
  });
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  initHotelDatePicker();
  setupFilterEvents();
  await initGallery();

  // Load default dataset
  state.properties = await fetchProperties(state.currentSort, state.limit);
  if (state.properties.length > 0) {
    state.selectedProperty = state.properties[0];
  }

  renderProperties();
  updateBookingTotals();
});

/* ==========================================================================
   PLATFORM DETECTION
   ========================================================================== */

const PLATFORM_LIMITS = { desktop: 6, mobile: 4 };

function detectPlatform() {
  // Prefer the modern User-Agent Client Hints API when the browser supports it
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
    return navigator.userAgentData.mobile ? "mobile" : "desktop";
  }

  // Fallback: parse the classic user agent string for known mobile signatures
  const ua = navigator.userAgent || navigator.vendor || "";
  const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);

  return isMobileUA ? "mobile" : "desktop";
}

function getPlatformLimit() {
  const platform = detectPlatform();
  return PLATFORM_LIMITS[platform] ?? PLATFORM_LIMITS.desktop;
}