import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';
import { useFeatures } from '../../hooks';

type FeatureWithVote = Feature & { hasVoted: boolean };

const MIN_QUERY_LENGTH = 4;
const MAX_RESULTS = 3;
const DEBOUNCE_MS = 250;

/**
 * Finds existing features that look similar to what the user is typing so
 * they can vote for an existing request instead of filing a duplicate.
 *
 * Matching happens entirely client side over the board data that is already
 * in the query cache. Roadmaps are small enough that fuzzy scoring a few
 * hundred titles per keystroke is cheap.
 */
export const useSimilarFeatures = (query: string): FeatureWithVote[] => {
  const { data: features } = useFeatures();
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const fuse = useMemo(() => {
    return new Fuse(features ?? [], {
      // Titles are short and descriptive so they carry most of the signal
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'description', weight: 0.3 },
      ],
      // Tight enough that a throwaway word does not surface weak matches,
      // loose enough to still catch rewordings and typos
      threshold: 0.3,
      minMatchCharLength: 3,
      ignoreLocation: true,
    });
  }, [features]);

  return useMemo(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return [];
    }
    return fuse
      .search(trimmed)
      .slice(0, MAX_RESULTS)
      .map(result => result.item);
  }, [fuse, debouncedQuery]);
};
