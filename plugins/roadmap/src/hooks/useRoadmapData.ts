import { useApi } from '@backstage/core-plugin-api';
import { useState, useCallback, useEffect } from 'react';
import { roadmapApiRef } from '../api';
import {
  Feature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';

const columnOrder: FeatureStatus[] = [
  FeatureStatus.Suggested,
  FeatureStatus.Planned,
  FeatureStatus.WontDo,
  FeatureStatus.Released,
];

export const useRoadmapData = () => {
  const roadmapApi = useApi(roadmapApiRef);
  const [columns, setColumns] = useState<
    { title: string; features: Feature[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const features = await roadmapApi.getFeatures();
      const featureIds = features.map(feature => feature.id);
      const voteCounts = await roadmapApi.getVoteCounts(featureIds);

      // Create an object to hold features for each status
      const columnMap = columnOrder.reduce((acc, status) => {
        acc[status] = [];
        return acc;
      }, {} as Record<FeatureStatus, Feature[]>);

      // Distribute features into their respective columns
      features.forEach(feature => {
        const updatedFeature = {
          ...feature,
          votes: voteCounts[feature.id] || 0,
        };
        if (columnMap[feature.status]) {
          columnMap[feature.status].push(updatedFeature);
        } else {
          console.warn(`Unknown status: ${feature.status}`);
        }
      });

      // Create the final columns array in the specified order
      const orderedColumns = columnOrder.map(status => ({
        title: status,
        features: columnMap[status],
      }));

      setColumns(orderedColumns);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [roadmapApi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { columns, loading, error, refetch: fetchData };
};
