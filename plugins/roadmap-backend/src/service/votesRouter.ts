import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { getUsername } from '../utils/routeUtils';

export function votesRouter(options: RouterOptions): express.Router {
  const { logger, db } = options;
  const router = Router();

  router.post('/:featureId', async (req, res) => {
    try {
      const featureId = req.params.featureId;
      const username = await getUsername(req, options);

      const voteAdded = await db.toggleVote(featureId, username);
      const newVoteCount = await db.getVoteCount(featureId);

      res.status(200).json({
        message: voteAdded ? 'Vote added' : 'Vote removed',
        voteCount: newVoteCount,
      });
    } catch (error) {
      logger.error(`Error toggling vote: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.get('/:featureId/count', async (req, res) => {
    try {
      const featureId = req.params.featureId;
      const count = await db.getVoteCount(featureId);
      res.json({ count });
    } catch (error) {
      logger.error(`Error getting vote count: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  router.get('/counts', async (req, res) => {
    try {
      const featureIds = (req.query.ids as string).split(',');
      const voteCounts = await db.getVoteCounts(featureIds);
      res.json(voteCounts);
    } catch (error) {
      logger.error(`Error getting vote counts: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return router;
}
