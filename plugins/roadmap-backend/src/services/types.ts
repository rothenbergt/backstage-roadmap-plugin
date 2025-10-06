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
   * Get all roadmap features
   *
   * @throws {ConflictError} When the database operation fails
   */
  getAllFeatures(): Promise<Feature[]>;

  /**
   * Add a new feature
   *
   * @throws {InputError} When validation fails
   * @throws {ConflictError} When the database operation fails
   */
  addFeature(feature: NewFeature, author: string): Promise<Feature>;

  /**
   * Update the status of a feature
   *
   * @throws {InputError} When validation fails
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {ConflictError} When the database operation fails
   */
  updateFeatureStatus(id: string, status: FeatureStatus): Promise<Feature>;
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
   * @throws {ConflictError} When the database operation fails
   */
  addComment(comment: NewComment): Promise<Comment>;

  /**
   * Get all comments for a feature
   *
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {ConflictError} When the database operation fails
   */
  getCommentsByFeatureId(featureId: string): Promise<Comment[]>;
}

/**
 * Service for managing votes
 */
export interface VoteServiceInterface {
  /**
   * Toggle a vote on a feature
   *
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {ConflictError} When the database operation fails
   */
  toggleVote(featureId: string, voter: string): Promise<boolean>;

  /**
   * Get vote count for a feature
   *
   * @throws {NotFoundError} When the feature doesn't exist
   * @throws {ConflictError} When the database operation fails
   */
  getVoteCount(featureId: string): Promise<number>;

  /**
   * Get vote counts for multiple features
   *
   * @throws {ConflictError} When the database operation fails
   */
  getVoteCounts(featureIds: string[]): Promise<Record<string, number>>;

  /**
   * Check if a user has voted on a feature
   *
   * @throws {ConflictError} When the database operation fails
   */
  hasVoted(featureId: string, voter: string): Promise<boolean>;

  /**
   * Check if a user has voted on multiple features (batch operation)
   *
   * @throws {ConflictError} When the database operation fails
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
   * Get the authenticated username from a request
   *
   * @throws {NotAllowedError} When the user is not authenticated
   * @throws {NotFoundError} When the user is not found
   */
  getUsername(req: Request): Promise<string>;
}
