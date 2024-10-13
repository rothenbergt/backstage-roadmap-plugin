import React from 'react';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';

interface SafeEntityRefLinkProps {
  entityRef: string;
  hideIcon?: boolean;
}

// FallbackLink component to use when EntityRefLink is unavailable
const FallbackLink: React.FC<SafeEntityRefLinkProps> = ({ entityRef }) => {
  const [_, userRef] = entityRef.split('/');
  return <span>{userRef || entityRef}</span>;
};

// This SafeEntityRefLink component is designed to be used in place of EntityRefLink
// from @backstage/plugin-catalog-react. It provides a fallback mechanism for scenarios
// where the full Backstage catalog might not be available, such as during isolated plugin development and testing
// TODO this can be removed once I integrate the catalog API into the Isolated Dev Environment
export const SafeEntityRefLink: React.FC<SafeEntityRefLinkProps> = props => {
  // Check if the Catalog API is available
  const isCatalogAvailable = (() => {
    try {
      useApi(catalogApiRef);
      return true;
    } catch (e) {
      return false;
    }
  })();

  if (isCatalogAvailable) {
    return <EntityRefLink {...props} />;
  } else {
    return <FallbackLink {...props} />;
  }
};
