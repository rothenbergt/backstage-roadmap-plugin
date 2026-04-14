import { Config } from '@backstage/config';
import { GitlabConfig, DatasourceType } from './types';

/** Reads the configured datasource type, defaulting to 'database'. */
export function getDatasource(config: Config): DatasourceType {
  const source =
    config.getOptionalConfig('roadmap')?.getOptionalString('source') ??
    'database';
  if (source !== 'database' && source !== 'gitlab') {
    throw new Error(`Unknown roadmap datasource: ${source}`);
  }
  return source;
}

/** Reads the GitLab datasource configuration from `roadmap.gitlab.*`. */
export function getGitlabConfig(config: Config): GitlabConfig {
  return {
    apiBaseUrl: config.getString('roadmap.gitlab.apiBaseUrl'),
    token: config.getString('roadmap.gitlab.token'),
    projectId: config.getString('roadmap.gitlab.projectId'),
  };
}

/** Returns the list of admin user entity refs from `roadmap.adminUsers`. */
export function getAdminUsers(config: Config): string[] {
  return (
    config.getOptionalConfig('roadmap')?.getOptionalStringArray('adminUsers') ??
    []
  );
}

/** Checks whether the Backstage permission framework is enabled. */
export function isPermissionEnabled(config: Config): boolean {
  return config.getOptionalBoolean('permission.enabled') ?? false;
}
