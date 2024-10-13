import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { CacheService, LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { MyDatabaseClass } from '../database/MyDatabaseClass';
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
import { createPermissionCheckRouter } from './permissionCheckRouter';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  db: MyDatabaseClass;
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  permissions?: PermissionsService;
  cache: CacheService;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, db } = options;

  const router = Router();
  router.use(express.json());

  const permissionIntegrationRouter = createPermissionIntegrationRouter({
    permissions: roadmapPermissions,
  });

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.use(permissionIntegrationRouter);

  await db.setupSchema();

  router.use('/comments', commentsRouter(options));
  router.use('/features', featuresRouter(options));
  router.use('/votes', votesRouter(options));
  router.use('/permissions', createPermissionCheckRouter(options));

  const middleware = MiddlewareFactory.create({ logger, config });
  router.use(middleware.error());

  return router;
}
