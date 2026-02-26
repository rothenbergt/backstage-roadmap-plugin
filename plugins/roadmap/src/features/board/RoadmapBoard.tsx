import { useState, useMemo } from 'react';
import { useFeatures } from '../../hooks';
import { FeatureCard } from '../../components';
import { FeatureDetailsDrawer } from '../details/FeatureDetailsDrawer';
import { CreateFeatureButton } from '../creation/CreateFeatureButton';
import {
  Content,
  ContentHeader,
  SupportButton,
  ResponseErrorPanel,
  Progress,
  Header,
  Page,
} from '@backstage/core-components';
import { Typography, Box, Paper, alpha } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  Feature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import LightbulbIcon from '@material-ui/icons/EmojiObjects';
import EventNoteIcon from '@material-ui/icons/EventNote';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import CancelOutlinedIcon from '@material-ui/icons/CancelOutlined';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  boardContainer: {
    display: 'flex',
    padding: theme.spacing(2),
    height: 'calc(100vh - 200px)',
    gap: theme.spacing(3),
  },
  columnWrapper: {
    flex: '1 0 23%',
    maxWidth: '25%',
  },
  columnHeader: {
    padding: theme.spacing(1.5),
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
    display: 'flex',
    alignItems: 'center',
    borderBottom: 'none',
  },
  columnContent: {
    padding: theme.spacing(1.5),
    height: 'calc(100% - 56px)',
    overflowY: 'auto',
  },
  column: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
    border: `1px solid ${theme.palette.divider}`,
  },
  iconMargin: {
    marginRight: theme.spacing(1.5),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  statusCount: {
    marginLeft: 'auto',
    backgroundColor: theme.palette.background.default,
    borderRadius: '12px',
    padding: theme.spacing(0.5, 1.5),
    fontSize: '0.75rem',
    fontWeight: 'bold',
    minWidth: 24,
    textAlign: 'center',
  },
  // Status-specific column header colors
  suggestedHeader: {
    backgroundColor: alpha(theme.palette.warning.main, 0.12),
    color: theme.palette.warning.dark,
    '& $iconMargin': {
      color: theme.palette.warning.main,
    },
  },
  plannedHeader: {
    backgroundColor: alpha(theme.palette.info.main, 0.12),
    color: theme.palette.info.dark,
    '& $iconMargin': {
      color: theme.palette.info.main,
    },
  },
  inProgressHeader: {
    backgroundColor: alpha(theme.palette.secondary.main, 0.12),
    color: theme.palette.secondary.dark,
    '& $iconMargin': {
      color: theme.palette.secondary.main,
    },
  },
  completedHeader: {
    backgroundColor: alpha(theme.palette.success.main, 0.12),
    color: theme.palette.success.dark,
    '& $iconMargin': {
      color: theme.palette.success.main,
    },
  },
  declinedHeader: {
    backgroundColor: alpha(theme.palette.error.main, 0.12),
    color: theme.palette.error.dark,
    '& $iconMargin': {
      color: theme.palette.error.main,
    },
  },
  emptyState: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary,
    backgroundColor: alpha(theme.palette.background.default, 0.5),
    borderRadius: theme.spacing(1),
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

// Configuration for the columns
const columns = [
  {
    status: FeatureStatus.Suggested,
    title: 'Suggested',
    icon: <LightbulbIcon />,
    headerClass: 'suggestedHeader',
  },
  {
    status: FeatureStatus.Planned,
    title: 'Planned',
    icon: <EventNoteIcon />,
    headerClass: 'plannedHeader',
  },
  {
    status: FeatureStatus.Completed,
    title: 'Completed',
    icon: <CheckCircleOutlineIcon />,
    headerClass: 'completedHeader',
  },
  {
    status: FeatureStatus.Declined,
    title: 'Declined',
    icon: <CancelOutlinedIcon />,
    headerClass: 'declinedHeader',
  },
];

export const RoadmapBoard = () => {
  const classes = useStyles();
  const { data: features, isLoading, error } = useFeatures();
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );

  // Group features by status
  const featuresByStatus = useMemo(() => {
    if (!features) return {};

    return features.reduce((acc, feature) => {
      if (!acc[feature.status]) {
        acc[feature.status] = [];
      }
      acc[feature.status].push(feature);
      return acc;
    }, {} as Record<string, (Feature & { hasVoted: boolean })[]>);
  }, [features]);

  // Handle feature selection
  const handleFeatureClick = (featureId: string) => {
    setSelectedFeatureId(featureId);
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setSelectedFeatureId(null);
  };

  if (isLoading) {
    return <Progress />;
  }

  if (error) {
    return (
      <ResponseErrorPanel
        error={error instanceof Error ? error : new Error(String(error))}
      />
    );
  }

  return (
    <Page themeId="tool">
      <Header title="Public Roadmap" subtitle="Shape the Future with Us" />
      <Content className={classes.root}>
        <ContentHeader title="">
          <CreateFeatureButton />
          <SupportButton>
            The roadmap shows planned features and improvements. Vote on items
            to help prioritize what gets built next.
          </SupportButton>
        </ContentHeader>

        <div className={classes.boardContainer}>
          {columns.map(({ status, title, icon, headerClass }) => (
            <div className={classes.columnWrapper} key={status}>
              <Paper className={classes.column}>
                <Box
                  className={`${classes.columnHeader} ${
                    classes[headerClass as keyof typeof classes]
                  }`}
                >
                  <span className={classes.iconMargin}>{icon}</span>
                  <Typography variant="subtitle2">{title}</Typography>
                  <span className={classes.statusCount}>
                    {featuresByStatus[status]?.length || 0}
                  </span>
                </Box>
                <Box className={classes.columnContent}>
                  {featuresByStatus[status]?.map(feature => (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      onClick={() => handleFeatureClick(feature.id)}
                    />
                  ))}
                  {!featuresByStatus[status]?.length && (
                    <div className={classes.emptyState}>
                      <Typography variant="body2">No features yet</Typography>
                    </div>
                  )}
                </Box>
              </Paper>
            </div>
          ))}
        </div>

        {selectedFeatureId && (
          <FeatureDetailsDrawer
            featureId={selectedFeatureId}
            open={Boolean(selectedFeatureId)}
            onClose={handleDrawerClose}
          />
        )}
      </Content>
    </Page>
  );
};
