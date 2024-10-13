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

interface CommentSectionProps {
  comments: Comment[];
  newComment: string;
  setNewComment: (comment: string) => void;
  handleSubmitComment: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

// CommentList component to display the list of comments
const CommentList: React.FC<{ comments: Comment[] }> = ({ comments }) => (
  <List>
    {comments.length === 0 ? (
      <ListItem>
        <ListItemText primary="No comments yet. Be the first to comment!" />
      </ListItem>
    ) : (
      comments.map(comment => (
        <ListItem key={comment.id} alignItems="flex-start">
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            {comment.author?.split('/')[1].charAt(0).toUpperCase()}
          </Avatar>
          <ListItemText
            primary={
              <SafeEntityRefLink
                entityRef={comment.author || 'user:default/guest'}
                hideIcon={true}
              />
            }
            secondary={<TextWithLinks text={comment.text} variant="body2" />}
          />
        </ListItem>
      ))
    )}
  </List>
);

// CommentForm component for submitting new comments
const CommentForm: React.FC<{
  newComment: string;
  setNewComment: (comment: string) => void;
  handleSubmitComment: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
}> = ({ newComment, setNewComment, handleSubmitComment, isLoading }) => (
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

export const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  newComment,
  setNewComment,
  handleSubmitComment,
  isLoading,
  error,
}) => (
  <Box sx={{ position: 'relative', p: 2 }}>
    <Typography variant="h6" gutterBottom>
      Comments
    </Typography>
    {isLoading && comments.length === 0 ? (
      <CircularProgress />
    ) : error ? (
      <Alert severity="error">{error.message}</Alert>
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
);
