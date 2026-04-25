import { LoggerService } from '@backstage/backend-plugin-api';
import { RoadmapDatasource } from '../types';
import { DatasourceType } from '../types';
import { FeatureServiceInterface } from './types';
import {
  Feature,
  NewFeature,
  FeatureStatus,
  RoadmapBoardColumnResolved,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { InputError, NotAllowedError } from '@backstage/errors';
import { filterFeaturesForBoardList } from './featureBoardFilter';
import { RoadmapDatabaseClient } from '../database/RoadmapDatabaseClient';

/**
 * Feature business logic: validation, board list filtering (visibility + retention),
 * and database-only writes. GitLab mutations that are not supported stay in the router.
 */
export class FeatureService implements FeatureServiceInterface {
  constructor(
    private readonly db: RoadmapDatasource,
    private readonly logger: LoggerService,
    private readonly boardColumns: RoadmapBoardColumnResolved[],
    private readonly datasource: DatasourceType,
  ) {}

  /** Ensures we are on the Knex-backed datasource before DB-only operations. */
  private requireDatabase(): RoadmapDatabaseClient {
    if (
      this.datasource !== 'database' ||
      !(this.db instanceof RoadmapDatabaseClient)
    ) {
      throw new NotAllowedError(
        'This operation is not supported for the GitLab roadmap datasource',
      );
    }
    return this.db;
  }

  /** Rules for creating a suggestion from the API. */
  private validateNewFeature(feature: NewFeature): void {
    if (!feature.title || feature.title.trim() === '') {
      throw new InputError('Title is required and cannot be empty');
    }

    if (!feature.description || feature.description.trim() === '') {
      throw new InputError('Description is required and cannot be empty');
    }

    if (feature.title.length > 100) {
      throw new InputError('Title cannot be longer than 100 characters');
    }
  }

  /** Ensures status values match the shared enum (used by status changes and reorder). */
  private validateStatus(status: FeatureStatus): void {
    const validStatuses = Object.values(FeatureStatus);
    if (!validStatuses.includes(status)) {
      throw new InputError(
        `Invalid status: ${status}. Must be one of: ${validStatuses.join(
          ', ',
        )}`,
      );
    }
  }

  /**
   * Primary list for the board: applies column visibility and, for the database
   * datasource, per-column retention unless `includeBeyondRetention` is true.
   */
  async listFeaturesForBoard(
    includeBeyondRetention: boolean,
  ): Promise<Feature[]> {
    this.logger.info('Fetching roadmap features for board list');
    const raw = await this.db.getAllFeatures();
    return filterFeaturesForBoardList(raw, this.boardColumns, {
      includeBeyondRetention,
      datasource: this.datasource,
    });
  }

  /** Same as the board list with default retention filtering (backward compatible name). */
  async getAllFeatures(): Promise<Feature[]> {
    return this.listFeaturesForBoard(false);
  }

  async getFeatureById(id: string): Promise<Feature> {
    this.logger.info(`Fetching feature with id ${id}`);
    return this.db.getFeatureById(id);
  }

  /** Creates a new feature in Suggested status with the given author ref. */
  async addFeature(feature: NewFeature, author: string): Promise<Feature> {
    this.logger.info(`Adding new feature: ${feature.title} by ${author}`);
    this.validateNewFeature(feature);
    return this.db.addFeature({ ...feature, author });
  }

  /**
   * Admin workflow: change status. Supported for both database and GitLab
   * (GitLab implementation updates labels on the issue).
   */
  async updateFeatureStatus(
    id: string,
    status: FeatureStatus,
  ): Promise<Feature> {
    this.logger.info(`Updating feature ${id} status to ${status}`);
    this.validateStatus(status);
    return this.db.updateFeatureStatus(id, status);
  }

  /**
   * Database only. Router decides admin vs author-on-Suggested; this layer only validates fields.
   */
  async updateFeatureDetails(
    id: string,
    fields: { title?: string; description?: string },
  ): Promise<Feature> {
    const client = this.requireDatabase();
    if (fields.title !== undefined) {
      if (!fields.title.trim()) {
        throw new InputError('Title cannot be empty');
      }
      if (fields.title.length > 100) {
        throw new InputError('Title cannot be longer than 100 characters');
      }
    }
    if (fields.description !== undefined && !fields.description.trim()) {
      throw new InputError('Description cannot be empty');
    }
    return client.updateFeatureDetails(id, fields);
  }

  /** Database only: hard-delete feature row (and FK-cascaded comments/votes). */
  async deleteFeature(id: string): Promise<void> {
    const client = this.requireDatabase();
    await client.deleteFeature(id);
  }

  /**
   * Database only: persist admin drag-and-drop order within a single status column.
   */
  async reorderFeatures(
    status: FeatureStatus,
    orderedIds: string[],
  ): Promise<void> {
    this.validateStatus(status);
    const client = this.requireDatabase();
    await client.reorderFeaturesInStatus(status, orderedIds);
  }

  /**
   * Non-admin edit/delete path: loads the feature and ensures it is Suggested
   * and owned by `username`; otherwise throws NotAllowed. Missing ids surface as NotFound from the datasource.
   */
  async assertAuthorSuggestedOrNotFound(
    id: string,
    username: string,
  ): Promise<Feature> {
    const feature = await this.db.getFeatureById(id);
    if (feature.status !== FeatureStatus.Suggested) {
      throw new NotAllowedError(
        'Only suggested features can be edited by the author',
      );
    }
    if (feature.author !== username) {
      throw new NotAllowedError(
        'You can only edit your own suggested features',
      );
    }
    return feature;
  }
}
