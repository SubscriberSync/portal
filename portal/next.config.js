/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Proxy Clerk's internal API routes
      {
        source: '/api/__clerk/:path*',
        destination: 'https://clerk.subscribersync.com/npm/:path*',
      },
      {
        source: '/clerk/:path*',
        destination: 'https://clerk.subscribersync.com/:path*',
      },
    ]
  },
}

module.exports = nextConfig
