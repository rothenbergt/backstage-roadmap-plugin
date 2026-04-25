import { mockServices } from '@backstage/backend-test-utils';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { RoadmapGitlabClient } from './RoadmapGitlabClient';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { CacheService } from '@backstage/backend-plugin-api';
import {
  NotFoundError,
  ConflictError,
  NotAllowedError,
} from '@backstage/errors';

const BASE_URL = 'https://gitlab.example.com/api/v4';
const PROJECT_ID = '123';
const GROUP_ID = 'my-group';
const DEFAULT_PROJECT_ID = '456';
const ENCODED_GROUP_ID = encodeURIComponent(GROUP_ID);
const ENCODED_DEFAULT_PROJECT_ID = encodeURIComponent(DEFAULT_PROJECT_ID);

const makeIssue = (overrides: Record<string, any> = {}) => ({
  id: overrides.id ?? overrides.iid ?? 1,
  iid: 1,
  title: 'Test Feature',
  description: 'A test feature',
  labels: ['roadmap', 'roadmap::Suggested'],
  upvotes: 0,
  author: { username: 'funcuser' },
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const makeNote = (overrides: Record<string, any> = {}) => ({
  id: 100,
  body: 'A comment',
  system: false,
  author: { username: 'funcuser' },
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

function createMockCache(): CacheService & { store: Map<string, any> } {
  const store = new Map<string, any>();
  return {
    store,
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: any) => {
      store.set(key, value);
    }),
    delete: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    withOptions: jest.fn().mockReturnThis(),
  };
}

function createClient(cacheOverride?: CacheService): RoadmapGitlabClient {
  return RoadmapGitlabClient.create({
    gitlab: {
      apiBaseUrl: BASE_URL,
      token: 'test-token',
      projectId: PROJECT_ID,
    },
    logger: mockServices.logger.mock(),
    cache: cacheOverride ?? createMockCache(),
  });
}

function createGroupClient(
  cacheOverride?: CacheService,
  opts?: { defaultProjectId?: string | null },
): RoadmapGitlabClient {
  return RoadmapGitlabClient.create({
    gitlab: {
      apiBaseUrl: BASE_URL,
      token: 'test-token',
      groupId: GROUP_ID,
      ...(opts?.defaultProjectId !== null && {
        defaultProjectId: opts?.defaultProjectId ?? DEFAULT_PROJECT_ID,
      }),
    },
    logger: mockServices.logger.mock(),
    cache: cacheOverride ?? createMockCache(),
  });
}

/** Pre-populate the iid cache so ensureIssueProjectCached won't trigger fetchAllRoadmapIssues */
function seedIidCache(
  cache: ReturnType<typeof createMockCache>,
  issueId: string | number,
  iid?: string | number,
) {
  cache.store.set(`roadmap:issue-iid:${issueId}`, String(iid ?? issueId));
}

/** Pre-populate both iid and project caches for group mode */
function seedGroupCache(
  cache: ReturnType<typeof createMockCache>,
  issueId: string | number,
  projectId: string | number,
  iid?: string | number,
) {
  seedIidCache(cache, issueId, iid ?? issueId);
  cache.store.set(`roadmap:issue-project:${issueId}`, String(projectId));
}

const notesUrl = (issueId: string | number) =>
  `${BASE_URL}/projects/${PROJECT_ID}/issues/${issueId}/notes`;
const issueUrl = (issueId: string | number) =>
  `${BASE_URL}/projects/${PROJECT_ID}/issues/${issueId}`;
const issuesUrl = `${BASE_URL}/projects/${PROJECT_ID}/issues`;

const groupIssuesUrl = `${BASE_URL}/groups/${ENCODED_GROUP_ID}/issues`;
const groupProjectNotesUrl = (
  projectId: string | number,
  issueId: string | number,
) => `${BASE_URL}/projects/${projectId}/issues/${issueId}/notes`;
const groupProjectIssueUrl = (
  projectId: string | number,
  issueId: string | number,
) => `${BASE_URL}/projects/${projectId}/issues/${issueId}`;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('RoadmapGitlabClient', () => {
  describe('addFeature', () => {
    it('creates a GitLab issue with roadmap labels', async () => {
      const client = createClient();

      server.use(http.post(issuesUrl, () => HttpResponse.json(makeIssue())));

      const feature = await client.addFeature({
        title: 'Test Feature',
        description: 'A test feature',
        author: 'user:default/jdoe',
      });

      expect(feature.id).toBe('1');
      expect(feature.title).toBe('Test Feature');
      expect(feature.status).toBe(FeatureStatus.Suggested);
    });
  });

  describe('getAllFeatures', () => {
    it('returns features with vote counts from note markers', async () => {
      const client = createClient();
      const issues = [makeIssue({ iid: 1 }), makeIssue({ iid: 2 })];

      server.use(
        http.get(issuesUrl, () =>
          HttpResponse.json(issues, {
            headers: { 'x-next-page': '' },
          }),
        ),
        http.get(notesUrl(1), () =>
          HttpResponse.json(
            [makeNote({ id: 10, body: '<!-- vote:alice -->' })],
            { headers: { 'x-next-page': '' } },
          ),
        ),
        http.get(notesUrl(2), () =>
          HttpResponse.json(
            [
              makeNote({ id: 20, body: '<!-- vote:alice -->' }),
              makeNote({ id: 21, body: '<!-- vote:bob -->' }),
            ],
            { headers: { 'x-next-page': '' } },
          ),
        ),
      );

      const features = await client.getAllFeatures();

      expect(features).toHaveLength(2);
      expect(features.find(f => f.id === '1')?.votes).toBe(1);
      expect(features.find(f => f.id === '2')?.votes).toBe(2);
    });
  });

  describe('getFeatureById', () => {
    it('returns a single feature with vote count', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);

      server.use(
        http.get(issueUrl(1), () => HttpResponse.json(makeIssue())),
        http.get(notesUrl(1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      const feature = await client.getFeatureById('1');

      expect(feature.id).toBe('1');
      expect(feature.votes).toBe(0);
    });

    it('throws NotFoundError for non-existent feature', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 999);
      const client = createClient(cache);

      server.use(
        http.get(
          issueUrl(999),
          () => new HttpResponse('Not found', { status: 404 }),
        ),
      );

      await expect(client.getFeatureById('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateFeatureStatus', () => {
    it('replaces status label on the issue', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      let updatedLabels: string | undefined;

      server.use(
        http.get(issueUrl(1), () => HttpResponse.json(makeIssue())),
        http.put(issueUrl(1), async ({ request }) => {
          const body = (await request.json()) as Record<string, any>;
          updatedLabels = body.labels;
          return HttpResponse.json(
            makeIssue({ labels: ['roadmap', 'roadmap::Planned'] }),
          );
        }),
      );

      const feature = await client.updateFeatureStatus(
        '1',
        FeatureStatus.Planned,
      );

      expect(feature.status).toBe(FeatureStatus.Planned);
      expect(updatedLabels).toContain('roadmap::Planned');
      expect(updatedLabels).not.toContain('roadmap::Suggested');
    });
  });

  describe('addComment', () => {
    it('embeds author tag in note body when author is provided', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      let postedBody: string | undefined;

      server.use(
        http.post(notesUrl(1), async ({ request }) => {
          const body = (await request.json()) as Record<string, any>;
          postedBody = body.body;
          return HttpResponse.json(makeNote({ id: 200, body: body.body }));
        }),
      );

      const comment = await client.addComment({
        featureId: '1',
        text: 'Great idea!',
        author: 'user:default/jdoe',
      });

      expect(postedBody).toBe('<!-- author:jdoe -->\nGreat idea!');
      expect(comment.author).toBe('jdoe');
      expect(comment.text).toBe('Great idea!');
    });

    it('does not embed author tag when author is not provided', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      let postedBody: string | undefined;

      server.use(
        http.post(notesUrl(1), async ({ request }) => {
          const body = (await request.json()) as Record<string, any>;
          postedBody = body.body;
          return HttpResponse.json(makeNote({ id: 201, body: body.body }));
        }),
      );

      const comment = await client.addComment({
        featureId: '1',
        text: 'Anonymous comment',
      });

      expect(postedBody).toBe('Anonymous comment');
      expect(comment.author).toBe('funcuser');
    });
  });

  describe('getCommentsByFeatureId', () => {
    it('filters out system notes and vote markers', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);

      server.use(
        http.get(issueUrl(1), () => HttpResponse.json(makeIssue())),
        http.get(notesUrl(1), () =>
          HttpResponse.json(
            [
              makeNote({ id: 1, body: '<!-- author:jdoe -->\nReal comment' }),
              makeNote({ id: 2, body: '<!-- vote:alice -->' }),
              makeNote({ id: 3, body: 'System note', system: true }),
              makeNote({ id: 4, body: 'Plain comment' }),
            ],
            { headers: { 'x-next-page': '' } },
          ),
        ),
      );

      const comments = await client.getCommentsByFeatureId('1');

      expect(comments).toHaveLength(2);
      expect(comments[0].id).toBe('1');
      expect(comments[0].author).toBe('jdoe');
      expect(comments[0].text).toBe('Real comment');
      expect(comments[1].id).toBe('4');
      expect(comments[1].text).toBe('Plain comment');
    });
  });

  describe('toggleVote', () => {
    it('adds a vote when user has not voted', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      let postedBody: string | undefined;

      server.use(
        http.get(notesUrl(1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
        http.post(notesUrl(1), async ({ request }) => {
          const body = (await request.json()) as Record<string, any>;
          postedBody = body.body;
          return HttpResponse.json(makeNote({ id: 300, body: body.body }));
        }),
      );

      const result = await client.toggleVote('1', 'user:default/jdoe');

      expect(result.voteAdded).toBe(true);
      expect(result.voteCount).toBe(1);
      expect(postedBody).toBe('<!-- vote:jdoe -->');
    });

    it('removes a vote when user has already voted', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      let deletedPath: string | undefined;

      server.use(
        http.get(notesUrl(1), () =>
          HttpResponse.json(
            [makeNote({ id: 300, body: '<!-- vote:jdoe -->' })],
            { headers: { 'x-next-page': '' } },
          ),
        ),
        http.delete(`${notesUrl(1)}/:noteId`, ({ params }) => {
          deletedPath = params.noteId as string;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const result = await client.toggleVote('1', 'user:default/jdoe');

      expect(result.voteAdded).toBe(false);
      expect(result.voteCount).toBe(0);
      expect(deletedPath).toBe('300');
    });

    it('invalidates cache before toggling and re-caches after', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);

      server.use(
        http.get(notesUrl(1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
        http.post(notesUrl(1), async ({ request }) => {
          const body = (await request.json()) as Record<string, any>;
          return HttpResponse.json(makeNote({ id: 400, body: body.body }));
        }),
      );

      await client.toggleVote('1', 'user:default/jdoe');

      expect(cache.delete).toHaveBeenCalledWith('roadmap:votes:1');
      expect(cache.set).toHaveBeenCalledWith(
        'roadmap:votes:1',
        { jdoe: 0 },
        { ttl: 30000 },
      );
    });
  });

  describe('getVoteCount', () => {
    it('returns count from cache when available', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      cache.store.set('roadmap:votes:1', { alice: 10, bob: 20 });
      const client = createClient(cache);

      const count = await client.getVoteCount('1');

      expect(count).toBe(2);
    });

    it('fetches from GitLab when cache is empty', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);

      server.use(
        http.get(notesUrl(1), () =>
          HttpResponse.json(
            [
              makeNote({ id: 10, body: '<!-- vote:alice -->' }),
              makeNote({ id: 11, body: '<!-- vote:bob -->' }),
              makeNote({ id: 12, body: 'regular comment' }),
            ],
            { headers: { 'x-next-page': '' } },
          ),
        ),
      );

      const count = await client.getVoteCount('1');

      expect(count).toBe(2);
      expect(cache.set).toHaveBeenCalledWith(
        'roadmap:votes:1',
        { alice: 10, bob: 11 },
        { ttl: 30000 },
      );
    });
  });

  describe('hasVoted', () => {
    it('returns true when user has a vote marker', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      cache.store.set('roadmap:votes:1', { jdoe: 10 });
      const client = createClient(cache);

      const result = await client.hasVoted('1', 'user:default/jdoe');

      expect(result).toBe(true);
    });

    it('returns false when user has no vote marker', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      cache.store.set('roadmap:votes:1', { alice: 10 });
      const client = createClient(cache);

      const result = await client.hasVoted('1', 'user:default/jdoe');

      expect(result).toBe(false);
    });
  });

  describe('hasVotedBatch', () => {
    it('returns vote status for multiple features', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      seedIidCache(cache, 2);
      cache.store.set('roadmap:votes:1', { jdoe: 10 });
      cache.store.set('roadmap:votes:2', { alice: 20 });
      const client = createClient(cache);

      const result = await client.hasVotedBatch(
        ['1', '2'],
        'user:default/jdoe',
      );

      expect(result).toEqual({ '1': true, '2': false });
    });
  });

  describe('getVoteCounts', () => {
    it('returns counts for multiple features', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      seedIidCache(cache, 2);
      cache.store.set('roadmap:votes:1', { alice: 10 });
      cache.store.set('roadmap:votes:2', { alice: 20, bob: 21 });
      const client = createClient(cache);

      const result = await client.getVoteCounts(['1', '2']);

      expect(result).toEqual({ '1': 1, '2': 2 });
    });
  });

  describe('API error handling', () => {
    it('throws NotAllowedError on 401', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      server.use(
        http.get(
          issueUrl(1),
          () => new HttpResponse('Unauthorized', { status: 401 }),
        ),
      );
      await expect(client.getFeatureById('1')).rejects.toThrow(NotAllowedError);
    });

    it('throws ConflictError on non-404/non-401 errors', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      server.use(
        http.get(
          issueUrl(1),
          () => new HttpResponse('Server Error', { status: 500 }),
        ),
      );
      await expect(client.getFeatureById('1')).rejects.toThrow(ConflictError);
    });
  });

  describe('pagination', () => {
    it('follows x-next-page header across multiple pages', async () => {
      const client = createClient();

      server.use(
        http.get(issuesUrl, ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          if (page === '2') {
            return HttpResponse.json([makeIssue({ iid: 2 })], {
              headers: { 'x-next-page': '' },
            });
          }
          return HttpResponse.json([makeIssue({ iid: 1 })], {
            headers: { 'x-next-page': '2' },
          });
        }),
        http.get(notesUrl(1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
        http.get(notesUrl(2), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      const features = await client.getAllFeatures();
      expect(features).toHaveLength(2);
      expect(features.map(f => f.id)).toEqual(
        expect.arrayContaining(['1', '2']),
      );
    });
  });

  describe('edge cases', () => {
    it('defaults to Suggested status when no status labels', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      server.use(
        http.get(issueUrl(1), () =>
          HttpResponse.json(makeIssue({ labels: ['roadmap'] })),
        ),
        http.get(notesUrl(1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );
      const feature = await client.getFeatureById('1');
      expect(feature.status).toBe(FeatureStatus.Suggested);
    });

    it('defaults description to empty string when missing', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      server.use(
        http.get(issueUrl(1), () =>
          HttpResponse.json(makeIssue({ description: undefined })),
        ),
        http.get(notesUrl(1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );
      const feature = await client.getFeatureById('1');
      expect(feature.description).toBe('');
    });

    it('defaults author to empty string when missing', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      server.use(
        http.get(issueUrl(1), () =>
          HttpResponse.json(makeIssue({ author: undefined })),
        ),
        http.get(notesUrl(1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );
      const feature = await client.getFeatureById('1');
      expect(feature.author).toBe('');
    });

    it('adds roadmap label during status update if missing', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = createClient(cache);
      let updatedLabels: string | undefined;

      server.use(
        http.get(issueUrl(1), () =>
          HttpResponse.json(makeIssue({ labels: [] })),
        ),
        http.put(issueUrl(1), async ({ request }) => {
          const body = (await request.json()) as Record<string, any>;
          updatedLabels = body.labels;
          return HttpResponse.json(
            makeIssue({ labels: ['roadmap', 'roadmap::Planned'] }),
          );
        }),
      );

      await client.updateFeatureStatus('1', FeatureStatus.Planned);
      expect(updatedLabels).toContain('roadmap');
      expect(updatedLabels).toContain('roadmap::Planned');
    });

    it('strips trailing slashes from baseUrl', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const client = RoadmapGitlabClient.create({
        gitlab: {
          apiBaseUrl: `${BASE_URL}///`,
          token: 'test-token',
          projectId: PROJECT_ID,
        },
        logger: mockServices.logger.mock(),
        cache,
      });

      server.use(
        http.get(issueUrl(1), () => HttpResponse.json(makeIssue())),
        http.get(notesUrl(1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      const feature = await client.getFeatureById('1');
      expect(feature.id).toBe('1');
    });

    it('encodes projectId with special characters', async () => {
      const cache = createMockCache();
      seedIidCache(cache, 1);
      const encodedId = encodeURIComponent('my-group/my-project');
      const client = RoadmapGitlabClient.create({
        gitlab: {
          apiBaseUrl: BASE_URL,
          token: 'test-token',
          projectId: 'my-group/my-project',
        },
        logger: mockServices.logger.mock(),
        cache,
      });

      server.use(
        http.get(`${BASE_URL}/projects/${encodedId}/issues/1`, () =>
          HttpResponse.json(makeIssue()),
        ),
        http.get(`${BASE_URL}/projects/${encodedId}/issues/1/notes`, () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      const feature = await client.getFeatureById('1');
      expect(feature.id).toBe('1');
    });
  });

  describe('group mode', () => {
    it('fetches issues from group API url', async () => {
      const cache = createMockCache();
      const client = createGroupClient(cache);
      const issue = makeIssue({ iid: 1, project_id: 789 });

      server.use(
        http.get(groupIssuesUrl, () =>
          HttpResponse.json([issue], { headers: { 'x-next-page': '' } }),
        ),
        http.get(groupProjectNotesUrl(789, 1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      const features = await client.getAllFeatures();
      expect(features).toHaveLength(1);
      expect(features[0].id).toBe('1');
    });

    it('caches issue project_id from group-level responses', async () => {
      const cache = createMockCache();
      const client = createGroupClient(cache);
      const issue = makeIssue({ iid: 5, project_id: 789 });

      server.use(
        http.get(groupIssuesUrl, () =>
          HttpResponse.json([issue], { headers: { 'x-next-page': '' } }),
        ),
        http.get(groupProjectNotesUrl(789, 5), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      await client.getAllFeatures();
      expect(cache.set).toHaveBeenCalledWith('roadmap:issue-project:5', '789', {
        ttl: 300000,
      });
    });

    it('fetches single issue using cached project_id', async () => {
      const cache = createMockCache();
      seedGroupCache(cache, 1, 789);
      const client = createGroupClient(cache);

      server.use(
        http.get(groupProjectIssueUrl(789, 1), () =>
          HttpResponse.json(makeIssue({ project_id: 789 })),
        ),
        http.get(groupProjectNotesUrl(789, 1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      const feature = await client.getFeatureById('1');
      expect(feature.id).toBe('1');
    });

    it('auto-fetches all issues when project cache misses for getFeatureById', async () => {
      const cache = createMockCache();
      const client = createGroupClient(cache);
      const issue = makeIssue({ iid: 1, project_id: 789 });

      server.use(
        http.get(groupIssuesUrl, () =>
          HttpResponse.json([issue], { headers: { 'x-next-page': '' } }),
        ),
        http.get(groupProjectIssueUrl(789, 1), () =>
          HttpResponse.json(makeIssue({ project_id: 789 })),
        ),
        http.get(groupProjectNotesUrl(789, 1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      const feature = await client.getFeatureById('1');
      expect(feature.id).toBe('1');
    });

    it('throws NotFoundError when resolveProjectId has no cached mapping', async () => {
      const cache = createMockCache();
      const client = createGroupClient(cache);

      // Return empty issues so no project mapping gets cached for issue 999
      server.use(
        http.get(groupIssuesUrl, () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      await expect(client.getFeatureById('999')).rejects.toThrow(NotFoundError);
    });

    it('creates issues using defaultProjectId', async () => {
      const cache = createMockCache();
      const client = createGroupClient(cache);
      let requestUrl: string | undefined;

      server.use(
        http.post(
          `${BASE_URL}/projects/${ENCODED_DEFAULT_PROJECT_ID}/issues`,
          ({ request }) => {
            requestUrl = request.url;
            return HttpResponse.json(makeIssue());
          },
        ),
      );

      await client.addFeature({
        title: 'New Feature',
        description: 'desc',
        author: 'user:default/jdoe',
      });
      expect(requestUrl).toContain(
        `/projects/${ENCODED_DEFAULT_PROJECT_ID}/issues`,
      );
    });

    it('throws ConflictError when creating feature without defaultProjectId', async () => {
      const client = createGroupClient(undefined, {
        defaultProjectId: null,
      });

      await expect(
        client.addFeature({
          title: 'New Feature',
          description: 'desc',
          author: 'user:default/jdoe',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('caches project_id when fetching single issue by id', async () => {
      const cache = createMockCache();
      seedGroupCache(cache, 1, 789);
      const client = createGroupClient(cache);

      server.use(
        http.get(groupProjectIssueUrl(789, 1), () =>
          HttpResponse.json(makeIssue({ project_id: 789 })),
        ),
        http.get(groupProjectNotesUrl(789, 1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
      );

      await client.getFeatureById('1');
      // Should cache the project_id from the individual issue fetch
      expect(cache.set).toHaveBeenCalledWith('roadmap:issue-project:1', '789', {
        ttl: 300000,
      });
    });

    it('adds a comment using cached project_id', async () => {
      const cache = createMockCache();
      seedGroupCache(cache, 1, 789);
      const client = createGroupClient(cache);

      server.use(
        http.post(groupProjectNotesUrl(789, 1), async ({ request }) => {
          const body = (await request.json()) as Record<string, any>;
          return HttpResponse.json(makeNote({ id: 500, body: body.body }));
        }),
      );

      const comment = await client.addComment({
        featureId: '1',
        text: 'group comment',
        author: 'user:default/alice',
      });
      expect(comment.text).toBe('group comment');
      expect(comment.author).toBe('alice');
    });

    it('toggles vote using cached project_id', async () => {
      const cache = createMockCache();
      seedGroupCache(cache, 1, 789);
      const client = createGroupClient(cache);

      server.use(
        http.get(groupProjectNotesUrl(789, 1), () =>
          HttpResponse.json([], { headers: { 'x-next-page': '' } }),
        ),
        http.post(groupProjectNotesUrl(789, 1), async ({ request }) => {
          const body = (await request.json()) as Record<string, any>;
          return HttpResponse.json(makeNote({ id: 600, body: body.body }));
        }),
      );

      const result = await client.toggleVote('1', 'user:default/bob');
      expect(result.voteAdded).toBe(true);
      expect(result.voteCount).toBe(1);
    });

    it('updates feature status using cached project_id', async () => {
      const cache = createMockCache();
      seedGroupCache(cache, 1, 789);
      const client = createGroupClient(cache);

      server.use(
        http.get(groupProjectIssueUrl(789, 1), () =>
          HttpResponse.json(makeIssue({ project_id: 789 })),
        ),
        http.put(groupProjectIssueUrl(789, 1), () =>
          HttpResponse.json(
            makeIssue({
              project_id: 789,
              labels: ['roadmap', 'roadmap::Planned'],
            }),
          ),
        ),
      );

      const feature = await client.updateFeatureStatus(
        '1',
        FeatureStatus.Planned,
      );
      expect(feature.status).toBe(FeatureStatus.Planned);
    });

    it('returns hasVoted using cached project_id', async () => {
      const cache = createMockCache();
      seedGroupCache(cache, 1, 789);
      cache.store.set('roadmap:votes:1', { alice: 10 });
      const client = createGroupClient(cache);

      expect(await client.hasVoted('1', 'user:default/alice')).toBe(true);
      expect(await client.hasVoted('1', 'user:default/bob')).toBe(false);
    });

    it('returns hasVotedBatch using cached project_id', async () => {
      const cache = createMockCache();
      seedGroupCache(cache, 1, 789);
      seedGroupCache(cache, 2, 789);
      cache.store.set('roadmap:votes:1', { alice: 10 });
      cache.store.set('roadmap:votes:2', { bob: 20 });
      const client = createGroupClient(cache);

      const result = await client.hasVotedBatch(
        ['1', '2'],
        'user:default/alice',
      );
      expect(result).toEqual({ '1': true, '2': false });
    });

    it('returns getVoteCounts using cached project_id', async () => {
      const cache = createMockCache();
      seedGroupCache(cache, 1, 789);
      seedGroupCache(cache, 2, 789);
      cache.store.set('roadmap:votes:1', { alice: 10 });
      cache.store.set('roadmap:votes:2', { alice: 20, bob: 21 });
      const client = createGroupClient(cache);

      const result = await client.getVoteCounts(['1', '2']);
      expect(result).toEqual({ '1': 1, '2': 2 });
    });
  });

  describe('callGitLabApi edge cases', () => {
    it('handles 204 No Content response', async () => {
      const cache = createMockCache();
      seedGroupCache(cache, 1, 789);
      const client = createGroupClient(cache);

      server.use(
        http.get(groupProjectNotesUrl(789, 1), () =>
          HttpResponse.json(
            [makeNote({ id: 700, body: '<!-- vote:alice -->' })],
            { headers: { 'x-next-page': '' } },
          ),
        ),
        http.delete(
          `${groupProjectNotesUrl(789, 1)}/:noteId`,
          () => new HttpResponse(null, { status: 204 }),
        ),
      );

      const result = await client.toggleVote('1', 'user:default/alice');
      expect(result.voteAdded).toBe(false);
      expect(result.voteCount).toBe(0);
    });
  });
});
