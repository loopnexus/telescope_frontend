/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_RUNPOD_URL: process.env.NEXT_PUBLIC_RUNPOD_URL,
    NEXT_PUBLIC_RUNPOD_TOKEN: process.env.NEXT_PUBLIC_RUNPOD_TOKEN,
  },
}

module.exports = nextConfig
