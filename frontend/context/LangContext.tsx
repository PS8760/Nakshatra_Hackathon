"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Lang, t as translate, LANGUAGES } from "@/lib/i18n";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("nr_lang") as Lang | null;
    if (saved && ["en", "hi", "mr"].includes(saved)) setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("nr_lang", l);
  };

  const t = (key: string) => translate(lang, key);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

/* ── Language switcher widget ─────────────────────────────────────────── */
export function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(232,244,240,0.7)", cursor: "pointer", transition: "all .2s",
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(15,255,197,0.3)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)",
          background: "#031e35", border: "1px solid rgba(15,255,197,0.15)",
          borderRadius: 10, overflow: "hidden", zIndex: 200,
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)", minWidth: 120,
        }}>
          {LANGUAGES.map((l) => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "9px 14px", fontSize: 13, fontWeight: 500,
              background: lang === l.code ? "rgba(15,255,197,0.1)" : "transparent",
              color: lang === l.code ? "#6B9EFF" : "rgba(232,244,240,0.65)",
              border: "none", cursor: "pointer", transition: "background .15s",
              textAlign: "left",
            }}
              onMouseEnter={(e) => { if (lang !== l.code) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { if (lang !== l.code) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && <span style={{ marginLeft: "auto", fontSize: 10 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
