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
    try {
      return await this.db.toggleVote(featureId, voter);
    } catch (error) {
      this.logger.error(
        `Error toggling vote for feature ${featureId}: ${error}`,
      );
      throw error;
    }
  }

  async getVoteCount(featureId: string): Promise<number> {
    try {
      return await this.db.getVoteCount(featureId);
    } catch (error) {
      this.logger.error(
        `Error getting vote count for feature ${featureId}: ${error}`,
      );
      throw error;
    }
  }

  async getVoteCounts(featureIds: string[]): Promise<Record<string, number>> {
    try {
      return await this.db.getVoteCounts(featureIds);
    } catch (error) {
      this.logger.error(`Error getting vote counts: ${error}`);
      throw error;
    }
  }

  async hasVoted(featureId: string, voter: string): Promise<boolean> {
    try {
      return await this.db.hasVoted(featureId, voter);
    } catch (error) {
      this.logger.error(`Error checking if user has voted: ${error}`);
      throw error;
    }
  }
}
