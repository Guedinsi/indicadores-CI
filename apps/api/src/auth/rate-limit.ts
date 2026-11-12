import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';

const MENSAGEM = {
  status: 'GENERAL_ERROR',
  message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
};

export const ROTAS_SENSIVEIS = [
  '/signin',
  '/signup',
  '/user/password/reset/token',
  '/user/password/reset',
  '/user/email/verify/token',
  '/user/email/verify',
];

function numero(valor: string | undefined, padrao: number): number {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

/**
 * Limita tentativas por IP.
 * - Rotas sensíveis de login/cadastro/senha/e-mail: poucas tentativas em 15 minutos.
 * - Demais rotas da API: limite generoso, só para barrar abuso e varredura.
 * Em produção atrás de proxy, defina TRUST_PROXY para o IP real ser o do cliente.
 */
export function aplicarLimitesDeRequisicao(
  app: NestExpressApplication,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.TRUST_PROXY) {
    const n = Number(env.TRUST_PROXY);
    app.set('trust proxy', Number.isNaN(n) ? env.TRUST_PROXY : n);
  }

  const sensivel = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: numero(env.RATE_LIMIT_AUTH, 30),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: MENSAGEM,
  });
  const geral = rateLimit({
    windowMs: 60 * 1000,
    limit: numero(env.RATE_LIMIT_GERAL, 300),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Muitas requisições. Tente novamente em instantes.' },
  });

  app.use('/api', geral);
  app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' && ROTAS_SENSIVEIS.includes(req.path)) {
      return sensivel(req, res, next);
    }
    next();
  });
}
