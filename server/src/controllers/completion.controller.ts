import { Router, Request, Response, NextFunction } from 'express';
import { CompletionService } from '../services/completion.service.js';

const router = Router();
const completionService = new CompletionService();

/**
 * POST /api/habits/:id/completions
 * Mark a habit as complete for a given date.
 */
router.post('/:id/completions', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const completion = await completionService.markComplete(
      (req as any).user.id,
      req.params.id,
      req.body.date
    );
    res.status(201).json(completion);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/habits/:id/completions/:date
 * Unmark a habit completion for a given date.
 */
router.delete('/:id/completions/:date', async (req: Request<{ id: string; date: string }>, res: Response, next: NextFunction) => {
  try {
    await completionService.unmarkComplete(
      (req as any).user.id,
      req.params.id,
      req.params.date
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export const completionRouter = router;
