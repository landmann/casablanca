import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: [
    "@casablanca/ui",
    "@casablanca/api",
    "@casablanca/auth",
    "@casablanca/types",
  ],
};

export default nextConfig;
