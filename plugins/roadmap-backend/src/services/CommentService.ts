import { LoggerService } from '@backstage/backend-plugin-api';
import { RoadmapDatabase } from '../database/types';
import { CommentServiceInterface } from './types';
import {
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * Implementation of the Comment Service
 */
export class CommentService implements CommentServiceInterface {
  constructor(
    private readonly db: RoadmapDatabase,
    private readonly logger: LoggerService,
  ) {}

  async addComment(comment: NewComment): Promise<Comment> {
    try {
      return await this.db.addComment(comment);
    } catch (error) {
      this.logger.error(`Error adding comment: ${error}`);
      throw error;
    }
  }

  async getCommentsByFeatureId(featureId: string): Promise<Comment[]> {
    try {
      return await this.db.getCommentsByFeatureId(featureId);
    } catch (error) {
      this.logger.error(
        `Error fetching comments for feature ${featureId}: ${error}`,
      );
      throw error;
    }
  }
}
