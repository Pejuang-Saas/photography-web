import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.enableShutdownHooks();

  // Behind a reverse proxy (Traefik on Dokploy) every request arrives from the proxy's address, and
  // the visitor's is in X-Forwarded-For. Without this the rate limit counts all visitors together,
  // as one client. It is the number of proxies in front of the API: 1 for Traefik alone, 2 with
  // Cloudflare in front of Traefik, 0 when the API is reached directly.
  const proxies = Number(
    process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? 1 : 0),
  );
  if (Number.isInteger(proxies) && proxies > 0) app.set('trust proxy', proxies);

  app.enableCors({
    origin: process.env.WEB_URL,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API is running on http://localhost:${port}`);
}

bootstrap();
