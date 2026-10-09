import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents/PPR désactivés : l'éditeur est entièrement interactif
  // (formulaires, lecteur Remotion, uploads), rien n'est statiquement
  // prérendable, et le pré-rendu de composants dynamiques (ex. l'horloge
  // interne du <Player> Remotion) fait échouer le build ("unstable value").
  //
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
