import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { CacheService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { DatasourceType, RoadmapDatasource } from '../types';
import {
  RoadmapBoardColumnResolved,
  RoadmapBoardConfigResponse,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import {
  HttpAuthService,
  UserInfoService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { NotificationService } from '@backstage/plugin-notifications-node';
import { EventsService } from '@backstage/plugin-events-node';
import { SignalsService } from '@backstage/plugin-signals-node';
import { commentsRouter } from './commentsRouter';
import { featuresRouter } from './featuresRouter';
import { votesRouter } from './votesRouter';
import { permissionCheckRouter } from './permissionCheckRouter';

/**
 * Options for configuring the roadmap plugin router.
 *
 * @public
 */
export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  db: RoadmapDatasource;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  permissions?: PermissionsService;
  cache: CacheService;
  datasource: DatasourceType;
  boardColumns: RoadmapBoardColumnResolved[];
  boardConfigResponse: RoadmapBoardConfigResponse;
  /** Optional so the router also works in setups without the notifications service. */
  notifications?: NotificationService;
  /** Optional: integrations can subscribe to roadmap changes on the events bus. */
  events?: EventsService;
  /** Optional: open boards refresh live when signals are available. */
  signals?: SignalsService;
}

/**
 * Creates the main router for the roadmap plugin.
 * Sets up sub-routers for features, comments, votes, and permissions.
 *
 * @public
 */
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;

  const router = Router();
  router.use(express.json());

  // Health check endpoint
  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

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
