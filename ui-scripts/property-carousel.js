/**
 * Mobile nearby-stay property carousel
 * Horizontal snap scrolling with touch gestures and position dots.
 */

(function () {
  const MOBILE_QUERY = "(max-width: 650px)";
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let dotsBound = false;
  let resizeBound = false;
  let activeIndex = 0;
  let resizeTimer = 0;
  let scrollTimer = 0;

  function getGrid() {
    return document.querySelector(".property-grid");
  }

  function getDots() {
    return document.querySelector(".stay-carousel-wrapper");
  }

  function getCards(grid) {
    return Array.from(grid.querySelectorAll(".property-card"));
  }

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function setActiveDot(index) {
    const dotsWrap = getDots();
    if (!dotsWrap) return;
    activeIndex = index;
    dotsWrap.querySelectorAll(".stay-carousel-dot").forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function nearestCardIndex(grid, cards) {
    const origin = grid.getBoundingClientRect().left;
    let best = 0;
    let bestDist = Infinity;

    cards.forEach((card, index) => {
      const dist = Math.abs(card.getBoundingClientRect().left - origin);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });

    return best;
  }

  function scrollToCard(grid, card) {
    const gridRect = grid.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    grid.scrollTo({
      left: grid.scrollLeft + (cardRect.left - gridRect.left),
      behavior: REDUCED_MOTION ? "auto" : "smooth",
    });
  }

  function bindDots() {
    const dotsWrap = getDots();
    if (!dotsWrap || dotsBound) return;
    dotsBound = true;

    dotsWrap.addEventListener("click", (event) => {
      const dot = event.target.closest(".stay-carousel-dot");
      if (!dot) return;

      const grid = getGrid();
      if (!grid) return;

      const index = Number(dot.dataset.index);
      const card = getCards(grid)[index];
      if (!card) return;

      scrollToCard(grid, card);
      setActiveDot(index);
    });
  }

  function bindGridScroll() {
    const grid = getGrid();
    if (!grid || grid.dataset.carouselScrollBound === "true") return;
    grid.dataset.carouselScrollBound = "true";

    grid.addEventListener(
      "scroll",
      () => {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => {
          const cards = getCards(grid);
          if (!cards.length) return;
          setActiveDot(nearestCardIndex(grid, cards));
        }, 40);
      },
      { passive: true }
    );
  }

  function bindResize() {
    if (resizeBound) return;
    resizeBound = true;

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const grid = getGrid();
        if (!grid || !isMobile()) return;
        const card = getCards(grid)[activeIndex];
        if (card) scrollToCard(grid, card);
      }, 120);
    });
  }

  window.syncStayPropertyCarousel = function syncStayPropertyCarousel() {
    const grid = getGrid();
    const dotsWrap = getDots();
    if (!grid || !dotsWrap) return;

    const cards = getCards(grid);
    bindDots();
    bindGridScroll();
    bindResize();

    if (!cards.length) {
      dotsWrap.innerHTML = "";
      activeIndex = 0;
      return;
    }

    dotsWrap.innerHTML = cards
      .map(
        (_, index) => `
          <button
            type="button"
            class="stay-carousel-dot${index === 0 ? " is-active" : ""}"
            data-index="${index}"
            aria-label="Show stay ${index + 1} of ${cards.length}"
            aria-current="${index === 0 ? "true" : "false"}"
          ></button>
        `
      )
      .join("");

    activeIndex = 0;
    grid.scrollLeft = 0;
  };
})();
