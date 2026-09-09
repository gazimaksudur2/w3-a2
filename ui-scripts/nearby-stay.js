/* ==========================================================================
   CONFIG
   ========================================================================== */

const IMAGE_SERVICE_BASE = "https://beta.imgservice.rentbyowner.com/640x300/";

/* ==========================================================================
   APPLICATION STATE
   ========================================================================== */

const state = {
  currentSort: "most-popular", // 'most-popular' | 'lowest-price' | 'highest-price'
  limit: getPlatformLimit(),    // 6 on desktop, 4 on mobile — resolved once at load
  page: 1,
  pageSize: getPlatformLimit(), // one page == the full fetched set
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

/* ==========================================================================
   PROPERTY RENDERING
   ========================================================================== */

function buildPropertyImageUrl(featureImage) {
  if (!featureImage) return "assets/images/wide-resort1.jpg"; // local fallback
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
      `;
    })
    .join("");

  renderPagination(filtered.length);
}

/* ==========================================================================
   SORT DROPDOWN
   ========================================================================== */

function setupSortDropdown() {
  const sortSelect = document.getElementById("sort-select");
  if (!sortSelect) return;

  sortSelect.value = state.currentSort; // ensure it reflects "most-popular" default

  sortSelect.addEventListener("change", async (e) => {
    const sortType = e.target.value; // 'most-popular' | 'highest-price' | 'lowest-price'
    state.currentSort = sortType;
    state.page = 1;
    state.properties = await fetchProperties(sortType, state.limit);
    renderProperties();
  });
}

/* ==========================================================================
   OTHER FILTER EVENTS (bedroom filter, search — unchanged behavior)
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
  await initGallery();

  // Initial load: Most Popular, with the platform-derived limit
  state.properties = await fetchProperties(state.currentSort, state.limit);
  if (state.properties.length > 0) {
    state.selectedProperty = state.properties[0];
  }

  renderProperties();
  updateBookingTotals();
});