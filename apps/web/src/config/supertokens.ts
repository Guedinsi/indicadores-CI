import type { SuperTokensConfig } from "supertokens-auth-react/lib/build/types";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import Session from "supertokens-auth-react/recipe/session";
import { API_URL } from "@/lib/api";

// Endereço do site (NEXT_PUBLIC_* é embutida no build; veja o web.Dockerfile)
const WEB_URL = (
  process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const supertokensConfig: SuperTokensConfig = {
  appInfo: {
    appName: "Indicadores CI",
    apiDomain: API_URL,
    websiteDomain: WEB_URL,
    apiBasePath: "/api/auth", // mesmo valor do apps/api (supertokens.service.ts)
    websiteBasePath: "/auth",
  },
  recipeList: [
    EmailPassword.init({
      // Cores do formulário de login para combinar com o dashboard (slate-900)
      style: `
        [data-supertokens~="container"] { font-family: inherit; }
        [data-supertokens~="button"] { background-color: #0f172a; border-color: #0f172a; }
        [data-supertokens~="button"]:hover { background-color: #1e293b; border-color: #1e293b; }
        [data-supertokens~="link"], [data-supertokens~="superTokensBranding"] { color: #0f172a; }
      `,
    }),
    Session.init(),
  ],
  // Depois do login o usuário vai para a página dele
  getRedirectionURL: async (context) => {
    if (context.action === "SUCCESS" && context.newSessionCreated) {
      return context.redirectToPath ?? "/usuario";
    }
    return undefined;
  },
};
