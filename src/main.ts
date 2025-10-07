import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );


  const configService = app.get(ConfigService);
  const port = parseInt(configService.get<string>('PORT', '3000'), 10);
  const logger = new Logger('Bootstrap');

  const allowedOrigins = configService
    .get<string>('FRONTEND_ORIGIN', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}
bootstrap();