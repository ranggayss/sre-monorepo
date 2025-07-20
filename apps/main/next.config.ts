// apps/main/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tambahkan allowedDevOrigins untuk mengatasi warning
  allowedDevOrigins: process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://brain.lvh.me:3001',
    'http://main.lvh.me:3000',
    'brain.lvh.me:3001',
    'main.lvh.me:3000',
  ] : undefined,

  // Development settings
  ...(process.env.NODE_ENV === 'development' && {
    typescript: {
      ignoreBuildErrors: false,
    },
    eslint: {
      ignoreDuringBuilds: false,
    },
  }),
}

export default nextConfig;