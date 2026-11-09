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

## Deploy

Static files only, so any host works (Hostinger, Netlify, Cloudflare Pages, GitHub Pages). On Hostinger use hPanel → Advanced → Git, point it at this repository's `main` branch, deploy into the site's `public_html`.
