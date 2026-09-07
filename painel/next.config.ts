import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O painel corre atrás do nginx (vercel.100bytes.co.ao) na porta 3040.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
