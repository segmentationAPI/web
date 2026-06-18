import "@segmentation/env/marketing";
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
  },
});

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  cacheComponents: true,
  images: {
    remotePatterns: [new URL("https://assets.segmentationapi.com/images/**")],
  },
  pageExtensions: ["js", "jsx", "ts", "tsx", "mdx"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "assets.segmentationapi.com" }],
  },
};

export default withMDX(nextConfig);
