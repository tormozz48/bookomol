import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  LibraryBooks,
  Upload,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useHealthCheck, useBooks } from '../services/api';
import { apiService } from '../services/api';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color?: 'primary' | 'secondary' | 'success' | 'warning';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color = 'primary' }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ mr: 2, color: `${color}.main` }}>
          {icon}
        </Box>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" color={`${color}.main`}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export const Dashboard: React.FC = () => {
  const { data: healthData, isLoading: healthLoading, error: healthError } = useHealthCheck();
  const { data: books, isLoading: booksLoading, error: booksError } = useBooks();
  
  // Get user usage statistics
  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['user', 'usage'],
    queryFn: () => apiService.getUserUsage(),
    retry: 1,
  });

  const totalBooks = usage?.books.total || 0;
  const processingBooks = usage?.books.processing || 0;
  const completedBooks = usage?.books.completed || 0;
  const dailyUsed = usage?.dailyQuota.used || 0;
  const dailyLimit = usage?.dailyQuota.limit || 3;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to Bookomol
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
        Your AI-powered PDF book condensing assistant
      </Typography>

      {/* API Status */}
      {healthLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} />
          <Typography variant="body2">Checking API connection...</Typography>
        </Box>
      )}
      
      {healthError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          API connection failed. Some features may not work properly.
        </Alert>
      )}
      
      {healthData && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Connected to API successfully
        </Alert>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Books Processed"
            value={booksLoading ? '...' : totalBooks}
            icon={<LibraryBooks />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Upload Today"
            value={usageLoading ? '...' : `${dailyUsed}/${dailyLimit}`}
            icon={<Upload />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Processing"
            value={booksLoading ? '...' : processingBooks}
            icon={<Schedule />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Completed"
            value={booksLoading ? '...' : completedBooks}
            icon={<TrendingUp />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* Daily Quota Progress */}
      {usage && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Daily Upload Quota
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="textSecondary" sx={{ flexGrow: 1 }}>
                {dailyUsed} of {dailyLimit} books uploaded today
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {dailyLimit - dailyUsed} remaining
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(dailyUsed / dailyLimit) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundColor: dailyUsed >= dailyLimit ? 'error.main' : 'primary.main'
                }
              }}
            />
            {usage.dailyQuota.resetAt && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Quota resets daily at midnight
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Quick Actions
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Get started with your PDF book condensing journey
          </Typography>
          
          {booksError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load books data. Please try again later.
            </Alert>
          )}
          
          <CardActions>
            <Button
              variant="contained"
              startIcon={<Upload />}
              disabled={dailyUsed >= dailyLimit}
            >
              {totalBooks === 0 ? 'Upload Your First Book' : 'Upload Another Book'}
            </Button>
            <Button variant="outlined">
              View Tutorial
            </Button>
          </CardActions>
        </CardContent>
      </Card>
    </Box>
  );
};