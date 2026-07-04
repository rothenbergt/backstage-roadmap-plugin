import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);
// Catalog is needed by the notifications backend to resolve entity recipients.
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-notifications-backend'));
backend.add(import('@backstage/plugin-signals-backend'));
backend.add(import('@backstage/plugin-search-backend'));
backend.add(
  import('@rothenbergt/backstage-plugin-search-backend-module-roadmap'),
);
backend.add(import('../src'));

backend.start();
