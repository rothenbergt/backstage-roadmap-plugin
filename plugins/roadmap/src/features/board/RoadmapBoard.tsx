import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useFeatures,
  useBoardConfig,
  useAdminStatus,
  useReorderFeatures,
  useRoadmapLiveUpdates,
} from '../../hooks';
import { FeatureCard } from '../../components';
import { FeatureDetailsDrawer } from '../details/FeatureDetailsDrawer';
import { CreateFeatureButton } from '../creation/CreateFeatureButton';
import {
  Content,
  ContentHeader,
  SupportButton,
  ResponseErrorPanel,
  Header,
  Page,
} from '@backstage/core-components';
import { Skeleton } from '@material-ui/lab';
import {
  Typography,
  Box,
  Paper,
  alpha,
  Switch,
  FormControlLabel,
} from '@material-ui/core';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import {
  Feature,
  FeatureStatus,
  RoadmapBoardColumnResolved,
} from '@rothenbergt/backstage-plugin-roadmap-common';
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
    padding: theme.spacing(1, 0, 2),
    height: 'calc(100vh - 200px)',
    gap: theme.spacing(2),
  },
  /** Equal share of row width for any visible column count (1–5); minWidth allows shrink with gap. */
  columnWrapper: {
    flex: '1 1 0',
    minWidth: 0,
  },
  columnHeader: {
    padding: theme.spacing(1.5, 2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  columnTitle: {
    fontWeight: 600,
    fontSize: '0.85rem',
    letterSpacing: 0.2,
    color: theme.palette.text.primary,
  },
  columnContent: {
    padding: theme.spacing(1.5),
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
  },
  column: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 12,
    backgroundColor:
      theme.palette.type === 'dark'
        ? alpha(theme.palette.background.paper, 0.6)
        : alpha(theme.palette.background.default, 0.6),
    border: `1px solid ${theme.palette.divider}`,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusCount: {
    marginLeft: 'auto',
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    padding: theme.spacing(0.25, 1),
    minWidth: 24,
    textAlign: 'center',
  },
  emptyState: {
    padding: theme.spacing(3, 2),
    textAlign: 'center',
    color: theme.palette.text.hint,
    border: `1px dashed ${theme.palette.divider}`,
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowWithReorder: {
    position: 'relative',
    /* Reorder arrows stay hidden until the row is hovered or focused */
    '&:hover $reorderRail, &:focus-within $reorderRail': {
      opacity: 1,
    },
  },
  /** Overlays the card's right edge so cards keep full column width. */
  reorderRail: {
    position: 'absolute',
    right: theme.spacing(1),
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.15s ease',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
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

const useStatusColors = (): Record<FeatureStatus, string> => {
  const theme = useTheme();
  return {
    [FeatureStatus.Suggested]: theme.palette.warning.main,
    [FeatureStatus.Planned]: theme.palette.info.main,
    [FeatureStatus.InProgress]: theme.palette.secondary.main,
    [FeatureStatus.Completed]: theme.palette.success.main,
    [FeatureStatus.Declined]: theme.palette.error.main,
  };
};

type FeatureWithVote = Feature & { hasVoted: boolean };

export const RoadmapBoard = () => {
  const classes = useStyles();
  const statusColors = useStatusColors();
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
  // Live board: refetch when the backend broadcasts changes over signals.
  useRoadmapLiveUpdates();
  const { mutate: reorder } = useReorderFeatures();
  // The `feature` search param is the source of truth for the details drawer,
  // so notification and search-result links can deep-link straight to a feature.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFeatureId = searchParams.get('feature');

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
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      params.set('feature', featureId);
      return params;
    });
  };

  const handleDrawerClose = () => {
    setSearchParams(
      prev => {
        const params = new URLSearchParams(prev);
        params.delete('feature');
        return params;
      },
      { replace: true },
    );
  };

  if (configLoading || featuresLoading) {
    return (
      <Page themeId="tool">
        <Header title="Public Roadmap" subtitle="Shape the Future with Us" />
        <Content className={classes.root}>
          <div className={classes.boardContainer}>
            {[0, 1, 2, 3].map(i => (
              <div className={classes.columnWrapper} key={i}>
                <Paper className={classes.column} elevation={0}>
                  <Box className={classes.columnHeader}>
                    <Skeleton variant="circle" width={8} height={8} />
                    <Skeleton variant="text" width={90} />
                  </Box>
                  <Box className={classes.columnContent}>
                    {[0, 1, 2].map(j => (
                      <Skeleton
                        key={j}
                        variant="rect"
                        height={72}
                        style={{ borderRadius: 10, marginBottom: 12 }}
                      />
                    ))}
                  </Box>
                </Paper>
              </div>
            ))}
          </div>
        </Content>
      </Page>
    );
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
            const list = featuresByStatus[col.status] ?? [];
            return (
              <div className={classes.columnWrapper} key={col.status}>
                <Paper className={classes.column} elevation={0}>
                  <Box className={classes.columnHeader}>
                    <span
                      className={classes.statusDot}
                      style={{ backgroundColor: statusColors[col.status] }}
                    />
                    <Typography
                      variant="subtitle2"
                      className={classes.columnTitle}
                    >
                      {col.title}
                    </Typography>
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
                        <Typography variant="body2">
                          {col.status === FeatureStatus.Suggested
                            ? 'No suggestions yet — be the first to suggest a feature!'
                            : 'Nothing here yet'}
                        </Typography>
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
