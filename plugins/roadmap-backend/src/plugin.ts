import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './routes';
import { RoadmapDatabaseClient } from './database/RoadmapDatabaseClient';

/**
 * Backend plugin for the Roadmap feature
 *
 * Provides endpoints for managing roadmap features, comments, and votes
 */
export const roadmapPlugin = createBackendPlugin({
  pluginId: 'roadmap',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        database: coreServices.database,
        userInfo: coreServices.userInfo,
        httpAuth: coreServices.httpAuth,
        permissions: coreServices.permissions,
        cache: coreServices.cache,
      },
      async init({
        httpRouter,
        logger,
        config,
        database,
        userInfo,
        httpAuth,
        permissions,
        cache,
      }) {
        const dbClient = await database.getClient();
        const db = new RoadmapDatabaseClient(dbClient, logger);

        const permissionEnabled =
          config.getOptionalBoolean('permission.enabled') ?? false;

        if (!permissionEnabled) {
          logger.warn(
            'Permissions are disabled. Using configArray for admin users.',
          );
        }

        httpRouter.use(
          await createRouter({
            logger,
            config,
            db,
            userInfo,
            httpAuth,
            permissions: permissionEnabled ? permissions : undefined,
            cache,
          }),
        );
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
