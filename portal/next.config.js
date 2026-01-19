/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/__clerk/:path*',
        destination: 'https://clerk.subscribersync.com/:path*',
      },
    ]
  },
}

module.exports = nextConfig
