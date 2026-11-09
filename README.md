# ATL Dog Foodie — website

Static site for a home-style dog boarding business in Atlanta. No build step: plain HTML, CSS and JavaScript.

```
index.html   page structure and copy
styles.css   design (sand / mocha / pink palette)
app.js       calendar, booking estimate, inquiry form, vitamins popup, motion
assets/      cutout dog images (webp)
```

## Run locally

Any static server works:

```bash
python3 -m http.server 5173
```

then open http://localhost:5173.

## Things the owner will want to change

All of these live at the top of `app.js` in `CONFIG`:

- `inquiryEndpoint` — where booking inquiries are POSTed as JSON. Empty means demo mode (logged to the console, success panel shown). A free Formspree form URL works as is.
- `rates` — boarding per day, weekly rate, bath, nail trim, NexGard Plus, vitamins, food by weight.
- `closed` — dates that are never bookable (holidays).
- `capacity` — used by the mock availability until a real booking backend exists.

Copy, hours, FAQ answers and contact details are in `index.html`.

## Still placeholder

- Stats in "The lodge" (nights booked, rating) and "since 2019" in the hero
- Drop-off / pick-up hours in the footer
- Facility and service photos (stock from Unsplash)
- Online payment (Stripe) — planned, not built. Payment is currently Cash App, Zelle, Square or cash, described in the FAQ.

## Reviews

- `review.html` is the link to send customers. It POSTs to `api/review.php`; new reviews are stored as pending.
- `/admin/` is the moderation page. The key is in `ADMIN-KEY.txt` (never committed); only its hash is in `api/config.php`.
  To change the key: `php -r 'echo password_hash("new-key", PASSWORD_DEFAULT);'` and paste the result into `ADMIN_KEY_HASH`.
- Approved reviews are served by `api/reviews.php` and shown on `experience.html` and the home teaser.
- Live data is written to a `reviews-data/` folder next to `public_html` on the server (outside the deploy), so redeploys never wipe reviews. Locally it falls back to `data/live/` (gitignored). `data/reviews.seed.json` only seeds an empty install; its three entries are samples, flagged in the admin page — delete them before sharing the review link.
- A new review emails `NOTIFY_EMAIL` (set in `api/config.php`) if the host allows PHP `mail()`.
- GitHub Pages can't run PHP, so that copy reads and writes reviews through the Hostinger copy (see `shared.js`).

## Deploy

Static files only, so any host works (Hostinger, Netlify, Cloudflare Pages, GitHub Pages). On Hostinger use hPanel → Advanced → Git, point it at this repository's `main` branch, deploy into the site's `public_html`.
