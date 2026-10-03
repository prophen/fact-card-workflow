import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['satori', '@resvg/resvg-wasm'],
  images: {remotePatterns: [{protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/images/ta2gi825/production/**'}]},
};

export default nextConfig;
