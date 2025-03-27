import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { VoteService } from '../services/VoteService';
import { PermissionService } from '../services/PermissionService';

/**
 * Router for vote-related endpoints
 */
export function votesRouter(options: RouterOptions): express.Router {
  const { logger, db } = options;
  const router = Router();

  // Initialize services
  const voteService = new VoteService(db, logger);
  const permissionService = new PermissionService(options);

  // Toggle vote for a feature
  router.post('/:featureId', async (req, res) => {
    try {
      const featureId = req.params.featureId;

      if (!featureId) {
        res.status(400).json({ message: 'Feature ID is required' });
        return;
      }

      const username = await permissionService.getUsername(req);
      const voteAdded = await voteService.toggleVote(featureId, username);
      const newVoteCount = await voteService.getVoteCount(featureId);

      res.status(200).json({
        message: voteAdded ? 'Vote added' : 'Vote removed',
        voteCount: newVoteCount,
      });
    } catch (error) {
      logger.error(`Error toggling vote: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get vote count for a feature
  router.get('/:featureId/count', async (req, res) => {
    try {
      const featureId = req.params.featureId;

      if (!featureId) {
        res.status(400).json({ message: 'Feature ID is required' });
        return;
      }

      const count = await voteService.getVoteCount(featureId);
      res.json({ count });
    } catch (error) {
      logger.error(`Error getting vote count: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.get('/counts', async (req, res) => {
    try {
      const idsParam = req.query.ids;

      // Handle empty parameter case gracefully
      if (!idsParam || typeof idsParam !== 'string' || idsParam === '') {
        // Send empty object for empty input rather than an error
        res.json({});
        return;
      }

      const featureIds = idsParam.split(',');

      if (featureIds.length === 0) {
        // Send empty object for empty array after splitting
        res.json({});
        return;
      }

      const voteCounts = await voteService.getVoteCounts(featureIds);
      res.json(voteCounts);
    } catch (error) {
      logger.error(`Error getting vote counts: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return router;
}
