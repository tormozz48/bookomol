import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '../services/socket';

interface UseSocketOptions {
  userId?: string;
  onBookProgress?: (data: {
    bookId: string;
    userId: string; 
    progress: number;
    status: string;
    message: string;
  }) => void;
  onBookCompleted?: (data: {
    bookId: string;
    userId: string;
    status: string;
    downloadUrl?: string;
  }) => void;
  onBookError?: (data: {
    bookId: string;
    userId: string;
    error: string;
  }) => void;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const queryClient = useQueryClient();
  const { userId, onBookProgress, onBookCompleted, onBookError } = options;

  // Default handlers that update React Query cache
  const handleBookProgress = useCallback((data: any) => {
    // Update books cache with new progress
    queryClient.setQueryData(['books'], (oldData: any) => {
      if (!oldData) return oldData;
      
      return oldData.map((book: any) => 
        book.id === data.bookId 
          ? { ...book, processingProgress: data.progress, status: data.status }
          : book
      );
    });

    // Call custom handler if provided
    onBookProgress?.(data);
  }, [queryClient, onBookProgress]);

  const handleBookCompleted = useCallback((data: any) => {
    // Update books cache with completed status
    queryClient.setQueryData(['books'], (oldData: any) => {
      if (!oldData) return oldData;
      
      return oldData.map((book: any) => 
        book.id === data.bookId 
          ? { ...book, status: 'completed', processingProgress: 100 }
          : book
      );
    });

    // Invalidate related queries to get fresh data
    queryClient.invalidateQueries({ queryKey: ['books'] });
    queryClient.invalidateQueries({ queryKey: ['user', 'usage'] });

    // Call custom handler if provided
    onBookCompleted?.(data);
  }, [queryClient, onBookCompleted]);

  const handleBookError = useCallback((data: any) => {
    // Update books cache with error status
    queryClient.setQueryData(['books'], (oldData: any) => {
      if (!oldData) return oldData;
      
      return oldData.map((book: any) => 
        book.id === data.bookId 
          ? { ...book, status: 'failed', errorMessage: data.error }
          : book
      );
    });

    // Call custom handler if provided
    onBookError?.(data);
  }, [queryClient, onBookError]);

  useEffect(() => {
    // Connect to socket
    socketService.connect();

    // Join user room if userId provided
    if (userId) {
      socketService.joinUserRoom(userId);
    }

    // Set up event listeners
    socketService.onBookProgress(handleBookProgress);
    socketService.onBookCompleted(handleBookCompleted);
    socketService.onBookError(handleBookError);

    return () => {
      // Clean up listeners on unmount
      socketService.removeListener('book-progress', handleBookProgress);
      socketService.removeListener('book-completed', handleBookCompleted);
      socketService.removeListener('book-error', handleBookError);
    };
  }, [userId, handleBookProgress, handleBookCompleted, handleBookError]);

  return {
    connect: () => socketService.connect(),
    disconnect: () => socketService.disconnect(),
    joinUserRoom: (id: string) => socketService.joinUserRoom(id),
  };
};