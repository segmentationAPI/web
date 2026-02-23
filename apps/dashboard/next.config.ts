import "@segmentation/env/dashboard";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  cacheComponents: true,
  images: {
    remotePatterns: [new URL("https://assets.segmentationapi.com/*/**")],
  },
};

export default nextConfig;
