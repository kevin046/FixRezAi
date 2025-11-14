import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Use remotePatterns instead of deprecated images.domains
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Silence workspace root inference warnings by explicitly setting the Turbopack root
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
