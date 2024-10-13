import { createPermission } from '@backstage/plugin-permission-common';

export const roadmapAdminPermission = createPermission({
  name: 'roadmap.admin',
  attributes: { action: 'update' },
});

export const roadmapCreatePermission = createPermission({
  name: 'roadmap.create',
  attributes: { action: 'create' },
});

export const roadmapPermissions = [
  roadmapAdminPermission,
  roadmapCreatePermission,
];
