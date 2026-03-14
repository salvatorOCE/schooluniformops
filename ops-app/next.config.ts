import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Turbopack to use ops-app as project root so tailwindcss resolves from ops-app/node_modules
  turbopack: { root: __dirname },
  // No output: 'export' — required for Netlify (middleware + API routes).
  // For static/Electron build, set NEXT_PUBLIC_STATIC_EXPORT=1 and add output: 'export' conditionally.
  images: {
    unoptimized: true,
  },
  // So PDF pipeline can use pdf2pic (and its deps) in API routes without bundling issues
  serverExternalPackages: ["pdf2pic", "replicate"],
};

export default nextConfig;
