import { LoggerService } from '@backstage/backend-plugin-api';
import { RoadmapDatabase } from '../database/types';
import { CommentServiceInterface } from './types';
import {
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { InputError } from '@backstage/errors';

/**
 * Implementation of the Comment Service
 */
export class CommentService implements CommentServiceInterface {
  constructor(
    private readonly db: RoadmapDatabase,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Validates a comment before adding it
   */
  private validateNewComment(comment: NewComment): void {
    if (!comment.featureId) {
      throw new InputError('Feature ID is required');
    }

    if (!comment.text || comment.text.trim() === '') {
      throw new InputError('Comment text is required and cannot be empty');
    }

    if (comment.text.length > 1000) {
      throw new InputError(
        'Comment text cannot be longer than 1000 characters',
      );
    }
  }

  async addComment(comment: NewComment): Promise<Comment> {
    this.logger.info(`Adding comment to feature ${comment.featureId}`);
    this.validateNewComment(comment);
    return this.db.addComment(comment);
  }

  async getCommentsByFeatureId(featureId: string): Promise<Comment[]> {
    this.logger.info(`Fetching comments for feature ${featureId}`);
    return this.db.getCommentsByFeatureId(featureId);
  }
}
