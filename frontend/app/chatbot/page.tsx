"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sendChatMessage } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useLang } from "@/context/LangContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  ts: Date;
}

const QUICK_PROMPTS_EN = [
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
        <motion.div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#6B9EFF" }}
          animate={{ opacity: [.3, 1, .3], y: [0, -4, 0] }}
          transition={{ duration: .8, repeat: Infinity, delay: i * .15 }} />
      ))}
    </div>
  );
}

/* ── Render message with bullet points ───────────────────────────────────── */
function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) return <span>{content}</span>;

  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    // Section header: **Title:** or **Title**
    const headerMatch = line.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (headerMatch) {
      elements.push(
        <p key={key++} style={{ fontWeight: 700, color: "#6B9EFF", fontSize: 11, marginTop: elements.length > 0 ? 10 : 0, marginBottom: 5, letterSpacing: ".06em", textTransform: "uppercase" }}>
          {headerMatch[1]}
        </p>
      );
      continue;
    }

    // Numbered: "1. text"
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 9, marginBottom: 6, alignItems: "flex-start" }}>
          <span style={{ minWidth: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: "rgba(15,255,197,0.12)", border: "1px solid rgba(15,255,197,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#6B9EFF" }}>
            {numMatch[1]}
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#e8f4f0" }}>{numMatch[2].replace(/\*\*/g, "")}</span>
        </div>
      );
      continue;
    }

    // Bullet: "• text" or "- text"
    const bulletMatch = line.match(/^[•\-\*]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 9, marginBottom: 6, alignItems: "flex-start" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 7, background: "#6B9EFF", opacity: .7 }} />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#e8f4f0" }}>{bulletMatch[1].replace(/\*\*/g, "")}</span>
        </div>
      );
      continue;
    }

    // Inline pattern: "**Header:** • pt1 • pt2" — split on •
    if (line.includes("•")) {
      const parts = line.split("•").map(p => p.trim()).filter(Boolean);
      const first = parts[0];
      const isHdr = /^\*\*/.test(first);
      if (isHdr) {
        elements.push(
          <p key={key++} style={{ fontWeight: 700, color: "#6B9EFF", fontSize: 11, marginTop: elements.length > 0 ? 10 : 0, marginBottom: 5, letterSpacing: ".06em", textTransform: "uppercase" }}>
            {first.replace(/\*\*/g, "").replace(/:$/, "")}
          </p>
        );
        for (const pt of parts.slice(1)) {
          elements.push(
            <div key={key++} style={{ display: "flex", gap: 9, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 7, background: "#6B9EFF", opacity: .7 }} />
              <span style={{ fontSize: 13, lineHeight: 1.6, color: "#e8f4f0" }}>{pt.replace(/\*\*/g, "")}</span>
            </div>
          );
        }
      } else {
        for (const pt of parts) {
          elements.push(
            <div key={key++} style={{ display: "flex", gap: 9, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 7, background: "#6B9EFF", opacity: .7 }} />
              <span style={{ fontSize: 13, lineHeight: 1.6, color: "#e8f4f0" }}>{pt.replace(/\*\*/g, "")}</span>
            </div>
          );
        }
      }
      continue;
    }

    // Plain text
    const clean = line.replace(/\*\*/g, "");
    if (clean) {
      elements.push(<p key={key++} style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 4, color: "#e8f4f0" }}>{clean}</p>);
    }
  }

  if (!elements.length) return <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>;
  return <div style={{ display: "flex", flexDirection: "column" }}>{elements}</div>;
}

export default function ChatbotPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { t, lang } = useLang();

  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: t("chat.greeting"),
    ts: new Date(),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Check voice support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  // ── TTS with enhanced chatbot voice ─────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const utt = new SpeechSynthesisUtterance(text);
    
    // CHATBOT VOICE: Robotic, clear, professional
    utt.rate = 1.15; // Slightly faster for efficiency
    utt.pitch = 0.95; // Slightly lower for authority
    utt.volume = 1.0;
    
    // Set language for TTS
    utt.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-US";
    
    // Select best chatbot voice (prefer male/neutral voices for chatbot feel)
    const voices = window.speechSynthesis.getVoices();
    const chatbotVoice = 
      voices.find(v => v.name.includes("Google UK English Male") && v.lang.startsWith("en")) || // Chrome - male voice
      voices.find(v => v.name.includes("Daniel") && v.lang.startsWith("en")) || // Mac - male voice
      voices.find(v => v.name.includes("Microsoft David") && v.lang.startsWith("en")) || // Windows - male
      voices.find(v => v.name.includes("Male") && v.lang.startsWith(utt.lang.substring(0, 2))) ||
      voices.find(v => v.lang.startsWith(utt.lang.substring(0, 2))) ||
      voices[0];
    
    if (chatbotVoice) {
      utt.voice = chatbotVoice;
      console.log(`🤖 Chatbot speaking with: ${chatbotVoice.name}`);
    }
    
    window.speechSynthesis.speak(utt);
  }, [ttsEnabled, lang]);

  // ── STT — Voice input ────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
      // Auto-send on final result
      if (event.results[event.results.length - 1].isFinal) {
        setTimeout(() => {
          if (transcript.trim()) sendMessage(transcript.trim());
        }, 300);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim(), ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Add language instruction to context
      const langInstruction = lang === "hi"
        ? "Please respond in Hindi (हिंदी)."
        : lang === "mr"
        ? "Please respond in Marathi (मराठी)."
        : "";

      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      if (langInstruction) {
        history[history.length - 1].content = `${langInstruction}\n\n${history[history.length - 1].content}`;
      }

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
  }, [loading, messages, lang, speak]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1F2E", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 64 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(232,244,240,0.6)", marginBottom: 16 }}>Please sign in to use the AI chatbot.</p>
          <button onClick={() => router.push("/auth")} className="btn-solid">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B1F2E", color: "#e8f4f0", paddingTop: 64, display: "flex", flexDirection: "column" }}>
      <div className="W" style={{ flex: 1, display: "flex", flexDirection: "column", paddingTop: 24, paddingBottom: 24, height: "calc(100vh - 64px)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(15,255,197,0.1)", border: "2px solid rgba(15,255,197,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              position: "relative",
            }} className="a-border">
              🤖
              <div style={{ position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: "50%", background: "#6B9EFF", border: "2px solid #0B1F2E" }} className="a-pulse" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e8f4f0" }}>{t("chat.title")}</h1>
              <p style={{ fontSize: 12, color: "#6B9EFF" }}>{t("chat.online")}</p>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 8 }}>
            {/* TTS toggle */}
            <button onClick={() => setTtsEnabled(!ttsEnabled)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9,
              background: ttsEnabled ? "rgba(15,255,197,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${ttsEnabled ? "rgba(15,255,197,0.3)" : "rgba(255,255,255,0.1)"}`,
              color: ttsEnabled ? "#6B9EFF" : "rgba(232,244,240,0.5)", cursor: "pointer", fontSize: 12,
            }}>
              {ttsEnabled ? t("chat.voice_on") : t("chat.voice_off")}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, padding: "4px 0", marginBottom: 12 }}>
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-end" }}>
                {m.role === "assistant" && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(15,255,197,0.1)", border: "1px solid rgba(15,255,197,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "75%", padding: "12px 16px",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role === "user" ? "#6B9EFF" : "rgba(255,255,255,0.04)",
                  border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                  color: m.role === "user" ? "#0B1F2E" : "#e8f4f0",
                  fontSize: 14, lineHeight: 1.6,
                }}>
                  <MessageContent content={m.content} isUser={m.role === "user"} />
                  <p style={{ fontSize: 10, marginTop: 6, opacity: .45, textAlign: "right" }}>
                    {m.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {m.role === "user" && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(15,255,197,0.15)", border: "1px solid rgba(15,255,197,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#6B9EFF", flexShrink: 0 }}>U</div>
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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, flexShrink: 0 }}>
          {QUICK_PROMPTS_EN.map((p) => (
            <button key={p} onClick={() => sendMessage(p)} style={{
              padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 500,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(232,244,240,0.6)", cursor: "pointer", transition: "all .2s", whiteSpace: "nowrap",
            }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(15,255,197,0.08)"; el.style.borderColor = "rgba(15,255,197,0.25)"; el.style.color = "#6B9EFF"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.borderColor = "rgba(255,255,255,0.1)"; el.style.color = "rgba(232,244,240,0.6)"; }}
            >{p}</button>
          ))}
        </div>

        {/* Input row */}
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0,
          background: "rgba(255,255,255,0.03)", border: `1px solid ${isListening ? "rgba(15,255,197,0.5)" : "rgba(15,255,197,0.15)"}`,
          borderRadius: 16, padding: "10px 12px",
          transition: "border-color .2s",
          boxShadow: isListening ? "0 0 0 3px rgba(15,255,197,0.08)" : "none",
        }}>
          {/* Voice input button */}
          {voiceSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: isListening ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${isListening ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.1)"}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .2s", position: "relative",
              }}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? (
                <>
                  <span style={{ fontSize: 16 }}>🎤</span>
                  {/* Pulsing ring */}
                  <div style={{
                    position: "absolute", inset: -3, borderRadius: 13,
                    border: "2px solid rgba(239,68,68,0.5)",
                    animation: "pulseDot 1s ease-in-out infinite",
                  }} />
                </>
              ) : (
                <span style={{ fontSize: 16, opacity: .6 }}>🎤</span>
              )}
            </button>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? t("chat.mic_on") : t("chat.placeholder")}
            rows={1}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#e8f4f0", fontSize: 14, resize: "none", lineHeight: 1.5,
              fontFamily: "inherit", maxHeight: 100, overflowY: "auto",
            }}
          />

          {/* Send button */}
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: input.trim() && !loading ? "#6B9EFF" : "rgba(255,255,255,0.06)",
            border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h12M8 2l6 6-6 6" stroke={input.trim() && !loading ? "#0B1F2E" : "rgba(232,244,240,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p style={{ fontSize: 10, color: "rgba(232,244,240,0.22)", textAlign: "center", marginTop: 6 }}>
          {t("chat.disclaimer")} · Enter to send · 🎤 for voice
        </p>
      </div>
    </div>
  );
}
