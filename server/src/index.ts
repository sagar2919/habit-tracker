import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authRouter } from './controllers/auth.controller.js';
import { habitRouter } from './controllers/habit.controller.js';
import { completionRouter } from './controllers/completion.controller.js';
import { analyticsRouter } from './controllers/analytics.controller.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { timeoutError } from './utils/errors.js';

const app = express();

// CORS configuration
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// JSON body parsing
app.use(express.json());

// Request timeout middleware (10 second limit)
app.use((_req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      next(timeoutError('Request timed out'));
    }
  }, 10000);

  // Clear timeout when response finishes
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));

  next();
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRouter);

// Habit routes (all require authentication)
app.use('/api/habits', authMiddleware, habitRouter);
app.use('/api/habits', authMiddleware, completionRouter);

// Analytics routes (all require authentication)
app.use('/api', authMiddleware, analyticsRouter);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
