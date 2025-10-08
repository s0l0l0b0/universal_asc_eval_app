import React, { useState } from 'react';
import axios from 'axios';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import FolderZipIcon from '@mui/icons-material/FolderZip';

const API_URL = 'http://127.0.0.1:8000';

const DatasetEvaluator = ({ modelMetadata, onEvaluationComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedFile(file);
      setStatusMessage(`Selected dataset: ${file.name}`);
      setMessageType('info');
    } else {
      setSelectedFile(null);
      setStatusMessage('Please select a valid .zip file.');
      setMessageType('error');
    }
  };

  const handleRunEvaluation = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setStatusMessage('Uploading and evaluating dataset... This may take a while.');
    setMessageType('info');
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API_URL}/api/evaluation/run`, formData);
      onEvaluationComplete(response.data); // Lift state up!
      setStatusMessage('Evaluation complete! Check the Evaluation Report panel.');
      setMessageType('success');
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
      <Typography variant="subtitle1" gutterBottom>Evaluate from Labeled Dataset</Typography>
      {!modelMetadata ? (
        <Alert severity="warning">Please load a model first.</Alert>
      ) : (
        <>
          <Button component="label" variant="outlined" startIcon={<FolderZipIcon />} fullWidth>
            Select Dataset (.zip)
            <input type="file" hidden accept=".zip" onChange={handleFileChange} />
          </Button>
          <Button
            variant="contained"
            onClick={handleRunEvaluation}
            disabled={!selectedFile || isLoading}
            fullWidth sx={{ mt: 2 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Run Dataset Evaluation'}
          </Button>
          {statusMessage && <Alert severity={messageType} sx={{ mt: 2 }}>{statusMessage}</Alert>}
        </>
      )}
    </Box>
  );
};

export default DatasetEvaluator;