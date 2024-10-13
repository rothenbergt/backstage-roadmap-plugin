import React from 'react';
import { Typography, Divider, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';
import { TextWithLinks } from '../common/TextWithLinks';

interface FeatureHeaderProps {
  feature: Feature;
  onClose: () => void;
}

export const FeatureHeader: React.FC<FeatureHeaderProps> = ({
  feature,
  onClose,
}) => (
  <Box sx={{ position: 'relative', mb: 2 }}>
    <IconButton
      aria-label="close"
      onClick={onClose}
      sx={{
        position: 'absolute',
        right: 8,
        top: 8,
        color: theme => theme.palette.grey[500],
      }}
    >
      <CloseIcon />
    </IconButton>
    <Typography variant="h5" gutterBottom>
      {feature.title}
    </Typography>
    <TextWithLinks text={feature.description} variant="body1" />
    <Divider sx={{ my: 2 }} />
  </Box>
);
