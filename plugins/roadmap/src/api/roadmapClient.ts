import {
  DiscoveryApi,
  FetchApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import {
  Feature,
  Comment,
  NewFeature,
  VoteResponse,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapApi } from './types';
import { NotFoundError, ResponseError } from '@backstage/errors';

/**
 * Implementation of the RoadmapApi using the Backstage framework
 */
export class RoadmapApiClient implements RoadmapApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;
  private baseUrlPromise: Promise<string>;

  constructor(options: {
    discoveryApi: DiscoveryApi;
    fetchApi: FetchApi;
    identityApi: IdentityApi;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;

    // Initialize the base URL promise once
    this.baseUrlPromise = this.discoveryApi.getBaseUrl('roadmap');
  }

  /**
   * Helper method to handle API responses and errors consistently
   */
  private async handleResponse<T>(
    response: Response,
    errorMessage: string,
  ): Promise<T> {
    if (!response.ok) {
      const error = ResponseError.fromResponse(response);

      // Map specific HTTP status codes to appropriate error types
      if (response.status === 404) {
        throw new NotFoundError(errorMessage);
      }

      throw error;
    }

    return (await response.json()) as T;
  }

  async getFeatures(): Promise<Feature[]> {
    const baseUrl = await this.baseUrlPromise;
    const response = await this.fetchApi.fetch(`${baseUrl}/features`);
    return this.handleResponse<Feature[]>(response, 'Failed to fetch features');
  }

  async addFeature(feature: NewFeature): Promise<Feature> {
    const baseUrl = await this.baseUrlPromise;
    const response = await this.fetchApi.fetch(`${baseUrl}/features`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feature),
    });

    return this.handleResponse<Feature>(response, 'Failed to add feature');
  }

  async updateFeatureStatus(
    id: string,
    status: FeatureStatus,
  ): Promise<Feature> {
    const baseUrl = await this.baseUrlPromise;
    const response = await this.fetchApi.fetch(
      `${baseUrl}/features/${id}/status`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      },
    );

    return this.handleResponse<Feature>(
      response,
      `Failed to update status for feature ${id}`,
    );
  }

  async getComments(featureId: string): Promise<Comment[]> {
    const baseUrl = await this.baseUrlPromise;
    const response = await this.fetchApi.fetch(
      `${baseUrl}/comments?featureId=${featureId}`,
    );

    return this.handleResponse<Comment[]>(
      response,
      `Failed to fetch comments for feature ${featureId}`,
    );
  }

  async addComment(featureId: string, comment: string): Promise<Comment> {
    const baseUrl = await this.baseUrlPromise;
    const response = await this.fetchApi.fetch(`${baseUrl}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ featureId, text: comment }),
    });

    return this.handleResponse<Comment>(response, 'Failed to add comment');
  }

  async toggleVote(featureId: string): Promise<VoteResponse> {
    const baseUrl = await this.baseUrlPromise;
    const response = await this.fetchApi.fetch(
      `${baseUrl}/votes/${featureId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    return this.handleResponse<VoteResponse>(
      response,
      `Failed to toggle vote for feature ${featureId}`,
    );
  }

  async getVoteCount(featureId: string): Promise<number> {
    const baseUrl = await this.baseUrlPromise;
    const response = await this.fetchApi.fetch(
      `${baseUrl}/votes/${featureId}/count`,
    );

    return this.handleResponse<number>(
      response,
      `Failed to get vote count for feature ${featureId}`,
    );
  }

  async getVoteCounts(featureIds: string[]): Promise<Record<string, number>> {
    if (featureIds.length === 0) {
      return {};
    }

    const baseUrl = await this.baseUrlPromise;
    const params = new URLSearchParams({ ids: featureIds.join(',') });
    const url = `${baseUrl}/votes/counts?${params}`;
    const response = await this.fetchApi.fetch(url);

    return this.handleResponse<Record<string, number>>(
      response,
      'Failed to get vote counts',
    );
  }

  async hasUserVoted(featureId: string): Promise<boolean> {
    const baseUrl = await this.baseUrlPromise;
    const response = await this.fetchApi.fetch(
      `${baseUrl}/votes/${featureId}/user`,
    );

    return this.handleResponse<boolean>(
      response,
      `Failed to check if user voted on feature ${featureId}`,
    );
  }

  async checkAdminPermission(): Promise<boolean> {
    const baseUrl = await this.baseUrlPromise;
    const response = await this.fetchApi.fetch(
      `${baseUrl}/permissions/check-admin`,
    );

    return this.handleResponse<boolean>(
      response,
      'Failed to check admin permission',
    );
  }
}
