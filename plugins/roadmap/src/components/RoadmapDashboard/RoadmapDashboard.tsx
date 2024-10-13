import React, { useState, useCallback } from 'react';
import {
  Grid,
  Button,
  Drawer,
  Box,
  useTheme,
  useMediaQuery,
  Typography,
  Paper,
} from '@mui/material';
import { Add as AddIcon } from '@material-ui/icons';
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
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between('md', 'lg'));

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

  const getGridItemProps = () => {
    if (isSmallScreen) {
      return { xs: 12 };
    } else if (isMediumScreen) {
      return { xs: 6 };
    } else {
      return { xs: 12 / 4 };
    }
  };

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

        <Grid container spacing={2} sx={{ overflowX: 'auto', pb: 2 }}>
          {roadmapColumns.map(column => {
            const columnData = columns.find(c => c.title === column.title) || {
              features: [],
            };
            const IconComponent = column.icon;
            return (
              <Grid item key={column.id} {...getGridItemProps()}>
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
              </Grid>
            );
          })}
        </Grid>
      </Content>

      <Drawer anchor="right" open={drawerOpen} onClose={handleDrawerClose}>
        <Box sx={{ width: 700, padding: 3 }}>
          <FeatureSuggestionForm
            onSubmit={handleIdeaSubmit}
            onClose={handleDrawerClose}
          />
        </Box>
      </Drawer>

      <FeatureDetailsDrawer
        feature={selectedFeature}
        open={Boolean(selectedFeature)}
        onClose={handleFeatureDetailsClose}
        onStatusChange={handleFeatureStatusChange}
      />
    </Page>
  );
};
