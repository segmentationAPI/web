import "@segmentation/env/marketing";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  cacheComponents: true,
  images: {
    remotePatterns: [new URL("https://d2l0k5nmpb02cr.cloudfront.net/*/**")],
  },
};

export default nextConfig;
