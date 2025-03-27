import express from 'express';
import Router from 'express-promise-router';
import { RouterOptions } from './router';
import { roadmapAdminPermission } from '@rothenbergt/backstage-plugin-roadmap-common';
import { PermissionService } from '../services/PermissionService';

/**
 * Router for permission-checking endpoints
 */
export function permissionCheckRouter(options: RouterOptions): express.Router {
  const { logger } = options;
  const router = Router();

  // Initialize service
  const permissionService = new PermissionService(options);

  // Check if the current user is an admin
  router.get('/check-admin', async (req, res) => {
    try {
      const username = await permissionService.getUsername(req);
      const isAdmin = await permissionService.checkPermission(
        req,
        username,
        roadmapAdminPermission,
      );

      res.json({ isAdmin });
    } catch (error) {
      logger.error(`Error checking admin permission: ${error}`);
      res.status(401).json({
        isAdmin: false,
        error: (error as Error).message,
      });
    }
  });

  return router;
}
