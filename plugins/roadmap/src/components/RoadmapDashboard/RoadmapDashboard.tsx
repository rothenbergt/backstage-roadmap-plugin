import React, { useState, useCallback } from 'react';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import AddIcon from '@mui/icons-material/Add';
import { useRoadmapData } from '../../hooks/useRoadmapData';
import { FeatureColumn } from './FeatureColumn';
import { FeatureSuggestionForm } from '../FeatureSuggestionForm';
import { FeatureDetailsDrawer } from '../FeatureDetailsDrawer';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';
import {
  Progress,
  ResponseErrorPanel,
  Header,
  Page,
  Content,
  ContentHeader,
} from '@backstage/core-components';
import {
  defaultRoadmapColumns,
  getRoadmapColumnsWithStyles,
  RoadmapColumn,
} from './roadmapStructure';

export interface RoadmapDashboardProps {
  customColumns?: RoadmapColumn[];
}

/**
 * RoadmapDashboard Component
 * This component serves as the main entry point for the Roadmap plugin.
 */
export const RoadmapDashboard = (props: RoadmapDashboardProps): JSX.Element => {
  const { customColumns } = props;
  const { columns, loading, error, refetch } = useRoadmapData();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const theme = useTheme();

  const roadmapColumns = getRoadmapColumnsWithStyles(
    customColumns || defaultRoadmapColumns,
  );

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleIdeaSubmit = useCallback(async () => {
    await refetch();
    handleDrawerClose();
  }, [refetch, handleDrawerClose]);

  const handleFeatureClick = useCallback((feature: Feature) => {
    setSelectedFeature(feature);
  }, []);

  const handleFeatureDetailsClose = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  const handleFeatureStatusChange = useCallback(async () => {
    await refetch();
    setSelectedFeature(null);
  }, [refetch]);

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  return (
    <Page themeId="tool">
      <Header title="Public Roadmap" subtitle="Shape the Future with Us" />
      <Content>
        <ContentHeader title="">
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setDrawerOpen(true)}
          >
            Suggest Feature
          </Button>
        </ContentHeader>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            pb: 2,
            overflowX: 'auto',
          }}
        >
          {roadmapColumns.map(column => {
            const columnData = columns.find(c => c.title === column.title) || {
              features: [],
            };
            const IconComponent = column.icon;
            return (
              <Box
                key={column.id}
                sx={{
                  width: {
                    xs: '100%',
                    sm: 'calc(50% - 16px)',
                    md: 'calc(33.333% - 16px)',
                    lg: 'calc(25% - 16px)',
                  },
                  minWidth: '250px',
                }}
              >
                <Box sx={{ px: 2, pb: 2 }}>
                  <Paper
                    elevation={2}
                    sx={{
                      ...column.style,
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconComponent sx={{ fontSize: '1.5rem' }} />
                      <Typography
                        variant="h6"
                        component="h2"
                        sx={{ fontWeight: 600 }}
                      >
                        {`${column.title} (${columnData.features.length})`}
                      </Typography>
                    </Box>
                  </Paper>
                  <Box
                    sx={{
                      height: 'calc(100vh - 300px)',
                      overflowY: 'auto',
                      backgroundColor: theme.palette.background.default,
                    }}
                  >
                    <FeatureColumn
                      features={columnData.features}
                      onFeatureClick={handleFeatureClick}
                    />
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Content>

      <FeatureSuggestionForm
        open={drawerOpen}
        onSubmit={handleIdeaSubmit}
        onClose={handleDrawerClose}
      />

      <FeatureDetailsDrawer
        feature={selectedFeature}
        open={Boolean(selectedFeature)}
        onClose={handleFeatureDetailsClose}
        onStatusChange={handleFeatureStatusChange}
      />
    </Page>
  );
};
