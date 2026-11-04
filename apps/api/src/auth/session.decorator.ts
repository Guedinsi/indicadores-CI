import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionContainer } from 'supertokens-node/recipe/session/index.js';

/** Injeta a sessão do usuário logado: me(@Session() session: SessionContainer) */
export const Session = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionContainer =>
    context.switchToHttp().getRequest().session,
);
