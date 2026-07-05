import { mockServices, TestDatabases } from '@backstage/backend-test-utils';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { ConfigReader } from '@backstage/config';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapDatabaseClient } from '../database/RoadmapDatabaseClient';
import { getBoardConfigResponse, getMergedBoardColumns } from '../boardConfig';
import { featuresRouter } from '../routes/featuresRouter';
import { commentsRouter } from '../routes/commentsRouter';
import { votesRouter } from '../routes/votesRouter';
import { RouterOptions } from '../routes/router';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const mockCredentials = {
  principal: { type: 'user' },
  $$type: '@backstage/BackstageCredentials',
};

/**
 * Full-stack contract test: real sqlite database, migrations, and routers
 * over real HTTP. Asserts what API consumers actually receive, so a
 * regression anywhere between the DB driver and the JSON response fails
 * here instead of in a live deployment.
 */
describe('HTTP contract (real database)', () => {
  const databases = TestDatabases.create({ ids: ['SQLITE_3'] });
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const knex = await databases.init('SQLITE_3');
    await knex.migrate.latest({ directory: `${__dirname}/../../migrations` });
    const db = new RoadmapDatabaseClient(knex, mockServices.logger.mock());

    const cfg = new ConfigReader({
      roadmap: { adminUsers: ['user:default/admin'] },
    });
    const httpAuth = mockServices.httpAuth.mock();
    (httpAuth.credentials as jest.Mock).mockResolvedValue(mockCredentials);
    const options: RouterOptions = {
      logger: mockServices.logger.mock(),
      config: cfg,
      db,
      httpAuth,
      // The admin user so status changes are allowed without the framework
      userInfo: mockServices.userInfo({
        userEntityRef: 'user:default/admin',
      }),
      cache: mockServices.cache.mock(),
      datasource: 'database',
      boardColumns: getMergedBoardColumns(cfg),
      boardConfigResponse: getBoardConfigResponse(cfg, 'database'),
    };

    const app = express();
    app.use(express.json());
    app.use('/features', featuresRouter(options));
    app.use('/comments', commentsRouter(options));
    app.use('/votes', votesRouter(options));

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

  it('serves the full feature lifecycle with the camelCase/ISO contract', async () => {
    // Create
    const createRes = await fetch(`${baseUrl}/features`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Dark mode',
        description: 'Support dark mode',
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created).toMatchObject({
      title: 'Dark mode',
      status: FeatureStatus.Suggested,
      votes: 0,
      author: 'user:default/admin',
    });
    expect(created.createdAt).toMatch(ISO_UTC);
    expect(created.updatedAt).toMatch(ISO_UTC);
    expect(created).not.toHaveProperty('created_at');
    expect(created).not.toHaveProperty('board_position');
    expect(typeof created.boardPosition).toBe('number');

    // List
    const listRes = await fetch(`${baseUrl}/features`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].createdAt).toMatch(ISO_UTC);

    // Status change
    const statusRes = await fetch(`${baseUrl}/features/${created.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: FeatureStatus.Planned }),
    });
    expect(statusRes.status).toBe(200);
    const moved = await statusRes.json();
    expect(moved.status).toBe(FeatureStatus.Planned);
    expect(moved.updatedAt).toMatch(ISO_UTC);

    // Comment
    const commentRes = await fetch(`${baseUrl}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureId: created.id, text: 'Nice' }),
    });
    expect(commentRes.status).toBe(201);
    const comment = await commentRes.json();
    expect(comment.featureId).toBe(created.id);
    expect(comment).not.toHaveProperty('feature_id');
    expect(comment.createdAt).toMatch(ISO_UTC);

    // Vote
    const voteRes = await fetch(`${baseUrl}/votes/${created.id}`, {
      method: 'POST',
    });
    expect(voteRes.status).toBe(200);
    expect(await voteRes.json()).toEqual({ voteAdded: true, voteCount: 1 });
  });
});
