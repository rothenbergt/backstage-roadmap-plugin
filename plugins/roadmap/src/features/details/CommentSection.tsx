import { useState, useEffect } from 'react';
import { useComments, useAddComment } from '../../hooks';
import { formatDateUTC } from './dateUtils';
import {
  Typography,
  TextField,
  Button,
  Box,
  Avatar,
  Paper,
  List,
  CircularProgress,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Progress } from '@backstage/core-components';
import { useApi, alertApiRef } from '@backstage/core-plugin-api';
import { EntityDisplayName } from '@backstage/plugin-catalog-react';
import SendIcon from '@material-ui/icons/Send';

const useStyles = makeStyles(theme => ({
  root: {
    marginTop: theme.spacing(2),
  },
  commentForm: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(4),
    position: 'relative',
  },
  commentActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: theme.spacing(1),
    position: 'relative',
  },
  commentList: {
    marginTop: theme.spacing(2),
  },
  commentItem: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    transition: 'box-shadow 0.2s ease',
    '&:hover': {
      boxShadow: theme.shadows[1],
    },
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(1),
  },
  commentAuthor: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  authorAvatar: {
    backgroundColor: theme.palette.primary.main,
  },
  commentTimestamp: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    marginLeft: theme.spacing(1),
  },
  noComments: {
    textAlign: 'center',
    padding: theme.spacing(3),
    color: theme.palette.text.secondary,
    backgroundColor: theme.palette.background.default,
  },
  sendButton: {
    marginLeft: theme.spacing(1),
    minWidth: 36,
    width: 36,
    height: 36,
  },
  commentText: {
    marginTop: theme.spacing(1),
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  characterCounter: {
    position: 'absolute',
    right: 0,
    bottom: -24,
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'baseline',
  },
  commentCount: {
    color: theme.palette.text.secondary,
    marginLeft: theme.spacing(1),
  },
}));

type CommentSectionProps = {
  featureId: string;
};

export const CommentSection = ({ featureId }: CommentSectionProps) => {
  const classes = useStyles();
  const alertApi = useApi(alertApiRef);
  const { data: comments, isLoading, error } = useComments(featureId);
  const {
    mutate: addComment,
    isPending: isSubmitting,
    error: submitError,
  } = useAddComment(featureId);
  const [commentText, setCommentText] = useState('');
  const [textError, setTextError] = useState('');
  const maxCommentLength = 1000;

  // Show alert when error changes
  useEffect(() => {
    if (error) {
      alertApi.post({
        message: `Failed to load comments: ${(error as Error).message}`,
        severity: 'error',
        display: 'transient',
      });
    }
  }, [error, alertApi]);

  // Show alert when submit error changes
  useEffect(() => {
    if (submitError) {
      alertApi.post({
        message: `Failed to add comment: ${(submitError as Error).message}`,
        severity: 'error',
        display: 'transient',
      });
    }
  }, [submitError, alertApi]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newText = event.target.value;
    if (newText.length <= maxCommentLength) {
      setCommentText(newText);

      // Clear error when typing
      if (textError) {
        setTextError('');
      }
    }
  };

  const validateComment = () => {
    if (!commentText.trim()) {
      setTextError('Comment cannot be empty');
      return false;
    }

    if (commentText.length > maxCommentLength) {
      setTextError(
        `Comment is too long (maximum ${maxCommentLength} characters)`,
      );
      return false;
    }

    return true;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateComment()) {
      return;
    }

    addComment(commentText, {
      onSuccess: () => {
        alertApi.post({
          message: 'Comment added successfully!',
          severity: 'success',
          display: 'transient',
        });
        setCommentText('');
      },
    });
  };

  const formatDate = (dateString: string) => {
    return formatDateUTC(dateString);
  };

  const getInitials = (name: string) => {
    return name
      .split(/\s+/)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderCommentContent = () => {
    if (isLoading) {
      return <Progress />;
    }

    if (comments?.length) {
      return (
        <List className={classes.commentList}>
          {comments.map(comment => (
            <Paper
              key={comment.id}
              className={classes.commentItem}
              variant="outlined"
            >
              <Box className={classes.commentHeader}>
                <Box className={classes.commentAuthor}>
                  <Avatar className={classes.authorAvatar}>
                    {getInitials(
                      comment.author.split('/').pop() || comment.author,
                    )}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">
                      <EntityDisplayName
                        entityRef={{
                          kind: comment.author.split(':')[0],
                          namespace: comment.author.includes('/')
                            ? comment.author.split('/')[0].split(':')[1]
                            : 'default',
                          name: comment.author.includes('/')
                            ? comment.author.split('/')[1]
                            : comment.author.split(':')[1],
                        }}
                        defaultKind="user"
                      />
                      <Typography
                        component="span"
                        variant="caption"
                        className={classes.commentTimestamp}
                      >
                        {formatDate(comment.created_at)}
                      </Typography>
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Typography variant="body2" className={classes.commentText}>
                {comment.text}
              </Typography>
            </Paper>
          ))}
        </List>
      );
    }

    return (
      <Paper className={classes.noComments} variant="outlined">
        <Typography variant="body2">
          No comments yet. Be the first to comment!
        </Typography>
      </Paper>
    );
  };

  return (
    <div className={classes.root}>
      <Box className={classes.sectionHeader}>
        <Typography variant="h6">Comments</Typography>
        {comments?.length ? (
          <Typography variant="subtitle2" className={classes.commentCount}>
            ({comments.length})
          </Typography>
        ) : null}
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        className={classes.commentForm}
      >
        <TextField
          label="Add a comment"
          variant="outlined"
          fullWidth
          multiline
          minRows={3}
          value={commentText}
          onChange={handleChange}
          error={!!textError}
          helperText={textError}
          disabled={isSubmitting}
          placeholder="Share your thoughts or feedback..."
        />
        <span className={classes.characterCounter}>
          {commentText.length}/{maxCommentLength}
        </span>

        <Box className={classes.commentActions}>
          <Button
            color="primary"
            variant="contained"
            disabled={isSubmitting || !commentText.trim()}
            type="submit"
            endIcon={
              isSubmitting ? <CircularProgress size={16} /> : <SendIcon />
            }
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </Box>
      </Box>

      {renderCommentContent()}
    </div>
  );
};
