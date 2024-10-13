import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';
import { MyDatabaseClass } from './database/MyDatabaseClass';

/**
 * roadmapPlugin backend plugin
 *
 * @public
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
        const db = new MyDatabaseClass(dbClient);

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
