# 🎨 Lumora — Frontend

Single Page Application in Vanilla JS with Vite and Tailwind CSS v4. No
framework: routing, rendering and state are handled with plain browser APIs.

```
View  →  Service  →  helpers/api.js  →  Backend
```

Views never call `fetch` directly. They talk to a service, and the service is
the only layer that knows the API exists. That is what made the migration from
mock data to a real backend possible without rewriting a single view.

---

## 📁 Structure

```
frontend/src/
├── main.js                  # Entry point: starts the router
├── router/
│   ├── router.js            # History API routing + auth guards
│   └── routes.js            # Route table with role requirements
├── views/
│   ├── auth/                # login, register
│   ├── student/             # home, course view
│   ├── tutor/               # home, course editor, dashboard
│   └── shared/              # profile
├── components/              # navbar, modals, content renderers, voice bar
├── services/                # courseService, contentService, userService, ttsService
├── data/
│   └── courses.js           # Course data layer + business-rule guards
├── helpers/
│   ├── api.js               # Single HTTP gateway (base URL, token, errors)
│   └── auth.js              # Session in localStorage
├── constants/
└── styles/
```

> The `mocks/` folder is no longer imported anywhere, but at some point it was the test data for the frontend team. It can be deleted.

---

## 🔀 Routing

Custom router over the History API. `routes.js` declares each path with the
roles allowed to reach it, and `router.js` enforces it before rendering: an
unauthenticated visitor going to `/tutor` is redirected to login, and a student
reaching a tutor-only route is sent back to their own home.

Because it is client-side routing, a hard refresh on `/tutor` would 404 on a
static host. `vercel.json` rewrites every path to `index.html` to prevent that.
If deep links break after deploying, that file is the first thing to check.

---

## 📡 The data layer

Two files carry the weight:

**`helpers/api.js`** is the only place that builds URLs and attaches the token.
It parses responses defensively, because proxies and cold starts can return
HTML error pages instead of JSON, and it clears the session on a 401 so the
router sends the user back to login.

**`data/courses.js`** exposes the course operations the views consume, plus
`canCreateCourse()` and `canEditCourse()`. Those two are interface guards, not
security: the server re-validates every rule independently.

`services/courseService.js` holds progress, submissions and the grade formula.
The grade calculation lives here on purpose: it is shared between the student's
Grades panel and the tutor's Dashboard, so both always show the same number.

---

## 🔐 What the frontend does NOT decide

Worth stating explicitly, because it looks like the frontend is in charge:

- **It does not grade.** The view sends answers; the server returns the score.
- **It does not know the correct answers** until after submitting.
- **It does not generate course codes.** The server does, and never overwrites one.
- **It does not count enrolled students.** That comes derived from the backend.

The tutor's "Preview as student" mode is the one exception: it grades locally
because the tutor already has the answers in the editor, and nothing is saved.

---

## 🗣️ LumiVoice

The voice assistant reads a section aloud using the browser's native
SpeechSynthesis API. No backend, no cost. Only the AI summary calls the agent.

`services/ttsService.js` holds all the speech logic and handles the awkward
parts of that API across browsers:

- Android returns an empty voice list on the first call, so it waits for it.
- Brave blocks the API by default as an anti-fingerprinting measure: `speak()`
  succeeds but nothing is heard, so silence is detected and reported.
- Safari and iOS never fire `onboundary`, so playback position is estimated
  from elapsed time. Without this, changing the speed restarted the passage.

Speed is capped at 1.25×, since Chrome interprets `rate` more aggressively than
Safari and 1.5× sounded rushed.

---

## 🔑 Environment variables

| Variable | Notes |
|---|---|
| `VITE_API_URL` | Backend base URL, **no trailing slash**. The code appends `/api` |
| `VITE_AGENT_URL` | Agent base URL, **no trailing slash**. The code appends `/summary` |

Vite inlines `VITE_*` variables **at build time**. Changing one in the hosting
panel does nothing until you redeploy. A trailing slash produces a double slash
and breaks every request, which is the most common deployment mistake here.

Locally both are optional: without them the code falls back to the dev proxy
and `localhost:3001`.

---

## 🚀 Running locally

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Requires the backend running on port 3000. The agent is optional: without it
everything works except the AI summary.

---

## 🐛 Troubleshooting

**Requests going to `localhost` in production** — `VITE_API_URL` is missing, or
it was added after the last build. Redeploy.

**CORS errors** — usually a trailing slash in `VITE_API_URL`.

**404 when refreshing on `/tutor`** — `vercel.json` is missing from the repo.

**A course sits on "Loading" for ~50 seconds the first time** — that is the
free-tier backend waking up, not a bug. Open the backend URL a few minutes
before a demo to warm it up.
