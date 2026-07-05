import { ReactNode } from 'react';
import {
  Box,
  Divider,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  makeStyles,
} from '@material-ui/core';
import MapIcon from '@material-ui/icons/Map';
import ThumbUpOutlinedIcon from '@material-ui/icons/ThumbUpOutlined';
import PersonOutlineIcon from '@material-ui/icons/PersonOutline';
import { Link } from '@backstage/core-components';
import { HighlightedSearchResultText } from '@backstage/plugin-search-react';
import {
  IndexableDocument,
  ResultHighlight,
} from '@backstage/plugin-search-common';
import { FeatureStatus } from '@rothenbergt/backstage-plugin-roadmap-common';
import { StatusChip } from '../StatusChip';

const useStyles = makeStyles(theme => ({
  body: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: 0,
  },
  icon: {
    marginTop: theme.spacing(1),
    minWidth: theme.spacing(5),
  },
  title: {
    fontWeight: 600,
  },
  excerpt: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(0.5),
  },
  metaEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    color: theme.palette.text.secondary,
  },
  metaIcon: {
    fontSize: '1rem',
  },
}));

/**
 * A roadmap feature as indexed for search: the common document fields plus
 * the extras the collator adds.
 */
export interface RoadmapSearchDocument extends IndexableDocument {
  status?: string;
  votes?: number;
  author?: string;
}

/**
 * Props for {@link RoadmapSearchResultListItem}.
 *
 * @public
 */
export interface RoadmapSearchResultListItemProps {
  result?: RoadmapSearchDocument;
  highlight?: ResultHighlight;
  rank?: number;
  /** Icon shown next to the result; defaults to the roadmap map icon. */
  icon?: ReactNode;
}

/** Show entity refs like `user:default/alice` as just `alice`. */
const displayAuthor = (author: string) => {
  const name = author.split('/').pop();
  return name || author;
};

/**
 * Search result list item that renders roadmap features with their status,
 * vote count, and author, matching the board's visual language.
 *
 * @public
 */
export const RoadmapSearchResultListItem = (
  props: RoadmapSearchResultListItemProps,
) => {
  const { result, highlight, icon } = props;
  const classes = useStyles();

  if (!result) {
    return null;
  }

  return (
    <>
      <ListItem alignItems="flex-start">
        <ListItemIcon className={classes.icon}>
          {icon ?? <MapIcon color="action" titleAccess="Roadmap feature" />}
        </ListItemIcon>
        <Box className={classes.body}>
          <ListItemText
            primaryTypographyProps={{ variant: 'h6', className: classes.title }}
            primary={
              <Link noTrack to={result.location}>
                {highlight?.fields?.title ? (
                  <HighlightedSearchResultText
                    text={highlight.fields.title}
                    preTag={highlight.preTag}
                    postTag={highlight.postTag}
                  />
                ) : (
                  result.title
                )}
              </Link>
            }
            secondary={
              <Typography
                component="span"
                variant="body2"
                color="textSecondary"
                className={classes.excerpt}
              >
                {highlight?.fields?.text ? (
                  <HighlightedSearchResultText
                    text={highlight.fields.text}
                    preTag={highlight.preTag}
                    postTag={highlight.postTag}
                  />
                ) : (
                  result.text
                )}
              </Typography>
            }
          />
          <Box className={classes.metaRow}>
            {result.status && (
              <StatusChip status={result.status as FeatureStatus} />
            )}
            {result.votes !== undefined && (
              <Typography
                component="span"
                variant="body2"
                className={classes.metaEntry}
                aria-label={`${result.votes} votes`}
              >
                <ThumbUpOutlinedIcon className={classes.metaIcon} />
                {result.votes}
              </Typography>
            )}
            {result.author && (
              <Typography
                component="span"
                variant="body2"
                className={classes.metaEntry}
              >
                <PersonOutlineIcon className={classes.metaIcon} />
                {displayAuthor(result.author)}
              </Typography>
            )}
          </Box>
        </Box>
      </ListItem>
      <Divider component="li" />
    </>
  );
};
