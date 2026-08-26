import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  allowedDevOrigins: [
    'mlpc-ubuntu',
    '10.133.222.3',
    'mac-studio',
    'mac-studio.local',
    '10.133.222.109',
    '10.133.222.117',
    '100.68.128.25',
  ],
};

export default nextConfig;
