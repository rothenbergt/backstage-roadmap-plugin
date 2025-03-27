import {
  Feature,
  NewFeature,
  FeatureStatus,
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * Interface for the Roadmap database operations
 */
export interface RoadmapDatabase {
  /**
   * Sets up the database schema
   */
  setupSchema(): Promise<void>;

  /**
   * Add a comment to a feature
   *
   * @param comment - The comment to add
   * @returns The created comment
   */
  addComment(comment: NewComment): Promise<Comment>;

  /**
   * Get all comments for a feature
   *
   * @param featureId - The ID of the feature
   * @returns Array of comments
   */
  getCommentsByFeatureId(featureId: string): Promise<Comment[]>;

  /**
   * Add a new feature
   *
   * @param feature - The feature to add
   * @returns The created feature
   */
  addFeature(feature: NewFeature & { author: string }): Promise<Feature>;

  /**
   * Get all features
   *
   * @returns Array of all features
   */
  getAllFeatures(): Promise<Feature[]>;

  /**
   * Update the status of a feature
   *
   * @param id - The ID of the feature
   * @param status - The new status
   * @returns The updated feature
   */
  updateFeatureStatus(id: string, status: FeatureStatus): Promise<Feature>;

  /**
   * Toggle a vote on a feature
   *
   * @param featureId - The ID of the feature
   * @param voter - The user voting
   * @returns Boolean indicating if the vote was added (true) or removed (false)
   */
  toggleVote(featureId: string, voter: string): Promise<boolean>;

  /**
   * Get the vote count for a feature
   *
   * @param featureId - The ID of the feature
   * @returns The number of votes
   */
  getVoteCount(featureId: string): Promise<number>;

  /**
   * Get vote counts for multiple features
   *
   * @param featureIds - Array of feature IDs
   * @returns Object mapping feature IDs to vote counts
   */
  getVoteCounts(featureIds: string[]): Promise<Record<string, number>>;

  /**
   * Check if a user has voted on a feature
   *
   * @param featureId - The ID of the feature
   * @param voter - The user
   * @returns Boolean indicating if the user has voted
   */
  hasVoted(featureId: string, voter: string): Promise<boolean>;
}
