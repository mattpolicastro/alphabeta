import type { NextConfig } from 'next';
import { execSync } from 'child_process';

const basePath = '';

// Resolve version from the latest git tag at build time.
// Falls back to 'dev' if no tags exist or git is unavailable.
let appVersion = 'dev';
try {
  appVersion = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
} catch {
  // no tags or not in a git repo — keep 'dev'
}

const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }, // required for static export
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default config;
