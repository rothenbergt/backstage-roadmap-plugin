import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { useQuery } from '@tanstack/react-query';

export const useBoardConfig = () => {
  const api = useApi(roadmapApiRef);
  return useQuery({
    queryKey: ['roadmap', 'board-config'],
    queryFn: () => api.getBoardConfig(),
    staleTime: 1000 * 60 * 5,
  });
};
