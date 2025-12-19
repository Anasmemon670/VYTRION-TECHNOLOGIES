import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbo: false, // Disable Turbopack to use Webpack instead
  },
};

export default nextConfig;
