# 🧩 Quiz and Review Structure — Backend Design

This document answers the technical question: **how would quizzes and the three review activities be stored in PostgreSQL?** The frontend already produces and consumes exactly these structures, so integration won't require refactoring the interface.

---

## 🎯 The problem

A course has items of very different natures:

- A **quiz** is N multiple-choice questions, each with 4 options and one correct answer.
- A **review** can be in **three completely different formats** (fill in the blanks, match pairs, reorder steps), and each format needs different fields.

If we tried to model this with rigid tables and columns, we'd have to create a separate table per format (`review_fill_blanks`, `review_match_pairs`, `review_reorder_steps`...) and do conditional JOINs. That's rigid, and every new format would force a schema migration.

---

## ✅ The solution: one table + JSONB

PostgreSQL has **JSONB**, which lets you store flexible structures inside a column, with the advantage that it **can actually be queried and indexed** (unlike storing a plain JSON string).

### `items` table

```sql
CREATE TABLE items (
    id           SERIAL PRIMARY KEY,
    section_id   INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    tipo_item    VARCHAR(15) NOT NULL
                 CHECK (tipo_item IN ('welcome', 'content', 'review', 'quizz', 'final')),
    payload      JSONB NOT NULL DEFAULT '{}',   -- ⭐ the variable structure lives here
    counts_grade BOOLEAN DEFAULT TRUE,
    points       INTEGER DEFAULT 0,             -- points toward the leaderboard
    orden        INTEGER NOT NULL DEFAULT 0
);

-- Index for querying inside the JSONB (e.g. searching reviews by format)
CREATE INDEX idx_items_payload ON items USING GIN (payload);
```

The key idea: **`tipo_item` says how to interpret `payload`**. It's the same principle we already use with `tipo`/`datos` in contents.

---

## 📝 Structure of a QUIZ

`tipo_item = 'quizz'` (or `'final'` for the final exam — same structure).

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
    },
    {
      "id": 2,
      "text": "Which of the following is a key principle discussed?",
      "options": ["Single responsibility", "Multiple inheritance", "Deep coupling", "Global state"],
      "correct": 0
    }
  ]
}
```

**Notes:**
- `correct` is the **index** (0–3) of the correct option within `options`.
- Points go in the table's `points` column, not in the JSON.

> ⚠️ **Security:** when sending the quiz to the student, the backend **must strip out the `correct` field** from the response. Otherwise anyone can see it in the browser's Network tab. Grading must happen **on the server**, by comparing against the original `payload`.

---

## 🎲 Structure of REVIEWS

`tipo_item = 'review'`. All three formats share the `format` field, which indicates which one it is.

### Format 1 — Fill in the blanks

Blanks are marked with `[[double brackets]]` inside the text.

```json
{
  "format": "fill-blanks",
  "blankText": "The [[HTTP]] protocol is the foundation of data communication on the [[web]]. A [[server]] responds to requests made by the client.",
  "instantFeedback": true
}
```

The frontend parses the text, replaces each `[[answer]]` with an input field, and compares what was typed (case-insensitive) against the expected value.

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

The frontend shows the fixed `term` values and the shuffled `def` values in a select.

### Format 3 — Reorder steps

Steps are stored **in the correct order**; the frontend shuffles them when displaying.

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

## 📊 Storing answers: `submissions` table

```sql
CREATE TABLE submissions (
    id            SERIAL PRIMARY KEY,
    student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    answers       JSONB NOT NULL DEFAULT '{}',   -- what they answered
    score         INTEGER,                       -- correct answers
    total         INTEGER,                       -- total number of questions
    points_earned INTEGER DEFAULT 0,             -- points toward the leaderboard
    submitted_at  TIMESTAMP DEFAULT NOW(),

    -- ⭐ One attempt per student and item: quizzes are taken only ONCE
    UNIQUE (student_id, item_id)
);
```

The `UNIQUE (student_id, item_id)` constraint is what guarantees, **at the database level**, that a quiz can't be repeated. That's safer than relying on the frontend alone.

### Example `answers` for a quiz
```json
{ "1": 1, "2": 0, "3": 1 }
```
(key = question id, value = index of the chosen option)

---

## 🏆 Business rules implemented

**Only quizzes award leaderboard points.** Reviews are practice activities: they give instant feedback, but **don't count toward the score or the grade**. In the table, a review would have `counts_grade = false` and `points = 0`.

**Quizzes are completed only once.** Guaranteed by `UNIQUE (student_id, item_id)`.

**Progressive unlocking.** A section's quiz unlocks the next one; completing all of them unlocks the final exam. The backend can validate this by checking whether a `submission` exists for the previous section's quiz item.

---

## 🧮 Final grade calculation

```
final_grade = (Σ percentage_of_each_quiz + final_exam_percentage) / (number_of_sections + 1)
```

It's divided by the number of sections **+1** (for the final exam). The number of quizzes varies by course, which is why the divisor is dynamic. Items not submitted count as 0.

On the frontend this is already implemented in `services/courseService.js`:

- **`finalGrade(sections, progress)`** → the final grade.
- **`gradeBreakdown(sections, progress)`** → the breakdown of individual grades.
- **`totalPoints(sections, progress)`** → leaderboard points (quizzes only).

These **three functions are shared** between the student's *Grades* panel and the tutor's *Dashboard*, so both always see the same figure. Once the backend exists, ideally the server should calculate the grade with the same formula and return it ready to use.

---

## 🔌 Expected endpoints

| Method | Route | Returns |
|--------|------|----------|
| `GET` | `/api/sections/:id/items` | The section's items (**without the `correct` field**) |
| `POST` | `/api/submissions` | Grades on the server and returns `{ score, total, points }` |
| `GET` | `/api/courses/:id/progress` | The authenticated student's progress |
| `GET` | `/api/courses/:id/students` | Students + grades (for the tutor's Dashboard) |
| `GET` | `/api/courses/:id/leaderboard` | Ranking by `points_earned` (quizzes only) |

---

## 🔄 What's left to integrate

In `services/courseService.js`, every function already has the `fetch` call that will replace it commented out. Once the backend is connected:

1. Uncomment `import { api } from "../helpers/api.js"`.
2. Replace the body of each function with its real API call.
3. Delete the `mocks/` folder.

**No view changes.**