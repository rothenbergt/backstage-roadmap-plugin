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
import { SearchResultListItemBlueprint } from '@backstage/plugin-search-react/alpha';
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

const roadmapSearchResultListItem = SearchResultListItemBlueprint.make({
  name: 'roadmap',
  params: {
    predicate: result => result.type === 'roadmap',
    component: () =>
      import('./components/RoadmapSearchResultListItem').then(
        m => m.RoadmapSearchResultListItem,
      ),
  },
});

/**
 * The Roadmap plugin provides a public roadmap of features with voting and commenting.
 *
 * @public
 */
export const roadmapPlugin = createFrontendPlugin({
  pluginId: 'roadmap',
  extensions: [roadmapPage, roadmapApi, roadmapSearchResultListItem],
  routes: {
    root: rootRouteRef,
  },
});
