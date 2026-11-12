"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import SuperTokens from "supertokens-auth-react";
import { EmailPasswordPreBuiltUI } from "supertokens-auth-react/recipe/emailpassword/prebuiltui";
import { EmailVerificationPreBuiltUI } from "supertokens-auth-react/recipe/emailverification/prebuiltui";
import { canHandleRoute, getRoutingComponent } from "supertokens-auth-react/ui";

const semAssinatura = () => () => {};

const TELAS = [EmailPasswordPreBuiltUI, EmailVerificationPreBuiltUI];

export default function AuthPage() {
  const noNavegador = useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
  const valida = noNavegador && canHandleRoute(TELAS);

  useEffect(() => {
    if (noNavegador && !valida) {
      SuperTokens.redirectToAuth({ redirectBack: false });
    }
  }, [noNavegador, valida]);

  if (!valida) return null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-6 block text-center text-sm text-slate-500 hover:text-slate-900"
        >
          ← Voltar ao painel de indicadores
        </Link>
        {getRoutingComponent(TELAS)}
      </div>
    </main>
  );
}
