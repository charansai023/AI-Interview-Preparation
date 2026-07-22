# Smart AI Interview Prep Dashboard

A full-stack mock interview tool:

- **`frontend/`** - React + Vite + Tailwind dashboard. Records your spoken
  answer with the browser's native Web Speech API, shows a live transcript,
  and displays AI feedback.
- **`backend/`** - Express + Mongoose + Gemini (`gemini-2.5-flash`) API that
  scores answers with the STAR method and stores every session in MongoDB.

## Quick start

You need two terminals (one per app) and a MongoDB instance (local or
[Atlas](https://www.mongodb.com/atlas)).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env:
#   GEMINI_API_KEY -> from https://aistudio.google.com/apikey
#   MONGODB_URI    -> e.g. mongodb://127.0.0.1:27017/interview-prep
npm start
```

Runs on `http://localhost:5000` by default. It refuses to boot if
`GEMINI_API_KEY` or `MONGODB_URI` is missing, so you'll know right away if
something's not configured.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# edit .env if your backend runs somewhere other than localhost:5000
npm run dev
```

Runs on `http://localhost:3000`. Open it in **Chrome or Edge** - the Web
Speech API (live transcription) isn't supported in Firefox, and it requires
a secure context (localhost is fine; a non-HTTPS remote host is not).

## How it fits together

1. You pick a job role and see a random interview question.
2. Click the mic - the browser asks for microphone permission, then starts
   transcribing your speech live into the transcript box.
3. Stop (or let the 2-minute timer run out) to submit. The frontend sends
   `{ userId, jobRole, questionAsked, userTranscript }` to
   `POST /api/evaluate-answer`.
4. The backend asks Gemini to score the answer via the STAR method, saves
   the result to MongoDB as an `InterviewSession` document, and returns the
   evaluation.
5. The dashboard shows the AI score, strengths, areas to improve, and an
   example of a stronger answer - then refreshes the sidebar stats and
   history from `GET /api/sessions`.

A `userId` is generated once per browser (stored in `localStorage`) since
there's no login system yet - every session from that browser is grouped
under that id.

## What's not built yet

- No authentication - `userId` is just a random, unauthenticated identifier.
- One question per submission (no multi-question sessions grouped together).
- No pagination on session history (currently returns the most recent 20).

See each app's own `README.md` (`frontend/README.md` is this file's sibling
notes live in `backend/README.md`) for endpoint details and env variables.
