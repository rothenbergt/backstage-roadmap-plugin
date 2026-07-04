import { Knex } from 'knex';
import {
  Feature,
  NewFeature,
  FeatureStatus,
  Comment,
  NewComment,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { RoadmapDatasource } from '../types';
import { LoggerService, DatabaseService } from '@backstage/backend-plugin-api';
import { NotFoundError, ConflictError } from '@backstage/errors';
import { resolvePackagePath } from '@backstage/backend-plugin-api';
import { FeaturesStore, CommentsStore, VotesStore } from './stores';

const migrationsDir = resolvePackagePath(
  '@rothenbergt/backstage-plugin-roadmap-backend',
  'migrations',
);

/**
 * Knex-backed implementation of the RoadmapDatasource interface.
 *
 * Table access lives in the per-table stores (features/comments/votes);
 * this class aggregates them and wraps unexpected store failures in
 * ConflictError while letting NotFoundError pass through.
 */
export class RoadmapDatabaseClient implements RoadmapDatasource {
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

  readonly features: FeaturesStore;
  readonly comments: CommentsStore;
  readonly votes: VotesStore;
  private readonly logger: LoggerService;

  constructor(knexInstance: Knex, logger: LoggerService) {
    this.features = new FeaturesStore(knexInstance);
    this.comments = new CommentsStore(knexInstance);
    this.votes = new VotesStore(knexInstance);
    this.logger = logger;
  }

  /** Logs and normalizes store errors: NotFound passes through, anything else becomes ConflictError. */
  private async run<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error(`Error during ${operation}`, {
        error: String(error),
      });
      throw new ConflictError(`Failed to ${operation}`, error as Error);
    }
  }

  async addComment(comment: NewComment): Promise<Comment> {
    return this.run('add comment', () => this.comments.insert(comment));
  }

  async getCommentsByFeatureId(featureId: string): Promise<Comment[]> {
    return this.run(`get comments for feature ${featureId}`, () =>
      this.comments.getByFeatureId(featureId),
    );
  }

  async deleteCommentById(commentId: string): Promise<void> {
    return this.run(`delete comment ${commentId}`, () =>
      this.comments.delete(commentId),
    );
  }

  async addFeature(feature: NewFeature & { author: string }): Promise<Feature> {
    return this.run('add feature', () => this.features.insert(feature));
  }

  async getAllFeatures(): Promise<Feature[]> {
    return this.run('get all features', () => this.features.getAll());
  }

  async getFeatureById(id: string): Promise<Feature> {
    return this.run(`get feature with id ${id}`, () =>
      this.features.getById(id),
    );
  }

  async updateFeatureStatus(
    id: string,
    status: FeatureStatus,
  ): Promise<Feature> {
    return this.run(`update status for feature ${id}`, () =>
      this.features.updateStatus(id, status),
    );
  }

  async updateFeatureDetails(
    id: string,
    fields: { title?: string; description?: string },
  ): Promise<Feature> {
    return this.run(`update feature ${id}`, () =>
      this.features.updateDetails(id, fields),
    );
  }

  async deleteFeature(id: string): Promise<void> {
    return this.run(`delete feature ${id}`, () => this.features.delete(id));
  }

  async reorderFeaturesInStatus(
    status: FeatureStatus,
    orderedIds: string[],
  ): Promise<void> {
    return this.run('reorder features', () =>
      this.features.reorderInStatus(status, orderedIds),
    );
  }

  async toggleVote(
    featureId: string,
    voter: string,
  ): Promise<{ voteAdded: boolean; voteCount: number }> {
    return this.run(`toggle vote for feature ${featureId}`, () =>
      this.votes.toggle(featureId, voter),
    );
  }

  async getVoteCount(featureId: string): Promise<number> {
    const counts = await this.getVoteCounts([featureId]);
    return counts[featureId] || 0;
  }

  async getVoteCounts(featureIds: string[]): Promise<Record<string, number>> {
    return this.run('get vote counts', () => this.votes.getCounts(featureIds));
  }

  async hasVoted(featureId: string, voter: string): Promise<boolean> {
    return this.run(
      `check if user ${voter} has voted on feature ${featureId}`,
      () => this.votes.hasVoted(featureId, voter),
    );
  }

  async hasVotedBatch(
    featureIds: string[],
    voter: string,
  ): Promise<Record<string, boolean>> {
    return this.run(`check votes for user ${voter}`, () =>
      this.votes.hasVotedBatch(featureIds, voter),
    );
  }
}
