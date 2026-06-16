import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Proxy all /api/* requests to Spring Boot backend
        source: "/api/:path*",
        destination: `${process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/:path*`,
      },
    ];
  },
  allowedDevOrigins: [
    process.env.NEXT_PUBLIC_STAGE_DOMAIN || 'stage.socialflow.io.vn',
  ],
  serverExternalPackages: ['onnxruntime-node', 'sharp'],
};

export default nextConfig;
