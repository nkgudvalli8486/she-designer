import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Repo uses strict ESLint rules that currently flag many legacy `any` usages.
    // We keep linting available via `pnpm lint`, but don't fail production builds on lint.
    ignoreDuringBuilds: true
  },
  experimental: {
    typedRoutes: true,
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
};

export default nextConfig;


