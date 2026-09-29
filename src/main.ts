import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.use(cookieParser());

  const allowedOrigins = [
    // Local development
    'http://localhost:3000',
    'http://localhost:3001',

    // Production frontend
    'https://ariejewels.store',
    'https://www.ariejewels.store',

    // Existing domains
    'https://bms-frontend-black.vercel.app',
    'https://hilltoptourism.in',
    'https://staging.hilltoptourism.in',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Requests without an Origin header
      // e.g. Postman, server-to-server, some mobile clients
      if (!origin) {
        return callback(null, true);
      }

      // Exact allowed domains
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Existing Vercel preview deployments
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },

    credentials: true,

    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  });

  // IMPORTANT:
  // Railway provides the production PORT.
  // Do not hardcode 3000 in production.
  const port = process.env.PORT || 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
