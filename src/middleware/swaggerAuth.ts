// src/middleware/swaggerAuth.ts

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.SWAGGER_API_KEY 

    if (req.path === '/' || req.path.startsWith('/swagger') || req.path.startsWith('/favicon')) {
      return next();
    }

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException('Missing or invalid API key');
    }

    next();
  }
}
