# 📄 API Contract — Lumora

Reference for every endpoint in the Lumora backend. This started as a contract
agreed between frontend and backend before implementation; it now documents the
API **as deployed**.

> **General format:** all responses are JSON. Errors return
> `{ "ok": false, "message": "..." }` with the corresponding HTTP status.

**Base URL:** `https://lumora-deploy.onrender.com/api`

---

## 🔑 Authentication

All routes except `/api/auth/*` expect:

```
Authorization: Bearer <token>
```

The frontend sends this automatically (`helpers/api.js`). A 401 clears the
stored session so the router redirects to login.

---

## 🔐 Auth

### `POST /api/auth/register`
**Body:** `{ "full_name", "email", "password", "role": "student"|"tutor", "learning_goal" }`

**201:**
```json
{
  "ok": true,
  "token": "jwt...",
  "user": { "id": 2, "full_name": "Alex Rivera", "email": "alex@example.com", "role": "tutor", "learning_goal": "Teaching" }
}
```
**400:** email already registered.

### `POST /api/auth/login`
**Body:** `{ "email", "password" }` → **200** with the same shape as register.
**401:** invalid credentials.

> `user.id` and `user.role` are required by the frontend for role-based routing
> and for filtering a tutor's courses.

---

## 👤 Users

### `GET /api/users/me` → `{ "ok": true, "user": {...} }`
### `PUT /api/users/me`
**Body:** `{ "full_name", "email", "learning_goal" }` → the updated user.

---

## 📚 Courses

### `GET /api/courses`
The catalog. **The server filters by role:** students receive courses with
`visibility = "open"` plus `"code"` courses they are already enrolled in.

```json
[
  {
    "id": 1,
    "tutor_id": 2,
    "title": "Python for Data Science",
    "instructor": "Dr. Sarah Chen",
    "category": "Programming",
    "level": "Beginner",
    "description": "...",
    "image": "https://...",
    "visibility": "open",
    "students": 4820
  }
]
```

> ⚠️ `course_code` is **never** included for a course the requester does not own
> or belong to. Returning it would leak the access key.

### `GET /api/courses/mine` *(tutor)*
Courses belonging to the authenticated tutor, filtered by the token's id.

### `GET /api/courses/stats` *(tutor)*
```json
{ "totalCourses": 4, "totalStudents": 23100, "totalSections": 16, "sectionsPerCourse": 4 }
```

### `GET /api/courses/:id` → a single course.

### `POST /api/courses` *(tutor only)*
The server assigns `tutor_id` from the token and ignores any value in the body.
If `visibility = "code"`, the server generates the `course_code`.
**403** if the role is not `tutor`.

### `PUT /api/courses/:id` *(owner only)*
**403** if `course.tutor_id !== token.user.id`.

> ⚠️ **`course_code` is immutable.** An existing code is always preserved and
> `payload.course_code` is ignored entirely. See `COURSE_CODES.md`.

---

## 🧩 Full course (editor)

The course editor saves everything at once, so these three endpoints exist to
avoid leaving a course half-written when a single call fails midway. The whole
sync runs in **one transaction**.

### `POST /api/courses/full` *(tutor)* → **201**
### `PUT /api/courses/:id/full` *(owner)* → **200**
### `GET /api/courses/:id/full` *(owner)* → **200**

**Body / response shape:**
```json
{
  "title": "Intro to SQL",
  "instructor": "Vane",
  "category": "Databases",
  "level": "Beginner",
  "description": "...",
  "image": "https://...",
  "visibility": "code",
  "sections": [ { "id": 12, "title": "Getting Started" } ],
  "items": {
    "12": {
      "welcome": { "message": "Hi!", "videoUrl": "dQw4w9WgXcQ" },
      "content": [ { "titulo": "Notes", "tipo": "readme", "datos": "# Hello" } ],
      "review": { "format": "fill-blanks", "blankText": "...", "instantFeedback": true },
      "quizz": { "questions": [...], "countsGrade": true, "points": 50 }
    }
  },
  "finalAssessment": { "questions": [...], "countsGrade": true, "points": 200 }
}
```

New sections may arrive with **temporary client-side ids** (a timestamp). The
response returns the real database ids, so the editor can sync and a second save
updates rather than duplicates. Sections omitted from the payload are deleted.

> The `GET` variant is the **only** endpoint that returns quiz `correct` values,
> because it is restricted to the owning tutor who authored them.

---

## 🧩 Sections

### `GET /api/courses/:id/sections`
```json
[ { "id": 1, "course_id": 1, "title": "Getting Started", "orden": 1 } ]
```

---

## 📦 Items and contents

### `GET /api/sections/:id/items`
Returns the section's items **sanitized**:

```json
{
  "welcome": { "message": "...", "videoUrl": "..." },
  "contents": [ { "id": 1, "titulo": "...", "tipo": "readme", "datos": "...", "orden": 1 } ],
  "review": { "format": "fill-blanks", "...": "..." },
  "quizz": { "questions": [ { "id": 101, "text": "...", "options": ["A","B","C","D"] } ], "points": 50 }
}
```

> ⚠️ The `correct` field is **stripped** from every question. Grading happens
> server-side.

### `GET /api/courses/:id/final-assessment`
Same sanitization as above.

### `GET /api/sections/:id/contents`
Content blocks ordered by `orden`.

**The meaning of `datos` depends on `tipo`:**

| `tipo` | Contents of `datos` |
|---|---|
| `readme` | Text in **Markdown** |
| `youtube` | Video **ID** (e.g. `dQw4w9WgXcQ`) or full URL |
| `canva` | **Embed** URL (`https://www.canva.com/design/.../view?embed`) |

The frontend picks the renderer from `tipo` (`components/contentRenderer.js`).
Adding a type only requires registering it in the `RENDERERS` map.

### `POST /api/sections/:id/contents` · `PUT /api/contents/:id` · `DELETE /api/contents/:id`
Owner only. **403** otherwise.

---

## 🎓 Enrollments

### `GET /api/enrollments/mine`
Array of course **ids** the authenticated student is enrolled in.
```json
[1, 3, 7]
```

### `POST /api/enrollments`
**Body:** `{ "course_id": 1 }` → **201**. For open courses.

### `POST /api/enrollments/by-code`
**Body:** `{ "code": "EDU-A3K9" }`

| Response | When |
|---|---|
| **201** `{ ok, course }` | Valid code, enrollment created |
| **404** | No course matches the code |
| **409** | Already enrolled |

### `DELETE /api/enrollments/:courseId`
Leaves the course. **Submissions for that course are deleted**, so rejoining
starts from zero. The course code remains valid: it belongs to the course, not
to the enrollment.

---

## ✅ Submissions and progress

### `POST /api/submissions`
The client sends **only the answers**. The server grades against the stored
payload and persists the result.

**Body:**
```json
{ "type": "quizz", "section_id": 12, "answers": { "101": 0, "102": 1 } }
```
`type` is `"quizz"`, `"review"` or `"final"`. Use `course_id` instead of
`section_id` for `"final"`.

**201:**
```json
{
  "ok": true,
  "result": { "correct": 1, "total": 2, "points": 25, "correctAnswers": { "101": 0, "102": 1 } }
}
```

> `correctAnswers` travels **only here**, never in a GET, so the interface can
> highlight the right option after answering.

Re-submitting the same item updates the existing row rather than creating a
duplicate; uniqueness is enforced by partial unique indexes on `submissions`.

### `GET /api/courses/:id/progress`
The authenticated student's progress.
```json
{
  "quizzes": { "12": { "score": 1, "total": 2, "points": 25 } },
  "reviews": { "12": { "completed": true } },
  "final": { "score": 1, "total": 1, "points": 200 }
}
```

### `GET /api/courses/:id/students` *(owner tutor)*
Enrolled students with server-computed grades, plus a `progress` object with the
same shape as above so the dashboard reuses the frontend grade formula.

### `GET /api/courses/:id/leaderboard`
Ranking by points. **Only quizzes and the final assessment award points**;
reviews are practice activities worth zero.

---

## ✅ Business rules (validated on the SERVER)

The frontend enforces these too, but **that is interface control, not
security.** Anyone can call the API directly from a console.

1. **Students only see `open` courses.** Private ones require the code and only
   appear once enrolled.
2. **Students cannot create courses** → **403** if the role is not `tutor`.
3. **Tutors only see and edit their own courses** → filtered by the token's id;
   **403** when touching someone else's.
4. **Course access:** a student must be enrolled to read a course; a tutor must
   own it to open the editor.

See `BACKEND_GUARANTEES.md` for how each is implemented and verified.

---

## 📌 Conventions

- **Field names in Spanish** for content blocks (`titulo`, `tipo`, `datos`,
  `orden`) and English everywhere else. Agreed early; the frontend is written
  that way.
- List endpoints return **arrays**, not wrapped objects.
- `id` values are numeric.
- The student count in course responses is always **derived** with `COUNT(*)`,
  never stored as a column.
