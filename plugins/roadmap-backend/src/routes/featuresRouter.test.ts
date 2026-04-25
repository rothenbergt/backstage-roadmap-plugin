import { mockServices } from '@backstage/backend-test-utils';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { setupServer } from 'msw/node';
import { featuresRouter } from './featuresRouter';
import { RouterOptions } from './router';
import { RoadmapDatasource } from '../types';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { ConfigReader } from '@backstage/config';
import { getBoardConfigResponse, getMergedBoardColumns } from '../boardConfig';
import {
  AuthorizeResult,
  PolicyDecision,
} from '@backstage/plugin-permission-common';

const mockCredentials = {
  principal: { type: 'user' },
  $$type: '@backstage/BackstageCredentials',
};

// MSW server for intercepting any outbound HTTP requests
const mswServer = setupServer();

function createMockDb(): jest.Mocked<RoadmapDatasource> {
  return {
    addFeature: jest.fn(),
    getAllFeatures: jest.fn().mockResolvedValue([]),
    getFeatureById: jest.fn(),
    updateFeatureStatus: jest.fn(),
    addComment: jest.fn(),
    getCommentsByFeatureId: jest.fn(),
    toggleVote: jest.fn(),
    getVoteCount: jest.fn(),
    getVoteCounts: jest.fn(),
    hasVoted: jest.fn(),
    hasVotedBatch: jest.fn(),
  };
}

function createMockHttpAuth() {
  const httpAuth = mockServices.httpAuth.mock();
  (httpAuth.credentials as jest.Mock).mockResolvedValue(mockCredentials);
  return httpAuth;
}

function createApp(overrides?: Partial<RouterOptions>): express.Express {
  const cfg = new ConfigReader({
    roadmap: { adminUsers: ['user:default/admin'] },
  });
  const boardColumns = getMergedBoardColumns(cfg);
  const boardConfigResponse = getBoardConfigResponse(cfg, 'database');
  const options: RouterOptions = {
    logger: mockServices.logger.mock(),
    config: cfg,
    db: createMockDb(),
    httpAuth: createMockHttpAuth(),
    userInfo: mockServices.userInfo({
      userEntityRef: 'user:default/testuser',
    }),
    permissions: mockServices.permissions.mock(),
    cache: mockServices.cache.mock(),
    datasource: 'database',
    boardColumns,
    boardConfigResponse,
    ...overrides,
  };
  const app = express();
  app.use(express.json());
  app.use(featuresRouter(options));
  app.use(((err: any, _req: any, res: any, _next: any) => {
    const status =
      err.statusCode ?? (err.name === 'NotAllowedError' ? 403 : 500);
    res
      .status(status)
      .json({ error: { name: err.name, message: err.message } });
  }) as express.ErrorRequestHandler);
  return app;
}

function startServer(app: express.Express): Promise<{
  server: http.Server;
  baseUrl: string;
}> {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://localhost:${port}` });
    });
  });
}

function stopServer(server: http.Server): Promise<void> {
  return new Promise(resolve => server.close(() => resolve()));
}

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

describe('featuresRouter', () => {
  let server: http.Server;
  let baseUrl: string;

  afterEach(async () => {
    if (server) await stopServer(server);
  });

  describe('POST / (create feature)', () => {
    it('denies creation when permission check fails', async () => {
      const permissions = mockServices.permissions.mock();
      (permissions.authorize as jest.Mock).mockResolvedValue([
        { result: AuthorizeResult.DENY } as PolicyDecision,
      ]);

      ({ server, baseUrl } = await startServer(createApp({ permissions })));

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', description: 'Test desc' }),
      });

      expect(response.status).toBe(403);
    });

    it('allows creation when user is admin via config', async () => {
      const userInfo = mockServices.userInfo({
        userEntityRef: 'user:default/admin',
      });
      const mockDb = createMockDb();
      mockDb.addFeature.mockResolvedValue({
        id: '1',
        title: 'Test',
        description: 'Test desc',
        status: FeatureStatus.Suggested,
        votes: 0,
        author: 'user:default/admin',
        created_at: '2024-01-01 00:00:00',
        updated_at: '2024-01-01 00:00:00',
      });

      ({ server, baseUrl } = await startServer(
        createApp({ userInfo, db: mockDb }),
      ));

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', description: 'Test desc' }),
      });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.title).toBe('Test');
    });

    it('allows creation when permission framework grants access', async () => {
      const permissions = mockServices.permissions.mock();
      (permissions.authorize as jest.Mock).mockResolvedValue([
        { result: AuthorizeResult.ALLOW } as PolicyDecision,
      ]);
      const mockDb = createMockDb();
      mockDb.addFeature.mockResolvedValue({
        id: '2',
        title: 'Allowed',
        description: 'Allowed desc',
        status: FeatureStatus.Suggested,
        votes: 0,
        author: 'user:default/testuser',
        created_at: '2024-01-01 00:00:00',
        updated_at: '2024-01-01 00:00:00',
      });

      ({ server, baseUrl } = await startServer(
        createApp({ permissions, db: mockDb }),
      ));

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Allowed', description: 'Allowed desc' }),
      });

      expect(response.status).toBe(201);
    });

    it('rejects when no permissions service and user is not admin', async () => {
      ({ server, baseUrl } = await startServer(
        createApp({ permissions: undefined }),
      ));

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', description: 'Test desc' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /board-config', () => {
    it('returns merged columns and capabilities for database', async () => {
      ({ server, baseUrl } = await startServer(createApp()));

      const response = await fetch(`${baseUrl}/board-config`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.columns)).toBe(true);
      expect(body.capabilities?.adminReorder).toBe(true);
      expect(body.capabilities?.includeBeyondRetentionQuery).toBe(true);
    });

    it('returns GitLab capabilities (extensions off)', async () => {
      const cfg = new ConfigReader({
        roadmap: { adminUsers: ['user:default/admin'] },
      });
      ({ server, baseUrl } = await startServer(
        createApp({
          datasource: 'gitlab',
          boardColumns: getMergedBoardColumns(cfg),
          boardConfigResponse: getBoardConfigResponse(cfg, 'gitlab'),
        }),
      ));

      const response = await fetch(`${baseUrl}/board-config`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.capabilities?.adminReorder).toBe(false);
      expect(body.capabilities?.adminEditTitleDescription).toBe(false);
    });
  });

  describe('GitLab datasource — database-only routes', () => {
    function createGitlabApp() {
      const cfg = new ConfigReader({
        roadmap: { adminUsers: ['user:default/admin'] },
      });
      return createApp({
        datasource: 'gitlab',
        boardColumns: getMergedBoardColumns(cfg),
        boardConfigResponse: getBoardConfigResponse(cfg, 'gitlab'),
      });
    }

    it('returns 403 for PUT /reorder', async () => {
      ({ server, baseUrl } = await startServer(createGitlabApp()));

      const response = await fetch(`${baseUrl}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: FeatureStatus.Suggested,
          orderedIds: ['1'],
        }),
      });
      expect(response.status).toBe(403);
    });

    it('returns 403 for PUT /:id (title/description)', async () => {
      ({ server, baseUrl } = await startServer(createGitlabApp()));

      const response = await fetch(`${baseUrl}/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x' }),
      });
      expect(response.status).toBe(403);
    });

    it('returns 403 for DELETE /:id', async () => {
      ({ server, baseUrl } = await startServer(createGitlabApp()));

      const response = await fetch(`${baseUrl}/1`, { method: 'DELETE' });
      expect(response.status).toBe(403);
    });
  });
});
