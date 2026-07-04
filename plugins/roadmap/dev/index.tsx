import { createDevApp } from '@backstage/dev-utils';
import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import {
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import MapIcon from '@material-ui/icons/Map';
import { Link } from '@backstage/core-components';
import { Content, Header, Page } from '@backstage/core-components';
import {
  NotificationsPage,
  UserNotificationSettingsCard,
} from '@backstage/plugin-notifications';
import { searchPlugin } from '@backstage/plugin-search';
import { signalsPlugin } from '@backstage/plugin-signals';
import {
  DefaultResultListItem,
  SearchBar,
  SearchContextProvider,
  SearchResult,
} from '@backstage/plugin-search-react';
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

// Minimal composed search page: the SearchPage extension from
// @backstage/plugin-search is an empty shell that expects the app to
// provide its contents.
const DevSearchPage = () => (
  <Page themeId="tool">
    <Header title="Search" subtitle="Find roadmap features" />
    <Content>
      <SearchContextProvider>
        <SearchBar />
        <SearchResult>
          {({ results }) => (
            <List>
              {results.map(({ type, document }) =>
                type === 'roadmap' ? (
                  <ListItem
                    key={document.location}
                    button
                    component={Link}
                    to={document.location}
                  >
                    <ListItemIcon>
                      <MapIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={document.title}
                      secondary={document.text}
                    />
                    <Chip
                      label={(document as any).status}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${(document as any).votes} votes`}
                      size="small"
                      variant="outlined"
                    />
                  </ListItem>
                ) : (
                  <DefaultResultListItem
                    key={document.location}
                    result={document}
                  />
                ),
              )}
            </List>
          )}
        </SearchResult>
      </SearchContextProvider>
    </Content>
  </Page>
);

// In a real app this card lives on the user settings page; the dev app
// mounts it on its own page so per-topic toggles can be tried out.
const DevNotificationSettingsPage = () => (
  <Page themeId="tool">
    <Header
      title="Notification settings"
      subtitle="Per-origin and per-topic toggles"
    />
    <Content>
      <UserNotificationSettingsCard />
    </Content>
  </Page>
);

createDevApp()
  .registerPlugin(devPlugin)
  .registerPlugin(searchPlugin)
  // Provides the SignalApi so the board's live updates work in the dev app
  .registerPlugin(signalsPlugin)
  .addPage({
    element: <DevRoadmapPage />,
    title: 'Root Page',
    path: '/roadmap',
  })
  .addPage({
    element: <NotificationsPage />,
    title: 'Notifications',
    path: '/notifications',
  })
  .addPage({
    element: <DevSearchPage />,
    title: 'Search',
    path: '/search',
  })
  .addPage({
    element: <DevNotificationSettingsPage />,
    title: 'Notification Settings',
    path: '/notification-settings',
  })
  .render();
