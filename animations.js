window.addEventListener("scroll", () => {
  document.querySelectorAll(".fade-in").forEach((el) => {
    const pos = el.getBoundingClientRect().top;
    if (pos < window.innerHeight - 100) el.classList.add("visible");
  });
});
