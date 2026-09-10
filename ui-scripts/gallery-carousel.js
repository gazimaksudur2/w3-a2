/**
 * Tablet / mobile gallery carousel
 * - Swipe + arrow navigation
 * - Max 5 viscous/liquid position dots
 * - First 2 / last 2 images map to the first / last dots
 * - Remaining images keep the active dot in the middle
 */

(function () {
  const MAX_DOTS = 5;
  const DOT_SIZE = 10;
  const DOT_GAP = 8;
  const DOT_STEP = DOT_SIZE + DOT_GAP;
  const SWIPE_RATIO = 0.18;
  const SWIPE_MIN_PX = 36;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getDotCount(total) {
    return Math.max(1, Math.min(MAX_DOTS, total));
  }

  /**
   * Maps an image index onto at most 5 dots.
   *  first 2 images  -> first 2 dots
   *  last 2 images   -> last 2 dots
   *  everything else -> middle dot
   */
  function getActiveDotIndex(imageIndex, total, dotCount) {
    if (total <= dotCount) return imageIndex;
    if (imageIndex <= 1) return imageIndex;
    if (imageIndex >= total - 2) return dotCount - (total - imageIndex);
    return Math.floor(dotCount / 2);
  }

  function createSlide(image, index) {
    const slide = document.createElement("div");
    slide.className = "gallery-slider__slide";
    slide.setAttribute("role", "group");
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${index + 1} of gallery`);

    const img = document.createElement("img");
    img.src = image.path;
    img.alt = image.alt || `Golf course image ${index + 1}`;
    img.draggable = false;
    img.loading = index === 0 ? "eager" : "lazy";

    slide.appendChild(img);
    return slide;
  }

  window.initGalleryCarousel = function initGalleryCarousel(images) {
    const root = document.getElementById("gallery-slider");
    const viewport = document.getElementById("gallery-slider-viewport");
    const track = document.getElementById("gallery-slider-track");
    const dotsTrack = document.getElementById("gallery-slider-dots-track");
    const prevBtn = document.getElementById("gallery-slider-prev");
    const nextBtn = document.getElementById("gallery-slider-next");
    const countEl = document.getElementById("gallery-slider-count");

    if (!root || !viewport || !track || !dotsTrack || !Array.isArray(images)) return;

    const slides = images.filter((image) => image && typeof image.path === "string" && image.path);
    if (!slides.length) return;

    const total = slides.length;
    const dotCount = getDotCount(total);
    let index = 0;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragDelta = 0;
    let dragging = false;
    let axisLock = null;
    let liquidEl = null;
    let liquidX = 0;
    let stretchTimer = 0;

    track.innerHTML = "";
    slides.forEach((image, i) => track.appendChild(createSlide(image, i)));

    dotsTrack.innerHTML = "";
    for (let i = 0; i < dotCount; i += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gallery-slider__dot";
      dot.setAttribute("aria-label", `Go to gallery position ${i + 1}`);
      dot.dataset.dotIndex = String(i);
      dotsTrack.appendChild(dot);
    }

    liquidEl = document.createElement("span");
    liquidEl.className = "gallery-slider__liquid";
    liquidEl.setAttribute("aria-hidden", "true");
    liquidEl.addEventListener("animationend", () => {
      liquidEl.classList.remove("is-nudge");
    });
    dotsTrack.appendChild(liquidEl);

    function viewportWidth() {
      return viewport.clientWidth || root.clientWidth || 1;
    }

    function applyTrack(offsetPx, animate) {
      track.style.transition = animate && !REDUCED_MOTION
        ? "transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)"
        : "none";
      track.style.transform = `translate3d(${offsetPx}px, 0, 0)`;
    }

    function snapToIndex(animate) {
      applyTrack(-index * viewportWidth(), animate);
    }

    function updateArrows() {
      if (prevBtn) prevBtn.hidden = index <= 0;
      if (nextBtn) nextBtn.hidden = index >= total - 1;
    }

    function updateCount() {
      if (countEl) countEl.textContent = `${index + 1}/${total}`;
    }

    function updateDotsState() {
      const activeDot = getActiveDotIndex(index, total, dotCount);
      dotsTrack.querySelectorAll(".gallery-slider__dot").forEach((dot, i) => {
        dot.classList.toggle("is-active", i === activeDot);
      });
    }

    function nudgeLiquid() {
      if (REDUCED_MOTION || !liquidEl) return;
      liquidEl.style.setProperty("--nudge-x", `${liquidX}px`);
      liquidEl.classList.remove("is-nudge");
      void liquidEl.offsetWidth;
      liquidEl.classList.add("is-nudge");
    }

    function moveLiquid(nextX, { stretch } = {}) {
      if (!liquidEl) return;

      window.clearTimeout(stretchTimer);

      if (!stretch || REDUCED_MOTION || nextX === liquidX) {
        liquidEl.style.transition = REDUCED_MOTION
          ? "none"
          : "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), width 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
        liquidEl.style.width = `${DOT_SIZE}px`;
        liquidEl.style.transform = `translate3d(${nextX}px, 0, 0)`;
        if (nextX === liquidX && stretch) nudgeLiquid();
        liquidX = nextX;
        return;
      }

      const left = Math.min(liquidX, nextX);
      const span = Math.abs(nextX - liquidX);

      liquidEl.classList.remove("is-nudge");
      liquidEl.style.transition = "transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), width 0.28s cubic-bezier(0.2, 0.7, 0.2, 1)";
      liquidEl.style.width = `${DOT_SIZE + span}px`;
      liquidEl.style.transform = `translate3d(${left}px, 0, 0)`;

      stretchTimer = window.setTimeout(() => {
        liquidEl.style.transition = "transform 0.42s cubic-bezier(0.18, 0.85, 0.2, 1), width 0.42s cubic-bezier(0.18, 0.85, 0.2, 1)";
        liquidEl.style.width = `${DOT_SIZE}px`;
        liquidEl.style.transform = `translate3d(${nextX}px, 0, 0)`;
        liquidX = nextX;
      }, 160);
    }

    function updateLiquid(animate) {
      const activeDot = getActiveDotIndex(index, total, dotCount);
      const nextX = activeDot * DOT_STEP;
      moveLiquid(nextX, { stretch: animate });
      updateDotsState();
    }

    function goTo(nextIndex, { animate = true } = {}) {
      const bounded = clamp(nextIndex, 0, total - 1);
      if (bounded === index && animate) {
        snapToIndex(true);
        updateLiquid(true);
        return;
      }
      index = bounded;
      snapToIndex(animate);
      updateArrows();
      updateCount();
      updateLiquid(animate);
    }

    function onPointerDown(clientX, clientY) {
      dragging = true;
      axisLock = null;
      dragStartX = clientX;
      dragStartY = clientY;
      dragDelta = 0;
      applyTrack(-index * viewportWidth() + dragDelta, false);
    }

    function onPointerMove(clientX, clientY, event) {
      if (!dragging) return;

      const dx = clientX - dragStartX;
      const dy = clientY - dragStartY;

      if (axisLock === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        axisLock = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      if (axisLock !== "h") return;

      if (event && event.cancelable) event.preventDefault();

      const atStart = index === 0 && dx > 0;
      const atEnd = index === total - 1 && dx < 0;
      dragDelta = atStart || atEnd ? dx * 0.35 : dx;
      applyTrack(-index * viewportWidth() + dragDelta, false);
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;

      if (axisLock !== "h") {
        snapToIndex(true);
        dragDelta = 0;
        axisLock = null;
        return;
      }

      const threshold = Math.max(SWIPE_MIN_PX, viewportWidth() * SWIPE_RATIO);
      if (dragDelta > threshold && index > 0) goTo(index - 1);
      else if (dragDelta < -threshold && index < total - 1) goTo(index + 1);
      else goTo(index);

      dragDelta = 0;
      axisLock = null;
    }

    viewport.addEventListener("touchstart", (e) => {
      if (!e.touches[0]) return;
      onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    viewport.addEventListener("touchmove", (e) => {
      if (!e.touches[0]) return;
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY, e);
    }, { passive: false });

    viewport.addEventListener("touchend", onPointerUp);
    viewport.addEventListener("touchcancel", onPointerUp);

    prevBtn?.addEventListener("click", () => goTo(index - 1));
    nextBtn?.addEventListener("click", () => goTo(index + 1));

    dotsTrack.addEventListener("click", (e) => {
      const dot = e.target.closest(".gallery-slider__dot");
      if (!dot) return;
      const dotIndex = Number(dot.dataset.dotIndex);
      if (Number.isNaN(dotIndex)) return;

      if (total <= dotCount) {
        goTo(dotIndex);
        return;
      }
      if (dotIndex <= 1) goTo(dotIndex);
      else if (dotIndex >= dotCount - 2) goTo(total - (dotCount - dotIndex));
      else goTo(2);
    });

    viewport.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      }
    });
    viewport.setAttribute("tabindex", "0");

    window.addEventListener("resize", () => snapToIndex(false));

    goTo(0, { animate: false });
  };
})();
