import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Square,
  Send,
  History,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  User,
  ChevronRight,
  RotateCcw,
  Radio,
  X,
  Lightbulb,
  Loader2,
  SkipForward,
} from "lucide-react";

/* ---------------------------------------------------------
   Design tokens: "Control Room" aesthetic
   bg-void: #0B0E14   panel: #12161F   panel-raised: #171C27
   line: #232939       accent-signal (indigo): #6C63FF
   accent-warm (amber): #F2A93B     good: #35C88F     warn: #F0654B
--------------------------------------------------------- */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const QUESTION_BANKS = {
  "Software Engineer": [
    "Tell me about a time you solved a complex technical bug. Walk me through your diagnostic process and what you'd do differently.",
    "Describe a situation where you disagreed with a teammate's technical decision. How did you handle it?",
    "Tell me about a project that didn't go as planned. What did you learn from it?",
    "Walk me through how you'd design a system that needs to scale to millions of users.",
    "Describe a time you had to learn a new technology quickly to finish a project.",
    "Tell me about a time you had to give difficult feedback to a colleague.",
  ],
  "Backend Engineer": [
    "Walk me through how you'd design a rate limiter for a public API.",
    "Tell me about a time you diagnosed and fixed a production database performance issue.",
    "Describe how you'd design a system to process millions of asynchronous events reliably.",
    "Tell me about a time a service you owned went down. How did you find the root cause and prevent it from happening again?",
    "How would you design an idempotent payment-processing API?",
    "Describe a time you had to trade off consistency against availability in a distributed system.",
  ],
  "Frontend Engineer": [
    "Tell me about a time you had to optimize a slow-loading web page. What was your approach?",
    "How would you architect state management for a large, complex single-page application?",
    "Describe a time you had to make a UI accessible for users with disabilities.",
    "Tell me about a time you disagreed with a designer's UX decision. How did you resolve it?",
    "How would you approach reducing a JavaScript bundle size that's hurting performance?",
    "Describe a time you had to debug a tricky cross-browser rendering issue.",
  ],
  "Data Analyst": [
    "Tell me about a time your analysis changed a business decision.",
    "Walk me through how you'd investigate a sudden, unexplained drop in a key metric.",
    "Describe a time you had to explain a complex analysis to a non-technical stakeholder.",
    "How would you design a dashboard to track product engagement?",
    "Tell me about a time you found an error in your own analysis after presenting it. What did you do?",
    "How do you decide which metrics matter most for a given business question?",
  ],
  "Data Scientist": [
    "Tell me about a machine learning model you built that didn't perform as expected in production. What did you do?",
    "How would you approach building a model to predict customer churn?",
    "Describe a time you had to communicate a nuanced statistical result to non-technical stakeholders.",
    "Walk me through how you'd evaluate whether a new feature actually improved model performance.",
    "Tell me about a time you had to deal with biased or incomplete training data.",
    "How would you design an A/B test to measure the impact of a new recommendation algorithm?",
  ],
  "Product Manager": [
    "Tell me about a time you had to say no to a stakeholder's feature request. How did you handle it?",
    "Walk me through how you'd prioritize a roadmap with limited engineering resources.",
    "Describe a time a product launch didn't go as planned. What did you learn?",
    "How would you decide whether to build, buy, or partner for a new capability?",
    "Tell me about a time you used data to challenge your own assumption about a feature.",
    "Describe how you'd handle conflicting priorities between engineering, design, and sales.",
  ],
};

const JOB_ROLES = Object.keys(QUESTION_BANKS);

const TOTAL_SECONDS = 120;

function scoreColor(score) {
  if (score >= 8) return "#35C88F";
  if (score >= 6.5) return "#F2A93B";
  return "#F0654B";
}

function pickRandomQuestion(role, excluding) {
  const pool = QUESTION_BANKS[role] || QUESTION_BANKS[JOB_ROLES[0]];
  const filtered = pool.filter((q) => q !== excluding);
  const source = filtered.length > 0 ? filtered : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function getOrCreateUserId() {
  const KEY = "interviewPrepUserId";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch (e) {
    // localStorage can throw in locked-down environments (private mode, etc).
    // Fall back to an in-memory id so the app still works for this session.
    return `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch (e) {
    return "";
  }
}

/* ---------------------------------------------------------
   Toast notifications
--------------------------------------------------------- */

const TOAST_STYLES = {
  error: { border: "#F0654B", icon: AlertCircle, iconColor: "#F0654B" },
  warning: { border: "#F2A93B", icon: AlertTriangle, iconColor: "#F2A93B" },
  info: { border: "#6C63FF", icon: Info, iconColor: "#8B85FF" },
};

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const cfg = TOAST_STYLES[t.type] || TOAST_STYLES.info;
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className="animate-toast bg-[#171C27] border rounded-xl shadow-lg p-3.5 flex items-start gap-2.5"
            style={{ borderColor: cfg.border + "55" }}
          >
            <Icon size={16} style={{ color: cfg.iconColor }} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {t.title && (
                <p className="font-body text-[12.5px] font-semibold text-[#E9EDF4] leading-snug">
                  {t.title}
                </p>
              )}
              <p className="font-body text-[12px] text-[#98A2B3] leading-snug">{t.message}</p>
            </div>
            <button onClick={() => onDismiss(t.id)} className="text-[#5C6470] hover:text-[#98A2B3] shrink-0">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------
   Sidebar (now backed by real /api/sessions data)
--------------------------------------------------------- */

function ProfileSidebar({ loading, error, historyCount, avgScore, history, onRetry }) {
  return (
    <aside className="w-full lg:w-[300px] shrink-0 bg-[#12161F] border border-[#232939] rounded-2xl p-5 flex flex-col gap-6 h-fit lg:sticky lg:top-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#6C63FF]/15 border border-[#6C63FF]/30 flex items-center justify-center">
          <User size={20} className="text-[#8B85FF]" />
        </div>
        <div>
          <p className="font-display font-semibold text-[#E9EDF4] text-sm leading-tight">Candidate</p>
          <p className="font-body text-xs text-[#5C6470]">Session profile</p>
        </div>
      </div>

      <div className="h-px bg-[#232939]" />

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#171C27] border border-[#232939] rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 text-[#5C6470] mb-2">
            <History size={13} />
            <span className="font-body text-[10px] uppercase tracking-wider">Mock Interviews</span>
          </div>
          {loading ? (
            <div className="shimmer h-7 w-10 rounded" />
          ) : (
            <p className="font-mono font-bold text-2xl text-[#E9EDF4]">{historyCount}</p>
          )}
        </div>
        <div className="bg-[#171C27] border border-[#232939] rounded-xl p-3.5">
          <div className="flex items-center gap-1.5 text-[#5C6470] mb-2">
            <TrendingUp size={13} />
            <span className="font-body text-[10px] uppercase tracking-wider">Avg Score</span>
          </div>
          {loading ? (
            <div className="shimmer h-7 w-12 rounded" />
          ) : (
            <p className="font-mono font-bold text-2xl" style={{ color: scoreColor(avgScore) }}>
              {avgScore.toFixed(1)}
              <span className="text-xs text-[#5C6470] font-body font-normal">/10</span>
            </p>
          )}
        </div>
      </div>

      <div className="h-px bg-[#232939]" />

      <div className="flex flex-col gap-2 min-h-0">
        <p className="font-body text-[10px] uppercase tracking-wider text-[#5C6470] mb-1">Past sessions</p>

        {loading && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer h-12 rounded-lg" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-start gap-2 px-1 py-2">
            <p className="font-body text-xs text-[#F0654B]">{error}</p>
            <button
              onClick={onRetry}
              className="font-body text-xs font-medium text-[#98A2B3] hover:text-[#E9EDF4] underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <p className="font-body text-xs text-[#5C6470] italic px-1">
            No sessions yet - finish an interview to see it here.
          </p>
        )}

        {!loading && !error && history.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {history.map((h) => (
              <div
                key={h.id}
                className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg hover:bg-[#171C27] border border-transparent hover:border-[#232939] transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-body text-[13px] text-[#C7CDD6] truncate group-hover:text-[#E9EDF4]">
                    {h.jobRole}
                  </p>
                  <p className="font-mono text-[11px] text-[#5C6470]">{formatDate(h.date)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-xs font-semibold" style={{ color: scoreColor(h.score) }}>
                    {h.score.toFixed(1)}
                  </span>
                  <ChevronRight size={13} className="text-[#5C6470] group-hover:text-[#98A2B3]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------
   Timer ring
--------------------------------------------------------- */

function TimerRing({ secondsLeft }) {
  const pct = secondsLeft / TOTAL_SECONDS;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const low = secondsLeft <= 15;

  return (
    <div className="relative w-[104px] h-[104px] shrink-0">
      <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
        <circle cx="52" cy="52" r={radius} fill="none" stroke="#232939" strokeWidth="6" />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke={low ? "#F0654B" : "#6C63FF"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-mono font-semibold text-lg ${low ? "text-[#F0654B]" : "text-[#E9EDF4]"}`}>
          {mm}:{ss}
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Live transcript
--------------------------------------------------------- */

function LiveTranscript({ finalText, interimText, isRecording, supported }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [finalText, interimText]);

  return (
    <div ref={boxRef} className="bg-[#0E1219] border border-[#232939] rounded-xl p-4 h-[168px] overflow-y-auto">
      <div className="flex items-center gap-2 mb-2.5">
        <Radio size={13} className={isRecording ? "text-[#6C63FF]" : "text-[#5C6470]"} />
        <p className="font-body text-[10px] uppercase tracking-wider text-[#5C6470]">Live transcript</p>
        {isRecording && <span className="font-mono text-[10px] text-[#6C63FF] ml-auto">listening&hellip;</span>}
      </div>
      {finalText || interimText ? (
        <p className="font-body text-[14px] leading-relaxed text-[#C7CDD6]">
          {finalText}
          <span className="text-[#6C63FF]/70">{interimText}</span>
          {isRecording && (
            <span
              className="inline-block w-[2px] h-[15px] bg-[#6C63FF] ml-0.5 align-middle"
              style={{ animation: "blink-caret 1s step-end infinite" }}
            />
          )}
        </p>
      ) : (
        <p className="font-body text-[13px] text-[#5C6470] italic">
          {supported
            ? "Your words will appear here once you start recording\u2026"
            : "Speech recognition isn't supported in this browser, so live transcription is unavailable."}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Evaluation panel
--------------------------------------------------------- */

function SkeletonLine({ w }) {
  return <div className={`shimmer h-3 rounded ${w}`} />;
}

function EvaluationPanel({ visible, loading, result, onReset }) {
  return (
    <div
      className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "max-h-[1100px] opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
      }`}
    >
      <div className="bg-gradient-to-b from-[#161B2A] to-[#12161F] border border-[#2A2F6C]/50 rounded-2xl p-6 animate-rise">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={16} className="text-[#8B85FF]" />
          <h3 className="font-display font-semibold text-[#E9EDF4] text-[15px]">AI Evaluation</h3>
        </div>

        {loading ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="shimmer w-16 h-16 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-2.5">
                <SkeletonLine w="w-1/3" />
                <SkeletonLine w="w-2/3" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2.5">
                <SkeletonLine w="w-1/2" />
                <SkeletonLine w="w-full" />
                <SkeletonLine w="w-5/6" />
                <SkeletonLine w="w-4/6" />
              </div>
              <div className="flex flex-col gap-2.5">
                <SkeletonLine w="w-1/2" />
                <SkeletonLine w="w-full" />
                <SkeletonLine w="w-5/6" />
                <SkeletonLine w="w-4/6" />
              </div>
            </div>
            <SkeletonLine w="w-full" />
          </div>
        ) : (
          result && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full border-2 flex items-center justify-center shrink-0 font-mono font-bold text-xl"
                  style={{ borderColor: scoreColor(result.score), color: scoreColor(result.score) }}
                >
                  {result.score.toFixed(1)}
                </div>
                <div>
                  <p className="font-display font-semibold text-[#E9EDF4] text-sm">
                    {result.score >= 8
                      ? "Strong, well-structured answer"
                      : result.score >= 6.5
                      ? "Solid answer with room to grow"
                      : "Needs more structure and detail"}
                  </p>
                  <p className="font-body text-xs text-[#5C6470]">Scored out of 10 by the AI interviewer</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <CheckCircle2 size={14} className="text-[#35C88F]" />
                    <p className="font-body text-xs font-semibold uppercase tracking-wider text-[#98A2B3]">
                      Strengths
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="font-body text-[13px] text-[#C7CDD6] leading-snug flex gap-2">
                        <span className="text-[#35C88F] mt-1">&bull;</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle size={14} className="text-[#F2A93B]" />
                    <p className="font-body text-xs font-semibold uppercase tracking-wider text-[#98A2B3]">
                      Areas to improve
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {result.weaknesses.map((s, i) => (
                      <li key={i} className="font-body text-[13px] text-[#C7CDD6] leading-snug flex gap-2">
                        <span className="text-[#F2A93B] mt-1">&bull;</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {result.idealAnswerSnippet && (
                <div className="bg-[#0E1219] border border-[#232939] rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb size={14} className="text-[#8B85FF]" />
                    <p className="font-body text-xs font-semibold uppercase tracking-wider text-[#98A2B3]">
                      How you could have framed it
                    </p>
                  </div>
                  <p className="font-body text-[13px] text-[#C7CDD6] leading-relaxed italic">
                    &ldquo;{result.idealAnswerSnippet}&rdquo;
                  </p>
                </div>
              )}

              <button
                onClick={onReset}
                className="self-start flex items-center gap-2 font-body text-xs font-medium text-[#98A2B3] hover:text-[#E9EDF4] border border-[#232939] hover:border-[#2E3547] rounded-lg px-3.5 py-2 transition-colors"
              >
                <RotateCcw size={13} />
                Try another question
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Main dashboard
--------------------------------------------------------- */

let toastId = 0;

export default function App() {
  const [phase, setPhase] = useState("idle"); // idle | recording | submitted-loading | submitted-done
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [toasts, setToasts] = useState([]);
  const [evalResult, setEvalResult] = useState(null);
  const [jobRole, setJobRole] = useState(JOB_ROLES[0]);
  const [currentQuestion, setCurrentQuestion] = useState(() => pickRandomQuestion(JOB_ROLES[0]));

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [historyStats, setHistoryStats] = useState({ totalInterviews: 0, averageScore: 0, history: [] });

  const userIdRef = useRef(null);
  if (userIdRef.current === null) {
    userIdRef.current = getOrCreateUserId();
  }

  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const manualStopRef = useRef(false);
  const finalTranscriptRef = useRef("");

  const speechSupported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const pushToast = useCallback((type, message, title) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions?userId=${encodeURIComponent(userIdRef.current)}`);
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setHistoryStats(data);
    } catch (err) {
      setHistoryError("Couldn't load your interview history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const clearTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const teardownRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch (e) {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      teardownRecognition();
    };
  }, [clearTimer, teardownRecognition]);

  const submitForEvaluation = useCallback(async () => {
    const transcript = finalTranscriptRef.current.trim();

    if (!transcript) {
      setPhase("idle");
      pushToast("warning", "We didn't capture any speech. Record an answer before submitting.", "Nothing to evaluate");
      return;
    }

    setPhase("submitted-loading");

    try {
      const res = await fetch(`${API_BASE_URL}/api/evaluate-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userIdRef.current,
          jobRole,
          questionAsked: currentQuestion,
          userTranscript: transcript,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Evaluation request failed.");
      }

      setEvalResult(data);
      setPhase("submitted-done");
      fetchHistory();
    } catch (err) {
      setPhase("idle");
      pushToast(
        "error",
        err.message || "Couldn't reach the evaluation service. Please try again.",
        "Evaluation failed"
      );
    }
  }, [jobRole, currentQuestion, fetchHistory, pushToast]);

  const handleStopAndSubmit = useCallback(() => {
    manualStopRef.current = true;
    clearTimer();
    teardownRecognition();
    submitForEvaluation();
  }, [clearTimer, teardownRecognition, submitForEvaluation]);

  const startRecording = async () => {
    if (!speechSupported) {
      pushToast("error", "Try the latest Chrome or Edge for live transcription.", "Speech recognition isn't supported here");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      if (err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        pushToast("error", "Allow microphone access in your browser's address bar, then try again.", "Microphone access blocked");
      } else if (err && err.name === "NotFoundError") {
        pushToast("error", "Connect a microphone and try again.", "No microphone found");
      } else {
        pushToast("error", "Couldn't access your microphone. Check your system settings and try again.", "Microphone error");
      }
      return;
    }

    manualStopRef.current = false;
    finalTranscriptRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    setSecondsLeft(TOTAL_SECONDS);
    setEvalResult(null);

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += chunk + " ";
        } else {
          interim += chunk;
        }
      }
      setFinalTranscript(finalTranscriptRef.current);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      switch (event.error) {
        case "no-speech":
          pushToast("warning", "We didn't catch any audio. Keep talking, or stop and try again.", "No speech detected");
          break;
        case "not-allowed":
        case "permission-denied":
          pushToast("error", "Microphone access was blocked, so recording has stopped.", "Microphone access blocked");
          manualStopRef.current = true;
          clearTimer();
          setPhase("idle");
          break;
        case "audio-capture":
          pushToast("error", "No microphone could be found. Recording has stopped.", "No microphone found");
          manualStopRef.current = true;
          clearTimer();
          setPhase("idle");
          break;
        case "network":
          pushToast("error", "A network issue interrupted speech recognition.", "Connection problem");
          break;
        case "aborted":
          break;
        default:
          pushToast("error", "Something went wrong with speech recognition. Please try again.", "Recognition error");
      }
    };

    recognition.onend = () => {
      if (!manualStopRef.current) {
        clearTimer();
        setPhase("idle");
        pushToast("info", "Recording stopped. Tap the mic to start again.", "Recording ended");
      }
    };

    try {
      recognition.start();
    } catch (err) {
      pushToast("error", "Couldn't start speech recognition. Please try again.", "Recognition error");
      return;
    }

    recognitionRef.current = recognition;
    setPhase("recording");

    let s = TOTAL_SECONDS;
    timerRef.current = setInterval(() => {
      s -= 1;
      setSecondsLeft(s);
      if (s <= 0) {
        handleStopAndSubmit();
      }
    }, 1000);
  };

  const reset = () => {
    manualStopRef.current = true;
    clearTimer();
    teardownRecognition();
    setPhase("idle");
    setSecondsLeft(TOTAL_SECONDS);
    setFinalTranscript("");
    setInterimTranscript("");
    setEvalResult(null);
    setCurrentQuestion((prev) => pickRandomQuestion(jobRole, prev));
  };

  const skipQuestion = () => {
    if (isRecording || isEvaluating) return; // don't allow mid-answer or mid-evaluation
    manualStopRef.current = true;
    clearTimer();
    teardownRecognition();
    setSecondsLeft(TOTAL_SECONDS);
    finalTranscriptRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    setEvalResult(null);
    setCurrentQuestion((prev) => pickRandomQuestion(jobRole, prev));
  };

  const handleRoleChange = (newRole) => {
    if (isRecording || isEvaluating) return; // select is disabled in this state anyway, but guard regardless
    manualStopRef.current = true;
    clearTimer();
    teardownRecognition();
    setSecondsLeft(TOTAL_SECONDS);
    finalTranscriptRef.current = "";
    setFinalTranscript("");
    setInterimTranscript("");
    setEvalResult(null);
    setJobRole(newRole);
    setCurrentQuestion(pickRandomQuestion(newRole));
  };

  const isRecording = phase === "recording";
  const isEvaluating = phase === "submitted-loading" || phase === "submitted-done";

  return (
    <div className="min-h-screen w-full bg-[#0B0E14] p-4 md:p-6">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6C63FF] flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-[#E9EDF4] text-base leading-none">Interview Prep</h1>
              <p className="font-body text-[11px] text-[#5C6470] mt-0.5">AI mock interview dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-body text-[11px] text-[#5C6470]" htmlFor="jobRole">
              Role
            </label>
            <select
              id="jobRole"
              value={jobRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={isRecording || isEvaluating}
              className="font-body text-xs bg-[#171C27] border border-[#232939] text-[#C7CDD6] rounded-lg px-2.5 py-1.5 disabled:opacity-50"
            >
              {JOB_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <ProfileSidebar
            loading={historyLoading}
            error={historyError}
            historyCount={historyStats.totalInterviews}
            avgScore={historyStats.averageScore}
            history={historyStats.history}
            onRetry={fetchHistory}
          />

          <main className="flex-1 w-full min-w-0 flex flex-col">
            <div className="bg-[#12161F] border border-[#232939] rounded-2xl p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="font-body text-[10px] uppercase tracking-wider text-[#8B85FF] mb-2">
                    Current question
                  </p>
                  <h2 className="font-display text-[#E9EDF4] text-lg md:text-xl leading-snug">
                    {currentQuestion}
                  </h2>
                </div>
                <button
                  onClick={skipQuestion}
                  disabled={isRecording || isEvaluating}
                  className="shrink-0 flex items-center gap-1.5 font-body text-xs font-medium text-[#98A2B3] hover:text-[#E9EDF4] border border-[#232939] hover:border-[#2E3547] rounded-lg px-3 py-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Skip this question and get a new one"
                >
                  <SkipForward size={13} />
                  Skip
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 justify-center bg-[#0E1219] border border-[#232939] rounded-xl py-6 mb-5">
                <TimerRing secondsLeft={secondsLeft} />

                <div className="relative flex items-center justify-center w-24 h-24">
                  {isRecording && (
                    <>
                      <span
                        className="absolute inset-0 rounded-full bg-[#6C63FF]/40"
                        style={{ animation: "ring-pulse 1.6s ease-out infinite" }}
                      />
                      <span
                        className="absolute inset-0 rounded-full bg-[#6C63FF]/30"
                        style={{ animation: "ring-pulse-slow 1.6s ease-out infinite", animationDelay: "0.4s" }}
                      />
                    </>
                  )}
                  <button
                    onClick={isRecording ? handleStopAndSubmit : startRecording}
                    disabled={isEvaluating}
                    aria-label={isRecording ? "Stop recording" : "Start recording"}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                      isRecording ? "bg-[#F0654B] hover:bg-[#e0553d]" : "bg-[#6C63FF] hover:bg-[#5b52ea]"
                    }`}
                  >
                    {phase === "submitted-loading" ? (
                      <Loader2 size={24} className="text-white animate-spin" />
                    ) : isRecording ? (
                      <Square size={24} className="text-white fill-white" />
                    ) : (
                      <Mic size={26} className="text-white" />
                    )}
                  </button>
                </div>

                <div className="flex flex-col items-center sm:items-start gap-2 min-w-[120px]">
                  <span
                    className={`font-mono text-xs px-2.5 py-1 rounded-full border ${
                      isRecording
                        ? "text-[#F0654B] border-[#F0654B]/40 bg-[#F0654B]/10"
                        : phase === "submitted-loading"
                        ? "text-[#8B85FF] border-[#6C63FF]/40 bg-[#6C63FF]/10"
                        : "text-[#5C6470] border-[#232939]"
                    }`}
                  >
                    {isRecording ? "\u25CF recording" : phase === "submitted-loading" ? "evaluating\u2026" : "ready"}
                  </span>
                  <button
                    onClick={handleStopAndSubmit}
                    disabled={!isRecording}
                    className="flex items-center gap-1.5 font-body text-xs font-medium text-[#98A2B3] hover:text-[#E9EDF4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={12} />
                    Submit answer
                  </button>
                </div>
              </div>

              <LiveTranscript
                finalText={finalTranscript}
                interimText={interimTranscript}
                isRecording={isRecording}
                supported={!!speechSupported}
              />
            </div>

            <EvaluationPanel
              visible={isEvaluating}
              loading={phase === "submitted-loading"}
              result={phase === "submitted-done" ? evalResult : null}
              onReset={reset}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
