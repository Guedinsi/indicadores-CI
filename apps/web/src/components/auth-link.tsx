"use client";

import Link from "next/link";
import { SessionAuth, useSessionContext } from "supertokens-auth-react/recipe/session";

function Botao() {
  const sessao = useSessionContext();
  if (sessao.loading) return null;

  const logado = sessao.doesSessionExist;
  return (
    <Link
      href={logado ? "/usuario" : "/auth"}
      className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
    >
      {logado ? "Minha conta" : "Entrar"}
    </Link>
  );
}

/** Botão do cabeçalho do dashboard: "Entrar" ou "Minha conta". */
export function AuthLink() {
  return (
    <SessionAuth requireAuth={false}>
      <Botao />
    </SessionAuth>
  );
}
