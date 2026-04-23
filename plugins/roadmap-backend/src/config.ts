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
  const gitlab = config.getConfig('roadmap.gitlab');
  const apiBaseUrl = gitlab.getString('apiBaseUrl');
  const token = gitlab.getString('token');
  const projectId = gitlab.getOptionalString('projectId');
  const groupId = gitlab.getOptionalString('groupId');

  if (projectId && groupId) {
    throw new Error(
      'roadmap.gitlab: only one of projectId or groupId may be provided, not both',
    );
  }
  if (!projectId && !groupId) {
    throw new Error(
      'roadmap.gitlab: exactly one of projectId or groupId must be provided',
    );
  }

  return {
    apiBaseUrl,
    token,
    projectId,
    groupId,
    defaultProjectId: gitlab.getOptionalString('defaultProjectId'),
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
