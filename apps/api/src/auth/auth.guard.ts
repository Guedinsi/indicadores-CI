import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { VerifySessionOptions } from 'supertokens-node/recipe/session/index.js';
import { verifySession } from 'supertokens-node/recipe/session/framework/express/index.js';

/** Exige sessão válida (cookie do SuperTokens). Uso: @UseGuards(AuthGuard) */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly options?: VerifySessionOptions;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const response = http.getResponse();
    let error: unknown;

    await verifySession(this.options)(http.getRequest(), response, (err) => {
      error = err;
    });

    if (response.headersSent) return false;
    if (error) throw error; // vira 401 pelo SupertokensExceptionFilter
    return true;
  }
}
