import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { VoteService } from '../services/VoteService';
import { PermissionService } from '../services/PermissionService';
import { InputError } from '@backstage/errors';

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
  router.post('/:featureId', async (req, res, next) => {
    try {
      const featureId = req.params.featureId;

      if (!featureId) {
        throw new InputError('Feature ID is required');
      }

      const username = await permissionService.getUsername(req);
      const voteAdded = await voteService.toggleVote(featureId, username);
      const newVoteCount = await voteService.getVoteCount(featureId);

      res.status(200).json({
        voteAdded,
        voteCount: newVoteCount,
      });
    } catch (error) {
      next(error);
    }
  });

  // Get vote count for a feature
  router.get('/:featureId/count', async (req, res, next) => {
    try {
      const featureId = req.params.featureId;

      if (!featureId) {
        throw new InputError('Feature ID is required');
      }

      const count = await voteService.getVoteCount(featureId);
      res.json(count);
    } catch (error) {
      next(error);
    }
  });

  // Get vote counts for multiple features
  router.get('/counts', async (req, res, next) => {
    try {
      const idsParam = req.query.ids;

      // Handle empty parameter case gracefully
      if (!idsParam || typeof idsParam !== 'string' || idsParam === '') {
        res.json({});
        return;
      }

      const featureIds = idsParam.split(',');

      if (featureIds.length === 0) {
        res.json({});
        return;
      }

      const voteCounts = await voteService.getVoteCounts(featureIds);
      res.json(voteCounts);
    } catch (error) {
      next(error);
    }
  });

  // Check if a user has voted on a feature
  router.get('/:featureId/user', async (req, res, next) => {
    try {
      const featureId = req.params.featureId;

      if (!featureId) {
        throw new InputError('Feature ID is required');
      }

      const username = await permissionService.getUsername(req);
      const hasVoted = await voteService.hasVoted(featureId, username);

      res.json(hasVoted);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
