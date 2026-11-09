import type { NextConfig } from "next";

const envOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];

const nextConfig: NextConfig = {
  /* Izinkan host dev & HMR cross-origin */
  allowedDevOrigins: [
    'lunar.deera-server.my.id',
    '*.deera-server.my.id',
    'localhost',
    '*.localhost',
    '127.0.0.1',
    '0.0.0.0',
    '*.local',
    ...envOrigins,
  ],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
