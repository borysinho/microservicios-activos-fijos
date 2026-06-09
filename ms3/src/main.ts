import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { AppConfig } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(AppConfig);

  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    }),
  );
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(config.port);
}

void bootstrap();
