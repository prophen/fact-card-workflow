import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['satori', '@resvg/resvg-wasm'],
};

export default nextConfig;
