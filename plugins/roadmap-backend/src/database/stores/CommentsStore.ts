import { Knex } from 'knex';
import {
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { NotFoundError } from '@backstage/errors';
import { CommentRow, mapCommentRow } from '../tables';

/**
 * All access to the `comments` table. Returns API types only.
 */
export class CommentsStore {
  constructor(private readonly knex: Knex) {}

  async insert(comment: NewComment): Promise<Comment> {
    return this.knex.transaction(async trx => {
      const feature = await trx('features')
        .where({ id: comment.featureId })
        .first();
      if (!feature) {
        throw new NotFoundError(
          `Feature with id ${comment.featureId} not found`,
        );
      }

      const [row] = await trx<CommentRow>('comments')
        .insert({
          feature_id: comment.featureId,
          text: comment.text,
          author: comment.author,
        })
        .returning('*');
      return mapCommentRow(row);
    });
  }

  async getByFeatureId(featureId: string): Promise<Comment[]> {
    const feature = await this.knex('features')
      .where({ id: featureId })
      .first();
    if (!feature) {
      throw new NotFoundError(`Feature with id ${featureId} not found`);
    }

    const rows = await this.knex<CommentRow>('comments')
      .where({ feature_id: featureId })
      .orderBy('created_at', 'desc')
      .select('*');
    return rows.map(mapCommentRow);
  }

  async delete(commentId: string): Promise<void> {
    const n = await this.knex('comments').where({ id: commentId }).delete();
    if (!n) {
      throw new NotFoundError(`Comment with id ${commentId} not found`);
    }
  }
}
