import { Router, Request, Response, NextFunction } from 'express';
import { AuthenticationService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
const authService = new AuthenticationService();

/**
 * POST /api/auth/register
 * Create a new user account.
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate and receive token.
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Invalidate current token. Requires authentication.
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader!.slice(7); // We know it exists because authMiddleware passed
    await authService.logout(token);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

export const authRouter = router;
