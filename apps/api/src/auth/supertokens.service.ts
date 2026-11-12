import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import supertokens from 'supertokens-node';
import EmailPassword from 'supertokens-node/recipe/emailpassword/index.js';
import EmailVerification from 'supertokens-node/recipe/emailverification/index.js';
import Session from 'supertokens-node/recipe/session/index.js';
import {
  criarEnvioConfirmacaoEmail,
  criarEnvioRedefinicaoSenha,
} from './emails.js';
import { criarValidadorDeSenha } from './password-policy.js';

@Injectable()
export class SupertokensService {
  private readonly logger = new Logger(SupertokensService.name);

  constructor(config: ConfigService) {
    const apiUrl = config.get<string>('API_PUBLIC_URL', 'http://localhost:3001');
    const webUrls = config
      .get<string>('WEB_URL', 'http://localhost:3000')
      .split(',')
      .map((u) => u.trim().replace(/\/$/, ''))
      .filter(Boolean);
    const webUrl = webUrls[0];
    const apiKey = config.get<string>('SUPERTOKENS_API_KEY') || undefined;
    const producao = config.get<string>('NODE_ENV') === 'production';

    if (producao) {
      for (const [nome, url] of [
        ['API_PUBLIC_URL', apiUrl],
        ...webUrls.map((u) => ['WEB_URL', u]),
      ]) {
        if (!url.startsWith('https://')) {
          throw new Error(`${nome} precisa começar com https:// em produção (recebido: ${url}).`);
        }
      }
      if (!apiKey) {
        this.logger.warn(
          'SUPERTOKENS_API_KEY vazia em produção: defina a chave (e API_KEYS no core).',
        );
      }
    }

    const validarSenha = criarValidadorDeSenha({
      verificarVazamento: config.get<string>('PASSWORD_BREACH_CHECK', 'true') !== 'false',
    });

    supertokens.init({
      framework: 'express',
      supertokens: {
        connectionURI: config.get<string>(
          'SUPERTOKENS_CONNECTION_URI',
          'http://localhost:3567',
        ),
        apiKey,
      },
      appInfo: {
        appName: 'Indicadores CI',
        apiDomain: apiUrl,
        websiteDomain: webUrl,
        apiBasePath: '/api/auth',
        websiteBasePath: '/auth',
      },
      recipeList: [
        EmailPassword.init({
          signUpFeature: {
            formFields: [{ id: 'password', validate: validarSenha }],
          },
          emailDelivery: { service: criarEnvioRedefinicaoSenha(config) },
        }),
        EmailVerification.init({
          mode: 'REQUIRED',
          emailDelivery: { service: criarEnvioConfirmacaoEmail(config) },
        }),
        Session.init({
          cookieDomain: config.get<string>('COOKIE_DOMAIN') || undefined,
        }),
      ],
    });
  }
}
