import { LoggerService } from '@backstage/backend-plugin-api';
import { RoadmapDatabase } from '../database/types';
import { VoteServiceInterface } from './types';

/**
 * Implementation of the Vote Service
 */
export class VoteService implements VoteServiceInterface {
  constructor(
    private readonly db: RoadmapDatabase,
    private readonly logger: LoggerService,
  ) {}

  async toggleVote(featureId: string, voter: string): Promise<boolean> {
    this.logger.info(`Toggling vote for feature ${featureId} by ${voter}`);
    return this.db.toggleVote(featureId, voter);
  }

  async getVoteCount(featureId: string): Promise<number> {
    this.logger.info(`Getting vote count for feature ${featureId}`);
    return this.db.getVoteCount(featureId);
  }

  async getVoteCounts(featureIds: string[]): Promise<Record<string, number>> {
    this.logger.info(`Getting vote counts for ${featureIds.length} features`);
    if (featureIds.length === 0) {
      return {};
    }
    return this.db.getVoteCounts(featureIds);
  }

  async hasVoted(featureId: string, voter: string): Promise<boolean> {
    this.logger.info(`Checking if ${voter} has voted on feature ${featureId}`);
    return this.db.hasVoted(featureId, voter);
  }

  async hasVotedBatch(
    featureIds: string[],
    voter: string,
  ): Promise<Record<string, boolean>> {
    this.logger.info(
      `Checking if ${voter} has voted on ${featureIds.length} features`,
    );
    if (featureIds.length === 0) {
      return {};
    }
    return this.db.hasVotedBatch(featureIds, voter);
  }
}
