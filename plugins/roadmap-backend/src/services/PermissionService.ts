import { Request } from 'express';
import { PermissionServiceInterface } from './types';
import { RouterOptions } from '../routes/router';
import { roadmapAdminPermission } from '@rothenbergt/backstage-plugin-roadmap-common';
import { BasicPermission } from '@backstage/plugin-permission-common';
import { NotFoundError, NotAllowedError } from '@backstage/errors';
import { getRoadmapBackendConfig } from '../config';
import {
  AuthorizeResult,
  DefinitivePolicyDecision,
} from '@backstage/plugin-permission-common';

/**
 * Implementation of the Permission Service
 */
export class PermissionService implements PermissionServiceInterface {
  private readonly options: RouterOptions;

  constructor(options: RouterOptions) {
    this.options = options;
  }

  async getUsername(req: Request): Promise<string> {
    const { httpAuth, userInfo, logger } = this.options;
    const credentials = await httpAuth.credentials(req);
    if (!credentials) {
      logger.warn('Unauthorized access attempt');
      throw new NotAllowedError('Unauthorized access');
    }
    const user = await userInfo.getUserInfo(credentials);
    const username = user?.userEntityRef?.toString();
    if (!username) {
      logger.warn('User not found');
      throw new NotFoundError('User not found');
    }
    return username;
  }

  async checkPermission(
    req: Request,
    username: string,
    permission: BasicPermission,
  ): Promise<boolean> {
    const { config, logger, permissions, httpAuth } = this.options;
    const roadmapConfig = getRoadmapBackendConfig(config);

    // Admin users early exit
    if (roadmapConfig.adminUsers.includes(username)) {
      return true;
    }

    // Check if permissions service is available
    if (!permissions) {
      return false;
    }

    // Authenticate request credentials
    const credentials = await httpAuth.credentials(req);
    if (!credentials) {
      logger.warn(`Unauthorized access attempt by user ${username}`);
      throw new NotAllowedError('Unauthorized access');
    }

    let decision: DefinitivePolicyDecision = { result: AuthorizeResult.DENY };

    try {
      // Authorize user with permission service
      decision = (
        await permissions.authorize([{ permission }], {
          credentials,
        })
      )[0];

      const isAllowed = decision.result === AuthorizeResult.ALLOW;
      logger.info(
        `Permission ${permission.name} ${
          isAllowed ? 'granted' : 'denied'
        } to user ${username}`,
      );

      return isAllowed;
    } catch (error) {
      logger.error(`Error while authorizing user ${username}`);
      throw new NotAllowedError('Permission check failed');
    }
  }

  async isRoadmapAdmin(req: Request, username: string): Promise<boolean> {
    return this.checkPermission(req, username, roadmapAdminPermission);
  }
}
