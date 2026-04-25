import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * API uses `FeatureStatus.InProgress` (`In Progress`); SQLite CHECK uses `InProgress`.
 * See migrations/20250330000000_init.js.
 */
export const DB_STATUS_IN_PROGRESS = 'InProgress';

/** Value written to the `features.status` column. */
export function statusToDb(status: FeatureStatus): string {
  return status === FeatureStatus.InProgress ? DB_STATUS_IN_PROGRESS : status;
}

/** Value returned to callers as `FeatureStatus`. */
export function statusFromDb(dbStatus: string): FeatureStatus {
  if (dbStatus === DB_STATUS_IN_PROGRESS) {
    return FeatureStatus.InProgress;
  }
  return dbStatus as FeatureStatus;
}
