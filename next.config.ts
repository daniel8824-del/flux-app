import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'v3.fal.media',
      },
      {
        hostname: 'fal.media',
      },
    ],
  },
};

export default nextConfig;
