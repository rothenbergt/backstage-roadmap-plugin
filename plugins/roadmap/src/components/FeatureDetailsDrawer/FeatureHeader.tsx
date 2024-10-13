import React from 'react';
import { Typography, Box, IconButton, Paper } from '@mui/material';
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
  <Paper elevation={0} sx={{ p: 3, position: 'relative' }}>
    <IconButton
      aria-label="close"
      onClick={onClose}
      sx={{
        position: 'absolute',
        right: 8,
        top: 8,
        color: 'grey.500',
      }}
    >
      <CloseIcon />
    </IconButton>
    <Box sx={{ pt: 4 }}>
      <Typography variant="h5" gutterBottom>
        {feature.title}
      </Typography>
      <TextWithLinks text={feature.description} variant="body1" />
    </Box>
  </Paper>
);
