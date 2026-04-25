import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import {
  DB_STATUS_IN_PROGRESS,
  statusFromDb,
  statusToDb,
} from './statusDbMapping';

describe('statusDbMapping', () => {
  it('maps In Progress API value to DB enum', () => {
    expect(statusToDb(FeatureStatus.InProgress)).toBe(DB_STATUS_IN_PROGRESS);
  });

  it('passes through other statuses unchanged', () => {
    expect(statusToDb(FeatureStatus.Suggested)).toBe('Suggested');
    expect(statusToDb(FeatureStatus.Planned)).toBe('Planned');
    expect(statusToDb(FeatureStatus.Completed)).toBe('Completed');
    expect(statusToDb(FeatureStatus.Declined)).toBe('Declined');
  });

  it('maps DB InProgress to FeatureStatus.InProgress', () => {
    expect(statusFromDb(DB_STATUS_IN_PROGRESS)).toBe(FeatureStatus.InProgress);
  });

  it('passes through other DB values unchanged', () => {
    expect(statusFromDb('Suggested')).toBe(FeatureStatus.Suggested);
    expect(statusFromDb('Planned')).toBe(FeatureStatus.Planned);
  });

  it('round-trips In Progress', () => {
    const api = FeatureStatus.InProgress;
    const db = statusToDb(api);
    expect(statusFromDb(db)).toBe(api);
  });
});
