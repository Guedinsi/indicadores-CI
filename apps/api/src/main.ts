import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import supertokens from 'supertokens-node';
import { middleware } from 'supertokens-node/framework/express/index.js';
import { AppModule } from './app.module.js';
import { SupertokensExceptionFilter } from './auth/supertokens.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS com cookies: o site (porta 3000) chama a API (porta 3001) enviando a sessão
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['content-type', ...supertokens.getAllCORSHeaders()],
  });

  // Rotas /api/auth/* (login, cadastro, logout, refresh) são tratadas pelo SuperTokens
  app.use(middleware());
  app.useGlobalFilters(new SupertokensExceptionFilter());

  await app.listen(process.env.API_PORT ?? process.env.PORT ?? 3001);
}
await bootstrap();
