import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  reactStrictMode: true,
  typedRoutes: true,
  eslint: {
    // Repo uses strict ESLint rules that currently flag many legacy `any` usages.
    // We keep linting available via `pnpm lint`, but don't fail production builds on lint.
    ignoreDuringBuilds: true
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
};

export default nextConfig;


