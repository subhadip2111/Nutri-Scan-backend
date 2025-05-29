import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GeminiService } from './gemini.service';
import { ConfigModule } from '@nestjs/config';
import { GooglePuppeteerService } from './puppeteer.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule,ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
  })],
  controllers: [AppController],
  providers: [AppService,GeminiService,GooglePuppeteerService],
})
export class AppModule {}
