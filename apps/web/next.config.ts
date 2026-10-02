import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // necessário em monorepo: faz o Next incluir as dependências da raiz no standalone
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;