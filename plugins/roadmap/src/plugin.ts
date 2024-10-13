import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import { roadmapApiRef, RoadmapApiClient } from './api/roadmapApi';

/**
 * The main Roadmap plugin.
 */
export const roadmapPlugin = createPlugin({
  id: 'roadmap',
  apis: [
    createApiFactory({
      api: roadmapApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        identityApi: identityApiRef,
      },
      factory: ({ discoveryApi, fetchApi, identityApi }) =>
        new RoadmapApiClient({ discoveryApi, fetchApi, identityApi }),
    }),
  ],
});

/**
 * The main page component for the Roadmap plugin.
 */
export const RoadmapPage = roadmapPlugin.provide(
  createRoutableExtension({
    name: 'RoadmapPage',
    component: () =>
      import('./components/RoadmapDashboard').then(m => m.RoadmapDashboard),
    mountPoint: rootRouteRef,
  }),
);
