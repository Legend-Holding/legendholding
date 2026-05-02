/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'cdn.legendholding.com' },
      { protocol: 'https', hostname: 'placehold.co' },
    ],
    qualities: [60, 70, 75, 80, 85, 90],
  },
  // Increase body size limit for API routes (accounting for base64 encoding overhead)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Vercel Pro supports up to 50MB
    },
  },
  async rewrites() {
    return [
      {
        source: '/tinymce/:path*',
        destination: '/tinymce/:path*',
      },
    ]
  },
}

export default nextConfig
