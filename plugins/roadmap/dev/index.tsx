import { createDevApp } from '@backstage/dev-utils';
import { roadmapPlugin, RoadmapPage } from '../src/plugin';

createDevApp()
  .registerPlugin(roadmapPlugin)
  .addPage({
    element: <RoadmapPage />,
    title: 'Root Page',
    path: '/roadmap',
  })
  .render();
