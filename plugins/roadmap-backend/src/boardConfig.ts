import { Config } from '@backstage/config';
import {
  FeatureStatus,
  RoadmapBoardColumnResolved,
  RoadmapRetentionAnchor,
  RoadmapBoardConfigResponse,
  RoadmapUiCapabilities,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { DatasourceType } from './types';

const ALL_STATUSES = Object.values(FeatureStatus);

function defaultTitle(status: FeatureStatus): string {
  return status;
}

function buildDefaultColumns(): RoadmapBoardColumnResolved[] {
  return ALL_STATUSES.map(status => ({
    status,
    title: defaultTitle(status),
    visible: status === FeatureStatus.InProgress ? false : true,
    retentionAnchor: 'updated' as RoadmapRetentionAnchor,
  }));
}

function parseAnchor(v: string | undefined): RoadmapRetentionAnchor {
  if (v === 'created' || v === 'updated') return v;
  return 'updated';
}

/**
 * Reads optional `roadmap.columns` from config and merges with defaults.
 * Default: In Progress column exists but `visible: false`.
 */
export function getMergedBoardColumns(
  config: Config,
): RoadmapBoardColumnResolved[] {
  const defaults = buildDefaultColumns();
  const roadmap = config.getOptionalConfig('roadmap');
  const entries = roadmap?.getOptionalConfigArray('columns');
  if (!entries?.length) {
    return defaults;
  }

  const byStatus = new Map<FeatureStatus, RoadmapBoardColumnResolved>(
    defaults.map(c => [c.status, { ...c }]),
  );

  for (const entry of entries) {
    const statusStr = entry.getOptionalString('status');
    if (!statusStr || !ALL_STATUSES.includes(statusStr as FeatureStatus)) {
      continue;
    }
    const status = statusStr as FeatureStatus;
    const existing = byStatus.get(status)!;
    const title = entry.getOptionalString('title') ?? existing.title;
    const visible = entry.getOptionalBoolean('visible') ?? existing.visible;
    const retentionDays = entry.getOptionalNumber('retentionDays');
    const retentionAnchor = parseAnchor(
      entry.getOptionalString('retentionAnchor'),
    );
    byStatus.set(status, {
      status,
      title,
      visible,
      retentionDays:
        retentionDays !== undefined && retentionDays > 0
          ? retentionDays
          : undefined,
      retentionAnchor,
    });
  }

  return ALL_STATUSES.map(s => byStatus.get(s)!);
}

export function getRoadmapUiCapabilities(
  datasource: DatasourceType,
): RoadmapUiCapabilities {
  if (datasource === 'gitlab') {
    return {
      retentionFiltering: false,
      includeBeyondRetentionQuery: false,
      adminEditTitleDescription: false,
      adminDeleteFeature: false,
      adminDeleteComment: false,
      creatorEditDeleteSuggested: false,
      adminReorder: false,
    };
  }
  return {
    retentionFiltering: true,
    includeBeyondRetentionQuery: true,
    adminEditTitleDescription: true,
    adminDeleteFeature: true,
    adminDeleteComment: true,
    creatorEditDeleteSuggested: true,
    adminReorder: true,
  };
}

export function getBoardConfigResponse(
  config: Config,
  datasource: DatasourceType,
): RoadmapBoardConfigResponse {
  return {
    columns: getMergedBoardColumns(config),
    capabilities: getRoadmapUiCapabilities(datasource),
  };
}
