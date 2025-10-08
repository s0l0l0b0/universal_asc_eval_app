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
// Import the PDF generation library
import jsPDF from 'jspdf';

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

  /**
   * Exports the currently displayed AI summary as a PDF document
   * with a custom header.
   */
  const handleExportReport = async () => {
    if (!aiSummary) {
      setStatusMessage('Please generate an AI summary before exporting.');
      setMessageType('warning');
      return;
    }

    // 1. Create a new PDF document instance
    const doc = new jsPDF();

    // 2. Add the custom header
    doc.setFontSize(18);
    doc.text("AI Generated Report", 14, 22); // Title

    doc.setFontSize(11);
    const reportDate = new Date().toLocaleString();
    doc.text(`Generated on: ${reportDate}`, 14, 30); // Timestamp

    // Add a separator line
    doc.line(14, 35, 196, 35); // from (x1, y1) to (x2, y2)
    const reportHtml = `<div style="color: black;">${aiSummary}</div>`;
    // 3. Render the HTML content onto the PDF
    // The .html() method is asynchronous.
    await doc.html(reportHtml, {
      callback: function (doc) {
        // This function is called after the HTML is rendered.
        // It saves the document, which triggers the download in the browser.
        doc.save('ai_report.pdf');
      },
      x: 14,       // Left margin
      y: 45,       // Top margin (position below the header)
      width: 170,  // Content width (A4 is 210mm wide, so 210 - 2*margins)
      windowWidth: 650 // Virtual window width for the HTML renderer
    });
  };

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