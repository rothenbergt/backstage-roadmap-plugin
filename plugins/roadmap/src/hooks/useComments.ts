import { useState, useCallback, useEffect } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { Comment } from '@rothenbergt/backstage-plugin-roadmap-common';
import { alertApiRef } from '@backstage/core-plugin-api';

/**
 * Hook for managing comments on a feature
 * Handles fetching, adding, and displaying comments
 */
export const useComments = (featureId: string | null) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const roadmapApi = useApi(roadmapApiRef);
  const alertApi = useApi(alertApiRef);

  const fetchComments = useCallback(async () => {
    if (!featureId) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedComments = await roadmapApi.getComments(featureId);
      setComments(fetchedComments);
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error('Failed to fetch comments');
      setError(errorObj);

      alertApi.post({
        message: `Failed to fetch comments: ${errorObj.message}`,
        severity: 'error',
        display: 'transient',
      });
    } finally {
      setIsLoading(false);
    }
  }, [featureId, roadmapApi, alertApi]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!featureId) {
      alertApi.post({
        message: 'No feature selected to comment on',
        severity: 'error',
        display: 'transient',
      });
      return;
    }

    if (!newComment.trim()) {
      alertApi.post({
        message: 'Comment cannot be empty',
        severity: 'warning',
        display: 'transient',
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const addedComment = await roadmapApi.addComment(
        featureId,
        newComment.trim(),
      );
      setComments(prevComments => [addedComment, ...prevComments]);
      setNewComment('');

      alertApi.post({
        message: 'Comment added successfully!',
        severity: 'success',
        display: 'transient',
      });
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error('Failed to add comment');
      setError(errorObj);

      alertApi.post({
        message: `Failed to add comment: ${errorObj.message}`,
        severity: 'error',
        display: 'transient',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (featureId) {
      fetchComments();
    } else {
      setComments([]);
      setNewComment('');
      setError(null);
    }
  }, [featureId, fetchComments]);

  return {
    comments,
    newComment,
    setNewComment,
    handleSubmitComment,
    isLoading,
    error,
    refetchComments: fetchComments,
  };
};
