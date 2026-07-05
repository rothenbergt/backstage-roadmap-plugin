import { Knex } from 'knex';
import {
  Feature,
  NewFeature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { NotFoundError } from '@backstage/errors';
import { statusToDb } from '../statusDbMapping';
import { FeatureRow, mapFeatureRow } from '../tables';

/**
 * All access to the `features` table. Returns API types only; the raw
 * snake_case rows never leave this store.
 */
export class FeaturesStore {
  constructor(private readonly knex: Knex) {}

  async insert(feature: NewFeature & { author: string }): Promise<Feature> {
    return this.knex.transaction(async trx => {
      const maxRow = await trx('features')
        .where({ status: statusToDb(FeatureStatus.Suggested) })
        .max('board_position as maxp')
        .first();
      const nextPosition =
        Number((maxRow as { maxp?: string | number })?.maxp ?? 0) + 1;

      const [row] = await trx<FeatureRow>('features')
        .insert({
          ...feature,
          status: statusToDb(FeatureStatus.Suggested),
          votes: 0,
          board_position: nextPosition,
        })
        .returning('*');
      return mapFeatureRow(row);
    });
  }

  async getAll(): Promise<Feature[]> {
    const rows = await this.knex<FeatureRow>('features')
      .orderBy([
        { column: 'status', order: 'asc' },
        { column: 'board_position', order: 'asc' },
        { column: 'created_at', order: 'desc' },
      ])
      .select('*');
    return rows.map(mapFeatureRow);
  }

  async getById(id: string): Promise<Feature> {
    const row = await this.knex<FeatureRow>('features').where({ id }).first();
    if (!row) {
      throw new NotFoundError(`Feature with id ${id} not found`);
    }
    return mapFeatureRow(row);
  }

  async updateStatus(id: string, status: FeatureStatus): Promise<Feature> {
    const [row] = await this.knex<FeatureRow>('features')
      .where({ id })
      .update({
        status: statusToDb(status),
        updated_at: this.knex.fn.now(),
      })
      .returning('*');
    if (!row) {
      throw new NotFoundError(`Feature with id ${id} not found`);
    }
    return mapFeatureRow(row);
  }

  async updateDetails(
    id: string,
    fields: { title?: string; description?: string },
  ): Promise<Feature> {
    const patch: Record<string, unknown> = { updated_at: this.knex.fn.now() };
    if (fields.title !== undefined) patch.title = fields.title;
    if (fields.description !== undefined)
      patch.description = fields.description;
    const [row] = await this.knex<FeatureRow>('features')
      .where({ id })
      .update(patch)
      .returning('*');
    if (!row) {
      throw new NotFoundError(`Feature with id ${id} not found`);
    }
    return mapFeatureRow(row);
  }

  async delete(id: string): Promise<void> {
    const n = await this.knex('features').where({ id }).delete();
    if (!n) {
      throw new NotFoundError(`Feature with id ${id} not found`);
    }
  }

  async reorderInStatus(
    status: FeatureStatus,
    orderedIds: string[],
  ): Promise<void> {
    await this.knex.transaction(async trx => {
      for (let i = 0; i < orderedIds.length; i += 1) {
        const updated = await trx('features')
          .where({ id: orderedIds[i], status: statusToDb(status) })
          .update({ board_position: i });
        if (!updated) {
          throw new NotFoundError(
            `Feature ${orderedIds[i]} not found or not in status ${status}`,
          );
        }
      }
    });
  }

  async exists(id: string): Promise<boolean> {
    const row = await this.knex('features').where({ id }).first();
    return Boolean(row);
  }
}
