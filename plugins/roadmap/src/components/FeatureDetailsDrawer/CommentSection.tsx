import React from 'react';
import {
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Paper,
  Box,
} from '@mui/material';
import { Comment } from '@rothenbergt/backstage-plugin-roadmap-common';
import { TextWithLinks } from '../common/TextWithLinks';
import { SafeEntityRefLink } from '../common/SafeEntityRefLink';
import { formatDistanceToNow } from 'date-fns';

interface CommentSectionProps {
  comments: Comment[];
  newComment: string;
  setNewComment: (comment: string) => void;
  handleSubmitComment: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

const CommentList: React.FC<{ comments: Comment[] }> = ({ comments }) => {
  return (
    <List sx={{ mt: 2 }}>
      {comments.length === 0 ? (
        <ListItem>
          <ListItemText
            primary="No comments yet. Be the first to comment!"
            sx={{ color: 'text.secondary' }}
          />
        </ListItem>
      ) : (
        comments.map(comment => (
          <ListItem
            key={comment.id}
            alignItems="flex-start"
            sx={{
              mb: 2,
              backgroundColor: 'background.paper',
            }}
          >
            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
              {comment.author?.split('/')[1].charAt(0).toUpperCase()}
            </Avatar>
            <ListItemText
              primary={
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.5,
                  }}
                >
                  <SafeEntityRefLink
                    entityRef={comment.author || 'user:default/guest'}
                    hideIcon={true}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(comment.created_at + 'Z'), {
                      addSuffix: true,
                    })}
                  </Typography>
                </Box>
              }
              secondary={
                <TextWithLinks
                  text={comment.text}
                  variant="body2"
                  sx={{ color: 'text.primary' }}
                />
              }
            />
          </ListItem>
        ))
      )}
    </List>
  );
};

const CommentForm: React.FC<{
  newComment: string;
  setNewComment: (comment: string) => void;
  handleSubmitComment: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}> = ({ newComment, setNewComment, handleSubmitComment, isLoading }) => {
  return (
    <Paper
      component="form"
      onSubmit={handleSubmitComment}
      elevation={0}
      sx={{ p: 2, mt: 2, backgroundColor: 'transparent' }}
    >
      <TextField
        fullWidth
        multiline
        rows={3}
        variant="outlined"
        placeholder="Add a comment..."
        value={newComment}
        onChange={e => setNewComment(e.target.value)}
        margin="normal"
      />
      <Button
        variant="contained"
        color="primary"
        type="submit"
        disabled={isLoading}
        sx={{ mt: 1 }}
      >
        {isLoading ? 'Submitting...' : 'Submit Comment'}
      </Button>
    </Paper>
  );
};

export const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  newComment,
  setNewComment,
  handleSubmitComment,
  isLoading,
  error,
}) => {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6">Comments ({comments.length})</Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        {isLoading && comments.length === 0 ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.message}
          </Alert>
        ) : comments.length === 0 ? (
          <Typography color="text.secondary">
            No comments yet. Be the first to comment!
          </Typography>
        ) : (
          <CommentList comments={comments} />
        )}
        <CommentForm
          newComment={newComment}
          setNewComment={setNewComment}
          handleSubmitComment={handleSubmitComment}
          isLoading={isLoading}
        />
      </Box>
    </Box>
  );
};
