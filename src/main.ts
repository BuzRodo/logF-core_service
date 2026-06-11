import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ── Validación global ──────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // strip propiedades no decoradas
      forbidNonWhitelisted: false,
      transform: true,         // auto-cast de tipos
    }),
  );

  // ── Filtro de excepciones global ──────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Interceptor de logging ────────────────────────────────────────────────
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── CORS ──────────────────────────────────────────────────────────────────
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174';
  app.enableCors({
    origin: corsOrigin.split(',').map((s) => s.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    credentials: true,
  });

  // ── Swagger ───────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LogFood Core Service')
      .setDescription('API del sistema de gestión LogFood — Módulo POS (Fiserv ITD)')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger disponible en /api/docs');
  }

  // ── Arranque ──────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Servidor escuchando en http://localhost:${port}`);
  logger.log(`ITD POS_ID configurado: ${process.env.ITD_POS_ID ?? 'NO CONFIGURADO'}`);
}

bootstrap();
