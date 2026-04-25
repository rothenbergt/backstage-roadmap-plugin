import { ConfigReader } from '@backstage/config';
import {
  getBoardConfigResponse,
  getMergedBoardColumns,
  getRoadmapUiCapabilities,
} from './boardConfig';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';

describe('boardConfig', () => {
  it('defaults In Progress to hidden', () => {
    const config = new ConfigReader({});
    const cols = getMergedBoardColumns(config);
    const inProg = cols.find(c => c.status === FeatureStatus.InProgress);
    expect(inProg?.visible).toBe(false);
  });

  it('gitlab capabilities disable database-only features', () => {
    const caps = getRoadmapUiCapabilities('gitlab');
    expect(caps.adminReorder).toBe(false);
    expect(caps.adminEditTitleDescription).toBe(false);
    expect(caps.includeBeyondRetentionQuery).toBe(false);
  });

  it('merges optional column overrides from config', () => {
    const config = new ConfigReader({
      roadmap: {
        columns: [
          {
            status: 'Suggested',
            title: 'Ideas',
            visible: false,
            retentionDays: 30,
            retentionAnchor: 'created',
          },
        ],
      },
    });
    const cols = getMergedBoardColumns(config);
    const suggested = cols.find(c => c.status === FeatureStatus.Suggested)!;
    expect(suggested.title).toBe('Ideas');
    expect(suggested.visible).toBe(false);
    expect(suggested.retentionDays).toBe(30);
    expect(suggested.retentionAnchor).toBe('created');
  });

  it('getBoardConfigResponse bundles columns and capabilities', () => {
    const config = new ConfigReader({});
    const res = getBoardConfigResponse(config, 'database');
    expect(res.columns.length).toBeGreaterThan(0);
    expect(res.capabilities.adminReorder).toBe(true);
  });
});
