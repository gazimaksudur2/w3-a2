function setupCourseDescriptionToggle() {
  const description = document.querySelector(
    ".course-overview-description"
  );

  const button = document.querySelector(
    ".read-more-link"
  );

  const arrow = document.querySelector(
    ".read-more-arrow"
  );


  if (!description || !button) return;


  button.addEventListener("click", () => {

    const expanded = description.classList.toggle(
      "is-expanded"
    );


    button.textContent = expanded
      ? "See Less"
      : "See More";


    arrow?.classList.toggle(
      "rotate",
      expanded
    );

  });
}


document.addEventListener(
  "DOMContentLoaded",
  setupCourseDescriptionToggle
);