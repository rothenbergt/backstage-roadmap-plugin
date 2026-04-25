import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { CommentService } from '../services/CommentService';
import { PermissionService } from '../services/PermissionService';
import { InputError, NotAllowedError } from '@backstage/errors';

/**
 * Router for comment-related endpoints
 */
export function commentsRouter(options: RouterOptions): express.Router {
  const { logger, db, datasource } = options;
  const router = Router();

  // Initialize services
  const commentService = new CommentService(db, logger, datasource);
  const permissionService = new PermissionService(options);

  // Add a comment to a feature
  router.post('/', async (req, res, next) => {
    try {
      const username = await permissionService.getUsername(req);
      const { featureId, text } = req.body;

      const comment = await commentService.addComment({
        featureId,
        text,
        author: username,
      });

      res.status(201).json(comment);
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

  router.delete('/:commentId', async (req, res, next) => {
    try {
      if (datasource !== 'database') {
        throw new NotAllowedError(
          'This operation is not supported for the GitLab roadmap datasource',
        );
      }
      const username = await permissionService.getUsername(req);
      const isAdmin = await permissionService.isRoadmapAdmin(req, username);
      if (!isAdmin) {
        throw new NotAllowedError('User is not a Roadmap admin');
      }
      const { commentId } = req.params;
      await commentService.deleteComment(commentId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
