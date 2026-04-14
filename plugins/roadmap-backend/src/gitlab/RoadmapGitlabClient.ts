import {
  NewComment,
  Comment,
  NewFeature,
  Feature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapDatasource } from '../types';
import {
  NotFoundError,
  ConflictError,
  NotAllowedError,
} from '@backstage/errors';
import { CacheService, LoggerService } from '@backstage/backend-plugin-api';
import { GitlabConfig } from '../types';
import { parseEntityRef } from '@backstage/catalog-model';

const ROADMAP_LABEL = 'roadmap';
const ROADMAP_SCOPE_LABEL = `${ROADMAP_LABEL}::`;
const STATUS_LABELS = Object.values(FeatureStatus).map(
  status => `${ROADMAP_SCOPE_LABEL}${status}`,
);
const PAGINATION = 'per_page=100';

const AUTHOR_TAG_RE = /^<!-- author:(\S+) -->\n/;
const VOTE_TAG_RE = /^<!-- vote:(\S+) -->$/;

interface GitLabIssue {
  iid: number;
  title: string;
  description?: string;
  labels?: string[];
  upvotes?: number;
  author?: { username: string };
  created_at: string;
  updated_at: string;
}

interface GitLabNote {
  id: number;
  body?: string;
  system?: boolean;
  author?: { username: string };
  created_at: string;
  updated_at: string;
}

function formatStatusAsGitLabLabel(status: FeatureStatus): string {
  return `${ROADMAP_SCOPE_LABEL}${status}`;
}

function extractStatusFromLabels(labels: string[]): FeatureStatus {
  const match = labels.find(l => STATUS_LABELS.includes(l));
  if (!match) return FeatureStatus.Suggested;
  return match.replace(ROADMAP_SCOPE_LABEL, '') as FeatureStatus;
}

function replaceStatusLabels(
  labels: string[],
  newStatus: FeatureStatus,
): string[] {
  const cleaned = labels.filter(l => !STATUS_LABELS.includes(l));
  if (!cleaned.includes(ROADMAP_LABEL)) cleaned.push(ROADMAP_LABEL);
  cleaned.push(formatStatusAsGitLabLabel(newStatus));
  return cleaned;
}

function formatIsoDateForStorage(isoDate: string): string {
  return isoDate.replace('T', ' ').replace(/\.\d+Z$/, '');
}

function mapGitLabIssueToFeature(
  issue: GitLabIssue,
  voteCount?: number,
): Feature {
  return {
    id: String(issue.iid),
    title: issue.title,
    description: issue.description ?? '',
    status: extractStatusFromLabels(issue.labels ?? []),
    votes: voteCount ?? issue.upvotes ?? 0,
    author: issue.author?.username ?? '',
    created_at: formatIsoDateForStorage(issue.created_at),
    updated_at: formatIsoDateForStorage(issue.updated_at),
  };
}

function mapGitLabNoteToComment(note: GitLabNote, featureId: string): Comment {
  const body = note.body ?? '';
  const authorMatch = body.match(AUTHOR_TAG_RE);
  return {
    id: String(note.id),
    author: authorMatch ? authorMatch[1] : note.author?.username ?? '',
    featureId,
    text: authorMatch ? body.replace(AUTHOR_TAG_RE, '') : body,
    created_at: formatIsoDateForStorage(note.created_at),
    updated_at: formatIsoDateForStorage(note.updated_at),
  };
}

function isHiddenVoteMarker(body: string): boolean {
  return VOTE_TAG_RE.test(body?.trim());
}

function isUserComment(note: GitLabNote): boolean {
  return !note.system && !isHiddenVoteMarker(note.body ?? '');
}

function sanitizeLog(value: string): string {
  return value.replace(/[\r\n]/g, '');
}

function parseUsernameFromEntityRef(userEntityRef: string): string {
  const entity = parseEntityRef(userEntityRef);
  return entity.name;
}

function buildAuthorTaggedBody(username: string, text: string): string {
  return `<!-- author:${username} -->\n${text}`;
}

function buildVoteMarker(username: string): string {
  return `<!-- vote:${username} -->`;
}

function convertIssuesToFeatures(
  issues: GitLabIssue[],
  voteCounts?: Record<string, number>,
): Feature[] {
  return issues.map(issue =>
    mapGitLabIssueToFeature(issue, voteCounts?.[String(issue.iid)]),
  );
}

function convertNotesToComments(
  notes: GitLabNote[],
  featureId: string,
): Comment[] {
  return notes.map(n => mapGitLabNoteToComment(n, featureId));
}

function filterUserComments(notes: GitLabNote[]): GitLabNote[] {
  return notes.filter(isUserComment);
}

function buildCommentBody(comment: NewComment): string {
  const author = comment.author
    ? parseUsernameFromEntityRef(comment.author)
    : undefined;
  return author ? buildAuthorTaggedBody(author, comment.text) : comment.text;
}

function buildNewRoadmapIssuePayload(feature: NewFeature): string {
  return JSON.stringify({
    title: feature.title,
    description: feature.description,
    labels: `${ROADMAP_LABEL},${formatStatusAsGitLabLabel(
      FeatureStatus.Suggested,
    )}`,
  });
}

const VOTE_CACHE_TTL_MS = 30_000; // 30 seconds

function voteCacheKey(featureId: string): string {
  return `roadmap:votes:${featureId}`;
}

function voteMapToJson(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries(map);
}

function jsonToVoteMap(json: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(json));
}

export class RoadmapGitlabClient implements RoadmapDatasource {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly projectId: string;
  private readonly logger: LoggerService;
  private readonly cache: CacheService;

  private async getCachedVotes(
    featureId: string,
  ): Promise<Map<string, number> | undefined> {
    const cached = await this.cache.get<Record<string, number>>(
      voteCacheKey(featureId),
    );
    return cached ? jsonToVoteMap(cached) : undefined;
  }

  private async setCachedVotes(
    featureId: string,
    data: Map<string, number>,
  ): Promise<void> {
    await this.cache.set(voteCacheKey(featureId), voteMapToJson(data), {
      ttl: VOTE_CACHE_TTL_MS,
    });
  }

  private async invalidateCachedVotes(featureId: string): Promise<void> {
    await this.cache.delete(voteCacheKey(featureId));
  }

  static create(options: {
    gitlab: GitlabConfig;
    logger: LoggerService;
    cache: CacheService;
  }): RoadmapGitlabClient {
    const { gitlab, logger, cache } = options;
    return new RoadmapGitlabClient(
      gitlab.apiBaseUrl,
      gitlab.token,
      gitlab.projectId,
      logger,
      cache,
    );
  }

  private constructor(
    baseUrl: string,
    token: string,
    projectId: string,
    logger: LoggerService,
    cache: CacheService,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
    this.projectId = encodeURIComponent(projectId);
    this.logger = logger;
    this.cache = cache;
  }

  private projectApiUrl(path: string): string {
    return `${this.baseUrl}/projects/${this.projectId}${path}`;
  }

  private authHeaders(): Record<string, string> {
    return {
      'PRIVATE-TOKEN': this.token,
      'Content-Type': 'application/json',
    };
  }

  private async callGitLabApi<T>(
    url: string,
    init?: { method?: string; body?: string },
  ): Promise<{ data: T; res: Response }> {
    const method = init?.method ?? 'GET';
    this.logger.debug(`GitLab API request: ${method} ${sanitizeLog(url)}`);
    const res = await fetch(url, { ...init, headers: this.authHeaders() });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `GitLab API error: ${res.status} ${sanitizeLog(text)} (${sanitizeLog(
          url,
        )})`,
      );
      if (res.status === 401)
        throw new NotAllowedError(
          'GitLab API authentication failed: token is missing or invalid',
        );
      if (res.status === 404) throw new NotFoundError(text);
      throw new ConflictError(`GitLab API error: ${res.status}`);
    }
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return { data: undefined as T, res };
    }
    const data = (await res.json()) as T;
    return { data, res };
  }

  private async fetchAllPages<T>(url: string): Promise<T[]> {
    const results: T[] = [];
    let nextUrl: string | undefined = url;
    while (nextUrl) {
      const { data, res } = await this.callGitLabApi<T[]>(nextUrl);
      results.push(...data);
      const nextPage = res.headers.get('x-next-page');
      if (nextPage) {
        const parsed: URL = new URL(nextUrl);
        parsed.searchParams.set('page', nextPage);
        nextUrl = parsed.toString();
      } else {
        nextUrl = undefined;
      }
    }
    return results;
  }

  private async fetchAllRoadmapIssues(): Promise<GitLabIssue[]> {
    return this.fetchAllPages<GitLabIssue>(this.roadmapIssuesUrl('desc'));
  }

  private async fetchIssueById(id: string): Promise<GitLabIssue> {
    const { data } = await this.callGitLabApi<GitLabIssue>(
      this.projectApiUrl(`/issues/${id}`),
    );
    return data;
  }

  private async createRoadmapIssue(feature: NewFeature): Promise<GitLabIssue> {
    const { data } = await this.callGitLabApi<GitLabIssue>(
      this.projectApiUrl('/issues'),
      {
        method: 'POST',
        body: buildNewRoadmapIssuePayload(feature),
      },
    );
    return data;
  }

  private async updateIssueLabels(
    id: string,
    labels: string[],
  ): Promise<GitLabIssue> {
    const { data } = await this.callGitLabApi<GitLabIssue>(
      this.projectApiUrl(`/issues/${id}`),
      { method: 'PUT', body: JSON.stringify({ labels: labels.join(',') }) },
    );
    return data;
  }

  private async fetchIssueNotes(
    featureId: string,
    sort: 'asc' | 'desc' = 'desc',
  ): Promise<GitLabNote[]> {
    return this.fetchAllPages<GitLabNote>(
      this.projectApiUrl(
        `/issues/${featureId}/notes?sort=${sort}&order_by=created_at&${PAGINATION}`,
      ),
    );
  }

  private async collectVoteMarkersByUser(
    featureId: string,
  ): Promise<Map<string, number>> {
    const notes = await this.fetchIssueNotes(featureId, 'asc');
    const votesByUser = new Map<string, number>();
    for (const note of notes) {
      if (note.system) continue;
      const match = (note.body ?? '').trim().match(VOTE_TAG_RE);
      if (match) votesByUser.set(match[1], note.id);
    }
    return votesByUser;
  }

  private async deleteNote(featureId: string, noteId: number): Promise<void> {
    await this.callGitLabApi<void>(
      this.projectApiUrl(`/issues/${featureId}/notes/${noteId}`),
      { method: 'DELETE' },
    );
  }

  private async createNote(
    featureId: string,
    body: string,
  ): Promise<GitLabNote> {
    const { data } = await this.callGitLabApi<GitLabNote>(
      this.projectApiUrl(`/issues/${featureId}/notes`),
      { method: 'POST', body: JSON.stringify({ body }) },
    );
    return data;
  }

  private async ensureFeatureExists(featureId: string): Promise<void> {
    await this.fetchIssueById(featureId);
  }

  private async removeVote(
    featureId: string,
    noteId: number,
    votesByUser: Map<string, number>,
    username: string,
  ): Promise<void> {
    await this.deleteNote(featureId, noteId);
    votesByUser.delete(username);
  }

  private async addVote(
    featureId: string,
    votesByUser: Map<string, number>,
    username: string,
  ): Promise<void> {
    await this.createNote(featureId, buildVoteMarker(username));
    votesByUser.set(username, 0);
  }

  private async getOrFetchVotes(
    featureId: string,
  ): Promise<Map<string, number>> {
    const cached = await this.getCachedVotes(featureId);
    if (cached) return cached;
    const votes = await this.collectVoteMarkersByUser(featureId);
    await this.setCachedVotes(featureId, votes);
    return votes;
  }

  private async collectAllVoteCounts(
    issues: GitLabIssue[],
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    await Promise.all(
      issues.map(async issue => {
        const id = String(issue.iid);
        const votes = await this.getOrFetchVotes(id);
        counts[id] = votes.size;
      }),
    );
    return counts;
  }

  private roadmapIssuesUrl(sort: 'asc' | 'desc' = 'desc'): string {
    return this.projectApiUrl(
      `/issues?labels=${ROADMAP_LABEL}&${PAGINATION}&order_by=created_at&sort=${sort}`,
    );
  }

  async addComment(comment: NewComment): Promise<Comment> {
    const body = buildCommentBody(comment);
    const gitlabNote = await this.createNote(comment.featureId, body);
    return mapGitLabNoteToComment(gitlabNote, comment.featureId);
  }

  async getCommentsByFeatureId(featureId: string): Promise<Comment[]> {
    await this.ensureFeatureExists(featureId);
    const allNotes = await this.fetchIssueNotes(featureId, 'desc');
    const commentNotes = filterUserComments(allNotes);
    return convertNotesToComments(commentNotes, featureId);
  }

  async addFeature(feature: NewFeature & { author: string }): Promise<Feature> {
    const gitlabIssue = await this.createRoadmapIssue(feature);
    return mapGitLabIssueToFeature(gitlabIssue);
  }

  async getAllFeatures(): Promise<Feature[]> {
    this.logger.info('Fetching all roadmap features from GitLab');
    const gitlabIssues = await this.fetchAllRoadmapIssues();
    const voteCounts = await this.collectAllVoteCounts(gitlabIssues);
    return convertIssuesToFeatures(gitlabIssues, voteCounts);
  }

  async getFeatureById(id: string): Promise<Feature> {
    const gitlabIssue = await this.fetchIssueById(id);
    const voteCount = await this.getVoteCount(id);
    return mapGitLabIssueToFeature(gitlabIssue, voteCount);
  }

  async updateFeatureStatus(
    id: string,
    status: FeatureStatus,
  ): Promise<Feature> {
    const existingIssue = await this.fetchIssueById(id);
    const updatedLabels = replaceStatusLabels(
      existingIssue.labels ?? [],
      status,
    );
    const updatedIssue = await this.updateIssueLabels(id, updatedLabels);
    return mapGitLabIssueToFeature(updatedIssue);
  }

  async toggleVote(
    featureId: string,
    voter: string,
  ): Promise<{ voteAdded: boolean; voteCount: number }> {
    await this.invalidateCachedVotes(featureId);
    const username = parseUsernameFromEntityRef(voter);
    const votesByUser = await this.collectVoteMarkersByUser(featureId);
    const existingNoteId = votesByUser.get(username);

    if (existingNoteId) {
      await this.removeVote(featureId, existingNoteId, votesByUser, username);
    } else {
      await this.addVote(featureId, votesByUser, username);
    }

    await this.setCachedVotes(featureId, votesByUser);
    return { voteAdded: !existingNoteId, voteCount: votesByUser.size };
  }

  async getVoteCount(featureId: string): Promise<number> {
    const votes = await this.getOrFetchVotes(featureId);
    return votes.size;
  }

  async getVoteCounts(featureIds: string[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const id of featureIds) {
      counts[id] = await this.getVoteCount(id);
    }
    return counts;
  }

  async hasVoted(featureId: string, voter: string): Promise<boolean> {
    const username = parseUsernameFromEntityRef(voter);
    const votes = await this.getOrFetchVotes(featureId);
    return votes.has(username);
  }

  async hasVotedBatch(
    featureIds: string[],
    voter: string,
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const id of featureIds) {
      results[id] = await this.hasVoted(id, voter);
    }
    return results;
  }
}
