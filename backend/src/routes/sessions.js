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

module.exports = router;
