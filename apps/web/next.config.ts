import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  allowedDevOrigins: ['mlpc-ubuntu', '10.133.222.3'],
};

export default nextConfig;
