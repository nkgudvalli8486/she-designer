import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  // Silence monorepo root inference warning
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;


