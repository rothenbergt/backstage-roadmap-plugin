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
   * Add a comment to a feature
   *
   * @param comment - The comment to add
   * @returns The created comment
   * @throws {NotFoundError} When the referenced feature does not exist
   * @throws {ConflictError} When the database operation fails
   */
  addComment(comment: NewComment): Promise<Comment>;

  /**
   * Get all comments for a feature
   *
   * @param featureId - The ID of the feature
   * @returns Array of comments
   * @throws {NotFoundError} When the feature does not exist
   * @throws {ConflictError} When the database operation fails
   */
  getCommentsByFeatureId(featureId: string): Promise<Comment[]>;

  /**
   * Add a new feature
   *
   * @param feature - The feature to add
   * @returns The created feature
   * @throws {ConflictError} When the database operation fails
   */
  addFeature(feature: NewFeature & { author: string }): Promise<Feature>;

  /**
   * Get all features
   *
   * @returns Array of all features
   * @throws {ConflictError} When the database operation fails
   */
  getAllFeatures(): Promise<Feature[]>;

  /**
   * Get a feature by its ID
   *
   * @param id - The ID of the feature
   * @returns The feature
   * @throws {NotFoundError} When the feature does not exist
   * @throws {ConflictError} When the database operation fails
   */
  getFeatureById(id: string): Promise<Feature>;

  /**
   * Update the status of a feature
   *
   * @param id - The ID of the feature
   * @param status - The new status
   * @returns The updated feature
   * @throws {NotFoundError} When the feature does not exist
   * @throws {ConflictError} When the database operation fails
   */
  updateFeatureStatus(id: string, status: FeatureStatus): Promise<Feature>;

  /**
   * Toggle a vote on a feature
   *
   * @param featureId - The ID of the feature
   * @param voter - The user voting
   * @returns Boolean indicating if the vote was added (true) or removed (false)
   * @throws {NotFoundError} When the feature does not exist
   * @throws {ConflictError} When the database operation fails
   */
  toggleVote(featureId: string, voter: string): Promise<boolean>;

  /**
   * Get the vote count for a feature
   *
   * @param featureId - The ID of the feature
   * @returns The number of votes
   * @throws {NotFoundError} When the feature does not exist
   * @throws {ConflictError} When the database operation fails
   */
  getVoteCount(featureId: string): Promise<number>;

  /**
   * Get vote counts for multiple features
   *
   * @param featureIds - Array of feature IDs
   * @returns Object mapping feature IDs to vote counts
   * @throws {ConflictError} When the database operation fails
   */
  getVoteCounts(featureIds: string[]): Promise<Record<string, number>>;

  /**
   * Check if a user has voted on a feature
   *
   * @param featureId - The ID of the feature
   * @param voter - The user
   * @returns Boolean indicating if the user has voted
   * @throws {ConflictError} When the database operation fails
   */
  hasVoted(featureId: string, voter: string): Promise<boolean>;

  /**
   * Check if a user has voted on multiple features (batch operation)
   *
   * @param featureIds - Array of feature IDs
   * @param voter - The user
   * @returns Object mapping feature IDs to boolean (has voted)
   * @throws {ConflictError} When the database operation fails
   */
  hasVotedBatch(
    featureIds: string[],
    voter: string,
  ): Promise<Record<string, boolean>>;
}
