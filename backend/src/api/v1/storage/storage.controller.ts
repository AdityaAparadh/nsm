import type { Request, Response, NextFunction } from 'express';
import { storageService } from './storage.service.js';
import { uploadUrlRequestSchema, downloadUrlRequestSchema } from './storage.validation.js';
import { z } from 'zod';

export class StorageController {
  async generateUploadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = uploadUrlRequestSchema.parse(req.body);
      const result = await storageService.generateUploadUrl(validatedData);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'S3 bucket is not configured') {
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Storage service is not configured',
            code: 'STORAGE_NOT_CONFIGURED',
          });
        }
      }
      next(error);
    }
  }

  async generateDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = downloadUrlRequestSchema.parse(req.body);
      const result = await storageService.generateDownloadUrl(validatedData);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'S3 bucket is not configured') {
          return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Storage service is not configured',
            code: 'STORAGE_NOT_CONFIGURED',
          });
        }

        if (error.message === 'File not found in S3') {
          return res.status(404).json({
            error: 'Not Found',
            message: 'File not found in S3',
            code: 'FILE_NOT_FOUND',
          });
        }
      }
      next(error);
    }
  }
}

export const storageController = new StorageController();
