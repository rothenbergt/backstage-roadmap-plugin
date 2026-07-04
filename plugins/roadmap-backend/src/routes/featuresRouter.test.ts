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
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
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
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
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

  describe('GitLab datasource â€” database-only routes', () => {
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

  describe('notifications', () => {
    const baseFeature = {
      id: '7',
      title: 'Dark mode',
      description: 'Please',
      votes: 0,
      author: 'user:default/author',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('notifies admins when a feature is created, excluding the author', async () => {
      const send = jest.fn().mockResolvedValue(undefined);
      const userInfo = mockServices.userInfo({
        userEntityRef: 'user:default/admin',
      });
      const mockDb = createMockDb();
      mockDb.addFeature.mockResolvedValue({
        ...baseFeature,
        status: FeatureStatus.Suggested,
        author: 'user:default/admin',
      });
      const cfg = new ConfigReader({
        roadmap: {
          adminUsers: ['user:default/admin', 'user:default/admin2'],
        },
      });

      ({ server, baseUrl } = await startServer(
        createApp({
          userInfo,
          db: mockDb,
          config: cfg,
          notifications: { send },
        }),
      ));

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', description: 'Test desc' }),
      });

      expect(response.status).toBe(201);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: { type: 'entity', entityRef: ['user:default/admin2'] },
          payload: expect.objectContaining({ topic: 'new-features' }),
        }),
      );
    });

    it('notifies the author on status change by an admin', async () => {
      const send = jest.fn().mockResolvedValue(undefined);
      const userInfo = mockServices.userInfo({
        userEntityRef: 'user:default/admin',
      });
      const mockDb = createMockDb();
      mockDb.getFeatureById.mockResolvedValue({
        ...baseFeature,
        status: FeatureStatus.Suggested,
      });
      mockDb.updateFeatureStatus.mockResolvedValue({
        ...baseFeature,
        status: FeatureStatus.Planned,
      });

      ({ server, baseUrl } = await startServer(
        createApp({ userInfo, db: mockDb, notifications: { send } }),
      ));

      const response = await fetch(`${baseUrl}/7/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: FeatureStatus.Planned }),
      });

      expect(response.status).toBe(200);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: { type: 'entity', entityRef: 'user:default/author' },
          payload: expect.objectContaining({ topic: 'status-changes' }),
        }),
      );
    });

    it('does not fail the request when the notification send rejects', async () => {
      const send = jest.fn().mockRejectedValue(new Error('unavailable'));
      const userInfo = mockServices.userInfo({
        userEntityRef: 'user:default/admin',
      });
      const mockDb = createMockDb();
      mockDb.addFeature.mockResolvedValue({
        ...baseFeature,
        status: FeatureStatus.Suggested,
      });

      ({ server, baseUrl } = await startServer(
        createApp({ userInfo, db: mockDb, notifications: { send } }),
      ));

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', description: 'Test desc' }),
      });

      expect(response.status).toBe(201);
    });
  });

  // Guards the wiring, not just the publisher class: if a route stops
  // calling the publisher, these fail.
  describe('events and signals wiring', () => {
    const baseFeature = {
      id: '7',
      title: 'Dark mode',
      description: 'Please',
      votes: 0,
      author: 'user:default/author',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    function createEventMocks() {
      return {
        events: {
          publish: jest.fn().mockResolvedValue(undefined),
          subscribe: jest.fn(),
        },
        signals: { publish: jest.fn().mockResolvedValue(undefined) },
      };
    }

    it('publishes an event and broadcasts a signal when a feature is created', async () => {
      const { events, signals } = createEventMocks();
      const mockDb = createMockDb();
      const created = { ...baseFeature, status: FeatureStatus.Suggested };
      mockDb.addFeature.mockResolvedValue(created);
      const userInfo = mockServices.userInfo({
        userEntityRef: 'user:default/admin',
      });

      ({ server, baseUrl } = await startServer(
        createApp({ userInfo, db: mockDb, events, signals }),
      ));

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', description: 'Test desc' }),
      });

      expect(response.status).toBe(201);
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'roadmap',
          metadata: { action: 'create_feature' },
          eventPayload: { feature: created, actor: 'user:default/admin' },
        }),
      );
      expect(signals.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'roadmap:board',
          recipients: { type: 'broadcast' },
          message: expect.objectContaining({ kind: 'feature_created' }),
        }),
      );
    });

    it('publishes change_feature_status only when the status actually changes', async () => {
      const { events, signals } = createEventMocks();
      const userInfo = mockServices.userInfo({
        userEntityRef: 'user:default/admin',
      });
      const mockDb = createMockDb();
      mockDb.getFeatureById.mockResolvedValue({
        ...baseFeature,
        status: FeatureStatus.Planned,
      });
      mockDb.updateFeatureStatus.mockResolvedValue({
        ...baseFeature,
        status: FeatureStatus.Planned,
      });

      ({ server, baseUrl } = await startServer(
        createApp({ userInfo, db: mockDb, events, signals }),
      ));

      // No-op move: Planned -> Planned
      const response = await fetch(`${baseUrl}/7/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: FeatureStatus.Planned }),
      });

      expect(response.status).toBe(200);
      expect(events.publish).not.toHaveBeenCalled();
      expect(signals.publish).not.toHaveBeenCalled();
    });

    it('does not fail the request when event publishing rejects', async () => {
      const events = {
        publish: jest.fn().mockRejectedValue(new Error('down')),
        subscribe: jest.fn(),
      };
      const signals = {
        publish: jest.fn().mockRejectedValue(new Error('down')),
      };
      const mockDb = createMockDb();
      mockDb.addFeature.mockResolvedValue({
        ...baseFeature,
        status: FeatureStatus.Suggested,
      });
      const userInfo = mockServices.userInfo({
        userEntityRef: 'user:default/admin',
      });

      ({ server, baseUrl } = await startServer(
        createApp({ userInfo, db: mockDb, events, signals }),
      ));

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', description: 'Test desc' }),
      });

      expect(response.status).toBe(201);
    });
  });
});
