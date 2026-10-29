import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import supertokens from 'supertokens-node';
import { errorHandler } from 'supertokens-node/framework/express/index.js';

/** Converte os erros do SuperTokens (sessão inválida etc.) em respostas HTTP corretas. */
@Catch(supertokens.Error)
export class SupertokensExceptionFilter implements ExceptionFilter {
  private readonly handler = errorHandler();

  catch(exception: Error, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse();
    if (response.headersSent) return;

    this.handler(exception, http.getRequest(), response, (err: unknown) => {
      throw err;
    });
  }
}
