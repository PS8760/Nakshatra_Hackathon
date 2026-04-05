/**
 * Posture Correction System
 * 
 * Integrates with ML model to provide real-time posture feedback
 */

import { speakPostureCorrection, speakWarning, speakCritical } from './voiceGuidance';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type PostureSeverity = 'mild' | 'moderate' | 'severe';

export interface PostureIssue {
  label: string;              // ML model output label
  severity: PostureSeverity;
  correction: string;         // Audio correction message
  visualCue?: string;         // Optional visual feedback
  priority: number;           // 1-10 (10 = most critical)
}

export interface PostureRule {
  mlLabel: string;            // Label from ML model
  corrections: {
    [key in PostureSeverity]: string;
  };
  priority: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// POSTURE CORRECTION RULES
// ═══════════════════════════════════════════════════════════════════════════

const POSTURE_RULES: Record<string, PostureRule> = {
  // Slouching
  'slouch': {
    mlLabel: 'slouch',
    corrections: {
      mild: 'Straighten your back slightly',
      moderate: 'Straighten your back. Keep your spine aligned.',
      severe: 'Stop! Straighten your back immediately to avoid injury.',
    },
    priority: 8,
  },

  // Forward head
  'forward_head': {
    mlLabel: 'forward_head',
    corrections: {
      mild: 'Bring your head back slightly',
      moderate: 'Pull your head back. Align it with your spine.',
      severe: 'Stop! Your head is too far forward. Risk of neck strain.',
    },
    priority: 7,
  },

  // Rounded shoulders
  'rounded_shoulders': {
    mlLabel: 'rounded_shoulders',
    corrections: {
      mild: 'Roll your shoulders back',
      moderate: 'Roll your shoulders back and down. Open your chest.',
      severe: 'Stop! Fix your shoulder position to prevent injury.',
    },
    priority: 6,
  },

  // Knee valgus (knees caving in)
  'knee_valgus': {
    mlLabel: 'knee_valgus',
    corrections: {
      mild: 'Push your knees out slightly',
      moderate: 'Push your knees outward. Keep them aligned with your toes.',
      severe: 'Stop! Your knees are caving in. Risk of knee injury!',
    },
    priority: 9,
  },

  // Excessive arch (lower back)
  'excessive_arch': {
    mlLabel: 'excessive_arch',
    corrections: {
      mild: 'Engage your core slightly',
      moderate: 'Engage your core. Reduce the arch in your lower back.',
      severe: 'Stop! Too much arch in your back. Risk of lower back injury!',
    },
    priority: 8,
  },

  // Hip shift
  'hip_shift': {
    mlLabel: 'hip_shift',
    corrections: {
      mild: 'Center your hips',
      moderate: 'Center your hips. Distribute weight evenly.',
      severe: 'Stop! Your hips are shifted. Risk of imbalance!',
    },
    priority: 7,
  },

  // Elbow flare
  'elbow_flare': {
    mlLabel: 'elbow_flare',
    corrections: {
      mild: 'Tuck your elbows in slightly',
      moderate: 'Tuck your elbows closer to your body.',
      severe: 'Stop! Your elbows are flaring out. Risk of shoulder strain!',
    },
    priority: 6,
  },

  // Locked knees
  'locked_knees': {
    mlLabel: 'locked_knees',
    corrections: {
      mild: 'Soften your knees slightly',
      moderate: 'Unlock your knees. Keep a slight bend.',
      severe: 'Stop! Your knees are locked. Risk of knee injury!',
    },
    priority: 8,
  },

  // Weight on toes
  'weight_forward': {
    mlLabel: 'weight_forward',
    corrections: {
      mild: 'Shift weight to your heels',
      moderate: 'Shift your weight back. Balance on your whole foot.',
      severe: 'Stop! Too much weight on your toes. Risk of falling forward!',
    },
    priority: 7,
  },

  // Asymmetric stance
  'asymmetric': {
    mlLabel: 'asymmetric',
    corrections: {
      mild: 'Balance your stance',
      moderate: 'Balance your stance. Distribute weight evenly on both sides.',
      severe: 'Stop! Your stance is very uneven. Risk of injury!',
    },
    priority: 7,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// POSTURE CORRECTION MANAGER
// ═══════════════════════════════════════════════════════════════════════════

class PostureCorrectionManager {
  private lastCorrectionTime = new Map<string, number>();
  private cooldownPeriod = 5000; // 5 seconds between same correction
  private severityCooldowns = {
    mild: 8000,      // 8 seconds
    moderate: 5000,  // 5 seconds
    severe: 2000,    // 2 seconds (more urgent)
  };

  /**
   * Set cooldown period for corrections
   */
  setCooldown(ms: number) {
    this.cooldownPeriod = ms;
  }

  /**
   * Check if correction is in cooldown
   */
  private isInCooldown(label: string, severity: PostureSeverity): boolean {
    const lastTime = this.lastCorrectionTime.get(label) || 0;
    const cooldown = this.severityCooldowns[severity];
    return Date.now() - lastTime < cooldown;
  }

  /**
   * Set cooldown for a correction
   */
  private setCooldownTimer(label: string) {
    this.lastCorrectionTime.set(label, Date.now());
  }

  /**
   * Process ML model prediction and trigger correction
   */
  processMLPrediction(
    label: string,
    confidence: number,
    customCorrection?: string
  ): boolean {
    // Get posture rule
    const rule = POSTURE_RULES[label];
    if (!rule) {
      console.warn(`⚠️ Unknown posture label: ${label}`);
      return false;
    }

    // Determine severity based on confidence
    const severity: PostureSeverity = 
      confidence >= 0.9 ? 'severe' :
      confidence >= 0.7 ? 'moderate' : 'mild';

    // Check cooldown
    if (this.isInCooldown(label, severity)) {
      return false;
    }

    // Get correction message
    const correction = customCorrection || rule.corrections[severity];

    // Speak correction
    speakPostureCorrection(correction, severity);

    // Set cooldown
    this.setCooldownTimer(label);

    // Log
    console.log(`🔊 Posture correction: ${label} (${severity}) - "${correction}"`);

    return true;
  }

  /**
   * Process multiple ML predictions (batch)
   */
  processBatchPredictions(
    predictions: Array<{ label: string; confidence: number }>
  ): void {
    // Sort by priority and confidence
    const sorted = predictions
      .map(pred => ({
        ...pred,
        rule: POSTURE_RULES[pred.label],
      }))
      .filter(pred => pred.rule) // Only known labels
      .sort((a, b) => {
        // Sort by priority first, then confidence
        if (a.rule.priority !== b.rule.priority) {
          return b.rule.priority - a.rule.priority;
        }
        return b.confidence - a.confidence;
      });

    // Process highest priority correction only
    if (sorted.length > 0) {
      const top = sorted[0];
      this.processMLPrediction(top.label, top.confidence);
    }
  }

  /**
   * Add custom posture rule
   */
  addCustomRule(label: string, rule: PostureRule): void {
    POSTURE_RULES[label] = rule;
    console.log(`✅ Added custom posture rule: ${label}`);
  }

  /**
   * Get all posture rules
   */
  getAllRules(): Record<string, PostureRule> {
    return { ...POSTURE_RULES };
  }

  /**
   * Clear all cooldowns (for testing)
   */
  clearCooldowns(): void {
    this.lastCorrectionTime.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const postureCorrector = new PostureCorrectionManager();

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick correction for common issues
 */
export function correctPosture(label: string, confidence = 0.8) {
  return postureCorrector.processMLPrediction(label, confidence);
}

/**
 * Batch process ML model output
 */
export function correctPostureBatch(
  predictions: Array<{ label: string; confidence: number }>
) {
  postureCorrector.processBatchPredictions(predictions);
}

export default postureCorrector;
