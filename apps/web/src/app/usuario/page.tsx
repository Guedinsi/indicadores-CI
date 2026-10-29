"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "supertokens-auth-react/recipe/emailpassword";
import { SessionAuth } from "supertokens-auth-react/recipe/session";
import { API_URL } from "@/lib/api";

type Usuario = { userId: string; email: string | null; createdAt: string | null };

function Perfil() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Chama a API Nest; o SuperTokens anexa a sessão (cookie) automaticamente
    fetch(`${API_URL}/api/me`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Usuario>;
      })
      .then(setUsuario)
      .catch((e: Error) => setErro(e.message));
  }, []);

  async function sair() {
    await signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Voltar ao painel de indicadores
        </Link>

        <div className="mt-4 rounded-2xl bg-slate-900 px-6 py-8 text-white shadow-lg">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
            Minha conta
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            {usuario?.email ?? "Carregando..."}
          </h1>
        </div>

        {erro && (
          <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            Não foi possível carregar seus dados ({erro}). Verifique se a API está no ar em {API_URL}.
          </div>
        )}

        {usuario && (
          <dl className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-6 shadow-sm">
            <div className="py-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">E-mail</dt>
              <dd className="mt-1 text-slate-900">{usuario.email}</dd>
            </div>
            <div className="py-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">ID do usuário</dt>
              <dd className="mt-1 break-all font-mono text-sm text-slate-700">{usuario.userId}</dd>
            </div>
            <div className="py-4">
              <dt className="text-xs uppercase tracking-wide text-slate-400">Conta criada em</dt>
              <dd className="mt-1 text-slate-900">
                {usuario.createdAt
                  ? new Date(usuario.createdAt).toLocaleString("pt-BR")
                  : "-"}
              </dd>
            </div>
          </dl>
        )}

        <button
          type="button"
          onClick={sair}
          className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Sair
        </button>
      </div>
    </main>
  );
}

// requireAuth: sem sessão, redireciona para /auth
export default function UsuarioPage() {
  return (
    <SessionAuth requireAuth>
      <Perfil />
    </SessionAuth>
  );
}
