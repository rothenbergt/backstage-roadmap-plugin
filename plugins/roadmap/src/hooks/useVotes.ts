import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { useMutation, useQueryClient } from 'react-query';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';

interface FeatureWithVote extends Feature {
  hasVoted: boolean;
}

interface MutationContext {
  previousFeatures?: FeatureWithVote[];
  previousFeature?: FeatureWithVote;
}

/**
 * Hook for toggling a vote on a feature
 */
export const useToggleVote = () => {
  const apiInstance = useApi(roadmapApiRef);
  const queryClient = useQueryClient();
  
  return useMutation<unknown, unknown, string, MutationContext>(
    (featureId: string) => apiInstance.toggleVote(featureId),
    {
      // Optimistically update the UI before the backend confirms
      onMutate: async (featureId) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries(['roadmap', 'features']);
        await queryClient.cancelQueries(['roadmap', 'feature', featureId]);
        
        // Get snapshot of current data
        const previousFeatures = queryClient.getQueryData<FeatureWithVote[]>(['roadmap', 'features']);
        const previousFeature = queryClient.getQueryData<FeatureWithVote>(['roadmap', 'feature', featureId]);
        
        // Optimistically update the features list
        queryClient.setQueryData<FeatureWithVote[]>(['roadmap', 'features'], (old) => {
          if (!old) return [];
          return old.map((feature) => 
            feature.id === featureId
              ? {
                  ...feature,
                  hasVoted: !feature.hasVoted,
                  votes: feature.hasVoted ? feature.votes - 1 : feature.votes + 1,
                }
              : feature
          );
        });
        
        // Optimistically update the individual feature if it's in cache
        if (previousFeature) {
          queryClient.setQueryData<FeatureWithVote>(['roadmap', 'feature', featureId], (old) => {
            if (!old) {
              // This should not happen since we already checked for previousFeature,
              // but TypeScript doesn't know that
              return previousFeature;
            }
            return {
              ...old,
              hasVoted: !old.hasVoted,
              votes: old.hasVoted ? old.votes - 1 : old.votes + 1,
            };
          });
        }
        
        // Return the snapshot so we can rollback if needed
        return { previousFeatures, previousFeature };
      },
      
      // If the mutation fails, use the context we saved to roll back
      onError: (_err, featureId, context) => {
        if (context?.previousFeatures) {
          queryClient.setQueryData(['roadmap', 'features'], context.previousFeatures);
        }
        if (context?.previousFeature) {
          queryClient.setQueryData(['roadmap', 'feature', featureId], context.previousFeature);
        }
      },
      
      // Always refetch after error or success to ensure consistency
      onSettled: (_data, _error, featureId) => {
        queryClient.invalidateQueries(['roadmap', 'feature', featureId]);
        queryClient.invalidateQueries(['roadmap', 'features']);
      },
    }
  );
};

