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
  Tooltip,
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
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
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
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { EntityRefLink } from '@backstage/plugin-catalog-react';

const useStyles = makeStyles(theme => ({
  drawer: {
    width: 560,
    maxWidth: '100%',
  },
  header: {
    padding: theme.spacing(3),
    position: 'relative',
  },
  headerButtons: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
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
  chipRow: {
    marginBottom: theme.spacing(1.5),
  },
  metaLine: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(2),
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
  },
  metaSeparator: {
    color: theme.palette.text.hint,
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  statusActions: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1.5, 2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
  },
  voteLabel: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
  },
  adminControls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginLeft: 'auto',
  },
  headerActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
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
  const toastApi = useApi(toastApiRef);
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
      toastApi.post({
        title: `Failed to load feature: ${
          error instanceof Error ? error.message : String(error)
        }`,
        status: 'danger',
        timeout: 5000,
      });
    }
  }, [error, toastApi]);

  // Show alert when update error occurs
  useEffect(() => {
    if (updateError) {
      toastApi.post({
        title: `Failed to update feature status: ${
          updateError instanceof Error
            ? updateError.message
            : String(updateError)
        }`,
        status: 'danger',
        timeout: 5000,
      });
    }
  }, [updateError, toastApi]);

  useEffect(() => {
    if (updateDetailsError) {
      toastApi.post({
        title: `Failed to save feature: ${
          updateDetailsError instanceof Error
            ? updateDetailsError.message
            : String(updateDetailsError)
        }`,
        status: 'danger',
        timeout: 5000,
      });
    }
  }, [updateDetailsError, toastApi]);

  useEffect(() => {
    if (deleteFeatureError) {
      toastApi.post({
        title: `Failed to delete feature: ${
          deleteFeatureError instanceof Error
            ? deleteFeatureError.message
            : String(deleteFeatureError)
        }`,
        status: 'danger',
        timeout: 5000,
      });
    }
  }, [deleteFeatureError, toastApi]);

  // Show success message when status is updated
  useEffect(() => {
    if (isUpdateSuccess && updatedFeature && boardConfig) {
      const column = boardConfig.columns.find(
        c => c.status === updatedFeature.status,
      );
      const statusTitle = column?.title ?? updatedFeature.status;
      toastApi.post({
        title: `Feature status updated to ${statusTitle}`,
        status: 'success',
        timeout: 5000,
      });
    }
  }, [isUpdateSuccess, updatedFeature, toastApi, boardConfig]);

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
            toastApi.post({
              title: 'Feature updated',
              status: 'success',
              timeout: 5000,
            });
          },
        },
      );
    };

    const runDeleteFeature = () => {
      deleteFeature(featureId, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          toastApi.post({
            title: 'Feature deleted',
            status: 'success',
            timeout: 5000,
          });
          onClose();
        },
      });
    };

    return (
      <>
        <Box className={classes.header}>
          <Box className={classes.headerButtons}>
            {canEditDetails && !editingDetails && (
              <Tooltip title="Edit title & description">
                <IconButton
                  onClick={beginEditDetails}
                  aria-label="Edit title and description"
                  size="small"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={onClose} aria-label="close" size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {editingDetails ? (
            <>
              <TextField
                id="edit-feature-title"
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
                id="edit-feature-description"
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
              <div className={classes.chipRow}>
                <StatusChip status={feature.status} />
              </div>

              <Typography variant="h5" className={classes.title}>
                {feature.title}
              </Typography>

              <div className={classes.description}>
                <MarkdownContent content={feature.description} />
              </div>
            </>
          )}

          <Typography component="div" className={classes.metaLine}>
            <span>
              Suggested by{' '}
              <EntityRefLink
                entityRef={parseEntityRef(feature.author, {
                  defaultKind: 'user',
                  defaultNamespace: 'default',
                })}
                defaultKind="user"
              />
            </span>
            <span className={classes.metaSeparator}>·</span>
            <span>Created {formatDate(feature.createdAt)}</span>
            {feature.createdAt !== feature.updatedAt && (
              <>
                <span className={classes.metaSeparator}>·</span>
                <span>Updated {formatDate(feature.updatedAt)}</span>
              </>
            )}
          </Typography>
        </Box>

        <Divider />

        <Box className={classes.content}>
          <Box className={classes.statusActions}>
            <VoteButton
              featureId={feature.id}
              hasVoted={feature.hasVoted}
              voteCount={feature.votes}
              size="medium"
            />
            <Typography className={classes.voteLabel}>
              {feature.hasVoted
                ? 'You voted for this feature'
                : 'Vote to help prioritize'}
            </Typography>

            {((isAdmin && boardConfig) || canDeleteFeature) && (
              <Box className={classes.adminControls}>
                {isAdmin && boardConfig && (
                  <FormControl
                    variant="outlined"
                    size="small"
                    style={{ minWidth: 150 }}
                  >
                    <InputLabel id="status-select-label">Status</InputLabel>
                    <Select
                      labelId="status-select-label"
                      value={feature.status}
                      onChange={handleStatusChange}
                      label="Status"
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
                  <Tooltip title="Delete feature">
                    <IconButton
                      size="small"
                      aria-label="Delete feature"
                      disabled={isDeletingFeature || editingDetails}
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
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
