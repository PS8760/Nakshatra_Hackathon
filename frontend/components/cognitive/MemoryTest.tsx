"use client";
import { useState, useEffect, useRef } from "react";
import { getRandomWords, sleep } from "@/utils/helpers";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onComplete: (score: number) => void;
}

// Two rounds: immediate recall + delayed recall after distractor task
type Phase = "memorize" | "distractor" | "recall1" | "recall2_intro" | "recall2" | "done";

const DISTRACTOR_SUMS = Array.from({ length: 5 }, () => {
  const a = Math.floor(Math.random() * 20) + 5;
  const b = Math.floor(Math.random() * 20) + 5;
  return { a, b, answer: a + b };
});

export default function MemoryTest({ onComplete }: Props) {
  const [words] = useState<string[]>(getRandomWords(5)); // 5 words for better discrimination
  const [phase, setPhase] = useState<Phase>("memorize");
  const [countdown, setCountdown] = useState(8); // 8s to memorize
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [distractorIdx, setDistractorIdx] = useState(0);
  const [distractorInput, setDistractorInput] = useState("");
  const [distractorCorrect, setDistractorCorrect] = useState(0);
  const [recall1Score, setRecall1Score] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (phase !== "memorize") return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setPhase("distractor");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  function scoreRecall(input: string): number {
    const recalled = input.toLowerCase().split(/[\s,]+/).map((w) => w.trim()).filter(Boolean);
    let correct = 0;
    for (const word of words) {
      // Exact match OR close match (1 char difference — handles typos)
      if (recalled.includes(word)) {
        correct++;
      } else if (recalled.some((r) => levenshtein(r, word) <= 1)) {
        correct += 0.75; // partial credit for near-miss
      }
    }
    return correct;
  }

  function levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[a.length][b.length];
  }

  function handleDistractor() {
    const current = DISTRACTOR_SUMS[distractorIdx];
    const userAnswer = parseInt(distractorInput.trim());
    if (userAnswer === current.answer) setDistractorCorrect((c) => c + 1);
    setDistractorInput("");
    if (distractorIdx >= DISTRACTOR_SUMS.length - 1) {
      setPhase("recall1");
    } else {
      setDistractorIdx((i) => i + 1);
    }
  }

  function handleRecall1() {
    const score = scoreRecall(input1);
    setRecall1Score(score);
    setPhase("recall2_intro");
    // Short delay before second recall
    sleep(3000).then(() => setPhase("recall2"));
  }

  function handleRecall2() {
    if (doneRef.current) return;
    doneRef.current = true;
    const score1 = scoreRecall(input1);
    const score2 = scoreRecall(input2);
    // Weighted: immediate recall 40%, delayed recall 60% (delayed is more clinically significant)
    const combined = (score1 * 0.4 + score2 * 0.6) / words.length;
    const finalScore = Math.round(Math.min(100, combined * 100));
    setPhase("done");
    onComplete(finalScore);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", width: "100%" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF" }}>🧩 Memory Test</h2>

      <AnimatePresence mode="wait">
        {phase === "memorize" && (
          <motion.div key="mem" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              Memorize all words. You have{" "}
              <span style={{ color: "#6B9EFF", fontWeight: 700, fontSize: 18 }}>{countdown}s</span>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
              {words.map((w, i) => (
                <motion.span key={w}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 8,
                    background: "rgba(107,158,255,0.1)",
                    border: "2px solid rgba(107,158,255,0.3)",
                    color: "#6B9EFF",
                    fontSize: 18,
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}>
                  {w}
                </motion.span>
              ))}
            </div>
            {/* Countdown ring */}
            <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="#6B9EFF" strokeWidth="5"
                strokeDasharray={2 * Math.PI * 32}
                strokeDashoffset={2 * Math.PI * 32 * (1 - countdown / 8)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
          </motion.div>
        )}

        {phase === "distractor" && (
          <motion.div key="dist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Quick math — answer to continue</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>({distractorIdx + 1} of {DISTRACTOR_SUMS.length})</p>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#FFFFFF" }}>
              {DISTRACTOR_SUMS[distractorIdx].a} + {DISTRACTOR_SUMS[distractorIdx].b} = ?
            </div>
            <input autoFocus type="number" value={distractorInput}
              onChange={(e) => setDistractorInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDistractor()}
              style={{
                width: 140,
                padding: "14px 16px",
                borderRadius: 8,
                background: "#1A3447",
                border: "2px solid #243B4E",
                color: "#FFFFFF",
                textAlign: "center",
                fontSize: 20,
                fontWeight: 700,
                outline: "none",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#6B9EFF"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#243B4E"}
            />
            <button onClick={handleDistractor}
              style={{
                padding: "12px 28px",
                borderRadius: 8,
                background: "#6B9EFF",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 15,
                border: "none",
                cursor: "pointer",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(0)"}
            >
              Next →
            </button>
          </motion.div>
        )}

        {phase === "recall1" && (
          <motion.div key="r1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 480 }}>
            <p style={{ color: "#6B9EFF", fontWeight: 600, fontSize: 16 }}>Now recall the words</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Type all the words you memorized (space or comma separated)</p>
            <input autoFocus value={input1}
              onChange={(e) => setInput1(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRecall1()}
              placeholder="word1 word2 word3…"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 8,
                background: "#1A3447",
                border: "2px solid #243B4E",
                color: "#FFFFFF",
                fontSize: 15,
                outline: "none",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#6B9EFF"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#243B4E"}
            />
            <button onClick={handleRecall1}
              style={{
                padding: "14px 36px",
                borderRadius: 8,
                background: "#6B9EFF",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 16,
                border: "none",
                cursor: "pointer",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(0)"}
            >
              Submit
            </button>
          </motion.div>
        )}

        {phase === "recall2_intro" && (
          <motion.div key="r2i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, border: "3px solid #6B9EFF", borderTopColor: "transparent", borderRadius: "50%", animation: "spinCW 1s linear infinite" }} />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Preparing delayed recall test…</p>
          </motion.div>
        )}

        {phase === "recall2" && (
          <motion.div key="r2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 480 }}>
            <p style={{ color: "#6B9EFF", fontWeight: 600, fontSize: 16 }}>Delayed recall</p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Type the words again — without looking at your previous answer</p>
            <input autoFocus value={input2}
              onChange={(e) => setInput2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRecall2()}
              placeholder="word1 word2 word3…"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 8,
                background: "#1A3447",
                border: "2px solid #243B4E",
                color: "#FFFFFF",
                fontSize: 15,
                outline: "none",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#6B9EFF"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#243B4E"}
            />
            <button onClick={handleRecall2}
              style={{
                padding: "14px 36px",
                borderRadius: 8,
                background: "#6B9EFF",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 16,
                border: "none",
                cursor: "pointer",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(0)"}
            >
              Submit
            </button>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p style={{ color: "#6B9EFF", fontWeight: 600, fontSize: 16 }}>Memory test complete ✓</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
