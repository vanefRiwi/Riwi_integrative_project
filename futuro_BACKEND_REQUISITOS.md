# 🚨 Blocking Requirements for the Backend

This document lists the requirements that **must** be met when implementing the backend. These are not suggestions: if they are implemented incorrectly, they will force a frontend refactor.

They must be incorporated as **acceptance criteria** in the backend User Stories, not just as notes in a README that someone might read.

---

## 🔴 BLOCKER #1 — Correct answers must never reach the client

### The Problem

Currently, in mock mode, the frontend receives the quiz questions **with** the `correct` field included:

```json
{
  "id": 1,
  "text": "What is the primary purpose of this approach?",
  "options": ["Reduce complexity", "Improve scalability", "..."],
  "correct": 1          // ← ⚠️ the index of the correct answer
}
```

Any student can open the browser DevTools, inspect the network response, and **see all the correct answers before answering**. This makes grading completely pointless.

While this is acceptable for now (since it uses test data), **if the backend replicates this behavior, the system will be broken from day one**.

### The Requirement

#### 1. `GET /api/sections/:id/items` — without `correct`

The server must **remove** the `correct` field before responding:

```javascript
// Inside the backend service
const quiz = await itemRepository.findBySection(sectionId, 'quizz');

// ⚠️ Never send `correct` to the client
const safeQuestions = quiz.payload.questions.map(({ correct, ...q }) => q);

return { ...quiz, payload: { ...quiz.payload, questions: safeQuestions } };
```

The same applies to `GET /api/courses/:id/final`.

#### 2. `POST /api/submissions` — the server handles grading

The client sends **only the answers**. The server compares them, grades them, and returns the result.

**Request:**
```json
{
  "item_id": 12,
  "answers": { "1": 0, "2": 3, "3": 1 }
}
```

**Response:**
```json
{
  "ok": true,
  "score": 2,
  "total": 3,
  "points": 33,
  "correctAnswers": { "1": 1, "2": 3, "3": 1 }
}
```

> The `correctAnswers` field **can** be returned **after** submission 
> so that the frontend can highlight the correct option in green. Never before submission.

#### 3. Only once per student

The `UNIQUE (student_id, item_id)` constraint on the `submissions` table already guarantees this at the DB level. The endpoint must return a **409 Conflict** if a submission already exists.

### Frontend Status

✅ **Already prepared.** The refactoring is complete:

- The **view does not grade**. `courseView.js` only sends `{ quiz, answers }` to the service and reads the result.
- The **grading logic lives in `services/courseService.js`** → `submitQuizz()` and `submitFinal()`.
- The feedback rendering already reads `feedback.correctAnswers?.[q.id]` with a fallback.

**During integration, only the body of those two service functions will change.** The view remains untouched.

---

## 🔴 BLOCKER #2 — Business rules must be validated on the server

The frontend enforces these three rules, **but that is user interface control, not security**. Anyone can call the API from the browser console.

| # | Rule | What the backend must do |
|---|------|---------------------------|
| **1** | Students only see public courses | `GET /api/courses` filters by `visibility='open'` + the `'code'` courses where they are already enrolled. **Never** return the `course_code` of a course belonging to someone else. |
| **2** | Students cannot create courses | `POST /api/courses` → **403** if `token.role !== 'tutor'` |
| **3** | Tutors only see/edit THEIR OWN courses | `GET /api/courses/mine` filters by `tutor_id = token.user.id`. `PUT /api/courses/:id` → **403** if `course.tutor_id !== token.user.id` |

### Additional Rule: Course View Access

- A **student** can only read a course if they are **enrolled** in it → otherwise, return **403**.
- A **tutor** can only preview **their own** courses → otherwise, return **403**.

---

## 🔴 BLOCKER #3 — The course code is immutable

`PUT /api/courses/:id` must **never** overwrite an existing `course_code`, regardless of what is sent in the request body.

```javascript
const existing = await courseRepository.findById(id);

// The code is ALWAYS preserved if it already existed.
let course_code = existing.course_code;
if (payload.visibility === 'code' && !course_code) {
  course_code = await generateUniqueCode();   // first time
}

// ⚠️ Completely ignore payload.course_code: the client does NOT decide this.
```

**Reason:** A tutor might share `EDU-A3K9` with 40 students. If the code changes, anyone who hasn't enrolled yet will be locked out without knowing why.

See `COURSE_CODES.md` for full details (includes an optional PostgreSQL trigger).

---

## 🟡 IMPORTANT — The enrollment counter must be derived, not stored

**Do not store the number of students as a column in the `courses` table.**

```sql
-- ✅ Correct: always derive
SELECT COUNT(*) FROM enrollments WHERE course_id = :id;

-- ❌ Incorrect: a `students` column in `courses`
```

**Reason:** We already experienced this bug in the frontend. When you persist a calculated value and save it again, the number becomes inflated (it displayed 2 when there was only 1 enrolled student). A persisted counter is exactly the type of data that falls out of sync.

---

## ✅ Checklist for the backend Definition of Done

- [ ] `GET /api/sections/:id/items` **does not** include the `correct` field
- [ ] `GET /api/courses/:id/final` **does not** include the `correct` field
- [ ] `POST /api/submissions` grades on the server and returns `{ score, total, points, correctAnswers }`
- [ ] `POST /api/submissions` returns **409** if the student has already answered that item
- [ ] `POST /api/courses` returns **403** if the role is not `tutor`
- [ ] `PUT /api/courses/:id` returns **403** if the tutor is not the owner
- [ ] `PUT /api/courses/:id` **never** overwrites an existing `course_code`
- [ ] `GET /api/courses` filters out private courses and **does not** expose external `course_code` values
- [ ] Student count is derived using `COUNT(*)`, not from a column
- [ ] All routes (except login/register) require `Authorization: Bearer <token>`
