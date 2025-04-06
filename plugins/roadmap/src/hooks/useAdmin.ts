import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { useQuery } from 'react-query';

/**
 * Hook for checking if the current user is a roadmap admin
 */
export const useAdminStatus = () => {
  const api = useApi(roadmapApiRef);

  return useQuery(['roadmap', 'isAdmin'], () => api.isRoadmapAdmin(), {
    // Cache admin status for a while
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};
