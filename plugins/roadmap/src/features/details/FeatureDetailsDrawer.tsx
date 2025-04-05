import React, { useEffect } from 'react';
import { useFeature, useUpdateFeatureStatus, useAdminStatus } from '../../hooks';
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
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { Progress, ResponseErrorPanel } from '@backstage/core-components';
import { useApi, alertApiRef } from '@backstage/core-plugin-api';
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
  statusContainer: {
    display: 'flex', 
    alignItems: 'center',
    '& > *:first-child': {
      marginRight: theme.spacing(1),
    }
  },
}));

type FeatureDetailsDrawerProps = {
  featureId: string;
  open: boolean;
  onClose: () => void;
};

export const FeatureDetailsDrawer = ({
  featureId,
  open,
  onClose,
}: FeatureDetailsDrawerProps) => {
  const classes = useStyles();
  const alertApi = useApi(alertApiRef);
  const { data: feature, isLoading, error } = useFeature(featureId);
  const { data: isAdmin = false } = useAdminStatus();
  const { 
    mutate: updateStatus, 
    isLoading: isUpdating,
    error: updateError,
    isSuccess: isUpdateSuccess,
    data: updatedFeature
  } = useUpdateFeatureStatus();

  // Show alert when error occurs
  useEffect(() => {
    if (error) {
      alertApi.post({
        message: `Failed to load feature: ${(error as Error).message}`,
        severity: 'error',
      });
    }
  }, [error, alertApi]);

  // Show alert when update error occurs
  useEffect(() => {
    if (updateError) {
      alertApi.post({
        message: `Failed to update feature status: ${(updateError as Error).message}`,
        severity: 'error',
      });
    }
  }, [updateError, alertApi]);

  // Show success message when status is updated
  useEffect(() => {
    if (isUpdateSuccess && updatedFeature) {
      alertApi.post({
        message: `Feature status updated to ${updatedFeature.status}`,
        severity: 'success',
      });
    }
  }, [isUpdateSuccess, updatedFeature, alertApi]);

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
          <ResponseErrorPanel error={error as Error} />
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
          
          <Typography variant="h5" className={classes.title}>
            {feature.title}
          </Typography>

          <Typography variant="body1" className={classes.description}>
            {feature.description}
          </Typography>

          <Grid container spacing={2} className={classes.metaRow}>
            <Grid item xs={6}>
              <div className={classes.metaItem}>
                <Typography variant="body2" className={classes.metaLabel}>
                  Suggested by
                </Typography>
                <Typography variant="body2" className={classes.metaValue}>
                  <EntityDisplayName 
                    entityRef={{
                      kind: feature.author.split(':')[0],
                      namespace: feature.author.includes('/') ? feature.author.split('/')[0].split(':')[1] : 'default',
                      name: feature.author.includes('/') ? feature.author.split('/')[1] : feature.author.split(':')[1],
                    }}
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
              
              {isAdmin && (
                <FormControl variant="outlined" size="small" style={{ minWidth: 150, marginLeft: '16px' }}>
                  <InputLabel id="status-select-label">Change Status</InputLabel>
                  <Select
                    labelId="status-select-label"
                    value={feature.status}
                    onChange={handleStatusChange}
                    label="Change Status"
                    disabled={isUpdating}
                  >
                    <MenuItem value={FeatureStatus.Suggested}>Suggested</MenuItem>
                    <MenuItem value={FeatureStatus.Planned}>Planned</MenuItem>
                    <MenuItem value={FeatureStatus.Completed}>Completed</MenuItem>
                    <MenuItem value={FeatureStatus.Declined}>Declined</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
          </Box>
          
          <Divider className={classes.divider} />

          <Box className={classes.section}>
            <CommentSection featureId={featureId} />
          </Box>
        </Box>
      </>
    );
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} classes={{ paper: classes.drawer }}>
      {renderDrawerContent()}
    </Drawer>
  );
};