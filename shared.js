/* Shared by every page: API base, review helpers, and the common chrome
   (mobile menu, floating nav, reveals) on pages that don't load app.js. */
window.SITE = (() => {
  // GitHub Pages can't run PHP, so it reads reviews from the Hostinger copy.
  const onStatic = /github\.io$/.test(location.hostname);
  const apiBase = onStatic ? "https://ivory-walrus-700758.hostingersite.com" : "";
  const canSubmit = !onStatic || true; // the form POSTs cross-origin to apiBase; CORS is open on the API

  const stars = (n, total = 5) => {
    const wrap = document.createElement("span");
    wrap.className = "stars";
    for (let i = 1; i <= total; i++) { const s = document.createElement("i"); if (i > Math.round(n)) s.className = "off"; wrap.appendChild(s); }
    return wrap;
  };

  async function fetchReviews() {
    const res = await fetch(`${apiBase}/api/reviews.php`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString(undefined, { month: "short", year: "numeric" }); };

  function reviewCard(r) {
    const card = document.createElement("article");
    card.className = "review-card";
    const head = document.createElement("div"); head.className = "review-head";
    head.appendChild(stars(r.rating));
    const when = document.createElement("span"); when.className = "review-date"; when.textContent = fmtDate(r.created); head.appendChild(when);
    const p = document.createElement("p"); p.textContent = r.text;
    const foot = document.createElement("footer");
    const who = document.createElement("strong"); who.textContent = r.name; foot.appendChild(who);
    const sub = document.createElement("span"); sub.textContent = [r.dog, r.service].filter(Boolean).join(" · "); foot.appendChild(sub);
    card.append(head, p, foot);
    return card;
  }

  function initCommon() {
    const burger = document.querySelector(".burger"), menu = document.getElementById("mobileMenu");
    if (burger && menu) {
      burger.addEventListener("click", () => { const open = menu.classList.toggle("open"); burger.setAttribute("aria-expanded", String(open)); });
      menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { menu.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }));
    }
    const year = document.getElementById("year"); if (year) year.textContent = new Date().getFullYear();
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    document.querySelectorAll(".reveal-up").forEach(el => io.observe(el));
    const progress = document.getElementById("progress"), floating = document.getElementById("floatingNav");
    addEventListener("scroll", () => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      if (floating) floating.classList.toggle("show", y > 320);
    }, { passive: true });
  }
  if (document.body.dataset.page !== "home") document.addEventListener("DOMContentLoaded", initCommon);

  return { apiBase, canSubmit, stars, fetchReviews, reviewCard, fmtDate };
})();
