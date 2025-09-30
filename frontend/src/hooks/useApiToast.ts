import { useCallback } from 'react';
import { UseToastOptions, useToast } from '@chakra-ui/react';

export const useApiToast = () => {
  const toast = useToast({ duration: 4000, isClosable: true, position: 'top-right' });

  const showSuccess = useCallback(
    (title: string, description?: string, options?: UseToastOptions) =>
      toast({
        status: 'success',
        title,
        description,
        ...options,
      }),
    [toast],
  );

  const showError = useCallback(
    (title: string, description?: string, options?: UseToastOptions) =>
      toast({
        status: 'error',
        title,
        description,
        ...options,
      }),
    [toast],
  );

  return { showSuccess, showError };
};
