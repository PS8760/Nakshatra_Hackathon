import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Turbopack alias config (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {
      // pose-detection imports these for optional backends we don't use — stub them
      "@mediapipe/pose":                 "./src/stubs/mediapipe-pose.js",
      "@mediapipe/selfie_segmentation":  "./src/stubs/mediapipe-selfie.js",
      "@tensorflow/tfjs-backend-webgpu": "./src/stubs/tfjs-webgpu.js",
    },
  },

  async headers() {
    return [];
  },
};

export default nextConfig;
