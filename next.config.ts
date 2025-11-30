import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow external images from dicebear API
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
}

export default nextConfig
