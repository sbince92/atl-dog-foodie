/* ================================================================
   ATL DOG FOODIE — app.js
   Everything the owner is likely to tweak lives in CONFIG.
   ================================================================ */
const CONFIG = {
  // Where inquiries go. Leave empty to run in "demo" mode (logs to console, shows success).
  // Works out of the box with Formspree: "https://formspree.io/f/XXXXXXXX"
  inquiryEndpoint: "",
  // Real rates (USD). Boarding is per day; stays of 7+ days use the weekly rate.
  rates: { boarding: 25, week: 150, bath: 25, nails: 7, nexgard: 30, vitamins: 3, foodSmall: 5, foodLarge: 10, foodWeightSplit: 40 },
  addons: {
    bath:    { label: "Medicated bath", flat: 25 },
    nails:   { label: "Nail trim", flat: 7 },
    nexgard: { label: "NexGard Plus flea & heartworm pill", flat: 30 },
    food:    { label: "Food provided", perDayByWeight: true },
    vitamins:{ label: "Daily vitamins", perDay: 3 },
  },
  // Capacity used to fake availability until a real booking backend exists.
  capacity: 6,
  // Dates that are closed outright (YYYY-MM-DD). Add holidays here.
  closed: ["2026-12-25", "2027-01-01"],
  minNights: 1,
  monthsAhead: 11,
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- helpers ---------- */
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = d => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtLong = d => d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const money = n => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);

/* ---------- availability (deterministic mock) ----------
   Replace `occupancyFor` with a fetch to your booking system later. */
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
function occupancyFor(date) {
  const key = iso(date);
  if (CONFIG.closed.includes(key)) return CONFIG.capacity;
  const dow = date.getDay();
  const base = (dow === 5 || dow === 6) ? 0.72 : 0.45;        // weekends busier
  const month = date.getMonth();
  const seasonal = (month === 11 || month === 6 || month === 7) ? 0.2 : 0; // Dec, Jul, Aug
  const noise = hash(key) * 0.45;
  return Math.min(CONFIG.capacity, Math.round((base + seasonal + noise) * CONFIG.capacity));
}
function statusFor(date) {
  const occ = occupancyFor(date);
  if (occ >= CONFIG.capacity) return "full";
  if (occ >= CONFIG.capacity - 2) return "limited";
  return "open";
}

/* ================================================================
   CALENDAR
   ================================================================ */
const today = startOfDay(new Date());
const state = { view: new Date(today.getFullYear(), today.getMonth(), 1), start: null, end: null };

const calGrid = $("#calGrid"), calTitle = $("#calTitle");
const prevBtn = $("#prevMonth"), nextBtn = $("#nextMonth");
const sumIn = $("#sumIn"), sumOut = $("#sumOut"), sumNights = $("#sumNights"), sumEstimate = $("#sumEstimate");
const checkinField = $("#checkinField"), checkoutField = $("#checkoutField");
const serviceSelect = $("#serviceSelect");

function renderCalendar() {
  const y = state.view.getFullYear(), m = state.view.getMonth();
  calTitle.textContent = state.view.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const frag = document.createDocumentFragment();

  for (let i = 0; i < lead; i++) { const p = document.createElement("div"); p.className = "day pad"; frag.appendChild(p); }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    const el = document.createElement("button");
    el.type = "button";
    el.className = "day";
    el.textContent = d;
    el.dataset.date = iso(date);
    el.setAttribute("role", "gridcell");
    const past = date < today;
    const status = statusFor(date);
    if (past) { el.classList.add("past"); el.disabled = true; el.setAttribute("aria-label", `${fmtLong(date)}, past`); }
    else {
      el.classList.add(status);
      if (status === "full") { el.disabled = true; }
      el.setAttribute("aria-label", `${fmtLong(date)}, ${status === "open" ? "available" : status}`);
    }
    if (iso(date) === iso(today)) el.classList.add("today");

    if (state.start && iso(date) === iso(state.start)) el.classList.add("start");
    if (state.end && iso(date) === iso(state.end)) el.classList.add("end");
    if (state.start && state.end && date > state.start && date < state.end) el.classList.add("in-range");

    frag.appendChild(el);
  }
  calGrid.replaceChildren(frag);

  const minView = new Date(today.getFullYear(), today.getMonth(), 1);
  const maxView = new Date(today.getFullYear(), today.getMonth() + CONFIG.monthsAhead, 1);
  prevBtn.disabled = state.view <= minView;
  nextBtn.disabled = state.view >= maxView;
}

function rangeIsClear(a, b) {
  // Every night from a (inclusive) to b (exclusive) must not be full.
  for (let d = new Date(a); d < b; d = addDays(d, 1)) if (statusFor(d) === "full") return false;
  return true;
}

function pickDate(date) {
  const singleDay = serviceSelect.value !== "boarding";
  if (singleDay) { state.start = date; state.end = addDays(date, 1); syncSelection(); return; }

  if (!state.start || (state.start && state.end)) { state.start = date; state.end = null; }
  else if (date <= state.start) { state.start = date; state.end = null; }
  else {
    if (!rangeIsClear(state.start, date)) { flash("That range crosses a full night. Try a different check-out date."); state.start = date; state.end = null; }
    else if (daysBetween(state.start, date) < CONFIG.minNights) { state.start = date; state.end = null; }
    else state.end = date;
  }
  syncSelection();
}

function boardingCost(days) {
  const weeks = Math.floor(days / 7), rest = days % 7;
  // a partial week never costs more than a full week
  return weeks * CONFIG.rates.week + Math.min(rest * CONFIG.rates.boarding, CONFIG.rates.week);
}
function foodRate() {
  const w = parseFloat(form.elements.weight.value);
  if (!w) return null;
  return w <= CONFIG.rates.foodWeightSplit ? CONFIG.rates.foodSmall : CONFIG.rates.foodLarge;
}
function estimate() {
  if (!state.start || !state.end) return null;
  const svc = serviceSelect.value;
  const nights = daysBetween(state.start, state.end);
  const days = svc === "boarding" ? nights : 1;
  let total = svc === "boarding" ? boardingCost(days) : 0;
  const lines = [];
  if (svc === "boarding") lines.push(days >= 7 ? `${days} days at weekly rate` : `${days} × $${CONFIG.rates.boarding}`);
  $$('input[name="addons"]:checked').forEach(cb => {
    const a = CONFIG.addons[cb.value]; if (!a) return;
    if (a.perDayByWeight) { const r = foodRate() ?? CONFIG.rates.foodSmall; total += r * days; lines.push(`food $${r}/day`); }
    else if (a.perDay) { total += a.perDay * days; lines.push(`${a.label} $${a.perDay}/day`); }
    else { total += a.flat; lines.push(a.label); }
  });
  return { nights, days, total, lines };
}

function syncSelection() {
  renderCalendar();
  const boarding = serviceSelect.value === "boarding";
  checkoutField.closest(".field").style.display = boarding ? "" : "none";
  checkoutField.required = boarding;

  if (state.start) { sumIn.textContent = fmt(state.start); checkinField.value = fmtLong(state.start); }
  else { sumIn.textContent = "—"; checkinField.value = ""; }
  if (state.end && boarding) { sumOut.textContent = fmt(state.end); checkoutField.value = fmtLong(state.end); }
  else { sumOut.textContent = boarding ? "—" : "n/a"; checkoutField.value = ""; }

  const est = estimate();
  if (est) {
    sumNights.textContent = boarding ? est.nights : "drop-in";
    sumEstimate.textContent = money(est.total);
  } else {
    sumNights.textContent = state.start && boarding ? "pick check-out" : "—";
    sumEstimate.textContent = "—";
  }
}

calGrid.addEventListener("click", e => {
  const el = e.target.closest(".day"); if (!el || el.disabled || el.classList.contains("pad")) return;
  pickDate(fromISO(el.dataset.date));
});
prevBtn.addEventListener("click", () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCalendar(); });
nextBtn.addEventListener("click", () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCalendar(); });
$("#clearDates").addEventListener("click", () => { state.start = state.end = null; syncSelection(); });
serviceSelect.addEventListener("change", () => { if (serviceSelect.value !== "boarding" && state.start) state.end = addDays(state.start, 1); syncSelection(); });
$$('input[name="addons"]').forEach(cb => cb.addEventListener("change", syncSelection));
// food price follows the dog's weight
document.addEventListener("input", e => {
  if (e.target === form.elements.weight) { const r = foodRate(); $("#foodRate").textContent = r ? `$${r}` : "$5–10"; syncSelection(); }
});
[checkinField, checkoutField].forEach(f => f.addEventListener("click", () => $("#calendar").scrollIntoView({ behavior: "smooth", block: "center" })));

// "Book boarding/daycare/grooming" buttons preselect the service.
$$("[data-pick]").forEach(a => a.addEventListener("click", () => {
  serviceSelect.value = a.dataset.pick;
  if (a.dataset.addon) { const cb = $(`input[name="addons"][value="${a.dataset.addon}"]`); if (cb) cb.checked = true; }
  syncSelection();
}));

/* ---------- small toast ---------- */
let toastTimer;
function flash(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t);
    Object.assign(t.style, { position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%) translateY(20px)", background: "#CDF73D", color: "#250104", padding: "12px 18px", borderRadius: "6px", fontSize: "14px", fontWeight: "500", zIndex: 50, opacity: 0, transition: "all .35s cubic-bezier(.22,.8,.2,1)", maxWidth: "90vw", textAlign: "center" }); }
  t.textContent = msg;
  requestAnimationFrame(() => { t.style.opacity = 1; t.style.transform = "translateX(-50%)"; });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = 0; t.style.transform = "translateX(-50%) translateY(20px)"; }, 3200);
}

/* ================================================================
   INQUIRY FORM
   ================================================================ */
const form = $("#inquiryForm"), formError = $("#formError"), success = $("#inquirySuccess"), submitBtn = $("#submitBtn");

function validate() {
  let ok = true, firstBad = null;
  $$(".field.invalid, .toggles.invalid").forEach(el => el.classList.remove("invalid"));
  $$("[required]", form).forEach(input => {
    const valid = input.type === "checkbox" ? input.checked : input.checkValidity() && input.value.trim() !== "";
    if (!valid) {
      ok = false;
      const wrap = input.closest(".field") || input.closest(".toggles");
      wrap && wrap.classList.add("invalid");
      firstBad ||= input;
    }
  });
  if (!state.start) { ok = false; firstBad ||= checkinField; }
  if (serviceSelect.value === "boarding" && !state.end) { ok = false; firstBad ||= checkoutField; }
  return { ok, firstBad };
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const { ok, firstBad } = validate();
  if (!ok) {
    formError.hidden = false;
    formError.textContent = !state.start ? "Pick your dates on the calendar first." : "A few required fields still need attention.";
    firstBad && firstBad.focus({ preventScroll: false });
    if (firstBad === checkinField || firstBad === checkoutField) $("#calendar").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  formError.hidden = true;

  const data = Object.fromEntries(new FormData(form).entries());
  data.addons = $$('input[name="addons"]:checked').map(c => c.value);
  data.checkin = iso(state.start);
  data.checkout = state.end ? iso(state.end) : null;
  data.estimate = estimate()?.total ?? null;
  data.submittedAt = new Date().toISOString();
  data._subject = `Booking inquiry: ${data.dogName} (${data.service}) ${data.checkin}`;

  submitBtn.disabled = true; submitBtn.textContent = "Sending…";
  try {
    if (CONFIG.inquiryEndpoint) {
      const res = await fetch(CONFIG.inquiryEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } else {
      console.info("[demo mode] inquiry payload:", data);
      await new Promise(r => setTimeout(r, 700));
    }
    $("#successText").textContent = `Thanks ${data.ownerName.split(" ")[0]} — we've got ${data.dogName}'s request for ${fmt(state.start)}${state.end && data.service === "boarding" ? ` → ${fmt(state.end)}` : ""}. We'll confirm within one business day.`;
    form.hidden = true; success.hidden = false;
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    formError.hidden = false;
    formError.textContent = "Something went wrong sending that. Please try again or call us.";
    console.error(err);
  } finally {
    submitBtn.disabled = false; submitBtn.innerHTML = 'Send booking inquiry <span class="arrow">↗</span>';
  }
});

$("#anotherBtn").addEventListener("click", () => {
  form.reset(); state.start = state.end = null; syncSelection();
  success.hidden = true; form.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ================================================================
   HOMEPAGE MOTION
   ================================================================ */
// Scroll reveals
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
}, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
// Hero items reveal on load (staggered via --d); everything else reveals on scroll.
requestAnimationFrame(() => $$(".hero .reveal-up").forEach(el => el.classList.add("in")));
$$(".reveal-up").forEach(el => { if (!el.closest(".hero")) io.observe(el); });

// Count-up stats
const counterIO = new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, target = parseFloat(el.dataset.count), decimals = +(el.dataset.decimals || 0), prefix = el.dataset.prefix || "";
    const dur = 1400, t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
      const v = target * eased;
      el.textContent = prefix + (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString() + (target >= 1000 ? "+" : ""));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    counterIO.unobserve(el);
  });
}, { threshold: 0.6 });
$$("[data-count]").forEach(el => counterIO.observe(el));

// Hero: the dog leans very slightly with the pointer
const hero = $(".hero"), heroMedia = $(".hero-media"), dogWrap = $("#dogWrap");
if (matchMedia("(pointer:fine)").matches && dogWrap) {
  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    const dx = (e.clientX / r.width - 0.5) * 12, dy = (e.clientY / r.height - 0.5) * 6;
    dogWrap.style.translate = `${dx}px ${dy}px`;
  });
  hero.addEventListener("pointerleave", () => { dogWrap.style.translate = ""; });
}
// Scroll: parallax the photo, fill the progress bar, show the floating nav after the hero
const progress = $("#progress"), floatingNav = $("#floatingNav");
let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    heroMedia.style.transform = `translateY(${Math.min(y, innerHeight) * 0.18}px)`;
    if (dogWrap) dogWrap.style.marginBottom = `-${Math.min(y, innerHeight) * 0.1}px`;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    floatingNav.classList.toggle("show", y > innerHeight * 0.8);
    ticking = false;
  });
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Mobile menu
const burger = $(".burger"), mobileMenu = $("#mobileMenu");
burger.addEventListener("click", () => {
  const open = mobileMenu.classList.toggle("open");
  burger.setAttribute("aria-expanded", String(open));
});
$$("a", mobileMenu).forEach(a => a.addEventListener("click", () => { mobileMenu.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }));

// Prices from CONFIG so there's one source of truth
$$("[data-price]").forEach(el => { const key = el.dataset.price.replace(/\d+$/, ""); if (CONFIG.rates[key] != null) el.textContent = CONFIG.rates[key]; });
$("#year").textContent = new Date().getFullYear();

// Boot
syncSelection();

/* ================================================================
   VITAMINS — jar row + benefits popup
   ================================================================ */
const VITAMINS = {
  daily:     { name: "Daily Care", label: "Daily Care", color: "#E8641B", kicker: "Everyday multivitamin",
               summary: "A daily soft chew that covers the basics while your dog is away from home: vitamins, minerals and antioxidants to keep energy and immunity steady.",
               benefits: ["Supports immune system and overall health", "Fills nutritional gaps in everyday food", "Antioxidants for energy and recovery", "Easy soft chew most dogs take as a treat"] },
  hip:       { name: "Hip & Joint Care", label: "Hip & Joint", color: "#6E6E6E", kicker: "Mobility & comfort",
               summary: "For seniors, big breeds and dogs who play hard. Glucosamine and chondroitin support cartilage and keep joints moving comfortably.",
               benefits: ["Glucosamine and chondroitin for cartilage", "Eases stiffness after long play sessions", "Good for senior dogs and large breeds", "Supports healthy hips and mobility"] },
  calm:      { name: "Calm Ease", label: "Calm Ease", color: "#7B4FB8", kicker: "Stress & new places",
               summary: "A calming blend for dogs who get anxious in a new place, during storms or when they miss you. Takes the edge off without making them drowsy.",
               benefits: ["Eases stress from a new environment", "Helps with storms, fireworks and travel", "Supports relaxation without sedating", "A gentler first night away from home"] },
  probiotic: { name: "Probiotic", label: "Probiotic", color: "#2FB6D6", kicker: "Digestion & gut",
               summary: "Live probiotics that support a healthy gut, which matters most when routine changes. Helps keep stools firm and tummies settled.",
               benefits: ["Supports healthy digestion and gut flora", "Helps during food or routine changes", "Firmer stools, fewer upset tummies", "Supports nutrient absorption"] },
  skin:      { name: "Skin & Coat Care", label: "Skin & Coat", color: "#FC75B4", kicker: "Shedding & shine",
               summary: "Omega fatty acids and biotin for dogs that shed heavily or scratch. A softer, shinier coat and calmer skin within a few weeks.",
               benefits: ["Omega-3 and omega-6 for skin and coat", "Helps reduce excess shedding", "Soothes dry, itchy skin", "Adds shine and softness to the coat"] },
};
const vitDialog = $("#vitDialog");
let currentVit = null;
function openVitamin(key) {
  const v = VITAMINS[key]; if (!v || !vitDialog) return;
  currentVit = key;
  $("#vitJar").style.setProperty("--label", v.color);
  $(".vit-copy").style.setProperty("--label", v.color);
  $("#vitLabel").textContent = v.label;
  $("#vitKicker").textContent = v.kicker;
  $("#vitTitle").textContent = v.name;
  $("#vitSummary").textContent = v.summary;
  $("#vitBenefits").replaceChildren(...v.benefits.map(b => { const li = document.createElement("li"); li.textContent = b; return li; }));
  vitDialog.showModal();
}
$$(".jar").forEach(b => b.addEventListener("click", () => openVitamin(b.dataset.vit)));
if (vitDialog) {
  vitDialog.addEventListener("close", () => {
    if (vitDialog.returnValue === "add" && currentVit) {
      const v = VITAMINS[currentVit];
      $("#vitaminField").value = v.name;
      $("#vitChoice").textContent = ` · ${v.name}`;
      const cb = $('input[name="addons"][value="vitamins"]'); if (cb) { cb.checked = true; cb.dispatchEvent(new Event("change", { bubbles: true })); }
      if (serviceSelect.value !== "boarding") { serviceSelect.value = "boarding"; }
      syncSelection();
      $("#book").scrollIntoView({ behavior: "smooth" });
      flash(`${v.name} added to your booking.`);
    }
  });
  // click on backdrop closes
  vitDialog.addEventListener("click", e => { if (e.target === vitDialog) vitDialog.close("close"); });
}
