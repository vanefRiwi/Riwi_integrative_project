# 🧩 Quiz and Review Structure — Data Design

How quizzes and the three review activities are stored in PostgreSQL, and why.

---

## 🎯 The problem

A course holds items of very different natures:

- A **quiz** is N multiple-choice questions, each with 4 options and one correct
  answer.
- A **review** can be in **three completely different formats** (fill in the
  blanks, match pairs, reorder steps), and each format needs different fields.
- A **content block** is a title plus either Markdown, a video id or an embed URL.

Modelling this with rigid columns would mean a separate table per format
(`review_fill_blanks`, `review_match_pairs`, `review_reorder_steps`) plus
conditional joins, and every new format would force a schema migration.

---

## ✅ The solution: one table + JSONB

PostgreSQL's **JSONB** stores flexible structures in a column while remaining
queryable and indexable, unlike a plain JSON string.

### `items` table

```sql
CREATE TABLE items (
    id          SERIAL PRIMARY KEY,
    section_id  INTEGER REFERENCES sections(id) ON DELETE CASCADE,
    course_id   INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    tipo_item   VARCHAR(20) NOT NULL
                CHECK (tipo_item IN ('welcome','content','review','quizz','final')),
    titulo      VARCHAR(200),                  -- content blocks only
    tipo        VARCHAR(20),                   -- readme | youtube | canva
    payload     JSONB NOT NULL DEFAULT '{}',   -- ⭐ the variable structure
    points      INTEGER NOT NULL DEFAULT 0,    -- toward the leaderboard
    orden       INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),

    -- An item belongs either to a section or to a course, never to neither
    CONSTRAINT items_owner_check
      CHECK (section_id IS NOT NULL OR course_id IS NOT NULL)
);
```

The key idea: **`tipo_item` says how to interpret `payload`.** Same principle as
the `tipo`/`datos` pair used in content blocks.

Two design details worth explaining:

**Why both `section_id` and `course_id`.** Most items belong to a section, but
the final assessment belongs to the *course* as a whole. Rather than inventing a
fake section for it, the item can hang from either, and the `CHECK` constraint
guarantees it hangs from at least one.

**Why one item of each type per section.** Partial unique indexes enforce that a
section has at most one `welcome`, one `review` and one `quizz`, while allowing
many `content` blocks:

```sql
CREATE UNIQUE INDEX uq_items_section_single
  ON items (section_id, tipo_item)
  WHERE tipo_item IN ('welcome','review','quizz');
```

---

## 📝 Structure of a QUIZ

`tipo_item = 'quizz'`, or `'final'` for the final assessment. Same structure.

```json
{
  "questions": [
    {
      "id": 1,
      "text": "What is the primary purpose of the approach covered in this section?",
      "options": [
        "Reduce code complexity",
        "Improve scalability and performance",
        "Simplify debugging workflows",
        "Minimize development time"
      ],
      "correct": 1
    }
  ],
  "countsGrade": true
}
```

- `correct` is the **index** (0–3) of the right option within `options`.
- Points live in the table's `points` column, not in the JSON.

> ⚠️ **Security:** the backend **strips `correct`** before sending a quiz to a
> student. Grading happens on the server by comparing against the stored
> payload. The only endpoint that returns `correct` is `GET /api/courses/:id/full`,
> restricted to the owning tutor.

---

## 🎲 Structure of REVIEWS

`tipo_item = 'review'`. All three formats share a `format` field.

Reviews are **practice activities**: they give instant feedback but award no
points and do not affect the grade.

### Format 1 — Fill in the blanks

Blanks are marked with `[[double brackets]]` inside the text.

```json
{
  "format": "fill-blanks",
  "blankText": "The [[HTTP]] protocol is the foundation of data communication on the [[web]].",
  "instantFeedback": true
}
```

The frontend parses the text, replaces each `[[answer]]` with an input, and
compares case-insensitively.

### Format 2 — Match pairs

```json
{
  "format": "match-pairs",
  "pairs": [
    { "id": 1, "term": "HTML", "def": "Structure of a webpage" },
    { "id": 2, "term": "CSS",  "def": "Styling and layout" },
    { "id": 3, "term": "JavaScript", "def": "Interactivity and logic" }
  ],
  "instantFeedback": true
}
```

Terms are shown fixed; definitions are shuffled into a select.

### Format 3 — Reorder steps

Steps are stored **in the correct order**; the frontend shuffles them on display.

```json
{
  "format": "reorder-steps",
  "steps": [
    { "id": 1, "text": "Define the problem statement" },
    { "id": 2, "text": "Gather requirements" },
    { "id": 3, "text": "Design the solution" },
    { "id": 4, "text": "Implement and test" }
  ],
  "instantFeedback": true
}
```

---

## 📊 Storing answers: `submissions`

```sql
CREATE TABLE submissions (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id  INTEGER REFERENCES sections(id) ON DELETE CASCADE,
    item_type   VARCHAR(20) NOT NULL
                CHECK (item_type IN ('quizz','review','final')),
    answers     JSONB,
    score       INTEGER,          -- correct answers
    total       INTEGER,          -- number of questions
    points      INTEGER NOT NULL DEFAULT 0,
    correct     BOOLEAN,          -- reviews only
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One submission per student per section item, and one final per course
CREATE UNIQUE INDEX uq_submissions_section
  ON submissions (student_id, section_id, item_type)
  WHERE section_id IS NOT NULL;

CREATE UNIQUE INDEX uq_submissions_final
  ON submissions (student_id, course_id)
  WHERE item_type = 'final';
```

Those two partial unique indexes are what guarantee **at the database level**
that a quiz is answered once. Relying on the frontend would not be safe, since
anyone can call the API directly.

### Example `answers` for a quiz
```json
{ "101": 1, "102": 0, "103": 1 }
```
Key is the question id, value is the index of the chosen option.

---

## 🏆 Business rules

**Only quizzes and the final assessment award leaderboard points.** Reviews are
practice: instant feedback, zero points, no effect on the grade.

**Quizzes are answered once.** Enforced by the unique indexes above.

**Progressive unlocking.** A section unlocks when the previous section's quiz is
submitted; completing all quizzes unlocks the final assessment. The check is
simply whether a submission exists for the previous section.

**Leaving a course deletes progress.** Submissions cascade with the enrollment,
so rejoining starts from zero.

---

## 🧮 Final grade calculation

```
final_grade = (Σ percentage_of_each_quiz + final_percentage) / (sections + 1)
```

Divided by sections **+1** for the final assessment. The divisor is dynamic
because the number of quizzes varies per course. Unsubmitted items count as 0.

Implemented in `services/courseService.js` as `calculateFinalGrade(sections,
progress)`, which returns the grade, the per-item breakdown and the total
points. The **same function** feeds both the student's Grades panel and the
tutor's Dashboard, so the two always show the same number.

`GET /api/courses/:id/students` returns each student's `progress` in the same
shape as `GET /api/courses/:id/progress` specifically so the dashboard can reuse
that function unchanged.

---

## 🔌 Related endpoints

| Method | Route | Returns |
|---|---|---|
| `GET` | `/api/sections/:id/items` | Section items, **without `correct`** |
| `GET` | `/api/courses/:id/final-assessment` | Final assessment, **without `correct`** |
| `POST` | `/api/submissions` | Grades server-side, returns `{ correct, total, points, correctAnswers }` |
| `GET` | `/api/courses/:id/progress` | The authenticated student's progress |
| `GET` | `/api/courses/:id/students` | Students with grades, for the tutor's dashboard |
| `GET` | `/api/courses/:id/leaderboard` | Ranking by points (quizzes and final only) |

Full request and response shapes in `API_CONTRACT.md`.
