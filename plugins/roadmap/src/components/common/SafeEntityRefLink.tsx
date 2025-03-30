import React from 'react';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';

interface SafeEntityRefLinkProps {
  entityRef: string;
  hideIcon?: boolean;
}

// Separate fallback component that doesn't use catalogApiRef
const FallbackLink: React.FC<SafeEntityRefLinkProps> = ({ entityRef }) => {
  return <span>{entityRef.split('/').pop()}</span>;
};

// This SafeEntityRefLink component is designed to be used in place of EntityRefLink
// from @backstage/plugin-catalog-react. It provides a fallback mechanism for scenarios
// where the full Backstage catalog might not be available, such as during isolated plugin development and testing
// TODO this can be removed once I integrate the catalog API into the Isolated Dev Environment
export const SafeEntityRefLink: React.FC<SafeEntityRefLinkProps> = props => {
  let isCatalogAvailable = true;
  try {
    // This actually doesn't use the API, just checks if we can access it
    useApi(catalogApiRef);
  } catch (e) {
    isCatalogAvailable = false;
  }

  if (isCatalogAvailable) {
    return <EntityRefLink {...props} />;
  }
  return <FallbackLink {...props} />;
};
