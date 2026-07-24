# ⚙️ Lumora — Backend

REST API in Node.js + Express over PostgreSQL, structured with the layered
architecture pattern:

```
Routes  →  Controllers  →  Services  →  Repositories  →  PostgreSQL
```

Each layer has one job. Routes declare paths and middleware, controllers read
the request and shape the response, services hold the business rules, and
repositories are the only place where SQL is written. A rule of thumb: if you
find yourself writing SQL outside a repository, the logic is in the wrong file.

---

## 📁 Structure

```
backend/
├── index.js                      # Entry point + safe boot (fail-fast)
└── src/
    ├── config/postgres/
    │   ├── postgres.db.js        # Connection pool (DATABASE_URL or DB_* vars)
    │   └── create-tables.js      # Idempotent schema creation + demo seed
    ├── middlewares/
    │   ├── auth.middleware.js    # verifyJWT + authorizeRoles
    │   └── validation.middleware.js
    ├── utils/
    │   └── errorHandler.js       # Centralised error responses
    └── api/
        ├── auth/                 # register, login
        ├── user/                 # profile read/update
        ├── course/               # CRUD + full-course editor endpoints
        ├── section/              # sections of a course
        ├── item/                 # welcome, content, review, quizz, final
        ├── enrollment/           # join, join by code, leave
        ├── submission/           # server-side grading
        ├── grade/                # per-student report for the tutor
        └── leaderboard/          # ranking by points
```

Every module follows the same four-file shape: `*.routes.js`,
`*.controllers.js`, `*.services.js`, `*.repository.js`.

---

## 🗄️ Data model

Six tables. The interesting decision is `items.payload`, a **JSONB** column.

A quiz is N questions with options and a correct index. A review can be three
completely different formats (fill in the blanks, match pairs, reorder steps),
each needing different fields. Modelling that with rigid columns would mean one
table per format plus conditional joins, and every new format would force a
migration. JSONB stores the variable part while staying queryable and indexable.

The `tipo_item` column says how to interpret `payload`. Same principle as the
`tipo`/`datos` pair used in content blocks.

```
users ──┬── courses ──┬── sections ── items
        │             │
        ├── enrollments              (student ↔ course)
        └── submissions              (student ↔ item, UNIQUE)
```

`UNIQUE (student_id, item_id)` on `submissions` is what guarantees at the
database level that a quiz is answered only once. Relying on the frontend for
that would not be safe.

See `docs/QUIZZES_AND_REVIEWS.md` for the full payload structures.

---

## 🔐 Security guarantees

These are enforced **on the server**, not just in the interface. Anyone can
call the API from a browser console, so UI checks are convenience, not security.

| Guarantee | Where |
|---|---|
| Correct answers never reach the client | `item.services.js` strips `correct` from every GET |
| Grading happens on the server | `submission.services.js` compares against the stored payload |
| A quiz is answered once | `UNIQUE (student_id, item_id)` |
| Students cannot create courses | `authorizeRoles("tutor")` on `POST /api/courses` |
| Tutors only touch their own courses | ownership check in `course.services.js` → 403 |
| `course_code` is immutable | update service always preserves the existing value |
| Private courses stay hidden | `GET /api/courses` filters by visibility + enrollment |
| Student count is derived | `COUNT(*)` over `enrollments`, never a stored column |

The last one deserves a note: a persisted counter is exactly the kind of value
that drifts out of sync. If you save a calculated number and later save the
course again, the count inflates. `enrollments` is the single source of truth.

---

## 🔌 Endpoints

All routes except `/api/auth/*` require `Authorization: Bearer <token>`.

### Auth
| Method | Route | Notes |
|---|---|---|
| POST | `/api/auth/register` | Returns `{ token, user }` |
| POST | `/api/auth/login` | Returns `{ token, user }` |

### Users
| Method | Route | Notes |
|---|---|---|
| GET | `/api/users/me` | Authenticated profile |
| PUT | `/api/users/me` | Update name, email, learning goal |

### Courses
| Method | Route | Notes |
|---|---|---|
| GET | `/api/courses` | Catalog, filtered by role and visibility |
| GET | `/api/courses/mine` | Tutor's own courses |
| GET | `/api/courses/stats` | Tutor dashboard totals |
| GET | `/api/courses/:id` | Single course |
| POST | `/api/courses` | Tutor only |
| PUT | `/api/courses/:id` | Owner only |
| POST | `/api/courses/full` | ⭐ Course + sections + items in one transaction |
| GET | `/api/courses/:id/full` | ⭐ Aggregated course for the editor (owner only) |
| PUT | `/api/courses/:id/full` | ⭐ Update and sync all content |

The three `full` endpoints exist because the editor saves the whole course at
once. Doing it with individual calls would leave the course half-written if one
failed midway, so the sync runs inside a single transaction. New sections arrive
with temporary client-side ids and the response returns the real database ids.

### Sections, items and contents
| Method | Route | Notes |
|---|---|---|
| GET | `/api/courses/:id/sections` | |
| GET | `/api/sections/:id/items` | Sanitized: no `correct` field |
| GET | `/api/sections/:id/contents` | Ordered by `orden` |
| POST | `/api/sections/:id/contents` | Owner only |
| PUT | `/api/contents/:id` | Owner only |
| DELETE | `/api/contents/:id` | Owner only |
| GET | `/api/courses/:id/final-assessment` | Sanitized |

### Enrollments
| Method | Route | Notes |
|---|---|---|
| GET | `/api/enrollments/mine` | Array of course ids |
| POST | `/api/enrollments` | Join an open course |
| POST | `/api/enrollments/by-code` | Join a private course |
| DELETE | `/api/enrollments/:courseId` | Leave; submissions cascade |

### Progress and grades
| Method | Route | Notes |
|---|---|---|
| POST | `/api/submissions` | Grades on the server, returns `correctAnswers` |
| GET | `/api/courses/:id/progress` | Authenticated student's progress |
| GET | `/api/courses/:id/students` | Tutor's report with per-student grades |
| GET | `/api/courses/:id/leaderboard` | Ranking by points |

---

## 🔑 Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | in production | Single connection string (Neon, Render). Takes priority |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | locally | Used when `DATABASE_URL` is absent |
| `DB_SSL` | optional | `true` to force SSL with the discrete variables |
| `JWT_SECRET` | ✅ always | Signs the tokens. Without it the fallback is used, which is unsafe |
| `PORT` | no | Defaults to 3000. Render injects its own |

The pool prefers `DATABASE_URL` and enables SSL automatically with it, since
managed providers require it. Local Docker does not.

---

## 🚀 Running locally

```bash
cd backend
cp .env.example .env      # fill in the values
npm install
npm run dev               # http://localhost:3000
```

The schema is created automatically on first boot: there is no migration step
to run. `create-tables.js` is idempotent, so restarting is harmless.

**Fail-fast boot:** if the database is unreachable or the variables are wrong,
the server stops immediately instead of starting in a zombie state where every
request would fail with a confusing error.

Two demo users are seeded (password `password123`):
`alex.rivera@lumora.com` (tutor) and `jordan.kim@lumora.com` (student).

---

## 🐛 Troubleshooting

**`database "lumora_db" does not exist`** — create it in your provider's panel;
the app creates tables, not databases.

**403 on every protected route** — `JWT_SECRET` is missing or differs between
the signing and verifying sides.

**Connection errors mentioning SASL or channel binding** — remove
`&channel_binding=require` from the connection string; the `pg` driver does not
always negotiate it and the SSL config already covers the requirement.
