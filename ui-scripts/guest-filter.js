/* ==========================================================================
   GUEST / FILTERS MODAL (Guests, Infants, Pets)
   ========================================================================== */

const guestFilters = {
  guests: 1,
  infants: 0,
  pets: 0,
};

// Only a floor now — guests can't drop below 1, infants/pets can't go negative.
// No ceiling.
const GUEST_LIMITS = {
  guests: { min: 1 },
  infants: { min: 0 },
  pets: { min: 0 },
};

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatGuestSummary() {
  const parts = [];

  if (guestFilters.guests > 0) parts.push(pluralize(guestFilters.guests, "Guest"));
  if (guestFilters.infants > 0) parts.push(pluralize(guestFilters.infants, "Infant"));
  if (guestFilters.pets > 0) parts.push(pluralize(guestFilters.pets, "Pet"));

  // Guests should never actually be 0 given the min, but guard anyway
  return parts.length ? parts.join(", ") : "Add Guests";
}

function updateGuestSelectButton() {
  document.querySelectorAll(".guest-select strong").forEach((trigger) => {
    trigger.textContent = formatGuestSummary().toUpperCase();
  });
}

function updateStepperUI() {
  Object.keys(guestFilters).forEach((type) => {
    const row = document.querySelector(`.guest-row[data-type="${type}"]`);
    if (!row) return;

    const valueEl = row.querySelector(".guest-stepper__value");
    const minusBtn = row.querySelector('[data-action="decrement"]');
    const { min } = GUEST_LIMITS[type];

    valueEl.textContent = guestFilters[type];
    minusBtn.disabled = guestFilters[type] <= min;
    // no plusBtn.disabled — no ceiling anymore
  });
}

function changeGuestValue(type, delta) {
  const { min } = GUEST_LIMITS[type];
  const next = guestFilters[type] + delta;

  // Realistic validation: never drop below the floor (no negatives, guests >= 1)
  guestFilters[type] = Math.max(min, next);

  updateStepperUI();
  updateGuestSelectButton();
}

function setupGuestModal() {
  const modal = document.getElementById("guest-modal");
  const closeBtn = document.getElementById("guest-modal-close");
  const backdrop = document.getElementById("guest-modal-backdrop");

  if (!modal) return;

  function openModal() {
    updateStepperUI();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!document.getElementById("gallery-modal")?.classList.contains("is-open")) {
      document.body.classList.remove("modal-open");
    }
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest(".guest-select")) openModal();
  });
  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  modal.querySelectorAll(".guest-stepper__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".guest-row");
      const type = row.dataset.type;
      const delta = btn.dataset.action === "increment" ? 1 : -1;
      changeGuestValue(type, delta);
    });
  });

  updateGuestSelectButton();
}

document.addEventListener("DOMContentLoaded", setupGuestModal);