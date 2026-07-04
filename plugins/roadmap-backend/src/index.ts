/**
 * Backend for the roadmap plugin.
 *
 * @packageDocumentation
 */

export * from './routes/router';
export type { DatasourceType, RoadmapDatasource, GitlabConfig } from './types';
export { roadmapPlugin as default } from './plugin';
