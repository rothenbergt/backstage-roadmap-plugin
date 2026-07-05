import { Knex } from 'knex';
import { NotFoundError } from '@backstage/errors';

/**
 * All access to the `votes` table plus the denormalized `features.votes`
 * counter, which is kept in sync inside the same transaction.
 */
export class VotesStore {
  constructor(private readonly knex: Knex) {}

  async toggle(
    featureId: string,
    voter: string,
  ): Promise<{ voteAdded: boolean; voteCount: number }> {
    return this.knex.transaction(async trx => {
      const feature = await trx('features').where({ id: featureId }).first();
      if (!feature) {
        throw new NotFoundError(`Feature with id ${featureId} not found`);
      }

      const existingVote = await trx('votes')
        .where({ feature_id: featureId, voter })
        .first();

      let voteAdded: boolean;
      if (existingVote) {
        await trx('votes').where({ feature_id: featureId, voter }).delete();
        await trx('features').where({ id: featureId }).decrement('votes', 1);
        voteAdded = false;
      } else {
        await trx('votes').insert({ feature_id: featureId, voter });
        await trx('features').where({ id: featureId }).increment('votes', 1);
        voteAdded = true;
      }

      const updated = await trx('features')
        .where({ id: featureId })
        .select('votes')
        .first();
      return { voteAdded, voteCount: Number(updated?.votes ?? 0) };
    });
  }

  async getCounts(featureIds: string[]): Promise<Record<string, number>> {
    if (featureIds.length === 0) {
      return {};
    }
    const results = await this.knex('features')
      .whereIn('id', featureIds)
      .select('id', 'votes');
    return results.reduce((acc, { id, votes }) => {
      acc[String(id)] = Number(votes ?? 0);
      return acc;
    }, {} as Record<string, number>);
  }

  async hasVoted(featureId: string, voter: string): Promise<boolean> {
    const vote = await this.knex('votes')
      .where({ feature_id: featureId, voter })
      .first();
    return Boolean(vote);
  }

  async hasVotedBatch(
    featureIds: string[],
    voter: string,
  ): Promise<Record<string, boolean>> {
    if (featureIds.length === 0) {
      return {};
    }
    const votes = await this.knex('votes')
      .whereIn('feature_id', featureIds)
      .where({ voter })
      .select('feature_id');
    const votedFeatureIds = new Set(votes.map(v => String(v.feature_id)));
    return featureIds.reduce((acc, featureId) => {
      acc[featureId] = votedFeatureIds.has(featureId);
      return acc;
    }, {} as Record<string, boolean>);
  }
}
