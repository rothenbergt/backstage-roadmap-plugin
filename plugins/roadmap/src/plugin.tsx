import {
  createFrontendPlugin,
  PageBlueprint,
  ApiBlueprint,
} from '@backstage/frontend-plugin-api';
import {
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import { roadmapApiRef, RoadmapApiClient } from './api';

const roadmapApi = ApiBlueprint.make({
  params: defineParams =>
    defineParams({
      api: roadmapApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
        identityApi: identityApiRef,
      },
      factory: ({ discoveryApi, fetchApi, identityApi }) =>
        new RoadmapApiClient({ discoveryApi, fetchApi, identityApi }),
    }),
});

const roadmapPage = PageBlueprint.make({
  params: {
    path: '/roadmap',
    routeRef: rootRouteRef,
    loader: () =>
      import('./RoadmapPageComponent').then(m => <m.WrappedRoadmapComponent />),
  },
});

/**
 * The Roadmap plugin provides a public roadmap of features with voting and commenting
 */
export const roadmapPlugin = createFrontendPlugin({
  pluginId: 'roadmap',
  extensions: [roadmapPage, roadmapApi],
  routes: {
    root: rootRouteRef,
  },
});
