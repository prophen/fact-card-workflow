import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/post-generation': ['../node_modules/@resvg/resvg-wasm/index_bg.wasm'],
  },
  serverExternalPackages: ['satori', '@resvg/resvg-wasm'],
  images: {remotePatterns: [{protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/images/ta2gi825/production/**'}]},
};

export default nextConfig;
