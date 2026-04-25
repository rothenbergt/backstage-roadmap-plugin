import { startTestBackend } from '@backstage/backend-test-utils';
import { roadmapPlugin } from './plugin';
import { mockServices } from '@backstage/backend-test-utils';
import request from 'supertest';

/** True when the native better-sqlite3 binary matches this Node (CI / nvm-aligned dev). */
function canOpenBetterSqliteMemory(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BetterSqlite = require('better-sqlite3');
    const db = new BetterSqlite(':memory:');
    db.close();
    return true;
  } catch {
    return false;
  }
}

const describeIntegration = canOpenBetterSqliteMemory()
  ? describe
  : describe.skip;

// Mock the gitlab client to avoid real HTTP calls
jest.mock('./gitlab', () => ({
  RoadmapGitlabClient: {
    create: jest.fn().mockReturnValue({
      getAllFeatures: jest.fn().mockResolvedValue([]),
      getFeatureById: jest.fn(),
      addFeature: jest.fn(),
      updateFeatureStatus: jest.fn(),
      addComment: jest.fn(),
      getCommentsByFeatureId: jest.fn(),
      toggleVote: jest.fn(),
      getVoteCount: jest.fn(),
      getVoteCounts: jest.fn(),
      hasVoted: jest.fn(),
      hasVotedBatch: jest.fn(),
    }),
  },
}));

describeIntegration('roadmapPlugin datasource config', () => {
  it('starts with database source by default', async () => {
    const { server } = await startTestBackend({
      features: [
        roadmapPlugin,
        mockServices.rootConfig.factory({
          data: {
            permission: { enabled: false },
          },
        }),
      ],
    });

    const response = await request(server).get('/api/roadmap/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });

    await server.close();
  });

  it('starts with gitlab source when configured', async () => {
    const { server } = await startTestBackend({
      features: [
        roadmapPlugin,
        mockServices.rootConfig.factory({
          data: {
            roadmap: {
              source: 'gitlab',
              gitlab: {
                apiBaseUrl: 'https://gitlab.example.com/api/v4',
                token: 'test-token',
                projectId: 'test/project',
              },
            },
            permission: { enabled: false },
          },
        }),
      ],
    });

    const response = await request(server).get('/api/roadmap/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });

    await server.close();
  });

  it('throws for unknown datasource', async () => {
    await expect(
      startTestBackend({
        features: [
          roadmapPlugin,
          mockServices.rootConfig.factory({
            data: {
              roadmap: { source: 'unknown' },
              permission: { enabled: false },
            },
          }),
        ],
      }),
    ).rejects.toThrow('Unknown roadmap datasource: unknown');
  });
});
