/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  // Disable Next.js floating dev overlay + build activity spinner
  experimental: {
    disableNextDevOverlay: true,
  },
  devIndicators: {
    buildActivity: false,
  },

  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
};

module.exports = nextConfig;
