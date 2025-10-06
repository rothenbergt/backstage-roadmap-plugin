import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  NewFeature,
  FeatureStatus,
  Feature,
} from '@rothenbergt/backstage-plugin-roadmap-common';

type FeatureWithVote = Feature & { hasVoted: boolean };

/**
 * Hook for fetching all features
 */
export const useFeatures = () => {
  const api = useApi(roadmapApiRef);

  return useQuery({
    queryKey: ['roadmap', 'features'],
    queryFn: async () => {
      const features = await api.getFeatures();

      // Batch check if the current user has voted on any features
      const featureIds = features.map(f => f.id);
      const hasVotedMap = await api.hasVotedBatch(featureIds);

      const featuresWithVoted = features.map(feature => ({
        ...feature,
        hasVoted: hasVotedMap[feature.id] || false,
      }));

      return featuresWithVoted;
    },
  });
};

/**
 * Hook for fetching a single feature by ID
 */
export const useFeature = (featureId: string) => {
  const api = useApi(roadmapApiRef);

  return useQuery({
    queryKey: ['roadmap', 'feature', featureId],
    queryFn: async () => {
      const feature = await api.getFeatureById(featureId);
      const hasVoted = await api.hasVoted(feature.id);
      return { ...feature, hasVoted };
    },
    enabled: Boolean(featureId),
  });
};

/**
 * Hook for creating a new feature
 */
export const useCreateFeature = () => {
  const api = useApi(roadmapApiRef);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newFeature: NewFeature) => api.createFeature(newFeature),
    onSuccess: () => {
      // Invalidate the features list to refetch it
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'features'] });
    },
  });
};

/**
 * Hook for updating a feature's status
 */
export const useUpdateFeatureStatus = () => {
  const api = useApi(roadmapApiRef);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeatureStatus }) =>
      api.updateFeatureStatus(id, status),
    onSuccess: updatedFeature => {
      // Update the feature in the cache
      queryClient.setQueryData(
        ['roadmap', 'feature', updatedFeature.id],
        (oldData: FeatureWithVote | undefined) => {
          if (!oldData) return { ...updatedFeature, hasVoted: false };
          return { ...oldData, ...updatedFeature };
        },
      );

      // Also update the feature in the features list
      queryClient.setQueryData<FeatureWithVote[]>(
        ['roadmap', 'features'],
        oldData => {
          if (!oldData) return [];
          return oldData.map(feature =>
            feature.id === updatedFeature.id
              ? { ...feature, ...updatedFeature }
              : feature,
          );
        },
      );
    },
  });
};
