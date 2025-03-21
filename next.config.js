/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    typescript: {
      ignoreBuildErrors: true,
    },
    images: {
      unoptimized: true,
      domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    }
};

module.exports = nextConfig;