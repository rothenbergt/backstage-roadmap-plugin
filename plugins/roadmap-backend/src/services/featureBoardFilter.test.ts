import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { filterFeaturesForBoardList } from './featureBoardFilter';
import type { RoadmapBoardColumnResolved } from '@rothenbergt/backstage-plugin-roadmap-common';

const baseColumns: RoadmapBoardColumnResolved[] = [
  {
    status: FeatureStatus.Suggested,
    title: 'Suggested',
    visible: true,
    retentionAnchor: 'updated',
  },
  {
    status: FeatureStatus.Planned,
    title: 'Planned',
    visible: true,
    retentionAnchor: 'updated',
  },
];

function feature(
  id: string,
  status: FeatureStatus,
  created_at: string,
  updated_at: string,
): import('@rothenbergt/backstage-plugin-roadmap-common').Feature {
  return {
    id,
    title: id,
    description: 'd',
    status,
    author: 'user:default/x',
    votes: 0,
    created_at,
    updated_at,
  };
}

describe('filterFeaturesForBoardList', () => {
  it('drops features in non-visible columns', () => {
    const columns: RoadmapBoardColumnResolved[] = baseColumns.map(c =>
      c.status === FeatureStatus.Suggested ? { ...c, visible: false } : c,
    );
    const out = filterFeaturesForBoardList(
      [
        feature('a', FeatureStatus.Suggested, '2020-01-01', '2020-01-02'),
        feature('b', FeatureStatus.Planned, '2020-01-01', '2020-01-02'),
      ],
      columns,
      { includeBeyondRetention: false, datasource: 'database' },
    );
    expect(out.map(f => f.id)).toEqual(['b']);
  });

  it('does not apply retention for gitlab datasource', () => {
    const columns: RoadmapBoardColumnResolved[] = [
      {
        ...baseColumns[0],
        retentionDays: 1,
        retentionAnchor: 'updated',
      },
      baseColumns[1],
    ];
    const old = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const out = filterFeaturesForBoardList(
      [feature('a', FeatureStatus.Suggested, old, old)],
      columns,
      { includeBeyondRetention: false, datasource: 'gitlab' },
    );
    expect(out).toHaveLength(1);
  });

  it('includes beyond retention when flag is true (database)', () => {
    const columns: RoadmapBoardColumnResolved[] = [
      {
        ...baseColumns[0],
        retentionDays: 1,
        retentionAnchor: 'updated',
      },
      baseColumns[1],
    ];
    const old = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const out = filterFeaturesForBoardList(
      [feature('a', FeatureStatus.Suggested, old, old)],
      columns,
      { includeBeyondRetention: true, datasource: 'database' },
    );
    expect(out).toHaveLength(1);
  });

  it('excludes stale items by retentionAnchor created (database)', () => {
    const columns: RoadmapBoardColumnResolved[] = [
      {
        ...baseColumns[0],
        retentionDays: 10,
        retentionAnchor: 'created',
      },
      baseColumns[1],
    ];
    const oldCreated = new Date(
      Date.now() - 20 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const recentUpdated = new Date().toISOString();
    const out = filterFeaturesForBoardList(
      [feature('a', FeatureStatus.Suggested, oldCreated, recentUpdated)],
      columns,
      { includeBeyondRetention: false, datasource: 'database' },
    );
    expect(out).toHaveLength(0);
  });
});
