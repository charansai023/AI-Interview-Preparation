# Interview Prep Backend

Express server that evaluates a candidate's transcribed interview answer using
Gemini (`gemini-2.5-flash`) and the STAR method.

## Setup

```bash
npm install
cp .env.example .env
# then edit .env and set:
#  - GEMINI_API_KEY  -> from https://aistudio.google.com/apikey
#  - MONGODB_URI     -> a local MongoDB instance or an Atlas connection string
```

The server won't boot if either `GEMINI_API_KEY` or `MONGODB_URI` is missing -
it fails fast with a clear message rather than starting in a broken state.

## Run

```bash
npm start        # production
npm run dev      # auto-restarts on file changes (Node 18+)
```

Server boots on `http://localhost:5000` by default (override with `PORT` in `.env`).

## Endpoint

### `POST /api/evaluate-answer`

**Request body**

```json
{
  "userId": "user_123",
  "jobRole": "Senior Backend Engineer",
  "questionAsked": "Tell me about a time you solved a complex technical bug.",
  "userTranscript": "So last year I was working on a payments service that started silently dropping webhook events..."
}
```

`userId` is optional for now (no auth system exists yet) and defaults to
`"anonymous-user"` if omitted.

**Response (200)**

```json
{
  "score": 8.2,
  "strengths": [
    "Clear, structured narrative that follows a logical debugging arc",
    "Concrete technical detail builds credibility"
  ],
  "weaknesses": [
    "Doesn't quantify the production impact",
    "No mention of how stakeholders were kept informed"
  ],
  "idealAnswerSnippet": "In a payments service handling ~50k events/day, I noticed a 2% webhook drop rate..."
}
```

**Error responses**

| Status | Meaning |
|--------|---------|
| 400 | Missing or invalid `jobRole`, `questionAsked`, or `userTranscript` |
| 429 | Rate limit exceeded (30 requests / 15 min per client) |
| 502 | Gemini call failed, or returned malformed/unparseable JSON |
| 500 | Unexpected server error |

## Try it

```bash
curl -X POST http://localhost:5000/api/evaluate-answer \
  -H "Content-Type: application/json" \
  -d '{
    "jobRole": "Senior Backend Engineer",
    "questionAsked": "Tell me about a time you solved a complex technical bug.",
    "userTranscript": "I once tracked down a race condition in a queue consumer using distributed tracing and fixed it with idempotency keys."
  }'
```

## Database

Every successful evaluation is saved to MongoDB via Mongoose **before** the
response is sent back to the frontend, using the `InterviewSession` model
(`src/models/InterviewSession.js`):

```js
{
  userId: String,
  jobRole: String,
  dateTime: Date,
  questionsAndAnswers: [
    {
      question: String,
      userTranscript: String,
      aiScore: Number,       // 1-10
      feedback: [String],    // "Strength: ..." / "Weakness: ..." entries
    }
  ],
  overallPerformanceScore: Number, // 1-10
}
```

Each call to `/api/evaluate-answer` currently represents a single
question/answer exchange, so it's stored as a one-entry
`questionsAndAnswers` array with that question's score doubling as the
session's `overallPerformanceScore`. If a future version groups multiple
questions into one sitting, `overallPerformanceScore` should become an
average across that session's entries instead.

If the database write fails, the error is logged but the response to the
candidate still goes through - a storage hiccup shouldn't block feedback
someone is actively waiting on.

## Notes on security

- `GEMINI_API_KEY` is only ever read server-side from `process.env`; it is
  never sent to or exposed in the frontend.
- `helmet` sets sensible security headers, `cors` restricts allowed origins
  via `CORS_ORIGIN`, and `express-rate-limit` throttles the evaluation
  endpoint to control cost and abuse.
- Request bodies are validated and length-capped before ever reaching Gemini.
- The server refuses to boot if `GEMINI_API_KEY` isn't set, instead of
  silently failing on the first request.
