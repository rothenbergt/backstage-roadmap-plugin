import { createDevApp } from '@backstage/dev-utils';
import {
  createPlugin,
  createRoutableExtension,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { List } from '@material-ui/core';
import { Content, Header, Page } from '@backstage/core-components';
import {
  NotificationsPage,
  UserNotificationSettingsCard,
} from '@backstage/plugin-notifications';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { InfoCard, CodeSnippet, Progress } from '@backstage/core-components';
import { catalogApiRef, entityRouteRef } from '@backstage/plugin-catalog-react';
import { catalogPlugin, CatalogIndexPage } from '@backstage/plugin-catalog';
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
import { RoadmapSearchResultListItem } from '../src/components';

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
              {results.map(({ type, document, highlight }) =>
                type === 'roadmap' ? (
                  <RoadmapSearchResultListItem
                    key={document.location}
                    result={document}
                    highlight={highlight}
                  />
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

// CatalogEntityPage from @backstage/plugin-catalog is an empty shell that
// expects the app to compose the entity page contents, so the dev app
// renders a minimal one: enough to prove EntityRefLink lands somewhere real.
const DevEntityPage = () => {
  const { namespace = '', kind = '', name = '' } = useParams();
  const catalogApi = useApi(catalogApiRef);
  const [entity, setEntity] = useState<Entity | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    catalogApi
      .getEntityByRef({ kind, namespace, name })
      .then(e => mounted && setEntity(e))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [catalogApi, kind, namespace, name]);

  return (
    <Page themeId="tool">
      <Header title={name} subtitle={`${kind}:${namespace}/${name}`} />
      <Content>
        {loading && <Progress />}
        {!loading && entity && (
          <InfoCard title="Entity">
            <CodeSnippet
              text={JSON.stringify(entity, null, 2)}
              language="json"
            />
          </InfoCard>
        )}
        {!loading && !entity && (
          <InfoCard title="Not found">
            No entity {kind}:{namespace}/{name} in the dev catalog.
          </InfoCard>
        )}
      </Content>
    </Page>
  );
};

// Registering the page on the catalog's entityRouteRef gives the
// `catalog:entity` route a path, which EntityRefLink needs to build hrefs.
const DevCatalogEntityPage = devPlugin.provide(
  createRoutableExtension({
    name: 'DevCatalogEntityPage',
    component: () => Promise.resolve(DevEntityPage),
    mountPoint: entityRouteRef,
  }),
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
  // Catalog pages so author/commenter entity refs resolve and link somewhere
  .registerPlugin(catalogPlugin)
  .registerPlugin(searchPlugin)
  // Provides the SignalApi so the board's live updates work in the dev app
  .registerPlugin(signalsPlugin)
  .addPage({
    element: <DevRoadmapPage />,
    title: 'Root Page',
    path: '/roadmap',
  })
  .addPage({
    element: <CatalogIndexPage />,
    title: 'Catalog',
    path: '/catalog',
  })
  .addPage({
    element: <DevCatalogEntityPage />,
    path: '/catalog/:namespace/:kind/:name',
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
