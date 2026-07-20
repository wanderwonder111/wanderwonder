(function initGallery() {
  const galleryItems = document.querySelectorAll(".gallery-item");
  if (!galleryItems.length) return;

  galleryItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      galleryItems.forEach((el) => el.classList.remove("is-expanded"));
      item.classList.add("is-expanded");
    });
  });
})();
