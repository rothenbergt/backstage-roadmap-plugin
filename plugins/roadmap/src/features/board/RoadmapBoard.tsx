import { useMemo, useState, useCallback } from 'react';
import {
  useFeatures,
  useBoardConfig,
  useAdminStatus,
  useReorderFeatures,
} from '../../hooks';
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
import {
  Typography,
  Box,
  Paper,
  alpha,
  Switch,
  FormControlLabel,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  Feature,
  FeatureStatus,
  RoadmapBoardColumnResolved,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import LightbulbIcon from '@material-ui/icons/EmojiObjects';
import EventNoteIcon from '@material-ui/icons/EventNote';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import CancelOutlinedIcon from '@material-ui/icons/CancelOutlined';
import HourglassEmptyIcon from '@material-ui/icons/HourglassEmpty';
import IconButton from '@material-ui/core/IconButton';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';

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
  /** Equal share of row width for any visible column count (1–5); minWidth allows shrink with gap. */
  columnWrapper: {
    flex: '1 1 0',
    minWidth: 0,
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
  rowWithReorder: {
    display: 'flex',
    alignItems: 'stretch',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
  },
  reorderRail: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  /** Groups primary header actions so spacing is reliable inside ContentHeader. */
  contentHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    rowGap: theme.spacing(1.5),
    marginRight: theme.spacing(3),
    '& .MuiFormControlLabel-root': {
      marginLeft: 0,
      marginRight: 0,
    },
  },
}));

const STATUS_ICONS: Record<FeatureStatus, JSX.Element> = {
  [FeatureStatus.Suggested]: <LightbulbIcon />,
  [FeatureStatus.Planned]: <EventNoteIcon />,
  [FeatureStatus.InProgress]: <HourglassEmptyIcon />,
  [FeatureStatus.Completed]: <CheckCircleOutlineIcon />,
  [FeatureStatus.Declined]: <CancelOutlinedIcon />,
};

const STATUS_HEADER_CLASS: Record<
  FeatureStatus,
  | 'suggestedHeader'
  | 'plannedHeader'
  | 'inProgressHeader'
  | 'completedHeader'
  | 'declinedHeader'
> = {
  [FeatureStatus.Suggested]: 'suggestedHeader',
  [FeatureStatus.Planned]: 'plannedHeader',
  [FeatureStatus.InProgress]: 'inProgressHeader',
  [FeatureStatus.Completed]: 'completedHeader',
  [FeatureStatus.Declined]: 'declinedHeader',
};

type FeatureWithVote = Feature & { hasVoted: boolean };

export const RoadmapBoard = () => {
  const classes = useStyles();
  const [includeBeyondRetention, setIncludeBeyondRetention] = useState(false);
  const {
    data: boardConfig,
    isLoading: configLoading,
    error: configError,
  } = useBoardConfig();
  const {
    data: features,
    isLoading: featuresLoading,
    error,
  } = useFeatures(includeBeyondRetention);
  const { data: isAdmin } = useAdminStatus();
  const { mutate: reorder } = useReorderFeatures();
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );

  const visibleColumns = useMemo(() => {
    if (!boardConfig?.columns) return [];
    return boardConfig.columns.filter(c => c.visible);
  }, [boardConfig]);

  const showRetentionToggle =
    boardConfig?.capabilities.includeBeyondRetentionQuery &&
    boardConfig.columns.some(c => c.retentionDays && c.retentionDays > 0);

  const canReorder = Boolean(isAdmin && boardConfig?.capabilities.adminReorder);

  const featuresByStatus = useMemo(() => {
    if (!features) return {} as Record<string, FeatureWithVote[]>;
    return features.reduce((acc, feature) => {
      if (!acc[feature.status]) {
        acc[feature.status] = [];
      }
      acc[feature.status].push(feature);
      return acc;
    }, {} as Record<string, FeatureWithVote[]>);
  }, [features]);

  const handleReorder = useCallback(
    (status: FeatureStatus, orderedIds: string[]) => {
      reorder({ status, orderedIds });
    },
    [reorder],
  );

  const moveInColumn = useCallback(
    (status: FeatureStatus, id: string, dir: 'up' | 'down') => {
      const list = [...(featuresByStatus[status] ?? [])];
      const idx = list.findIndex(f => f.id === id);
      if (idx < 0) return;
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= list.length) return;
      const tmp = list[idx];
      list[idx] = list[swap]!;
      list[swap] = tmp!;
      handleReorder(
        status,
        list.map(f => f.id),
      );
    },
    [featuresByStatus, handleReorder],
  );

  const handleFeatureClick = (featureId: string) => {
    setSelectedFeatureId(featureId);
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setSelectedFeatureId(null);
  };

  if (configLoading || featuresLoading) {
    return <Progress />;
  }

  if (configError || error) {
    return (
      <ResponseErrorPanel
        error={
          (configError ?? error) instanceof Error
            ? (configError ?? error)!
            : new Error(String(configError ?? error))
        }
      />
    );
  }

  return (
    <Page themeId="tool">
      <Header title="Public Roadmap" subtitle="Shape the Future with Us" />
      <Content className={classes.root}>
        <ContentHeader title="">
          <Box className={classes.contentHeaderActions}>
            <CreateFeatureButton />
            {showRetentionToggle && (
              <FormControlLabel
                control={
                  <Switch
                    checked={includeBeyondRetention}
                    onChange={(_, v) => setIncludeBeyondRetention(v)}
                    color="primary"
                  />
                }
                label="Show all (including outdated)"
              />
            )}
          </Box>
          <SupportButton>
            The roadmap shows planned features and improvements. Vote on items
            to help prioritize what gets built next.
          </SupportButton>
        </ContentHeader>

        <div className={classes.boardContainer}>
          {visibleColumns.map((col: RoadmapBoardColumnResolved) => {
            const headerKey = STATUS_HEADER_CLASS[col.status];
            const list = featuresByStatus[col.status] ?? [];
            return (
              <div className={classes.columnWrapper} key={col.status}>
                <Paper className={classes.column}>
                  <Box
                    className={`${classes.columnHeader} ${
                      classes[headerKey as keyof typeof classes]
                    }`}
                  >
                    <span className={classes.iconMargin}>
                      {STATUS_ICONS[col.status]}
                    </span>
                    <Typography variant="subtitle2">{col.title}</Typography>
                    <span className={classes.statusCount}>{list.length}</span>
                  </Box>
                  <Box className={classes.columnContent}>
                    {list.map((feature, index) => (
                      <div className={classes.rowWithReorder} key={feature.id}>
                        {canReorder && (
                          <div className={classes.reorderRail}>
                            <IconButton
                              size="small"
                              aria-label="Move up"
                              disabled={index === 0}
                              onClick={e => {
                                e.stopPropagation();
                                moveInColumn(col.status, feature.id, 'up');
                              }}
                            >
                              <KeyboardArrowUpIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              aria-label="Move down"
                              disabled={index === list.length - 1}
                              onClick={e => {
                                e.stopPropagation();
                                moveInColumn(col.status, feature.id, 'down');
                              }}
                            >
                              <KeyboardArrowDownIcon fontSize="small" />
                            </IconButton>
                          </div>
                        )}
                        <Box flex={1} minWidth={0}>
                          <FeatureCard
                            feature={feature}
                            onClick={() => handleFeatureClick(feature.id)}
                          />
                        </Box>
                      </div>
                    ))}
                    {!list.length && (
                      <div className={classes.emptyState}>
                        <Typography variant="body2">No features yet</Typography>
                      </div>
                    )}
                  </Box>
                </Paper>
              </div>
            );
          })}
        </div>

        {selectedFeatureId && (
          <FeatureDetailsDrawer
            featureId={selectedFeatureId}
            open={Boolean(selectedFeatureId)}
            onClose={handleDrawerClose}
            capabilities={boardConfig?.capabilities}
          />
        )}
      </Content>
    </Page>
  );
};
