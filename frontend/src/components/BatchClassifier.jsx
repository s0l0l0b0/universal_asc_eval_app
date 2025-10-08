import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Button, Typography, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ScienceIcon from '@mui/icons-material/Science';

const API_URL = 'http://127.0.0.1:8000';

const BatchClassifier = ({ modelMetadata, onBatchComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [fileUrls, setFileUrls] = useState({}); // To store URLs for audio playback
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  // Clear results when a new model is loaded
  useEffect(() => {
    setSelectedFiles([]);
    setBatchResults([]);
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

    // Create temporary URLs for playback
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
    setBatchResults([]); // Clear previous results

    setIsLoading(true);
    setBatchResults([]); // Clear previous results
    setStatusMessage(`Processing ${selectedFiles.length} files...`);
    setMessageType('info');

    const formData = new FormData();
    selectedFiles.forEach(file => {
      // The key 'files' must match the FastAPI endpoint parameter name
      formData.append('files', file);
    });

    try {
      // REQ-SW-001: Call the /api/audio/batch endpoint
      const response = await axios.post(`${API_URL}/api/audio/batch`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBatchResults(response.data.results);
      onBatchComplete(response.data.results);
      setStatusMessage('Batch processing complete.');
      setMessageType('success');
    } catch (error) {
      const detail = error.response ? error.response.data.detail : 'Could not connect to the server.';
      setStatusMessage(`Error: ${detail}`);
      setMessageType('error');
      setBatchResults([]);
      onBatchComplete([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>2. Classifier</Typography>
      
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

          {/* REQ-003-3: Results Display and Management */}
          {batchResults.length > 0 && (
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