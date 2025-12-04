import type { Request, Response, NextFunction } from 'express';
import { loadService } from './load.service.js';

export class LoadController {
  async loadWorkshop(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);

      if (isNaN(workshopId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID',
          code: 'INVALID_WORKSHOP_ID',
        });
      }

      const result = await loadService.loadWorkshop(workshopId);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Workshop not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'WORKSHOP_NOT_FOUND',
          });
        }

        if (error.message.includes('Permission denied')) {
          return res.status(500).json({
            error: 'Server Configuration Error',
            message: error.message,
            code: 'SUDO_PERMISSION_REQUIRED',
          });
        }

        if (error.message.includes('Shell script not found')) {
          return res.status(500).json({
            error: 'Server Configuration Error',
            message: error.message,
            code: 'SCRIPT_NOT_FOUND',
          });
        }

        return res.status(500).json({
          error: 'Internal Server Error',
          message: error.message,
          code: 'LOAD_FAILED',
        });
      }
      next(error);
    }
  }
}

export const loadController = new LoadController();
