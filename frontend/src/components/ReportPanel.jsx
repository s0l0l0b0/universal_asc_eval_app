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

/**
 * A smart reporting panel that generates different types of reports
 * based on the available data (batch results vs. full dataset evaluation).
 */
const ReportPanel = ({ modelMetadata, batchResults, datasetResults }) => {
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  // Determine the current mode based on which results are available.
  // Full report mode takes precedence.
  // We default to 'deepseek' since that's the key you have set.
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const isFullReportMode = !!datasetResults;
  const isBatchSummaryMode = !!batchResults && !datasetResults;

  // Clear the panel's state whenever the model or input data changes
  useEffect(() => {
    setAiSummary('');
    setStatusMessage('');
  }, [modelMetadata, batchResults, datasetResults]);

  /**
   * Generates an AI summary. Calls a different backend endpoint depending
   * on whether we have a full evaluation or just batch predictions.
   */
  const handleGenerateSummary = async () => {
    setIsAiLoading(true);
    setAiSummary('');
    setStatusMessage('Generating AI-powered report...');
    setMessageType('info');

        try {
      let response;
      // --- FIX 2: Add 'params' to the axios call to send the provider choice ---
      const config = {
        params: {
          provider: selectedProvider
        }
      };

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

  /**
   * Exports the full HTML report. This is only available for
   * a complete dataset evaluation.
   */
  const handleExportReport = async () => {
    if (!isFullReportMode || !aiSummary) {
      setStatusMessage('Export is only available for a full dataset evaluation report after an AI summary has been generated.');
      setMessageType('warning');
      return;
    }

    try {
      const requestBody = {
        evaluation_data: datasetResults,
        ai_summary: { summary_html: aiSummary }
      };
      const response = await axios.post(`${API_URL}/api/export/evaluation`, requestBody, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'evaluation_report.html');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
        setStatusMessage('Failed to export report.');
        setMessageType('error');
    }
  };

  /**
   * Renders the content of the panel based on the current state.
   */
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

        {/* --- FIX 3: Add the dropdown menu UI --- */}
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
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportReport} disabled={!isFullReportMode || !aiSummary}>
            Export Full Report
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