import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Required for minimal Docker/Cloud Run images
  output: "standalone",
};

export default nextConfig;
