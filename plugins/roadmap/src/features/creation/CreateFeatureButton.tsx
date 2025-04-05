import React, { useState } from 'react';
import { LinkButton } from '@backstage/core-components';
import AddIcon from '@material-ui/icons/Add';
import { CreateFeatureModal } from './CreateFeatureModal';

export const CreateFeatureButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      
      <CreateFeatureModal
        open={isModalOpen}
        onClose={handleClose}
      />
    </>
  );
};

