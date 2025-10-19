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
  },
  // Force redeploy
  generateBuildId: async () => {
    return `rollback-${Date.now()}`
  },
}

export default nextConfig
