import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';

const API_URL = 'http://127.0.0.1:8000';

const ReportPanel = ({ modelMetadata, batchResults, datasetResults }) => {
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [selectedProvider, setSelectedProvider] = useState('deepseek');

  const isFullReportMode = !!datasetResults;
  const isBatchSummaryMode = !!batchResults && !datasetResults;

  useEffect(() => {
    setAiSummary('');
    setStatusMessage('');
  }, [modelMetadata, batchResults, datasetResults]);

  const handleGenerateSummary = async () => {
    setIsAiLoading(true);
    setAiSummary('');
    setStatusMessage(`Generating AI report with ${selectedProvider}...`);
    setMessageType('info');

    try {
      let response;
      const config = { params: { provider: selectedProvider } };

      if (isFullReportMode) {
        const requestBody = { evaluation_data: datasetResults };
        response = await axios.post(`${API_URL}/api/ai/summary`, requestBody, config);
      } else if (isBatchSummaryMode) {
        response = await axios.post(`${API_URL}/api/ai/summarize_predictions`, batchResults, config);
      } else {
        throw new Error("No data available to generate a report.");
      }
      setAiSummary(response.data.summary_html);
      setStatusMessage('AI report generated successfully.');
      setMessageType('success');
    } catch (error) {
      const detail = error.response ? error.response.data.detail : 'Could not connect to the server.';
      setStatusMessage(`Error generating report: ${detail}`);
      setMessageType('error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- THIS IS THE FIX FOR THE EXPORT BUTTON ---
  const handleExportReport = () => {
    if (!aiSummary) {
      setStatusMessage('Please generate an AI summary before exporting.');
      setMessageType('warning');
      return;
    }

    // Create a full, self-contained HTML document as a string
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <title>AI Generated Report</title>
          <style>
              body { font-family: sans-serif; margin: 2em; line-height: 1.6; color: #333; background-color: #f9f9f9; }
              h1, h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #111; }
              ul { padding-left: 20px; }
              li { margin-bottom: 0.5em; }
          </style>
      </head>
      <body>
          <h1>AI Generated Report</h1>
          ${aiSummary}
      </body>
      </html>
    `;

    // Create a Blob (a file-like object) from the HTML string
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ai_report.html'); // The name of the downloaded file
    document.body.appendChild(link);
    link.click(); // Programmatically click the link
    link.remove(); // Clean up by removing the link
  };
  // --- END FIX ---

  const getPanelContent = () => {
    if (!modelMetadata) {
      return <Alert severity="warning">Load a model to enable reporting.</Alert>;
    }
    if (!isFullReportMode && !isBatchSummaryMode) {
      return <Alert severity="info">Run a classification or evaluation in the middle panel to generate a report.</Alert>;
    }
    
    const buttonText = isFullReportMode ? 'Generate Full AI Report' : 'Generate Batch Summary';

    return (
      <>
        <Typography paragraph sx={{ color: 'text.secondary' }}>
          {isFullReportMode 
            ? 'A full dataset evaluation is complete. Select a provider and generate a comprehensive performance report.' 
            : 'A batch processing run is complete. Select a provider and generate a qualitative summary.'}
        </Typography>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="provider-select-label">AI Provider</InputLabel>
          <Select
            labelId="provider-select-label"
            value={selectedProvider}
            label="AI Provider"
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <MenuItem value="openai">OpenAI</MenuItem>
            <MenuItem value="anthropic">Anthropic</MenuItem>
            <MenuItem value="deepseek">DeepSeek</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button variant="contained" color="secondary" startIcon={<AutoFixHighIcon />} onClick={handleGenerateSummary} disabled={isAiLoading}>
            {isAiLoading ? <CircularProgress size={24} color="inherit" /> : buttonText}
          </Button>
          {/* --- FIX: Change button text and disabled logic --- */}
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportReport} disabled={!aiSummary}>
            Export Report
          </Button>
        </Box>
        
        {statusMessage && <Alert severity={messageType} sx={{ mt: 2 }}>{statusMessage}</Alert>}
        
        {isFullReportMode && datasetResults && !aiSummary && (
          <Box sx={{mt: 2}}>
             <Chip label={`Overall Accuracy: ${(datasetResults.overall_accuracy * 100).toFixed(2)}%`} color="primary" />
          </Box>
        )}

        {aiSummary && (
          <Paper sx={{ p: 2, mt: 2, maxHeight: '50vh', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: aiSummary }} />
        )}
      </>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>3. Report Panel</Typography>
      {getPanelContent()}
    </Box>
  );
};

export default ReportPanel;