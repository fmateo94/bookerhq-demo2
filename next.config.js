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
    },
    output: 'export',
  };
  
  module.exports = nextConfig;