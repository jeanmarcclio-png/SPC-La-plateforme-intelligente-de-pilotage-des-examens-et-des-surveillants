import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/login", destination: "/dashboard", permanent: false },
      { source: "/login/:path*", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
