import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import {
  NotFoundError,
  ConflictError,
  InputError,
  NotAllowedError,
} from '@backstage/errors';
import {
  Feature,
  NewFeature,
  FeatureStatus,
  Comment,
  NewComment,
  VoteResponse,
  RoadmapBoardConfigResponse,
} from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * API Reference for the Roadmap plugin
 */
export const roadmapApiRef = createApiRef<RoadmapApi>({
  id: 'plugin.roadmap.service',
});

/**
 * Interface for the Roadmap API
 */
export interface RoadmapApi {
  getBoardConfig(): Promise<RoadmapBoardConfigResponse>;

  /**
   * Get features for the board (server-filtered). Database: optional full list.
   */
  getFeatures(options?: {
    includeBeyondRetention?: boolean;
  }): Promise<Feature[]>;

  /**
   * Get a single feature by ID
   */
  getFeatureById(id: string): Promise<Feature>;

  /**
   * Create a new feature
   */
  createFeature(feature: NewFeature): Promise<Feature>;

  /**
   * Update a feature's status
   */
  updateFeatureStatus(id: string, status: FeatureStatus): Promise<Feature>;

  updateFeatureDetails(
    id: string,
    fields: { title?: string; description?: string },
  ): Promise<Feature>;

  deleteFeature(id: string): Promise<void>;

  reorderFeatures(status: FeatureStatus, orderedIds: string[]): Promise<void>;

  deleteComment(commentId: string): Promise<void>;

  /**
   * Get comments for a feature
   */
  getCommentsByFeatureId(featureId: string): Promise<Comment[]>;

  /**
   * Add a comment to a feature
   */
  addComment(comment: NewComment): Promise<Comment>;

  /**
   * Toggle a vote on a feature
   */
  toggleVote(featureId: string): Promise<VoteResponse>;

  /**
   * Get the vote count for a feature
   */
  getVoteCount(featureId: string): Promise<number>;

  /**
   * Get vote counts for multiple features
   */
  getVoteCounts(featureIds: string[]): Promise<Record<string, number>>;

  /**
   * Check if the current user has voted on a feature
   */
  hasVoted(featureId: string): Promise<boolean>;

  /**
   * Check if the current user has voted on multiple features (batch)
   */
  hasVotedBatch(featureIds: string[]): Promise<Record<string, boolean>>;

  /**
   * Check if the current user is a roadmap admin
   */
  isRoadmapAdmin(): Promise<boolean>;
}

/**
 * The backend caps batch vote endpoints at 250 ids per request, so larger
 * boards split their lookups into chunks and merge the results. Chunking here
 * also keeps the query string well below URL length limits.
 */
const BATCH_CHUNK_SIZE = 250;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * API Client implementation for the Roadmap plugin
 */
export class RoadmapApiClient implements RoadmapApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;
  private readonly identityApi: IdentityApi;

  constructor(options: {
    discoveryApi: DiscoveryApi;
    fetchApi: FetchApi;
    identityApi: IdentityApi;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
    this.identityApi = options.identityApi;
  }

  /**
   * Gets the base URL for the roadmap backend
   */
  private async getBaseUrl(): Promise<string> {
    const baseUrl = await this.discoveryApi.getBaseUrl('roadmap');
    return baseUrl;
  }

  /**
   * Makes an authenticated request to the roadmap backend
   */
  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const url = `${baseUrl}${path}`;

    const { token } = await this.identityApi.getCredentials();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await this.fetchApi.fetch(url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const rawBody = await response.text();
      // The backend sends Backstage's standard error envelope, so pull out
      // the human readable message instead of showing serialized JSON
      let errorText = rawBody;
      try {
        const parsed = JSON.parse(rawBody);
        errorText = parsed?.error?.message ?? rawBody;
      } catch {
        // Not JSON, keep the raw text
      }

      // Map HTTP status codes to appropriate Backstage errors
      switch (response.status) {
        case 400:
          throw new InputError(errorText || 'Bad Request');
        case 403:
          throw new NotAllowedError(errorText || 'Not allowed');
        case 404:
          throw new NotFoundError(errorText || 'Resource not found');
        case 409:
          throw new ConflictError(errorText || 'Conflict occurred');
        default:
          throw new Error(
            `${response.status}: ${errorText || 'Unknown error'}`,
          );
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return await response.json();
  }

  async getBoardConfig(): Promise<RoadmapBoardConfigResponse> {
    return this.fetch<RoadmapBoardConfigResponse>('/features/board-config');
  }

  async getFeatures(options?: {
    includeBeyondRetention?: boolean;
  }): Promise<Feature[]> {
    const q =
      options?.includeBeyondRetention === true
        ? '?includeBeyondRetention=true'
        : '';
    return this.fetch<Feature[]>(`/features${q}`);
  }

  async getFeatureById(id: string): Promise<Feature> {
    return this.fetch<Feature>(`/features/${id}`);
  }

  async createFeature(feature: NewFeature): Promise<Feature> {
    return this.fetch<Feature>('/features', {
      method: 'POST',
      body: JSON.stringify(feature),
    });
  }

  async updateFeatureStatus(
    id: string,
    status: FeatureStatus,
  ): Promise<Feature> {
    return this.fetch<Feature>(`/features/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateFeatureDetails(
    id: string,
    fields: { title?: string; description?: string },
  ): Promise<Feature> {
    return this.fetch<Feature>(`/features/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
  }

  async deleteFeature(id: string): Promise<void> {
    await this.fetch<void>(`/features/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderFeatures(
    status: FeatureStatus,
    orderedIds: string[],
  ): Promise<void> {
    await this.fetch<void>('/features/reorder', {
      method: 'PUT',
      body: JSON.stringify({ status, orderedIds }),
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.fetch<void>(`/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async getCommentsByFeatureId(featureId: string): Promise<Comment[]> {
    return this.fetch<Comment[]>(`/comments?featureId=${featureId}`);
  }

  async addComment(comment: NewComment): Promise<Comment> {
    return this.fetch<Comment>('/comments', {
      method: 'POST',
      body: JSON.stringify(comment),
    });
  }

  async toggleVote(featureId: string): Promise<VoteResponse> {
    return this.fetch<VoteResponse>(`/votes/${featureId}`, {
      method: 'POST',
    });
  }

  async getVoteCount(featureId: string): Promise<number> {
    return this.fetch<number>(`/votes/${featureId}/count`);
  }

  async getVoteCounts(featureIds: string[]): Promise<Record<string, number>> {
    if (featureIds.length === 0) {
      return {};
    }
    const results = await Promise.all(
      chunk(featureIds, BATCH_CHUNK_SIZE).map(ids =>
        this.fetch<Record<string, number>>(
          `/votes/counts?ids=${ids.join(',')}`,
        ),
      ),
    );
    return Object.assign({}, ...results);
  }

  async hasVoted(featureId: string): Promise<boolean> {
    return this.fetch<boolean>(`/votes/${featureId}/user`);
  }

  async hasVotedBatch(featureIds: string[]): Promise<Record<string, boolean>> {
    if (featureIds.length === 0) {
      return {};
    }
    const results = await Promise.all(
      chunk(featureIds, BATCH_CHUNK_SIZE).map(ids =>
        this.fetch<Record<string, boolean>>(
          `/votes/user/batch?ids=${ids.join(',')}`,
        ),
      ),
    );
    return Object.assign({}, ...results);
  }

  async isRoadmapAdmin(): Promise<boolean> {
    return this.fetch<boolean>('/permissions/check-admin');
  }
}
