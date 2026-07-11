import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { toastApiRef } from '@backstage/frontend-plugin-api';
import { useCreateFeature } from '../../hooks';
import { StatusChip, VoteButton } from '../../components';
import { useSimilarFeatures } from './useSimilarFeatures';

const TITLE_MAX_LENGTH = 100;

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
  similarSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    // Appears between title and description while typing, so it stays
    // visually quiet instead of competing with the form
    marginTop: theme.spacing(-1),
  },
  similarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  similarTitleButton: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
    textAlign: 'left',
  },
  similarTitleText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  similarDescription: {
    paddingLeft: theme.spacing(6),
    // Clamp instead of scroll so expanding adds a small, predictable amount
    // of height to the dialog without showing an inner scrollbar
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
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
  const toastApi = useApi(toastApiRef);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Clicking a similar suggestion expands it in place instead of opening
  // the details drawer, so the user never loses the form they are filling in
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { mutate: createFeature, isPending, error } = useCreateFeature();
  const similarFeatures = useSimilarFeatures(title);

  useEffect(() => {
    let frameId = 0;
    if (open) {
      frameId = requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });
    }
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [open]);

  useEffect(() => {
    if (error) {
      toastApi.post({
        title: `Failed to create feature: ${
          error instanceof Error ? error.message : String(error)
        }`,
        status: 'danger',
        timeout: 5000,
      });
    }
  }, [error, toastApi]);

  // The component stays mounted while the dialog is hidden, so a dismissal
  // keeps the draft and reopening picks up right where the user left off.
  // Only an explicit cancel or a successful submit clears the fields.
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setExpandedId(null);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      return;
    }
    createFeature(
      { title: title.trim(), description: description.trim() },
      {
        onSuccess: () => {
          toastApi.post({
            title: 'Feature suggestion submitted successfully!',
            status: 'success',
            timeout: 5000,
          });
          resetForm();
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md">
      <DialogTitle>Suggest a Feature</DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <form onSubmit={handleSubmit} className={classes.form}>
          <TextField
            id="create-feature-title"
            label="Title"
            variant="outlined"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            required
            disabled={isPending}
            inputRef={titleInputRef}
            inputProps={{ maxLength: TITLE_MAX_LENGTH }}
          />

          {similarFeatures.length > 0 && (
            <div className={classes.similarSection}>
              <Typography variant="caption" color="textSecondary">
                Looks similar to existing suggestions. Vote instead?
              </Typography>
              {similarFeatures.map(feature => (
                <div key={feature.id}>
                  <div className={classes.similarRow}>
                    <VoteButton
                      featureId={feature.id}
                      hasVoted={feature.hasVoted}
                      voteCount={feature.votes}
                      size="small"
                    />
                    <ButtonBase
                      className={classes.similarTitleButton}
                      onClick={() =>
                        setExpandedId(current =>
                          current === feature.id ? null : feature.id,
                        )
                      }
                      aria-expanded={expandedId === feature.id}
                      title={
                        expandedId === feature.id
                          ? 'Hide details'
                          : 'Show details'
                      }
                      disableRipple
                    >
                      <Typography
                        variant="body2"
                        className={classes.similarTitleText}
                      >
                        {feature.title}
                      </Typography>
                    </ButtonBase>
                    <StatusChip status={feature.status} size="small" />
                  </div>
                  <Collapse in={expandedId === feature.id} timeout={150}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      component="div"
                      className={classes.similarDescription}
                    >
                      {feature.description}
                    </Typography>
                  </Collapse>
                </div>
              ))}
            </div>
          )}

          <TextField
            id="create-feature-description"
            label="Description"
            variant="outlined"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            required
            disabled={isPending}
            placeholder="Describe the feature and why it would be valuable"
          />

          <Box>
            <Typography variant="caption" color="textSecondary">
              Your suggestion will be visible to all users. The team will review
              it and may update its status.
            </Typography>
          </Box>
        </form>
      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button onClick={handleCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleSubmit}
          disabled={isPending || !title.trim() || !description.trim()}
        >
          {isPending ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
