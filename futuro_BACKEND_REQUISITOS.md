# 🚨 Requisitos bloqueantes para el Backend

Este documento lista los requisitos que **deben** cumplirse al implementar el backend. No son sugerencias: si se implementan mal, obligan a refactorizar el frontend.

Deben incorporarse como **criterios de aceptación** en las Historias de Usuario del backend, no como notas de un README que alguien quizá lea.

---

## 🔴 BLOQUEANTE #1 — Las respuestas correctas nunca deben llegar al cliente

### El problema

Hoy, en modo mock, el frontend recibe las preguntas del quiz **con** el campo `correct`:

```json
{
  "id": 1,
  "text": "What is the primary purpose of this approach?",
  "options": ["Reduce complexity", "Improve scalability", "..."],
  "correct": 1          // ← ⚠️ el índice de la respuesta correcta
}
```

Cualquier estudiante abre las DevTools del navegador, mira la respuesta de la red, y **ve todas las respuestas correctas antes de contestar**. La calificación deja de tener sentido.

Esto es aceptable hoy (son datos de prueba), pero **si el backend replica esta forma, el sistema nace roto**.

### El requisito

#### 1. `GET /api/sections/:id/items` — sin `correct`

El servidor debe **eliminar** el campo `correct` antes de responder:

```javascript
// En el service del backend
const quiz = await itemRepository.findBySection(sectionId, 'quizz');

// ⚠️ Nunca enviar `correct` al cliente
const safeQuestions = quiz.payload.questions.map(({ correct, ...q }) => q);

return { ...quiz, payload: { ...quiz.payload, questions: safeQuestions } };
```

Lo mismo aplica a `GET /api/courses/:id/final`.

#### 2. `POST /api/submissions` — el servidor califica

El cliente envía **solo las respuestas**. El servidor compara, califica y devuelve el resultado.

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

> El campo `correctAnswers` **sí** puede devolverse **después** de enviar,
> para que el frontend pinte en verde la opción correcta. Antes de enviar, nunca.

#### 3. Una sola vez por estudiante

El `UNIQUE (student_id, item_id)` de la tabla `submissions` ya lo garantiza a nivel de BD. El endpoint debe devolver **409 Conflict** si ya existe.

### Estado del frontend

✅ **Ya está preparado.** La refactorización está hecha:

- La **vista no califica**. `courseView.js` solo envía `{ quiz, answers }` al service y lee el resultado.
- La **calificación vive en `services/courseService.js`** → `submitQuizz()` y `submitFinal()`.
- El pintado del feedback ya lee `feedback.correctAnswers?.[q.id]` con fallback.

**Al integrar, solo cambia el cuerpo de esas dos funciones del service.** La vista no se toca.

---

## 🔴 BLOQUEANTE #2 — Las reglas de negocio deben validarse en el servidor

El frontend aplica las tres reglas, **pero eso es control de interfaz, no seguridad**. Cualquiera puede llamar la API desde la consola del navegador.

| # | Regla | Qué debe hacer el backend |
|---|-------|---------------------------|
| **1** | Los estudiantes solo ven cursos públicos | `GET /api/courses` filtra por `visibility='open'` + los `'code'` donde ya está inscrito. **Nunca** devolver el `course_code` de un curso ajeno. |
| **2** | Los estudiantes no crean cursos | `POST /api/courses` → **403** si `token.role !== 'tutor'` |
| **3** | Los tutores solo ven/editan SUS cursos | `GET /api/courses/mine` filtra por `tutor_id = token.user.id`. `PUT /api/courses/:id` → **403** si `course.tutor_id !== token.user.id` |

### Regla adicional: acceso a la vista de curso

- Un **estudiante** solo puede leer un curso en el que **está inscrito** → si no, **403**.
- Un **tutor** solo puede previsualizar **sus propios** cursos → si no, **403**.

---

## 🔴 BLOQUEANTE #3 — El código de curso es inmutable

`PUT /api/courses/:id` **nunca** debe sobrescribir un `course_code` existente, sin importar lo que llegue en el body.

```javascript
const existing = await courseRepository.findById(id);

// El código se conserva SIEMPRE si ya existía.
let course_code = existing.course_code;
if (payload.visibility === 'code' && !course_code) {
  course_code = await generateUniqueCode();   // primera vez
}

// ⚠️ Ignorar payload.course_code por completo: el cliente NO lo decide.
```

**Motivo:** un tutor comparte `EDU-A3K9` con 40 alumnos. Si el código cambiara, todos los que aún no se inscribieron quedan fuera sin saber por qué.

Ver `CODIGOS_DE_CURSO.md` para el detalle completo (incluye un trigger de PostgreSQL opcional).

---

## 🟡 IMPORTANTE — El contador de inscritos es derivado, no almacenado

**No guardar el número de estudiantes como columna en `courses`.**

```sql
-- ✅ Correcto: derivar siempre
SELECT COUNT(*) FROM enrollments WHERE course_id = :id;

-- ❌ Incorrecto: una columna `students` en `courses`
```

**Motivo:** ya tuvimos este bug en el frontend. Al persistir un valor calculado y volver a guardarlo, el número se infla (mostraba 2 cuando había 1 inscrito). Un contador persistido es justo la clase de dato que se desincroniza.

---

## ✅ Checklist para la Definition of Done del backend

- [ ] `GET /api/sections/:id/items` **no** incluye el campo `correct`
- [ ] `GET /api/courses/:id/final` **no** incluye el campo `correct`
- [ ] `POST /api/submissions` califica en el servidor y devuelve `{ score, total, points, correctAnswers }`
- [ ] `POST /api/submissions` devuelve **409** si el estudiante ya respondió ese item
- [ ] `POST /api/courses` devuelve **403** si el rol no es `tutor`
- [ ] `PUT /api/courses/:id` devuelve **403** si el tutor no es el dueño
- [ ] `PUT /api/courses/:id` **nunca** sobrescribe un `course_code` existente
- [ ] `GET /api/courses` filtra los privados y **no** expone `course_code` ajenos
- [ ] El conteo de estudiantes se deriva de `COUNT(*)`, no de una columna
- [ ] Todas las rutas (salvo login/register) exigen `Authorization: Bearer <token>`
