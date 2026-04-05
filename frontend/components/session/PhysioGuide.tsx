"use client";
import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Sphere } from "@react-three/drei";
import * as THREE from "three";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Expression = "happy" | "concerned" | "encouraging" | "warning" | "celebrating";
type Gesture = "idle" | "wave" | "thumbsup" | "pointLeft" | "clap" | "exercise";

interface Props {
  exercise: string;
  isActive: boolean;
  repCount: number;
  feedback: { message: string; status: string } | null;
  formScore: number | null;
  demoMode?: boolean;
  onDemoComplete?: () => void;
  detailedFeedback?: {
    joint: string;
    currentAngle: number;
    targetAngle: number;
    deviation: number;
    correction: string;
  } | null;
}

const SKIN  = "#E8B89A";
const HAIR  = "#3D2314";
const SHIRT = "#3B82F6";   // brighter blue — visible under lighting
const PANTS = "#4B6FA8";   // medium blue — not black
const SHOES = "#4A4A6A";   // dark purple-grey — visible

// ── Enhanced Voice engine with debugging and voice loading ──────
let speakTimer: ReturnType<typeof setTimeout> | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let voicesLoaded = false;

function speak(text: string, emotion: "happy" | "warning" | "encouraging" | "neutral" = "neutral", onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("❌ Speech synthesis not available");
    return;
  }
  
  // Cancel any ongoing speech
  if (speakTimer) clearTimeout(speakTimer);
  window.speechSynthesis.cancel();
  
  // Small delay so cancel() takes effect
  speakTimer = setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    currentUtterance = u;
    
    // AUDIO ENHANCEMENT: Better voice parameters for each emotion
    switch (emotion) {
      case "happy":
        u.rate = 1.15;
        u.pitch = 1.35;
        u.volume = 1.0;
        break;
      case "warning":
        u.rate = 0.85;
        u.pitch = 0.75;
        u.volume = 1.0;
        break;
      case "encouraging":
        u.rate = 1.1;
        u.pitch = 1.25;
        u.volume = 1.0;
        break;
      default:
        u.rate = 1.0;
        u.pitch = 1.0;
        u.volume = 1.0;
    }
    
    // Pick the best available voice
    const voices = window.speechSynthesis.getVoices();
    
    // If no voices loaded yet, retry
    if (voices.length === 0 && !voicesLoaded) {
      console.warn("⚠️ No voices available yet. Retrying in 100ms...");
      setTimeout(() => speak(text, emotion, onEnd), 100);
      return;
    }
    
    const preferred = 
      voices.find(v => v.name.includes("Samantha") && v.lang.startsWith("en")) || // Mac - natural female
      voices.find(v => v.name.includes("Google") && v.lang.startsWith("en-US")) || // Chrome - Google voices
      voices.find(v => v.name.includes("Microsoft Zira") && v.lang.startsWith("en")) || // Windows - Zira
      voices.find(v => v.lang.startsWith("en-US") && v.name.includes("Female")) ||
      voices.find(v => v.lang.startsWith("en-US")) ||
      voices[0];
    
    if (preferred) {
      u.voice = preferred;
      console.log(`🔊 Speaking with voice: ${preferred.name}`);
    } else {
      console.warn("⚠️ No preferred voice found, using default");
    }
    
    if (onEnd) u.onend = onEnd;
    u.onerror = (error: SpeechSynthesisErrorEvent) => {
      // Common errors: "interrupted", "canceled", "audio-busy", "network"
      const errorType = error.error;
      
      if (errorType === "interrupted" || errorType === "canceled") {
        // These are normal when speech is interrupted by new speech
        console.log(`ℹ️ Speech ${errorType}: "${text.substring(0, 30)}..."`);
      } else {
        console.error("❌ Speech synthesis error:", {
          error: error.error,
          message: error.message,
          type: error.type,
          text: text.substring(0, 50)
        });
      }
      
      if (onEnd) onEnd();
    };
    
    u.onstart = () => {
      console.log(`🔊 Started speaking: "${text.substring(0, 50)}..." (${emotion})`);
    };
    
    window.speechSynthesis.speak(u);
  }, 80);
}

function Humanoid({
  expression,
  gesture,
  exercise,
  headShake,
  speaking,
}: {
  expression: Expression;
  gesture: Gesture;
  exercise: string;
  headShake: boolean;
  speaking: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const rArmRef = useRef<THREE.Group>(null);
  const lArmRef = useRef<THREE.Group>(null);
  const rForeRef = useRef<THREE.Group>(null);
  const lForeRef = useRef<THREE.Group>(null);
  const rLegRef = useRef<THREE.Group>(null);
  const lLegRef = useRef<THREE.Group>(null);
  const rShinRef = useRef<THREE.Group>(null);
  const lShinRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const lBrowRef = useRef<THREE.Mesh>(null);
  const rBrowRef = useRef<THREE.Mesh>(null);
  // Eyelid refs for blinking
  const lEyeLidRef = useRef<THREE.Mesh>(null);
  const rEyeLidRef = useRef<THREE.Mesh>(null);

  const t = useRef(0);
  const nextBlink = useRef(3.0); // seconds until next blink

  useFrame((_, delta) => {
    t.current += delta;
    const time = t.current;

    // Head shake / nod
    if (headRef.current) {
      headRef.current.rotation.y = headShake
        ? Math.sin(time * 12) * 0.3
        : lerp(headRef.current.rotation.y, 0, 0.1);
      // Celebrate tilt
      headRef.current.rotation.z = expression === "celebrating"
        ? Math.sin(time * 3) * 0.15
        : lerp(headRef.current.rotation.z, 0, 0.1);
      // Nod when happy/encouraging
      headRef.current.rotation.x = (expression === "happy" || expression === "encouraging")
        ? Math.sin(time * 2) * 0.06
        : lerp(headRef.current.rotation.x, 0, 0.08);
    }

    // Blinking — natural random blink every 3-6s
    if (lEyeLidRef.current && rEyeLidRef.current) {
      const blinkPhase = (time % nextBlink.current) / nextBlink.current;
      const blinkOpen = blinkPhase > 0.97 ? Math.sin((blinkPhase - 0.97) / 0.03 * Math.PI) : 0;
      const lidY = blinkOpen * 0.075;
      lEyeLidRef.current.scale.y = 1 - blinkOpen * 0.9;
      rEyeLidRef.current.scale.y = 1 - blinkOpen * 0.9;
      if (blinkPhase > 0.99) nextBlink.current = 3 + Math.random() * 3;
    }

    // Mouth — speaking animation + expression shape
    if (mouthRef.current) {
      const s = mouthRef.current.scale;
      const speakMod = speaking ? Math.abs(Math.sin(time * 12)) * 0.4 : 0;
      if (expression === "happy" || expression === "celebrating") {
        s.x = lerp(s.x, 1.3, 0.12); s.y = lerp(s.y, 0.6 + speakMod, 0.12);
      } else if (expression === "encouraging") {
        s.x = lerp(s.x, 1.5, 0.12); s.y = lerp(s.y, 0.8 + speakMod, 0.12);
      } else if (expression === "warning") {
        s.x = lerp(s.x, 0.9, 0.12); s.y = lerp(s.y, 0.3 + speakMod, 0.12);
      } else {
        s.x = lerp(s.x, 1.0, 0.12); s.y = lerp(s.y, 0.4 + speakMod, 0.12);
      }
    }

    // Eyebrows
    if (lBrowRef.current && rBrowRef.current) {
      const by = expression === "warning" ? -0.02 : expression === "encouraging" || expression === "celebrating" ? 0.06 : 0;
      const lrz = expression === "concerned" || expression === "warning" ? 0.2 : 0;
      lBrowRef.current.position.y = lerp(lBrowRef.current.position.y, 0.18 + by, 0.1);
      rBrowRef.current.position.y = lerp(rBrowRef.current.position.y, 0.18 + by, 0.1);
      lBrowRef.current.rotation.z = lerp(lBrowRef.current.rotation.z, lrz, 0.1);
      rBrowRef.current.rotation.z = lerp(rBrowRef.current.rotation.z, -lrz, 0.1);
    }

    // GESTURE ENHANCEMENT: More expressive and natural animations
    const rArm = rArmRef.current;
    const lArm = lArmRef.current;
    const rFore = rForeRef.current;
    const lFore = lForeRef.current;

    if (gesture === "wave" && rArm && rFore) {
      // More enthusiastic wave
      rArm.rotation.z = lerp(rArm.rotation.z, -1.3 + Math.sin(time * 5) * 0.5, 0.18);
      rArm.rotation.x = lerp(rArm.rotation.x, 0.2, 0.12);
      rFore.rotation.x = lerp(rFore.rotation.x, Math.sin(time * 5) * 0.6, 0.18);
    } else if (gesture === "thumbsup" && rArm && rFore) {
      // Confident thumbs up with slight bounce
      rArm.rotation.z = lerp(rArm.rotation.z, -1.5 + Math.sin(time * 2) * 0.1, 0.12);
      rArm.rotation.x = lerp(rArm.rotation.x, -0.4, 0.12);
      rFore.rotation.x = lerp(rFore.rotation.x, 0.1, 0.12);
    } else if (gesture === "pointLeft" && lArm && lFore) {
      // Pointing with emphasis
      lArm.rotation.z = lerp(lArm.rotation.z, 1.3, 0.12);
      lArm.rotation.x = lerp(lArm.rotation.x, -0.4, 0.12);
      lFore.rotation.x = lerp(lFore.rotation.x, 0.4, 0.12);
      // Add slight bob
      if (lArm) lArm.position.y = 1.6 + Math.sin(time * 3) * 0.03;
    } else if (gesture === "clap" && rArm && lArm) {
      // Energetic clapping
      const clap = Math.abs(Math.sin(time * 5)) * 0.6;
      rArm.rotation.z = lerp(rArm.rotation.z, -0.6 - clap, 0.2);
      lArm.rotation.z = lerp(lArm.rotation.z, 0.6 + clap, 0.2);
      rArm.rotation.x = lerp(rArm.rotation.x, 0.6, 0.15);
      lArm.rotation.x = lerp(lArm.rotation.x, 0.6, 0.15);
    } else if (gesture === "exercise") {
      animateExercise(exercise, time, rArm, lArm, rFore, lFore, rLegRef.current, lLegRef.current, rShinRef.current, lShinRef.current);
    } else {
      // Idle with natural breathing motion in arms
      if (rArm) { 
        rArm.rotation.z = lerp(rArm.rotation.z, -0.15 + Math.sin(time * 1.2) * 0.02, 0.05); 
        rArm.rotation.x = lerp(rArm.rotation.x, Math.sin(time * 1.2) * 0.03, 0.05);
        rArm.position.y = 1.6;
      }
      if (lArm) { 
        lArm.rotation.z = lerp(lArm.rotation.z, 0.15 - Math.sin(time * 1.2) * 0.02, 0.05); 
        lArm.rotation.x = lerp(lArm.rotation.x, Math.sin(time * 1.2) * 0.03, 0.05);
        lArm.position.y = 1.6;
      }
      if (rFore) rFore.rotation.x = lerp(rFore.rotation.x, 0, 0.05);
      if (lFore) lFore.rotation.x = lerp(lFore.rotation.x, 0, 0.05);
    }

    // Idle body sway + breathing
    if (rootRef.current) {
      // Breathing — chest rises
      rootRef.current.scale.y = 1 + Math.sin(time * 1.2) * 0.008;
      // Weight shift side to side when idle
      if (gesture === "idle") {
        rootRef.current.rotation.y = Math.sin(time * 0.4) * 0.06;
        rootRef.current.position.x = Math.sin(time * 0.4) * 0.02;
      }
    }
  });

  function animateExercise(
    ex: string, time: number,
    rA: THREE.Group | null, lA: THREE.Group | null,
    rF: THREE.Group | null, lF: THREE.Group | null,
    rL: THREE.Group | null, lL: THREE.Group | null,
    rS: THREE.Group | null, lS: THREE.Group | null
  ) {
    // EXERCISE ANIMATION ENHANCEMENT: More realistic and smooth movements
    const s = Math.sin(time * 1.8); // Slightly slower for realism
    const phase = (s + 1) / 2; // 0 to 1
    
    if (ex === "squat") {
      // Realistic squat with hip hinge
      const depth = 0.5 + phase * 0.5; // 0.5 to 1.0
      if (rL) rL.rotation.x = lerp(rL.rotation.x, -0.7 * depth, 0.12);
      if (lL) lL.rotation.x = lerp(lL.rotation.x, -0.7 * depth, 0.12);
      if (rS) rS.rotation.x = lerp(rS.rotation.x, 0.9 * depth, 0.12);
      if (lS) lS.rotation.x = lerp(lS.rotation.x, 0.9 * depth, 0.12);
      // Arms forward for balance
      if (rA) rA.rotation.x = lerp(rA.rotation.x, 0.6 * depth, 0.12);
      if (lA) lA.rotation.x = lerp(lA.rotation.x, 0.6 * depth, 0.12);
    } else if (ex === "knee_left" || ex.includes("knee")) {
      // Knee raise with hip flexion
      const lift = Math.max(0, s) * 0.8;
      if (lL) lL.rotation.x = lerp(lL.rotation.x, lift, 0.12);
      if (lS) lS.rotation.x = lerp(lS.rotation.x, lift * 1.3, 0.12);
      // Opposite arm swing
      if (rA) rA.rotation.x = lerp(rA.rotation.x, lift * 0.5, 0.12);
    } else if (ex === "shoulder_press" || ex.includes("shoulder")) {
      // Shoulder press with full ROM
      const press = Math.max(0, s);
      if (lA) lA.rotation.z = lerp(lA.rotation.z, 0.4 + press * 1.3, 0.12);
      if (rA) rA.rotation.z = lerp(rA.rotation.z, -0.4 - press * 1.3, 0.12);
      if (lF) lF.rotation.x = lerp(lF.rotation.x, -press * 0.6, 0.12);
      if (rF) rF.rotation.x = lerp(rF.rotation.x, -press * 0.6, 0.12);
    } else if (ex === "bicep_curl" || ex.includes("elbow")) {
      // Bicep curl with controlled motion
      const curl = (Math.sin(time * 2) + 1) / 2; // 0 to 1
      if (rA) rA.rotation.x = lerp(rA.rotation.x, -0.3, 0.12);
      if (lA) lA.rotation.x = lerp(lA.rotation.x, -0.3, 0.12);
      if (rF) rF.rotation.x = lerp(rF.rotation.x, curl * 2.2, 0.15);
      if (lF) lF.rotation.x = lerp(lF.rotation.x, curl * 2.2, 0.15);
    } else if (ex === "hip_abduction" || ex.includes("hip")) {
      // Hip abduction (leg raise to side)
      const abduct = Math.max(0, s) * 0.7;
      if (lL) lL.rotation.z = lerp(lL.rotation.z, abduct, 0.12);
      // Balance shift
      if (rA) rA.rotation.z = lerp(rA.rotation.z, -0.3 - abduct * 0.3, 0.12);
    } else if (ex === "lunge") {
      // Lunge with alternating legs
      const forward = s > 0;
      if (forward) {
        if (rL) rL.rotation.x = lerp(rL.rotation.x, -0.8 * phase, 0.12);
        if (lL) lL.rotation.x = lerp(lL.rotation.x, 0.4 * phase, 0.12);
      } else {
        if (lL) lL.rotation.x = lerp(lL.rotation.x, -0.8 * (1 - phase), 0.12);
        if (rL) rL.rotation.x = lerp(rL.rotation.x, 0.4 * (1 - phase), 0.12);
      }
    } else if (ex === "wrist_rotation" || ex.includes("wrist")) {
      // Wrist rotation — forearms extend forward, hands rotate in circles
      const rot = time * 2.5;
      // Arms held out in front
      if (rA) rA.rotation.x = lerp(rA.rotation.x, 0.8, 0.12);
      if (lA) lA.rotation.x = lerp(lA.rotation.x, 0.8, 0.12);
      // Forearms with circular wrist rotation
      if (rF) {
        rF.rotation.x = lerp(rF.rotation.x, 0.3 + Math.sin(rot) * 0.6, 0.15);
        rF.rotation.z = lerp(rF.rotation.z, Math.cos(rot) * 0.4, 0.15);
      }
      if (lF) {
        lF.rotation.x = lerp(lF.rotation.x, 0.3 + Math.sin(rot + Math.PI) * 0.6, 0.15);
        lF.rotation.z = lerp(lF.rotation.z, Math.cos(rot + Math.PI) * 0.4, 0.15);
      }
    } else if (ex === "ankle_circles" || ex.includes("ankle")) {
      // Ankle circles — one leg raised, foot rotates
      const rot = time * 2;
      // Raise left leg
      if (lL) lL.rotation.x = lerp(lL.rotation.x, 0.5, 0.12);
      if (lS) {
        lS.rotation.x = lerp(lS.rotation.x, 0.7 + Math.sin(rot) * 0.3, 0.15);
        lS.rotation.z = lerp(lS.rotation.z, Math.cos(rot) * 0.25, 0.15);
      }
      // Balance arms
      if (rA) rA.rotation.z = lerp(rA.rotation.z, -0.5, 0.12);
      if (lA) lA.rotation.z = lerp(lA.rotation.z, 0.5, 0.12);
    } else if (ex === "finger_flexion" || ex.includes("finger")) {
      // Finger flexion — arms extend forward, forearms open/close (mimicking fingers)
      const grip = (Math.sin(time * 2.2) + 1) / 2; // 0 to 1
      // Arms held out
      if (rA) rA.rotation.x = lerp(rA.rotation.x, 0.6, 0.12);
      if (lA) lA.rotation.x = lerp(lA.rotation.x, 0.6, 0.12);
      // Forearms simulate finger opening/closing
      if (rF) rF.rotation.x = lerp(rF.rotation.x, grip * 1.8, 0.15);
      if (lF) lF.rotation.x = lerp(lF.rotation.x, grip * 1.8, 0.15);
      // Slight arm rotation to show wrist engagement
      if (rA) rA.rotation.z = lerp(rA.rotation.z, -0.2 + Math.sin(time * 1.5) * 0.1, 0.12);
      if (lA) lA.rotation.z = lerp(lA.rotation.z, 0.2 - Math.sin(time * 1.5) * 0.1, 0.12);
    } else {
      // Default: full body movement with arm swings
      if (rA) rA.rotation.x = lerp(rA.rotation.x, s * 0.6, 0.12);
      if (lA) lA.rotation.x = lerp(lA.rotation.x, -s * 0.6, 0.12);
      if (rL) rL.rotation.x = lerp(rL.rotation.x, -s * 0.3, 0.12);
      if (lL) lL.rotation.x = lerp(lL.rotation.x, s * 0.3, 0.12);
    }
  }

  const mat = (color: string) => <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />;

  return (
    <group ref={rootRef} position={[0, -0.8, 0]}>
      {/* Torso */}
      <RoundedBox args={[0.7, 0.9, 0.35]} radius={0.06} position={[0, 1.35, 0]}>{mat(SHIRT)}</RoundedBox>
      {/* Hips */}
      <RoundedBox args={[0.65, 0.3, 0.32]} radius={0.05} position={[0, 0.88, 0]}>{mat(PANTS)}</RoundedBox>
      {/* Neck */}
      <RoundedBox args={[0.18, 0.2, 0.18]} radius={0.04} position={[0, 1.87, 0]}>{mat(SKIN)}</RoundedBox>

      {/* Head */}
      <group ref={headRef} position={[0, 2.15, 0]}>
        <RoundedBox args={[0.55, 0.6, 0.5]} radius={0.1}>{mat(SKIN)}</RoundedBox>
        {/* Hair */}
        <RoundedBox args={[0.57, 0.22, 0.52]} radius={0.08} position={[0, 0.22, 0]}>{mat(HAIR)}</RoundedBox>
        {/* Eyes with blinking eyelids */}
        {[-0.13, 0.13].map((x, i) => (
          <group key={i} position={[x, 0.05, 0.26]}>
            <Sphere args={[0.075, 12, 12]}><meshStandardMaterial color="white" /></Sphere>
            <Sphere args={[0.045, 10, 10]} position={[0, 0, 0.04]}><meshStandardMaterial color="#4A90D9" /></Sphere>
            <Sphere args={[0.025, 8, 8]} position={[0, 0, 0.07]}><meshStandardMaterial color="#111" /></Sphere>
            <Sphere args={[0.01, 6, 6]} position={[0.015, 0.015, 0.09]}><meshStandardMaterial color="white" /></Sphere>
            {/* Eyelid — covers eye when blinking */}
            <RoundedBox
              ref={i === 0 ? lEyeLidRef : rEyeLidRef}
              args={[0.16, 0.08, 0.02]} radius={0.01}
              position={[0, 0.02, 0.08]}>
              <meshStandardMaterial color={SKIN} roughness={0.5} />
            </RoundedBox>
          </group>
        ))}
        {/* Eyebrows */}
        <RoundedBox ref={lBrowRef} args={[0.12, 0.025, 0.02]} radius={0.01} position={[-0.13, 0.18, 0.26]}>{mat(HAIR)}</RoundedBox>
        <RoundedBox ref={rBrowRef} args={[0.12, 0.025, 0.02]} radius={0.01} position={[0.13, 0.18, 0.26]}>{mat(HAIR)}</RoundedBox>
        {/* Nose */}
        <RoundedBox args={[0.06, 0.08, 0.06]} radius={0.02} position={[0, -0.04, 0.27]}>{mat(SKIN)}</RoundedBox>
        {/* Mouth */}
        <RoundedBox ref={mouthRef} args={[0.14, 0.04, 0.02]} radius={0.01} position={[0, -0.16, 0.26]}>{mat("#c0605a")}</RoundedBox>
        {/* Ears */}
        {[-1, 1].map((side, i) => (
          <RoundedBox key={i} args={[0.06, 0.1, 0.06]} radius={0.02} position={[side * 0.29, 0, 0]}>{mat(SKIN)}</RoundedBox>
        ))}
      </group>

      {/* Right Arm */}
      <group ref={rArmRef} position={[-0.42, 1.6, 0]}>
        <Sphere args={[0.1, 10, 10]}><meshStandardMaterial color={SHIRT} /></Sphere>
        <RoundedBox args={[0.18, 0.42, 0.18]} radius={0.06} position={[0, -0.25, 0]}>{mat(SHIRT)}</RoundedBox>
        <group ref={rForeRef} position={[0, -0.5, 0]}>
          <RoundedBox args={[0.16, 0.38, 0.16]} radius={0.05} position={[0, -0.19, 0]}>{mat(SKIN)}</RoundedBox>
          <RoundedBox args={[0.14, 0.12, 0.14]} radius={0.04} position={[0, -0.42, 0]}>{mat(SKIN)}</RoundedBox>
        </group>
      </group>

      {/* Left Arm */}
      <group ref={lArmRef} position={[0.42, 1.6, 0]}>
        <Sphere args={[0.1, 10, 10]}><meshStandardMaterial color={SHIRT} /></Sphere>
        <RoundedBox args={[0.18, 0.42, 0.18]} radius={0.06} position={[0, -0.25, 0]}>{mat(SHIRT)}</RoundedBox>
        <group ref={lForeRef} position={[0, -0.5, 0]}>
          <RoundedBox args={[0.16, 0.38, 0.16]} radius={0.05} position={[0, -0.19, 0]}>{mat(SKIN)}</RoundedBox>
          <RoundedBox args={[0.14, 0.12, 0.14]} radius={0.04} position={[0, -0.42, 0]}>{mat(SKIN)}</RoundedBox>
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rLegRef} position={[-0.2, 0.72, 0]}>
        <RoundedBox args={[0.24, 0.48, 0.22]} radius={0.06} position={[0, -0.24, 0]}>{mat(PANTS)}</RoundedBox>
        <group ref={rShinRef} position={[0, -0.52, 0]}>
          <RoundedBox args={[0.21, 0.44, 0.2]} radius={0.05} position={[0, -0.22, 0]}>{mat(PANTS)}</RoundedBox>
          <RoundedBox args={[0.22, 0.1, 0.3]} radius={0.04} position={[0, -0.5, 0.04]}>{mat(SHOES)}</RoundedBox>
        </group>
      </group>

      {/* Left Leg */}
      <group ref={lLegRef} position={[0.2, 0.72, 0]}>
        <RoundedBox args={[0.24, 0.48, 0.22]} radius={0.06} position={[0, -0.24, 0]}>{mat(PANTS)}</RoundedBox>
        <group ref={lShinRef} position={[0, -0.52, 0]}>
          <RoundedBox args={[0.21, 0.44, 0.2]} radius={0.05} position={[0, -0.22, 0]}>{mat(PANTS)}</RoundedBox>
          <RoundedBox args={[0.22, 0.1, 0.3]} radius={0.04} position={[0, -0.5, 0.04]}>{mat(SHOES)}</RoundedBox>
        </group>
      </group>
    </group>
  );
}

function Scene({ expression, gesture, exercise, headShake, autoRotate, speaking }: {
  expression: Expression; gesture: Gesture; exercise: string;
  headShake: boolean; autoRotate: boolean; speaking: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) groupRef.current.rotation.y += delta * 0.4;
    else if (groupRef.current) groupRef.current.rotation.y = lerp(groupRef.current.rotation.y, 0, 0.05);
  });
  return (
    <group ref={groupRef}>
      <Humanoid expression={expression} gesture={gesture} exercise={exercise}
        headShake={headShake} speaking={speaking} />
    </group>
  );
}

export default function PhysioGuide({ exercise, isActive, repCount, feedback, formScore, detailedFeedback, demoMode = false, onDemoComplete }: Props) {
  const [expression, setExpression] = useState<Expression>("happy");
  const [gesture, setGesture] = useState<Gesture>("idle");
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [headShake, setHeadShake] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const prevRepCount = useRef(0);
  const prevActive = useRef(false);
  const prevFeedbackMsg = useRef("");
  const lastCorrectionTime = useRef(0);
  const correctionCooldown = 8000; // 8 seconds between corrections

  // ✅ FIX: Load voices on component mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesLoaded = true;
        console.log(`✅ TTS: Loaded ${voices.length} voices`);
        voices.slice(0, 5).forEach(v => console.log(`  - ${v.name} (${v.lang})`));
      }
    };

    // Voices might load asynchronously
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      // Try loading immediately
      loadVoices();
    }

    // Cleanup
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ✅ FIX: Resume speech on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        if (!document.hidden && window.speechSynthesis.paused) {
          console.log("🔊 TTS: Resuming speech (page visible)");
          window.speechSynthesis.resume();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Helper: speak with visual sync
  const say = (text: string, emotion: "happy" | "warning" | "encouraging" | "neutral" = "neutral") => {
    setSpeaking(true);
    speak(text, emotion, () => setSpeaking(false));
  };

  // ── Demo mode: robot demonstrates the exercise, then hands over to user ──
  useEffect(() => {
    if (!demoMode) return;

    const exerciseName = exercise.replace(/_/g, " ");
    setExpression("encouraging");
    setGesture("wave");
    setSpeechBubble("Watch me first! 👀");
    say(`Hi! I will demonstrate ${exerciseName} for you. Watch carefully and then follow along.`, "encouraging");

    const t1 = setTimeout(() => {
      setGesture("pointLeft");
      setSpeechBubble("Pay attention to my form 🎯");
      say("Pay close attention to my movement, speed, and posture.", "neutral");
    }, 4000);

    const t2 = setTimeout(() => {
      setGesture("exercise");
      setExpression("happy");
      setSpeechBubble(`Demonstrating: ${exerciseName} 🏃`);
      say(`Now watch me perform ${exerciseName}. Notice the full range of motion and controlled speed.`, "encouraging");
    }, 7500);

    const t3 = setTimeout(() => {
      setSpeechBubble("Your turn! Follow along 💪");
      say("Great! Now it is your turn. Follow along with me and I will guide your form in real time.", "happy");
    }, 13000);

    const t4 = setTimeout(() => {
      setSpeechBubble(null);
      onDemoComplete?.();
    }, 16000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [demoMode, exercise]);

  // Intro sequence with detailed instructions
  useEffect(() => {
    if (isActive && !prevActive.current) {
      prevActive.current = true;
      setExpression("encouraging"); 
      setGesture("wave");
      setSpeechBubble("Hey! Let's do this! 💪");
      say("Hey! I'm your AI physiotherapist. Let me show you how to do this exercise correctly.", "encouraging");
      
      const t1 = setTimeout(() => { 
        setGesture("pointLeft"); 
        setSpeechBubble("Watch me first! 👀");
        say("Watch my demonstration carefully. Pay attention to my form and movement speed.", "neutral");
      }, 4000);
      
      const t2 = setTimeout(() => { 
        setGesture("exercise"); 
        setSpeechBubble("Follow along! 🏃");
        say("Now follow along with me. I'll guide you and correct your form in real-time.", "encouraging");
      }, 8000);
      
      const t3 = setTimeout(() => { 
        setSpeechBubble(null);
      }, 12000);
      
      return () => { 
        clearTimeout(t1); 
        clearTimeout(t2); 
        clearTimeout(t3);
      };
    } else if (!isActive) {
      prevActive.current = false;
      setGesture("idle"); 
      setExpression("happy"); 
      setSpeechBubble(null); 
      setSpeaking(false);
    }
  }, [isActive]);

  // Rep count reaction — celebrate every rep, speak every 3
  useEffect(() => {
    if (repCount > prevRepCount.current && repCount > 0) {
      prevRepCount.current = repCount;
      setExpression("celebrating");
      setGesture("clap");
      if (repCount === 1) {
        setSpeechBubble("First rep! 🎉");
        say("First rep! Great start!", "happy");
      } else if (repCount % 5 === 0) {
        setSpeechBubble(`${repCount} reps! Amazing! 🔥`);
        say(`${repCount} reps! You're on fire! Keep it up!`, "happy");
      } else if (repCount % 3 === 0) {
        setSpeechBubble("Keep going! 💪");
        say("Great job! Keep going!", "encouraging");
      }
      const t = setTimeout(() => { setExpression("happy"); setGesture("exercise"); setSpeechBubble(null); }, 1800);
      return () => clearTimeout(t);
    }
  }, [repCount]);

  // Real-time feedback reaction — instant, no debounce
  useEffect(() => {
    if (!feedback || feedback.message === prevFeedbackMsg.current) return;
    prevFeedbackMsg.current = feedback.message;

    if (feedback.status === "good") {
      setExpression("happy");
      setGesture("thumbsup");
      setSpeechBubble("✅ " + feedback.message);
      say(feedback.message, "happy");
      const t = setTimeout(() => { setGesture(isActive ? "exercise" : "idle"); setSpeechBubble(null); }, 2500);
      return () => clearTimeout(t);
    } else if (feedback.status === "warning") {
      setExpression("concerned");
      setGesture("pointLeft");
      setSpeechBubble("⚠️ " + feedback.message);
      say(feedback.message, "neutral");
      const t = setTimeout(() => { setGesture(isActive ? "exercise" : "idle"); setSpeechBubble(null); }, 3000);
      return () => clearTimeout(t);
    } else if (feedback.status === "out_of_range") {
      setExpression("warning");
      setHeadShake(true);
      setSpeechBubble("❌ " + feedback.message);
      say("Careful! " + feedback.message, "warning");
      const t = setTimeout(() => {
        setHeadShake(false);
        setExpression("encouraging");
        setSpeechBubble("You can do it! 💪");
        const t2 = setTimeout(() => setSpeechBubble(null), 1500);
        return () => clearTimeout(t2);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [feedback, isActive]);

  // Form score drives continuous expression
  useEffect(() => {
    if (formScore === null || gesture !== "exercise") return;
    if (formScore >= 85) setExpression("happy");
    else if (formScore >= 70) setExpression("encouraging");
    else if (formScore >= 55) setExpression("concerned");
    else setExpression("warning");
  }, [formScore, gesture]);

  // Detailed form correction with cooldown
  useEffect(() => {
    if (!detailedFeedback || !isActive) return;
    
    const now = Date.now();
    if (now - lastCorrectionTime.current < correctionCooldown) return;
    
    lastCorrectionTime.current = now;
    
    const { joint, currentAngle, targetAngle, deviation, correction } = detailedFeedback;
    
    // Visual feedback based on deviation
    if (deviation > 30) {
      setExpression("warning");
      setHeadShake(true);
      setGesture("pointLeft");
      setSpeechBubble(`⚠️ ${correction}`);
      say(correction, "warning");
      
      setTimeout(() => {
        setHeadShake(false);
        setGesture("exercise");
        setSpeechBubble(null);
      }, 4000);
    } else if (deviation > 15) {
      setExpression("concerned");
      setGesture("pointLeft");
      setSpeechBubble(`💡 ${correction}`);
      say(correction, "neutral");
      
      setTimeout(() => {
        setGesture("exercise");
        setSpeechBubble(null);
      }, 3500);
    } else if (deviation < 10) {
      setExpression("happy");
      setGesture("thumbsup");
      setSpeechBubble(`✅ ${correction}`);
      say(correction, "happy");
      
      setTimeout(() => {
        setGesture("exercise");
        setSpeechBubble(null);
      }, 2500);
    }
  }, [detailedFeedback, isActive]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Demo mode banner */}
      {demoMode && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
          background: "linear-gradient(135deg,rgba(245,158,11,0.95),rgba(239,68,68,0.9))",
          padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>🎬</span>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: ".06em" }}>
              ROBOT DEMONSTRATION
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>
              Watch the robot, then follow along
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        position: "absolute", top: 10, left: 0, right: 0, zIndex: 10,
        display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none"
      }}>
        <span style={{ background: "rgba(37,99,235,0.85)", color: "#fff", borderRadius: 8, padding: "2px 14px", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          AI Physiotherapist
        </span>
        {exercise && (
          <span style={{ background: "rgba(0,0,0,0.45)", color: "#0fffc5", borderRadius: 6, padding: "1px 10px", fontSize: 11, marginTop: 4 }}>
            {exercise.replace(/_/g, " ").toUpperCase()}
          </span>
        )}
      </div>

      {/* Expression indicator */}
      <div style={{
        position: "absolute", top: 44, right: 10, zIndex: 10,
        display: "flex", alignItems: "center", gap: 5, pointerEvents: "none",
      }}>
        <span style={{ fontSize: 18 }}>
          {expression === "happy" ? "😊" : expression === "celebrating" ? "🎉" :
           expression === "encouraging" ? "💪" : expression === "concerned" ? "😟" : "😤"}
        </span>
        {speaking && (
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 3, borderRadius: 2, background: "#0fffc5",
                height: 6 + i * 4,
                animation: `speakBar 0.6s ease-in-out ${i * 0.1}s infinite alternate`,
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Speech Bubble */}
      {speechBubble && (
        <div style={{
          position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.97)", color: "#1a1a2e", borderRadius: 14,
          padding: "9px 18px", fontSize: 13, fontWeight: 600, zIndex: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)", maxWidth: "85%", textAlign: "center",
          border: "2px solid #3B82F6",
          animation: "fadeInUp 0.2s ease-out",
        }}>
          {speechBubble}
          <div style={{
            position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
            borderTop: "8px solid #3B82F6",
          }} />
        </div>
      )}

      <style>{`
        @keyframes speakBar { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
        @keyframes fadeInUp { from { opacity:0; transform: translateX(-50%) translateY(8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
      `}</style>

      <Canvas
        shadows
        camera={{ position: [0, 0.5, 5.5], fov: 55 }}
        onCreated={({ gl, camera }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFShadowMap; // Using PCFShadowMap (PCFSoftShadowMap is deprecated)
          // Point camera at model center
          (camera as THREE.PerspectiveCamera).lookAt(0, 0.5, 0);
        }}
      >
        <color attach="background" args={["#0d1b2a"]} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[3, 6, 4]} intensity={2.0} castShadow />
        <directionalLight position={[-3, 4, 2]} intensity={1.0} color="#b3d9ff" />
        <pointLight position={[0, 3, 3]} intensity={1.2} color="#ffffff" />
        <pointLight position={[0, 0, 3]} intensity={0.8} color="#0fffc5" />
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.22, 0]} receiveShadow>
          <circleGeometry args={[2, 32]} />
          <meshStandardMaterial color="#1a2a3a" roughness={0.9} />
        </mesh>
        <Scene
          expression={expression}
          gesture={gesture}
          exercise={exercise}
          headShake={headShake}
          autoRotate={!isActive}
          speaking={speaking}
        />
      </Canvas>
    </div>
  );
}
