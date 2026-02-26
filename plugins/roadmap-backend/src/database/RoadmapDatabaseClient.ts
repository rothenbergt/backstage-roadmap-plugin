import { Knex } from 'knex';
import {
  Feature,
  NewFeature,
  FeatureStatus,
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapDatabase } from './types';
import { LoggerService, DatabaseService } from '@backstage/backend-plugin-api';
import { NotFoundError, ConflictError } from '@backstage/errors';
import { resolvePackagePath } from '@backstage/backend-plugin-api';

const migrationsDir = resolvePackagePath(
  '@rothenbergt/backstage-plugin-roadmap-backend',
  'migrations',
);

/**
 * Implementation of the RoadmapDatabase interface using Knex
 */
export class RoadmapDatabaseClient implements RoadmapDatabase {
  static async create(options: {
    database: DatabaseService;
    logger: LoggerService;
  }): Promise<RoadmapDatabaseClient> {
    const { database, logger } = options;
    logger.info('Creating database for roadmap plugin');

    const client = await database.getClient();

    if (!database.migrations?.skip) {
      logger.info('Running migrations for roadmap plugin');
      await client.migrate.latest({
        directory: migrationsDir,
      });
    }

    return new RoadmapDatabaseClient(client, logger);
  }

  private readonly knex: Knex;
  private readonly logger: LoggerService;

  constructor(knexInstance: Knex, logger: LoggerService) {
    this.knex = knexInstance;
    this.logger = logger;
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

      // Insert comment and return the complete inserted object
      const [newComment] = await trx('comments')
        .insert({
          feature_id: comment.featureId,
          text: comment.text,
          author: comment.author,
        })
        .returning('*');

      await trx.commit();
      return newComment;
    } catch (error) {
      await trx.rollback();
      this.logger.error('Error inserting comment', { error: String(error) });

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
      this.logger.error(`Error fetching comments for feature ${featureId}`, {
        error: String(error),
      });

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
      // Insert feature and return the complete inserted object
      const [newFeature] = await trx('features')
        .insert({
          ...feature,
          status: FeatureStatus.Suggested,
          votes: 0,
        })
        .returning('*');

      await trx.commit();
      return newFeature;
    } catch (error) {
      await trx.rollback();
      this.logger.error('Error adding feature', { error: String(error) });
      throw new ConflictError('Failed to add feature', error as Error);
    }
  }

  async getAllFeatures(): Promise<Feature[]> {
    try {
      return this.knex('features').orderBy('created_at', 'desc').select('*');
    } catch (error) {
      this.logger.error('Error fetching all features', {
        error: String(error),
      });
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
      this.logger.error(`Error fetching feature ${id}`, {
        error: String(error),
      });

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

      // Update the status and return the updated object
      const [updatedFeature] = await trx('features')
        .where({ id })
        .update({
          status,
          updated_at: this.knex.fn.now(),
        })
        .returning('*');

      await trx.commit();
      return updatedFeature;
    } catch (error) {
      await trx.rollback();
      this.logger.error('Error updating feature status', {
        error: String(error),
      });

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

  async toggleVote(
    featureId: string,
    voter: string,
  ): Promise<{ voteAdded: boolean; voteCount: number }> {
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

      let voteAdded: boolean;
      if (existingVote) {
        // Remove the vote
        await trx('votes').where({ feature_id: featureId, voter }).delete();
        await trx('features').where({ id: featureId }).decrement('votes', 1);
        voteAdded = false;
      } else {
        // Add the vote
        await trx('votes').insert({ feature_id: featureId, voter });
        await trx('features').where({ id: featureId }).increment('votes', 1);
        voteAdded = true;
      }

      // Read the updated count within the same transaction
      const updated = await trx('features')
        .where({ id: featureId })
        .select('votes')
        .first();
      await trx.commit();
      return { voteAdded, voteCount: updated?.votes ?? 0 };
    } catch (error) {
      await trx.rollback();
      this.logger.error('Error toggling vote', { error: String(error) });

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
      this.logger.error('Error getting vote counts', { error: String(error) });
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
      this.logger.error('Error checking if user has voted', {
        error: String(error),
      });
      throw new ConflictError(
        `Failed to check if user ${voter} has voted on feature ${featureId}`,
        error as Error,
      );
    }
  }

  async hasVotedBatch(
    featureIds: string[],
    voter: string,
  ): Promise<Record<string, boolean>> {
    try {
      if (featureIds.length === 0) {
        return {};
      }

      const votes = await this.knex('votes')
        .whereIn('feature_id', featureIds)
        .where({ voter })
        .select('feature_id');

      const votedFeatureIds = new Set(votes.map(v => v.feature_id.toString()));

      return featureIds.reduce((acc, featureId) => {
        acc[featureId] = votedFeatureIds.has(featureId);
        return acc;
      }, {} as Record<string, boolean>);
    } catch (error) {
      this.logger.error('Error checking batch votes', { error: String(error) });
      throw new ConflictError(
        `Failed to check votes for user ${voter}`,
        error as Error,
      );
    }
  }
}
