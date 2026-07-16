# 🔐 Códigos de acceso a cursos privados — Propuesta

Documento de diseño del sistema de **códigos de curso** en LumORA: cómo se generan, cómo se guardan y por qué son **inmutables**.

El frontend ya está implementado siguiendo esta propuesta; el backend debe respetarla para que la integración no requiera cambios en la interfaz.

---

## 🎯 El problema

Un tutor puede crear dos tipos de curso:

| Visibilidad | Comportamiento |
|-------------|----------------|
| **`open`** | Cualquier estudiante lo ve en el catálogo y puede unirse libremente. |
| **`code`** | El curso **no aparece** en el catálogo. Solo se accede escribiendo un código que el tutor comparte. |

La pregunta es: **¿cuándo se genera ese código, y puede cambiar?**

---

## ✅ Decisión de diseño: generación única e inmutable

> El código se genera **una sola vez**, en el momento en que el tutor marca el curso como privado. A partir de ahí **queda bloqueado y no puede cambiarse ni regenerarse**.

### Por qué inmutable

Esta es la decisión más importante del sistema, y responde a un problema real:

Un tutor comparte `EDU-A3K9` con sus 40 estudiantes por WhatsApp. Si más tarde el código pudiera regenerarse, todos los que aún no se han inscrito **quedarían fuera** con un código que ya no sirve, sin saber por qué. El tutor tendría que volver a avisar a todos.

Un código permanente evita esa clase entera de problemas. Es un identificador estable del curso, no una contraseña rotatoria.

### Aclaración importante: es de **uso múltiple**, no de un solo uso

El código **no se consume**. Un mismo código sirve para que **todos** los estudiantes del curso se inscriban, tantas veces como haga falta.

Lo que es "de una sola vez" es su **creación**, no su uso:

| Concepto | ¿Una sola vez? |
|----------|----------------|
| **Generación del código** | ✅ Sí — se crea una vez y nunca cambia |
| **Uso del código** | ❌ No — lo usan todos los estudiantes del curso |
| **Inscripción por estudiante** | ✅ Sí — cada estudiante solo puede inscribirse una vez |

> Si en el futuro se quisieran códigos de un solo uso (tipo "invitación individual"),
> haría falta una tabla aparte de invitaciones. **No es el caso actual.**

---

## 🔤 Formato del código

```
EDU-XXXX
```

Ejemplo: `EDU-A3K9`, `AWS-7X2M`

**Alfabeto usado:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`

Nótese que se **excluyen deliberadamente** los caracteres ambiguos:
- `I`, `1`, `L` → se confunden entre sí
- `O`, `0` → se confunden entre sí

Esto importa porque el código se comparte de forma verbal o por chat, y se teclea a mano. Un estudiante que confunde un `0` con una `O` no puede entrar, y ni él ni el tutor entienden por qué.

**Espacio de combinaciones:** 32⁴ = **1.048.576** códigos posibles. Suficiente para el alcance del proyecto.

---

## 🔄 Ciclo de vida

```
1. El tutor crea un curso  →  visibility = "open", course_code = null

2. El tutor marca "Require course code"
   ↓
   ¿Ya existe un código?
   ├── NO  → se GENERA (EDU-XXXX) y se bloquea (codeLocked = true)
   └── SÍ  → se REUTILIZA el existente (nunca se regenera)

3. El código se muestra con 🔒 candado + botón "Copy"
   (no es editable)

4. Si el tutor vuelve a "Open to everyone"
   ↓
   El código se CONSERVA guardado (no se borra).
   Si más tarde reactiva la privacidad, recupera EL MISMO código.
```

Este último punto es clave: cambiar de privado → público → privado **no genera un código nuevo**. Los estudiantes que ya lo tenían siguen pudiendo usarlo.

---

## 💾 Modelo de datos

El código vive en la propia tabla `courses`. No necesita tabla aparte, porque es un atributo del curso (1:1).

```sql
CREATE TABLE courses (
    id          SERIAL PRIMARY KEY,
    tutor_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(150) NOT NULL,
    -- ...

    visibility  VARCHAR(10) NOT NULL DEFAULT 'open'
                CHECK (visibility IN ('open', 'code')),

    course_code VARCHAR(10) UNIQUE,   -- ← NULL si nunca fue privado

    created_at  TIMESTAMP DEFAULT NOW(),

    -- Un curso privado DEBE tener código
    CONSTRAINT chk_private_has_code
      CHECK (visibility = 'open' OR course_code IS NOT NULL)
);

-- Búsqueda rápida al validar un código
CREATE INDEX idx_courses_code ON courses(course_code) WHERE course_code IS NOT NULL;
```

**Detalles del esquema:**

El `UNIQUE` en `course_code` garantiza a nivel de base de datos que no haya colisiones — si el generador produjera un duplicado, el INSERT falla y se reintenta.

El `CHECK` obliga a que todo curso privado tenga código. Es imposible tener un curso `visibility='code'` con `course_code=NULL`.

El índice es parcial (`WHERE course_code IS NOT NULL`) porque la mayoría de cursos son públicos y no tienen código: no tiene sentido indexar esos NULLs.

---

## 🔒 Cómo se hace cumplir la inmutabilidad

La inmutabilidad debe protegerse en **tres capas**. La del frontend es solo comodidad; las otras dos son las que de verdad cuentan.

### 1. Frontend (UX)
El campo se muestra bloqueado, con candado y sin opción de editar. Ya implementado en `courseEditorView.js` mediante la bandera `codeLocked`.

### 2. Backend (seguridad real) ⚠️
El endpoint `PUT /api/courses/:id` **nunca debe sobrescribir un `course_code` existente**, sin importar lo que llegue en el body. Un usuario malicioso puede enviar cualquier cosa desde la consola.

```javascript
// En el service de actualización
const existing = await courseRepository.findById(id);

// El código se conserva SIEMPRE si ya existía.
// Solo se genera si el curso pasa a privado por primera vez.
let course_code = existing.course_code;
if (payload.visibility === 'code' && !course_code) {
  course_code = await generateUniqueCode();
}

// ⚠️ Ignorar payload.course_code por completo: el cliente NO lo decide.
await courseRepository.update(id, { ...payload, course_code });
```

### 3. Base de datos (última línea)
Opcionalmente, un trigger que rechace cualquier UPDATE que intente cambiar un código ya asignado:

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

## 🧮 Generación del código en el backend

El código debe generarse **en el servidor**, no en el cliente. Si el frontend lo generara, un usuario podría elegir el suyo.

```javascript
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";  // sin I,O,0,1

function randomCode() {
  const rand = Array.from({ length: 4 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join("");
  return `EDU-${rand}`;
}

// Reintenta si hay colisión (el UNIQUE de la BD la detecta)
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

## 🔌 Endpoints implicados

### `POST /api/enrollments/by-code`
El estudiante se une a un curso privado con su código.

**Body:** `{ "code": "EDU-A3K9" }`

| Respuesta | Cuándo |
|-----------|--------|
| **200** + el curso | Código válido → se crea la inscripción |
| **404** | El código no corresponde a ningún curso |
| **409** | El estudiante ya está inscrito en ese curso |

```json
// 200 OK
{ "ok": true, "course": { "id": 3, "title": "Machine Learning Essentials", ... } }
```

### `GET /api/courses`
Catálogo del estudiante. **El backend debe filtrar**: devolver solo los `visibility = 'open'`, más los `'code'` en los que el estudiante **ya esté inscrito** (para que sigan viéndolos en su lista tras unirse).

> ⚠️ **Nunca** devolver el `course_code` de un curso al que el estudiante no
> pertenece. Sería filtrar la llave de acceso.

---

## ✅ Estado actual en el frontend

Todo lo anterior ya está implementado con datos de prueba:

| Pieza | Archivo |
|-------|---------|
| Generación del código | `data/courses.js` → `generateCourseCode()` |
| Bloqueo tras generar | `views/tutor/courseEditorView.js` → bandera `codeLocked` |
| Preservación al editar | `data/courses.js` → `updateCourse()` |
| Unirse con código | `data/courses.js` → `joinCourseByCode()` |
| Modal de inscripción | `components/joinCourseModal.js` |
| Filtrado de privados | `data/courses.js` → `getOpenCourses()` |

Al conectar el backend, solo hay que reemplazar el cuerpo de esas funciones por las llamadas a la API. **Las vistas no cambian.**

### Cursos de prueba con código

| Curso | Código |
|-------|--------|
| Machine Learning Essentials | `EDU-A3K9` |
| Cloud Architecture AWS | `AWS-7X2M` |

---

## 🚪 Salirse de un curso privado

Cuando un estudiante abandona un curso privado, ocurren tres cosas:

1. **Desaparece de su catálogo.** Un curso `visibility='code'` solo es visible
   para quien está inscrito. Al desinscribirse, deja de verlo — y para volver
   a entrar necesita el código otra vez.
2. **El contador de inscritos baja.** El tutor lo ve reflejado en su home.
3. **Se borra su progreso.** Notas, quizzes y reviews se eliminan. Si vuelve a
   unirse, empieza de cero.

> ⚠️ **Nota de diseño:** el código **sigue siendo válido**. Salirse de un curso
> no invalida el código ni para ese estudiante ni para nadie más. El código
> pertenece al curso, no a la inscripción.

En el backend esto se traduce en:

```sql
-- Al hacer DELETE /api/enrollments/:courseId
DELETE FROM enrollments WHERE student_id = :userId AND course_id = :courseId;
-- Las submissions se borran en cascada (ON DELETE CASCADE)
```

---

## 🧮 Nota sobre el contador de inscritos

El número de estudiantes de un curso es un **valor derivado**, nunca almacenado:

```sql
SELECT COUNT(*) FROM enrollments WHERE course_id = :id;
```

⚠️ **No guardar el conteo como columna en `courses`.** Es la clase de dato que
se desincroniza: si se persiste un valor ya calculado y luego se vuelve a
guardar el curso, el número se infla. El conteo debe derivarse siempre de la
tabla `enrollments`, que es la única fuente de verdad.
