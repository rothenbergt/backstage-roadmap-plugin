import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const roadmapPlugin = createPlugin({
  id: 'roadmap',
  routes: {
    root: rootRouteRef,
  },
});

export const RoadmapPage = roadmapPlugin.provide(
  createRoutableExtension({
    name: 'RoadmapPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
