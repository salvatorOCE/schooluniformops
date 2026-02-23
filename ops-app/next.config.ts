import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No output: 'export' — required for Netlify (middleware + API routes).
  // For static/Electron build, set NEXT_PUBLIC_STATIC_EXPORT=1 and add output: 'export' conditionally.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
