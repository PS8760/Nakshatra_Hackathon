/**
 * Clinical-Grade Voice Guidance System
 * 
 * Features:
 * - Web Speech API integration
 * - Smart cooldown to prevent audio overlap
 * - Priority-based queuing
 * - Posture correction alerts
 * - Step-by-step exercise guidance
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type VoicePriority = 'critical' | 'high' | 'normal' | 'low';
export type VoiceEmotion = 'neutral' | 'encouraging' | 'warning' | 'urgent';

export interface VoiceConfig {
  rate?: number;          // 0.1 to 10 (default: 1.0)
  pitch?: number;         // 0 to 2 (default: 1.0)
  volume?: number;        // 0 to 1 (default: 1.0)
  lang?: string;          // e.g., 'en-US'
  voiceName?: string;     // Specific voice name
}

export interface VoiceCue {
  text: string;
  priority: VoicePriority;
  emotion?: VoiceEmotion;
  config?: VoiceConfig;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// VOICE GUIDANCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class VoiceGuidanceEngine {
  private isInitialized = false;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private queue: VoiceCue[] = [];
  private isSpeaking = false;
  private lastSpeakTime = 0;
  private cooldownPeriod = 3000; // 3 seconds default
  private cooldownTimers = new Map<string, number>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialize the voice system
   */
  private initialize() {
    if (!window.speechSynthesis) {
      console.error('❌ Speech Synthesis API not available');
      return;
    }

    // Load voices
    this.loadVoices();

    // Listen for voice changes (async loading)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }

    this.isInitialized = true;
    console.log('✅ Voice Guidance Engine initialized');
  }

  /**
   * Load available voices
   */
  private loadVoices() {
    this.voices = window.speechSynthesis.getVoices();
    if (this.voices.length > 0) {
      console.log(`✅ Loaded ${this.voices.length} voices`);
    }
  }

  /**
   * Get preferred voice based on language and quality
   */
  private getPreferredVoice(lang = 'en-US'): SpeechSynthesisVoice | null {
    if (this.voices.length === 0) {
      this.loadVoices();
    }

    // Priority order for English voices
    const preferences = [
      'Samantha',           // Mac - natural female
      'Google US English',  // Chrome - Google TTS
      'Microsoft Zira',     // Windows - Zira
      'Karen',              // Mac - alternative
      'Alex',               // Mac - male
    ];

    // Try preferred voices first
    for (const pref of preferences) {
      const voice = this.voices.find(v => 
        v.name.includes(pref) && v.lang.startsWith(lang.split('-')[0])
      );
      if (voice) return voice;
    }

    // Fallback to any voice matching language
    const fallback = this.voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (fallback) return fallback;

    // Last resort: first available voice
    return this.voices[0] || null;
  }

  /**
   * Set cooldown period (milliseconds)
   */
  setCooldown(ms: number) {
    this.cooldownPeriod = ms;
  }

  /**
   * Check if cooldown is active for a specific cue type
   */
  private isInCooldown(cueType: string): boolean {
    const lastTime = this.cooldownTimers.get(cueType) || 0;
    return Date.now() - lastTime < this.cooldownPeriod;
  }

  /**
   * Set cooldown for a specific cue type
   */
  private setCooldownTimer(cueType: string) {
    this.cooldownTimers.set(cueType, Date.now());
  }

  /**
   * Get voice configuration based on emotion
   */
  private getEmotionConfig(emotion: VoiceEmotion): VoiceConfig {
    switch (emotion) {
      case 'encouraging':
        return { rate: 1.1, pitch: 1.25, volume: 1.0 };
      case 'warning':
        return { rate: 0.9, pitch: 0.85, volume: 1.0 };
      case 'urgent':
        return { rate: 1.2, pitch: 1.4, volume: 1.0 };
      case 'neutral':
      default:
        return { rate: 1.0, pitch: 1.0, volume: 1.0 };
    }
  }

  /**
   * Speak a voice cue
   */
  speak(cue: VoiceCue) {
    if (!this.isInitialized) {
      console.warn('⚠️ Voice system not initialized');
      return;
    }

    // Check priority and cooldown
    if (cue.priority === 'low' && this.isSpeaking) {
      console.log('ℹ️ Skipping low priority cue (already speaking)');
      return;
    }

    // Add to queue based on priority
    if (cue.priority === 'critical') {
      // Critical: interrupt current speech and speak immediately
      this.queue.unshift(cue);
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    } else if (cue.priority === 'high') {
      // High: add to front of queue
      this.queue.unshift(cue);
    } else {
      // Normal/Low: add to end of queue
      this.queue.push(cue);
    }

    // Process queue if not already speaking
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  /**
   * Process the voice queue
   */
  private processQueue() {
    if (this.queue.length === 0 || this.isSpeaking) {
      return;
    }

    const cue = this.queue.shift();
    if (!cue) return;

    this.isSpeaking = true;

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cue.text);

    // Apply emotion-based config
    const emotionConfig = cue.emotion 
      ? this.getEmotionConfig(cue.emotion) 
      : {};
    
    const config = { ...emotionConfig, ...cue.config };

    utterance.rate = config.rate || 1.0;
    utterance.pitch = config.pitch || 1.0;
    utterance.volume = config.volume || 1.0;
    utterance.lang = config.lang || 'en-US';

    // Set voice
    const voice = this.getPreferredVoice(utterance.lang);
    if (voice) {
      utterance.voice = voice;
    }

    // Event handlers
    utterance.onstart = () => {
      console.log(`🔊 Speaking: "${cue.text.substring(0, 50)}..."`);
      this.lastSpeakTime = Date.now();
      if (cue.onStart) cue.onStart();
    };

    utterance.onend = () => {
      console.log('✅ Speech completed');
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (cue.onEnd) cue.onEnd();

      // Process next in queue after a small delay
      setTimeout(() => this.processQueue(), 100);
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      const errorType = event.error;
      
      // Suppress normal interruption errors
      if (errorType === 'interrupted' || errorType === 'canceled') {
        console.log(`ℹ️ Speech ${errorType}`);
      } else {
        console.error(`❌ Speech error: ${errorType}`);
        if (cue.onError) cue.onError(errorType);
      }

      this.isSpeaking = false;
      this.currentUtterance = null;

      // Process next in queue
      setTimeout(() => this.processQueue(), 100);
    };

    // Speak
    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Cancel current speech and clear queue
   */
  cancel() {
    window.speechSynthesis.cancel();
    this.queue = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  /**
   * Pause current speech
   */
  pause() {
    window.speechSynthesis.pause();
  }

  /**
   * Resume paused speech
   */
  resume() {
    window.speechSynthesis.resume();
  }

  /**
   * Check if currently speaking
   */
  get speaking(): boolean {
    return this.isSpeaking || window.speechSynthesis.speaking;
  }

  /**
   * Get queue length
   */
  get queueLength(): number {
    return this.queue.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const voiceEngine = new VoiceGuidanceEngine();

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Speak exercise step
 */
export function speakStep(stepText: string, stepNumber?: number) {
  const text = stepNumber 
    ? `Step ${stepNumber}: ${stepText}` 
    : stepText;

  voiceEngine.speak({
    text,
    priority: 'normal',
    emotion: 'neutral',
  });
}

/**
 * Speak posture correction
 */
export function speakPostureCorrection(
  correction: string,
  severity: 'mild' | 'moderate' | 'severe' = 'moderate'
) {
  const priority: VoicePriority = 
    severity === 'severe' ? 'critical' :
    severity === 'moderate' ? 'high' : 'normal';

  const emotion: VoiceEmotion = 
    severity === 'severe' ? 'urgent' : 'warning';

  voiceEngine.speak({
    text: correction,
    priority,
    emotion,
  });
}

/**
 * Speak encouragement
 */
export function speakEncouragement(message: string) {
  voiceEngine.speak({
    text: message,
    priority: 'low',
    emotion: 'encouraging',
  });
}

/**
 * Speak warning
 */
export function speakWarning(message: string) {
  voiceEngine.speak({
    text: message,
    priority: 'high',
    emotion: 'warning',
  });
}

/**
 * Speak critical alert
 */
export function speakCritical(message: string) {
  voiceEngine.speak({
    text: message,
    priority: 'critical',
    emotion: 'urgent',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export default voiceEngine;
