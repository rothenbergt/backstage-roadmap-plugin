import { useState, useCallback, useEffect } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api/roadmapApi';
import { Comment } from '@rothenbergt/backstage-plugin-roadmap-common';
import { alertApiRef } from '@backstage/core-plugin-api';

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
      setError(
        err instanceof Error ? err : new Error('Failed to fetch comments'),
      );
      alertApi.post({
        message: 'Failed to fetch comments. Please try again.',
        severity: 'error',
        display: 'transient',
      });
    } finally {
      setIsLoading(false);
    }
  }, [featureId, roadmapApi, alertApi]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureId || !newComment.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const addedComment = await roadmapApi.addComment(featureId, newComment);
      setComments(prevComments => [...prevComments, addedComment]);
      setNewComment('');
      alertApi.post({
        message: 'Comment added successfully!',
        severity: 'success',
        display: 'transient',
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add comment'));
      alertApi.post({
        message: 'Failed to add comment. Please try again.',
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
  };
};
