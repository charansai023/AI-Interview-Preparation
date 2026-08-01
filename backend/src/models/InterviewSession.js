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
      min: 0,
      max: 10,
      default: 0,
    },
    // A session is created when the user starts their first question and
    // stays open (completed: false) while they keep answering more
    // questions in the same sitting. It's marked complete when they
    // deliberately finish, so abandoned/in-progress sessions don't clutter
    // history.
    completed: {
      type: Boolean,
      default: false,
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
