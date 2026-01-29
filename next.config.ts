import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["msedge-tts", "@google/generative-ai", "groq-sdk"],
};

export default nextConfig;
