// Inicializa e configura a API do sistema.
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Disponibiliza os arquivos enviados pela rota /uploads.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // O front monta as URLs com VITE_API_URL (que termina em /api), então os
  // arquivos também precisam responder em /api/uploads.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads/',
  });

  // Inclui a origem padrão do WebView Android nas chamadas autenticadas.
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? "http://localhost:5173",
      "http://192.168.103.81:5173",
      "https://localhost",
    ],
    credentials: true
  });

  // Valida e transforma os dados recebidos pela API.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Aceita conexões de outros dispositivos da rede.
  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}
bootstrap();
