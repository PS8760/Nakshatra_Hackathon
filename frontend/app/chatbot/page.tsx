"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sendChatMessage } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: Date;
}

const QUICK_PROMPTS = [
  "What exercises help with knee recovery?",
  "How do I improve my memory score?",
  "What's a good warm-up routine?",
  "How long should I rest between sessions?",
  "Explain my recovery score to me",
  "Tips for reducing joint pain",
];

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <motion.div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#0fffc5" }}
          animate={{ opacity: [.3, 1, .3], y: [0, -4, 0] }}
          transition={{ duration: .8, repeat: Infinity, delay: i * .15 }} />
      ))}
    </div>
  );
}

export default function ChatbotPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI physiotherapist assistant. I can help you with exercise guidance, recovery advice, and answer questions about your rehabilitation journey. What would you like to know?",
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speak = (text: string) => {
    if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0; utt.pitch = 1.0;
    window.speechSynthesis.speak(utt);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim(), ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(history);
      const reply = res.data.reply;
      const assistantMsg: Message = { role: "assistant", content: reply, ts: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);
      speak(reply);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#02182b", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 64 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(232,244,240,0.6)", marginBottom: 16 }}>Please sign in to use the AI chatbot.</p>
          <button onClick={() => router.push("/auth")} className="btn-solid">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#02182b", color: "#e8f4f0", paddingTop: 64, display: "flex", flexDirection: "column" }}>
      <div className="W" style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 24, paddingBottom: 24, maxHeight: "calc(100vh - 64px)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* AI Avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(15,255,197,0.1)", border: "2px solid rgba(15,255,197,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              position: "relative",
            }} className="a-border">
              🤖
              <div style={{ position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid #02182b" }} className="a-pulse" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e8f4f0" }}>AI Physiotherapist</h1>
              <p style={{ fontSize: 12, color: "#22c55e" }}>● Online · Powered by Groq</p>
            </div>
          </div>

          {/* TTS toggle */}
          <button onClick={() => setTtsEnabled(!ttsEnabled)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10,
            background: ttsEnabled ? "rgba(15,255,197,0.1)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${ttsEnabled ? "rgba(15,255,197,0.3)" : "rgba(255,255,255,0.1)"}`,
            color: ttsEnabled ? "#0fffc5" : "rgba(232,244,240,0.5)", cursor: "pointer", fontSize: 13,
          }}>
            {ttsEnabled ? "🔊" : "🔇"} Voice {ttsEnabled ? "On" : "Off"}
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16,
          padding: "4px 0", marginBottom: 16,
        }}>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  gap: 10, alignItems: "flex-end",
                }}>
                {m.role === "assistant" && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(15,255,197,0.1)", border: "1px solid rgba(15,255,197,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "72%", padding: "12px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role === "user" ? "#0fffc5" : "rgba(255,255,255,0.04)",
                  border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                  color: m.role === "user" ? "#02182b" : "#e8f4f0",
                  fontSize: 14, lineHeight: 1.6,
                }}>
                  {m.content}
                  <p style={{ fontSize: 10, marginTop: 6, opacity: .5, textAlign: "right" }}>
                    {m.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {m.role === "user" && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(15,255,197,0.15)", border: "1px solid rgba(15,255,197,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0fffc5", flexShrink: 0 }}>U</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(15,255,197,0.1)", border: "1px solid rgba(15,255,197,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
              <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <TypingDots />
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, flexShrink: 0 }}>
          {QUICK_PROMPTS.map((p) => (
            <button key={p} onClick={() => sendMessage(p)} style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(232,244,240,0.6)", cursor: "pointer", transition: "all .2s",
              whiteSpace: "nowrap",
            }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(15,255,197,0.08)"; el.style.borderColor = "rgba(15,255,197,0.25)"; el.style.color = "#0fffc5"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.borderColor = "rgba(255,255,255,0.1)"; el.style.color = "rgba(232,244,240,0.6)"; }}
            >{p}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(15,255,197,0.15)",
          borderRadius: 16, padding: "12px 14px",
          transition: "border-color .2s",
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI physiotherapist anything…"
            rows={1}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#e8f4f0", fontSize: 14, resize: "none", lineHeight: 1.5,
              fontFamily: "inherit", maxHeight: 120, overflowY: "auto",
            }}
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: input.trim() && !loading ? "#0fffc5" : "rgba(255,255,255,0.06)",
            border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .2s",
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 9h14M9 2l7 7-7 7" stroke={input.trim() && !loading ? "#02182b" : "rgba(232,244,240,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p style={{ fontSize: 11, color: "rgba(232,244,240,0.25)", textAlign: "center", marginTop: 8 }}>
          Not a substitute for professional medical advice · Press Enter to send
        </p>
      </div>
    </div>
  );
}
