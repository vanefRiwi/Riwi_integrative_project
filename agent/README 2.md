# Lumora AI Agent

A tiny Express proxy whose only job is to hold the AI API key and return a
short summary of a lesson for the voice assistant. See the full guide at
the repository root: `AI_SUMMARIZE_README.md`.

Quick start:

    cd agent
    npm install
    cp .env.example .env      # AI_PROVIDER=mock works with no key
    npm run dev               # http://localhost:4000

Endpoint:

    POST /summarize   body: { "text": "..." }   ->   { "ok": true, "summary": "..." }
    GET  /health      ->   { "ok": true, "provider": "mock" }
