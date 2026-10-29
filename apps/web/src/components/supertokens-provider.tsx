"use client";

import SuperTokens, { SuperTokensWrapper } from "supertokens-auth-react";
import { supertokensConfig } from "@/config/supertokens";

// Inicializa uma vez, só no navegador
if (typeof window !== "undefined") {
  SuperTokens.init(supertokensConfig);
}

export function SuperTokensProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SuperTokensWrapper>{children}</SuperTokensWrapper>;
}
