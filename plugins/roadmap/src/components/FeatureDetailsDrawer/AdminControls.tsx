import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../../api/roadmapApi';
import {
  Feature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import {
  defaultRoadmapColumns,
  RoadmapColumn,
} from '../RoadmapDashboard/roadmapStructure';
import { alertApiRef } from '@backstage/core-plugin-api';

interface AdminControlsProps {
  feature: Feature;
  onStatusChange: (featureId: string, newStatus: FeatureStatus) => void;
  customColumns?: RoadmapColumn[];
}

export const AdminControls: React.FC<AdminControlsProps> = ({
  feature,
  onStatusChange,
  customColumns,
}) => {
  const roadmapApi = useApi(roadmapApiRef);
  const columns = customColumns || defaultRoadmapColumns;
  const alertApi = useApi(alertApiRef);

  const handleStatusChange = async (
    event: SelectChangeEvent<FeatureStatus>,
  ) => {
    const newStatus = event.target.value as FeatureStatus;
    try {
      await roadmapApi.updateFeatureStatus(feature.id, newStatus);
      onStatusChange(feature.id, newStatus);
    } catch (err) {
      alertApi.post({
        message: 'Failed to update status:',
        severity: 'error',
        display: 'transient',
      });
    }
  };

  return (
    <Box
      sx={{
        mt: 4,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Admin Controls
      </Typography>
      <FormControl fullWidth margin="normal">
        <Select
          labelId="status-select-label"
          value={feature.status}
          onChange={handleStatusChange}
        >
          {columns.map(column => (
            <MenuItem key={column.id} value={column.id as FeatureStatus}>
              {column.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
