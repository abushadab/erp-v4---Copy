import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
  // ERP-optimized caching configuration
  experimental: {
    staleTimes: {
      dynamic: 0,  // Disable static caching for dynamic routes
      static: 180, // Minimal static caching (3 minutes)
    },
  },
  
  // Disable ISR and static optimization for ERP real-time needs
  trailingSlash: false,
  
  // Custom headers for cache control
  async headers() {
    return [
      {
        // Apply to all API routes and dynamic pages
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
          },
          {
            key: 'X-ERP-Cache-Policy',
            value: 'low-cache-erp-optimized',
          },
        ],
      },
      {
        // Aggressive no-cache for API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
