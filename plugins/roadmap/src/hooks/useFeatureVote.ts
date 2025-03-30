import { useState, useCallback, useEffect } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { alertApiRef } from '@backstage/core-plugin-api';

/**
 * Hook for managing feature votes
 * Handles vote toggling and tracking vote state
 */
export const useFeatureVote = (featureId: string, initialVotes: number) => {
  const [voteCount, setVoteCount] = useState(initialVotes);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const roadmapApi = useApi(roadmapApiRef);
  const alertApi = useApi(alertApiRef);

  // Check if user has already voted when the component mounts
  useEffect(() => {
    let isMounted = true;

    const checkUserVoted = async () => {
      try {
        const voted = await roadmapApi.hasUserVoted(featureId);
        if (isMounted) {
          setHasVoted(voted);
        }
      } catch (error) {
        if (isMounted) {
          alertApi.post({
            message: `Failed to check vote status: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            severity: 'warning',
            display: 'transient',
          });
        }
      }
    };

    checkUserVoted();

    return () => {
      isMounted = false;
    };
  }, [featureId, roadmapApi, alertApi]);

  const toggleVote = useCallback(async () => {
    setIsLoading(true);
    try {
      const { voteAdded, voteCount: newVoteCount } =
        await roadmapApi.toggleVote(featureId);
      setVoteCount(newVoteCount);
      setHasVoted(voteAdded);
    } catch (error) {
      alertApi.post({
        message: `Failed to toggle vote: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        severity: 'error',
        display: 'transient',
      });
    } finally {
      setIsLoading(false);
    }
  }, [featureId, roadmapApi, alertApi]);

  return { voteCount, hasVoted, toggleVote, isLoading };
};
