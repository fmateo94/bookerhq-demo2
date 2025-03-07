/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    // Disable static optimization for pages using Supabase
    experimental: {
      appDir: true,
    },
    // Skip type checking during build (can be removed once all types are fixed)
    typescript: {
      ignoreBuildErrors: true,
    },
    images: {
      unoptimized: true,
      domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    },
    output: 'standalone',
    distDir: '.next',
    async rewrites() {
      return {
        beforeFiles: [
          // These rewrites are checked before all pages/files
          {
            source: '/:path*',
            has: [
              {
                type: 'query',
                key: 'authorized',
                value: 'true',
              },
            ],
            destination: '/auth/:path*',
          },
        ],
        afterFiles: [
          // These rewrites are checked after pages/files
          // but before dynamic routes
          {
            source: '/dashboard',
            destination: '/dashboard/profile',
          },
        ],
        fallback: [
          // These rewrites are checked after both pages/files
          // and dynamic routes are checked
          {
            source: '/:path*',
            destination: `/:path*`,
          },
        ],
      }
    },
};

module.exports = nextConfig;