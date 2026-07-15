# 🌌 Lumora — Integrator Project (Category: Education)

Initial mockup for the interactive platform featuring a modular domain-oriented architecture support for two main roles: `student` and `tutor`.

* **Frontend:** Single Page Application (SPA) built with Vanilla JS + Vite, a custom router based on the History API, and styling with Tailwind CSS v4.
* **Backend:** REST API in Node.js + Express structured under the layered architecture pattern (`Routes -> Controllers -> Services -> Repositories`).
* **Database:** PostgreSQL 17 containerized in Docker, persisted via volumes, and manageable from DBeaver or pgAdmin.

---

## 🛠️ Prerequisites

Before initializing the project, ensure you have the following installed on your local system:
1. **Node.js** (LTS version v20 or higher recommended).
2. **Docker & Docker Compose**.
3. A database client (e.g., **DBeaver**).

---

## 🚀 Local environment initialization guide

Follow this strict sequence of steps to spin up the entire Lumora architecture on your machine:

### 1. Database (Docker)
From the project root, run the following command to download the lightweight image and initialize the container in the background:
```bash
docker-compose up -d
```

#### 🔌 Connection parameters in DBeaver:

| Field | Value |
| :--- | :--- |
| **Host** | `localhost` |
| **Port** | `5433` |
| **Database** | `lumora_db` |
| **Username** | `postgres` |
| **Password** | `postgres123` |

The initialization script (`database/init.sql`) will execute automatically the first time, building the `users` table and injecting the test seeds.

### 2. Backend layer (Node.js + Express)
Navigate to the server folder to configure the environment variables and initialize the API:
```bash
cd backend
# 1. Copy the environment variables template and configure it locally
cp .env.example .env
# 2. Install server dependencies
npm install
# 3. Start the backend in Watch mode (Safe Boot via Pool)
npm run dev
```
The API will run at: `http://localhost:3000`

> 🛡️ **Fail-Fast pattern activated:** The Express server includes a safe boot validator connected by Pool. If your Docker container is down or the `.env` variables are misconfigured, the backend will stop execution immediately to prevent zombie states.

### 3. Frontend layer (Vite)
Open another tab in your terminal and spin up the user interface:
```bash
cd frontend
npm install
npm run dev
```
The web interface will be available at: `http://localhost:5173`

---

## 🔑 Test credentials for access control (Login)

To test the end-to-end (E2E) authentication flow with the physical database, use the following pre-loaded accounts in the system (General password: `password123`):

* **Student Role 🎓:** `jordan.kim@example.com` | Goal: *Career change*
* **Tutor Role 👨‍🏫:** `alex.rivera@example.com` | Goal: *Teaching*

Upon successful login, the backend will validate the credentials against PostgreSQL, sign a secure **JWT** token, and return it to the frontend. The SPA will save the session state and dynamically redirect to `/student` or `/tutor` based on the verified role.