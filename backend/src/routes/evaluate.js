const express = require("express");
const { evaluateAnswer } = require("../services/geminiService");
const { validateEvaluateRequest } = require("../middleware/validateEvaluateRequest");
const InterviewSession = require("../models/InterviewSession");

const router = express.Router();

router.post("/evaluate-answer", validateEvaluateRequest, async (req, res) => {
  const { userId, sessionId, questionAsked, userTranscript } = req.body;

  // 1. Look up the session this question belongs to. jobRole is derived
  // from here (not accepted from the client) so every question in a
  // grouped session is guaranteed to be evaluated against the same role.
  let session;
  try {
    session = await InterviewSession.findById(sessionId);
  } catch (err) {
    // Covers a malformed id (CastError) the same way as "not found".
    return res.status(404).json({ error: "Session not found. Start a new practice session." });
  }

  if (!session || session.userId !== userId) {
    return res.status(404).json({ error: "Session not found. Start a new practice session." });
  }

  if (session.completed) {
    return res.status(400).json({ error: "This session has already been finished." });
  }

  // 2. Get the evaluation from Gemini.
  let evaluation;
  try {
    evaluation = await evaluateAnswer({ jobRole: session.jobRole, questionAsked, userTranscript });
  } catch (err) {
    console.error("[evaluate-answer] Gemini evaluation failed:", err.type || err.message);

    if (err.type === "GEMINI_INVALID_JSON" || err.type === "GEMINI_INVALID_SHAPE") {
      return res.status(502).json({
        error: "The AI evaluator returned an unexpected response. Please try again.",
      });
    }

    return res.status(502).json({
      error: "Couldn't reach the AI evaluator right now. Please try again shortly.",
    });
  }

  // 3. Append this Q&A to the session and recompute the running average
  // score across every question answered in it so far, then save -
  // all before responding, per the original requirement.
  try {
    session.questionsAndAnswers.push({
      question: questionAsked,
      userTranscript,
      aiScore: evaluation.score,
      feedback: [
        ...evaluation.strengths.map((s) => `Strength: ${s}`),
        ...evaluation.weaknesses.map((w) => `Weakness: ${w}`),
      ],
    });

    const scores = session.questionsAndAnswers.map((qa) => qa.aiScore);
    session.overallPerformanceScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    await session.save();
  } catch (dbErr) {
    // The evaluation itself succeeded and the candidate is waiting on
    // feedback, so a storage hiccup shouldn't block the response - it's
    // logged for follow-up instead of failing the whole request.
    console.error("[evaluate-answer] Failed to save InterviewSession:", dbErr.message);
  }

  // 4. Send the evaluation back to the dashboard, plus how many
  // questions have been answered in this session so far.
  return res.status(200).json({
    ...evaluation,
    questionsAnswered: session.questionsAndAnswers.length,
  });
});

module.exports = router;
