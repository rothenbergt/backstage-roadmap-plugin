import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { CommentService } from '../services/CommentService';
import { PermissionService } from '../services/PermissionService';

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
  router.post('/', async (req, res) => {
    try {
      const username = await permissionService.getUsername(req);
      const { featureId, text } = req.body;

      // Validate required fields
      if (!featureId) {
        res.status(400).json({ message: 'featureId is required' });
        return;
      }

      if (!text || text.trim() === '') {
        res.status(400).json({ message: 'Comment text cannot be empty' });
        return;
      }

      const result = await commentService.addComment({
        featureId,
        text,
        author: username,
      });

      res.status(201).json({ result });
    } catch (error) {
      logger.error(`Error in POST /comments: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get comments for a specific feature
  router.get('/', async (req, res) => {
    try {
      const { featureId } = req.query;
      if (!featureId || typeof featureId !== 'string') {
        res.status(400).json({
          message: 'featureId is required and must be a string',
        });
        return;
      }

      const comments = await commentService.getCommentsByFeatureId(featureId);
      res.status(200).json(comments);
    } catch (error) {
      logger.error(`Error in GET /comments: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return router;
}
