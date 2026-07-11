import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoadmapBoard } from './features/board/RoadmapBoard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Signals invalidate caches instantly when installed, and window focus
      // refetching covers apps without them so an open board still catches up
      // on other users' changes.
      refetchOnWindowFocus: true,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export const WrappedRoadmapComponent = () => {
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(RoadmapBoard),
  );
};
