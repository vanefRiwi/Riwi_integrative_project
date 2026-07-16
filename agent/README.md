# LumiVoice Agent

The **LumiVoice Agent** is a lightweight backend service responsible for handling all AI-related operations for the Lumora platform.

Its primary purpose is to act as a **secure proxy** between the frontend and the AI provider (Google Gemini). This architecture ensures that API keys and AI logic are never exposed to the browser.

## Purpose

The agent exists for one specific reason:

- Keep the AI API key secure.
- Receive lesson content from the frontend.
- Request a summary from Gemini.
- Return the generated summary to the frontend.

The frontend is responsible for displaying the UI and reading the text aloud using the browser's native **SpeechSynthesis API**. The agent only handles AI summarization.

## Architecture

```text
Frontend
    │
    │ POST /summary
    ▼
LumiVoice Agent
    │
    ▼
Google Gemini API
    │
    ▼
Summary
    │
    ▼
Frontend
    │
    ▼
SpeechSynthesis
```

## Responsibilities

The agent is intentionally simple and focused.

It is responsible for:

- Receiving lesson content from the frontend.
- Communicating with the Gemini API.
- Returning concise educational summaries.
- Keeping the API key secure.
- Providing a clean API for the frontend.

It is **not** responsible for:

- Reading text aloud.
- Managing UI state.
- Handling user authentication.
- Storing conversations.
- Acting as a chatbot.
- Answering arbitrary questions.

## Endpoint

### POST `/summary`

Request

```json
{
  "text": "Lesson content in Markdown format."
}
```

Response

```json
{
  "summary": "A concise educational summary of the lesson."
}
```

## Fallback Behavior

If the AI service is unavailable or fails to generate a summary, the frontend automatically falls back to reading the original lesson content. This guarantees that the voice assistant continues working even if the AI is temporarily unavailable.

## Technologies

- Node.js
- Express
- Google Gemini API
- dotenv
- CORS

## Project Goal

The LumiVoice Agent follows the project's architecture by separating AI functionality from the frontend. This improves security, maintainability, and scalability while keeping the frontend free of sensitive credentials.