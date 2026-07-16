# 📄 API Contract — LumORA

Contrato acordado entre **frontend** y **backend**. El frontend ya está construido esperando **exactamente** estas respuestas. Si el backend respeta este contrato, la integración no requiere refactorizar ninguna vista.

> **Formato general:** todas las respuestas son JSON. Los errores devuelven
> `{ "ok": false, "message": "..." }` con el status HTTP correspondiente.

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
**401:** credenciales inválidas.

### `POST /api/auth/register`
**Body:** `{ "full_name", "email", "password", "role": "student"|"tutor", "learning_goal" }`
**201:** misma forma que login (`token` + `user`).

> ⚠️ `user.id` y `user.role` son **obligatorios**: el frontend los usa para el enrutamiento por rol y para filtrar los cursos del tutor.

---

## 📚 Courses

### `GET /api/courses`
Catálogo del student. **El backend debe filtrar**: devolver solo cursos con `visibility = "open"`, más aquellos con `"code"` en los que el usuario ya esté inscrito.

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
Cursos del tutor autenticado. **El backend filtra por el `tutor_id` del token.** Nunca devolver cursos ajenos.

### `GET /api/courses/:id` → un curso (misma forma).

### `POST /api/courses` *(solo rol tutor)*
Crea un curso. El backend asigna `tutor_id` desde el token (**no** confiar en el body).
Si `visibility = "code"`, el backend **genera** el `course_code`.

### `PUT /api/courses/:id` *(solo el tutor dueño)*
**403** si `course.tutor_id !== token.user.id`.
⚠️ **El `course_code` es inmutable**: si ya existe, no debe sobrescribirse nunca.

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

## 📦 Contents  ⭐ (el más importante)

### `GET /api/sections/:id/contents`
Devuelve los contenidos **ordenados por `orden`**.

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

**El campo `datos` cambia de significado según `tipo`:**

| `tipo` | Contenido de `datos` |
|--------|----------------------|
| `readme` | Texto en **Markdown** |
| `youtube` | **ID** del video (ej. `dQw4w9WgXcQ`) o URL completa |
| `canva` | URL de **embed** (`https://www.canva.com/design/.../view?embed`) |

> El frontend decide automáticamente qué componente renderizar según `tipo`
> (ver `components/contentRenderer.js`). Para agregar un tipo nuevo, solo hay
> que registrarlo en el mapa `RENDERERS` — ninguna vista cambia.

### `POST /api/sections/:id/contents` · `PUT /api/contents/:id` · `DELETE /api/contents/:id`

---

## 🎓 Enrollments

### `GET /api/enrollments` → cursos del student autenticado.
### `POST /api/enrollments`
**Body:** `{ "course_id": 1, "code": "EDU-A3K9" }`
El `code` es obligatorio **solo** si el curso es privado. **400** si el código no coincide.
### `DELETE /api/enrollments/:courseId` → salirse del curso.

---

## ✅ Reglas de negocio (deben validarse en el SERVIDOR)

El frontend ya las aplica, pero **eso es solo control de interfaz, no seguridad**. Cualquiera puede llamar la API directamente desde la consola.

1. **Un student solo ve cursos `open`** (los `code` requieren el código correcto).
2. **Un student NO puede crear cursos**, solo unirse → `POST /api/courses` debe devolver **403** si el rol no es `tutor`.
3. **Un tutor solo ve y edita SUS cursos** → filtrar por `tutor_id` del token; **403** al editar uno ajeno.

---

## 🔑 Autenticación

Todas las rutas (excepto login/register) esperan:
```
Authorization: Bearer <token>
```
El frontend ya lo envía automáticamente (`helpers/api.js`).

---

## 📌 Notas para el backend dev

- **Nombres de campo en español** para contenidos (`titulo`, `tipo`, `datos`, `orden`) y en inglés para el resto. Es lo acordado; el frontend ya está escrito así.
- Devolver siempre **arrays** (no objetos con wrapper) en los `GET` de listas, o ajustar `helpers/api.js`.
- Los `id` son numéricos.
- Fechas en ISO 8601 si se agregan.
