import { Controller, Get, UseGuards } from '@nestjs/common';
import supertokens from 'supertokens-node';
import type { SessionContainer } from 'supertokens-node/recipe/session/index.js';
import { AuthGuard } from './auth.guard.js';
import { Session } from './session.decorator.js';

@Controller('me')
export class MeController {
  /** Dados do usuário logado (GET /api/me). Sem sessão: 401. */
  @Get()
  @UseGuards(AuthGuard)
  async me(@Session() session: SessionContainer) {
    const userId = session.getUserId();
    const user = await supertokens.getUser(userId);

    return {
      userId,
      email: user?.emails[0] ?? null,
      createdAt: user ? new Date(user.timeJoined).toISOString() : null,
    };
  }
}
