import { useApi } from '@backstage/core-plugin-api';
import { useState, useCallback, useEffect } from 'react';
import { roadmapApiRef } from '../api';
import {
  Feature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { alertApiRef } from '@backstage/core-plugin-api';

const columnOrder: FeatureStatus[] = [
  FeatureStatus.Suggested,
  FeatureStatus.Planned,
  FeatureStatus.WontDo,
  FeatureStatus.Released,
];

/**
 * Hook for managing roadmap data
 * Fetches features and vote counts from the API and organizes them into columns
 */
export const useRoadmapData = () => {
  const roadmapApi = useApi(roadmapApiRef);
  const alertApi = useApi(alertApiRef);
  const [columns, setColumns] = useState<
    { title: string; features: Feature[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const features = await roadmapApi.getFeatures();

      let voteCounts: Record<string, number> = {};
      if (features.length > 0) {
        const featureIds = features.map(feature => feature.id);
        voteCounts = await roadmapApi.getVoteCounts(featureIds);
      }

      // Create an object to hold features for each status
      const columnMap = columnOrder.reduce((acc, status) => {
        acc[status] = [];
        return acc;
      }, {} as Record<FeatureStatus, Feature[]>);

      // Distribute features into their respective columns
      features.forEach(feature => {
        const updatedFeature = {
          ...feature,
          votes: voteCounts[feature.id] || feature.votes || 0,
        };

        if (columnMap[feature.status]) {
          columnMap[feature.status].push(updatedFeature);
        } else {
          alertApi.post({
            message: `Feature with unknown status: ${feature.status}`,
            severity: 'warning',
            display: 'transient',
          });
        }
      });

      // Create the final columns array in the specified order
      const orderedColumns = columnOrder.map(status => ({
        title: status,
        features: columnMap[status].sort((a, b) => b.votes - a.votes), // Sort by votes
      }));

      setColumns(orderedColumns);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      alertApi.post({
        message: `Failed to load roadmap data: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
        severity: 'error',
        display: 'transient',
      });
    } finally {
      setLoading(false);
    }
  }, [roadmapApi, alertApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { columns, loading, error, refetch: fetchData };
};
