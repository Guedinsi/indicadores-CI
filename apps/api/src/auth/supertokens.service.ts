import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import supertokens from 'supertokens-node';
import EmailPassword from 'supertokens-node/recipe/emailpassword/index.js';
import Session from 'supertokens-node/recipe/session/index.js';

/**
 * Inicia o SuperTokens (conecta no "core" e registra as receitas de login).
 * Instanciado ao subir a API, antes de qualquer requisição.
 */
@Injectable()
export class SupertokensService {
  constructor(config: ConfigService) {
    const apiUrl = config.get<string>('API_PUBLIC_URL', 'http://localhost:3001');
    const webUrl = config.get<string>('WEB_URL', 'http://localhost:3000');

    supertokens.init({
      framework: 'express',
      supertokens: {
        connectionURI: config.get<string>(
          'SUPERTOKENS_CONNECTION_URI',
          'http://localhost:3567',
        ),
        apiKey: config.get<string>('SUPERTOKENS_API_KEY') || undefined,
      },
      appInfo: {
        appName: 'Indicadores CI',
        apiDomain: apiUrl,
        websiteDomain: webUrl,
        apiBasePath: '/api/auth',
        websiteBasePath: '/auth',
      },
      recipeList: [EmailPassword.init(), Session.init()],
    });
  }
}
