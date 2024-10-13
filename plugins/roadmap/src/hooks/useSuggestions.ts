import { useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api/roadmapApi';
import { alertApiRef } from '@backstage/core-plugin-api';
import {
  Feature,
  NewFeature,
} from '@rothenbergt/backstage-plugin-roadmap-common';

export const useSuggestions = (
  onSubmitCallback: (addedFeature: Feature) => Promise<void>,
) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roadmapApi = useApi(roadmapApiRef);
  const alertApi = useApi(alertApiRef);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const newFeature: NewFeature = { title, description };
      const addedFeature: Feature = await roadmapApi.addFeature(newFeature);
      setTitle('');
      setDescription('');
      await onSubmitCallback(addedFeature);
      alertApi.post({
        message: 'Feature submitted successfully!',
        severity: 'success',
        display: 'transient',
      });
    } catch (error) {
      console.error('Failed to submit feature:', error);
      alertApi.post({
        message: 'Failed to submit feature. Please try again.',
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
