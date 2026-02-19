import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["jspdf", "canvg"],
  turbopack: {},
  // jsPDF optionally imports 'canvg'. Ensure it resolves in client bundle (webpack).
  // If build fails with "Can't resolve 'canvg'" (Turbopack), run: npm run build:webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve ??= {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvg: require.resolve("canvg"),
      };
    }
    return config;
  },
};

export default nextConfig;
