import { createElement } from 'react';
import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import { roadmapApiRef, RoadmapApiClient } from './api';
import { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { RoadmapBoard } from './features/board/RoadmapBoard';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Create a wrapped version of the roadmap component with QueryClientProvider
const WrappedRoadmapComponent = (props: any) => {
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(RoadmapBoard, props),
  );
};

/**
 * The Roadmap plugin provides a public roadmap of features with voting and commenting
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
 * A component to display the public roadmap
 */
export const RoadmapPage = roadmapPlugin.provide(
  createRoutableExtension({
    name: 'RoadmapPage',
    component: () => Promise.resolve(WrappedRoadmapComponent),
    mountPoint: rootRouteRef,
  }),
);
