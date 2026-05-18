import { Router, Request, Response, NextFunction } from 'express';
import { HabitService } from '../services/habit.service.js';

const router = Router();
const habitService = new HabitService();

/**
 * GET /api/habits
 * List all habits for the authenticated user.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const habits = await habitService.getAll((req as any).user.id);
    res.status(200).json(habits);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/habits/:id
 * Get a single habit by ID for the authenticated user.
 */
router.get('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const habit = await habitService.getById((req as any).user.id, req.params.id);
    if (!habit) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Habit not found' });
      return;
    }
    res.status(200).json(habit);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/habits
 * Create a new habit for the authenticated user.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const habit = await habitService.create((req as any).user.id, req.body);
    res.status(201).json(habit);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/habits/:id
 * Update an existing habit for the authenticated user.
 */
router.put('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const habit = await habitService.update((req as any).user.id, req.params.id, req.body);
    res.status(200).json(habit);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/habits/:id
 * Delete a habit and all associated completions for the authenticated user.
 */
router.delete('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    await habitService.delete((req as any).user.id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export const habitRouter = router;
