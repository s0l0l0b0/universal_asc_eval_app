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
  MenuItem,
  Tooltip,
  IconButton
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import jsPDF from 'jspdf';

const API_URL = 'http://127.0.0.1:8000';

const PROVIDER_INFO = {
  openai: { name: 'OpenAI', model: 'GPT-4o' },
  anthropic: { name: 'Anthropic', model: 'Claude 3 Haiku' },
  deepseek: { name: 'DeepSeek', model: 'DeepSeek Chat' }
};

const ReportPanel = ({ modelMetadata, batchResults, datasetResults, apiSettings, onOpenSettings }) => {
  const [aiSummary, setAiSummary] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [selectedProvider, setSelectedProvider] = useState('deepseek');

  const isFullReportMode = !!datasetResults;
  const isBatchSummaryMode = !!batchResults && batchResults.length > 0 && !datasetResults;

  // Check if selected provider has API key configured
  const isProviderConfigured = (provider) => {
    return apiSettings && apiSettings[provider] && apiSettings[provider].trim().length > 10;
  };

  useEffect(() => {
    setAiSummary('');
    setStatusMessage('');
  }, [modelMetadata, batchResults, datasetResults]);

  const handleGenerateSummary = async () => {
    // Check if API key is configured
    if (!isProviderConfigured(selectedProvider)) {
      setStatusMessage(`Please configure your ${PROVIDER_INFO[selectedProvider].name} API key in Settings.`);
      setMessageType('error');
      return;
    }

    setIsAiLoading(true);
    setAiSummary('');
    setStatusMessage(`Generating AI report with ${PROVIDER_INFO[selectedProvider].name}...`);
    setMessageType('info');

    try {
      let response;
      const config = { 
        params: { provider: selectedProvider },
        headers: {
          'X-API-Key': apiSettings[selectedProvider]
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

  const handleExportReport = () => {
    if (!aiSummary) {
      setStatusMessage('Please generate an AI summary before exporting.');
      setMessageType('warning');
      return;
    }

    const doc = new jsPDF();

    // === HEADER SECTION ===
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text("AI Generated Report", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const reportDate = new Date().toLocaleString();
    doc.text(`Generated on: ${reportDate}`, 14, 30);
    doc.line(14, 35, 196, 35);

    // === EXTRACT PLAIN TEXT FROM HTML ===
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = aiSummary;
    
    let textContent = '';
    
    const processNode = (node, indent = 0) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          textContent += ' '.repeat(indent) + text + '\n';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        if (tagName.match(/^h[1-6]$/)) {
          textContent += '\n';
        }
        
        node.childNodes.forEach(child => {
          if (tagName === 'li') {
            processNode(child, indent + 2);
          } else {
            processNode(child, indent);
          }
        });
        
        if (tagName.match(/^(h[1-6]|p|li|div)$/)) {
          textContent += '\n';
        }
        
        if (tagName === 'li') {
          const text = node.textContent.trim();
          if (text) {
            textContent = textContent.trimEnd() + '\n';
          }
        }
      }
    };
    
    processNode(tempDiv);
    
    if (!textContent.trim()) {
      textContent = tempDiv.innerText || tempDiv.textContent;
    }

    // === ADD TEXT CONTENT TO PDF ===
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;
    const maxLineWidth = pageWidth - (margin * 2);
    
    const lines = doc.splitTextToSize(textContent, maxLineWidth);
    
    let y = 45;
    const lineHeight = 7;
    const bottomMargin = 20;
    
    lines.forEach((line, index) => {
      if (y > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
      }
      
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
    const currentProviderConfigured = isProviderConfigured(selectedProvider);

    return (
      <>
        <Typography paragraph sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          {isFullReportMode 
            ? 'A full dataset evaluation is complete. Select a provider and generate a comprehensive performance report.' 
            : 'A batch processing run is complete. Select a provider and generate a qualitative summary.'}
        </Typography>

        {/* Provider Selection */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="provider-select-label">AI Provider</InputLabel>
          <Select
            labelId="provider-select-label"
            value={selectedProvider}
            label="AI Provider"
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            {Object.entries(PROVIDER_INFO).map(([key, info]) => (
              <MenuItem key={key} value={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Box>
                    <Typography component="span">{info.name}</Typography>
                    <Typography component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: '0.85rem' }}>
                      ({info.model})
                    </Typography>
                  </Box>
                  {isProviderConfigured(key) ? (
                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 18, ml: 1 }} />
                  ) : (
                    <ErrorOutlineIcon sx={{ color: 'text.disabled', fontSize: 18, ml: 1 }} />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* API Key Warning */}
        {!currentProviderConfigured && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={onOpenSettings} startIcon={<SettingsIcon />}>
                Configure
              </Button>
            }
          >
            {PROVIDER_INFO[selectedProvider].name} API key not configured.
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Tooltip title={!currentProviderConfigured ? 'Configure API key first' : ''}>
            <span>
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<AutoFixHighIcon />} 
                onClick={handleGenerateSummary} 
                disabled={isAiLoading || !currentProviderConfigured}
                sx={{
                  background: currentProviderConfigured 
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)'
                    : undefined,
                  '&:hover': {
                    background: currentProviderConfigured 
                      ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
                      : undefined,
                  }
                }}
              >
                {isAiLoading ? <CircularProgress size={24} color="inherit" /> : buttonText}
              </Button>
            </span>
          </Tooltip>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />} 
            onClick={handleExportReport} 
            disabled={!aiSummary}
          >
            Export PDF
          </Button>
        </Box>
        
        {statusMessage && <Alert severity={messageType} sx={{ mt: 2 }}>{statusMessage}</Alert>}
        
        {isFullReportMode && datasetResults && !aiSummary && (
          <Box sx={{mt: 2}}>
            <Chip 
              label={`Overall Accuracy: ${(datasetResults.overall_accuracy * 100).toFixed(2)}%`} 
              color="primary" 
            />
          </Box>
        )}

        {aiSummary && (
          <Paper 
            sx={{ 
              p: 2, 
              mt: 2, 
              maxHeight: '50vh', 
              overflowY: 'auto',
              '& h1, & h2, & h3': {
                color: '#1a1a2e',
                marginTop: 2,
                marginBottom: 1,
              },
              '& p': {
                marginBottom: 1,
              },
              '& ul, & ol': {
                paddingLeft: 3,
              }
            }} 
            dangerouslySetInnerHTML={{ __html: aiSummary }} 
          />
        )}
      </>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">3. Report Panel</Typography>
        <Tooltip title="API Settings">
          <IconButton size="small" onClick={onOpenSettings}>
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {getPanelContent()}
    </Box>
  );
};

export default ReportPanel;
