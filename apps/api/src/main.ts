import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import supertokens from 'supertokens-node';
import { middleware } from 'supertokens-node/framework/express/index.js';
import { AppModule } from './app.module.js';
import { aplicarLimitesDeRequisicao } from './auth/rate-limit.js';
import { SupertokensExceptionFilter } from './auth/supertokens.filter.js';

function origensPermitidas(valor: string): string[] {
  const origens = valor.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  if (origens.length === 0 || origens.includes('*')) {
    throw new Error('WEB_URL deve listar os endereços reais do site (nunca "*", por causa dos cookies).');
  }
  return origens;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: origensPermitidas(process.env.WEB_URL ?? 'http://localhost:3000'),
    credentials: true,
    allowedHeaders: ['content-type', ...supertokens.getAllCORSHeaders()],
  });

  aplicarLimitesDeRequisicao(app);

  app.use(middleware());
  app.useGlobalFilters(new SupertokensExceptionFilter());

  await app.listen(process.env.API_PORT ?? process.env.PORT ?? 3001);
}
await bootstrap();