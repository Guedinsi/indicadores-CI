import { describe, expect, it } from 'vitest';
import { configuracaoSmtp } from './emails.js';

const leitor = (valores: Record<string, string>) => ({
  get: <T>(chave: string) => valores[chave] as T,
});

describe('configuracaoSmtp', () => {
  it('usa o Mailpit quando EMAIL_SERVICE não está definido', () => {
    const c = configuracaoSmtp(leitor({}));
    expect(c).toMatchObject({ host: 'localhost', port: 1025, secure: false, password: '' });
  });

  it('usa o host do Mailpit do Docker quando MAILPIT_HOST vem do compose', () => {
    const c = configuracaoSmtp(leitor({ EMAIL_SERVICE: 'mailpit', MAILPIT_HOST: 'mailpit' }));
    expect(c.host).toBe('mailpit');
  });

  it('no Gmail, usa smtp.gmail.com:465 com TLS e a própria conta como remetente', () => {
    const c = configuracaoSmtp(
      leitor({
        EMAIL_SERVICE: 'gmail',
        SMTP_USER: 'projeto@gmail.com',
        SMTP_PASSWORD: 'abcd efgh ijkl mnop',
        SMTP_FROM_EMAIL: 'nao-responda@indicadores-ci.local',
      }),
    );
    expect(c).toMatchObject({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      authUsername: 'projeto@gmail.com',
      password: 'abcdefghijklmnop',
      from: { email: 'projeto@gmail.com' },
    });
  });

  it('no Gmail, recusa subir sem usuário ou senha', () => {
    expect(() => configuracaoSmtp(leitor({ EMAIL_SERVICE: 'gmail' }))).toThrow(
      'EMAIL_SERVICE=gmail exige SMTP_USER, SMTP_PASSWORD no .env.',
    );
  });

  it('em smtp genérico, lê host, porta e TLS do .env', () => {
    const c = configuracaoSmtp(
      leitor({
        EMAIL_SERVICE: 'smtp',
        SMTP_HOST: 'smtp-relay.brevo.com',
        SMTP_PORT: '587',
        SMTP_SECURE: 'false',
        SMTP_USER: 'login',
        SMTP_PASSWORD: 'chave',
        SMTP_FROM_EMAIL: 'nao-responda@exemplo.com.br',
      }),
    );
    expect(c).toMatchObject({ host: 'smtp-relay.brevo.com', port: 587, secure: false });
    expect(c.from.email).toBe('nao-responda@exemplo.com.br');
  });

  it('recusa um EMAIL_SERVICE desconhecido', () => {
    expect(() => configuracaoSmtp(leitor({ EMAIL_SERVICE: 'outlook' }))).toThrow(
      'EMAIL_SERVICE="outlook" não existe',
    );
  });
});
