Smart AI Interview Prep Dashboard

A full-stack mock interview tool:

frontend/ - React + Vite + Tailwind dashboard. Records your spoken answer with the browser's native Web Speech API, shows a live transcript, and displays AI feedback. Includes role-specific question pools, grouped multi-question practice sessions, a session history browser, and a dark/light theme toggle.
backend/ - Express + Mongoose + Gemini (gemini-2.5-flash-lite) API that scores answers with the STAR method, calibrated to the candidate's job role, and stores every session in MongoDB.
Quick start

You need two terminals (one per app) and a MongoDB instance (local or Atlas).

1. Backend
bash
cd backend
npm install
cp .env.example .env
# edit .env:
#   GEMINI_API_KEY -> from https://aistudio.google.com/apikey
#   MONGODB_URI    -> e.g. mongodb://127.0.0.1:27017/interview-prep
#   CORS_ORIGIN    -> e.g. http://localhost:3000 (defaults to * if unset)
npm start

Runs on http://localhost:5000 by default. It refuses to boot if GEMINI_API_KEY or MONGODB_URI is missing, so you'll know right away if something's not configured.

2. Frontend
bash
cd frontend
npm install
cp .env.example .env
# edit .env if your backend runs somewhere other than localhost:5000
npm run dev

Runs on http://localhost:3000. Open it in Chrome or Edge - the Web Speech API (live transcription) isn't supported in Firefox, and it requires a secure context (localhost is fine; a non-HTTPS remote host is not).

How it fits together
Pick a job role (Software Engineer, Backend Engineer, Frontend Engineer, Data Analyst, Data Scientist, or Product Manager) and see a question pulled from that role's own question pool. Not feeling it? Skip to another one from the same pool at any time.
Click the mic - the browser asks for microphone permission, then starts transcribing your speech live into the transcript box. This also quietly starts a practice session on the backend (POST /api/sessions) the first time you record in a sitting.
Stop (or let the 2-minute timer run out) to submit. The frontend sends { userId, sessionId, questionAsked, userTranscript } to POST /api/evaluate-answer.
The backend looks up the session (so every question in it is graded against the same role), asks Gemini to score the answer via the STAR method with role-aware criteria, appends the result to that session's InterviewSession document in MongoDB, recomputes the session's running average score, and returns the evaluation.
The dashboard shows the AI score, strengths, areas to improve, and an example of a stronger answer for that role - then you can answer another question in the same session, or hit Finish session to save it and see it reflected in the sidebar's history and stats (GET /api/sessions).
Any past, finished session can be reopened from the sidebar (GET /api/sessions/:id) to review every question, answer, and piece of feedback in it.

A userId is generated once per browser (stored in localStorage) since there's no login system yet - every session from that browser is grouped under that id. Your dark/light theme preference is remembered the same way.

Deploying it

The frontend deploys cleanly to Vercel (root directory frontend, Vite preset, VITE_API_BASE_URL env var pointing at your backend) and the backend to Render (root directory backend, npm start, GEMINI_API_KEY + MONGODB_URI env vars, plus CORS_ORIGIN set to your Vercel URL once you have it). MongoDB Atlas works well as the hosted database in that setup.

Where this is headed

The project works end-to-end today, and here's what would make it even better next:

Real authentication - swapping the current per-browser userId for actual accounts, so history follows a person rather than a device.
Pagination on session history - the sidebar currently shows the most recent 20 sessions; adding "load more" would let long-time users see everything.
Custom question sets - letting users add their own interview questions on top of the built-in role-based pools.
Progress tracking over time - charting score trends across sessions per role, so improvement is visible at a glance.

See each app's own README.md (frontend/README.md and backend/README.md) for endpoint details and env variables.
