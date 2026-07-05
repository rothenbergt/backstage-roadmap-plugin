import { createPermission } from '@backstage/plugin-permission-common';

/**
 * Grants roadmap admin actions: changing status, editing and deleting
 * features and comments, and reordering the board.
 *
 * @public
 */
export const roadmapAdminPermission = createPermission({
  name: 'roadmap.admin',
  attributes: { action: 'update' },
});

/**
 * Grants suggesting new features on the roadmap.
 *
 * @public
 */
export const roadmapCreatePermission = createPermission({
  name: 'roadmap.create',
  attributes: { action: 'create' },
});

/**
 * All permissions defined by the roadmap plugin.
 *
 * @public
 */
export const roadmapPermissions = [
  roadmapAdminPermission,
  roadmapCreatePermission,
];
