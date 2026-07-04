import {
  coreServices,
  createBackendModule,
  readSchedulerServiceTaskScheduleDefinitionFromConfig,
} from '@backstage/backend-plugin-api';
import { searchIndexRegistryExtensionPoint } from '@backstage/plugin-search-backend-node/alpha';
import { RoadmapCollatorFactory } from './collators/RoadmapCollatorFactory';

/**
 * Search backend module that registers the roadmap collator, so roadmap
 * features show up in Backstage global search.
 *
 * @public
 */
export const searchModuleRoadmapCollator = createBackendModule({
  pluginId: 'search',
  moduleId: 'roadmap',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        discovery: coreServices.discovery,
        scheduler: coreServices.scheduler,
        auth: coreServices.auth,
        indexRegistry: searchIndexRegistryExtensionPoint,
      },
      async init({
        logger,
        config,
        discovery,
        scheduler,
        auth,
        indexRegistry,
      }) {
        const defaultSchedule = {
          frequency: { minutes: 10 },
          timeout: { minutes: 15 },
          initialDelay: { seconds: 3 },
        };

        const schedule = config.has('search.collators.roadmap.schedule')
          ? readSchedulerServiceTaskScheduleDefinitionFromConfig(
              config.getConfig('search.collators.roadmap.schedule'),
            )
          : defaultSchedule;

        indexRegistry.addCollator({
          schedule: scheduler.createScheduledTaskRunner(schedule),
          factory: RoadmapCollatorFactory.fromConfig({
            logger,
            discovery,
            auth,
          }),
        });
      },
    });
  },
});
