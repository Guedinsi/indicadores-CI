import type { SuperTokensConfig } from "supertokens-auth-react/lib/build/types";
import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import EmailVerification from "supertokens-auth-react/recipe/emailverification";
import Session from "supertokens-auth-react/recipe/session";
import { API_URL } from "@/lib/api";
import { traducoesPt } from "./traducoes-pt";

const WEB_URL = (
  process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const supertokensConfig: SuperTokensConfig = {
  appInfo: {
    appName: "Indicadores CI",
    apiDomain: API_URL,
    websiteDomain: WEB_URL,
    apiBasePath: "/api/auth", 
    websiteBasePath: "/auth",
  },
  languageTranslations: {
    defaultLanguage: "pt",
    translations: { pt: traducoesPt },
  },
  recipeList: [
    EmailPassword.init({
      signInAndUpFeature: {
        signUpForm: {
          formFields: [
            { id: "email", label: "E-mail", placeholder: "voce@exemplo.com" },
            {
              id: "password",
              label: "Senha",
              placeholder: "Mínimo de 12 caracteres",
              validate: async (valor: string) =>
                valor.length >= 12
                  ? undefined
                  : "A senha precisa ter pelo menos 12 caracteres.",
            },
          ],
        },
      },
      style: `
        [data-supertokens~="container"] { font-family: inherit; }
        [data-supertokens~="button"] { background-color: #0f172a; border-color: #0f172a; }
        [data-supertokens~="button"]:hover { background-color: #1e293b; border-color: #1e293b; }
        [data-supertokens~="link"], [data-supertokens~="superTokensBranding"] { color: #0f172a; }
      `,
    }),
    EmailVerification.init({ mode: "REQUIRED" }),
    Session.init(),
  ],
  getRedirectionURL: async (context) => {
    if (context.action === "SUCCESS" && context.newSessionCreated) {
      return context.redirectToPath ?? "/usuario";
    }
    return undefined;
  },
};
