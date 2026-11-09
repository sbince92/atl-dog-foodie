/* Customer experience page: load approved reviews into the grid and summary. */
(async () => {
  const grid = document.getElementById("reviewGrid"), avgEl = document.getElementById("avgRating"),
        starsEl = document.getElementById("avgStars"), countEl = document.getElementById("reviewCount"),
        empty = document.getElementById("reviewEmpty");
  try {
    const { summary, reviews } = await SITE.fetchReviews();
    avgEl.textContent = summary.count ? summary.average.toFixed(1) : "—";
    starsEl.replaceChildren(SITE.stars(summary.average));
    countEl.textContent = summary.count ? `${summary.count} review${summary.count === 1 ? "" : "s"} from the humans` : "No reviews yet";
    if (!reviews.length) { empty.hidden = false; return; }
    grid.replaceChildren(...reviews.map(r => { const c = SITE.reviewCard(r); c.classList.add("reveal-up", "in"); return c; }));
  } catch (err) {
    console.warn("reviews unavailable", err);
    avgEl.textContent = "—";
    countEl.textContent = "Reviews are loading slowly right now.";
    empty.hidden = false;
  }
})();
