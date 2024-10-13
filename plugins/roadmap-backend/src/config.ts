import { Config } from '@backstage/config';

export interface RoadmapBackendConfig {
  adminUsers: string[];
}

export function getRoadmapBackendConfig(config: Config): RoadmapBackendConfig {
  try {
    const roadmapConfig = config.getOptionalConfig('roadmap');
    return {
      adminUsers: roadmapConfig?.getOptionalStringArray('adminUsers') ?? [],
    };
  } catch (error) {
    return { adminUsers: [] };
  }
}
