import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Button, Typography, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ScienceIcon from '@mui/icons-material/Science';

const API_URL = 'http://127.0.0.1:8000';

// MODIFIED: Accept `batchResults` as a prop and remove its local state management
const BatchClassifier = ({ modelMetadata, onBatchComplete, batchResults }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileUrls, setFileUrls] = useState({}); // To store URLs for audio playback
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  // Clear local state when a new model is loaded. Parent clears batchResults.
  useEffect(() => {
    setSelectedFiles([]);
    setFileUrls({});
  }, [modelMetadata]);


  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const supportedFormats = ['wav', 'mp3', 'm4a', 'flac'];
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return supportedFormats.includes(extension);
    });

    if (validFiles.length !== files.length) {
      setStatusMessage('Some files had unsupported formats and were ignored.');
      setMessageType('warning');
    } else {
      setStatusMessage('');
    }

    setSelectedFiles(validFiles);

    const urls = {};
    validFiles.forEach(file => {
      urls[file.name] = URL.createObjectURL(file);
    });
    setFileUrls(urls);
  };

  const handleProcessBatch = async () => {
    if (selectedFiles.length === 0) {
      setStatusMessage('No audio files selected.');
      setMessageType('error');
      return;
    }

    setStatusMessage('');
    onBatchComplete([]); // Clear previous results in the parent state

    setIsLoading(true);
    setStatusMessage(`Processing ${selectedFiles.length} files...`);
    setMessageType('info');

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(`${API_URL}/api/audio/batch`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // CRITICAL CHANGE: Call the handler from props instead of setting local state
      onBatchComplete(response.data.results);
      setStatusMessage('Batch processing complete.');
      setMessageType('success');
    } catch (error) {
      const detail = error.response ? error.response.data.detail : 'Could not connect to the server.';
      setStatusMessage(`Error: ${detail}`);
      setMessageType('error');
      // CRITICAL CHANGE: Clear results in the parent on error
      onBatchComplete([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      {/* This section now uses the `modelMetadata` prop as before */}
      {!modelMetadata ? (
        <Alert severity="warning">Please load a model first before using the classifier.</Alert>
      ) : (
        <>
          <Typography variant="subtitle1" gutterBottom>Batch Processing</Typography>
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            fullWidth
          >
            Select Audio Files
            <input
              type="file"
              hidden
              multiple
              accept=".wav,.mp3,.m4a,.flac"
              onChange={handleFileChange}
            />
          </Button>

          {selectedFiles.length > 0 && (
            <Typography sx={{ mt: 1, fontStyle: 'italic' }}>
              {selectedFiles.length} file(s) selected.
            </Typography>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleProcessBatch}
            disabled={selectedFiles.length === 0 || isLoading}
            fullWidth
            sx={{ mt: 2 }}
            startIcon={<ScienceIcon />}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Process Batch'}
          </Button>

          {statusMessage && (
            <Alert severity={messageType} sx={{ mt: 2 }}>{statusMessage}</Alert>
          )}

          {/* This table now correctly reads from the `batchResults` prop */}
          {batchResults && batchResults.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 3, maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Playback</TableCell>
                    <TableCell>Filename</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Predicted Class</TableCell>
                    <TableCell>Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchResults.map((result) => (
                    <TableRow key={result.filename}>
                      <TableCell>
                        {result.status === 'success' && fileUrls[result.filename] && (
                          <audio controls src={fileUrls[result.filename]} style={{ width: '150px' }} />
                        )}
                      </TableCell>
                      <TableCell>{result.filename}</TableCell>
                      <TableCell>
                        <Chip
                          label={result.status}
                          color={result.status === 'success' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{result.prediction?.predicted_class || 'N/A'}</TableCell>
                      <TableCell>
                        {result.prediction ? `${(result.prediction.confidence * 100).toFixed(2)}%` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
};

export default BatchClassifier;