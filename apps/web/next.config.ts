import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? '/experiment-tools' : '';

const config: NextConfig = {
  output: 'export',
  basePath,
  assetPrefix: isProd ? '/experiment-tools/' : undefined,
  trailingSlash: true,
  images: { unoptimized: true }, // required for static export
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default config;
