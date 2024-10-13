import React from 'react';
import { FeatureCard } from './FeatureCard';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';

interface FeatureColumnProps {
  features: Feature[];
  onFeatureClick: (feature: Feature) => void;
}

export const FeatureColumn: React.FC<FeatureColumnProps> = ({
  features,
  onFeatureClick,
}) => (
  <>
    {features.map(feature => (
      <FeatureCard
        key={feature.id}
        feature={feature}
        onClick={onFeatureClick}
      />
    ))}
  </>
);
