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
  const { logger, db } = options;
  const router = Router();

  // Initialize services
  const featureService = new FeatureService(db, logger);
  const permissionService = new PermissionService(options);

  // Create new feature
  router.post('/', async (req, res, next) => {
    try {
      const username = await permissionService.getUsername(req);
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
  router.get('/', async (_, res, next) => {
    try {
      const features = await featureService.getAllFeatures();
      res.status(200).json(features);
    } catch (error) {
      next(error);
    }
  });

  // Get feature by ID
  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const feature = await featureService.getFeatureById(id);
      res.status(200).json(feature);
    } catch (error) {
      next(error);
    }
  });

  // Update feature status (admin only)
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

  return router;
}
