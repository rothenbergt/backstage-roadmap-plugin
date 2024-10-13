import React from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSuggestions } from '../../hooks/useSuggestions';

interface IdeaSuggestionFormProps {
  onSubmit: () => Promise<void>;
  onClose: () => void;
}

export const IdeaSuggestionForm: React.FC<IdeaSuggestionFormProps> = ({
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
    <Box sx={{ position: 'relative', p: 3 }}>
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
      <Typography variant="h5" gutterBottom>
        Suggest a New Idea
      </Typography>
      <Typography variant={'body1'}>
        Share your idea with the team and help us improve the product!
      </Typography>
      <Divider sx={{ my: 2 }} />

      <form onSubmit={handleSubmit}>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Idea Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Idea Description"
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
            {isSubmitting ? 'Submitting...' : 'Submit Idea'}
          </Button>
        </Box>
      </form>
    </Box>
  );
};
