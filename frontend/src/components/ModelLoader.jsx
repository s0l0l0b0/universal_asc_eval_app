import React, { useState } from 'react';
import axios from 'axios';
import {
  Box, Button, Typography, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableRow, Paper
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const API_URL = 'http://127.0.0.1:8000';

const ModelLoader = ({ onUploadSuccess, onLoadSuccess, uploadedFilename, modelMetadata }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && (file.name.endsWith('.pt') || file.name.endsWith('.pth'))) {
      setSelectedFile(file);
      setStatusMessage(`Selected file: ${file.name}`);
      setMessageType('info');
    } else {
      setSelectedFile(null);
      setStatusMessage('Please select a valid .pt or .pth file.');
      setMessageType('error');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setStatusMessage(`Uploading ${selectedFile.name}...`);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await axios.post(`${API_URL}/api/model/upload`, formData);
      setStatusMessage(response.data.message);
      setMessageType('success');
      onUploadSuccess(response.data.filename);
    } catch (error) {
      const detail = error.response ? error.response.data.detail : 'Could not connect to the server.';
      setStatusMessage(`Error: ${detail}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadModel = async () => {
    if (!uploadedFilename) return;
    setIsLoading(true);
    setStatusMessage(`Loading model: ${uploadedFilename}...`);
    try {
      const response = await axios.post(`${API_URL}/api/model/load`, { filename: uploadedFilename });
      setStatusMessage('Model loaded successfully!');
      setMessageType('success');
      onLoadSuccess(response.data);
    } catch (error) {
      const detail = error.response ? error.response.data.detail : 'Could not connect to the server.';
      setStatusMessage(`Error: ${detail}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>1. Model Management</Typography>
      
      <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} fullWidth>
        Select Model File (.pt, .pth)
        <input type="file" hidden accept=".pt,.pth" onChange={handleFileChange} />
      </Button>
      
      <Button variant="contained" color="primary" onClick={handleUpload} disabled={!selectedFile || isLoading} fullWidth sx={{ mt: 1 }}>
        {isLoading && !uploadedFilename ? <CircularProgress size={24} /> : '1. Upload Model'}
      </Button>
      
      <Button variant="contained" color="secondary" onClick={handleLoadModel} disabled={!uploadedFilename || isLoading} fullWidth sx={{ mt: 2 }} startIcon={<RocketLaunchIcon />}>
        {isLoading && uploadedFilename ? <CircularProgress size={24} /> : '2. Load Model'}
      </Button>
      
      {statusMessage && <Alert severity={messageType} sx={{ mt: 2 }}>{statusMessage}</Alert>}
      
      {modelMetadata && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Loaded Model Metadata</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableBody>
                <TableRow><TableCell><strong>Classes</strong></TableCell><TableCell>{modelMetadata.num_classes || 'N/A'}</TableCell></TableRow>
                <TableRow><TableCell><strong>Class Labels</strong></TableCell><TableCell>{(modelMetadata.class_labels || []).join(', ') || 'Not found'}</TableCell></TableRow>
                <TableRow><TableCell><strong>Sample Rate</strong></TableCell><TableCell>{modelMetadata.sample_rate ? `${modelMetadata.sample_rate} Hz` : 'N/A'}</TableCell></TableRow>
                <TableRow><TableCell><strong>Parameters</strong></TableCell><TableCell>{modelMetadata.num_trainable_parameters ? modelMetadata.num_trainable_parameters.toLocaleString() : 'N/A'}</TableCell></TableRow>
                <TableRow><TableCell><strong>Loaded At</strong></TableCell><TableCell>{modelMetadata.model_loading_timestamp ? new Date(modelMetadata.model_loading_timestamp).toLocaleTimeString() : 'N/A'}</TableCell></TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default ModelLoader;