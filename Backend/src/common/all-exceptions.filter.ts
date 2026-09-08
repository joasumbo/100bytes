import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { reportError } from './error-report';

/**
 * Apanha todas as exceções não tratadas. Erros técnicos (5xx) são reportados
 * ao Painel VPS; 4xx (validação/auth) não geram alerta.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ url?: string; method?: string; originalUrl?: string }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const message =
      exception instanceof Error ? exception.message : String(exception);
    const path = req?.originalUrl || req?.url;

    if (status >= 500) {
      this.logger.error(`${req?.method} ${path} → ${message}`);
      // Pagamentos: marcar a origem como "payment" quando a rota é de pagamento
      const source = path && /pay|checkout|pag'?ment|multicaixa/i.test(path)
        ? 'payment'
        : 'backend';
      reportError({
        source,
        level: 'error',
        message,
        stack: exception instanceof Error ? exception.stack : undefined,
        url: path,
        meta: { method: req?.method, status },
      });
    }

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: 500, message: 'Erro interno do servidor' };

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }
}
