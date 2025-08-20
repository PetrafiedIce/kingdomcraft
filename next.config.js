/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },
  env: {
    DONUT_API_BASE: process.env.DONUT_API_BASE || 'https://api.donutsmp.net',
    MOCK_DONUT_API: process.env.MOCK_DONUT_API || ''
  }
}

module.exports = nextConfig

