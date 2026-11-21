import type { NextConfig } from 'next';

const config: NextConfig = {
  serverExternalPackages: ['bharat-utils'],
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
};
export default config;
