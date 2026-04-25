import { LoggerService } from '@backstage/backend-plugin-api';
import { RoadmapDatasource } from '../types';
import { DatasourceType } from '../types';
import { CommentServiceInterface } from './types';
import {
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { InputError, NotAllowedError } from '@backstage/errors';
import { RoadmapDatabaseClient } from '../database/RoadmapDatabaseClient';

/**
 * Implementation of the Comment Service
 */
export class CommentService implements CommentServiceInterface {
  constructor(
    private readonly db: RoadmapDatasource,
    private readonly logger: LoggerService,
    private readonly datasource: DatasourceType,
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

  /** Database only; GitLab roadmap does not support deleting notes via this plugin. */
  async deleteComment(commentId: string): Promise<void> {
    if (
      this.datasource !== 'database' ||
      !(this.db instanceof RoadmapDatabaseClient)
    ) {
      throw new NotAllowedError(
        'This operation is not supported for the GitLab roadmap datasource',
      );
    }
    this.logger.info(`Deleting comment ${commentId}`);
    await this.db.deleteCommentById(commentId);
  }
}
