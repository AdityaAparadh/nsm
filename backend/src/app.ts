import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './api/v1/auth/auth.routes.js';
import usersRoutes from './api/v1/users/users.routes.js';
import workshopsRoutes from './api/v1/workshops/workshops.routes.js';
import enrollmentsRoutes from './api/v1/enrollments/enrollments.routes.js';
import submissionsRoutes from './api/v1/submissions/submissions.routes.js';
import certificatesRoutes from './api/v1/certificates/certificates.routes.js';
import storageRoutes from './api/v1/storage/storage.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes - v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/workshops', workshopsRoutes);
app.use('/api/v1/enrollments', enrollmentsRoutes);
app.use('/api/v1/submissions', submissionsRoutes);
app.use('/api/v1/certificates', certificatesRoutes);
app.use('/api/v1/storage', storageRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
