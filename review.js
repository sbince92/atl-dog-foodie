/* Leave-a-review page: star picker, validation, POST to the API. */
(() => {
  const form = document.getElementById("reviewForm"), starBtns = [...document.querySelectorAll(".star-input button")],
        ratingField = document.getElementById("ratingField"), ratingLabel = document.getElementById("ratingLabel"),
        errorEl = document.getElementById("reviewError"), success = document.getElementById("reviewSuccess"),
        submitBtn = document.getElementById("reviewSubmit");
  const labels = ["", "Rough stay", "Could be better", "Good", "Really good", "Best stay ever"];

  function setRating(n) {
    ratingField.value = n;
    starBtns.forEach((b, i) => { b.classList.toggle("on", i < n); b.setAttribute("aria-checked", String(i + 1 === n)); });
    ratingLabel.textContent = labels[n] || "Tap a star";
  }
  starBtns.forEach((b, i) => {
    b.addEventListener("click", () => setRating(i + 1));
    b.addEventListener("mouseenter", () => starBtns.forEach((x, j) => x.classList.toggle("hover", j <= i)));
    b.addEventListener("mouseleave", () => starBtns.forEach(x => x.classList.remove("hover")));
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    errorEl.hidden = true;
    form.querySelectorAll(".field.invalid").forEach(f => f.classList.remove("invalid"));
    const data = Object.fromEntries(new FormData(form).entries());
    data.rating = Number(data.rating || 0);
    data.consent = !!form.elements.consent.checked;

    const bad = [];
    if (!data.name.trim()) bad.push("name");
    if ((data.text || "").trim().length < 10) bad.push("text");
    if (!data.rating) bad.push("rating");
    if (!data.consent) bad.push("consent");
    if (bad.length) return showError(bad, "Please add a star rating, your name, a few sentences, and tick the permission box.");

    submitBtn.disabled = true; submitBtn.textContent = "Sending…";
    try {
      const res = await fetch(`${SITE.apiBase}/api/review.php`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) return showError(out.fields || [], out.error || "Something went wrong. Please try again.");
      form.hidden = true; success.hidden = false; success.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      console.error(err);
      showError([], "We couldn't reach the server. You can also email your review to info@atldogfoodie.com.");
    } finally {
      submitBtn.disabled = false; submitBtn.innerHTML = 'Send my review <span class="arrow">↗</span>';
    }
  });

  function showError(fields, msg) {
    fields.forEach(f => { const el = form.elements[f]; const wrap = el && el.closest ? el.closest(".field") : null; if (wrap) wrap.classList.add("invalid"); });
    if (fields.includes("rating")) document.querySelector(".star-input").classList.add("invalid");
    errorEl.textContent = msg; errorEl.hidden = false;
    errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  setRating(0);
})();
