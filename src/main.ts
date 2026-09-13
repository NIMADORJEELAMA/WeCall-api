import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'reflect-metadata';
import * as express from 'express';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  // const app = await NestFactory.create(AppModule);
  // app.use(express.json());
  // app.use(express.urlencoded({ extended: true }));
  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://bms-frontend-black.vercel.app',
        'https://hilltoptourism.in',
        'https://staging.hilltoptourism.in',
      ];

      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });
  // app.enableCors({
  //   // Allow the Next.js URL AND any mobile request (which usually has no origin)
  //   origin: (origin, callback) => {
  //     const allowedOrigins = ['http://localhost:3001'];
  //     // If there's no origin (like in React Native) or it's in our allowed list
  //     if (!origin || allowedOrigins.includes(origin)) {
  //       callback(null, true);
  //     } else {
  //       callback(new Error('Not allowed by CORS'));
  //     }
  //   },
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   credentials: true,
  // });

  await app.listen(3000, '0.0.0.0'); // while running local
  // await app.listen(process.env.PORT || 3000);    // for staging and production
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
