import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@auto-platform/ui",
    "@auto-platform/types",
    "@auto-platform/core",
    "@auto-platform/db",
  ],
};

export default nextConfig;
