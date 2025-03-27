import { LoggerService } from '@backstage/backend-plugin-api';
import { RoadmapDatabase } from '../database/types';
import { FeatureServiceInterface } from './types';
import {
  Feature,
  NewFeature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * Implementation of the Feature Service
 */
export class FeatureService implements FeatureServiceInterface {
  constructor(
    private readonly db: RoadmapDatabase,
    private readonly logger: LoggerService,
  ) {}

  async getAllFeatures(): Promise<Feature[]> {
    try {
      return await this.db.getAllFeatures();
    } catch (error) {
      this.logger.error(`Error fetching all features: ${error}`);
      throw error;
    }
  }

  async addFeature(feature: NewFeature, author: string): Promise<Feature> {
    try {
      return await this.db.addFeature({ ...feature, author });
    } catch (error) {
      this.logger.error(`Error adding feature: ${error}`);
      throw error;
    }
  }

  async updateFeatureStatus(
    id: string,
    status: FeatureStatus,
  ): Promise<Feature> {
    try {
      return await this.db.updateFeatureStatus(id, status);
    } catch (error) {
      this.logger.error(`Error updating feature status: ${error}`);
      throw error;
    }
  }
}
