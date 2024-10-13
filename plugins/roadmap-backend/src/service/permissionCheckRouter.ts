import { Router } from 'express';
import { RouterOptions } from './router';
import { roadmapAdminPermission } from '@rothenbergt/backstage-plugin-roadmap-common';
import { getUsername, checkPermissions } from '../utils/routeUtils';

export function createPermissionCheckRouter(options: RouterOptions): Router {
  const router: Router = Router();

  router.get('/check-admin', async (req, res) => {
    try {
      const username = await getUsername(req, options);
      const isAdmin = await checkPermissions(
        req,
        username,
        options,
        roadmapAdminPermission,
      );
      res.json({ isAdmin });
    } catch (error) {
      res.status(401).json({ isAdmin: false, error: (error as Error).message });
    }
  });

  return router;
}
