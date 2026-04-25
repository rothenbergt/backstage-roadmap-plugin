import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './routes';
import { RoadmapDatasource } from './types';
import { RoadmapDatabaseClient } from './database/RoadmapDatabaseClient';
import { RoadmapGitlabClient } from './gitlab';
import { getDatasource, getGitlabConfig, isPermissionEnabled } from './config';
import { getBoardConfigResponse, getMergedBoardColumns } from './boardConfig';

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
        const datasource = getDatasource(config);
        const permissionEnabled = isPermissionEnabled(config);
        const boardColumns = getMergedBoardColumns(config);
        const boardConfigResponse = getBoardConfigResponse(config, datasource);

        let db: RoadmapDatasource;
        if (datasource === 'database') {
          db = await RoadmapDatabaseClient.create({
            database,
            logger,
          });
        } else {
          db = RoadmapGitlabClient.create({
            gitlab: getGitlabConfig(config),
            logger,
            cache,
          });
        }

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
            datasource,
            boardColumns,
            boardConfigResponse,
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
