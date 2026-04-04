/**
 * Exercise Sequence Manager
 * 
 * Manages exercise steps, audio cues, and progression logic
 */

import { voiceEngine, speakStep, speakEncouragement } from './voiceGuidance';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExerciseStep {
  id: string;
  text: string;
  duration?: number;        // Duration in seconds (optional)
  audioText?: string;       // Custom audio text (if different from display text)
  holdTime?: number;        // Hold time in seconds
  repetitions?: number;     // Number of reps for this step
  nextStepDelay?: number;   // Delay before next step (ms)
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;         // Total duration in seconds
  steps: ExerciseStep[];
  warmupSteps?: ExerciseStep[];
  cooldownSteps?: ExerciseStep[];
}

export interface ExerciseProgress {
  exerciseId: string;
  currentStepIndex: number;
  completedSteps: string[];
  startTime: number;
  elapsedTime: number;
  isPaused: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXERCISE SEQUENCE MANAGER
// ═══════════════════════════════════════════════════════════════════════════

class ExerciseSequenceManager {
  private exercises = new Map<string, Exercise>();
  private currentExercise: Exercise | null = null;
  private progress: ExerciseProgress | null = null;
  private stepTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private onStepChangeCallback?: (step: ExerciseStep, index: number) => void;
  private onCompleteCallback?: () => void;

  /**
   * Load exercises from JSON
   */
  async loadExercises(jsonPath: string): Promise<void> {
    try {
      const response = await fetch(jsonPath);
      const data = await response.json();
      
      if (Array.isArray(data.exercises)) {
        data.exercises.forEach((exercise: Exercise) => {
          this.exercises.set(exercise.id, exercise);
        });
        console.log(`✅ Loaded ${this.exercises.size} exercises`);
      } else {
        console.error('❌ Invalid exercise JSON format');
      }
    } catch (error) {
      console.error('❌ Failed to load exercises:', error);
      throw error;
    }
  }

  /**
   * Load exercises from object
   */
  loadExercisesFromObject(exercises: Exercise[]): void {
    exercises.forEach(exercise => {
      this.exercises.set(exercise.id, exercise);
    });
    console.log(`✅ Loaded ${this.exercises.size} exercises`);
  }

  /**
   * Get exercise by ID
   */
  getExercise(id: string): Exercise | undefined {
    return this.exercises.get(id);
  }

  /**
   * Get all exercises
   */
  getAllExercises(): Exercise[] {
    return Array.from(this.exercises.values());
  }

  /**
   * Start an exercise
   */
  startExercise(
    exerciseId: string,
    onStepChange?: (step: ExerciseStep, index: number) => void,
    onComplete?: () => void
  ): boolean {
    const exercise = this.exercises.get(exerciseId);
    if (!exercise) {
      console.error(`❌ Exercise not found: ${exerciseId}`);
      return false;
    }

    this.currentExercise = exercise;
    this.onStepChangeCallback = onStepChange;
    this.onCompleteCallback = onComplete;

    this.progress = {
      exerciseId,
      currentStepIndex: 0,
      completedSteps: [],
      startTime: Date.now(),
      elapsedTime: 0,
      isPaused: false,
    };

    // Speak intro
    voiceEngine.speak({
      text: `Starting ${exercise.name}. ${exercise.description}`,
      priority: 'high',
      emotion: 'encouraging',
    });

    // Start first step after intro
    setTimeout(() => {
      this.executeStep(0);
    }, 3000);

    return true;
  }

  /**
   * Execute a specific step
   */
  private executeStep(stepIndex: number) {
    if (!this.currentExercise || !this.progress) return;

    const allSteps = [
      ...(this.currentExercise.warmupSteps || []),
      ...this.currentExercise.steps,
      ...(this.currentExercise.cooldownSteps || []),
    ];

    if (stepIndex >= allSteps.length) {
      this.completeExercise();
      return;
    }

    const step = allSteps[stepIndex];
    this.progress.currentStepIndex = stepIndex;

    // Notify callback
    if (this.onStepChangeCallback) {
      this.onStepChangeCallback(step, stepIndex);
    }

    // Speak step
    const audioText = step.audioText || step.text;
    speakStep(audioText, stepIndex + 1);

    // Handle step with duration
    if (step.duration) {
      this.startStepCountdown(step, stepIndex);
    }
    // Handle step with hold time
    else if (step.holdTime) {
      this.startHoldCountdown(step, stepIndex);
    }
    // Handle step with repetitions
    else if (step.repetitions) {
      // Manual progression - wait for external trigger
      console.log(`ℹ️ Step ${stepIndex + 1}: Waiting for ${step.repetitions} reps`);
    }
    // Auto-advance to next step
    else {
      const delay = step.nextStepDelay || 3000;
      this.stepTimer = setTimeout(() => {
        this.nextStep();
      }, delay);
    }
  }

  /**
   * Start countdown for timed step
   */
  private startStepCountdown(step: ExerciseStep, stepIndex: number) {
    if (!step.duration) return;

    let remaining = step.duration;

    const countdown = () => {
      if (remaining <= 0) {
        this.nextStep();
        return;
      }

      // Speak countdown at specific intervals
      if (remaining === 10 || remaining === 5 || remaining <= 3) {
        voiceEngine.speak({
          text: `${remaining}`,
          priority: 'normal',
          emotion: 'neutral',
        });
      }

      remaining--;
      this.countdownTimer = setTimeout(countdown, 1000);
    };

    countdown();
  }

  /**
   * Start countdown for hold step
   */
  private startHoldCountdown(step: ExerciseStep, stepIndex: number) {
    if (!step.holdTime) return;

    voiceEngine.speak({
      text: `Hold for ${step.holdTime} seconds`,
      priority: 'normal',
      emotion: 'neutral',
    });

    let remaining = step.holdTime;

    const countdown = () => {
      if (remaining <= 0) {
        voiceEngine.speak({
          text: 'Good! Release.',
          priority: 'normal',
          emotion: 'encouraging',
        });
        setTimeout(() => this.nextStep(), 2000);
        return;
      }

      if (remaining <= 3) {
        voiceEngine.speak({
          text: `${remaining}`,
          priority: 'normal',
          emotion: 'neutral',
        });
      }

      remaining--;
      this.countdownTimer = setTimeout(countdown, 1000);
    };

    countdown();
  }

  /**
   * Move to next step
   */
  nextStep() {
    if (!this.progress) return;

    // Clear timers
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    // Mark current step as completed
    if (this.currentExercise) {
      const allSteps = [
        ...(this.currentExercise.warmupSteps || []),
        ...this.currentExercise.steps,
        ...(this.currentExercise.cooldownSteps || []),
      ];
      const currentStep = allSteps[this.progress.currentStepIndex];
      if (currentStep) {
        this.progress.completedSteps.push(currentStep.id);
      }
    }

    // Execute next step
    this.executeStep(this.progress.currentStepIndex + 1);
  }

  /**
   * Complete exercise
   */
  private completeExercise() {
    if (!this.currentExercise) return;

    voiceEngine.speak({
      text: `Excellent work! You've completed ${this.currentExercise.name}. Great job!`,
      priority: 'high',
      emotion: 'encouraging',
    });

    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }

    this.reset();
  }

  /**
   * Pause exercise
   */
  pause() {
    if (!this.progress) return;

    this.progress.isPaused = true;

    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    voiceEngine.speak({
      text: 'Exercise paused',
      priority: 'normal',
      emotion: 'neutral',
    });
  }

  /**
   * Resume exercise
   */
  resume() {
    if (!this.progress || !this.progress.isPaused) return;

    this.progress.isPaused = false;

    voiceEngine.speak({
      text: 'Resuming exercise',
      priority: 'normal',
      emotion: 'neutral',
    });

    // Resume current step
    this.executeStep(this.progress.currentStepIndex);
  }

  /**
   * Stop exercise
   */
  stop() {
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }

    voiceEngine.speak({
      text: 'Exercise stopped',
      priority: 'normal',
      emotion: 'neutral',
    });

    this.reset();
  }

  /**
   * Reset manager
   */
  private reset() {
    this.currentExercise = null;
    this.progress = null;
    this.onStepChangeCallback = undefined;
    this.onCompleteCallback = undefined;
  }

  /**
   * Get current progress
   */
  getProgress(): ExerciseProgress | null {
    return this.progress;
  }

  /**
   * Get current step
   */
  getCurrentStep(): ExerciseStep | null {
    if (!this.currentExercise || !this.progress) return null;

    const allSteps = [
      ...(this.currentExercise.warmupSteps || []),
      ...this.currentExercise.steps,
      ...(this.currentExercise.cooldownSteps || []),
    ];

    return allSteps[this.progress.currentStepIndex] || null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

export const exerciseManager = new ExerciseSequenceManager();

export default exerciseManager;
