import { createDevApp } from '@backstage/dev-utils';
import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from '../src/routes';
import { roadmapApiRef, RoadmapApiClient } from '../src/api';

// Dev-only legacy plugin wrapper for local development
const devPlugin = createPlugin({
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

const DevRoadmapPage = devPlugin.provide(
  createRoutableExtension({
    name: 'RoadmapPage',
    component: () =>
      import('../src/RoadmapPageComponent').then(
        m => m.WrappedRoadmapComponent,
      ),
    mountPoint: rootRouteRef,
  }),
);

createDevApp()
  .registerPlugin(devPlugin)
  .addPage({
    element: <DevRoadmapPage />,
    title: 'Root Page',
    path: '/roadmap',
  })
  .render();
