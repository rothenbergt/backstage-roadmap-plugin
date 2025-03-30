import { useState, useEffect } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api';
import { alertApiRef } from '@backstage/core-plugin-api';

/**
 * Hook to check if the current user has roadmap admin permissions
 * Uses the backend permission checking API
 */
export const useIsRoadmapAdmin = () => {
  const roadmapApi = useApi(roadmapApiRef);
  const alertApi = useApi(alertApiRef);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        const adminStatus = await roadmapApi.checkAdminPermission();

        if (isMounted) {
          setIsAdmin(adminStatus);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const errorObj =
            err instanceof Error ? err : new Error('Unknown error');
          setError(errorObj);
          setIsAdmin(false);

          // Use alertApi instead of console.error
          alertApi.post({
            message: `Failed to check admin permission: ${errorObj.message}`,
            severity: 'warning',
            display: 'transient',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [roadmapApi, alertApi]);

  return { loading, error, isAdmin };
};
