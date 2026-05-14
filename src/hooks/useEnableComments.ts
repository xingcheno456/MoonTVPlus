import { useEffect, useState } from 'react';

export function useEnableComments(): boolean {
  const [enableComments, setEnableComments] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const runtimeConfig = window.RUNTIME_CONFIG;
      setEnableComments(runtimeConfig?.EnableComments ?? true);
    }
  }, []);

  return enableComments;
}
