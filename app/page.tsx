"use client";

import dynamic from "next/dynamic";

// L'éditeur dépend du <Player> Remotion, qui touche des API navigateur
// (FontFace...) absentes de Node : on exclut toute tentative de SSR plutôt
// que de la faire planter au build ou à chaque requête serveur.
const EditorApp = dynamic(() => import("./components/EditorApp").then((mod) => mod.EditorApp), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">
      Chargement de l&apos;éditeur...
    </div>
  ),
});

export default function Home() {
  return <EditorApp />;
}
