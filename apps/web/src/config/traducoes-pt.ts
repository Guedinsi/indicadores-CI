// Tradução (pt-BR) das telas prontas do SuperTokens: login, cadastro,
// redefinição de senha e confirmação de e-mail.
// As chaves são as do pacote supertokens-auth-react; textos que o servidor
// devolve por extenso (as chaves em inglês no final) também são traduzidos.
export const traducoesPt: Record<string, string> = {
  // Geral
  AUTH_PAGE_HEADER_TITLE_SIGN_IN_AND_UP: "Cadastro / Entrar",
  AUTH_PAGE_HEADER_TITLE_SIGN_IN: "Entrar",
  AUTH_PAGE_HEADER_TITLE_SIGN_UP: "Criar conta",
  AUTH_PAGE_HEADER_TITLE_SIGN_IN_UP_TO_APP: " para continuar em ",
  AUTH_PAGE_HEADER_SUBTITLE_SIGN_IN_START: "Ainda não tem conta?",
  AUTH_PAGE_HEADER_SUBTITLE_SIGN_IN_SIGN_UP_LINK: "Cadastre-se",
  AUTH_PAGE_HEADER_SUBTITLE_SIGN_IN_END: "",
  AUTH_PAGE_HEADER_SUBTITLE_SIGN_UP_START: "Já tem uma conta?",
  AUTH_PAGE_HEADER_SUBTITLE_SIGN_UP_SIGN_IN_LINK: "Entrar",
  AUTH_PAGE_HEADER_SUBTITLE_SIGN_UP_END: "",
  AUTH_PAGE_FOOTER_START: "Ao continuar, você concorda com os ",
  AUTH_PAGE_FOOTER_TOS: "Termos de Uso",
  AUTH_PAGE_FOOTER_AND: " e a ",
  AUTH_PAGE_FOOTER_PP: "Política de Privacidade",
  AUTH_PAGE_FOOTER_END: "",
  DIVIDER_OR: "ou",
  BRANDING_POWERED_BY_START: "Tecnologia ",
  BRANDING_POWERED_BY_END: "",
  SOMETHING_WENT_WRONG_ERROR: "Algo deu errado. Tente novamente.",
  SOMETHING_WENT_WRONG_ERROR_RELOAD:
    "Algo deu errado. Tente novamente mais tarde ou recarregue a página.",

  // E-mail e senha
  EMAIL_PASSWORD_EMAIL_LABEL: "E-mail",
  EMAIL_PASSWORD_EMAIL_PLACEHOLDER: "voce@exemplo.com",
  EMAIL_PASSWORD_PASSWORD_LABEL: "Senha",
  EMAIL_PASSWORD_PASSWORD_PLACEHOLDER: "Senha",
  EMAIL_PASSWORD_SIGN_IN_FORGOT_PW_LINK: "Esqueceu a senha?",
  EMAIL_PASSWORD_SIGN_IN_SUBMIT_BTN: "ENTRAR",
  EMAIL_PASSWORD_SIGN_IN_WRONG_CREDENTIALS_ERROR: "E-mail ou senha incorretos",
  EMAIL_PASSWORD_SIGN_UP_SUBMIT_BTN: "CRIAR CONTA",
  EMAIL_PASSWORD_EMAIL_ALREADY_EXISTS:
    "Este e-mail já está cadastrado. Entre com sua senha.",

  // Esqueci a senha
  EMAIL_PASSWORD_RESET_HEADER_TITLE: "Redefinir senha",
  EMAIL_PASSWORD_RESET_HEADER_SUBTITLE:
    "Vamos enviar um e-mail para você redefinir sua senha",
  EMAIL_PASSWORD_RESET_SEND_FALLBACK_EMAIL: "sua conta",
  EMAIL_PASSWORD_RESET_SEND_BEFORE_EMAIL:
    "Enviamos um e-mail de redefinição de senha para ",
  EMAIL_PASSWORD_RESET_SEND_AFTER_EMAIL: ", se ele existir em nosso sistema. ",
  EMAIL_PASSWORD_RESET_RESEND_LINK: "Reenviar ou trocar o e-mail",
  EMAIL_PASSWORD_RESET_SEND_BTN: "ENVIAR E-MAIL",
  EMAIL_PASSWORD_RESET_SIGN_IN_LINK: "Entrar",
  EMAIL_PASSWORD_RESET_SUBMIT_PW_SUCCESS_HEADER_TITLE: "Pronto!",
  EMAIL_PASSWORD_RESET_SUBMIT_PW_SUCCESS_DESC:
    "Sua senha foi alterada com sucesso",
  EMAIL_PASSWORD_RESET_SUBMIT_PW_SUCCESS_SIGN_IN_BTN: "ENTRAR",
  EMAIL_PASSWORD_NEW_PASSWORD_LABEL: "Nova senha",
  EMAIL_PASSWORD_NEW_PASSWORD_PLACEHOLDER: "Nova senha",
  EMAIL_PASSWORD_CONFIRM_PASSWORD_LABEL: "Confirmar senha",
  EMAIL_PASSWORD_CONFIRM_PASSWORD_PLACEHOLDER: "Repita a nova senha",
  EMAIL_PASSWORD_RESET_SUBMIT_PW_HEADER_TITLE: "Alterar senha",
  EMAIL_PASSWORD_RESET_SUBMIT_PW_HEADER_SUBTITLE:
    "Digite abaixo a nova senha da sua conta",
  EMAIL_PASSWORD_RESET_SUBMIT_PW_CHANGE_PW_BTN: "ALTERAR SENHA",
  EMAIL_PASSWORD_RESET_PASSWORD_INVALID_TOKEN_ERROR:
    "Link de redefinição inválido ou expirado",

  // Validações dos campos
  ERROR_EMAIL_NON_STRING: "O e-mail deve ser um texto",
  ERROR_EMAIL_INVALID: "E-mail inválido",
  ERROR_PASSWORD_NON_STRING: "A senha deve ser um texto",
  ERROR_PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 12 caracteres.",
  ERROR_PASSWORD_TOO_LONG: "A senha precisa ter menos de 100 caracteres.",
  ERROR_PASSWORD_NO_ALPHA: "A senha precisa ter pelo menos uma letra",
  ERROR_PASSWORD_NO_NUM: "A senha precisa ter pelo menos um número",
  ERROR_CONFIRM_PASSWORD_NO_MATCH: "As senhas não são iguais",
  ERROR_NON_OPTIONAL: "Campo obrigatório",

  // Confirmação de e-mail
  EMAIL_VERIFICATION_RESEND_SUCCESS: "E-mail reenviado",
  EMAIL_VERIFICATION_SEND_TITLE: "Confirme seu e-mail!",
  EMAIL_VERIFICATION_SEND_DESC_START: "",
  EMAIL_VERIFICATION_SEND_DESC_STRONG: "Clique no link",
  EMAIL_VERIFICATION_SEND_DESC_END:
    " do e-mail que acabamos de enviar para confirmar seu endereço.",
  EMAIL_VERIFICATION_RESEND_BTN: "Reenviar e-mail",
  EMAIL_VERIFICATION_LOGOUT: "Sair",
  EMAIL_VERIFICATION_SUCCESS: "E-mail confirmado com sucesso!",
  EMAIL_VERIFICATION_CONTINUE_BTN: "CONTINUAR",
  EMAIL_VERIFICATION_CONTINUE_LINK: "Continuar",
  EMAIL_VERIFICATION_EXPIRED: "O link de confirmação expirou",
  EMAIL_VERIFICATION_ERROR_TITLE: "Algo deu errado",
  EMAIL_VERIFICATION_ERROR_DESC:
    "Ocorreu um erro inesperado. Entre em contato com o suporte.",
  EMAIL_VERIFICATION_LINK_CLICKED_HEADER: "Confirme seu e-mail",
  EMAIL_VERIFICATION_LINK_CLICKED_DESC:
    "Clique no botão abaixo para confirmar seu endereço de e-mail",
  EMAIL_VERIFICATION_LINK_CLICKED_CONTINUE_BUTTON: "CONFIRMAR",

  // Mensagens que a API devolve por extenso
  "This email already exists. Please sign in instead.":
    "Este e-mail já está cadastrado. Entre com sua senha.",
  "Field is not optional": "Campo obrigatório",
  "Password must contain at least 8 characters, including a number":
    "A senha precisa ter pelo menos 12 caracteres.",
  "Password's length must be lesser than 100 characters":
    "A senha precisa ter menos de 100 caracteres.",
  "Password must contain at least one alphabet":
    "A senha precisa ter pelo menos uma letra",
  "Password must contain at least one number":
    "A senha precisa ter pelo menos um número",
  "Email is invalid": "E-mail inválido",
  "Reset password link was not created because of account take over risk. Please contact support. (ERR_CODE_001)":
    "Não foi possível criar o link de redefinição por risco de segurança. Entre em contato com o suporte. (ERR_CODE_001)",
  "Cannot sign up due to security reasons. Please try logging in, use a different login method or contact support. (ERR_CODE_007)":
    "Não foi possível criar a conta por motivos de segurança. Tente entrar ou entre em contato com o suporte. (ERR_CODE_007)",
  "Cannot sign in due to security reasons. Please try resetting your password, use a different login method or contact support. (ERR_CODE_008)":
    "Não foi possível entrar por motivos de segurança. Tente redefinir a senha ou entre em contato com o suporte. (ERR_CODE_008)",
  "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_009)":
    "Não foi possível entrar ou cadastrar por motivos de segurança. Entre em contato com o suporte. (ERR_CODE_009)",
  "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_010)":
    "Não foi possível entrar ou cadastrar por motivos de segurança. Entre em contato com o suporte. (ERR_CODE_010)",
  "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_011)":
    "Não foi possível entrar ou cadastrar por motivos de segurança. Entre em contato com o suporte. (ERR_CODE_011)",
  "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_012)":
    "Não foi possível entrar ou cadastrar por motivos de segurança. Entre em contato com o suporte. (ERR_CODE_012)",
  "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_013)":
    "Não foi possível entrar ou cadastrar por motivos de segurança. Entre em contato com o suporte. (ERR_CODE_013)",
  "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_014)":
    "Não foi possível entrar ou cadastrar por motivos de segurança. Entre em contato com o suporte. (ERR_CODE_014)",
  "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_015)":
    "Não foi possível entrar ou cadastrar por motivos de segurança. Entre em contato com o suporte. (ERR_CODE_015)",
  "Cannot sign in / up due to security reasons. Please contact support. (ERR_CODE_016)":
    "Não foi possível entrar ou cadastrar por motivos de segurança. Entre em contato com o suporte. (ERR_CODE_016)",
};
