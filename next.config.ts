import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // MyanAid currently uses client-side Firebase services only, so it can be
  // safely deployed as a static site on Firebase Hosting.
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
