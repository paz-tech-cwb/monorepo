/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: "/admin",
  assetPrefix: "/admin",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
