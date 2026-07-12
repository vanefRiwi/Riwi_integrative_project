# Lumora — Proyecto Integrador (LMS)

Plataforma de cursos con dos roles: **student** y **tutor**.

- **Frontend**: SPA en Vanilla JS + Vite, router propio con **History API** y Tailwind CSS v4 (build real, no CDN).
- **Backend**: Node + Express.
- **Base de datos**: PostgreSQL en Docker, conectable desde DBeaver.

> Estado actual: estructura completa con archivos nombrados (vacíos) para que el
> equipo los vaya implementando. **Solo el inicio de sesión está implementado**
> (frontend fiel al diseño + la ruta `POST /api/auth/login` en el backend).

## 1. Base de datos

```bash
docker compose up -d
```

Conexión en DBeaver:

| Campo    | Valor       |
|----------|-------------|
| Host     | localhost   |
| Puerto   | **5433**    |
| Database | learnhub    |
| Usuario  | postgres    |
| Password | postgres123 |

## 2. Backend

```bash
cd backend
npm install
npm run dev        # http://localhost:3000
```

## 3. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

## Probar el login

Usuarios de prueba (ya insertados por `database/init.sql`), contraseña `password123`:

- Student → `jordan.kim@example.com`
- Tutor → `alex.rivera@example.com`
- Tutor → `elena.vasquez@example.com`

Al iniciar sesión, el backend valida las credenciales y devuelve un JWT + el
usuario; el frontend guarda la sesión y redirige a `/student` o `/tutor` según el rol
(esas vistas aún están vacías, listas para implementarse).
