/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basit yapılandırma - karmaşık config'ler sorun yaratıyor
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
