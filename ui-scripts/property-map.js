/**
 * Nearby Stay Google Map
 * Markers for currently displayed property tiles, with hover/click highlighting.
 */

(function () {
  const GOOGLE_MAPS_API_KEY = __GOOGLE_MAPS_API_KEY__;
  const MARKER_DEFAULT = "#2e6b3e";
  const MARKER_ACTIVE = "#e11d48";
  let map = null;
  let markersById = new Map();
  let hoveredId = null;
  let selectedId = null;
  let pendingItems = null;
  let mapsReady = false;
  let gridBound = false;

  function parseCoord(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function toMapItem(item) {
    const lat = parseCoord(item?.GeoInfo?.Lat);
    const lng = parseCoord(item?.GeoInfo?.Lng);
    if (lat === null || lng === null) return null;

    return {
      id: String(item.ID),
      name: item.Property?.PropertyName || "Property",
      lat,
      lng,
    };
  }

  function pinIcon(color, scale) {
    const width = 28 * scale;
    const height = 36 * scale;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 32 40">
        <path fill="${color}" d="M16 0C7.163 0 0 7.163 0 16c0 11.5 16 24 16 24s16-12.5 16-24C32 7.163 24.837 0 16 0z"/>
        <circle fill="#ffffff" cx="16" cy="16" r="6"/>
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(width, height),
      anchor: new google.maps.Point(width / 2, height),
    };
  }

  function isMarkerActive(id) {
    return id === hoveredId || id === selectedId;
  }

  function styleMarker(id) {
    const marker = markersById.get(id);
    if (!marker) return;
    const active = isMarkerActive(id);
    marker.setIcon(pinIcon(active ? MARKER_ACTIVE : MARKER_DEFAULT, active ? 1.28 : 1));
    marker.setZIndex(active ? 1000 : 1);
  }

  function styleAllMarkers() {
    markersById.forEach((_, id) => styleMarker(id));
  }

  function clearCardHighlights() {
    document.querySelectorAll(".property-card.is-map-highlight").forEach((card) => {
      card.classList.remove("is-map-highlight");
    });
  }

  function highlightCard(propertyId) {
    clearCardHighlights();
    if (!propertyId) return;

    const card = document.querySelector(
      `.property-card[data-id="${CSS.escape(propertyId)}"]`
    );
    if (!card) return;

    card.classList.add("is-map-highlight");
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearMarkers() {
    markersById.forEach((marker) => marker.setMap(null));
    markersById.clear();
  }

  function fitMarkers(items) {
    if (!map || !items.length) return;

    if (items.length === 1) {
      map.setCenter({ lat: items[0].lat, lng: items[0].lng });
      map.setZoom(11);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    items.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }));
    map.fitBounds(bounds, 48);
  }

  function renderMarkers(rawItems) {
    if (!mapsReady || !map) {
      pendingItems = rawItems;
      return;
    }

    const items = (rawItems || []).map(toMapItem).filter(Boolean);
    clearMarkers();

    items.forEach((item) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: item.lat, lng: item.lng },
        title: item.name,
        icon: pinIcon(MARKER_DEFAULT, 1),
        optimized: false,
      });

      marker.addListener("click", () => {
        selectedId = item.id;
        highlightCard(item.id);
        styleAllMarkers();
      });

      markersById.set(item.id, marker);
    });

    if (selectedId && !markersById.has(selectedId)) {
      selectedId = null;
      clearCardHighlights();
    } else if (selectedId) {
      highlightCard(selectedId);
    }

    hoveredId = null;
    styleAllMarkers();
    window.requestAnimationFrame(() => {
      google.maps.event.trigger(map, "resize");
      fitMarkers(items);
    });
  }

  function bindCardHover() {
    const grid = document.querySelector(".property-grid");
    if (!grid || gridBound) return;
    gridBound = true;

    grid.addEventListener("pointerover", (event) => {
      const card = event.target.closest(".property-card[data-id]");
      if (!card || !grid.contains(card)) return;
      const id = card.dataset.id;
      if (!id || hoveredId === id) return;
      hoveredId = id;
      styleAllMarkers();
    });

    grid.addEventListener("pointerout", (event) => {
      const card = event.target.closest(".property-card[data-id]");
      if (!card) return;
      if (event.relatedTarget && card.contains(event.relatedTarget)) return;
      if (hoveredId !== card.dataset.id) return;
      hoveredId = null;
      styleAllMarkers();
    });
  }

  function showFallback(message) {
    const canvas = document.getElementById("stay-map-canvas");
    if (!canvas) return;
    canvas.innerHTML = `<p class="stay-map__fallback">${message}</p>`;
  }

  function loadMapsScript(apiKey) {
    return new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve();
        return;
      }

      const existing = document.querySelector("script[data-google-maps]");
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMaps = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google Maps failed to load"));
      document.head.appendChild(script);
    });
  }

  async function initMap() {
    const canvas = document.getElementById("stay-map-canvas");
    if (!canvas) return;

    bindCardHover();

    const apiKey = typeof GOOGLE_MAPS_API_KEY === "string" ? GOOGLE_MAPS_API_KEY : "";

    if (!apiKey) {
      showFallback("Add GOOGLE_MAPS_API_KEY to your .env file to load the map.");
      return;
    }

    try {
      await loadMapsScript(apiKey);
    } catch (err) {
      console.error(err);
      showFallback("Google Maps could not be loaded.");
      return;
    }

    map = new google.maps.Map(canvas, {
      center: { lat: 28.38566, lng: -81.27411 },
      zoom: 8,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    map.addListener("click", () => {
      selectedId = null;
      clearCardHighlights();
      styleAllMarkers();
    });

    mapsReady = true;
    renderMarkers(pendingItems || []);
    pendingItems = null;
  }

  window.syncNearbyStayMap = function syncNearbyStayMap(items) {
    renderMarkers(Array.isArray(items) ? items : []);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMap);
  } else {
    initMap();
  }
})();
