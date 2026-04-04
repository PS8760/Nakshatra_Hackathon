import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // No COEP header — it blocks CDN scripts loaded via <script> injection
  async headers() {
    return [];
  },
};

export default nextConfig;
