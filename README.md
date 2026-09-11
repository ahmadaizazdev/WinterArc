# Winter Arc — 90 Day Transformation

A personal 90-day transformation command center: daily tracking for weight,
waist, steps, walking, sleep, water and discipline, with streaks, a 90-day
calendar, progress charts, weekly reviews and goals — all running entirely
in the browser with no backend.

## Running it locally

No build step. Just open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8080
```

then visit `http://localhost:8080`.

## Deploying to GitHub Pages

1. Create a new GitHub repository and push these files to the root of the
   `main` branch (keep the `index.html`, `css/`, and `js/` folders together).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`.
4. Save. GitHub will publish the site at
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

No environment variables, servers, or build tools are required.

## How data is stored

Everything is saved in the browser's `localStorage`, scoped per account:

- `wa_users` — account directory (name, email, password hash)
- `wa_session` — which account is currently signed in
- `wa_profile_<userId>` — that user's profile, goals and challenge settings
- `wa_days_<userId>` — that user's day-by-day tracker records
- `wa_settings_<userId>` — theme and preference settings

Because this is a frontend-only prototype, authentication is **not**
production-grade security — passwords are hashed client-side with a simple
non-cryptographic hash, purely to avoid storing them in plain text locally.
`js/storage.js` isolates all persistence behind a small set of functions
(`createUser`, `verifyLogin`, `getProfile`, `saveDay`, etc.) so a real backend
API can be swapped in later without touching the rest of the app.

## Project structure

```
index.html          All screens: auth, onboarding, and the main app shell
css/styles.css       Design tokens, layout, and every component style
js/storage.js        localStorage data layer
js/engine.js          Phase targets, discipline scoring, streaks, date math
js/charts.js          Dependency-free canvas line charts
js/ui-common.js       Toasts, modals, confirm dialogs, progress rings
js/views.js            Render functions for every page
js/app.js               App controller: auth, onboarding, navigation, state
```

## Exporting / importing data

Settings → Your data lets you download all of your progress as a JSON file,
and re-import it later (useful when moving to a new browser or device ahead
of a real backend being connected).
