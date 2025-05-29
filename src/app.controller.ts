import { Controller, Post, UploadedFile, UseInterceptors, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path'; 
import * as sharp from 'sharp';
import { createWorker, PSM } from 'tesseract.js';
import { Express } from 'express';
import * as fs from 'fs/promises'; 
import { GeminiService } from './gemini.service';
import { GooglePuppeteerService } from './puppeteer.service';

@Controller()
export class AppController {
  constructor(private readonly geminiService: GeminiService,
    private readonly pupetterService: GooglePuppeteerService, 
  ) {} 

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, 
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|tiff|bmp|webp)$/i)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'No file uploaded!' };
    }

    const originalFilePath = file.path;
    const preprocessedPath = join(file.destination, `preprocessed-${file.filename}`);

    try {
      await this.preprocessImage(originalFilePath, preprocessedPath);
      const extractedText = await this.extractText(preprocessedPath);
      await fs.unlink(originalFilePath);
      await fs.unlink(preprocessedPath); 
      const geminiResponse = await this.geminiService.analyzePreservatives(extractedText);
      const parsedResponse = typeof geminiResponse === 'string' ? JSON.parse(geminiResponse) : geminiResponse;
      console.log('Parsed Gemini response:', parsedResponse);
      const docs = [];

      for (const additive of parsedResponse.preservativesAdditives) {
        const results = await this.pupetterService.searchAndScrape(additive.name);
        
        docs.push({
          additive: additive.name,
          description: additive.description,
          results,
        });
      }
      
      return {
        statusCode: HttpStatus.OK,
        message: 'Text extracted and processed successfully',
        extractedText, 
         geminiResponse,
        docs,
      };
    } catch (err) {
      console.error('Error during file upload and processing:', err);
      await this.safeDelete([originalFilePath, preprocessedPath]);
      throw new InternalServerErrorException('Error processing image: ' + err.message);
    }
  }


  private async preprocessImage(inputPath: string, outputPath: string) {
    try {
      const metadata = await sharp(inputPath).metadata();
      let image = sharp(inputPath)
        .grayscale() 
        .normalize() 
        .sharpen() 
        .modulate({ brightness: 1.2 }) 
        .linear(1.2, 0) 
        .threshold(150) 
        .median(1); 

      if (metadata.width && metadata.width < 600) {
        image = image.resize({
          width: metadata.width * 2, 
          height: metadata.height ? metadata.height * 2 : undefined, 
          fit: 'inside',
          kernel: sharp.kernel.lanczos3, 
        });
      }

      await image.toFile(outputPath);
      console.log(`Image preprocessed from ${inputPath} to ${outputPath}`);
    } catch (error) {
      console.error('Error during image preprocessing:', error);
      throw new Error('Failed to preprocess image.');
    }
  }


  private async extractText(imagePath: string): Promise<string> {
    const tessdataPath = join(process.cwd(), 'tessdata');

    const worker = await createWorker('eng', 1, { 
      langPath: tessdataPath, 
      logger: m => console.log(m) 
    });

    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?\'"@#$%&*()-_+=/\\:',
      tessedit_pageseg_mode: PSM.SPARSE_TEXT_OSD,
      preserve_interword_spaces: '1',
    });

    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate(); 

    console.log('Raw extracted text:', text);
    return this.postProcessText(text);
  }


  private postProcessText(text: string): string {
    if (!text) return '';

    return text
      .replace(/[\r\n]+/g, ' ') 
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      .replace(/[^a-zA-Z0-9.,?!'"@#$%&*()\-_+=/\\\s]/g, '') // Remove most non-alphanumeric/punctuation
      .replace(/\s*([.,?!])\s*/g, '$1 ') // Ensure single space after punctuation
      .replace(/(^|\.\s*|\?\s*|!\s*)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase()) // Capitalize sentence beginnings
      .trim(); // Remove leading/trailing whitespace
  }

 
  private async safeDelete(paths: string[]) {
    for (const path of paths) {
      try {
        await fs.unlink(path);
        console.log(`Successfully deleted: ${path}`);
      } catch (err) {
        // Ignore errors, especially if the file doesn't exist (ENOENT)
        if (err.code !== 'ENOENT') {
          console.warn(`Could not delete file ${path}: ${err.message}`);
        }
      }
    }
  }
}