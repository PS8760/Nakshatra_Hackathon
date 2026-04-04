/**
 * performanceMonitor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time Performance Monitoring for Pose Detection
 * 
 * Tracks:
 * - FPS (frames per second)
 * - Frame time breakdown (pose detection, analysis, rendering)
 * - Memory usage
 * - Dropped frames
 * - Latency metrics
 */

export interface PerformanceMetrics {
  fps: number;
  avgFrameTime: number;
  avgPoseTime: number;
  avgAnalysisTime: number;
  avgDrawTime: number;
  droppedFrames: number;
  memoryUsage: number; // MB
  timestamp: number;
}

export interface FrameTiming {
  total: number;
  pose: number;
  analysis: number;
  draw: number;
}

export class PerformanceMonitor {
  private frameTimings: FrameTiming[] = [];
  private fpsHistory: number[] = [];
  private droppedFrames = 0;
  private lastFrameTime = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;
  
  private readonly MAX_HISTORY = 60; // Keep last 60 frames (1 second at 60fps)
  private readonly TARGET_FRAME_TIME = 16.67; // 60 FPS target
  
  recordFrame(timing: FrameTiming): void {
    this.frameTimings.push(timing);
    if (this.frameTimings.length > this.MAX_HISTORY) {
      this.frameTimings.shift();
    }
    
    // Detect dropped frames (frame took longer than 2x target)
    if (timing.total > this.TARGET_FRAME_TIME * 2) {
      this.droppedFrames++;
    }
    
    // Update FPS
    const now = performance.now();
    this.frameCount++;
    
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > 10) this.fpsHistory.shift();
      
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    
    this.lastFrameTime = now;
  }
  
  getMetrics(): PerformanceMetrics {
    if (this.frameTimings.length === 0) {
      return {
        fps: 0,
        avgFrameTime: 0,
        avgPoseTime: 0,
        avgAnalysisTime: 0,
        avgDrawTime: 0,
        droppedFrames: 0,
        memoryUsage: 0,
        timestamp: Date.now(),
      };
    }
    
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr: number[]) => sum(arr) / arr.length;
    
    const avgFrameTime = avg(this.frameTimings.map(t => t.total));
    const avgPoseTime = avg(this.frameTimings.map(t => t.pose));
    const avgAnalysisTime = avg(this.frameTimings.map(t => t.analysis));
    const avgDrawTime = avg(this.frameTimings.map(t => t.draw));
    
    // Memory usage (if available)
    let memoryUsage = 0;
    if ((performance as any).memory) {
      memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    
    return {
      fps: this.currentFps,
      avgFrameTime,
      avgPoseTime,
      avgAnalysisTime,
      avgDrawTime,
      droppedFrames: this.droppedFrames,
      memoryUsage,
      timestamp: Date.now(),
    };
  }
  
  getRecommendedQuality(): "high" | "balanced" | "low" {
    const metrics = this.getMetrics();
    
    if (metrics.fps >= 50) return "high";
    if (metrics.fps >= 30) return "balanced";
    return "low";
  }
  
  shouldReduceQuality(): boolean {
    const metrics = this.getMetrics();
    return metrics.fps < 25 || metrics.avgFrameTime > 40;
  }
  
  shouldIncreaseQuality(): boolean {
    const metrics = this.getMetrics();
    const avgFps = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      : metrics.fps;
    
    return avgFps > 55 && metrics.avgFrameTime < 15;
  }
  
  reset(): void {
    this.frameTimings = [];
    this.fpsHistory = [];
    this.droppedFrames = 0;
    this.frameCount = 0;
    this.currentFps = 0;
  }
  
  getPerformanceReport(): string {
    const metrics = this.getMetrics();
    const quality = this.getRecommendedQuality();
    
    return `
Performance Report
==================
FPS: ${metrics.fps}
Avg Frame Time: ${metrics.avgFrameTime.toFixed(2)}ms
  - Pose Detection: ${metrics.avgPoseTime.toFixed(2)}ms (${((metrics.avgPoseTime / metrics.avgFrameTime) * 100).toFixed(1)}%)
  - Analysis: ${metrics.avgAnalysisTime.toFixed(2)}ms (${((metrics.avgAnalysisTime / metrics.avgFrameTime) * 100).toFixed(1)}%)
  - Rendering: ${metrics.avgDrawTime.toFixed(2)}ms (${((metrics.avgDrawTime / metrics.avgFrameTime) * 100).toFixed(1)}%)
Dropped Frames: ${metrics.droppedFrames}
Memory Usage: ${metrics.memoryUsage.toFixed(1)} MB
Recommended Quality: ${quality}
    `.trim();
  }
}

/**
 * Camera quality detector - analyzes video feed for optimal settings
 */
export class CameraQualityDetector {
  detectLighting(videoElement: HTMLVideoElement): "good" | "dark" | "bright" {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "good";
    
    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }
    
    const avgBrightness = totalBrightness / (data.length / 4);
    
    if (avgBrightness < 60) return "dark";
    if (avgBrightness > 200) return "bright";
    return "good";
  }
  
  detectBlur(videoElement: HTMLVideoElement): number {
    // Simple blur detection using Laplacian variance
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    
    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale and compute Laplacian
    let variance = 0;
    const w = canvas.width;
    const h = canvas.height;
    
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;
        const center = data[idx];
        
        const top = data[((y - 1) * w + x) * 4];
        const bottom = data[((y + 1) * w + x) * 4];
        const left = data[(y * w + (x - 1)) * 4];
        const right = data[(y * w + (x + 1)) * 4];
        
        const laplacian = Math.abs(4 * center - top - bottom - left - right);
        variance += laplacian * laplacian;
      }
    }
    
    variance /= (w - 2) * (h - 2);
    return variance;
  }
  
  getQualityRecommendations(videoElement: HTMLVideoElement): string[] {
    const recommendations: string[] = [];
    
    const lighting = this.detectLighting(videoElement);
    if (lighting === "dark") {
      recommendations.push("⚠️ Lighting is too dark. Add more light to improve accuracy.");
    } else if (lighting === "bright") {
      recommendations.push("⚠️ Lighting is too bright. Reduce direct light or move away from windows.");
    }
    
    const blur = this.detectBlur(videoElement);
    if (blur < 100) {
      recommendations.push("⚠️ Image appears blurry. Clean your camera lens or improve focus.");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("✅ Camera quality is good!");
    }
    
    return recommendations;
  }
}
