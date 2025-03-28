import { Knex } from 'knex';
import {
  Feature,
  NewFeature,
  FeatureStatus,
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapDatabase } from './types';
import { LoggerService } from '@backstage/backend-plugin-api';
import { NotFoundError, ConflictError } from '@backstage/errors';

/**
 * Implementation of the RoadmapDatabase interface using Knex
 */
export class RoadmapDatabaseClient implements RoadmapDatabase {
  private readonly knex: Knex;
  private readonly logger: LoggerService;

  constructor(knexInstance: Knex, logger: LoggerService) {
    this.knex = knexInstance;
    this.logger = logger;
  }

  private get validStatuses(): string[] {
    return Object.values(FeatureStatus);
  }

  async setupSchema(): Promise<void> {
    try {
      const hasFeatures = await this.knex.schema.hasTable('features');
      const hasComments = await this.knex.schema.hasTable('comments');
      const hasVotes = await this.knex.schema.hasTable('votes');

      if (!hasFeatures) {
        await this.knex.schema.createTable('features', table => {
          table.increments('id').primary();
          table.string('title').notNullable();
          table.text('description').notNullable();
          table
            .enum(
              'status',
              this.validStatuses.map(status => status.replace("'", "''")),
            )
            .notNullable()
            .defaultTo(FeatureStatus.Suggested);
          table.integer('votes').notNullable().defaultTo(0);
          table.string('author').notNullable();
          table.timestamps(true, true);
        });
      }

      if (!hasComments) {
        await this.knex.schema.createTable('comments', table => {
          table.increments('id').primary();
          table.integer('feature_id').unsigned().notNullable();
          table.text('text').notNullable();
          table.string('author').notNullable();
          table.timestamps(true, true);
          table
            .foreign('feature_id')
            .references('id')
            .inTable('features')
            .onDelete('CASCADE');
        });
      }

      if (!hasVotes) {
        await this.knex.schema.createTable('votes', table => {
          table.increments('id').primary();
          table.integer('feature_id').unsigned().notNullable();
          table.string('voter').notNullable();
          table.timestamps(true, true);
          table
            .foreign('feature_id')
            .references('id')
            .inTable('features')
            .onDelete('CASCADE');
          table.unique(['feature_id', 'voter']);
        });
      }
    } catch (error) {
      this.logger.error('Error setting up schema:', error as Error);
      throw new ConflictError(
        'Failed to set up database schema',
        error as Error,
      );
    }
  }

  async addComment(comment: NewComment): Promise<Comment> {
    const trx = await this.knex.transaction();
    try {
      // First check if the feature exists
      const feature = await trx('features')
        .where({ id: comment.featureId })
        .first();

      if (!feature) {
        await trx.rollback();
        throw new NotFoundError(
          `Feature with id ${comment.featureId} not found`,
        );
      }

      // Insert comment
      const [id] = await trx('comments').insert({
        feature_id: comment.featureId,
        text: comment.text,
        author: comment.author,
      });

      // Get the inserted comment
      const newComment = await trx('comments').where({ id }).first();

      await trx.commit();
      return newComment;
    } catch (error) {
      await trx.rollback();
      this.logger.error(`Error inserting comment: ${error}`);

      // Rethrow NotFoundError as is
      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new ConflictError('Failed to add comment', error as Error);
    }
  }

  async getCommentsByFeatureId(featureId: string): Promise<Comment[]> {
    try {
      // First check if the feature exists
      const feature = await this.knex('features')
        .where({ id: featureId })
        .first();

      if (!feature) {
        throw new NotFoundError(`Feature with id ${featureId} not found`);
      }

      // Get comments ordered by creation date (newest first)
      return this.knex('comments')
        .where({ feature_id: featureId })
        .orderBy('created_at', 'desc')
        .select('*');
    } catch (error) {
      this.logger.error(
        `Error fetching comments for feature ${featureId}: ${error}`,
      );

      // Rethrow NotFoundError as is
      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new ConflictError(
        `Failed to get comments for feature ${featureId}`,
        error as Error,
      );
    }
  }

  async addFeature(feature: NewFeature & { author: string }): Promise<Feature> {
    const trx = await this.knex.transaction();
    try {
      const [id] = await trx('features').insert({
        ...feature,
        status: FeatureStatus.Suggested,
        votes: 0,
      });

      const newFeature = await trx('features').where({ id }).first();

      await trx.commit();
      return newFeature;
    } catch (error) {
      await trx.rollback();
      this.logger.error(`Error adding feature: ${error}`);
      throw new ConflictError('Failed to add feature', error as Error);
    }
  }

  async getAllFeatures(): Promise<Feature[]> {
    try {
      return this.knex('features').orderBy('created_at', 'desc').select('*');
    } catch (error) {
      this.logger.error(`Error fetching all features: ${error}`);
      throw new ConflictError('Failed to get all features', error as Error);
    }
  }

  async getFeatureById(id: string): Promise<Feature> {
    try {
      const feature = await this.knex('features').where({ id }).first();

      if (!feature) {
        throw new NotFoundError(`Feature with id ${id} not found`);
      }

      return feature;
    } catch (error) {
      this.logger.error(`Error fetching feature ${id}: ${error}`);

      // Rethrow NotFoundError as is
      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new ConflictError(
        `Failed to get feature with id ${id}`,
        error as Error,
      );
    }
  }

  async updateFeatureStatus(
    id: string,
    status: FeatureStatus,
  ): Promise<Feature> {
    const trx = await this.knex.transaction();
    try {
      // First check if the feature exists
      const feature = await trx('features').where({ id }).first();

      if (!feature) {
        await trx.rollback();
        throw new NotFoundError(`Feature with id ${id} not found`);
      }

      // Update the status
      await trx('features').where({ id }).update({
        status,
        updated_at: this.knex.fn.now(),
      });

      // Get the updated feature
      const updatedFeature = await trx('features').where({ id }).first();

      await trx.commit();
      return updatedFeature;
    } catch (error) {
      await trx.rollback();
      this.logger.error(`Error updating feature status: ${error}`);

      // Rethrow NotFoundError as is
      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new ConflictError(
        `Failed to update status for feature ${id}`,
        error as Error,
      );
    }
  }

  async toggleVote(featureId: string, voter: string): Promise<boolean> {
    const trx = await this.knex.transaction();
    try {
      // First check if the feature exists
      const feature = await trx('features').where({ id: featureId }).first();

      if (!feature) {
        await trx.rollback();
        throw new NotFoundError(`Feature with id ${featureId} not found`);
      }

      const existingVote = await trx('votes')
        .where({ feature_id: featureId, voter })
        .first();

      if (existingVote) {
        // Remove the vote
        await trx('votes').where({ feature_id: featureId, voter }).delete();
        await trx('features').where({ id: featureId }).decrement('votes', 1);
        await trx.commit();
        return false;
      } else {
        // Add the vote
        await trx('votes').insert({ feature_id: featureId, voter });
        await trx('features').where({ id: featureId }).increment('votes', 1);
        await trx.commit();
        return true;
      }
    } catch (error) {
      await trx.rollback();
      this.logger.error(`Error toggling vote: ${error}`);

      // Rethrow NotFoundError as is
      if (error instanceof NotFoundError) {
        throw error;
      }

      throw new ConflictError(
        `Failed to toggle vote for feature ${featureId}`,
        error as Error,
      );
    }
  }

  async getVoteCount(featureId: string): Promise<number> {
    const counts = await this.getVoteCounts([featureId]);
    return counts[featureId] || 0;
  }

  async getVoteCounts(featureIds: string[]): Promise<Record<string, number>> {
    try {
      if (featureIds.length === 0) {
        return {};
      }

      const results = await this.knex('features')
        .whereIn('id', featureIds)
        .select('id', 'votes');

      return results.reduce((acc, { id, votes }) => {
        acc[id] = votes;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      this.logger.error(`Error getting vote counts: ${error}`);
      throw new ConflictError('Failed to get vote counts', error as Error);
    }
  }

  async hasVoted(featureId: string, voter: string): Promise<boolean> {
    try {
      const vote = await this.knex('votes')
        .where({ feature_id: featureId, voter })
        .first();
      return !!vote;
    } catch (error) {
      this.logger.error(`Error checking if user has voted: ${error}`);
      throw new ConflictError(
        `Failed to check if user ${voter} has voted on feature ${featureId}`,
        error as Error,
      );
    }
  }
}
