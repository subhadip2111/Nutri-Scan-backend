import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GeminiService } from './gemini.service';
import { ConfigModule } from '@nestjs/config';
import { GooglePuppeteerService } from './puppeteer.service';
import { HttpModule } from '@nestjs/axios';
import { ApiKeyMiddleware } from './middleware/swaggerAuth';
import { SummaryModule } from './summary/summary.module';
import { FoodModule } from './food/food.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [HttpModule, ConfigModule.forRoot({isGlobal: true}), MongooseModule.forRoot(process.env.MONGODB_URI), SummaryModule, FoodModule],



  controllers: [AppController],
  providers: [AppService, GeminiService, GooglePuppeteerService, ApiKeyMiddleware],
})
export class AppModule { }
