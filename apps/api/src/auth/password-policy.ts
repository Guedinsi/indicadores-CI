import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('PasswordPolicy');

export const SENHA_MINIMO = 12;
export const SENHA_MAXIMO = 100;

type Opcoes = {
  /** Consulta senhas vazadas (Have I Been Pwned). Padrão: ligado. */
  verificarVazamento?: boolean;
  /** Para testes. */
  fetchImpl?: typeof fetch;
};

/**
 * Política de senha (recomendação NIST 800-63B): tamanho mínimo em vez de regras de
 * símbolos, e bloqueio de senhas que já apareceram em vazamentos.
 *
 * A consulta ao Have I Been Pwned usa k-anonimato: só os 5 primeiros caracteres do hash
 * SHA-1 saem da API, nunca a senha. Se o serviço estiver fora do ar, a senha é aceita
 * (não travamos o cadastro por causa de um serviço externo).
 */
export function criarValidadorDeSenha({
  verificarVazamento = true,
  fetchImpl = fetch,
}: Opcoes = {}) {
  return async function validarSenha(value: unknown): Promise<string | undefined> {
    if (typeof value !== 'string') return 'Senha inválida.';
    if (value.length < SENHA_MINIMO) {
      return `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.`;
    }
    if (value.length > SENHA_MAXIMO) {
      return `A senha pode ter no máximo ${SENHA_MAXIMO} caracteres.`;
    }
    if (!verificarVazamento) return undefined;

    try {
      const hash = createHash('sha1').update(value).digest('hex').toUpperCase();
      const prefixo = hash.slice(0, 5);
      const sufixo = hash.slice(5);
      const resposta = await fetchImpl(
        `https://api.pwnedpasswords.com/range/${prefixo}`,
        {
          headers: { 'Add-Padding': 'true' },
          signal: AbortSignal.timeout(2500),
        },
      );
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

      const texto = await resposta.text();
      const vazada = texto.split('\n').some((linha) => {
        const [candidato, quantidade] = linha.trim().split(':');
        return candidato === sufixo && Number(quantidade) > 0;
      });
      if (vazada) {
        return 'Esta senha já apareceu em vazamentos de dados. Escolha outra.';
      }
    } catch (e) {
      logger.warn(
        `Não foi possível checar vazamento de senha (${e instanceof Error ? e.message : 'erro desconhecido'}); senha aceita.`,
      );
    }
    return undefined;
  };
}
