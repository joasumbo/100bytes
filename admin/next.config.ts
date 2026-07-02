import type { NextConfig } from "next";

// URL do Backend NestJS — definida nas env vars do Vercel após deploy do backend.
// Em desenvolvimento não é usada (fetchAPI aponta directo para localhost:3001).
const BACKEND_URL = process.env.BACKEND_URL;

const nextConfig: NextConfig = {
  // Proxy transparente para o Backend NestJS.
  // O browser faz fetch para /api/* → Next.js reencaminha para o backend.
  // Isto permite que os cookies HTTP-only funcionem no mesmo domínio.
  async rewrites() {
    if (!BACKEND_URL) return []; // desenvolvimento: sem rewrite
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
