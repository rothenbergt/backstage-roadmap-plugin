import { mockServices, TestDatabases } from '@backstage/backend-test-utils';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { ConfigReader } from '@backstage/config';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import {
  PermissionsService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { roadmapAdminPermission } from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapDatabaseClient } from '../database/RoadmapDatabaseClient';
import { getBoardConfigResponse, getMergedBoardColumns } from '../boardConfig';
import { createRouter, RouterOptions } from '../routes/router';

const ADMIN = 'user:default/admin';
const ALICE = 'user:default/alice';
const BOB = 'user:default/bob';

const mockCredentials = {
  principal: { type: 'user' },
  $$type: '@backstage/BackstageCredentials',
};

/**
 * Persona-based authorization contract: the real router + real sqlite,
 * exercised as three different users. Verifies who can do what:
 *
 * - admin: moves statuses, edits/deletes any feature, deletes comments
 * - contributor (alice): suggests, votes, comments, manages her own
 *   still-Suggested features, and nothing more
 * - other contributor (bob): cannot touch alice's features
 */
describe('personas (real database)', () => {
  const databases = TestDatabases.create({ ids: ['SQLITE_3'] });
  let server: http.Server;
  let baseUrl: string;
  let currentUser = ALICE;

  const as = (user: string) => {
    currentUser = user;
  };

  const api = async (
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const suggest = async (user: string, title: string) => {
    as(user);
    const res = await api('POST', '/features', {
      title,
      description: `${title} description`,
    });
    expect(res.status).toBe(201);
    return res.json();
  };

  beforeAll(async () => {
    const knex = await databases.init('SQLITE_3');
    await knex.migrate.latest({ directory: `${__dirname}/../../migrations` });
    const db = new RoadmapDatabaseClient(knex, mockServices.logger.mock());

    const cfg = new ConfigReader({ roadmap: { adminUsers: [ADMIN] } });
    const httpAuth = mockServices.httpAuth.mock();
    (httpAuth.credentials as jest.Mock).mockResolvedValue(mockCredentials);

    // The acting user is switched per request via as(...)
    const userInfo: UserInfoService = {
      getUserInfo: async () =>
        ({ userEntityRef: currentUser, ownershipEntityRefs: [] } as any),
    };

    // Models a typical production policy: everyone may create features,
    // admin rights come from the roadmap.adminUsers list (checked before the
    // framework, so DENY here only affects non-admins).
    const permissions = {
      authorize: async (requests: any[]) =>
        requests.map(({ permission }) => ({
          result:
            permission.name === roadmapAdminPermission.name
              ? AuthorizeResult.DENY
              : AuthorizeResult.ALLOW,
        })),
      authorizeConditional: async (requests: any[]) =>
        requests.map(() => ({ result: AuthorizeResult.ALLOW })),
    } as unknown as PermissionsService;

    const options: RouterOptions = {
      permissions,
      logger: mockServices.logger.mock(),
      config: cfg,
      db,
      httpAuth,
      userInfo,
      cache: mockServices.cache.mock(),
      datasource: 'database',
      boardColumns: getMergedBoardColumns(cfg),
      boardConfigResponse: getBoardConfigResponse(cfg, 'database'),
    };

    const app = express();
    app.use(await createRouter(options));

    await new Promise<void>(resolve => {
      server = http.createServer(app);
      server.listen(0, () => {
        const { port } = server.address() as AddressInfo;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  describe('contributor', () => {
    it('can suggest, vote, and comment', async () => {
      const feature = await suggest(ALICE, 'Alice suggestion');
      expect(feature.author).toBe(ALICE);

      const voteRes = await api('POST', `/votes/${feature.id}`);
      expect(voteRes.status).toBe(200);
      expect(await voteRes.json()).toEqual({ voteAdded: true, voteCount: 1 });

      const commentRes = await api('POST', '/comments', {
        featureId: feature.id,
        text: 'From alice',
      });
      expect(commentRes.status).toBe(201);
    });

    it('cannot change a feature status', async () => {
      const feature = await suggest(ALICE, 'No status change for alice');
      const res = await api('PUT', `/features/${feature.id}/status`, {
        status: FeatureStatus.Planned,
      });
      expect(res.status).toBe(403);
    });

    it('can edit and delete their own suggested feature', async () => {
      const feature = await suggest(ALICE, 'Alice will rework this');

      const editRes = await api('PUT', `/features/${feature.id}`, {
        title: 'Alice reworked this',
      });
      expect(editRes.status).toBe(200);
      expect((await editRes.json()).title).toBe('Alice reworked this');

      const deleteRes = await api('DELETE', `/features/${feature.id}`);
      expect(deleteRes.status).toBe(204);
    });

    it("cannot edit or delete someone else's feature", async () => {
      const feature = await suggest(ALICE, 'Hands off, bob');

      as(BOB);
      const editRes = await api('PUT', `/features/${feature.id}`, {
        title: 'Bob was here',
      });
      expect(editRes.status).toBe(403);

      const deleteRes = await api('DELETE', `/features/${feature.id}`);
      expect(deleteRes.status).toBe(403);
    });

    it('cannot edit their own feature once it leaves Suggested', async () => {
      const feature = await suggest(ALICE, 'Locked after planning');

      as(ADMIN);
      const moveRes = await api('PUT', `/features/${feature.id}/status`, {
        status: FeatureStatus.Planned,
      });
      expect(moveRes.status).toBe(200);

      as(ALICE);
      const editRes = await api('PUT', `/features/${feature.id}`, {
        title: 'Too late to edit',
      });
      expect(editRes.status).toBe(403);
    });

    it('cannot delete comments', async () => {
      const feature = await suggest(ALICE, 'Comment moderation test');
      const commentRes = await api('POST', '/comments', {
        featureId: feature.id,
        text: 'Alice comment',
      });
      const comment = await commentRes.json();

      const res = await api('DELETE', `/comments/${comment.id}`);
      expect(res.status).toBe(403);
    });

    it('cannot reorder the board', async () => {
      const feature = await suggest(ALICE, 'No reorder for alice');
      const res = await api('PUT', '/features/reorder', {
        status: feature.status,
        orderedIds: [feature.id],
      });
      expect(res.status).toBe(403);
    });
  });

  describe('malformed payloads', () => {
    it('rejects non-string comment text with 400 instead of crashing', async () => {
      const feature = await suggest(ALICE, 'Comment validation target');
      const res = await api('POST', '/comments', {
        featureId: feature.id,
        text: { nested: true },
      });
      expect(res.status).toBe(400);
    });

    it('rejects non-string edit fields with 400 instead of crashing', async () => {
      const feature = await suggest(ALICE, 'Edit validation target');
      const res = await api('PUT', `/features/${feature.id}`, { title: 123 });
      expect(res.status).toBe(400);
    });

    it('caps vote batch endpoints to a bounded number of ids', async () => {
      const ids = Array.from({ length: 251 }, (_, i) => `id-${i}`).join(',');
      const counts = await api('GET', `/votes/counts?ids=${ids}`);
      expect(counts.status).toBe(400);
      const batch = await api('GET', `/votes/user/batch?ids=${ids}`);
      expect(batch.status).toBe(400);
    });

    it('deduplicates ids in vote batch requests', async () => {
      const feature = await suggest(ALICE, 'Dedupe target');
      const res = await api(
        'GET',
        `/votes/counts?ids=${feature.id},${feature.id}`,
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ [feature.id]: 0 });
    });
  });

  describe('admin', () => {
    it("can move anyone's feature through the board", async () => {
      const feature = await suggest(ALICE, 'Admin will plan this');

      as(ADMIN);
      const res = await api('PUT', `/features/${feature.id}/status`, {
        status: FeatureStatus.Planned,
      });
      expect(res.status).toBe(200);
      expect((await res.json()).status).toBe(FeatureStatus.Planned);
    });

    it("can edit and delete anyone's feature regardless of status", async () => {
      const feature = await suggest(ALICE, 'Admin cleanup target');

      as(ADMIN);
      await api('PUT', `/features/${feature.id}/status`, {
        status: FeatureStatus.Declined,
      });

      const editRes = await api('PUT', `/features/${feature.id}`, {
        description: 'Declined: out of scope',
      });
      expect(editRes.status).toBe(200);

      const deleteRes = await api('DELETE', `/features/${feature.id}`);
      expect(deleteRes.status).toBe(204);
    });

    it("can delete anyone's comment", async () => {
      const feature = await suggest(ALICE, 'Admin moderates comments');
      const comment = await (
        await api('POST', '/comments', {
          featureId: feature.id,
          text: 'To be moderated',
        })
      ).json();

      as(ADMIN);
      const res = await api('DELETE', `/comments/${comment.id}`);
      expect(res.status).toBe(204);
    });
  });
});
