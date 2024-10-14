import React from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  Paper,
  Drawer,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSuggestions } from '../../hooks/useSuggestions';

interface FeatureSuggestionFormProps {
  open: boolean;
  onSubmit: () => Promise<void>;
  onClose: () => void;
}

export const FeatureSuggestionForm: React.FC<FeatureSuggestionFormProps> = ({
  open,
  onSubmit,
  onClose,
}) => {
  const {
    title,
    setTitle,
    description,
    setDescription,
    isSubmitting,
    handleSubmit,
  } = useSuggestions(onSubmit);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 600 }}>
        <Paper
          elevation={0}
          sx={{ p: 3, position: 'relative', height: '100%' }}
        >
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: theme => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
          <Box sx={{ pt: 4 }}>
            <Typography variant="h5" gutterBottom>
              Suggest a New Feature Idea
            </Typography>
            <Typography variant="body1">
              Share your feature idea with the team and help us improve the
              platform!
            </Typography>
            <Divider sx={{ my: 2 }} />

            <form onSubmit={handleSubmit}>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Feature Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Feature Description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  multiline
                  rows={4}
                  required
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </Box>
            </form>
          </Box>
        </Paper>
      </Box>
    </Drawer>
  );
};
