/**
 * Gallery Modal Controller (ui-scripts/modal.js)
 */

(function () {
  async function getImages() {
    if (window.galleryImages && window.galleryImages.length > 0) {
      return window.galleryImages;
    }
    try {
      const res = await fetch("/images?full=true");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const images = await res.json();
      window.galleryImages = images;
      return images;
    } catch (err) {
      console.error("Failed to load modal images:", err);
      return [];
    }
  }

  function initModal() {
    const modal = document.getElementById("gallery-modal");
    const viewButton = document.querySelector(".gallery-view-button");
    const closeButton = document.getElementById("gallery-modal-close");
    const backdrop = document.getElementById("gallery-modal-backdrop");
    const grid = document.getElementById("modal-gallery-grid");
    const countEl = document.getElementById("modal-image-count");

    if (!modal || !viewButton) return;

    async function openModal() {
      const images = await getImages();
      if (!images || images.length === 0) return;

      if (typeof window.mountGalleryModalChrome === "function") {
        window.mountGalleryModalChrome();
      }

      if (grid && grid.children.length === 0) {
        grid.innerHTML = images
          .map(
            (img, idx) => `
            <div class="gallery-modal__card">
              <img 
                src="${img.path}" 
                alt="${img.alt || `Golf Course Photo ${idx + 1}`}" 
                loading="lazy"
              />
              <span class="gallery-modal__caption">${img.alt || `Photo ${idx + 1}`}</span>
            </div>
          `
          )
          .join("");
      }

      if (countEl) countEl.textContent = images.length;

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModal);
  } else {
    initModal();
  }
})();