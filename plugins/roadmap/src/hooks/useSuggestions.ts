import { useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { alertApiRef } from '@backstage/core-plugin-api';
import { NewFeature } from '@rothenbergt/backstage-plugin-roadmap-common';

/**
 * Hook for managing feature suggestions
 * Handles form state and submission to the API
 */
export const useSuggestions = (onSubmitCallback: () => Promise<void>) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roadmapApi = useApi(roadmapApiRef);
  const alertApi = useApi(alertApiRef);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !description.trim()) {
      alertApi.post({
        message: 'Title and description are required.',
        severity: 'warning',
        display: 'transient',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newFeature: NewFeature = {
        title: title.trim(),
        description: description.trim(),
      };

      await roadmapApi.addFeature(newFeature);

      // Reset form
      setTitle('');
      setDescription('');

      alertApi.post({
        message: 'Feature suggestion submitted successfully!',
        severity: 'success',
        display: 'transient',
      });

      await onSubmitCallback();
    } catch (error) {
      alertApi.post({
        message: `Failed to submit feature: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        severity: 'error',
        display: 'transient',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    isSubmitting,
    handleSubmit,
  };
};
