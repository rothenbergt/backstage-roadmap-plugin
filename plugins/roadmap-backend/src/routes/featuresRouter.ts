import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { FeatureService } from '../services/FeatureService';
import { PermissionService } from '../services/PermissionService';
import { RoadmapNotificationService } from '../services/RoadmapNotificationService';
import { RoadmapEventPublisher } from '../services/RoadmapEventPublisher';
import { getAdminUsers } from '../config';

import {
  NotAllowedError,
  NotImplementedError,
  InputError,
} from '@backstage/errors';
/**
 * Router for feature-related endpoints
 */
export function featuresRouter(options: RouterOptions): express.Router {
  const { logger, db, boardColumns, datasource } = options;
  const router = Router();

  // Initialize services
  const featureService = new FeatureService(
    db,
    logger,
    boardColumns,
    datasource,
  );
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

  router.get('/board-config', async (_req, res, next) => {
    try {
      res.status(200).json(options.boardConfigResponse);
    } catch (error) {
      next(error);
    }
  });

  // Create new feature
  router.post('/', async (req, res, next) => {
    try {
      const username = await permissionService.getUsername(req);
      const canCreate = await permissionService.canCreateFeature(req, username);
      if (!canCreate) {
        throw new NotAllowedError(
          'User does not have permission to create features',
        );
      }
      const { title, description } = req.body;

      if (!title || typeof title !== 'string') {
        throw new InputError('Title is required');
      }
      if (!description || typeof description !== 'string') {
        throw new InputError('Description is required');
      }

      const feature = await featureService.addFeature(
        { title, description },
        username,
      );
      roadmapNotifications?.notifyFeatureCreated(feature, username);
      eventPublisher.featureCreated(feature, username);
      res.status(201).json(feature);
    } catch (error) {
      next(error);
    }
  });

  // Get all features. The search collator module reads this endpoint with a
  // service token, so it must stay accessible to service principals.
  router.get('/', async (req, res, next) => {
    try {
      const raw = req.query.includeBeyondRetention;
      const includeBeyondRetention =
        datasource === 'database' &&
        typeof raw === 'string' &&
        (raw === 'true' || raw === '1');
      const features = await featureService.listFeaturesForBoard(
        includeBeyondRetention,
      );
      res.status(200).json(features);
    } catch (error) {
      next(error);
    }
  });

  router.put('/reorder', async (req, res, next) => {
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
      const { status, orderedIds } = req.body as {
        status?: string;
        orderedIds?: string[];
      };
      if (
        !status ||
        !Object.values(FeatureStatus).includes(status as FeatureStatus)
      ) {
        throw new InputError('Invalid status');
      }
      if (
        !Array.isArray(orderedIds) ||
        !orderedIds.every(id => typeof id === 'string')
      ) {
        throw new InputError('orderedIds must be an array of string ids');
      }
      await featureService.reorderFeatures(status as FeatureStatus, orderedIds);
      eventPublisher.boardReordered(status as FeatureStatus, username);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Update feature status (admin only) — after literal paths, before PUT /:id
  router.put('/:id/status', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(FeatureStatus).includes(status)) {
        throw new InputError(
          `Invalid status. Must be one of: ${Object.values(FeatureStatus).join(
            ', ',
          )}`,
        );
      }

      const username = await permissionService.getUsername(req);
      const isAdmin = await permissionService.isRoadmapAdmin(req, username);

      if (!isAdmin) {
        throw new NotAllowedError('User is not a Roadmap admin');
      }

      const before = await featureService.getFeatureById(id);
      const updatedFeature = await featureService.updateFeatureStatus(
        id,
        status,
      );
      if (before.status !== updatedFeature.status) {
        roadmapNotifications?.notifyStatusChanged(
          updatedFeature,
          before.status,
          username,
        );
        eventPublisher.statusChanged(updatedFeature, before.status, username);
      }
      res.status(200).json(updatedFeature);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      if (datasource !== 'database') {
        throw new NotImplementedError(
          'This operation is not supported for the GitLab roadmap datasource',
        );
      }
      const { id } = req.params;
      const { title, description } = req.body as {
        title?: unknown;
        description?: unknown;
      };
      if (title === undefined && description === undefined) {
        throw new InputError(
          'At least one of title or description is required',
        );
      }
      if (title !== undefined && typeof title !== 'string') {
        throw new InputError('title must be a string');
      }
      if (description !== undefined && typeof description !== 'string') {
        throw new InputError('description must be a string');
      }

      const username = await permissionService.getUsername(req);
      const isAdmin = await permissionService.isRoadmapAdmin(req, username);

      if (!isAdmin) {
        await featureService.assertAuthorSuggestedOrNotFound(id, username);
      }
      const updated = await featureService.updateFeatureDetails(id, {
        title,
        description,
      });
      eventPublisher.featureUpdated(updated, username);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      if (datasource !== 'database') {
        throw new NotImplementedError(
          'This operation is not supported for the GitLab roadmap datasource',
        );
      }
      const { id } = req.params;
      const username = await permissionService.getUsername(req);
      const isAdmin = await permissionService.isRoadmapAdmin(req, username);

      if (!isAdmin) {
        await featureService.assertAuthorSuggestedOrNotFound(id, username);
      }
      await featureService.deleteFeature(id);
      eventPublisher.featureDeleted(id, username);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Get feature by ID (must be after static paths like /reorder)
  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const feature = await featureService.getFeatureById(id);
      res.status(200).json(feature);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
