const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Scroll Reveal (optimized) */
const revealEls = document.querySelectorAll(".reveal");
if (revealEls.length) {
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("active"));
  }
}

/* Counter Animation (starts when visible) */
const counters = document.querySelectorAll(".counter");
const animateCounter = (counter) => {
  const target = Number(counter.getAttribute("data-target")) || 0;
  if (prefersReducedMotion) {
    counter.innerText = String(target);
    return;
  }
  let count = 0;
  const increment = Math.max(1, Math.ceil(target / 80));
  const timer = setInterval(() => {
    count += increment;
    if (count >= target) {
      counter.innerText = String(target);
      clearInterval(timer);
      return;
    }
    counter.innerText = String(count);
  }, 20);
};

if ("IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  counters.forEach(counter => counterObserver.observe(counter));
} else {
  counters.forEach(counter => animateCounter(counter));
}

/* 3D Tilt Effect */
document.querySelectorAll(".tilt").forEach(card => {
  if (prefersReducedMotion) return;

  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = ((y / rect.height) - 0.5) * 10;
    const rotateY = ((x / rect.width) - 0.5) * -10;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "rotateX(0) rotateY(0)";
  });
});
