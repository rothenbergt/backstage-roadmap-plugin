import {
  Feature,
  NewFeature,
  FeatureStatus,
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { Request } from 'express';
import { BasicPermission } from '@backstage/plugin-permission-common';

/**
 * Service for managing features
 */
export interface FeatureServiceInterface {
  /**
   * Get all roadmap features
   */
  getAllFeatures(): Promise<Feature[]>;

  /**
   * Add a new feature
   */
  addFeature(feature: NewFeature, author: string): Promise<Feature>;

  /**
   * Update the status of a feature
   */
  updateFeatureStatus(id: string, status: FeatureStatus): Promise<Feature>;
}

/**
 * Service for managing comments
 */
export interface CommentServiceInterface {
  /**
   * Add a comment to a feature
   */
  addComment(comment: NewComment): Promise<Comment>;

  /**
   * Get all comments for a feature
   */
  getCommentsByFeatureId(featureId: string): Promise<Comment[]>;
}

/**
 * Service for managing votes
 */
export interface VoteServiceInterface {
  /**
   * Toggle a vote on a feature
   */
  toggleVote(featureId: string, voter: string): Promise<boolean>;

  /**
   * Get vote count for a feature
   */
  getVoteCount(featureId: string): Promise<number>;

  /**
   * Get vote counts for multiple features
   */
  getVoteCounts(featureIds: string[]): Promise<Record<string, number>>;

  /**
   * Check if a user has voted on a feature
   */
  hasVoted(featureId: string, voter: string): Promise<boolean>;
}

/**
 * Service for checking permissions
 */
export interface PermissionServiceInterface {
  /**
   * Check if a user has a specific permission
   */
  checkPermission(
    req: Request,
    username: string,
    permission: BasicPermission,
  ): Promise<boolean>;

  /**
   * Check if a user is a roadmap admin
   */
  isRoadmapAdmin(req: Request, username: string): Promise<boolean>;

  /**
   * Get the authenticated username from a request
   */
  getUsername(req: Request): Promise<string>;
}
