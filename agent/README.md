## AI Lesson Summarization

Lumora now supports AI-powered lesson summarization through the Agent service.

### Architecture

Frontend
↓
Agent (Express)
↓
Google Gemini API
↓
AI Summary
↓
Frontend
↓
Text-to-Speech

### Features

- Generate concise lesson summaries.
- Read AI-generated summaries aloud.
- Automatic fallback to the original lesson if the AI service is unavailable.
- Clean separation between the frontend and AI backend.

### Endpoint

POST /summary

Request

```json
{
  "text": "Lesson content..."
}
```

Response

```json
{
  "summary": "AI generated summary..."
}
```