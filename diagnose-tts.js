// TTS Diagnostic Script
// Run this in your browser console (F12) to diagnose TTS issues

console.log("🔍 Starting TTS Diagnostic...\n");

// 1. Check if Speech Synthesis API is available
console.log("1️⃣ Checking Speech Synthesis API...");
if (typeof window.speechSynthesis === "undefined") {
  console.error("❌ Speech Synthesis API not available in this browser");
} else {
  console.log("✅ Speech Synthesis API is available");
}

// 2. Check voices
console.log("\n2️⃣ Checking available voices...");
let voices = window.speechSynthesis.getVoices();
console.log(`Found ${voices.length} voices initially`);

// Voices might load asynchronously
window.speechSynthesis.onvoiceschanged = () => {
  voices = window.speechSynthesis.getVoices();
  console.log(`✅ Voices loaded: ${voices.length} total`);
  
  if (voices.length > 0) {
    console.log("\n📋 Available voices:");
    voices.slice(0, 10).forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.name} (${v.lang}) ${v.default ? "⭐ DEFAULT" : ""}`);
    });
  } else {
    console.error("❌ No voices available");
  }
};

// Trigger voice loading
window.speechSynthesis.getVoices();

// 3. Test basic speech
console.log("\n3️⃣ Testing basic speech in 2 seconds...");
setTimeout(() => {
  console.log("🔊 Attempting to speak...");
  
  const utterance = new SpeechSynthesisUtterance("Testing. Can you hear me?");
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  utterance.onstart = () => {
    console.log("✅ Speech started successfully!");
  };
  
  utterance.onend = () => {
    console.log("✅ Speech completed successfully!");
  };
  
  utterance.onerror = (error) => {
    console.error("❌ Speech error:", {
      error: error.error,
      message: error.message
    });
  };
  
  window.speechSynthesis.speak(utterance);
  
  // Check if speaking
  setTimeout(() => {
    console.log(`Speaking status: ${window.speechSynthesis.speaking ? "🔊 SPEAKING" : "🔇 SILENT"}`);
    console.log(`Paused status: ${window.speechSynthesis.paused ? "⏸️ PAUSED" : "▶️ PLAYING"}`);
    console.log(`Pending status: ${window.speechSynthesis.pending ? "⏳ PENDING" : "✅ READY"}`);
  }, 500);
}, 2000);

// 4. Check system audio
console.log("\n4️⃣ Checking system audio...");
console.log("⚠️ Please verify:");
console.log("  - System volume is not muted");
console.log("  - Browser tab is not muted (check tab icon)");
console.log("  - No headphones are disconnected");
console.log("  - Other audio works in browser (try YouTube)");

console.log("\n✅ Diagnostic script loaded. Watch for results above.");
console.log("💡 If you hear 'Testing. Can you hear me?' then TTS works!");
