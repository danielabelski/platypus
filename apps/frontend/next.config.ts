import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [];
  },
  basePath: process.env.BASE_PATH || undefined,
  output: "standalone",
};

export default nextConfig;
