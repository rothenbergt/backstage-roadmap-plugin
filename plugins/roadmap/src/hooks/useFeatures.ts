import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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

  return useQuery(['roadmap', 'features'], async () => {
    const features = await api.getFeatures();

    // For each feature, check if the current user has voted on it
    const featuresWithVoted = await Promise.all(
      features.map(async feature => {
        const hasVoted = await api.hasVoted(feature.id);
        return { ...feature, hasVoted };
      }),
    );

    return featuresWithVoted;
  });
};

/**
 * Hook for fetching a single feature by ID
 */
export const useFeature = (featureId: string) => {
  const api = useApi(roadmapApiRef);

  return useQuery(
    ['roadmap', 'feature', featureId],
    async () => {
      const feature = await api.getFeatureById(featureId);
      const hasVoted = await api.hasVoted(feature.id);
      return { ...feature, hasVoted };
    },
    {
      enabled: Boolean(featureId),
    },
  );
};

/**
 * Hook for creating a new feature
 */
export const useCreateFeature = () => {
  const api = useApi(roadmapApiRef);
  const queryClient = useQueryClient();

  return useMutation(
    (newFeature: NewFeature) => api.createFeature(newFeature),
    {
      onSuccess: () => {
        // Invalidate the features list to refetch it
        queryClient.invalidateQueries(['roadmap', 'features']);
      },
    },
  );
};

/**
 * Hook for updating a feature's status
 */
export const useUpdateFeatureStatus = () => {
  const api = useApi(roadmapApiRef);
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, status }: { id: string; status: FeatureStatus }) =>
      api.updateFeatureStatus(id, status),
    {
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
    },
  );
};
