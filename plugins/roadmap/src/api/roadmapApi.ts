import {
  createApiRef,
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

export const roadmapApiRef = createApiRef<RoadmapApi>({
  id: 'plugin.roadmap.service',
});

export interface RoadmapApi {
  getFeatures(): Promise<Feature[]>;
  addFeature(feature: NewFeature): Promise<Feature>;
  updateFeatureStatus(id: string, status: FeatureStatus): Promise<Feature>;
  getComments(featureId: string): Promise<Comment[]>;
  addComment(featureId: string, comment: string): Promise<Comment>;
  toggleVote(featureId: string): Promise<VoteResponse>;
  getVoteCount(featureId: string): Promise<number>;
  getVoteCounts(featureIds: string[]): Promise<Record<string, number>>;
  checkAdminPermission(): Promise<boolean>;
}

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

  private async getBaseUrl() {
    return await this.discoveryApi.getBaseUrl('roadmap');
  }

  async getFeatures(): Promise<Feature[]> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/features`);

    if (!response.ok) {
      throw new Error(`Failed to fetch features: ${response.statusText}`);
    }
    return await response.json();
  }

  async addFeature(feature: NewFeature): Promise<Feature> {
    const baseUrl = await this.getBaseUrl();

    const response = await this.fetchApi.fetch(`${baseUrl}/features`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feature),
    });
    if (!response.ok) {
      throw new Error(`Failed to add feature: ${response.statusText}`);
    }
    return await response.json();
  }

  async updateFeatureStatus(
    id: string,
    status: Feature['status'],
  ): Promise<Feature> {
    const baseUrl = await this.getBaseUrl();
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
    if (!response.ok) {
      throw new Error(
        `Failed to update feature status: ${response.statusText}`,
      );
    }
    return await response.json();
  }

  async getComments(featureId: string): Promise<Comment[]> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/comments?featureId=${featureId}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }
    return await response.json();
  }

  async addComment(featureId: string, comment: string): Promise<Comment> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(`${baseUrl}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ featureId, text: comment }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add comment: ${response.statusText}`);
    }

    const data = await response.json();
    const commentData = data.result;

    return {
      id: commentData.id,
      featureId,
      text: commentData.text,
      author: commentData.author,
      createdAt: commentData.createdAt,
    } as Comment;
  }

  async toggleVote(featureId: string): Promise<VoteResponse> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/votes/${featureId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to toggle vote: ${response.statusText}`);
    }
    return await response.json();
  }

  async getVoteCount(featureId: string): Promise<number> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/votes/${featureId}/count`,
    );
    if (!response.ok) {
      throw new Error(`Failed to get vote count: ${response.statusText}`);
    }
    const data = await response.json();
    return data.count;
  }

  async getVoteCounts(featureIds: string[]): Promise<Record<string, number>> {
    const baseUrl = await this.getBaseUrl();
    const params = new URLSearchParams({ ids: featureIds.join(',') });
    const url = `${baseUrl}/votes/counts?${params}`;
    const response = await this.fetchApi.fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get vote counts: ${response.statusText}`);
    }
    return await response.json();
  }

  async checkAdminPermission(): Promise<boolean> {
    const baseUrl = await this.getBaseUrl();
    const { token } = await this.identityApi.getCredentials();
    const response = await this.fetchApi.fetch(
      `${baseUrl}/permissions/check-admin`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Failed to check admin permission: ${response.statusText}`,
      );
    }
    const { isAdmin } = await response.json();
    return isAdmin;
  }
}
