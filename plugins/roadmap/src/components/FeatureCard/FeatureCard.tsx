import { MouseEvent } from 'react';
import { Card, Typography, Box, Divider } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { MarkdownContent } from '@backstage/core-components';
import { VoteButton } from '../VoteButton/VoteButton';
import {
  Feature,
  FeatureStatus,
} from '@rothenbergt/backstage-plugin-roadmap-common';

const useStyles = makeStyles(theme => ({
  card: {
    position: 'relative',
    marginBottom: theme.spacing(1.5),
    transition: 'all 0.2s ease',
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[1],
    },
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: '72px',
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '4px',
    height: '100%',
  },
  voteColumn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '70px',
    flexShrink: 0,
    flexGrow: 0,
    height: '100%',
  },
  contentColumn: {
    flex: 1,
    padding: theme.spacing(1.5, 2),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
  },
  title: {
    fontWeight: 500,
    marginBottom: theme.spacing(0.5),
    fontSize: '0.95rem',
    color: theme.palette.text.primary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  descriptionMarkdown: {
    fontSize: '0.85rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.4,
    maxHeight: '2.38rem',
    overflow: 'hidden',
    wordBreak: 'break-word',
    '& p': {
      margin: 0,
    },
    '& p + p': {
      marginTop: theme.spacing(0.5),
    },
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      fontSize: '0.95rem',
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
  verticalDivider: {
    height: '60%',
    alignSelf: 'center',
    margin: 0,
  },
}));

type FeatureCardProps = {
  feature: Feature & { hasVoted: boolean };
  onClick: () => void;
};

export const FeatureCard = ({ feature, onClick }: FeatureCardProps) => {
  const classes = useStyles();
  const { id, title, description, status, votes, hasVoted } = feature;

  // Get appropriate color for status indicator
  const getStatusColor = () => {
    switch (status) {
      case FeatureStatus.Suggested:
        return '#FF9800';
      case FeatureStatus.Planned:
        return '#2196F3';
      case FeatureStatus.InProgress:
        return '#9C27B0';
      case FeatureStatus.Completed:
        return '#4CAF50';
      case FeatureStatus.Declined:
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  // Prevent vote click from triggering the card click
  const handleVoteClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card className={classes.card} onClick={onClick} elevation={0}>
      <div
        className={classes.statusIndicator}
        style={{ backgroundColor: getStatusColor() }}
      />

      <Box className={classes.voteColumn} onClick={handleVoteClick}>
        <VoteButton featureId={id} hasVoted={hasVoted} voteCount={votes} />
      </Box>

      <Divider orientation="vertical" className={classes.verticalDivider} />

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
      </Box>
    </Card>
  );
};
