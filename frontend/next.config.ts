import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",

  // Turbopack alias config (Next.js 16 default bundler)
  turbopack: {
    root: __dirname,
    resolveAlias: {
      // pose-detection imports these for optional backends we don't use — stub them
      "@mediapipe/pose":                 "./src/stubs/mediapipe-pose.js",
      "@mediapipe/selfie_segmentation":  "./src/stubs/mediapipe-selfie.js",
      "@tensorflow/tfjs-backend-webgpu": "./src/stubs/tfjs-webgpu.js",
    },
  },

  // Proxy /api/* and /ws/* to the FastAPI backend so everything lives on :3000
  async rewrites() {
    return [
      // REST API
      {
        source: "/api/:path*",
        destination: `${BACKEND}/:path*`,
      },
      // WebSocket upgrade
      {
        source: "/ws/:path*",
        destination: `${BACKEND}/ws/:path*`,
      },
    ];
  },

  async headers() {
    return [];
  },
};

export default nextConfig;
