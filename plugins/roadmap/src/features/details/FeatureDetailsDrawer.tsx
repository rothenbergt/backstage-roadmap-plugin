import { useEffect, useState, useCallback } from 'react';
import {
  useFeature,
  useUpdateFeatureStatus,
  useAdminStatus,
  useUpdateFeatureDetails,
  useDeleteFeature,
  useBoardConfig,
} from '../../hooks';
import { CommentSection } from './CommentSection';
import { StatusChip, VoteButton } from '../../components';
import { formatDateUTC } from './dateUtils';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import {
  FeatureStatus,
  RoadmapUiCapabilities,
} from '@rothenbergt/backstage-plugin-roadmap-common';
import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import {
  MarkdownContent,
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import {
  useApi,
  alertApiRef,
  identityApiRef,
} from '@backstage/core-plugin-api';
import { EntityDisplayName } from '@backstage/plugin-catalog-react';

const useStyles = makeStyles(theme => ({
  drawer: {
    width: 550,
    maxWidth: '100%',
  },
  header: {
    padding: theme.spacing(3),
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
  },
  content: {
    padding: theme.spacing(0, 3, 3),
  },
  section: {
    marginBottom: theme.spacing(3),
  },
  title: {
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    paddingRight: theme.spacing(4),
  },
  description: {
    marginBottom: theme.spacing(3),
    whiteSpace: 'pre-wrap',
    '& p': {
      margin: 0,
    },
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  metaItem: {
    marginRight: theme.spacing(3),
  },
  metaLabel: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  metaValue: {
    fontSize: '0.875rem',
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  statusActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2, 0),
  },
  voteContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  headerActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    '& > *:first-child': {
      marginRight: theme.spacing(1),
    },
  },
}));

type FeatureDetailsDrawerProps = {
  featureId: string;
  open: boolean;
  onClose: () => void;
  capabilities?: RoadmapUiCapabilities;
};

const defaultCapabilities: RoadmapUiCapabilities = {
  retentionFiltering: false,
  includeBeyondRetentionQuery: false,
  adminEditTitleDescription: false,
  adminDeleteFeature: false,
  adminDeleteComment: false,
  creatorEditDeleteSuggested: false,
  adminReorder: false,
};

function entityRefsEqual(a: string, b: string | undefined): boolean {
  if (!b) {
    return false;
  }
  try {
    const opts = { defaultKind: 'user' as const, defaultNamespace: 'default' };
    return (
      stringifyEntityRef(parseEntityRef(a, opts)) ===
      stringifyEntityRef(parseEntityRef(b, opts))
    );
  } catch {
    return a === b;
  }
}

export const FeatureDetailsDrawer = ({
  featureId,
  open,
  onClose,
  capabilities: capabilitiesProp,
}: FeatureDetailsDrawerProps) => {
  const classes = useStyles();
  const alertApi = useApi(alertApiRef);
  const identityApi = useApi(identityApiRef);
  const caps = capabilitiesProp ?? defaultCapabilities;
  const [userEntityRef, setUserEntityRef] = useState<string | undefined>();
  const [editingDetails, setEditingDetails] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: feature, isLoading, error } = useFeature(featureId);
  const { data: isAdmin = false } = useAdminStatus();
  const { data: boardConfig } = useBoardConfig();
  const {
    mutate: updateStatus,
    isPending: isUpdating,
    error: updateError,
    isSuccess: isUpdateSuccess,
    data: updatedFeature,
  } = useUpdateFeatureStatus();
  const {
    mutate: updateDetails,
    isPending: isSavingDetails,
    error: updateDetailsError,
  } = useUpdateFeatureDetails();
  const {
    mutate: deleteFeature,
    isPending: isDeletingFeature,
    error: deleteFeatureError,
  } = useDeleteFeature();

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setUserEntityRef(identity.userEntityRef);
    });
  }, [identityApi]);

  const beginEditDetails = useCallback(() => {
    if (!feature) {
      return;
    }
    setTitleDraft(feature.title);
    setDescriptionDraft(feature.description);
    setDetailsError('');
    setEditingDetails(true);
  }, [feature]);

  useEffect(() => {
    if (!open) {
      setEditingDetails(false);
      setDetailsError('');
      setDeleteDialogOpen(false);
    }
  }, [open]);

  // Show alert when error occurs
  useEffect(() => {
    if (error) {
      alertApi.post({
        message: `Failed to load feature: ${
          error instanceof Error ? error.message : String(error)
        }`,
        severity: 'error',
        display: 'transient',
      });
    }
  }, [error, alertApi]);

  // Show alert when update error occurs
  useEffect(() => {
    if (updateError) {
      alertApi.post({
        message: `Failed to update feature status: ${
          updateError instanceof Error
            ? updateError.message
            : String(updateError)
        }`,
        severity: 'error',
        display: 'transient',
      });
    }
  }, [updateError, alertApi]);

  useEffect(() => {
    if (updateDetailsError) {
      alertApi.post({
        message: `Failed to save feature: ${
          updateDetailsError instanceof Error
            ? updateDetailsError.message
            : String(updateDetailsError)
        }`,
        severity: 'error',
        display: 'transient',
      });
    }
  }, [updateDetailsError, alertApi]);

  useEffect(() => {
    if (deleteFeatureError) {
      alertApi.post({
        message: `Failed to delete feature: ${
          deleteFeatureError instanceof Error
            ? deleteFeatureError.message
            : String(deleteFeatureError)
        }`,
        severity: 'error',
        display: 'transient',
      });
    }
  }, [deleteFeatureError, alertApi]);

  // Show success message when status is updated
  useEffect(() => {
    if (isUpdateSuccess && updatedFeature && boardConfig) {
      const column = boardConfig.columns.find(
        c => c.status === updatedFeature.status,
      );
      const statusTitle = column?.title ?? updatedFeature.status;
      alertApi.post({
        message: `Feature status updated to ${statusTitle}`,
        severity: 'success',
        display: 'transient',
      });
    }
  }, [isUpdateSuccess, updatedFeature, alertApi, boardConfig]);

  const handleStatusChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newStatus = event.target.value as FeatureStatus;
    updateStatus({ id: featureId, status: newStatus });
  };

  const formatDate = (dateString: string) => {
    return formatDateUTC(dateString);
  };

  const renderDrawerContent = () => {
    if (isLoading) {
      return (
        <Box p={3}>
          <Progress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box p={3}>
          <ResponseErrorPanel
            error={error instanceof Error ? error : new Error(String(error))}
          />
        </Box>
      );
    }

    if (!feature) {
      return (
        <Box p={3}>
          <Typography>Feature not found</Typography>
        </Box>
      );
    }

    const isAuthor = entityRefsEqual(feature.author, userEntityRef);
    const canEditDetails =
      (isAdmin && caps.adminEditTitleDescription) ||
      (caps.creatorEditDeleteSuggested &&
        feature.status === FeatureStatus.Suggested &&
        isAuthor);
    const canDeleteFeature =
      (isAdmin && caps.adminDeleteFeature) ||
      (caps.creatorEditDeleteSuggested &&
        feature.status === FeatureStatus.Suggested &&
        isAuthor);

    const handleSaveDetails = () => {
      const title = titleDraft.trim();
      if (!title) {
        setDetailsError('Title is required');
        return;
      }
      setDetailsError('');
      updateDetails(
        { id: featureId, fields: { title, description: descriptionDraft } },
        {
          onSuccess: () => {
            setEditingDetails(false);
            alertApi.post({
              message: 'Feature updated',
              severity: 'success',
              display: 'transient',
            });
          },
        },
      );
    };

    const runDeleteFeature = () => {
      deleteFeature(featureId, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          alertApi.post({
            message: 'Feature deleted',
            severity: 'success',
            display: 'transient',
          });
          onClose();
        },
      });
    };

    return (
      <>
        <Box className={classes.header}>
          <IconButton
            className={classes.closeButton}
            edge="end"
            onClick={onClose}
            aria-label="close"
            size="small"
          >
            <CloseIcon />
          </IconButton>

          {editingDetails ? (
            <>
              <TextField
                label="Title"
                variant="outlined"
                fullWidth
                className={classes.title}
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                error={Boolean(detailsError)}
                helperText={detailsError}
                disabled={isSavingDetails}
              />
              <TextField
                label="Description"
                variant="outlined"
                fullWidth
                multiline
                minRows={4}
                className={classes.description}
                value={descriptionDraft}
                onChange={e => setDescriptionDraft(e.target.value)}
                disabled={isSavingDetails}
              />
              <div className={classes.headerActions}>
                <Button
                  color="primary"
                  variant="contained"
                  disabled={isSavingDetails}
                  onClick={handleSaveDetails}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  disabled={isSavingDetails}
                  onClick={() => setEditingDetails(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <Typography variant="h5" className={classes.title}>
                {feature.title}
              </Typography>

              <div className={classes.description}>
                <MarkdownContent content={feature.description} />
              </div>
              {canEditDetails && (
                <div className={classes.headerActions}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={beginEditDetails}
                  >
                    Edit title & description
                  </Button>
                </div>
              )}
            </>
          )}

          <Grid container spacing={2} className={classes.metaRow}>
            <Grid item xs={6}>
              <div className={classes.metaItem}>
                <Typography variant="body2" className={classes.metaLabel}>
                  Suggested by
                </Typography>
                <Typography variant="body2" className={classes.metaValue}>
                  <EntityDisplayName
                    entityRef={parseEntityRef(feature.author, {
                      defaultKind: 'user',
                      defaultNamespace: 'default',
                    })}
                    defaultKind="user"
                  />
                </Typography>
              </div>
            </Grid>
            <Grid item xs={6}>
              <div className={classes.metaItem}>
                <Typography variant="body2" className={classes.metaLabel}>
                  Created
                </Typography>
                <Typography variant="body2" className={classes.metaValue}>
                  {formatDate(feature.created_at)}
                </Typography>
              </div>
              {feature.created_at !== feature.updated_at && (
                <div className={classes.metaItem} style={{ marginTop: '8px' }}>
                  <Typography variant="body2" className={classes.metaLabel}>
                    Updated
                  </Typography>
                  <Typography variant="body2" className={classes.metaValue}>
                    {formatDate(feature.updated_at)}
                  </Typography>
                </div>
              )}
            </Grid>
          </Grid>
        </Box>

        <Divider />

        <Box className={classes.content}>
          <Box className={classes.statusActions}>
            <Box className={classes.voteContainer}>
              <VoteButton
                featureId={feature.id}
                hasVoted={feature.hasVoted}
                voteCount={feature.votes}
                size="large"
              />
            </Box>

            <Box className={classes.statusContainer}>
              <StatusChip status={feature.status} />

              {isAdmin && boardConfig && (
                <FormControl
                  variant="outlined"
                  size="small"
                  style={{ minWidth: 150, marginLeft: '16px' }}
                >
                  <InputLabel id="status-select-label">
                    Change Status
                  </InputLabel>
                  <Select
                    labelId="status-select-label"
                    value={feature.status}
                    onChange={handleStatusChange}
                    label="Change Status"
                    disabled={isUpdating}
                  >
                    {boardConfig.columns
                      .filter(col => col.visible)
                      .map(col => (
                        <MenuItem key={col.status} value={col.status}>
                          {col.title}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
              {canDeleteFeature && (
                <Button
                  color="secondary"
                  variant="outlined"
                  disabled={isDeletingFeature || editingDetails}
                  onClick={() => setDeleteDialogOpen(true)}
                  style={{ marginLeft: '16px' }}
                >
                  Delete feature
                </Button>
              )}
            </Box>
          </Box>

          <Divider className={classes.divider} />

          <Box className={classes.section}>
            <CommentSection
              featureId={featureId}
              canDeleteComments={Boolean(isAdmin && caps.adminDeleteComment)}
            />
          </Box>
        </Box>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => !isDeletingFeature && setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete feature?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This removes the feature and its comments. This cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingFeature}
            >
              Cancel
            </Button>
            <Button
              color="secondary"
              variant="contained"
              disabled={isDeletingFeature}
              onClick={runDeleteFeature}
            >
              {isDeletingFeature ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      classes={{ paper: classes.drawer }}
    >
      {renderDrawerContent()}
    </Drawer>
  );
};
