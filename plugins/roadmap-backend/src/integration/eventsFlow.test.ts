import {
  mockCredentials,
  mockServices,
  startTestBackend,
} from '@backstage/backend-test-utils';
import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { eventsServiceRef, EventParams } from '@backstage/plugin-events-node';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  EVENTS_TOPIC_ROADMAP,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import request from 'supertest';
import { roadmapPlugin } from '../plugin';

const ALICE = 'user:default/alice';
const ADMIN = 'user:default/admin';

/**
 * Events flow: a real subscriber on the real events bus receives what the
 * roadmap plugin publishes. This is what an integration (e.g. a module that
 * syncs roadmap changes to Slack or Jira) would actually consume.
 */
describe('events flow (real events bus)', () => {
  const received: EventParams[] = [];
  let server: any;

  const testSubscriber = createBackendModule({
    pluginId: 'roadmap',
    moduleId: 'test-subscriber',
    register(reg) {
      reg.registerInit({
        deps: { events: eventsServiceRef, lifecycle: coreServices.lifecycle },
        async init({ events }) {
          await events.subscribe({
            id: 'test-subscriber',
            topics: [EVENTS_TOPIC_ROADMAP],
            onEvent: async event => {
              received.push(event);
            },
          });
        },
      });
    },
  });

  beforeAll(async () => {
    ({ server } = await startTestBackend({
      features: [
        roadmapPlugin,
        testSubscriber,
        mockServices.permissions.factory({ result: AuthorizeResult.ALLOW }),
        mockServices.rootConfig.factory({
          data: {
            roadmap: { adminUsers: [ADMIN] },
            permission: { enabled: true },
          },
        }),
      ],
    }));
  });

  afterAll(async () => {
    await server?.close();
  });

  async function waitForEvents(count: number): Promise<void> {
    for (let attempt = 0; attempt < 50 && received.length < count; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  it('delivers the full action trail to a subscriber', async () => {
    // Alice suggests, votes, comments; the admin moves the status
    const createRes = await request(server)
      .post('/api/roadmap/features')
      .set('Authorization', mockCredentials.user.header(ALICE))
      .send({ title: 'Dark mode', description: 'Please add dark mode' });
    expect(createRes.status).toBe(201);
    const featureId = createRes.body.id;

    await request(server)
      .post(`/api/roadmap/votes/${featureId}`)
      .set('Authorization', mockCredentials.user.header(ALICE));

    await request(server)
      .post('/api/roadmap/comments')
      .set('Authorization', mockCredentials.user.header(ALICE))
      .send({ featureId, text: 'Really need this' });

    await request(server)
      .put(`/api/roadmap/features/${featureId}/status`)
      .set('Authorization', mockCredentials.user.header(ADMIN))
      .send({ status: FeatureStatus.Planned });

    await waitForEvents(4);

    const actions = received.map(e => (e.metadata as any)?.action);
    expect(actions).toEqual([
      'create_feature',
      'toggle_vote',
      'create_comment',
      'change_feature_status',
    ]);

    // Payloads carry the acting user and enough context to react to
    const create = received[0].eventPayload as any;
    expect(create.actor).toBe(ALICE);
    expect(create.feature).toMatchObject({ id: featureId, title: 'Dark mode' });

    const statusChange = received[3].eventPayload as any;
    expect(statusChange.actor).toBe(ADMIN);
    expect(statusChange.previousStatus).toBe(FeatureStatus.Suggested);
    expect(statusChange.feature.status).toBe(FeatureStatus.Planned);
  });
});
