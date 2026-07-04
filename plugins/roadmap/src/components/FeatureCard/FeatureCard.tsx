import { KeyboardEvent, MouseEvent } from 'react';
import { Card, Typography, Box } from '@material-ui/core';
import { makeStyles, alpha } from '@material-ui/core/styles';
import { MarkdownContent } from '@backstage/core-components';
import { VoteButton } from '../VoteButton/VoteButton';
import { formatRelativeTime } from '../../features/details/dateUtils';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';

const useStyles = makeStyles(theme => ({
  card: {
    marginBottom: theme.spacing(1.5),
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      borderColor: alpha(theme.palette.text.primary, 0.25),
      boxShadow: `0 1px 3px ${alpha('#000', 0.08)}`,
    },
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5, 2),
    minHeight: '72px',
  },
  voteColumn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contentColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    fontWeight: 600,
    marginBottom: theme.spacing(0.25),
    fontSize: '0.9rem',
    lineHeight: 1.4,
    color: theme.palette.text.primary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  descriptionMarkdown: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.5,
    maxHeight: '2.4rem',
    overflow: 'hidden',
    wordBreak: 'break-word',
    '& p': {
      margin: 0,
    },
    '& p + p': {
      marginTop: theme.spacing(0.5),
    },
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      fontSize: '0.85rem',
      fontWeight: 600,
      lineHeight: 1.3,
      margin: 0,
      marginBottom: theme.spacing(0.25),
    },
    '& ul, & ol': {
      margin: 0,
      paddingLeft: theme.spacing(2),
    },
    '& li': {
      margin: 0,
    },
  },
  footer: {
    marginTop: theme.spacing(0.5),
    fontSize: '0.7rem',
    color: theme.palette.text.hint,
  },
}));

type FeatureCardProps = {
  feature: Feature & { hasVoted: boolean };
  onClick: () => void;
};

export const FeatureCard = ({ feature, onClick }: FeatureCardProps) => {
  const classes = useStyles();
  const { id, title, description, votes, hasVoted, created_at } = feature;
  const age = formatRelativeTime(created_at);

  // Prevent vote click from triggering the card click
  const handleVoteClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className={classes.card}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      elevation={0}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${title}`}
    >
      <Box className={classes.voteColumn} onClick={handleVoteClick}>
        <VoteButton featureId={id} hasVoted={hasVoted} voteCount={votes} />
      </Box>

      <Box className={classes.contentColumn}>
        <Typography variant="subtitle1" className={classes.title}>
          {title}
        </Typography>
        {description?.trim() ? (
          <MarkdownContent
            content={description}
            className={classes.descriptionMarkdown}
          />
        ) : null}
        {age ? (
          <Typography component="span" className={classes.footer}>
            {age}
          </Typography>
        ) : null}
      </Box>
    </Card>
  );
};
