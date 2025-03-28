import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { CommentService } from '../services/CommentService';
import { PermissionService } from '../services/PermissionService';
import { InputError } from '@backstage/errors';

/**
 * Router for comment-related endpoints
 */
export function commentsRouter(options: RouterOptions): express.Router {
  const { logger, db } = options;
  const router = Router();

  // Initialize services
  const commentService = new CommentService(db, logger);
  const permissionService = new PermissionService(options);

  // Add a comment to a feature
  router.post('/', async (req, res, next) => {
    try {
      const username = await permissionService.getUsername(req);
      const { featureId, text } = req.body;

      const result = await commentService.addComment({
        featureId,
        text,
        author: username,
      });

      res.status(201).json({ result });
    } catch (error) {
      next(error);
    }
  });

  // Get comments for a specific feature
  router.get('/', async (req, res, next) => {
    try {
      const { featureId } = req.query;
      if (!featureId || typeof featureId !== 'string') {
        throw new InputError('featureId is required and must be a string');
      }

      const comments = await commentService.getCommentsByFeatureId(featureId);
      res.status(200).json(comments);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
