/**
 * Search backend module that indexes roadmap features.
 *
 * @packageDocumentation
 */
export { searchModuleRoadmapCollator as default } from './module';
export {
  RoadmapCollatorFactory,
  type RoadmapCollatorFactoryOptions,
  type IndexableRoadmapDocument,
} from './collators/RoadmapCollatorFactory';
