# 🤖 Lumora — LumiVoice Agent

Small Express service that turns a lesson into a short summary using Google
Gemini. It is the only AI component in Lumora, and it is deliberately isolated
from the main backend: it holds no database connection and no user state.

```
Frontend  →  POST /summary  →  Gemini  →  summary text  →  read aloud
```

The speech itself does **not** happen here. Text-to-speech runs entirely in the
browser with the native SpeechSynthesis API. This service only produces the
text to be read.

That separation matters for a reason worth knowing: because summarising is a
plain HTTP request and speaking is a browser capability, the two fail
independently. A device can receive a summary perfectly and still not speak it,
which is exactly what happened on some Android phones during testing.
## Features

- AI-powered lesson summarization
- Google Gemini integration
- REST API built with Express.js
- Frontend integration support
- JSON request/response
- Ready for Text-to-Speech integration

---

## Tech Stack

- Node.js
- Express.js
- Google Gemini API
- dotenv
- CORS


---

## 📁 Structure

```
agent/
├── server.js          # Express app, CORS, route mounting
├── routes/
│   └── summary.js     # POST /summary
└── services/
    └── gemini.js          # Gemini client and prompt
```

---

## 🔌 Endpoint

### `POST /summary`

**Body:**
```json
{
  "text": "Plain text of the lesson",
  "apiKey": "optional user-provided Gemini key"
}
```

**200:**
```json
{ "summary": "A short spoken-friendly summary." }
```

The `apiKey` field is optional. When present it takes priority over the server
key; when absent the service uses `GEMINI_API_KEY` from the environment.

That dual path exists so a key can be swapped from the interface when it
expires, without a redeploy. The user pastes it in the LumiVoice settings panel
and it is stored only in their browser's localStorage.

---

## 🔑 Environment variables

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | recommended | Default key. Without it, only users who paste their own key can summarise |
| `PORT` | no | Defaults to 3001. Render injects its own |

Get a key at `aistudio.google.com/apikey`.

---

## 🚀 Running locally

```bash
cd agent
npm install
# create .env with GEMINI_API_KEY and PORT=3001
npm run dev        # http://localhost:3001
```

> The frontend reaches it through `VITE_AGENT_URL`, which falls back to
>`http://localhost:3001` when unset.
---


## Installation

Navigate to the Agent folder:

```bash
cd agent
```

Install all dependencies:

```bash
npm install
```

---

## Environment Setup

Create a file named **.env** inside the **agent** folder.

Add the following variables:

```env
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
PORT=3001
```

---

## Run the Agent

Start the development server:

```bash
npm run dev
```

Or run the application normally:

```bash
npm start
```

The Agent will be running at:

```text
http://localhost:3001
```

---

## API Endpoint (example)

### Generate Lesson Summary

**POST**

```text
/summary
```

### Request Body

```json
{
  "text": "Artificial Intelligence is transforming education by helping students learn more efficiently."
}
```

### Successful Response

```json
{
  "summary": "Artificial Intelligence helps students learn more efficiently by providing intelligent educational support."
}
```

---

## How It Works

```text
Frontend
     │
     ▼
POST /summary
     │
     ▼
Lumora AI Agent
     │
     ▼
Google Gemini API
     │
     ▼
AI Generated Summary
     │
     ▼
Frontend
     │
     ▼
Text-to-Speech
```

---

## Testing

Once the server is running, you can test the endpoint using Thunder Client or Postman.

**POST**

```text
http://localhost:3001/summary
```

Body:

```json
{
  "text": "Your lesson content here."
}
```

Expected response:

```json
{
  "summary": "AI-generated summary..."
}
```

---

## 🐛 Troubleshooting

> **The summary button spins and then reads the original text** — that is the
designed fallback. The summary failed, so LumiVoice reads the lesson instead of
showing an error. Check the agent logs for the real cause.

> **`injected env (0) from .env` in the deployment logs** — normal on Render,
where variables come from the panel rather than a file. It does not mean the
key is missing, but if summarising fails, verify `GEMINI_API_KEY` is set there.

> **Model errors after some time** — Gemini model names get deprecated. Check the
model string in the service against Google's current available models.
---
# Authors

Developed for the **Lumora** educational platform as part of the **RIWI Integrative Project**.

