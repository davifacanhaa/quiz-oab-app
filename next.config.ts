import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz neste projeto (há outros lockfiles em diretórios pais).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
