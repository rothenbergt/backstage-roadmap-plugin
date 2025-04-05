import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Comment } from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * Hook for fetching comments for a feature
 */
export const useComments = (featureId: string) => {
  const api = useApi(roadmapApiRef);
  
  return useQuery(
    ['roadmap', 'comments', featureId],
    () => api.getCommentsByFeatureId(featureId),
    {
      enabled: Boolean(featureId),
      // Comments don't change that often, so we can cache them for a while
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );
};

/**
 * Hook for adding a comment to a feature
 */
export const useAddComment = (featureId: string) => {
  const api = useApi(roadmapApiRef);
  const queryClient = useQueryClient();
  
  return useMutation(
    (text: string) => api.addComment({ featureId, text }),
    {
      onSuccess: (newComment) => {
        // Add the new comment to the cache
        queryClient.setQueryData<Comment[]>(
          ['roadmap', 'comments', featureId],
          (oldComments) => [...(oldComments || []), newComment]
        );
      },
    }
  );
};