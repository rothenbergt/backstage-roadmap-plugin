import React from 'react';
import { Box, Tooltip, alpha } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ThumbUpIcon from '@material-ui/icons/ThumbUp';
import { useToggleVote } from '../../hooks';

const useStyles = makeStyles(theme => ({
  voteContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    padding: theme.spacing(0.5, 0),
    borderRadius: theme.shape.borderRadius,
    transition: 'all 0.15s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },
  voteCount: {
    fontSize: '0.9rem',
    fontWeight: 500,
    lineHeight: 1.2,
    marginBottom: theme.spacing(0.5),
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '50%',
    padding: theme.spacing(0.5),
  },
  activeVote: {
    color: theme.palette.primary.main,
    '& $iconWrapper': {
      backgroundColor: alpha(theme.palette.primary.main, 0.12),
      '& .MuiSvgIcon-root': {
        color: theme.palette.primary.main,
      },
    },
    '&:hover $iconWrapper': {
      backgroundColor: alpha(theme.palette.primary.main, 0.2),
    },
  },
  inactiveVote: {
    color: theme.palette.text.secondary,
    '& $iconWrapper': {
      backgroundColor: theme.palette.action.hover,
      '& .MuiSvgIcon-root': {
        color: theme.palette.action.active,
      },
    },
    '&:hover $iconWrapper': {
      backgroundColor: theme.palette.action.selected,
    },
  },
  small: {
    '& $iconWrapper': {
      width: 28,
      height: 28,
      '& .MuiSvgIcon-root': {
        fontSize: '1rem',
      },
    },
    '& $voteCount': {
      fontSize: '0.75rem',
    },
  },
  medium: {
    '& $iconWrapper': {
      width: 32,
      height: 32,
      '& .MuiSvgIcon-root': {
        fontSize: '1.25rem',
      },
    },
  },
  large: {
    '& $iconWrapper': {
      width: 36,
      height: 36,
      '& .MuiSvgIcon-root': {
        fontSize: '1.5rem',
      },
    },
    '& $voteCount': {
      fontSize: '1rem',
    },
  },
}));

type VoteButtonProps = {
  featureId: string;
  hasVoted: boolean;
  voteCount: number;
  size?: 'small' | 'medium' | 'large';
  className?: string;
};

export const VoteButton = ({
  featureId,
  hasVoted,
  voteCount,
  size = 'small',
  className,
}: VoteButtonProps) => {
  const classes = useStyles();
  const { mutate: toggleVote } = useToggleVote();

  const handleClick = (event: React.MouseEvent) => {
    // Prevent the click from propagating to parent components
    event.stopPropagation();
    toggleVote(featureId);
  };

  return (
    <Tooltip title={hasVoted ? 'Remove your vote' : 'Upvote this feature'}>
      <Box
        className={`
          ${classes.voteContainer} 
          ${classes[size]} 
          ${hasVoted ? classes.activeVote : classes.inactiveVote}
          ${className || ''}
        `}
        onClick={handleClick}
        aria-label={hasVoted ? 'Remove vote' : 'Add vote'}
      >
        <div className={classes.voteCount}>{voteCount}</div>
        <div className={classes.iconWrapper}>
          <ThumbUpIcon />
        </div>
      </Box>
    </Tooltip>
  );
};
