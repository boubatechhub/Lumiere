import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Le rendu serveur appelle @remotion/bundler et @remotion/renderer, qui
  // embarquent des binaires natifs (Chromium, esbuild...) : ils doivent
  // rester de vrais paquets Node au runtime, pas être bundlés par Turbopack.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer", "esbuild"],
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
