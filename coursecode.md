# 🔐 Access Codes for Private Courses — Proposal

Design document for the **course code** system in LumORA: how they're generated, how they're stored, and why they're **immutable**.

The frontend is already implemented following this proposal; the backend must respect it so the integration requires no changes to the interface.

---

## 🎯 The problem

A tutor can create two types of course:

| Visibility | Behavior |
|-------------|----------------|
| **`open`** | Any student can see it in the catalog and join freely. |
| **`code`** | The course **does not appear** in the catalog. It can only be accessed by entering a code the tutor shares. |

The question is: **when is that code generated, and can it change?**

---

## ✅ Design decision: single, immutable generation

> The code is generated **only once**, at the moment the tutor marks the course as private. From that point on it is **locked and cannot be changed or regenerated**.

### Why immutable

This is the most important decision in the system, and it responds to a real problem:

A tutor shares `EDU-A3K9` with their 40 students via WhatsApp. If the code could later be regenerated, everyone who hasn't enrolled yet would be **locked out** with a code that no longer works, with no idea why. The tutor would have to notify everyone all over again.

A permanent code avoids that entire class of problems. It's a stable identifier for the course, not a rotating password.

### Important clarification: it's **multi-use**, not single-use

The code is **not consumed**. The same code lets **all** students in the course enroll, as many times as needed.

What's "one-time" is its **creation**, not its **use**:

| Concept | One-time only? |
|----------|----------------|
| **Code generation** | ✅ Yes — created once and never changes |
| **Code usage** | ❌ No — used by every student in the course |
| **Enrollment per student** | ✅ Yes — each student can only enroll once |

> If single-use codes (like an "individual invitation" type) were needed in the future,
> a separate invitations table would be required. **That's not the current case.**

---

## 🔤 Code format

```
EDU-XXXX
```

Example: `EDU-A3K9`, `AWS-7X2M`

**Alphabet used:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`

Note that ambiguous characters are **deliberately excluded**:
- `I`, `1`, `L` → get mixed up with each other
- `O`, `0` → get mixed up with each other

This matters because the code is shared verbally or over chat, and typed in by hand. A student who mixes up a `0` with an `O` can't get in, and neither they nor the tutor understand why.

**Combination space:** 32⁴ = **1,048,576** possible codes. Enough for the scope of the project.

---

## 🔄 Lifecycle

```
1. The tutor creates a course  →  visibility = "open", course_code = null

2. The tutor turns on "Require course code"
   ↓
   Does a code already exist?
   ├── NO  → one is GENERATED (EDU-XXXX) and LOCKED (codeLocked = true)
   └── YES → the existing one is REUSED (never regenerated)

3. The code is shown with a 🔒 lock icon + "Copy" button
   (not editable)

4. If the tutor switches back to "Open to everyone"
   ↓
   The code is KEPT in storage (not deleted).
   If privacy is reactivated later, the SAME code is restored.
```

This last point is key: switching private → public → private **does not generate a new code**. Students who already had it can keep using it.

---

## 💾 Data model

The code lives in the `courses` table itself. No separate table is needed, since it's a 1:1 attribute of the course.

```sql
CREATE TABLE courses (
    id          SERIAL PRIMARY KEY,
    tutor_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(150) NOT NULL,
    -- ...

    visibility  VARCHAR(10) NOT NULL DEFAULT 'open'
                CHECK (visibility IN ('open', 'code')),

    course_code VARCHAR(10) UNIQUE,   -- ← NULL if it was never made private

    created_at  TIMESTAMP DEFAULT NOW(),

    -- A private course MUST have a code
    CONSTRAINT chk_private_has_code
      CHECK (visibility = 'open' OR course_code IS NOT NULL)
);

-- Fast lookup when validating a code
CREATE INDEX idx_courses_code ON courses(course_code) WHERE course_code IS NOT NULL;
```

**Schema details:**

The `UNIQUE` constraint on `course_code` guarantees at the database level that there are no collisions — if the generator ever produced a duplicate, the INSERT fails and is retried.

The `CHECK` constraint enforces that every private course has a code. It's impossible to have a course with `visibility='code'` and `course_code=NULL`.

The index is partial (`WHERE course_code IS NOT NULL`) because most courses are public and have no code: there's no point indexing all those NULLs.

---

## 🔒 How immutability is enforced

Immutability must be protected across **three layers**. The frontend layer is just for convenience; the other two are what actually matter.

### 1. Frontend (UX)
The field is shown locked, with a lock icon and no way to edit it. Already implemented in `courseEditorView.js` via the `codeLocked` flag.

### 2. Backend (real security) ⚠️
The `PUT /api/courses/:id` endpoint **must never overwrite an existing `course_code`**, no matter what arrives in the body. A malicious user could send anything from the console.

```javascript
// In the update service
const existing = await courseRepository.findById(id);

// The code is ALWAYS preserved if it already existed.
// It's only generated if the course becomes private for the first time.
let course_code = existing.course_code;
if (payload.visibility === 'code' && !course_code) {
  course_code = await generateUniqueCode();
}

// ⚠️ Completely ignore payload.course_code: the client does NOT decide it.
await courseRepository.update(id, { ...payload, course_code });
```

### 3. Database (last line of defense)
Optionally, a trigger that rejects any UPDATE trying to change an already-assigned code:

```sql
CREATE OR REPLACE FUNCTION prevent_code_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.course_code IS NOT NULL AND NEW.course_code IS DISTINCT FROM OLD.course_code THEN
    RAISE EXCEPTION 'course_code is immutable once generated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_immutable_code
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION prevent_code_change();
```

---

## 🧮 Code generation on the backend

The code must be generated **on the server**, not on the client. If the frontend generated it, a user could pick their own.

```javascript
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";  // no I,O,0,1

function randomCode() {
  const rand = Array.from({ length: 4 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join("");
  return `EDU-${rand}`;
}

// Retries on collision (the DB's UNIQUE constraint detects it)
async function generateUniqueCode(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    const code = randomCode();
    const exists = await courseRepository.findByCode(code);
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique course code");
}
```

---

## 🔌 Endpoints involved

### `POST /api/enrollments/by-code`
The student joins a private course with their code.

**Body:** `{ "code": "EDU-A3K9" }`

| Response | When |
|-----------|------|
| **200** + the course | Valid code → enrollment is created |
| **404** | The code doesn't match any course |
| **409** | The student is already enrolled in that course |

```json
// 200 OK
{ "ok": true, "course": { "id": 3, "title": "Machine Learning Essentials", ... } }
```

### `GET /api/courses`
The student's catalog. **The backend must filter**: return only courses with `visibility = 'open'`, plus `'code'` courses the student is **already enrolled in** (so they keep seeing them in their list after joining).

> ⚠️ **Never** return the `course_code` of a course the student doesn't
> belong to. That would leak the access key.

---

## ✅ Current frontend status

Everything above is already implemented with test data:

| Piece | File |
|-------|------|
| Code generation | `data/courses.js` → `generateCourseCode()` |
| Locking after generation | `views/tutor/courseEditorView.js` → `codeLocked` flag |
| Preservation on edit | `data/courses.js` → `updateCourse()` |
| Joining with a code | `data/courses.js` → `joinCourseByCode()` |
| Enrollment modal | `components/joinCourseModal.js` |
| Filtering of private courses | `data/courses.js` → `getOpenCourses()` |

Once the backend is connected, only the bodies of those functions need to be replaced with the actual API calls. **The views don't change.**

### Test courses with a code

| Course | Code |
|-------|--------|
| Machine Learning Essentials | `EDU-A3K9` |
| Cloud Architecture AWS | `AWS-7X2M` |

---

## 🚪 Leaving a private course

When a student leaves a private course, three things happen:

1. **It disappears from their catalog.** A course with `visibility='code'` is
   only visible to enrolled students. Once unenrolled, they stop seeing it —
   and to get back in they need the code again.
2. **The enrollment count goes down.** The tutor sees this reflected on their home page.
3. **Their progress is deleted.** Notes, quizzes, and reviews are removed. If
   they rejoin, they start from scratch.

> ⚠️ **Design note:** the code **remains valid**. Leaving a course does
> not invalidate the code, either for that student or anyone else. The code
> belongs to the course, not to the enrollment.

On the backend, this translates to:

```sql
-- On DELETE /api/enrollments/:courseId
DELETE FROM enrollments WHERE student_id = :userId AND course_id = :courseId;
-- Submissions are deleted in cascade (ON DELETE CASCADE)
```

---

## 🧮 Note on the enrollment counter

The number of students in a course is a **derived value**, never stored:

```sql
SELECT COUNT(*) FROM enrollments WHERE course_id = :id;
```

⚠️ **Don't store the count as a column in `courses`.** It's the kind of data
that goes out of sync: if an already-calculated value is persisted and the
course is saved again later, the number inflates. The count must always be
derived from the `enrollments` table, which is the single source of truth.