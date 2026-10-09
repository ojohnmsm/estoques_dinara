import type { NextConfig } from "next";

// Cache Components desligado: todas as páginas leem a sessão (cookies) e
// mostram dados que mudam a cada venda, então renderização dinâmica é o modelo certo.
const nextConfig: NextConfig = {
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
