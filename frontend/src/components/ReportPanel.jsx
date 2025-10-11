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

  const handleExportReport = () => {
    if (!aiSummary) {
      setStatusMessage('Please generate an AI summary before exporting.');
      setMessageType('warning');
      return;
    }

    const doc = new jsPDF();

    // === HEADER SECTION ===
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0); // Black color
    doc.text("AI Generated Report", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0); // Black color
    const reportDate = new Date().toLocaleString();
    doc.text(`Generated on: ${reportDate}`, 14, 30);
    doc.line(14, 35, 196, 35);

    // === EXTRACT PLAIN TEXT FROM HTML ===
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = aiSummary;
    
    // Process the HTML to preserve some structure
    let textContent = '';
    
    // Walk through the elements to preserve headings and structure
    const processNode = (node, indent = 0) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          textContent += ' '.repeat(indent) + text + '\n';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        // Add spacing before headings
        if (tagName.match(/^h[1-6]$/)) {
          textContent += '\n';
        }
        
        // Process children
        node.childNodes.forEach(child => {
          if (tagName === 'li') {
            processNode(child, indent + 2);
          } else {
            processNode(child, indent);
          }
        });
        
        // Add spacing after certain elements
        if (tagName.match(/^(h[1-6]|p|li|div)$/)) {
          textContent += '\n';
        }
        
        // Add bullet for list items
        if (tagName === 'li') {
          const text = node.textContent.trim();
          if (text) {
            textContent = textContent.trimEnd() + '\n';
          }
        }
      }
    };
    
    processNode(tempDiv);
    
    // Fallback to simple text extraction if processing fails
    if (!textContent.trim()) {
      textContent = tempDiv.innerText || tempDiv.textContent;
    }

    // === ADD TEXT CONTENT TO PDF ===
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0); // Ensure black text
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const maxLineWidth = pageWidth - (margin * 2);
    
    // Split text into lines that fit the page width
    const lines = doc.splitTextToSize(textContent, maxLineWidth);
    
    let y = 45; // Starting Y position (after header)
    const lineHeight = 7;
    const bottomMargin = 20;
    
    lines.forEach((line, index) => {
      // Check if we need a new page
      if (y > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20; // Reset Y position for new page
      }
      
      // Check if line looks like a heading (simple heuristic)
      const isHeading = line.trim().length < 50 && 
                       line.trim().length > 0 && 
                       (index === 0 || lines[index - 1].trim() === '');
      
      if (isHeading) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
      }
      
      doc.text(line, margin, y);
      y += lineHeight;
    });

    // === SAVE THE PDF ===
    doc.save('ai_report.pdf');
    
    setStatusMessage('Report exported successfully!');
    setMessageType('success');
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
          <Box sx={{mt: 2}}><Chip label={`Overall Accuracy: ${(datasetResults.overall_accuracy * 100).toFixed(2)}%`} color="primary" /></Box>
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