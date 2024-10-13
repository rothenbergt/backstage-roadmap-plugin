import { Request } from 'express';
import { RouterOptions } from '../service/router';
import { NotAllowedError, NotFoundError } from '@backstage/errors';
import { getRoadmapBackendConfig } from '../config';
import {
  AuthorizeResult,
  BasicPermission,
  DefinitivePolicyDecision,
} from '@backstage/plugin-permission-common';
import { roadmapAdminPermission } from '@rothenbergt/backstage-plugin-roadmap-common';

export async function getUsername(
  req: Request,
  options: RouterOptions,
): Promise<string> {
  const { httpAuth, userInfo, logger } = options;
  const credentials = await httpAuth.credentials(req);
  if (!credentials) {
    logger.warn('Unauthorized access attempt');
    throw new NotAllowedError('Unauthorized');
  }
  const user = await userInfo.getUserInfo(credentials);
  const username = user?.userEntityRef?.toString();
  if (!username) {
    logger.warn('User not found');
    throw new NotFoundError('User not found');
  }
  return username;
}

export async function checkPermissions(
  req: Request,
  username: string,
  options: RouterOptions,
  permission: BasicPermission,
): Promise<boolean> {
  const { config, logger, cache, permissions, httpAuth } = options;
  const roadmapConfig = getRoadmapBackendConfig(config);

  const cacheKey = `permission:${username}:${permission.name}`;
  const cachedPermission = await cache.get(cacheKey);

  // Use cached result if available
  if (cachedPermission !== undefined) {
    return cachedPermission === true;
  }

  // Admin users early exit
  if (roadmapConfig.adminUsers.includes(username)) {
    await cache.set(cacheKey, true, { ttl: 300 });
    return true;
  }

  // Check if permissions service is available
  if (!permissions) {
    await cache.set(cacheKey, false, { ttl: 300 });
    return false;
  }

  // Authenticate request credentials
  const credentials = await httpAuth.credentials(req);
  if (!credentials) {
    logger.warn(`Unauthorized access attempt by user ${username}`);
    throw new NotAllowedError('Unauthorized');
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

    // Cache the permission result
    await cache.set(cacheKey, isAllowed, { ttl: 300 });
    return isAllowed;
  } catch (error) {
    logger.error(`Error while authorizing user ${username}`);
    throw new Error('Permission check failed');
  }
}

export async function isRoadmapAdmin(
  req: Request,
  options: RouterOptions,
): Promise<boolean> {
  const username = await getUsername(req, options);
  return checkPermissions(req, username, options, roadmapAdminPermission);
}
