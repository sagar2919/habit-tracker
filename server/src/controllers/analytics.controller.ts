import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';

const router = Router();
const analyticsService = new AnalyticsService();

/**
 * GET /api/habits/:id/analytics
 * Get streak and consistency metrics for a specific habit.
 */
router.get('/habits/:id/analytics', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const habitId = req.params.id;

    const [consistency7d, consistency30d, consistencyAll, streak] = await Promise.all([
      analyticsService.calculateConsistency(habitId, '7d'),
      analyticsService.calculateConsistency(habitId, '30d'),
      analyticsService.calculateConsistency(habitId, 'all'),
      analyticsService.calculateStreak(habitId),
    ]);

    res.status(200).json({
      consistency: {
        '7d': consistency7d,
        '30d': consistency30d,
        all: consistencyAll,
      },
      streak: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/dashboard
 * Get dashboard summary data for the authenticated user.
 */
router.get('/analytics/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await analyticsService.getDashboardSummary((req as any).user.id);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/habits/:id/heatmap
 * Get 12-month heatmap data for a specific habit.
 */
router.get('/habits/:id/heatmap', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const habitId = req.params.id;
    const heatmapData = await analyticsService.getHeatmapData(habitId);
    res.status(200).json(heatmapData);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/analytics/weekly-summary
 * Get weekly completion summary for the authenticated user.
 */
router.get('/analytics/weekly-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weeklySummary = await analyticsService.getWeeklySummary((req as any).user.id);
    res.status(200).json(weeklySummary);
  } catch (err) {
    next(err);
  }
});

export const analyticsRouter = router;
