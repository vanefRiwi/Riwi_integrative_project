# 🚀 Deployment Guide

Step-by-step instructions to deploy Lumora across four services. Written for
someone who has never deployed before.

Each service depends on the previous one, so **follow the order**. The database
must exist before the backend can boot, and the backend URL is needed before
the frontend can be built.

| Order | Layer | Platform |
|---|---|---|
| 1 | Database | Neon |
| 2 | Backend | Render |
| 3 | Agent | Render |
| 4 | Frontend | Vercel |

You will need free accounts on **GitHub**, **Neon**, **Render** and **Vercel**.
Sign up to the last three with "Continue with GitHub" so they connect to your
repository automatically.

---

## 1️⃣ Database — Neon

The database goes first because the backend refuses to start without it.

1. Create a project at [neon.com](https://neon.com). Name it `lumora` and pick
   the region closest to you.
2. Create a database named **`lumora_db`**. If you skip this and leave Neon's
   default `neondb`, the backend will fail with `database does not exist`.
3. Copy the **connection string**. It looks like:

```
postgresql://USER:PASSWORD@HOST.neon.tech/lumora_db?sslmode=require
```

Save it somewhere; you need it in step 2.

> ⚠️ If the string ends with `&channel_binding=require`, **remove that part**.
> The Node `pg` driver does not always negotiate it and the connection fails
> with a SASL error. The `sslmode=require` portion is enough.

**You do not need to create tables.** The backend creates the schema
automatically on its first boot, and the operation is idempotent, so restarting
is harmless.

---

## 2️⃣ Backend — Render

1. In Render: **New +** → **Web Service** → connect your GitHub repository.
2. Configure it:

| Field | Value |
|---|---|
| Name | `lumora-backend` |
| Language | **Node** |
| Branch | `main` |
| **Root Directory** | **`backend`** |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

> ⚠️ Two fields cause most failures here. **Root Directory** must be `backend`,
> or Render looks for `package.json` in the repository root and the build dies.
> And **Language** must be Node: if Render detects the `Dockerfile` and selects
> Docker, the build and start command fields disappear. That Dockerfile is for
> local `docker compose`, not for Render.

3. Add three environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | the Neon connection string from step 1 |
| `JWT_SECRET` | any long random string you invent |
| `NODE_VERSION` | `20` |

Do **not** add `PORT`. Render injects it and the code already reads it.

`JWT_SECRET` is not optional in practice: without it the code falls back to a
hardcoded value, which means anyone could forge a valid token.

4. Click **Create Web Service** and open the **Logs** tab. A successful boot
   looks like this:

```
✅ [Database]: Successful initial connection to PostgreSQL through the pool.
🏗️  [Database]: Schema verified/created successfully.
📊 [Database]: Structure verified succesfully. Users in DB: 2
🚀 [Server]: Lumora Backend running succesfully
==> Your service is live 🎉
```

`Users in DB: 2` confirms the tables were created in Neon and the demo users
seeded. Yellow `sslmode` warnings above those lines are harmless.

5. Copy the service URL, for example `https://lumora-deploy.onrender.com`, and
   open it in a browser. It should return `{"ok":true,"message":"Lumora API 🚀"}`.

---

## 3️⃣ Agent — Render

Same procedure, three differences.

| Field | Value |
|---|---|
| Name | `lumora-agent` |
| **Root Directory** | **`agent`** |
| Language | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |

Environment variables:

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | your key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `NODE_VERSION` | `20` |

A successful boot ends with `LumiVoice Agent running on ...`. Copy this URL too.

> The log line `injected env (0) from .env` is normal on Render, where variables
> come from the panel rather than a file. It does not mean the key is missing.

The agent only powers the AI summary. Everything else in the application works
without it, so you can skip this step and come back later.

---

## 4️⃣ Frontend — Vercel

1. In Vercel: **Add New** → **Project** → import the same repository.
2. Configure it:

| Field | Value |
|---|---|
| Framework Preset | **Vite** |
| **Root Directory** | **`frontend`** (click "Edit" to select it) |

Leave Build Command and Output Directory as they come.

3. Add two environment variables:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://lumora-deploy.onrender.com` |
| `VITE_AGENT_URL` | `https://lumora-deploy-agent.onrender.com` |

> ⚠️ **No trailing slash on either.** The code appends `/api` and `/summary`
> internally, and a double slash breaks every request. This is the single most
> common mistake in this deployment.

4. Click **Deploy**. It takes about a minute.

> ⚠️ Vite inlines `VITE_*` variables **at build time**, not at runtime. If you
> ever change one, you must go to **Deployments → Redeploy** for it to take
> effect. Editing the value alone does nothing.

---

## ✅ Verifying the deployment

Before starting, open the backend URL and wait for it to respond. It has been
idle and the first request takes up to 50 seconds.

Then walk through this on your Vercel URL, in order. Each step validates a
different layer.

**1. Registration and session persistence.** Register as a **tutor**, then press
F5. If you are still logged in, users are being stored in Neon rather than in
the browser.

**2. The user really exists.** Log out and log back in with the same
credentials. Even better: open the site in an **incognito window** and log in
there. If it works, the data is on the server, not in your browser's storage.
This is the most convincing demonstration for a presentation.

**3. Course creation survives.** Create a course with a section and a quiz of at
least one question. Save, reload, and reopen it in the editor. Everything should
still be there.

**4. The student flow.** Log out, register as a **student** with a different
email, join the course (with the code if you made it private), and answer the
quiz. Reload and reopen: the quiz should show as completed with your score.

**5. The tutor dashboard.** Log back in as the tutor and open the Dashboard.
Your student should appear with their grade. This confirms the full loop: what
one user writes, another user reads.

**6. LumiVoice.** Inside a course, open the voice assistant and request a
summary. If it responds, the agent is wired correctly.

If all six pass, the deployment is complete.

---

## 🐛 Troubleshooting

Open DevTools with **F12**, go to the **Network** tab, repeat the failing
action and inspect the request shown in red.

| Symptom | Cause |
|---|---|
| Requests going to `localhost` | `VITE_API_URL` missing, or added after the last build. Redeploy |
| CORS error | Trailing slash in `VITE_API_URL` |
| 403 on every route | `JWT_SECRET` missing in Render |
| 500 when creating anything | Database issue. Check the Render logs |
| 404 when refreshing `/tutor` | `frontend/vercel.json` is not in the repository |
| `database "lumora_db" does not exist` | Create it in the Neon panel |
| SASL or channel binding error | Remove `&channel_binding=require` from `DATABASE_URL` |
| First load takes ~50 seconds | Free-tier cold start. Not a bug |

**About the cold start.** Render's free tier spins services down after about 15
minutes of inactivity. If you want to avoid it during a presentation, either
open the backend URL a few minutes beforehand, or set up a free uptime monitor
(UptimeRobot, cron-job.org) to ping it every 10 minutes. Note that keeping it
awake consumes the monthly free hours faster.

---

## 📝 After deploying

Two things worth doing.

**Rotate the database password** if the connection string was ever shared in a
chat, a screenshot or a commit. In Neon: your project → Roles → Reset password,
then update `DATABASE_URL` in Render.

**Save your configuration** somewhere private: the three URLs and the
environment variables of each service. You will need them for redeployments and
for the project defence.

Also note that any users or courses created before this deployment lived in the
browser's localStorage and do not exist in Neon. Everything starts fresh, except
for the two seeded demo accounts.
