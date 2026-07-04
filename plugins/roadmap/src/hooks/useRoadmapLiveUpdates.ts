import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSignal } from '@backstage/plugin-signals-react';
import {
  RoadmapSignal,
  SIGNALS_CHANNEL_ROADMAP,
} from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * Subscribes to the roadmap signals channel and refreshes react-query caches
 * whenever the backend broadcasts a board change, so open boards update live.
 *
 * Safe in apps without the signals plugin: useSignal simply reports signals
 * as unavailable and nothing happens.
 */
export const useRoadmapLiveUpdates = () => {
  const queryClient = useQueryClient();
  const { lastSignal } = useSignal<RoadmapSignal>(SIGNALS_CHANNEL_ROADMAP);

  useEffect(() => {
    if (!lastSignal) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['roadmap', 'features'] });

    if (lastSignal.featureId) {
      queryClient.invalidateQueries({
        queryKey: ['roadmap', 'feature', lastSignal.featureId],
      });
    }

    if (
      lastSignal.kind === 'comment_added' ||
      lastSignal.kind === 'comment_deleted'
    ) {
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'comments'] });
    }
  }, [lastSignal, queryClient]);
};
