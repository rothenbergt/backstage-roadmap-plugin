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
      throw error;
    }
  }

  async addComment(comment: NewComment): Promise<Comment> {
    try {
      const [id] = await this.knex('comments').insert({
        feature_id: comment.featureId,
        text: comment.text,
        author: comment.author,
      });
      return this.knex('comments').where({ id }).first();
    } catch (error) {
      this.logger.error('Error inserting comment:', error as Error);
      throw error;
    }
  }

  async getCommentsByFeatureId(featureId: string): Promise<Comment[]> {
    try {
      return this.knex('comments').where({ feature_id: featureId }).select('*');
    } catch (error) {
      this.logger.error('Error fetching comments:', error as Error);
      throw error;
    }
  }

  async addFeature(feature: NewFeature & { author: string }): Promise<Feature> {
    try {
      const [id] = await this.knex('features').insert({
        ...feature,
        status: FeatureStatus.Suggested,
        votes: 0,
      });
      return this.knex('features').where({ id }).first();
    } catch (error) {
      this.logger.error('Error adding feature:', error as Error);
      throw error;
    }
  }

  async getAllFeatures(): Promise<Feature[]> {
    try {
      return this.knex('features').select('*');
    } catch (error) {
      this.logger.error('Error fetching all features:', error as Error);
      throw error;
    }
  }

  async updateFeatureStatus(
    id: string,
    status: FeatureStatus,
  ): Promise<Feature> {
    try {
      await this.knex('features').where({ id }).update({ status });
      return this.knex('features').where({ id }).first();
    } catch (error) {
      this.logger.error('Error updating feature status:', error as Error);
      throw error;
    }
  }

  async toggleVote(featureId: string, voter: string): Promise<boolean> {
    try {
      const trx = await this.knex.transaction();

      try {
        const existingVote = await trx('votes')
          .where({ feature_id: featureId, voter })
          .first();

        if (existingVote) {
          await trx('votes').where({ feature_id: featureId, voter }).delete();
          await trx('features').where({ id: featureId }).decrement('votes', 1);
          await trx.commit();
          return false;
        } else {
          await trx('votes').insert({ feature_id: featureId, voter });
          await trx('features').where({ id: featureId }).increment('votes', 1);
          await trx.commit();
          return true;
        }
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    } catch (error) {
      this.logger.error('Error toggling vote:', error as Error);
      throw error;
    }
  }

  async getVoteCount(featureId: string): Promise<number> {
    try {
      const result = await this.knex('features')
        .where('id', featureId)
        .select('votes')
        .first();
      return result ? result.votes : 0;
    } catch (error) {
      this.logger.error('Error getting vote count:', error as Error);
      throw error;
    }
  }

  async getVoteCounts(featureIds: string[]): Promise<Record<string, number>> {
    try {
      const results = await this.knex('features')
        .whereIn('id', featureIds)
        .select('id', 'votes');

      return results.reduce((acc, { id, votes }) => {
        acc[id] = votes;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      this.logger.error('Error getting vote counts:', error as Error);
      throw error;
    }
  }

  async hasVoted(featureId: string, voter: string): Promise<boolean> {
    try {
      const vote = await this.knex('votes')
        .where({ feature_id: featureId, voter })
        .first();
      return !!vote;
    } catch (error) {
      this.logger.error('Error checking if user has voted:', error as Error);
      throw error;
    }
  }
}
