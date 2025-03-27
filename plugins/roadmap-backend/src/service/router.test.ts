import { mockServices } from '@backstage/backend-test-utils';
import express from 'express';
import request from 'supertest';
import { RoadmapDatabaseClient } from '../database/RoadmapDatabaseClient';
import { createRouter } from './router';

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const mockDb = {
      setupSchema: jest.fn().mockResolvedValue(undefined),
    } as unknown as RoadmapDatabaseClient;

    const router = await createRouter({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig(),
      db: mockDb,
      httpAuth: mockServices.httpAuth.mock(),
      userInfo: mockServices.userInfo.mock(),
      permissions: mockServices.permissions.mock(),
      cache: mockServices.cache.mock(),
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
