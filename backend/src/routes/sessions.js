const express = require("express");
const InterviewSession = require("../models/InterviewSession");

const router = express.Router();

/**
 * POST /api/sessions
 *
 * Starts a new, empty practice session for a grouped multi-question run.
 * The frontend calls this once, right before the first question of a
 * sitting, then reuses the returned sessionId for every subsequent
 * question until the user finishes.
 *
 * Body: { userId, jobRole }
 * Response (201): { sessionId }
 */
router.post("/sessions", async (req, res) => {
  const { userId, jobRole } = req.body || {};

  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "`userId` is required." });
  }
  if (typeof jobRole !== "string" || !jobRole.trim()) {
    return res.status(400).json({ error: "`jobRole` is required." });
  }

  try {
    const session = await InterviewSession.create({
      userId: userId.trim(),
      jobRole: jobRole.trim(),
      dateTime: new Date(),
      questionsAndAnswers: [],
      overallPerformanceScore: 0,
      completed: false,
    });
    return res.status(201).json({ sessionId: session._id });
  } catch (err) {
    console.error("[sessions] Failed to start session:", err.message);
    return res.status(500).json({ error: "Couldn't start a new session." });
  }
});

/**
 * POST /api/sessions/:id/finish
 *
 * Marks a practice session complete so it shows up in history. If the
 * user finishes without ever answering a question, the empty session is
 * deleted instead of being saved as a blank history entry.
 *
 * Body: { userId }
 * Response (200): { id, jobRole, overallPerformanceScore, totalQuestions, date, deleted }
 */
router.post("/sessions/:id/finish", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body || {};

  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "`userId` is required." });
  }

  try {
    const session = await InterviewSession.findById(id);

    if (!session || session.userId !== userId.trim()) {
      return res.status(404).json({ error: "Session not found." });
    }

    if (session.questionsAndAnswers.length === 0) {
      await InterviewSession.findByIdAndDelete(id);
      return res.status(200).json({ id, deleted: true });
    }

    session.completed = true;
    await session.save();

    return res.status(200).json({
      id: session._id,
      jobRole: session.jobRole,
      overallPerformanceScore: session.overallPerformanceScore,
      totalQuestions: session.questionsAndAnswers.length,
      date: session.dateTime,
      deleted: false,
    });
  } catch (err) {
    console.error("[sessions] Failed to finish session:", err.message);
    return res.status(404).json({ error: "Session not found." });
  }
});

/**
 * GET /api/sessions?userId=<id>
 *
 * Returns aggregate stats and a recent-history list of *finished* sessions
 * for the sidebar. In-progress sessions are intentionally excluded so an
 * abandoned or still-open practice run doesn't clutter history.
 *
 * Response: { totalInterviews, averageScore,
 *   history: [{ id, jobRole, totalQuestions, score, date }] }
 */
router.get("/sessions", async (req, res) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "`userId` query parameter is required." });
  }

  try {
    const sessions = await InterviewSession.find({ userId: userId.trim(), completed: true })
      .sort({ dateTime: -1 })
      .lean();

    const totalInterviews = sessions.length;
    const averageScore =
      totalInterviews > 0
        ? sessions.reduce((sum, s) => sum + s.overallPerformanceScore, 0) / totalInterviews
        : 0;

    const history = sessions.slice(0, 20).map((s) => ({
      id: s._id,
      jobRole: s.jobRole,
      totalQuestions: s.questionsAndAnswers.length,
      score: s.overallPerformanceScore,
      date: s.dateTime,
    }));

    return res.status(200).json({ totalInterviews, averageScore, history });
  } catch (err) {
    console.error("[sessions] Failed to fetch history:", err.message);
    return res.status(500).json({ error: "Couldn't load interview history." });
  }
});

/**
 * GET /api/sessions/:id?userId=<id>
 *
 * Returns the full detail for one past session, including every
 * question/answer/evaluation in it, so the frontend can let the user
 * reopen and review a whole grouped practice run.
 *
 * `userId` is required and must match the session's owner - this prevents
 * one user from viewing another user's session just by guessing an id.
 *
 * Response: { id, jobRole, date, completed, overallPerformanceScore,
 *   questionsAndAnswers: [{ question, userTranscript, score, feedback }] }
 */
router.get("/sessions/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "`userId` query parameter is required." });
  }

  try {
    const session = await InterviewSession.findById(id).lean();

    if (!session || session.userId !== userId.trim()) {
      // Same response whether it doesn't exist or belongs to someone else,
      // so we don't leak which case it is.
      return res.status(404).json({ error: "Session not found." });
    }

    return res.status(200).json({
      id: session._id,
      jobRole: session.jobRole,
      date: session.dateTime,
      completed: session.completed,
      overallPerformanceScore: session.overallPerformanceScore,
      questionsAndAnswers: session.questionsAndAnswers.map((qa) => ({
        question: qa.question,
        userTranscript: qa.userTranscript,
        score: qa.aiScore,
        feedback: qa.feedback || [],
      })),
    });
  } catch (err) {
    // Includes CastError for a malformed id - either way, "not found" is
    // the right response rather than a 500.
    console.error("[sessions] Failed to fetch session detail:", err.message);
    return res.status(404).json({ error: "Session not found." });
  }
});

module.exports = router;
