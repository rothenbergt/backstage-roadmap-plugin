import {
  Feature,
  FeatureStatus,
  RoadmapBoardColumnResolved,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { DatasourceType } from '../types';

function parseFeatureDate(value: string): number {
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function retentionCutoffMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function columnForStatus(
  columns: RoadmapBoardColumnResolved[],
  status: FeatureStatus,
): RoadmapBoardColumnResolved | undefined {
  return columns.find(c => c.status === status);
}

/**
 * Filters features for the roadmap board list: hidden columns and (database only) retention.
 */
export function filterFeaturesForBoardList(
  features: Feature[],
  columns: RoadmapBoardColumnResolved[],
  options: {
    includeBeyondRetention: boolean;
    datasource: DatasourceType;
  },
): Feature[] {
  return features.filter(feature => {
    const col = columnForStatus(columns, feature.status);
    if (!col || !col.visible) {
      return false;
    }
    if (options.datasource !== 'database') {
      return true;
    }
    if (options.includeBeyondRetention) {
      return true;
    }
    const days = col.retentionDays;
    if (!days || days <= 0) {
      return true;
    }
    const anchor =
      col.retentionAnchor === 'created'
        ? feature.created_at
        : feature.updated_at;
    const ts = parseFeatureDate(anchor);
    return ts >= retentionCutoffMs(days);
  });
}
