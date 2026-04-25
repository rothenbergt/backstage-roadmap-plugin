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
 * Hook for fetching board features (server-filtered list).
 */
export const useFeatures = (includeBeyondRetention = false) => {
  const api = useApi(roadmapApiRef);

  return useQuery({
    queryKey: ['roadmap', 'features', { includeBeyondRetention }],
    queryFn: async () => {
      const features = await api.getFeatures({ includeBeyondRetention });

      const featureIds = features.map(f => f.id);
      const hasVotedMap =
        featureIds.length > 0 ? await api.hasVotedBatch(featureIds) : {};

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
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'features'] });
    },
  });
};

export const useUpdateFeatureDetails = () => {
  const api = useApi(roadmapApiRef);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: { title?: string; description?: string };
    }) => api.updateFeatureDetails(id, fields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'features'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'feature'] });
    },
  });
};

export const useDeleteFeature = () => {
  const api = useApi(roadmapApiRef);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteFeature(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'features'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap', 'feature'] });
    },
  });
};

export const useReorderFeatures = () => {
  const api = useApi(roadmapApiRef);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      status,
      orderedIds,
    }: {
      status: FeatureStatus;
      orderedIds: string[];
    }) => api.reorderFeatures(status, orderedIds),
    onSuccess: () => {
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

      queryClient.invalidateQueries({ queryKey: ['roadmap', 'features'] });
    },
  });
};
