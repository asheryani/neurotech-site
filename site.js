// Progressive enhancement only. Without JS everything is visible and usable:
// the nav is fully rendered, the reveal animations are skipped, and the
// contact form falls back to a plain mailto: submission.
document.documentElement.classList.add("js");

// Scroll reveal
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
}

// Mobile navigation
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) toggle.click();
  });
}

// Contact form: compose a pre-filled email in the visitor's mail client.
// Set data-endpoint on the <form> to POST JSON to a form backend instead.
const form = document.querySelector(".contact-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        showStatus(form, form.dataset.successText || "Thank you. We will be in touch shortly.");
        return;
      } catch (err) {
        /* fall through to mailto */
      }
    }
    const lines = Object.entries(data)
      .filter(([k]) => k !== "consent")
      .map(([k, v]) => `${k}: ${v}`);
    const body = encodeURIComponent(lines.join("\n") + "\n");
    const subject = encodeURIComponent(form.dataset.subject || "Inquiry");
    window.location.href = `mailto:${form.dataset.email}?subject=${subject}&body=${body}`;
  });
}

function showStatus(form, text) {
  let el = form.querySelector(".form-status");
  if (!el) {
    el = document.createElement("p");
    el.className = "form-status";
    el.setAttribute("role", "status");
    form.appendChild(el);
  }
  el.textContent = text;
}
