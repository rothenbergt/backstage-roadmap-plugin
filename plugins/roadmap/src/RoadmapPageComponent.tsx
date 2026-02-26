import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoadmapBoard } from './features/board/RoadmapBoard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
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
