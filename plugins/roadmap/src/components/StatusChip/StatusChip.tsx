import React from 'react';
import { Chip, makeStyles, alpha } from '@material-ui/core';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import LightbulbIcon from '@material-ui/icons/EmojiObjects';
import EventNoteIcon from '@material-ui/icons/EventNote';
import CodeIcon from '@material-ui/icons/Code';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import CancelOutlinedIcon from '@material-ui/icons/CancelOutlined';

const useStyles = makeStyles(theme => ({
  statusChip: {
    fontWeight: 600,
    fontSize: '0.7rem',
    height: 24,
    borderRadius: 12,
    boxShadow: theme.shadows[1],
    '& .MuiChip-icon': {
      marginLeft: 8,
      marginRight: -4,
    },
  },
  small: {
    height: 20,
    fontSize: '0.65rem',
  },
  medium: {
    height: 28,
    fontSize: '0.75rem',
  },
  // Status-specific styling using theme colors
  suggested: {
    backgroundColor: alpha(theme.palette.warning.main, 0.15),
    color: theme.palette.warning.dark,
    borderColor: alpha(theme.palette.warning.main, 0.5),
  },
  planned: {
    backgroundColor: alpha(theme.palette.info.main, 0.15),
    color: theme.palette.info.dark,
    borderColor: alpha(theme.palette.info.main, 0.5),
  },
  inProgress: {
    backgroundColor: alpha(theme.palette.secondary.main, 0.15),
    color: theme.palette.secondary.dark,
    borderColor: alpha(theme.palette.secondary.main, 0.5),
  },
  completed: {
    backgroundColor: alpha(theme.palette.success.main, 0.15),
    color: theme.palette.success.dark,
    borderColor: alpha(theme.palette.success.main, 0.5),
  },
  declined: {
    backgroundColor: alpha(theme.palette.error.main, 0.15),
    color: theme.palette.error.dark,
    borderColor: alpha(theme.palette.error.main, 0.5),
  },
  default: {
    backgroundColor: alpha(theme.palette.grey[500], 0.15),
    color: theme.palette.text.primary,
    borderColor: alpha(theme.palette.grey[500], 0.5),
  },
  outlined: {
    backgroundColor: 'transparent',
  },
}));

type StatusChipProps = {
  status: FeatureStatus;
  size?: 'small' | 'medium';
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'outlined';
};

export const StatusChip = ({
  status,
  size = 'small',
  className,
  showIcon = true,
  variant = 'default',
}: StatusChipProps) => {
  const classes = useStyles();

  // Status icons
  const getStatusIcon = () => {
    switch (status) {
      case FeatureStatus.Suggested:
        return <LightbulbIcon fontSize="small" />;
      case FeatureStatus.Planned:
        return <EventNoteIcon fontSize="small" />;
      case FeatureStatus.InProgress:
        return <CodeIcon fontSize="small" />;
      case FeatureStatus.Completed:
        return <CheckCircleOutlineIcon fontSize="small" />;
      case FeatureStatus.Declined:
        return <CancelOutlinedIcon fontSize="small" />;
      default:
        return <LightbulbIcon fontSize="small" />;
    }
  };

  // Label mapping for different statuses
  const getStatusLabel = () => {
    switch (status) {
      case FeatureStatus.Suggested:
        return 'Suggested';
      case FeatureStatus.Planned:
        return 'Planned';
      case FeatureStatus.InProgress:
        return 'In Progress';
      case FeatureStatus.Completed:
        return 'Completed';
      case FeatureStatus.Declined:
        return 'Declined';
      default:
        return status;
    }
  };

  // Determine which status class to use
  const getStatusClass = () => {
    switch (status.toLowerCase()) {
      case FeatureStatus.Suggested.toLowerCase():
        return classes.suggested;
      case FeatureStatus.Planned.toLowerCase():
        return classes.planned;
      case FeatureStatus.InProgress.toLowerCase():
        return classes.inProgress;
      case FeatureStatus.Completed.toLowerCase():
        return classes.completed;
      case FeatureStatus.Declined.toLowerCase():
        return classes.declined;
      default:
        return classes.default;
    }
  };

  return (
    <Chip
      label={getStatusLabel()}
      size={size}
      icon={showIcon ? getStatusIcon() : undefined}
      className={`${classes.statusChip} ${classes[size]} ${getStatusClass()} ${variant === 'outlined' ? classes.outlined : ''} ${className || ''}`}
      variant={variant === 'outlined' ? 'outlined' : 'default'}
    />
  );
};