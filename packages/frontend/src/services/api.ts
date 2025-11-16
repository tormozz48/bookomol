import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// API Base URL - this will be configured properly later with environment variables
const API_BASE_URL = 'http://localhost:3010';

// Types
export interface Book {
  id: string;
  title: string | null;
  originalFilename: string | null;
  originalPages: number | null;
  condensedPages: number | null;
  condensingLevel: 'light' | 'medium' | 'heavy' | null;
  compressionRatio: number | null;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  processingProgress: number;
  errorMessage: string | null;
  apiCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  dailyQuota: number;
  booksProcessedToday: number;
}

// API Service Class
class ApiService {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck() {
    return this.fetchWithAuth('/health');
  }

  // User endpoints
  async getCurrentUser(): Promise<User> {
    return this.fetchWithAuth('/api/user/profile');
  }

  // Books endpoints
  async getBooks(): Promise<{ books: Book[] }> {
    return this.fetchWithAuth('/api/books');
  }

  async uploadBook(file: File): Promise<Book> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/books/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteBook(bookId: string): Promise<void> {
    return this.fetchWithAuth(`/api/books/${bookId}`, {
      method: 'DELETE',
    });
  }

  // Upload-related methods
  async getUploadUrl(filename: string, contentType: string): Promise<{
    uploadUrl: string;
    bookId: string;
    objectName: string;
    expiresIn: number;
  }> {
    return this.fetchWithAuth('/api/books/upload/url', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    });
  }

  async createBook(data: {
    bookId: string;
    originalFilename: string;
    title: string;
    condensingLevel: 'light' | 'medium' | 'heavy';
  }): Promise<Book> {
    return this.fetchWithAuth('/api/books', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // User quota methods
  async canUpload(): Promise<{
    canUpload: boolean;
    quotaUsed: number;
    quotaLimit: number;
    quotaRemaining: number;
  }> {
    return this.fetchWithAuth('/api/user/can-upload');
  }

  async getUserUsage(): Promise<{
    dailyQuota: {
      limit: number;
      used: number;
      remaining: number;
      resetAt: string | null;
    };
    books: {
      total: number;
      uploaded: number;
      processing: number;
      completed: number;
      failed: number;
    };
    costs: {
      totalApiCost: number;
    };
  }> {
    return this.fetchWithAuth('/api/user/usage');
  }
}

export const apiService = new ApiService();

// React Query Hooks
export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiService.healthCheck(),
    retry: 1,
    staleTime: 30000, // 30 seconds
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['user', 'current'],
    queryFn: () => apiService.getCurrentUser(),
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useBooks = () => {
  return useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const response = await apiService.getBooks();
      return response.books;
    },
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useUploadBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => apiService.uploadBook(file),
    onSuccess: () => {
      // Invalidate and refetch books list
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useDeleteBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookId: string) => apiService.deleteBook(bookId),
    onSuccess: () => {
      // Invalidate and refetch books list
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};