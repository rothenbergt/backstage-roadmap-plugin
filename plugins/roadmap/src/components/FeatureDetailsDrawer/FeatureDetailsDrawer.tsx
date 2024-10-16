import React from 'react';
import { Drawer, Box, CircularProgress } from '@mui/material';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';
import { useComments } from '../../hooks/useComments';
import { FeatureHeader } from './FeatureHeader';
import { CommentSection } from './CommentSection';
import { AdminControls } from './AdminControls';
import { useIsRoadmapAdmin } from '../../hooks/usePermissionCheck';

interface FeatureDetailsDrawerProps {
  feature: Feature | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (featureId: string, newStatus: Feature['status']) => void;
}

export const FeatureDetailsDrawer: React.FC<FeatureDetailsDrawerProps> = ({
  feature,
  open,
  onClose,
  onStatusChange,
}) => {
  const {
    loading: adminLoading,
    error: adminError,
    isAdmin,
  } = useIsRoadmapAdmin();
  const {
    comments,
    newComment,
    setNewComment,
    handleSubmitComment,
    isLoading: commentsLoading,
    error: commentsError,
  } = useComments(open ? feature?.id || null : null);

  if (!feature) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 600, padding: 3 }}>
        <FeatureHeader feature={feature} onClose={onClose} />
        <CommentSection
          comments={comments}
          newComment={newComment}
          setNewComment={setNewComment}
          handleSubmitComment={handleSubmitComment}
          isLoading={commentsLoading}
          error={commentsError}
        />
        {adminLoading ? (
          <CircularProgress />
        ) : adminError ? (
          <div>Error checking admin status: {adminError.message}</div>
        ) : isAdmin ? (
          <AdminControls feature={feature} onStatusChange={onStatusChange} />
        ) : (
          <div>You do not have admin privileges.</div>
        )}
      </Box>
    </Drawer>
  );
};
