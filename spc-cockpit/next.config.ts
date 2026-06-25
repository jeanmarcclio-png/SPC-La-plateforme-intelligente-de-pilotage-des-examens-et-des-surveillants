import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["web-push"],
  async redirects() {
    return [
      { source: "/login", destination: "/dashboard", permanent: false },
      { source: "/login/:path*", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
