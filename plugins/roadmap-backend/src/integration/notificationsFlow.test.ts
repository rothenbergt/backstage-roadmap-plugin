import {
  mockCredentials,
  mockServices,
  startTestBackend,
} from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import request from 'supertest';
import { roadmapPlugin } from '../plugin';

// Jest runs CJS, so the backend feature is loaded via require instead of a
// dynamic import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const notificationsBackend =
  require('@backstage/plugin-notifications-backend').default;

const ALICE = 'user:default/alice';
const ADMIN = 'user:default/admin';

/**
 * Notifications flow: the real roadmap backend and the real notifications
 * backend running side by side. Acting as two different users, verifies that
 * roadmap actions end up as notifications in the right person's feed - not
 * just that a send function was called.
 */
describe('notifications flow (real notifications backend)', () => {
  let server: any;

  beforeAll(async () => {
    ({ server } = await startTestBackend({
      features: [
        roadmapPlugin,
        notificationsBackend,
        catalogServiceMock.factory(),
        // Allow-all permission framework so non-admin users can create
        // features; admin rights still come from roadmap.adminUsers
        mockServices.permissions.factory({ result: AuthorizeResult.ALLOW }),
        mockServices.rootConfig.factory({
          data: {
            // The notifications backend uses this to absolutize links
            app: { baseUrl: 'http://localhost:3000' },
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

  async function pollFeed(user: string, minCount: number): Promise<any[]> {
    let notifications: any[] = [];
    for (let attempt = 0; attempt < 30; attempt++) {
      const feed = await request(server)
        .get('/api/notifications')
        .set('Authorization', mockCredentials.user.header(user));
      expect(feed.status).toBe(200);
      notifications = feed.body.notifications ?? [];
      if (notifications.length >= minCount) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return notifications;
  }

  it('delivers roadmap notifications to the right users', async () => {
    // Alice suggests a feature
    const createRes = await request(server)
      .post('/api/roadmap/features')
      .set('Authorization', mockCredentials.user.header(ALICE))
      .send({ title: 'Dark mode', description: 'Please add dark mode' });
    expect(createRes.status).toBe(201);
    const feature = createRes.body;

    // The admin should be told about the new suggestion (sends are
    // fire-and-forget, so poll briefly)
    const adminNotifications = await pollFeed(ADMIN, 1);
    expect(adminNotifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user: ADMIN,
          payload: expect.objectContaining({
            title: 'New roadmap suggestion: Dark mode',
            link: expect.stringContaining(`/roadmap?feature=${feature.id}`),
            topic: 'new-features',
          }),
        }),
      ]),
    );

    // Alice acted, so she must not be notified about her own suggestion
    const aliceFeedBefore = await request(server)
      .get('/api/notifications')
      .set('Authorization', mockCredentials.user.header(ALICE));
    expect(aliceFeedBefore.body.notifications).toEqual([]);

    // The admin moves it to Planned
    const statusRes = await request(server)
      .put(`/api/roadmap/features/${feature.id}/status`)
      .set('Authorization', mockCredentials.user.header(ADMIN))
      .send({ status: FeatureStatus.Planned });
    expect(statusRes.status).toBe(200);

    // The admin comments on it
    const commentRes = await request(server)
      .post('/api/roadmap/comments')
      .set('Authorization', mockCredentials.user.header(ADMIN))
      .send({ featureId: feature.id, text: 'Great idea, planning it!' });
    expect(commentRes.status).toBe(201);

    // Both land in alice's feed
    const aliceNotifications = await pollFeed(ALICE, 2);

    const titles = aliceNotifications.map(n => n.payload.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        `Your roadmap suggestion moved to ${FeatureStatus.Planned}`,
        'New comment on "Dark mode"',
      ]),
    );

    // Every notification deep-links to the feature
    for (const notification of aliceNotifications) {
      expect(notification.payload.link).toContain(
        `/roadmap?feature=${feature.id}`,
      );
    }

    // The admin's own actions never notify the admin
    const adminFeedAfter = await request(server)
      .get('/api/notifications')
      .set('Authorization', mockCredentials.user.header(ADMIN));
    expect(adminFeedAfter.body.notifications).toHaveLength(1);
  });
});
