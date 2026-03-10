import 'reflect-metadata';
import './observability/otel';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { getConfig } from '@samachat/config';
import { getLogger } from '@samachat/logger';
import * as express from 'express';
import { AppModule } from './app.module';

interface RawBodyRequest extends express.Request {
  rawBody?: Buffer;
}

async function bootstrap() {
  const requiredEnv = ['REDIS_URL', 'DATABASE_URL', 'PROVIDER_SECRET'];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  if (missingEnv.length > 0) {
    throw new Error(`Missing required env vars: ${missingEnv.join(', ')}`);
  }

  process.env.SAMACHAT_SERVICE = process.env.SAMACHAT_SERVICE || 'api';
  const app = await NestFactory.create(AppModule, { cors: true });
  const appConfig = getConfig();
  const logger = getLogger({ service: 'api' });

  const maxBodyBytes = 1024 * 1024;

  app.use(
    express.json({
      limit: maxBodyBytes,
      verify: (req: RawBodyRequest, _res: express.Response, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: maxBodyBytes }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Samachat API')
    .setDescription('Samachat API base')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = appConfig.ports.api;
  await app.listen(port, '0.0.0.0');
  logger.info({ port }, 'API listening');
}

bootstrap();
