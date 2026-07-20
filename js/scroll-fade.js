(function () {
  document.querySelectorAll(".col-center-scroll").forEach((el) => {
    const threshold = 16;

    function update() {
      el.classList.toggle("is-scrolled", el.scrollTop > threshold);
    }

    el.addEventListener("scroll", update, { passive: true });
    update();
  });
})();
