const express = require("express");
const InterviewSession = require("../models/InterviewSession");

const router = express.Router();

/**
 * GET /api/sessions?userId=<id>
 *
 * Returns aggregate stats and a recent-history list for the sidebar:
 * { totalInterviews, averageScore, history: [{ id, jobRole, question, score, date }] }
 */
router.get("/sessions", async (req, res) => {
  const { userId } = req.query;

  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ error: "`userId` query parameter is required." });
  }

  try {
    const sessions = await InterviewSession.find({ userId: userId.trim() })
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
      question: s.questionsAndAnswers[0]?.question || "",
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
 * Returns the full detail for one past session so the frontend can let
 * the user reopen a previous question/answer/evaluation:
 * { id, jobRole, date, question, userTranscript, score, feedback: [string] }
 *
 * `userId` is required and must match the session's owner - this prevents
 * one user from viewing another user's session just by guessing an id.
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

    const qa = session.questionsAndAnswers[0] || {};

    return res.status(200).json({
      id: session._id,
      jobRole: session.jobRole,
      date: session.dateTime,
      question: qa.question || "",
      userTranscript: qa.userTranscript || "",
      score: qa.aiScore,
      feedback: qa.feedback || [],
    });
  } catch (err) {
    // Includes CastError for a malformed id - either way, "not found" is
    // the right response rather than a 500.
    console.error("[sessions] Failed to fetch session detail:", err.message);
    return res.status(404).json({ error: "Session not found." });
  }
});

module.exports = router;
