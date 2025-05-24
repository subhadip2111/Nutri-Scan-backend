import { Controller, Post, UploadedFile, UseInterceptors, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path'; // Make sure 'join' is imported
import * as sharp from 'sharp';
import { createWorker, PSM } from 'tesseract.js';
import { Express } from 'express';
import * as fs from 'fs/promises'; // Use fs.promises for async operations
import { GeminiService } from './gemini.service';

@Controller()
export class AppController {
  constructor(private readonly geminiService: GeminiService) {} 

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads', // Ensure this directory exists or is created
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
      fileFilter: (req, file, cb) => {
        // Allow common image file types
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
    // Define a path for the preprocessed image in the same 'uploads' directory
    const preprocessedPath = join(file.destination, `preprocessed-${file.filename}`);

    try {
      // Step 1: Preprocess the uploaded image for better OCR accuracy
      await this.preprocessImage(originalFilePath, preprocessedPath);

      // Step 2: Extract text using Tesseract.js from the preprocessed image
      const extractedText = await this.extractText(preprocessedPath);

      // Step 3: Delete temporary files after extraction
      await fs.unlink(originalFilePath); // Delete the original uploaded file
      await fs.unlink(preprocessedPath); // Delete the preprocessed file

      // Step 4: Send the extracted text to your GeminiService for analysis
      const geminiResponse = await this.geminiService.analyzePreservatives(extractedText);
console.log(`Gemini response: ${geminiResponse}`);
      return {
        statusCode: HttpStatus.OK,
        message: 'Text extracted and processed successfully',
        extractedText, // Optionally return extracted text for debugging/info
         geminiResponse, // The analysis result from Gemini
      };
    } catch (err) {
      console.error('Error during file upload and processing:', err);
      // Ensure temporary files are cleaned up even on error
      await this.safeDelete([originalFilePath, preprocessedPath]);
      throw new InternalServerErrorException('Error processing image: ' + err.message);
    }
  }


  private async preprocessImage(inputPath: string, outputPath: string) {
    try {
      const metadata = await sharp(inputPath).metadata();
      let image = sharp(inputPath)
        .grayscale() // Convert to grayscale
        .normalize() // Normalize histogram
        .sharpen() // Sharpen the image
        .modulate({ brightness: 1.2 }) // Increase brightness slightly
        .linear(1.2, 0) // Increase contrast
        .threshold(150) // Apply adaptive thresholding (adjust value if needed)
        .median(1); // Apply median filter to remove noise

      // If image is very small, resize it to improve OCR
      if (metadata.width && metadata.width < 600) {
        image = image.resize({
          width: metadata.width * 2, // Double the width
          height: metadata.height ? metadata.height * 2 : undefined, // Double height if available
          fit: 'inside',
          kernel: sharp.kernel.lanczos3, // High-quality interpolation
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

    const worker = await createWorker('eng', 1, { // 'eng' for English, '1' for logging level (0 for no logs)
      langPath: tessdataPath, // Crucial: Tell Tesseract where to find the .traineddata files
      logger: m => console.log(m) // Optional: Log Tesseract.js progress
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