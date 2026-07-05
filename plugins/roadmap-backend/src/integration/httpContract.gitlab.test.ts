import { mockServices } from '@backstage/backend-test-utils';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { ConfigReader } from '@backstage/config';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { CacheService } from '@backstage/backend-plugin-api';
import { RoadmapGitlabClient } from '../gitlab/RoadmapGitlabClient';
import { getBoardConfigResponse, getMergedBoardColumns } from '../boardConfig';
import { createRouter, RouterOptions } from '../routes/router';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const PROJECT_ID = '123';

const mockCredentials = {
  principal: { type: 'user' },
  $$type: '@backstage/BackstageCredentials',
};

interface FakeIssue {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  labels: string[];
  author: { username: string };
  created_at: string;
  updated_at: string;
}

interface FakeNote {
  id: number;
  body: string;
  system: boolean;
  author: { username: string };
  created_at: string;
  updated_at: string;
}

/**
 * Stateful fake GitLab API covering the endpoints RoadmapGitlabClient uses.
 * Unlike the unit tests (which stub responses per call), this keeps real
 * issue/note state so a full lifecycle exercises the same request sequences
 * a live GitLab instance would see.
 */
function createFakeGitlab() {
  const issues: FakeIssue[] = [];
  const notesByIid = new Map<number, FakeNote[]>();
  let nextId = 1000;
  let nextNoteId = 5000;

  const app = express();
  app.use(express.json());

  const base = `/projects/${PROJECT_ID}`;

  app.get(`${base}/issues`, (req, res) => {
    if (req.query.labels === 'roadmap') {
      res.json(issues.filter(i => i.labels.includes('roadmap')));
      return;
    }
    res.json(issues);
  });

  app.post(`${base}/issues`, (req, res) => {
    const now = new Date().toISOString();
    const issue: FakeIssue = {
      id: nextId,
      iid: nextId,
      project_id: Number(PROJECT_ID),
      title: req.body.title,
      description: req.body.description ?? '',
      labels: String(req.body.labels ?? '')
        .split(',')
        .filter(Boolean),
      author: { username: 'roadmap-bot' },
      created_at: now,
      updated_at: now,
    };
    nextId += 1;
    issues.push(issue);
    notesByIid.set(issue.iid, []);
    res.status(201).json(issue);
  });

  app.get(`${base}/issues/:iid`, (req, res) => {
    const issue = issues.find(i => i.iid === Number(req.params.iid));
    if (!issue) {
      res.status(404).json({ message: '404 Issue Not Found' });
      return;
    }
    res.json(issue);
  });

  app.put(`${base}/issues/:iid`, (req, res) => {
    const issue = issues.find(i => i.iid === Number(req.params.iid));
    if (!issue) {
      res.status(404).json({ message: '404 Issue Not Found' });
      return;
    }
    if (typeof req.body.labels === 'string') {
      issue.labels = req.body.labels.split(',').filter(Boolean);
    }
    issue.updated_at = new Date().toISOString();
    res.json(issue);
  });

  app.get(`${base}/issues/:iid/notes`, (req, res) => {
    const notes = notesByIid.get(Number(req.params.iid));
    if (!notes) {
      res.status(404).json({ message: '404 Issue Not Found' });
      return;
    }
    res.json(notes);
  });

  app.post(`${base}/issues/:iid/notes`, (req, res) => {
    const notes = notesByIid.get(Number(req.params.iid));
    if (!notes) {
      res.status(404).json({ message: '404 Issue Not Found' });
      return;
    }
    const now = new Date().toISOString();
    const note: FakeNote = {
      id: nextNoteId,
      body: req.body.body ?? '',
      system: false,
      author: { username: 'roadmap-bot' },
      created_at: now,
      updated_at: now,
    };
    nextNoteId += 1;
    notes.push(note);
    res.status(201).json(note);
  });

  app.delete(`${base}/issues/:iid/notes/:noteId`, (req, res) => {
    const notes = notesByIid.get(Number(req.params.iid));
    if (!notes) {
      res.status(404).json({ message: '404 Issue Not Found' });
      return;
    }
    const idx = notes.findIndex(n => n.id === Number(req.params.noteId));
    if (idx === -1) {
      res.status(404).json({ message: '404 Note Not Found' });
      return;
    }
    notes.splice(idx, 1);
    res.status(204).end();
  });

  return { app, issues, notesByIid };
}

function createMapCache(): CacheService {
  const store = new Map<string, any>();
  return {
    get: async (key: string) => store.get(key),
    set: async (key: string, value: any) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    withOptions: () => createMapCache(),
  } as unknown as CacheService;
}

/**
 * Full-stack contract test for GitLab mode: the real plugin router and the
 * real RoadmapGitlabClient talking to a stateful fake GitLab API over HTTP.
 * Asserts both what roadmap API consumers receive and what actually lands
 * in GitLab (labels, notes, vote markers).
 */
describe('HTTP contract (gitlab mode, fake GitLab API)', () => {
  let gitlabServer: http.Server;
  let roadmapServer: http.Server;
  let baseUrl: string;
  let fake: ReturnType<typeof createFakeGitlab>;

  beforeAll(async () => {
    fake = createFakeGitlab();
    const gitlabBaseUrl = await new Promise<string>(resolve => {
      gitlabServer = http.createServer(fake.app);
      gitlabServer.listen(0, () => {
        const { port } = gitlabServer.address() as AddressInfo;
        resolve(`http://localhost:${port}`);
      });
    });

    const cfg = new ConfigReader({
      roadmap: {
        source: 'gitlab',
        adminUsers: ['user:default/admin'],
        gitlab: {
          apiBaseUrl: gitlabBaseUrl,
          token: 'fake-token',
          projectId: PROJECT_ID,
        },
      },
    });

    const logger = mockServices.logger.mock();
    const cache = createMapCache();
    const gitlabClient = RoadmapGitlabClient.create({
      gitlab: {
        apiBaseUrl: gitlabBaseUrl,
        token: 'fake-token',
        projectId: PROJECT_ID,
      },
      logger,
      cache,
    });

    const httpAuth = mockServices.httpAuth.mock();
    (httpAuth.credentials as jest.Mock).mockResolvedValue(mockCredentials);
    const options: RouterOptions = {
      logger,
      config: cfg,
      db: gitlabClient,
      httpAuth,
      userInfo: mockServices.userInfo({
        userEntityRef: 'user:default/admin',
      }),
      cache,
      datasource: 'gitlab',
      boardColumns: getMergedBoardColumns(cfg),
      boardConfigResponse: getBoardConfigResponse(cfg, 'gitlab'),
    };

    const app = express();
    app.use(await createRouter(options));

    await new Promise<void>(resolve => {
      roadmapServer = http.createServer(app);
      roadmapServer.listen(0, () => {
        const { port } = roadmapServer.address() as AddressInfo;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => roadmapServer.close(() => resolve()));
    await new Promise<void>(resolve => gitlabServer.close(() => resolve()));
  });

  it('serves the full feature lifecycle backed by GitLab issues', async () => {
    // Create: becomes a GitLab issue with the roadmap + status labels
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
    });
    expect(created.createdAt).toMatch(ISO_UTC);
    expect(created.updatedAt).toMatch(ISO_UTC);
    expect(created).not.toHaveProperty('created_at');

    expect(fake.issues).toHaveLength(1);
    expect(fake.issues[0].labels).toEqual(
      expect.arrayContaining(['roadmap', 'roadmap::Suggested']),
    );

    // List: goes through the group/project issue listing + vote counting
    const listRes = await fetch(`${baseUrl}/features`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
    expect(list[0].votes).toBe(0);

    // Status change: swaps the scoped status label on the issue
    const statusRes = await fetch(`${baseUrl}/features/${created.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: FeatureStatus.Planned }),
    });
    expect(statusRes.status).toBe(200);
    const moved = await statusRes.json();
    expect(moved.status).toBe(FeatureStatus.Planned);
    expect(fake.issues[0].labels).toContain('roadmap::Planned');
    expect(fake.issues[0].labels).not.toContain('roadmap::Suggested');

    // Vote: stored as a hidden marker note on the issue
    const voteRes = await fetch(`${baseUrl}/votes/${created.id}`, {
      method: 'POST',
    });
    expect(voteRes.status).toBe(200);
    expect(await voteRes.json()).toEqual({ voteAdded: true, voteCount: 1 });
    const iid = fake.issues[0].iid;
    expect(
      fake.notesByIid.get(iid)!.filter(n => n.body.includes('<!-- vote:')),
    ).toHaveLength(1);

    // Comment: a regular note, tagged with the real author
    const commentRes = await fetch(`${baseUrl}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featureId: created.id, text: 'Nice' }),
    });
    expect(commentRes.status).toBe(201);
    const comment = await commentRes.json();
    expect(comment.featureId).toBe(created.id);
    expect(comment.text).toBe('Nice');
    expect(comment.author).toBe('admin');
    expect(comment.createdAt).toMatch(ISO_UTC);

    // Listing comments must exclude the hidden vote marker note
    const commentsRes = await fetch(
      `${baseUrl}/comments?featureId=${created.id}`,
    );
    expect(commentsRes.status).toBe(200);
    const comments = await commentsRes.json();
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe('Nice');

    // Toggling the vote again removes the marker note
    const unvoteRes = await fetch(`${baseUrl}/votes/${created.id}`, {
      method: 'POST',
    });
    expect(await unvoteRes.json()).toEqual({ voteAdded: false, voteCount: 0 });
    expect(
      fake.notesByIid.get(iid)!.filter(n => n.body.includes('<!-- vote:')),
    ).toHaveLength(0);
  });

  it('maps a missing GitLab issue to a 404 for API consumers', async () => {
    const res = await fetch(`${baseUrl}/features/999999`);
    expect(res.status).toBe(404);
  });
});
