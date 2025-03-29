import { useState, useCallback } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';

export const useFeatureVote = (featureId: string, initialVotes: number) => {
  const [voteCount, setVoteCount] = useState(initialVotes);
  const [hasVoted, setHasVoted] = useState(false);
  const roadmapApi = useApi(roadmapApiRef);

  const toggleVote = useCallback(async () => {
    try {
      const { voteAdded, voteCount: newVoteCount } =
        await roadmapApi.toggleVote(featureId);
      setVoteCount(newVoteCount);
      setHasVoted(voteAdded);
    } catch (error) {
      console.error('Failed to toggle vote:', error);
    }
  }, [featureId, roadmapApi]);

  return { voteCount, hasVoted, toggleVote };
};
