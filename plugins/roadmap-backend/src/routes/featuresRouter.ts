import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { FeatureService } from '../services/FeatureService';
import { PermissionService } from '../services/PermissionService';

import { NotAllowedError } from '@backstage/errors';
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
      const newFeature = req.body;

      const feature = await featureService.addFeature(newFeature, username);
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
      const status = req.body.status as FeatureStatus;

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
