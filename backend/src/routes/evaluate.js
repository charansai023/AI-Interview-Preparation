const express = require("express");
const { evaluateAnswer } = require("../services/geminiService");
const { validateEvaluateRequest } = require("../middleware/validateEvaluateRequest");
const InterviewSession = require("../models/InterviewSession");

const router = express.Router();

router.post("/evaluate-answer", validateEvaluateRequest, async (req, res) => {
  const { userId, jobRole, questionAsked, userTranscript } = req.body;

  // 1. Get the evaluation from Gemini.
  let evaluation;
  try {
    evaluation = await evaluateAnswer({ jobRole, questionAsked, userTranscript });
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

  // 2. Persist the completed evaluation to MongoDB before responding.
  // Each call currently represents a single question/answer exchange,
  // so it's stored as a one-entry session with that question's score
  // as the overall performance score.
  try {
    await InterviewSession.create({
      userId,
      jobRole,
      dateTime: new Date(),
      questionsAndAnswers: [
        {
          question: questionAsked,
          userTranscript,
          aiScore: evaluation.score,
          feedback: [
            ...evaluation.strengths.map((s) => `Strength: ${s}`),
            ...evaluation.weaknesses.map((w) => `Weakness: ${w}`),
          ],
        },
      ],
      overallPerformanceScore: evaluation.score,
    });
  } catch (dbErr) {
    // The evaluation itself succeeded and the candidate is waiting on
    // feedback, so a storage hiccup shouldn't block the response - it's
    // logged for follow-up instead of failing the whole request.
    console.error("[evaluate-answer] Failed to save InterviewSession:", dbErr.message);
  }

  // 3. Send the evaluation back to the dashboard.
  return res.status(200).json(evaluation);
});

module.exports = router;
