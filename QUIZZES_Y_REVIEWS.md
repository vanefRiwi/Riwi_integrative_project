# 🧩 Estructura de Quizzes y Reviews — Diseño para el Backend

Este documento responde a la duda técnica: **¿cómo se guardarían los quizzes y las tres actividades de review en PostgreSQL?** El frontend ya produce y consume exactamente estas estructuras, así que la integración no requerirá refactorizar la interfaz.

---

## 🎯 El problema

Un curso tiene ítems de naturaleza muy distinta:

- Un **quizz** son N preguntas de opción múltiple, cada una con 4 opciones y una correcta.
- Un **review** puede ser de **tres formatos completamente diferentes** (llenar espacios, unir pares, ordenar pasos), y cada formato necesita campos distintos.

Si intentáramos modelar esto con tablas y columnas rígidas, tendríamos que crear una tabla por formato (`review_fill_blanks`, `review_match_pairs`, `review_reorder_steps`...) y hacer JOINs condicionales. Es rígido y cada formato nuevo obligaría a migrar el esquema.

---

## ✅ La solución: una tabla + JSONB

PostgreSQL tiene **JSONB**, que permite guardar estructuras flexibles dentro de una columna, con la ventaja de que **sí se puede consultar e indexar** (a diferencia de guardar un string JSON plano).

### Tabla `items`

```sql
CREATE TABLE items (
    id           SERIAL PRIMARY KEY,
    section_id   INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    tipo_item    VARCHAR(15) NOT NULL
                 CHECK (tipo_item IN ('welcome', 'content', 'review', 'quizz', 'final')),
    payload      JSONB NOT NULL DEFAULT '{}',   -- ⭐ aquí vive la estructura variable
    counts_grade BOOLEAN DEFAULT TRUE,
    points       INTEGER DEFAULT 0,             -- puntos al leaderboard
    orden        INTEGER NOT NULL DEFAULT 0
);

-- Índice para consultar dentro del JSONB (ej. buscar reviews por formato)
CREATE INDEX idx_items_payload ON items USING GIN (payload);
```

La clave: **`tipo_item` dice cómo interpretar `payload`**. Es el mismo principio que ya usamos con `tipo`/`datos` en los contenidos.

---

## 📝 Estructura de un QUIZZ

`tipo_item = 'quizz'` (o `'final'` para el examen final — misma estructura).

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

**Notas:**
- `correct` es el **índice** (0–3) de la opción correcta dentro de `options`.
- Los puntos van en la columna `points` de la tabla, no en el JSON.

> ⚠️ **Seguridad:** al enviar el quizz al estudiante, el backend **debe eliminar el campo `correct`** de la respuesta. Si no, cualquiera lo ve en la pestaña Network del navegador. La corrección se hace **en el servidor**, comparando contra el `payload` original.

---

## 🎲 Estructura de los REVIEWS

`tipo_item = 'review'`. Los tres formatos comparten el campo `format`, que indica cuál es.

### Formato 1 — Fill in the blanks

Los huecos se marcan con `[[dobles corchetes]]` dentro del texto.

```json
{
  "format": "fill-blanks",
  "blankText": "The [[HTTP]] protocol is the foundation of data communication on the [[web]]. A [[server]] responds to requests made by the client.",
  "instantFeedback": true
}
```

El frontend parsea el texto, reemplaza cada `[[respuesta]]` por un input, y compara lo escrito (sin distinguir mayúsculas) contra el valor esperado.

### Formato 2 — Match pairs

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

El frontend muestra los `term` fijos y las `def` mezcladas en un select.

### Formato 3 — Reorder steps

Los pasos se guardan **en el orden correcto**; el frontend los desordena al mostrarlos.

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

## 📊 Guardar las respuestas: tabla `submissions`

```sql
CREATE TABLE submissions (
    id            SERIAL PRIMARY KEY,
    student_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    answers       JSONB NOT NULL DEFAULT '{}',   -- lo que respondió
    score         INTEGER,                       -- respuestas correctas
    total         INTEGER,                       -- total de preguntas
    points_earned INTEGER DEFAULT 0,             -- puntos al leaderboard
    submitted_at  TIMESTAMP DEFAULT NOW(),

    -- ⭐ Un intento por estudiante e ítem: los quizzes se hacen UNA sola vez
    UNIQUE (student_id, item_id)
);
```

El `UNIQUE (student_id, item_id)` es lo que garantiza, **a nivel de base de datos**, que un quizz no se pueda repetir. Es más seguro que confiar solo en el frontend.

### Ejemplo de `answers` para un quizz
```json
{ "1": 1, "2": 0, "3": 1 }
```
(clave = id de la pregunta, valor = índice de la opción elegida)

---

## 🏆 Reglas de negocio implementadas

**Solo los quizzes dan puntos al leaderboard.** Los reviews son actividades de práctica: dan feedback inmediato, pero **no puntúan ni cuentan para la nota**. En la tabla, un review tendría `counts_grade = false` y `points = 0`.

**Los quizzes se completan una sola vez.** Garantizado por el `UNIQUE (student_id, item_id)`.

**Desbloqueo progresivo.** El quizz de una sección desbloquea la siguiente; completar todos desbloquea el examen final. El backend puede validarlo comprobando que exista una `submission` para el ítem quizz de la sección anterior.

---

## 🧮 Cálculo de la nota final

```
nota_final = (Σ porcentaje_de_cada_quizz + porcentaje_examen_final) / (nº_secciones + 1)
```

Se divide entre el número de secciones **+1** (por el examen final). La cantidad de quizzes varía según el curso, por eso el divisor es dinámico. Los ítems no presentados cuentan como 0.

En el frontend esto ya está implementado en `services/courseService.js`:

- **`finalGrade(sections, progress)`** → la nota definitiva.
- **`gradeBreakdown(sections, progress)`** → el desglose de notas individuales.
- **`totalPoints(sections, progress)`** → puntos del leaderboard (solo quizzes).

Estas **tres funciones son compartidas** por el panel *Grades* del estudiante y el *Dashboard* del tutor, así ambos ven siempre la misma cifra. Cuando exista el backend, lo ideal es que el servidor calcule la nota con la misma fórmula y la devuelva ya lista.

---

## 🔌 Endpoints esperados

| Método | Ruta | Devuelve |
|--------|------|----------|
| `GET` | `/api/sections/:id/items` | Los ítems de la sección (**sin el campo `correct`**) |
| `POST` | `/api/submissions` | Corrige en el servidor y devuelve `{ score, total, points }` |
| `GET` | `/api/courses/:id/progress` | El progreso del estudiante autenticado |
| `GET` | `/api/courses/:id/students` | Estudiantes + notas (para el Dashboard del tutor) |
| `GET` | `/api/courses/:id/leaderboard` | Ranking por `points_earned` (solo quizzes) |

---

## 🔄 Qué falta para integrar

En `services/courseService.js`, cada función ya tiene comentado el `fetch` que la reemplaza. Al conectar el backend:

1. Descomentar `import { api } from "../helpers/api.js"`.
2. Reemplazar el cuerpo de cada función por su llamada real.
3. Borrar la carpeta `mocks/`.

**Ninguna vista cambia.**
