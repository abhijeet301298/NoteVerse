// frontend/src/components/UploadNote.jsx
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button, CircularProgress } from '@mui/material'; // MUI imports
import CloudUploadIcon from '@mui/icons-material/CloudUpload'; // MUI Icon

function UploadNote({ onUploadSuccess, onError }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      onError("Please select an image or PDF file to upload.");
      return;
    }
    const file = acceptedFiles[0];

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('noteImage', file);

    try {
      const token = localStorage.getItem('firebaseIdToken');
      if (!token) {
        onError("You must be logged in to upload notes.");
        setIsUploading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/upload-note', { // Full URL to Flask backend
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      onUploadSuccess(result.message);

    } catch (error) {
      console.error('Error uploading file:', error);
      onError(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadSuccess, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'grey.400', // Dynamic border color
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragActive ? 'action.hover' : 'background.paper', // Dynamic background
        color: 'text.primary',
        margin: '20px auto',
        width: 'calc(100% - 40px)', // Adjust width for padding
        maxWidth: '800px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px'
      }}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress color="primary" sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.primary">
            Uploading... {uploadProgress}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait, processing your note.
          </Typography>
        </Box>
      ) : (
        <>
          <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
            {isDragActive ? 'Drop the file here...' : 'Drag & drop your note here, or click to select'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supported formats: JPG, PNG, PDF. (Max 16MB)
          </Typography>
          <Button variant="outlined" color="primary" sx={{ mt: 3, textTransform: 'none', borderRadius: '8px' }}>
            Browse Files
          </Button>
        </>
      )}
    </Box>
  );
}

export default UploadNote;