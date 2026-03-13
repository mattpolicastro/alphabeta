import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
};

export default async () => {
  const nextConfig = await createJestConfig(config)();
  // next/jest sets transformIgnorePatterns that block ESM-only packages
  // in hoisted node_modules. Override to also allow nanoid and dexie.
  nextConfig.transformIgnorePatterns = [
    '/node_modules/(?!.pnpm)(?!(nanoid|dexie|geist)/)',
    '/node_modules/.pnpm/(?!(nanoid|dexie|geist)@)',
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return nextConfig;
};
