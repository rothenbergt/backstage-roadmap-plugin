import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { FeatureService } from '../services/FeatureService';
import { PermissionService } from '../services/PermissionService';

import { NotAllowedError, InputError } from '@backstage/errors';
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
      res.status(201).json(feature);
    } catch (error) {
      next(error);
    }
  });

  // Get all features
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
        throw new NotAllowedError(
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

      const updatedFeature = await featureService.updateFeatureStatus(
        id,
        status,
      );
      res.status(200).json(updatedFeature);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      if (datasource !== 'database') {
        throw new NotAllowedError(
          'This operation is not supported for the GitLab roadmap datasource',
        );
      }
      const { id } = req.params;
      const { title, description } = req.body as {
        title?: string;
        description?: string;
      };
      if (title === undefined && description === undefined) {
        throw new InputError(
          'At least one of title or description is required',
        );
      }

      const username = await permissionService.getUsername(req);
      const isAdmin = await permissionService.isRoadmapAdmin(req, username);

      if (isAdmin) {
        const updated = await featureService.updateFeatureDetails(id, {
          title,
          description,
        });
        res.status(200).json(updated);
        return;
      }

      await featureService.assertAuthorSuggestedOrNotFound(id, username);
      const updated = await featureService.updateFeatureDetails(id, {
        title,
        description,
      });
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      if (datasource !== 'database') {
        throw new NotAllowedError(
          'This operation is not supported for the GitLab roadmap datasource',
        );
      }
      const { id } = req.params;
      const username = await permissionService.getUsername(req);
      const isAdmin = await permissionService.isRoadmapAdmin(req, username);

      if (isAdmin) {
        await featureService.deleteFeature(id);
        res.status(204).send();
        return;
      }

      await featureService.assertAuthorSuggestedOrNotFound(id, username);
      await featureService.deleteFeature(id);
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
