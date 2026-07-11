import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { VoteService } from '../services/VoteService';
import { PermissionService } from '../services/PermissionService';
import { RoadmapEventPublisher } from '../services/RoadmapEventPublisher';
import { InputError } from '@backstage/errors';

/**
 * Upper bound on ids per batch request. The board fetches votes for the
 * features it renders, so this is generous for real clients while keeping a
 * single request from fanning out into unbounded database/GitLab work.
 */
const MAX_BATCH_IDS = 250;

function parseBatchIds(idsParam: unknown): string[] {
  if (!idsParam || typeof idsParam !== 'string') {
    return [];
  }
  const ids = [...new Set(idsParam.split(',').filter(Boolean))];
  if (ids.length > MAX_BATCH_IDS) {
    throw new InputError(
      `Too many ids: at most ${MAX_BATCH_IDS} are allowed per request`,
    );
  }
  return ids;
}

/**
 * Router for vote-related endpoints
 */
export function votesRouter(options: RouterOptions): express.Router {
  const { logger, db } = options;
  const router = Router();

  // Initialize services
  const voteService = new VoteService(db, logger);
  const permissionService = new PermissionService(options);
  const eventPublisher = new RoadmapEventPublisher(
    logger,
    options.events,
    options.signals,
  );

  // Get vote counts for multiple features
  router.get('/counts', async (req, res, next) => {
    try {
      const featureIds = parseBatchIds(req.query.ids);

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

  // Check if user has voted on multiple features (batch)
  router.get('/user/batch', async (req, res, next) => {
    try {
      const featureIds = parseBatchIds(req.query.ids);

      if (featureIds.length === 0) {
        res.json({});
        return;
      }

      const username = await permissionService.getUsername(req);
      const hasVotedMap = await voteService.hasVotedBatch(featureIds, username);

      res.json(hasVotedMap);
    } catch (error) {
      next(error);
    }
  });

  // --- Parameterized routes below ---

  // Toggle vote for a feature
  router.post('/:featureId', async (req, res, next) => {
    try {
      const featureId = req.params.featureId;

      if (!featureId) {
        throw new InputError('Feature ID is required');
      }

      const username = await permissionService.getUsername(req);
      const result = await voteService.toggleVote(featureId, username);
      eventPublisher.voteToggled(
        featureId,
        result.voteAdded,
        result.voteCount,
        username,
      );

      res.status(200).json(result);
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
