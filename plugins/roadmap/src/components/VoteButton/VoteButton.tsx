import { MouseEvent } from 'react';
import { ButtonBase, Tooltip, alpha } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import { useToggleVote } from '../../hooks';

const useStyles = makeStyles(theme => ({
  votePill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: 'transparent',
    color: theme.palette.text.secondary,
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    '&:hover': {
      borderColor: alpha(theme.palette.primary.main, 0.5),
      backgroundColor: alpha(theme.palette.primary.main, 0.06),
    },
  },
  voteCount: {
    fontWeight: 600,
    lineHeight: 1.2,
    fontVariantNumeric: 'tabular-nums',
  },
  active: {
    borderColor: alpha(theme.palette.primary.main, 0.6),
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    },
  },
  small: {
    minWidth: 40,
    padding: theme.spacing(0.5, 1),
    '& $voteCount': {
      fontSize: '0.75rem',
    },
    '& .MuiSvgIcon-root': {
      fontSize: '1.1rem',
      marginBottom: -2,
    },
  },
  medium: {
    minWidth: 44,
    padding: theme.spacing(0.75, 1.25),
    '& $voteCount': {
      fontSize: '0.85rem',
    },
    '& .MuiSvgIcon-root': {
      fontSize: '1.25rem',
      marginBottom: -2,
    },
  },
  large: {
    minWidth: 52,
    padding: theme.spacing(1, 1.5),
    '& $voteCount': {
      fontSize: '1rem',
    },
    '& .MuiSvgIcon-root': {
      fontSize: '1.5rem',
      marginBottom: -2,
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
  const { mutate: toggleVote, isPending } = useToggleVote();

  const handleClick = (event: MouseEvent) => {
    // Prevent the click from propagating to parent components
    event.stopPropagation();
    toggleVote(featureId);
  };

  return (
    <Tooltip title={hasVoted ? 'Remove your vote' : 'Upvote this feature'}>
      <ButtonBase
        className={`${classes.votePill} ${classes[size]} ${
          hasVoted ? classes.active : ''
        } ${className || ''}`}
        onClick={handleClick}
        aria-label={hasVoted ? 'Remove vote' : 'Add vote'}
        aria-pressed={hasVoted}
        // Ignore clicks while a toggle is in flight so a double click cannot
        // race two overlapping requests
        disabled={isPending}
        disableRipple
      >
        <KeyboardArrowUpIcon />
        <span className={classes.voteCount}>{voteCount}</span>
      </ButtonBase>
    </Tooltip>
  );
};
