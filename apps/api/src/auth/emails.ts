import type { ConfigService } from '@nestjs/config';
import { SMTPService as SMTPEmailPassword } from 'supertokens-node/recipe/emailpassword/emaildelivery/index.js';
import { SMTPService as SMTPEmailVerification } from 'supertokens-node/recipe/emailverification/emaildelivery/index.js';

function escapar(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function modelo(titulo: string, texto: string, botao: string, link: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:480px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b">Indicadores CI · Campo Mourão</p>
    <h1 style="margin:0 0 16px;font-size:22px">${titulo}</h1>
    <p style="margin:0 0 24px;line-height:1.5">${texto}</p>
    <p style="margin:0 0 24px"><a href="${escapar(link)}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">${botao}</a></p>
    <p style="margin:0 0 8px;font-size:12px;color:#64748b">Se o botão não funcionar, copie este endereço no navegador:<br>${escapar(link)}</p>
    <p style="margin:0;font-size:12px;color:#64748b">Se você não fez essa solicitação, ignore este e-mail.</p>
  </div>
</body></html>`;
}

function configuracaoSmtp(config: ConfigService) {
  const usuario = config.get<string>('SMTP_USER');
  return {
    host: config.get<string>('SMTP_HOST', 'localhost'),
    port: Number(config.get<string>('SMTP_PORT', '1025')),
    secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
    authUsername: usuario || undefined,
    password: config.get<string>('SMTP_PASSWORD', ''),
    from: {
      name: config.get<string>('SMTP_FROM_NAME', 'Indicadores CI'),
      email: config.get<string>('SMTP_FROM_EMAIL', 'nao-responda@indicadores-ci.local'),
    },
  };
}

/** E-mail de confirmação de endereço, em português. */
export function criarEnvioConfirmacaoEmail(config: ConfigService) {
  return new SMTPEmailVerification({
    smtpSettings: configuracaoSmtp(config),
    override: (original) => ({
      ...original,
      getContent: async (input) => ({
        isHtml: true,
        subject: 'Confirme seu e-mail - Indicadores CI',
        toEmail: input.user.email,
        body: modelo(
          'Confirme seu e-mail',
          'Falta só um passo para ativar sua conta. Clique no botão abaixo para confirmar este endereço de e-mail.',
          'Confirmar e-mail',
          input.emailVerifyLink,
        ),
      }),
    }),
  });
}

/** E-mail de redefinição de senha, em português. */
export function criarEnvioRedefinicaoSenha(config: ConfigService) {
  return new SMTPEmailPassword({
    smtpSettings: configuracaoSmtp(config),
    override: (original) => ({
      ...original,
      getContent: async (input) => ({
        isHtml: true,
        subject: 'Redefinição de senha - Indicadores CI',
        toEmail: input.user.email,
        body: modelo(
          'Redefinir sua senha',
          'Recebemos um pedido para redefinir a senha da sua conta. O link vale por tempo limitado e só pode ser usado uma vez.',
          'Redefinir senha',
          input.passwordResetLink,
        ),
      }),
    }),
  });
}
