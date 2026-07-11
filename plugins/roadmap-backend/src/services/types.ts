import {
  Feature,
  NewFeature,
  FeatureStatus,
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { Request } from 'express';
import { BasicPermission } from '@backstage/plugin-permission-common';
import {
  InputError,
  NotFoundError,
  NotAllowedError,
  ConflictError,
} from '@backstage/errors';

export { InputError, NotFoundError, NotAllowedError, ConflictError };

/**
 * Service for managing features
 */
export interface FeatureServiceInterface {
  /**
   * Board list: visibility + retention (server-side).
   */
  listFeaturesForBoard(includeBeyondRetention: boolean): Promise<Feature[]>;

  /**
   * Get all roadmap features (board-filtered; same as listFeaturesForBoard(false))
   *
   * @throws {Error} When the database operation fails unexpectedly
   */
  getAllFeatures(): Promise<Feature[]>;

  /**
   * Get a single feature by ID
   *
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {Error} When the database operation fails unexpectedly
   */
  getFeatureById(id: string): Promise<Feature>;

  /**
   * Add a new feature
   *
   * @throws {InputError} When validation fails
   * @throws {Error} When the database operation fails unexpectedly
   */
  addFeature(feature: NewFeature, author: string): Promise<Feature>;

  /**
   * Update the status of a feature
   *
   * @throws {InputError} When validation fails
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {Error} When the database operation fails unexpectedly
   */
  updateFeatureStatus(id: string, status: FeatureStatus): Promise<Feature>;

  updateFeatureDetails(
    id: string,
    fields: { title?: string; description?: string },
  ): Promise<Feature>;

  deleteFeature(id: string): Promise<void>;

  reorderFeatures(status: FeatureStatus, orderedIds: string[]): Promise<void>;

  assertAuthorSuggestedOrNotFound(
    id: string,
    username: string,
  ): Promise<Feature>;
}

/**
 * Service for managing comments
 */
export interface CommentServiceInterface {
  /**
   * Add a comment to a feature
   *
   * @throws {InputError} When validation fails
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {Error} When the database operation fails unexpectedly
   */
  addComment(comment: NewComment): Promise<Comment>;

  /**
   * Get all comments for a feature
   *
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {Error} When the database operation fails unexpectedly
   */
  getCommentsByFeatureId(featureId: string): Promise<Comment[]>;

  deleteComment(commentId: string): Promise<void>;
}

/**
 * Service for managing votes
 */
export interface VoteServiceInterface {
  /**
   * Toggle a vote on a feature
   *
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {Error} When the database operation fails unexpectedly
   */
  toggleVote(
    featureId: string,
    voter: string,
  ): Promise<{ voteAdded: boolean; voteCount: number }>;

  /**
   * Get vote count for a feature
   *
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {Error} When the database operation fails unexpectedly
   */
  getVoteCount(featureId: string): Promise<number>;

  /**
   * Get vote counts for multiple features
   *
   * @throws {Error} When the database operation fails unexpectedly
   */
  getVoteCounts(featureIds: string[]): Promise<Record<string, number>>;

  /**
   * Check if a user has voted on a feature
   *
   * @throws {Error} When the database operation fails unexpectedly
   */
  hasVoted(featureId: string, voter: string): Promise<boolean>;

  /**
   * Check if a user has voted on multiple features (batch operation)
   *
   * @throws {Error} When the database operation fails unexpectedly
   */
  hasVotedBatch(
    featureIds: string[],
    voter: string,
  ): Promise<Record<string, boolean>>;
}

/**
 * Service for checking permissions
 */
export interface PermissionServiceInterface {
  /**
   * Check if a user has a specific permission
   *
   * @throws {NotAllowedError} When the user is not authorized
   */
  checkPermission(
    req: Request,
    username: string,
    permission: BasicPermission,
  ): Promise<boolean>;

  /**
   * Check if a user is a roadmap admin
   *
   * @throws {NotAllowedError} When the permission check fails
   */
  isRoadmapAdmin(req: Request, username: string): Promise<boolean>;

  /**
   * Check if a user can create features
   *
   * @throws {NotAllowedError} When the permission check fails
   */
  canCreateFeature(req: Request, username: string): Promise<boolean>;

  /**
   * Get the authenticated username from a request
   *
   * @throws {NotAllowedError} When the user is not authenticated
   * @throws {NotFoundError} When the user is not found
   */
  getUsername(req: Request): Promise<string>;
}
