"use client";

import { useEffect, useState } from "react";

/** Botão fixo no canto inferior direito que aparece depois de rolar a página e leva de volta ao topo. */
export function VoltarAoTopo() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const atualizar = () => setVisivel(window.scrollY > 400);
    atualizar();
    window.addEventListener("scroll", atualizar, { passive: true });
    return () => window.removeEventListener("scroll", atualizar);
  }, []);

  if (!visivel) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduzir ? "auto" : "smooth" });
      }}
      aria-label="Voltar ao topo da página"
      title="Voltar ao topo"
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-green-700 text-xl text-white shadow-lg transition hover:bg-green-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300"
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
