/**
 * Voice-Guided Exercise Component
 * 
 * Complete example showing how to integrate all voice guidance features
 */

"use client";

import { useEffect, useState, useCallback } from 'react';
import { voiceEngine } from '@/lib/voiceGuidance';
import { exerciseManager, type ExerciseStep } from '@/lib/exerciseSequence';
import { postureCorrector, correctPosture } from '@/lib/postureCorrection';

interface Props {
  exerciseId: string;
  onComplete?: () => void;
}

export default function VoiceGuidedExercise({ exerciseId, onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState<ExerciseStep | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Load exercises on mount
  useEffect(() => {
    const loadExercises = async () => {
      try {
        await exerciseManager.loadExercises('/exercises.json');
        console.log('✅ Exercises loaded');
      } catch (error) {
        console.error('❌ Failed to load exercises:', error);
      }
    };

    loadExercises();
  }, []);

  // Start exercise
  const startExercise = useCallback(() => {
    const success = exerciseManager.startExercise(
      exerciseId,
      (step, index) => {
        setCurrentStep(step);
        setStepIndex(index);
      },
      () => {
        setIsActive(false);
        if (onComplete) onComplete();
      }
    );

    if (success) {
      setIsActive(true);
      setIsPaused(false);
    }
  }, [exerciseId, onComplete]);

  // Pause/Resume
  const togglePause = useCallback(() => {
    if (isPaused) {
      exerciseManager.resume();
      setIsPaused(false);
    } else {
      exerciseManager.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  // Stop exercise
  const stopExercise = useCallback(() => {
    exerciseManager.stop();
    setIsActive(false);
    setIsPaused(false);
    setCurrentStep(null);
  }, []);

  // Simulate ML model prediction (replace with your actual ML model)
  const simulateMLPrediction = useCallback(() => {
    // Example: Your ML model detects slouching
    const predictions = [
      { label: 'slouch', confidence: 0.85 },
      { label: 'forward_head', confidence: 0.65 },
    ];

    // Process predictions
    postureCorrector.processBatchPredictions(predictions);
  }, []);

  // Example: Trigger posture correction based on ML model
  useEffect(() => {
    if (!isActive) return;

    // Simulate ML model running every 2 seconds
    const interval = setInterval(() => {
      // In real app, this would be your ML model output
      const randomIssue = Math.random();
      
      if (randomIssue > 0.7) {
        // Simulate detecting a posture issue
        const issues = ['slouch', 'forward_head', 'rounded_shoulders', 'knee_valgus'];
        const randomLabel = issues[Math.floor(Math.random() * issues.length)];
        const confidence = 0.7 + Math.random() * 0.3; // 0.7 to 1.0
        
        correctPosture(randomLabel, confidence);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="voice-guided-exercise" style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif',
    }}>
      <h2 style={{ marginBottom: '20px' }}>Voice-Guided Exercise</h2>

      {/* Current Step Display */}
      {currentStep && (
        <div style={{
          background: '#f0f0f0',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <h3 style={{ marginBottom: '10px' }}>
            Step {stepIndex + 1}
          </h3>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>
            {currentStep.text}
          </p>
          {currentStep.duration && (
            <p style={{ color: '#666', fontSize: '14px' }}>
              Duration: {currentStep.duration}s
            </p>
          )}
          {currentStep.holdTime && (
            <p style={{ color: '#666', fontSize: '14px' }}>
              Hold: {currentStep.holdTime}s
            </p>
          )}
          {currentStep.repetitions && (
            <p style={{ color: '#666', fontSize: '14px' }}>
              Repetitions: {currentStep.repetitions}
            </p>
          )}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {!isActive ? (
          <button
            onClick={startExercise}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#0fffc5',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ▶ Start Exercise
          </button>
        ) : (
          <>
            <button
              onClick={togglePause}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: isPaused ? '#0fffc5' : '#ffa500',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={stopExercise}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: '#ff4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              ■ Stop
            </button>
          </>
        )}
      </div>

      {/* Test Buttons */}
      <div style={{
        background: '#f9f9f9',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '20px',
      }}>
        <h4 style={{ marginBottom: '10px' }}>Test Voice Features:</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => voiceEngine.speak({
              text: 'This is a test of the voice guidance system',
              priority: 'normal',
              emotion: 'neutral',
            })}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: '#e0e0e0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            🔊 Test Voice
          </button>
          <button
            onClick={() => correctPosture('slouch', 0.85)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: '#e0e0e0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ⚠️ Test Posture Correction
          </button>
          <button
            onClick={simulateMLPrediction}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: '#e0e0e0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            🤖 Simulate ML Prediction
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: '#e8f4f0',
        borderRadius: '8px',
        fontSize: '14px',
      }}>
        <h4 style={{ marginBottom: '10px' }}>How it works:</h4>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Click "Start Exercise" to begin voice-guided steps</li>
          <li>Listen to audio instructions for each step</li>
          <li>Posture corrections will be spoken automatically</li>
          <li>3-5 second cooldown prevents audio overlap</li>
          <li>Critical corrections interrupt current speech</li>
        </ul>
      </div>
    </div>
  );
}
