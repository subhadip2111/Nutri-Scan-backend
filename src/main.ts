import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ApiKeyMiddleware } from './middleware/swaggerAuth';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // Strip properties that don't have decorators
    forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are found
    transform: true,            // Automatically transform payloads to DTO classes
  }));
  app.useStaticAssets(join(__dirname, '..', 'uploads'));
  const config = new DocumentBuilder()
    .setTitle('Nutri-scan API')
    .setDescription('API documentation for Nutri-scan')
    .setVersion('1.0')
    .addTag('Endpoints')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      'x-api-key',
    )
    .addSecurityRequirements('x-api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/', app, document); 
  app.use(new ApiKeyMiddleware().use); 
   app.useGlobalPipes(new ValidationPipe());
  await app.listen(5001);
  console.log(`Application is running on: http://localhost:5001`);
  console.log(`Swagger API docs available at: http://localhost:5001`);
}

bootstrap();
