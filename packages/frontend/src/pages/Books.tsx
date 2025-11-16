import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import {
  LibraryBooks,
  MoreVert,
  Download,
  Delete,
  Visibility,
  Refresh,
  Upload,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBooks, apiService } from '../services/api';

interface MenuState {
  anchorEl: HTMLElement | null;
  bookId: string | null;
}

const statusColors = {
  uploaded: '#2196f3',
  processing: '#ff9800', 
  completed: '#4caf50',
  failed: '#f44336',
};

const statusLabels = {
  uploaded: 'Uploaded',
  processing: 'Processing',
  completed: 'Completed', 
  failed: 'Failed',
};

const condensingLevels = {
  light: { label: 'Light (30%)', color: '#4caf50' },
  medium: { label: 'Medium (50%)', color: '#ff9800' },
  heavy: { label: 'Heavy (70%)', color: '#f44336' },
};

export const Books: React.FC = () => {
  const [menuState, setMenuState] = useState<MenuState>({ anchorEl: null, bookId: null });
  const queryClient = useQueryClient();

  // Fetch books data
  const { data: books, isLoading, error } = useBooks();

  // Delete book mutation
  const deleteMutation = useMutation({
    mutationFn: (bookId: string) => apiService.deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'usage'] });
      setMenuState({ anchorEl: null, bookId: null });
    },
  });

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, bookId: string) => {
    setMenuState({ anchorEl: event.currentTarget, bookId });
  };

  const handleMenuClose = () => {
    setMenuState({ anchorEl: null, bookId: null });
  };

  const handleDelete = () => {
    if (menuState.bookId) {
      deleteMutation.mutate(menuState.bookId);
    }
  };

  const handleDownload = (bookId: string, type: 'original' | 'condensed') => {
    // Open download URL in new tab
    window.open(`/api/books/${bookId}/download/${type}`, '_blank');
    handleMenuClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          My Books
        </Typography>
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="80%" height={32} />
                  <Skeleton variant="text" width="60%" height={24} sx={{ mt: 1 }} />
                  <Skeleton variant="rectangular" height={4} sx={{ mt: 2, mb: 2 }} />
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Skeleton variant="rounded" width={60} height={24} />
                    <Skeleton variant="rounded" width={80} height={24} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          My Books
        </Typography>
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load books. Please try again later.
        </Alert>
        <Button variant="contained" onClick={() => queryClient.invalidateQueries({ queryKey: ['books'] })}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!books || books.length === 0) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          My Books
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
          Manage your uploaded and processed books
        </Typography>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <LibraryBooks sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No books yet
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Upload your first PDF book to get started
            </Typography>
            <Button variant="contained" startIcon={<Upload />}>
              Upload Book
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Books
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {books?.length || 0} book{(books?.length || 0) !== 1 ? 's' : ''} in your library
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Upload />}>
          Upload New Book
        </Button>
      </Box>

      <Grid container spacing={3}>
        {books?.map((book: any) => (
          <Grid item xs={12} md={6} lg={4} key={book.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                {/* Header with title and menu */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h3" sx={{ flexGrow: 1, mr: 1 }}>
                    {book.title || book.originalFilename}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleMenuOpen(e, book.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>

                {/* Status and progress */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip 
                      label={statusLabels[book.status as keyof typeof statusLabels]}
                      size="small"
                      sx={{ 
                        backgroundColor: statusColors[book.status as keyof typeof statusColors],
                        color: 'white',
                      }}
                    />
                    {book.condensingLevel && (
                      <Chip
                        label={condensingLevels[book.condensingLevel as keyof typeof condensingLevels].label}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: condensingLevels[book.condensingLevel as keyof typeof condensingLevels].color,
                          color: condensingLevels[book.condensingLevel as keyof typeof condensingLevels].color,
                        }}
                      />
                    )}
                  </Box>
                  
                  {book.status === 'processing' && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="textSecondary">
                          Processing
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {book.processingProgress || 0}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={book.processingProgress || 0}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  )}
                  
                  {book.status === 'failed' && book.errorMessage && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        {book.errorMessage}
                      </Typography>
                    </Alert>
                  )}
                </Box>

                {/* Book details */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, color: 'text.secondary' }}>
                  {book.originalPages && (
                    <Typography variant="body2">
                      Pages: {book.originalPages}
                      {book.condensedPages && book.status === 'completed' && 
                        ` → ${book.condensedPages}`
                      }
                    </Typography>
                  )}
                  
                  {book.compressionRatio && book.status === 'completed' && (
                    <Typography variant="body2">
                      Compression: {((1 - book.compressionRatio) * 100).toFixed(0)}% reduction
                    </Typography>
                  )}
                  
                  <Typography variant="body2">
                    Uploaded: {formatDate(book.createdAt)}
                  </Typography>

                  {book.apiCost > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Processing cost: ${book.apiCost.toFixed(4)}  
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={menuState.anchorEl}
        open={Boolean(menuState.anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => console.log('View details:', menuState.bookId)}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        
        {books?.find((b: any) => b.id === menuState.bookId)?.status === 'completed' && (
          [
            <MenuItem 
              key="download-original"
              onClick={() => menuState.bookId && handleDownload(menuState.bookId, 'original')}
            >
              <Download sx={{ mr: 1 }} />
              Download Original
            </MenuItem>,
            <MenuItem 
              key="download-condensed"
              onClick={() => menuState.bookId && handleDownload(menuState.bookId, 'condensed')}
            >
              <Download sx={{ mr: 1 }} />
              Download Condensed
            </MenuItem>
          ]
        )}
        
        {books?.find((b: any) => b.id === menuState.bookId)?.status === 'failed' && (
          <MenuItem onClick={() => console.log('Retry processing:', menuState.bookId)}>
            <Refresh sx={{ mr: 1 }} />
            Retry Processing
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          {deleteMutation.isPending ? 'Deleting...' : 'Delete Book'}
        </MenuItem>
      </Menu>
    </Box>
  );
};