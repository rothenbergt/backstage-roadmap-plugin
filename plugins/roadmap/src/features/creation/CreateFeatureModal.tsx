import { useState, useEffect } from 'react';
import { useCreateFeature } from '../../hooks';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi, alertApiRef } from '@backstage/core-plugin-api';

const useStyles = makeStyles(theme => ({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
  },
  dialogContent: {
    minWidth: '500px',
    padding: theme.spacing(3),
  },
  dialogActions: {
    padding: theme.spacing(2, 3),
  },
}));

type CreateFeatureModalProps = {
  open: boolean;
  onClose: () => void;
};

export const CreateFeatureModal = ({
  open,
  onClose,
}: CreateFeatureModalProps) => {
  const classes = useStyles();
  const alertApi = useApi(alertApiRef);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  const { mutate: createFeature, isPending, error } = useCreateFeature();

  // Show alert when error changes
  useEffect(() => {
    if (error) {
      alertApi.post({
        message: `Failed to create feature: ${
          error instanceof Error ? error.message : String(error)
        }`,
        severity: 'error',
        display: 'transient',
      });
    }
  }, [error, alertApi]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTitleError('');
    setDescriptionError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    let isValid = true;

    if (!title.trim()) {
      setTitleError('Title is required');
      isValid = false;
    } else if (title.length > 100) {
      setTitleError('Title cannot be longer than 100 characters');
      isValid = false;
    } else {
      setTitleError('');
    }

    if (!description.trim()) {
      setDescriptionError('Description is required');
      isValid = false;
    } else {
      setDescriptionError('');
    }

    return isValid;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    createFeature(
      { title, description },
      {
        onSuccess: () => {
          alertApi.post({
            message: 'Feature suggestion submitted successfully!',
            severity: 'success',
            display: 'transient',
          });
          handleClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md">
      <DialogTitle>Suggest a Feature</DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <form onSubmit={handleSubmit} className={classes.form}>
          <TextField
            label="Title"
            variant="outlined"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            required
            error={!!titleError}
            helperText={titleError}
            disabled={isPending}
            inputProps={{ maxLength: 100 }}
          />

          <TextField
            label="Description"
            variant="outlined"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            required
            error={!!descriptionError}
            helperText={descriptionError}
            disabled={isPending}
            placeholder="Describe the feature and why it would be valuable"
          />

          <Box mt={2}>
            <Typography variant="caption" color="textSecondary">
              Your suggestion will be visible to all users. The team will review
              it and may update its status.
            </Typography>
          </Box>
        </form>
      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
