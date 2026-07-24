# ✅ Backend Guarantees — Verified

This document started life as `future_BACKEND_Requirements.md`, a list of risks
identified **before** the backend existed. Each one was a way the system could
be broken from day one if implemented carelessly.

The backend is now implemented and deployed, and every requirement was met.
This version records what the system guarantees and how each guarantee was
verified, so the claims can be checked rather than trusted.

---

## 🟢 GUARANTEE #1 — Correct answers never reach the client

### The risk

If quiz questions were sent with their `correct` field included, any student
could open DevTools, inspect the network response, and read every answer before
submitting. Grading would be theatre.

```json
{
  "id": 1,
  "text": "What is the primary purpose of this approach?",
  "options": ["Reduce complexity", "Improve scalability", "..."],
  "correct": 1          // ← must never leave the server
}
```

### How it is guaranteed

**Sanitised reads.** `item.services.js` strips `correct` from every question
before responding, on both `GET /api/sections/:id/items` and
`GET /api/courses/:id/final-assessment`.

**Server-side grading.** The client posts only the answers.
`submission.services.js` compares them against the payload stored in the
database, computes the score and the points, and persists the result.

**Request:**
```json
{ "type": "quizz", "section_id": 12, "answers": { "101": 0, "102": 1 } }
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "correct": 1,
    "total": 2,
    "points": 25,
    "correctAnswers": { "101": 0, "102": 1 }
  }
}
```

`correctAnswers` travels **only in the submit response**, never in the GET, so
the interface can highlight the right option in green after answering.

**One attempt per item.** Guaranteed at the database level by
`UNIQUE (student_id, item_id)` on `submissions`, not by frontend logic.

### Verification

The end-to-end suite asserts that a student fetching a section receives
questions where `correct` is `undefined`, submits deliberately wrong answers,
and receives a server-computed score of 1 out of 2 with 25 points.

---

## 🟢 GUARANTEE #2 — Business rules are validated on the server

Frontend checks are interface convenience. Anyone can call the API from a
console, so each rule is enforced independently in the service layer.

| # | Rule | Enforcement |
|---|---|---|
| 1 | Students only see public courses | `GET /api/courses` filters by `visibility='open'` plus `'code'` courses where the student is enrolled. `course_code` is never returned for a course the student does not belong to |
| 2 | Students cannot create courses | `authorizeRoles("tutor")` on `POST /api/courses` and `/api/courses/full` → **403** |
| 3 | Tutors only see and edit their own courses | `GET /api/courses/mine` filters by the token's id; every write checks `course.tutor_id` → **403** |

**Course access.** A student can only read a course they are enrolled in; a
tutor can only open the editor for a course they own. Both return **403**
otherwise.

### Verification

The suite confirms a private course is absent from a student's catalog before
enrolling and present after, that its `course_code` is `undefined` in the
catalog response, and that a student requesting `/courses/:id/full` gets 403.

---

## 🟢 GUARANTEE #3 — The course code is immutable

### The risk

A tutor shares `EDU-A3K9` with forty students. If a later edit regenerated the
code, everyone who had not yet enrolled would be locked out with no explanation.

### How it is guaranteed

The update service always preserves an existing code and ignores whatever
arrives in the body. A code is generated only the first time a course becomes
private.

```javascript
let course_code = existing.course_code;
if (payload.visibility === 'code' && !course_code) {
  course_code = await generateUniqueCode();   // first time only
}
// payload.course_code is ignored entirely: the client does not decide this
```

Switching private → public → private restores the **same** code, because it is
kept in storage rather than deleted.

See `COURSE_CODES.md` for the format rationale and the optional database
trigger that adds a third layer of protection.

### Verification

The suite updates a course and asserts `course_code` is unchanged.

---

## 🟢 GUARANTEE #4 — The enrollment counter is derived

**There is no `students` column in `courses`.** The count is always computed:

```sql
SELECT COUNT(*) FROM enrollments WHERE course_id = :id;
```

### Why this was flagged

This exact bug appeared in the frontend during development: a persisted count
inflated to 2 when only one student was enrolled, because a calculated value
was saved and then saved again. A stored counter is the classic example of data
that drifts out of sync. `enrollments` is the single source of truth.

A related fix was needed in the tutor statistics query: a double `LEFT JOIN`
across enrollments and sections multiplied rows and inflated the totals. It now
uses independent subqueries.

### Verification

The suite enrolls one student and asserts the catalog reports exactly 1, and
that tutor stats report 1 course, 1 student and 2 sections.

---

## 🟢 GUARANTEE #5 — Content saves are atomic

Not in the original risk list, but it emerged during implementation.

The course editor saves an entire course at once: metadata, sections, items and
final assessment. Doing that with separate calls would leave a course
half-written if one failed midway.

`POST /api/courses/full` and `PUT /api/courses/:id/full` run the whole sync
inside a **single transaction**. New sections arrive with temporary client-side
ids and the response returns the real database ids, so saving twice in a row
updates rather than duplicates.

### Verification

The suite creates a course with two sections, then updates it renaming one,
deleting another and adding a third, and asserts the resulting structure.

---

## 📋 Definition of Done

| Requirement | Status |
|---|---|
| `GET /api/sections/:id/items` excludes `correct` | ✅ |
| `GET /api/courses/:id/final-assessment` excludes `correct` | ✅ |
| `POST /api/submissions` grades server-side and returns `correctAnswers` | ✅ |
| One submission per student and item | ✅ `UNIQUE` constraint |
| `POST /api/courses` returns 403 for non-tutors | ✅ |
| `PUT /api/courses/:id` returns 403 for non-owners | ✅ |
| `course_code` is never overwritten | ✅ |
| Private courses and their codes stay hidden | ✅ |
| Student count derived with `COUNT(*)` | ✅ |
| All routes except auth require a Bearer token | ✅ |

---

## 🔬 How to re-verify

The guarantees above were checked with an end-to-end suite covering the full
journey: register both roles, create a full course, join by code, submit
quizzes and the final assessment, read progress, leaderboard and the tutor
report, update a profile, and leave a course.

Re-running it after any backend change is the fastest way to confirm nothing
regressed. Two behaviours are especially easy to break by accident: the
sanitisation of `correct`, and the ownership checks.
