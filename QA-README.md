# QA Report - Lumora

## Login & Registration Flow
✅ Verified end-to-end: valid/invalid credentials, correct role assignment,
redirection to home based on role, session cleanup on logout, error handling.
No bugs found.

## Role-Based Navigation & Router Guards
✅ Verified: nav bar, protected routes, and views behave correctly per role
(student/tutor). Router guards working as expected. No inconsistencies
with Figma design.

## Access Control & Protected Routes
✅ Verified: students blocked from /tutor routes (403), tutors blocked from
previewing other tutors' courses (403), unauthorized course access blocked
(403), private courses hidden without access code, unknown routes show 404,
logout clears session correctly. No high-priority gaps found.

## Voice Assistant (in progress)
✅ Mic icon opens/closes bar correctly, only in course view
✅ Playback controls (play/pause/stop/speed) working
⚠️ Bug: AI Summarization agent currently only returns a greeting instead of
an actual summary
⏳ Pending: TTS Markdown stripping, auto-stop on page leave, fallback
behavior, API key exposure check, no-SpeechSynthesis fallback
