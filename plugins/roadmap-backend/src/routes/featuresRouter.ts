import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { FeatureService } from '../services/FeatureService';
import { PermissionService } from '../services/PermissionService';

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
  router.post('/', async (req, res) => {
    try {
      const username = await permissionService.getUsername(req);
      const newFeature = req.body;

      // Validate required fields
      if (!newFeature.title || !newFeature.description) {
        res.status(400).json({
          message:
            'Missing required fields: title and description are required',
        });
        return;
      }

      const feature = await featureService.addFeature(newFeature, username);
      res.status(201).json(feature);
    } catch (error) {
      logger.error(`Error creating feature: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all features
  router.get('/', async (_, res) => {
    try {
      const features = await featureService.getAllFeatures();
      res.status(200).json(features);
    } catch (error) {
      logger.error(`Error fetching features: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update feature status (admin only)
  router.put('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const status = req.body.status as FeatureStatus;

      // Validate status value
      if (!Object.values(FeatureStatus).includes(status)) {
        res.status(400).json({
          message: `Invalid status value. Must be one of: ${Object.values(
            FeatureStatus,
          ).join(', ')}`,
        });
        return;
      }

      const username = await permissionService.getUsername(req);
      const isAdmin = await permissionService.isRoadmapAdmin(req, username);

      if (!isAdmin) {
        res
          .status(403)
          .json({ message: 'Unauthorized: User is not a Roadmap admin' });
        return;
      }

      const updatedFeature = await featureService.updateFeatureStatus(
        id,
        status,
      );
      res.status(200).json(updatedFeature);
    } catch (error) {
      logger.error(`Error updating feature status: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return router;
}
