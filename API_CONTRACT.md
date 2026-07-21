# 📄 API Contract — Lumora

Contract agreed between **frontend** and **backend**. The frontend is already built expecting **exactly** these responses. If the backend respects this contract, the integration won't require refactoring any views.

> **General format:** all responses are JSON. Errors return
> `{ "ok": false, "message": "..." }` with the corresponding HTTP status.

---

## 🔐 Auth

### `POST /api/auth/login`
**Body:** `{ "email": string, "password": string }`

**200:**
```json
{
  "ok": true,
  "token": "jwt...",
  "user": { "id": 2, "full_name": "Alex Rivera", "email": "alex@example.com", "role": "tutor", "learning_goal": "Teaching" }
}
```
**401:** invalid credentials.

### `POST /api/auth/register`
**Body:** `{ "full_name", "email", "password", "role": "student"|"tutor", "learning_goal" }`
**201:** same shape as login (`token` + `user`).

> ⚠️ `user.id` and `user.role` are **required**: the frontend uses them for role-based routing and for filtering the tutor's courses.

---

## 📚 Courses

### `GET /api/courses`
The student's catalog. **The backend must filter**: return only courses with `visibility = "open"`, plus `"code"` courses the user is already enrolled in.

```json
[
  {
    "id": 1,
    "tutor_id": 2,
    "title": "Python for Data Science",
    "instructor": "Dr. Sarah Chen",
    "category": "Programming",
    "level": "Beginner" | "Intermediate" | "Advanced",
    "description": "...",
    "image": "https://...",
    "visibility": "open" | "code",
    "course_code": null,
    "students": 4820
  }
]
```

### `GET /api/courses/mine`
Courses belonging to the authenticated tutor. **The backend filters by the token's `tutor_id`.** Never return courses that don't belong to them.

### `GET /api/courses/:id` → a single course (same shape).

### `POST /api/courses` *(tutor role only)*
Creates a course. The backend assigns `tutor_id` from the token (**do not** trust the body).
If `visibility = "code"`, the backend **generates** the `course_code`.

### `PUT /api/courses/:id` *(only the owning tutor)*
**403** if `course.tutor_id !== token.user.id`.
⚠️ **`course_code` is immutable**: if it already exists, it must never be overwritten.

### `GET /api/courses/stats` *(tutor)*
```json
{ "totalCourses": 4, "totalStudents": 23100, "totalSections": 16, "sectionsPerCourse": 4 }
```

---

## 🧩 Sections

### `GET /api/courses/:id/sections`
```json
[ { "id": 1, "course_id": 1, "title": "Getting Started", "orden": 1 } ]
```

### `POST /api/courses/:id/sections` · `PUT /api/sections/:id` · `DELETE /api/sections/:id`

---

## 📦 Contents  ⭐ (the most important one)

### `GET /api/sections/:id/contents`
Returns the contents **ordered by `orden`**.

```json
[
  {
    "id": 1,
    "titulo": "Introducción",
    "tipo": "readme" | "youtube" | "canva",
    "datos": "...",
    "orden": 1
  }
]
```

**The meaning of the `datos` field changes depending on `tipo`:**

| `tipo` | Contents of `datos` |
|--------|----------------------|
| `readme` | Text in **Markdown** |
| `youtube` | Video **ID** (e.g. `dQw4w9WgXcQ`) or full URL |
| `canva` | **Embed** URL (`https://www.canva.com/design/.../view?embed`) |

> The frontend automatically decides which component to render based on `tipo`
> (see `components/contentRenderer.js`). To add a new type, you only need to
> register it in the `RENDERERS` map — no views change.

### `POST /api/sections/:id/contents` · `PUT /api/contents/:id` · `DELETE /api/contents/:id`

---

## 🎓 Enrollments

### `GET /api/enrollments` → courses of the authenticated student.
### `POST /api/enrollments`
**Body:** `{ "course_id": 1, "code": "EDU-A3K9" }`
The `code` is required **only** if the course is private. **400** if the code doesn't match.
### `DELETE /api/enrollments/:courseId` → leave the course.

---

## ✅ Business rules (must be validated on the SERVER)

The frontend already enforces these, but **that's only interface control, not security.** Anyone can call the API directly from the console.

1. **A student only sees `open` courses** (`code` courses require the correct code).
2. **A student CANNOT create courses**, only join → `POST /api/courses` must return **403** if the role is not `tutor`.
3. **A tutor only sees and edits THEIR OWN courses** → filter by the token's `tutor_id`; **403** when editing one that isn't theirs.

---

## 🔑 Authentication

All routes (except login/register) expect:
```
Authorization: Bearer <token>
```
The frontend already sends this automatically (`helpers/api.js`).

---

## 📌 Notes for the backend dev

- **Field names in Spanish** for contents (`titulo`, `tipo`, `datos`, `orden`) and in English for everything else. That's what was agreed; the frontend is already written that way.
- Always return **arrays** (not wrapped objects) in list `GET` endpoints, or adjust `helpers/api.js`.
- `id` values are numeric.
- Dates in ISO 8601 if added.