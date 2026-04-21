import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@casedra/ui",
    "@casedra/api",
    "@casedra/types",
  ],
};

export default nextConfig;
