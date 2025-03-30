import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { CacheService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { RoadmapDatabaseClient } from '../database/RoadmapDatabaseClient';
import {
  HttpAuthService,
  UserInfoService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { createPermissionIntegrationRouter } from '@backstage/plugin-permission-node';
import { roadmapPermissions } from '@rothenbergt/backstage-plugin-roadmap-common';
import { commentsRouter } from './commentsRouter';
import { featuresRouter } from './featuresRouter';
import { votesRouter } from './votesRouter';
import { permissionCheckRouter } from './permissionCheckRouter';

/**
 * Options for configuring the roadmap plugin router
 */
export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  db: RoadmapDatabaseClient;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  permissions?: PermissionsService;
  cache: CacheService;
}

/**
 * Creates the main router for the roadmap plugin
 * Sets up sub-routers for features, comments, votes, and permissions
 */
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const router = Router();
  router.use(express.json());

  // Set up permission integration for Backstage permission framework
  const permissionIntegrationRouter = createPermissionIntegrationRouter({
    permissions: roadmapPermissions,
  });

  // Health check endpoint
  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.use(permissionIntegrationRouter);

  // Register sub-routers
  router.use('/comments', commentsRouter(options));
  router.use('/features', featuresRouter(options));
  router.use('/votes', votesRouter(options));
  router.use('/permissions', permissionCheckRouter(options));

  // Add error handling middleware
  const middleware = MiddlewareFactory.create({ logger, config });
  router.use(middleware.error());

  return router;
}
