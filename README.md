# 248- Lumora: Integrative Project (Category: Education)
Academic project repository for Lumora (ID: 248)  **Live at: https://lumora-deploy.vercel.app**

Interactive learning platform with a modular, domain-oriented architecture and
two roles: `student` and `tutor`. Tutors build courses with sections, lessons,
practice reviews and graded quizzes; students enroll, progress through unlocked
sections, and are ranked on a leaderboard.

* **Frontend:** Single Page Application in Vanilla JS + Vite, custom History API
  router, Tailwind CSS v4.
* **Backend:** REST API in Node.js + Express, layered architecture
  (`Routes → Controllers → Services → Repositories`).
* **Database:** PostgreSQL 17, containerized in Docker locally, hosted on Neon
  in production.
* **Agent:** Express microservice that summarises lessons with Google Gemini
  for the LumiVoice assistant.

---

## 🌐 Live deployment

| Layer | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://lumora-deploy.vercel.app |
| Backend | Render | https://lumora-deploy.onrender.com |
| Agent | Render | https://lumora-deploy-agent.onrender.com |
| Database | Neon | PostgreSQL 17, managed |

> ⚠️ The backend and agent run on Render's free tier, which spins services down
> after inactivity. The **first request after an idle period takes up to 50
> seconds** while the container wakes up. This is expected behaviour, not a
> failure. Open the backend URL a few minutes before a demo to warm it up.

Full step-by-step instructions in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## 📁 Repository structure

```
.
├── frontend/          # SPA (Vanilla JS + Vite + Tailwind v4)
├── backend/           # REST API (Express + PostgreSQL)
├── agent/             # LumiVoice summarisation service (Gemini)
├── database/          # init.sql for local Docker
├── docs/              # Design and contract documents
├── docker-compose.yml
├── DEPLOYMENT.md
└── README.md
```

Each layer has its own README with its internal structure, endpoints and
troubleshooting:

- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)
- [`agent/README.md`](./agent/README.md)

---

## 📚 Design documents

| Document | Covers |
|---|---|
| [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md) | Every endpoint, request and response shape |
| [`docs/BACKEND_GUARANTEES.md`](./docs/BACKEND_GUARANTEES.md) | Security guarantees and how each was verified |
| [`docs/COURSE_CODES.md`](./docs/COURSE_CODES.md) | Private course codes: format, immutability, lifecycle |
| [`docs/QUIZZES_AND_REVIEWS.md`](./docs/QUIZZES_AND_REVIEWS.md) | JSONB modelling of quizzes and review activities |

---

## 🛠️ Prerequisites

1. **Node.js** v20 or higher.
2. **Docker & Docker Compose** (for the local database).
3. A database client such as **DBeaver** (optional).
4. A **Gemini API key** for the agent (optional; everything else works without it).

---

## 🚀 Local setup

```bash
git clone https://github.com/Riwi-io-Medellin/248-lumora.git
cd 248-lumora
```

Then follow the four steps in order. Each layer depends on the previous one.

### 1. Database (Docker)

```bash
docker compose up -d
```

| Field | Value |
| :--- | :--- |
| Host | `localhost` |
| Port | `5433` |
| Database | `lumora_db` |
| Username | `postgres` |
| Password | `postgres123` |

The schema is created **by the backend on first boot**, not by a migration
step. `database/init.sql` only prepares the empty database.

### 2. Backend

```bash
cd backend
cp .env.example .env      # fill in the values
npm install
npm run dev               # http://localhost:3000
```

> 🛡️ **Fail-fast boot:** the server validates its database connection before
> starting. If Docker is down or the variables are wrong, it stops immediately
> instead of running in a zombie state where every request fails confusingly.

On first boot you should see `Structure verified succesfully. Users in DB: 2`,
which confirms the tables were created and the demo users seeded.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

### 4. Agent (optional)

```bash
cd agent
npm install
# create .env with GEMINI_API_KEY and PORT=3001
npm run dev               # http://localhost:3001
```

Without the agent everything works except the AI summary in LumiVoice.

---

## 🔑 Test credentials

Two accounts are seeded automatically (password `password123`):

* **Tutor 👨‍🏫:** `alex.rivera@lumora.com`
* **Student 🎓:** `jordan.kim@lumora.com`

Login validates against PostgreSQL, signs a **JWT**, and the SPA redirects to
`/tutor` or `/student` based on the verified role.

---

## ✨ Main features

**For tutors.** Create courses with sections, lesson content (Markdown, YouTube,
Canva), practice reviews in three formats, graded quizzes and a final
assessment. Save the whole course in one atomic operation. Preview the course as
a student would see it. Track every enrolled student's grade in a dashboard.

**For students.** Browse public courses or join private ones with a code.
Progress through sections that unlock as quizzes are completed. Get instant
feedback on practice reviews. See grades and a course leaderboard.

**LumiVoice.** Listens to any section aloud using the browser's native speech
engine, with an optional AI summary for a shorter version. Speed controls,
pause and restart included.

---

## 🔐 Where the rules actually live

Every business rule is enforced **on the server**, not only in the interface.
Frontend checks are convenience; anyone can call the API from a console.

- Correct answers are stripped from every response and grading happens server-side.
- Students cannot create courses; tutors cannot touch courses they do not own.
- Private course codes are immutable once generated.
- The enrolled-student count is always derived, never stored.

See [`docs/BACKEND_GUARANTEES.md`](./docs/BACKEND_GUARANTEES.md) for how each
one is implemented and verified.
