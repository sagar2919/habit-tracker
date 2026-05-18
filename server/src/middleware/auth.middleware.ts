import { Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../services/auth.service.js';

const authService = new AuthenticationService();

/**
 * Auth middleware that extracts Bearer token from Authorization header,
 * validates it via AuthenticationService, and attaches user to request.
 * Returns 401 for missing, malformed, or expired/invalid tokens.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Please log in to continue',
    });
    return;
  }

  // Check for Bearer prefix
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Please log in to continue',
    });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Please log in to continue',
    });
    return;
  }

  try {
    const user = await authService.validateToken(token);

    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Please log in to continue',
      });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Please log in to continue',
    });
  }
}
