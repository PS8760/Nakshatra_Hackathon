// ── Multilingual support: English, Hindi, Marathi ─────────────────────────

export type Lang = "en" | "hi" | "mr";

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिंदी",   flag: "🇮🇳" },
  { code: "mr", label: "मराठी",   flag: "🇮🇳" },
];

export const T: Record<Lang, Record<string, string>> = {
  en: {
    // Nav
    "nav.features":     "Features",
    "nav.how":          "How it works",
    "nav.team":         "Team",
    "nav.contact":      "Contact",
    "nav.dashboard":    "Dashboard",
    "nav.sessions":     "Sessions",
    "nav.cognitive":    "Cognitive",
    "nav.chatbot":      "Chatbot",
    "nav.signin":       "Sign in",
    "nav.getstarted":   "Get started",
    "nav.signout":      "Sign out",
    "nav.profile":      "Profile",
    "nav.progress":     "Progress Tracking",
    "nav.history":      "History",
    "nav.reports":      "Reports",

    // Hero
    "hero.badge":       "Nakshatra Hackathon 2026 · Healthcare Track",
    "hero.h1a":         "Rehab that",
    "hero.h1b":         "never sleeps.",
    "hero.sub":         "AI-powered physical joint recovery and cognitive rehabilitation. Real-time. Any device. Zero hardware.",
    "hero.cta1":        "Start for free",
    "hero.cta2":        "See features",

    // Dashboard
    "dash.welcome":     "Welcome back",
    "dash.start":       "▶ Start Session",
    "dash.cognitive":   "🧠 Cognitive Test",
    "dash.ai_insight":  "AI Insight",
    "dash.rec_score":   "Recovery Score",
    "dash.sessions":    "Total Sessions",
    "dash.last":        "Last Session",
    "dash.cog_tests":   "Cognitive Tests",
    "dash.trend":       "Recovery Trend",
    "dash.cog_perf":    "Cognitive Performance",
    "dash.quick":       "Quick Actions",
    "dash.recent":      "Recent Sessions",
    "dash.no_sessions": "No sessions yet",

    // Session
    "session.title":    "Physical Rehabilitation",
    "session.subtitle": "Track A — Joint Recovery",
    "session.focus":    "Select Exercise Focus",
    "session.start":    "▶ Start Session",
    "session.end":      "■ End Session",
    "session.pain":     "🚨 Pain",
    "session.live":     "LIVE",
    "session.reps":     "Total reps completed",
    "session.saving":   "Saving…",
    "session.how":      "How it works",
    "session.guide":    "Colour Guide",
    "session.physio":   "AI Physiotherapist",
    "session.demo":     "Exercise Demo",

    // Chatbot
    "chat.title":       "AI Physiotherapist",
    "chat.online":      "● Online · Powered by Groq",
    "chat.voice_on":    "🔊 Voice On",
    "chat.voice_off":   "🔇 Voice Off",
    "chat.mic_on":      "🎤 Listening…",
    "chat.mic_off":     "🎤 Speak",
    "chat.placeholder": "Ask your AI physiotherapist anything…",
    "chat.disclaimer":  "Not a substitute for professional medical advice",
    "chat.greeting":    "Hi! I'm your AI physiotherapist assistant. I can help you with exercise guidance, recovery advice, and answer questions about your rehabilitation journey. What would you like to know?",

    // Cognitive
    "cog.title":        "Cognitive Test Suite",
    "cog.begin":        "Begin Assessment →",
    "cog.done":         "Assessment Complete!",
    "cog.overall":      "Overall Cognitive Score",
    "cog.retake":       "Retake Tests",

    // Auth
    "auth.welcome":     "Welcome back.",
    "auth.create":      "Create account.",
    "auth.signin":      "Sign in",
    "auth.signup":      "Sign up",
    "auth.google":      "Continue with Google",
    "auth.demo":        "Demo credentials",

    // Common
    "common.loading":   "Loading…",
    "common.save":      "Save",
    "common.cancel":    "Cancel",
    "common.back":      "← Dashboard",
    "common.viewall":   "View all →",
    "common.completed": "completed",
    "common.score":     "score",
  },

  hi: {
    // Nav
    "nav.features":     "विशेषताएं",
    "nav.how":          "यह कैसे काम करता है",
    "nav.team":         "टीम",
    "nav.contact":      "संपर्क",
    "nav.dashboard":    "डैशबोर्ड",
    "nav.sessions":     "सत्र",
    "nav.cognitive":    "संज्ञानात्मक",
    "nav.chatbot":      "चैटबॉट",
    "nav.signin":       "साइन इन",
    "nav.getstarted":   "शुरू करें",
    "nav.signout":      "साइन आउट",
    "nav.profile":      "प्रोफ़ाइल",
    "nav.progress":     "प्रगति ट्रैकिंग",
    "nav.history":      "इतिहास",
    "nav.reports":      "रिपोर्ट",

    // Hero
    "hero.badge":       "नक्षत्र हैकाथॉन 2026 · स्वास्थ्य ट्रैक",
    "hero.h1a":         "पुनर्वास जो",
    "hero.h1b":         "कभी नहीं सोता।",
    "hero.sub":         "AI-संचालित शारीरिक जोड़ पुनर्प्राप्ति और संज्ञानात्मक पुनर्वास। रियल-टाइम। कोई भी डिवाइस। शून्य हार्डवेयर।",
    "hero.cta1":        "मुफ़्त शुरू करें",
    "hero.cta2":        "विशेषताएं देखें",

    // Dashboard
    "dash.welcome":     "वापस स्वागत है",
    "dash.start":       "▶ सत्र शुरू करें",
    "dash.cognitive":   "🧠 संज्ञानात्मक परीक्षण",
    "dash.ai_insight":  "AI अंतर्दृष्टि",
    "dash.rec_score":   "रिकवरी स्कोर",
    "dash.sessions":    "कुल सत्र",
    "dash.last":        "अंतिम सत्र",
    "dash.cog_tests":   "संज्ञानात्मक परीक्षण",
    "dash.trend":       "रिकवरी ट्रेंड",
    "dash.cog_perf":    "संज्ञानात्मक प्रदर्शन",
    "dash.quick":       "त्वरित क्रियाएं",
    "dash.recent":      "हाल के सत्र",
    "dash.no_sessions": "अभी तक कोई सत्र नहीं",

    // Session
    "session.title":    "शारीरिक पुनर्वास",
    "session.subtitle": "ट्रैक A — जोड़ पुनर्प्राप्ति",
    "session.focus":    "व्यायाम फोकस चुनें",
    "session.start":    "▶ सत्र शुरू करें",
    "session.end":      "■ सत्र समाप्त करें",
    "session.pain":     "🚨 दर्द",
    "session.live":     "लाइव",
    "session.reps":     "कुल रेप्स पूर्ण",
    "session.saving":   "सहेज रहे हैं…",
    "session.how":      "यह कैसे काम करता है",
    "session.guide":    "रंग गाइड",
    "session.physio":   "AI फिजियोथेरेपिस्ट",
    "session.demo":     "व्यायाम प्रदर्शन",

    // Chatbot
    "chat.title":       "AI फिजियोथेरेपिस्ट",
    "chat.online":      "● ऑनलाइन · Groq द्वारा संचालित",
    "chat.voice_on":    "🔊 आवाज़ चालू",
    "chat.voice_off":   "🔇 आवाज़ बंद",
    "chat.mic_on":      "🎤 सुन रहा है…",
    "chat.mic_off":     "🎤 बोलें",
    "chat.placeholder": "अपने AI फिजियोथेरेपिस्ट से कुछ भी पूछें…",
    "chat.disclaimer":  "पेशेवर चिकित्सा सलाह का विकल्प नहीं",
    "chat.greeting":    "नमस्ते! मैं आपका AI फिजियोथेरेपिस्ट सहायक हूं। मैं व्यायाम मार्गदर्शन, रिकवरी सलाह और आपकी पुनर्वास यात्रा के बारे में प्रश्नों में मदद कर सकता हूं।",

    // Cognitive
    "cog.title":        "संज्ञानात्मक परीक्षण सूट",
    "cog.begin":        "मूल्यांकन शुरू करें →",
    "cog.done":         "मूल्यांकन पूर्ण!",
    "cog.overall":      "समग्र संज्ञानात्मक स्कोर",
    "cog.retake":       "परीक्षण दोबारा लें",

    // Auth
    "auth.welcome":     "वापस स्वागत है।",
    "auth.create":      "खाता बनाएं।",
    "auth.signin":      "साइन इन",
    "auth.signup":      "साइन अप",
    "auth.google":      "Google से जारी रखें",
    "auth.demo":        "डेमो क्रेडेंशियल",

    // Common
    "common.loading":   "लोड हो रहा है…",
    "common.save":      "सहेजें",
    "common.cancel":    "रद्द करें",
    "common.back":      "← डैशबोर्ड",
    "common.viewall":   "सभी देखें →",
    "common.completed": "पूर्ण",
    "common.score":     "स्कोर",
  },

  mr: {
    // Nav
    "nav.features":     "वैशिष्ट्ये",
    "nav.how":          "हे कसे कार्य करते",
    "nav.team":         "टीम",
    "nav.contact":      "संपर्क",
    "nav.dashboard":    "डॅशबोर्ड",
    "nav.sessions":     "सत्रे",
    "nav.cognitive":    "संज्ञानात्मक",
    "nav.chatbot":      "चॅटबॉट",
    "nav.signin":       "साइन इन",
    "nav.getstarted":   "सुरू करा",
    "nav.signout":      "साइन आउट",
    "nav.profile":      "प्रोफाइल",
    "nav.progress":     "प्रगती ट्रॅकिंग",
    "nav.history":      "इतिहास",
    "nav.reports":      "अहवाल",

    // Hero
    "hero.badge":       "नक्षत्र हॅकाथॉन 2026 · आरोग्य ट्रॅक",
    "hero.h1a":         "पुनर्वास जे",
    "hero.h1b":         "कधीच झोपत नाही।",
    "hero.sub":         "AI-चालित शारीरिक सांधे पुनर्प्राप्ती आणि संज्ञानात्मक पुनर्वास। रिअल-टाइम। कोणतेही डिव्हाइस। शून्य हार्डवेअर।",
    "hero.cta1":        "मोफत सुरू करा",
    "hero.cta2":        "वैशिष्ट्ये पहा",

    // Dashboard
    "dash.welcome":     "परत स्वागत आहे",
    "dash.start":       "▶ सत्र सुरू करा",
    "dash.cognitive":   "🧠 संज्ञानात्मक चाचणी",
    "dash.ai_insight":  "AI अंतर्दृष्टी",
    "dash.rec_score":   "रिकव्हरी स्कोर",
    "dash.sessions":    "एकूण सत्रे",
    "dash.last":        "शेवटचे सत्र",
    "dash.cog_tests":   "संज्ञानात्मक चाचण्या",
    "dash.trend":       "रिकव्हरी ट्रेंड",
    "dash.cog_perf":    "संज्ञानात्मक कामगिरी",
    "dash.quick":       "जलद क्रिया",
    "dash.recent":      "अलीकडील सत्रे",
    "dash.no_sessions": "अद्याप कोणतेही सत्र नाही",

    // Session
    "session.title":    "शारीरिक पुनर्वास",
    "session.subtitle": "ट्रॅक A — सांधे पुनर्प्राप्ती",
    "session.focus":    "व्यायाम फोकस निवडा",
    "session.start":    "▶ सत्र सुरू करा",
    "session.end":      "■ सत्र संपवा",
    "session.pain":     "🚨 वेदना",
    "session.live":     "लाइव्ह",
    "session.reps":     "एकूण रेप्स पूर्ण",
    "session.saving":   "जतन करत आहे…",
    "session.how":      "हे कसे कार्य करते",
    "session.guide":    "रंग मार्गदर्शक",
    "session.physio":   "AI फिजिओथेरपिस्ट",
    "session.demo":     "व्यायाम प्रात्यक्षिक",

    // Chatbot
    "chat.title":       "AI फिजिओथेरपिस्ट",
    "chat.online":      "● ऑनलाइन · Groq द्वारे चालित",
    "chat.voice_on":    "🔊 आवाज चालू",
    "chat.voice_off":   "🔇 आवाज बंद",
    "chat.mic_on":      "🎤 ऐकत आहे…",
    "chat.mic_off":     "🎤 बोला",
    "chat.placeholder": "तुमच्या AI फिजिओथेरपिस्टला काहीही विचारा…",
    "chat.disclaimer":  "व्यावसायिक वैद्यकीय सल्ल्याचा पर्याय नाही",
    "chat.greeting":    "नमस्कार! मी तुमचा AI फिजिओथेरपिस्ट सहाय्यक आहे. मी व्यायाम मार्गदर्शन, पुनर्प्राप्ती सल्ला आणि तुमच्या पुनर्वास प्रवासाबद्दल प्रश्नांमध्ये मदत करू शकतो।",

    // Cognitive
    "cog.title":        "संज्ञानात्मक चाचणी सूट",
    "cog.begin":        "मूल्यांकन सुरू करा →",
    "cog.done":         "मूल्यांकन पूर्ण!",
    "cog.overall":      "एकूण संज्ञानात्मक स्कोर",
    "cog.retake":       "चाचण्या पुन्हा घ्या",

    // Auth
    "auth.welcome":     "परत स्वागत आहे।",
    "auth.create":      "खाते तयार करा।",
    "auth.signin":      "साइन इन",
    "auth.signup":      "साइन अप",
    "auth.google":      "Google सह सुरू ठेवा",
    "auth.demo":        "डेमो क्रेडेन्शियल",

    // Common
    "common.loading":   "लोड होत आहे…",
    "common.save":      "जतन करा",
    "common.cancel":    "रद्द करा",
    "common.back":      "← डॅशबोर्ड",
    "common.viewall":   "सर्व पहा →",
    "common.completed": "पूर्ण",
    "common.score":     "स्कोर",
  },
};

export function t(lang: Lang, key: string): string {
  return T[lang]?.[key] ?? T["en"]?.[key] ?? key;
}
