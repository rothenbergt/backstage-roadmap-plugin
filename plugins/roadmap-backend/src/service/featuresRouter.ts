import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { getUsername, isRoadmapAdmin } from '../utils/routeUtils';
import {
  Feature,
  NewFeature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';

export function featuresRouter(options: RouterOptions): express.Router {
  const { db } = options;
  const router = Router();

  router.post('/', async (req, res) => {
    const username = await getUsername(req, options);
    const newFeature: NewFeature = req.body;
    const feature = await db.addFeature({ ...newFeature, author: username });
    res.status(201).json(feature);
  });

  router.get('/', async (_, res) => {
    const features: Feature[] = await db.getAllFeatures();
    res.status(200).json(features);
  });

  router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const status = req.body.status as FeatureStatus;

    const isAdmin = await isRoadmapAdmin(req, options);

    if (!isAdmin) {
      res
        .status(403)
        .json({ message: 'Unauthorized: User is not a Roadmap admin' });
      return;
    }

    const updatedFeature = await db.updateFeatureStatus(id, status);
    res.status(200).json(updatedFeature);
  });

  return router;
}
