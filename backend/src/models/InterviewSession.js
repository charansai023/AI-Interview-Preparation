const mongoose = require("mongoose");

/**
 * One evaluated question-and-answer exchange within a session.
 */
const questionAndAnswerSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    userTranscript: {
      type: String,
      required: true,
      trim: true,
    },
    aiScore: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    feedback: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

/**
 * A single mock interview session, holding one or more evaluated
 * question/answer exchanges plus an overall performance score.
 */
const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    jobRole: {
      type: String,
      required: true,
      trim: true,
    },
    dateTime: {
      type: Date,
      default: Date.now,
    },
    questionsAndAnswers: {
      type: [questionAndAnswerSchema],
      default: [],
    },
    overallPerformanceScore: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
  },
  {
    // Adds createdAt/updatedAt in addition to the explicit `dateTime`,
    // useful for auditing without changing the field the app relies on.
    timestamps: true,
  }
);

interviewSessionSchema.index({ userId: 1, dateTime: -1 });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
