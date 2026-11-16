import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Move it here at the top level
  allowedDevOrigins: ["192.168.100.16", "*.local-origin.dev"], // replace with your actual origins

  experimental: {
    // Keep any other experimental flags here, or remove the experimental block if it's now empty
  },
};

export default nextConfig;