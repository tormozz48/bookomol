import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';

export const Upload: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Book
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Upload your PDF books for AI-powered condensing (3 books per day limit)
      </Typography>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Drag & Drop PDF Files
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Or click to browse and select files
          </Typography>
          <Button variant="contained">
            Select Files
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};