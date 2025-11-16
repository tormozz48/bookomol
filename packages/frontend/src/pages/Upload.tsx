import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  CloudUpload,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

// Form validation schema
const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  condensingLevel: z.enum(['light', 'medium', 'heavy'], {
    required_error: 'Please select a condensing level',
  }),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface UploadFile extends File {
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

const condensingLevels = [
  {
    value: 'light',
    label: 'Light (30% reduction)',
    description: 'Preserve most content, remove only redundancy',
    color: '#4caf50',
  },
  {
    value: 'medium', 
    label: 'Medium (50% reduction)',
    description: 'Balanced condensing with key concepts preserved',
    color: '#ff9800',
  },
  {
    value: 'heavy',
    label: 'Heavy (70% reduction)', 
    description: 'Maximum condensing, core concepts only',
    color: '#f44336',
  },
];

export const Upload: React.FC = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const queryClient = useQueryClient();

  // Check user upload quota
  const { data: quotaData, isLoading: quotaLoading } = useQuery({
    queryKey: ['user', 'can-upload'],
    queryFn: () => apiService.canUpload(),
    retry: 1,
  });

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      condensingLevel: 'medium',
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, formData }: { file: File; formData: UploadFormData }) => {
      // Get presigned URL
      const urlResponse = await apiService.getUploadUrl(file.name, file.type);
      
      // Upload file to GCS
      await fetch(urlResponse.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      // Create book record
      return apiService.createBook({
        bookId: urlResponse.bookId,
        originalFilename: file.name,
        title: formData.title,
        condensingLevel: formData.condensingLevel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'usage'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'can-upload'] });
    },
  });

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
    disabled: uploadMutation.isPending || !quotaData?.canUpload,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        let errorMessage = 'File rejected';
        
        if (rejection.errors.find(e => e.code === 'file-too-large')) {
          errorMessage = 'File too large (max 100MB)';
        } else if (rejection.errors.find(e => e.code === 'file-invalid-type')) {
          errorMessage = 'Only PDF files are allowed';
        }

        setFiles([{
          ...rejection.file,
          id: crypto.randomUUID(),
          progress: 0,
          status: 'error',
          error: errorMessage,
        } as UploadFile]);
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setFiles([{
          ...file,
          id: crypto.randomUUID(),
          progress: 0,
          status: 'pending',
        } as UploadFile]);
      }
    },
  });

  // Handle form submission
  const onSubmit = async (data: UploadFormData) => {
    if (files.length === 0 || !files[0]) return;

    const file = files[0];
    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'uploading' } : f));

    try {
      await uploadMutation.mutateAsync({ file, formData: data });
      
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'completed', progress: 100 } : f));
      
      // Reset form after successful upload
      setTimeout(() => {
        setFiles([]);
        reset();
      }, 2000);
    } catch (error) {
      setFiles(prev => prev.map(f => f.id === file.id ? { 
        ...f, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Upload failed' 
      } : f));
    }
  };

  if (quotaLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  if (!quotaData?.canUpload) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Book
        </Typography>
        
        <Alert severity="warning" sx={{ mb: 3 }}>
          Daily upload limit reached. You have used {quotaData?.quotaUsed || 0} out of {quotaData?.quotaLimit || 3} books for today.
        </Alert>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <UploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Upload Limit Reached
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Please try again tomorrow or upgrade to a premium plan
            </Typography>
            <Button variant="outlined" disabled>
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Book
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
        Upload your PDF books for AI-powered condensing
      </Typography>

      {/* Quota indicator */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="textSecondary">
          Daily quota: {quotaData.quotaUsed}/{quotaData.quotaLimit} books used
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={(quotaData.quotaUsed / quotaData.quotaLimit) * 100}
          sx={{ mt: 1, height: 6, borderRadius: 3 }}
        />
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {/* File Upload Area */}
            <Box
              {...getRootProps()}
              sx={{
                border: 2,
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                borderStyle: 'dashed',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: files.length === 0 ? 'pointer' : 'default',
                backgroundColor: isDragActive ? 'action.hover' : 'transparent',
                transition: 'all 0.2s ease-in-out',
                mb: 3,
              }}
            >
              <input {...getInputProps()} />
              
              {files.length === 0 ? (
                <>
                  <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {isDragActive ? 'Drop your PDF here' : 'Drag & Drop PDF Files'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Or click to browse and select files (Max 100MB)
                  </Typography>
                  <Button variant="contained" disabled={!quotaData?.canUpload}>
                    Select Files
                  </Button>
                </>
              ) : (
                // File preview
                <Box>
                  {files.map((file) => (
                    <Box key={file.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        {file.status === 'completed' && <CheckCircle sx={{ color: 'success.main', mr: 1 }} />}
                        {file.status === 'error' && <ErrorIcon sx={{ color: 'error.main', mr: 1 }} />}
                        <Typography variant="body1">{file.name}</Typography>
                        <Chip 
                          label={`${(file.size / (1024 * 1024)).toFixed(1)}MB`} 
                          size="small" 
                          sx={{ ml: 2 }} 
                        />
                      </Box>
                      
                      {file.status === 'uploading' && (
                        <LinearProgress sx={{ mb: 1 }} />
                      )}
                      
                      {file.status === 'error' && file.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {file.error}
                        </Alert>
                      )}
                      
                      {file.status === 'completed' && (
                        <Alert severity="success" sx={{ mt: 1 }}>
                          File uploaded successfully! Processing will begin shortly.
                        </Alert>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* Form Fields */}
            {files.length > 0 && files[0].status !== 'error' && (
              <Box sx={{ display: 'grid', gap: 3 }}>
                {/* Book Title */}
                <Controller
                  name="title"
                  control={control}
                  defaultValue={files[0]?.name?.replace('.pdf', '') || ''}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Book Title"
                      placeholder="Enter a title for your book"
                      error={!!errors.title}
                      helperText={errors.title?.message}
                    />
                  )}
                />

                {/* Condensing Level */}
                <Controller
                  name="condensingLevel"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.condensingLevel}>
                      <InputLabel>Condensing Level</InputLabel>
                      <Select {...field} label="Condensing Level">
                        {condensingLevels.map((level) => (
                          <MenuItem key={level.value} value={level.value}>
                            <Box>
                              <Typography variant="body1" sx={{ color: level.color, fontWeight: 600 }}>
                                {level.label}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {level.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.condensingLevel && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                          {errors.condensingLevel.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={!isValid || uploadMutation.isPending || files[0]?.status === 'completed'}
                  startIcon={<UploadIcon />}
                  sx={{ mt: 2 }}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Start Processing'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </form>
    </Box>
  );
};