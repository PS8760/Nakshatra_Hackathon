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
    <div className="flex flex-col items-center gap-5 text-center w-full">
      <h2 className="text-2xl font-bold">🧩 Memory Test</h2>

      <AnimatePresence mode="wait">
        {phase === "memorize" && (
          <motion.div key="mem" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4">
            <p className="text-gray-400 text-sm">
              Memorize all words. You have{" "}
              <span className="text-[#09ffd3] font-bold text-lg">{countdown}s</span>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {words.map((w, i) => (
                <motion.span key={w}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="px-4 py-2.5 rounded-xl bg-[#09ffd3]/10 border border-[#09ffd3]/30 text-[#09ffd3] text-lg font-semibold capitalize">
                  {w}
                </motion.span>
              ))}
            </div>
            {/* Countdown ring */}
            <svg width="60" height="60" className="-rotate-90">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              <circle cx="30" cy="30" r="24" fill="none" stroke="#09ffd3" strokeWidth="4"
                strokeDasharray={2 * Math.PI * 24}
                strokeDashoffset={2 * Math.PI * 24 * (1 - countdown / 8)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
          </motion.div>
        )}

        {phase === "distractor" && (
          <motion.div key="dist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4">
            <p className="text-gray-400 text-sm">Quick math — answer to continue</p>
            <p className="text-xs text-gray-600">({distractorIdx + 1} of {DISTRACTOR_SUMS.length})</p>
            <div className="text-3xl font-bold text-white">
              {DISTRACTOR_SUMS[distractorIdx].a} + {DISTRACTOR_SUMS[distractorIdx].b} = ?
            </div>
            <input autoFocus type="number" value={distractorInput}
              onChange={(e) => setDistractorInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDistractor()}
              className="w-28 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-xl focus:border-[#09ffd3] transition"
            />
            <button onClick={handleDistractor}
              className="px-6 py-2.5 rounded-xl bg-[#09ffd3] text-[#02182b] font-bold text-sm hover:brightness-110 transition">
              Next →
            </button>
          </motion.div>
        )}

        {phase === "recall1" && (
          <motion.div key="r1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4">
            <p className="text-[#09ffd3] font-semibold">Now recall the words</p>
            <p className="text-gray-400 text-sm">Type all the words you memorized (space or comma separated)</p>
            <input autoFocus value={input1}
              onChange={(e) => setInput1(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRecall1()}
              placeholder="word1 word2 word3…"
              className="w-full max-w-sm px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-[#09ffd3] transition"
            />
            <button onClick={handleRecall1}
              className="px-8 py-3 rounded-xl bg-[#09ffd3] text-[#02182b] font-bold hover:brightness-110 transition">
              Submit
            </button>
          </motion.div>
        )}

        {phase === "recall2_intro" && (
          <motion.div key="r2i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#09ffd3] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Preparing delayed recall test…</p>
          </motion.div>
        )}

        {phase === "recall2" && (
          <motion.div key="r2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4">
            <p className="text-[#09ffd3] font-semibold">Delayed recall</p>
            <p className="text-gray-400 text-sm">Type the words again — without looking at your previous answer</p>
            <input autoFocus value={input2}
              onChange={(e) => setInput2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRecall2()}
              placeholder="word1 word2 word3…"
              className="w-full max-w-sm px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:border-[#09ffd3] transition"
            />
            <button onClick={handleRecall2}
              className="px-8 py-3 rounded-xl bg-[#09ffd3] text-[#02182b] font-bold hover:brightness-110 transition">
              Submit
            </button>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-[#09ffd3] font-semibold">Memory test complete ✓</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
