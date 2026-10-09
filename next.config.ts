import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'uploads.mangadex.org' },
      { protocol: 'https', hostname: 'cmdxd98sb0x3yprd.mangadex.network' },
    ],
  },
};

export default nextConfig;
