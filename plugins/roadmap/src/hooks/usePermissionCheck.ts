import { useState, useEffect } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { roadmapApiRef } from '../api/roadmapApi';

export const useIsRoadmapAdmin = () => {
  const roadmapApi = useApi(roadmapApiRef);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        const adminStatus = await roadmapApi.checkAdminPermission();
        if (isMounted) {
          setIsAdmin(adminStatus);
          setError(undefined);
        }
      } catch (err) {
        console.error('Failed to check admin status', err);
        if (isMounted) {
          setError(
            err instanceof Error ? err : new Error('An unknown error occurred'),
          );
          setIsAdmin(false);
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
  }, [roadmapApi]);

  return { loading, error, isAdmin };
};
