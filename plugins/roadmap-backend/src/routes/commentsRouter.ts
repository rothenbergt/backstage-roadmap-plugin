import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { CommentService } from '../services/CommentService';
import { PermissionService } from '../services/PermissionService';
import { RoadmapNotificationService } from '../services/RoadmapNotificationService';
import { RoadmapEventPublisher } from '../services/RoadmapEventPublisher';
import { getAdminUsers } from '../config';
import {
  InputError,
  NotAllowedError,
  NotImplementedError,
} from '@backstage/errors';

/**
 * Router for comment-related endpoints
 */
export function commentsRouter(options: RouterOptions): express.Router {
  const { logger, db, datasource } = options;
  const router = Router();

  // Initialize services
  const commentService = new CommentService(db, logger, datasource);
  const permissionService = new PermissionService(options);
  const roadmapNotifications = options.notifications
    ? new RoadmapNotificationService(
        options.notifications,
        logger,
        getAdminUsers(options.config),
      )
    : undefined;
  const eventPublisher = new RoadmapEventPublisher(
    logger,
    options.events,
    options.signals,
  );

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

      if (roadmapNotifications) {
        // Fire-and-forget: neither the feature lookup nor the send may fail
        // the comment request.
        db.getFeatureById(comment.featureId)
          .then(feature =>
            roadmapNotifications.notifyCommentAdded(feature, username),
          )
          .catch(error => {
            logger.warn(
              `Failed to send comment notification for feature ${featureId}: ${error}`,
            );
          });
      }

      eventPublisher.commentAdded(comment, username);
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
        throw new NotImplementedError(
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
      eventPublisher.commentDeleted(commentId, username);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
