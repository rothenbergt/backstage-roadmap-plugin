import {
  mockCredentials,
  mockServices,
  startTestBackend,
} from '@backstage/backend-test-utils';
import { schedulerServiceFactory } from '@backstage/backend-defaults/scheduler';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import request from 'supertest';
import { roadmapPlugin } from '../plugin';

// Jest runs CJS, so backend features are loaded via require instead of
// dynamic imports.
/* eslint-disable @typescript-eslint/no-require-imports */
const searchBackend = require('@backstage/plugin-search-backend').default;
const roadmapSearchModule =
  require('@rothenbergt/backstage-plugin-search-backend-module-roadmap').default;
/* eslint-enable @typescript-eslint/no-require-imports */

const ALICE = 'user:default/alice';

/**
 * Search flow: the real search backend, the real roadmap collator module,
 * and the real scheduler (the test-backend default scheduler is a no-op, so
 * the collation schedule would otherwise never fire). Verifies a feature
 * created through the API becomes findable through the search API.
 */
describe('search flow (real search backend + collator)', () => {
  let server: any;

  beforeAll(async () => {
    ({ server } = await startTestBackend({
      features: [
        roadmapPlugin,
        searchBackend,
        roadmapSearchModule,
        schedulerServiceFactory,
        mockServices.permissions.factory({ result: AuthorizeResult.ALLOW }),
        mockServices.rootConfig.factory({
          data: {
            roadmap: { adminUsers: ['user:default/admin'] },
            permission: { enabled: true },
            search: {
              collators: {
                roadmap: {
                  schedule: {
                    frequency: { seconds: 2 },
                    timeout: { minutes: 1 },
                    initialDelay: { seconds: 1 },
                  },
                },
              },
            },
          },
        }),
      ],
    }));
  });

  afterAll(async () => {
    await server?.close();
  });

  it('makes a created feature findable via the search API', async () => {
    const createRes = await request(server)
      .post('/api/roadmap/features')
      .set('Authorization', mockCredentials.user.header(ALICE))
      .send({
        title: 'Kubernetes cost insights',
        description: 'Show cluster spend per team',
      });
    expect(createRes.status).toBe(201);
    const featureId = createRes.body.id;

    // Wait for the scheduled collation to index it
    let results: any[] = [];
    for (let attempt = 0; attempt < 60; attempt++) {
      const queryRes = await request(server)
        .get('/api/search/query')
        .query({ term: 'Kubernetes' })
        .set('Authorization', mockCredentials.user.header(ALICE));
      if (queryRes.status === 200) {
        results = queryRes.body.results ?? [];
        if (results.length > 0) break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'roadmap',
          document: expect.objectContaining({
            title: 'Kubernetes cost insights',
            text: 'Show cluster spend per team',
            location: `/roadmap?feature=${featureId}`,
          }),
        }),
      ]),
    );
  }, 60_000);
});
