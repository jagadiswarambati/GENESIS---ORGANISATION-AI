import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(process.cwd(), ".."),
  reactStrictMode: true,
};

export default nextConfig;
