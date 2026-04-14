import { useState } from 'react';
import { LinkButton } from '@backstage/core-components';
import AddIcon from '@material-ui/icons/Add';
import { CreateFeatureModal } from './CreateFeatureModal';
import { usePermission } from '@backstage/plugin-permission-react';
import { roadmapCreatePermission } from '@rothenbergt/backstage-plugin-roadmap-common';

export const CreateFeatureButton = () => {
  const { allowed } = usePermission({ permission: roadmapCreatePermission });
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!allowed) return null;

  const handleOpen = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <LinkButton
        color="primary"
        variant="contained"
        onClick={handleOpen}
        startIcon={<AddIcon />}
        to="#"
      >
        Suggest Feature
      </LinkButton>

      <CreateFeatureModal open={isModalOpen} onClose={handleClose} />
    </>
  );
};
