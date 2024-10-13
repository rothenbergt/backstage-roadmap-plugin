import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { getUsername } from '../utils/routeUtils';

export function commentsRouter(options: RouterOptions): express.Router {
  const { logger, db } = options;
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const username = await getUsername(req, options);
      const { featureId, text } = req.body;
      const result = await db.addComment({ featureId, text, author: username });

      res.status(201).send({ result });
    } catch (error) {
      logger.error(`Error in POST /comments: ${error}`);
      res.status(500).send({ message: 'Internal server error' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const { featureId } = req.query;
      if (!featureId || typeof featureId !== 'string') {
        res
          .status(400)
          .send({ message: 'featureId is required and must be a string' });
        return;
      }
      const comments = await db.getCommentsByFeatureId(featureId);
      res.status(200).json(comments);
    } catch (error) {
      logger.error(`Error in GET /comments: ${error}`);
      res.status(500).send({ message: 'Internal server error' });
    }
  });

  return router;
}
