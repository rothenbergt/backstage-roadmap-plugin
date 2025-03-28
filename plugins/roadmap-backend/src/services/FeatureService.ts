import { LoggerService } from '@backstage/backend-plugin-api';
import { RoadmapDatabase } from '../database/types';
import { FeatureServiceInterface } from './types';
import {
  Feature,
  NewFeature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { InputError } from '@backstage/errors';

/**
 * Implementation of the Feature Service
 */
export class FeatureService implements FeatureServiceInterface {
  constructor(
    private readonly db: RoadmapDatabase,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Validates a feature before adding it
   */
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

  /**
   * Validates a feature status before updating
   */
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

  async getAllFeatures(): Promise<Feature[]> {
    this.logger.info('Fetching all features');
    return this.db.getAllFeatures();
  }

  async getFeatureById(id: string): Promise<Feature> {
    this.logger.info(`Fetching feature with id ${id}`);
    return this.db.getFeatureById(id);
  }

  async addFeature(feature: NewFeature, author: string): Promise<Feature> {
    this.logger.info(`Adding new feature: ${feature.title} by ${author}`);
    this.validateNewFeature(feature);
    return this.db.addFeature({ ...feature, author });
  }

  async updateFeatureStatus(
    id: string,
    status: FeatureStatus,
  ): Promise<Feature> {
    this.logger.info(`Updating feature ${id} status to ${status}`);
    this.validateStatus(status);
    return this.db.updateFeatureStatus(id, status);
  }
}
