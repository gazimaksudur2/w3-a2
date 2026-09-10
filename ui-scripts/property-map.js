/**
 * Nearby Stay Google Map
 * Markers for currently displayed property tiles, with hover/click highlighting.
 */

(function () {
  const GOOGLE_MAPS_API_KEY = __GOOGLE_MAPS_API_KEY__;
  const MARKER_DEFAULT = "#2e6b3e";
  const MARKER_ACTIVE = "#e11d48";
  const DEMO_MAP_ID = "DEMO_MAP_ID";
  let MapCtor = null;
  let LatLngBoundsCtor = null;
  let AdvancedMarkerElement = null;
  let PinElement = null;
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
    const id = item?.ID == null ? "" : String(item.ID).trim();
    const lat = parseCoord(item?.GeoInfo?.Lat);
    const lng = parseCoord(item?.GeoInfo?.Lng);
    if (!id || lat === null || lng === null) return null;

    return {
      id,
      name: item.Property?.PropertyName || "Stay details unavailable",
      lat,
      lng,
    };
  }

  function stylePin(pin, active) {
    pin.background = active ? MARKER_ACTIVE : MARKER_DEFAULT;
    pin.borderColor = active ? "#9f1239" : "#1f4d2c";
    pin.glyphColor = "#ffffff";
    pin.scale = active ? 1.28 : 1;
  }

  function createPin(active) {
    const pin = new PinElement({
      background: MARKER_DEFAULT,
      borderColor: "#1f4d2c",
      glyphColor: "#ffffff",
      scale: 1,
    });
    stylePin(pin, active);
    return pin;
  }

  function isMarkerActive(id) {
    return id === hoveredId || id === selectedId;
  }

  function styleMarker(id) {
    const entry = markersById.get(id);
    if (!entry) return;
    const active = isMarkerActive(id);
    stylePin(entry.pin, active);
    entry.marker.zIndex = active ? 1000 : 1;
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
    markersById.forEach(({ marker }) => {
      marker.map = null;
    });
    markersById.clear();
  }

  function fitMarkers(items) {
    if (!map || !items.length) return;

    if (items.length === 1) {
      map.setCenter({ lat: items[0].lat, lng: items[0].lng });
      map.setZoom(11);
      return;
    }

    if (typeof LatLngBoundsCtor === "function") {
      const bounds = new LatLngBoundsCtor();
      items.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }));
      map.fitBounds(bounds, 48);
      return;
    }

    map.fitBounds(
      {
        north: Math.max(...items.map((item) => item.lat)),
        south: Math.min(...items.map((item) => item.lat)),
        east: Math.max(...items.map((item) => item.lng)),
        west: Math.min(...items.map((item) => item.lng)),
      },
      48
    );
  }

  function onMarkerClick(propertyId) {
    selectedId = propertyId;
    highlightCard(propertyId);
    styleAllMarkers();
  }

  function bindMarkerClick(marker, propertyId) {
    marker.addEventListener("gmp-click", () => onMarkerClick(propertyId));
  }

  function renderMarkers(rawItems) {
    if (!mapsReady || !map) {
      pendingItems = rawItems;
      return;
    }

    try {
      const items = (rawItems || []).map(toMapItem).filter(Boolean);
      clearMarkers();

      items.forEach((item) => {
        const pin = createPin(false);
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: item.lat, lng: item.lng },
          title: item.name,
          content: pin,
          gmpClickable: true,
          zIndex: 1,
        });

        bindMarkerClick(marker, item.id);
        markersById.set(item.id, { marker, pin });
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
        try {
          google.maps.event.trigger(map, "resize");
          fitMarkers(items);
        } catch {
          // Keep the map usable if bounds fitting fails.
        }
      });
    } catch {
      clearMarkers();
    }
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

  function installMapsBootstrap(apiKey) {
    if (window.google?.maps?.importLibrary) return;

    const options = {
      key: apiKey,
      v: "weekly",
      loading: "async",
    };
    const apiName = "The Google Maps JavaScript API";
    const ns = "google";
    const importName = "importLibrary";
    const bootstrapCallback = "__ib__";
    const doc = document;
    const win = window;
    win[ns] = win[ns] || {};
    const mapsNs = win[ns].maps || (win[ns].maps = {});
    const requested = new Set();
    const params = new URLSearchParams();
    let loadPromise;

    const loadScript = () =>
      loadPromise ||
      (loadPromise = new Promise((resolve, reject) => {
        const script = doc.createElement("script");
        params.set("libraries", [...requested] + "");
        Object.keys(options).forEach((key) => {
          params.set(
            key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`),
            options[key]
          );
        });
        params.set("callback", `${ns}.maps.${bootstrapCallback}`);
        script.src = `https://maps.${ns}apis.com/maps/api/js?${params}`;
        script.async = true;
        script.dataset.googleMaps = "true";
        mapsNs[bootstrapCallback] = resolve;
        script.onerror = () => reject(new Error(`${apiName} could not load.`));
        doc.head.appendChild(script);
      }));

    mapsNs[importName] = (library, ...rest) =>
      requested.add(library) && loadScript().then(() => mapsNs[importName](library, ...rest));
  }

  async function loadMapsLibraries(apiKey) {
    installMapsBootstrap(apiKey);
    const [mapsLib, markerLib, coreLib] = await Promise.all([
      google.maps.importLibrary("maps"),
      google.maps.importLibrary("marker"),
      google.maps.importLibrary("core"),
    ]);
    MapCtor = mapsLib.Map;
    LatLngBoundsCtor =
      coreLib?.LatLngBounds || mapsLib?.LatLngBounds || google.maps.LatLngBounds;
    AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
    PinElement = markerLib.PinElement;
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
      await loadMapsLibraries(apiKey);
    } catch {
      showFallback("Google Maps could not be loaded.");
      return;
    }

    try {
      map = new MapCtor(canvas, {
        center: { lat: 28.38566, lng: -81.27411 },
        zoom: 8,
        mapId: DEMO_MAP_ID,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        clickableIcons: false,
      });

      map.addListener("click", () => {
        selectedId = null;
        clearCardHighlights();
        styleAllMarkers();
      });

      mapsReady = true;
      renderMarkers(pendingItems || []);
      pendingItems = null;
    } catch {
      showFallback("Google Maps could not be loaded.");
    }
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
