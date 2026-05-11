/**
 * Serverless entry point para Vercel.
 * Inicializa o NestJS uma vez e reutiliza a instância Express em cada invocação.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'http';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParserFn = require('cookie-parser');

const expressApp = express();
let isReady = false;

const readyPromise = (async () => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn'],
  });

  app.use(cookieParserFn());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }),
  );

  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.init();
  isReady = true;
})();

export async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!isReady) await readyPromise;
  expressApp(req as any, res as any);
}
