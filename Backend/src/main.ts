import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { reportError } from './common/error-report';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParserFn = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefixo global: todas as rotas ficam em /api/...
  app.setGlobalPrefix('api');

  // Filtro global de exceções — reporta erros técnicos (5xx) ao Painel VPS
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  // Cookie parser (necessário para ler o admin_token)
  app.use(cookieParserFn());

  // Validação automática de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // CORS — permitir Admin (Next.js) e futuro frontend
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: origins,
    credentials: true, // necessário para cookies HTTP-only
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`\n🚀 Backend NestJS a correr em http://localhost:${port}/api\n`);
}

// Erros fatais ao nível do processo → reportar ao Painel VPS
process.on('unhandledRejection', (reason: unknown) => {
  reportError({
    source: 'backend',
    level: 'fatal',
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    meta: { kind: 'unhandledRejection' },
  });
});
process.on('uncaughtException', (err: Error) => {
  reportError({
    source: 'backend',
    level: 'fatal',
    message: err.message,
    stack: err.stack,
    meta: { kind: 'uncaughtException' },
  });
});

bootstrap();
