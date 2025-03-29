import { createApiRef } from '@backstage/core-plugin-api';
import {
  Feature,
  Comment,
  NewFeature,
  VoteResponse,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * API Reference for the Roadmap plugin
 */
export const roadmapApiRef = createApiRef<RoadmapApi>({
  id: 'plugin.roadmap.service',
});

/**
 * API for interacting with the Roadmap backend.
 * Provides methods for managing features, comments, votes, and permissions.
 */
export interface RoadmapApi {
  /**
   * Retrieves all features from the roadmap.
   *
   * @returns Promise resolving to an array of features
   * @throws Error if the request fails
   */
  getFeatures(): Promise<Feature[]>;

  /**
   * Adds a new feature to the roadmap.
   *
   * @param feature - The feature to add
   * @returns Promise resolving to the created feature
   * @throws Error if the request fails or validation fails
   */
  addFeature(feature: NewFeature): Promise<Feature>;

  /**
   * Updates the status of a feature.
   * Requires admin permissions.
   *
   * @param id - The ID of the feature to update
   * @param status - The new status
   * @returns Promise resolving to the updated feature
   * @throws Error if the request fails, feature not found, or user lacks permission
   */
  updateFeatureStatus(id: string, status: FeatureStatus): Promise<Feature>;

  /**
   * Retrieves comments for a specific feature.
   *
   * @param featureId - The ID of the feature
   * @returns Promise resolving to an array of comments
   * @throws Error if the request fails or feature not found
   */
  getComments(featureId: string): Promise<Comment[]>;

  /**
   * Adds a comment to a feature.
   *
   * @param featureId - The ID of the feature
   * @param comment - The comment text
   * @returns Promise resolving to the created comment
   * @throws Error if the request fails, feature not found, or validation fails
   */
  addComment(featureId: string, comment: string): Promise<Comment>;

  /**
   * Toggles a vote on a feature for the current user.
   *
   * @param featureId - The ID of the feature
   * @returns Promise resolving to the vote response with updated count and status
   * @throws Error if the request fails or feature not found
   */
  toggleVote(featureId: string): Promise<VoteResponse>;

  /**
   * Gets the vote count for a specific feature.
   *
   * @param featureId - The ID of the feature
   * @returns Promise resolving to the vote count
   * @throws Error if the request fails or feature not found
   */
  getVoteCount(featureId: string): Promise<number>;

  /**
   * Gets vote counts for multiple features at once.
   *
   * @param featureIds - Array of feature IDs
   * @returns Promise resolving to an object mapping feature IDs to vote counts
   * @throws Error if the request fails
   */
  getVoteCounts(featureIds: string[]): Promise<Record<string, number>>;

  /**
   * Checks if the current user has admin permissions.
   *
   * @returns Promise resolving to a boolean indicating admin status
   * @throws Error if the request fails
   */
  checkAdminPermission(): Promise<boolean>;

  /**
   * Checks if the current user has voted on a feature.
   *
   * @param featureId - The ID of the feature
   * @returns Promise resolving to a boolean indicating if the user has voted
   * @throws Error if the request fails or feature not found
   */
  hasUserVoted(featureId: string): Promise<boolean>;
}
