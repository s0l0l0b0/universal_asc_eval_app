import { useState, useEffect } from 'react';
import { Box, CssBaseline, Typography, Paper, IconButton, Tooltip, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import SettingsIcon from '@mui/icons-material/Settings';
import ModelLoader from './components/ModelLoader';
import ClassifierPanel from './components/ClassifierPanel';
import ReportPanel from './components/ReportPanel';
import SettingsDialog from './components/SettingsDialog';
import { loadApiSettings } from './utils/apiSettings';

function App() {
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [modelMetadata, setModelMetadata] = useState(null);
  
  const [batchResults, setBatchResults] = useState([]);
  const [datasetResults, setDatasetResults] = useState(null);
  const [liveResults, setLiveResults] = useState([]);

  // Settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiSettings, setApiSettings] = useState({ openai: '', anthropic: '', deepseek: '' });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = loadApiSettings();
    setApiSettings(savedSettings);
  }, []);

  const handleUploadSuccess = (filename) => {
    setUploadedFilename(filename);
    setModelMetadata(null);
    setBatchResults([]);
    setDatasetResults(null);
    setLiveResults([]);
  };

  const handleLoadSuccess = (metadata) => {
    setModelMetadata(metadata);
    setBatchResults([]);
    setDatasetResults(null);
    setLiveResults([]);
  };
  
  const handleBatchComplete = (results) => {
    setBatchResults(results);
  };

  const handleDatasetComplete = (evaluationData) => {
    setDatasetResults(evaluationData);
  };
  
  const handleLivePrediction = (prediction) => {
    setLiveResults(prevResults => [prediction, ...prevResults]);
  };

  const handleSettingsSave = (newSettings) => {
    setApiSettings(newSettings);
  };

  // Count configured providers
  const configuredCount = Object.values(apiSettings).filter(key => key && key.trim().length > 10).length;

  return (
    <>
      <CssBaseline />
      <Box sx={{ p: 3, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
        {/* Header with Settings */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          mb: 3,
          position: 'relative'
        }}>
          <Typography variant="h4" align="center" sx={{ fontWeight: 600 }}>
            Universal Audio Classification & Evaluation App
          </Typography>
          
          {/* Settings Button */}
          <Box sx={{ position: 'absolute', right: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            {configuredCount > 0 && (
              <Chip 
                label={`${configuredCount}/3 API Keys`} 
                size="small" 
                color="success"
                variant="outlined"
              />
            )}
            <Tooltip title="AI Provider Settings">
              <IconButton 
                onClick={() => setSettingsOpen(true)}
                sx={{ 
                  backgroundColor: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  }
                }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <ModelLoader 
                onUploadSuccess={handleUploadSuccess} 
                onLoadSuccess={handleLoadSuccess}
                uploadedFilename={uploadedFilename}
                modelMetadata={modelMetadata}
              />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <ClassifierPanel 
                modelMetadata={modelMetadata}
                batchResults={batchResults}
                onBatchComplete={handleBatchComplete}
                onDatasetComplete={handleDatasetComplete}
                onLivePrediction={handleLivePrediction}
              />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <ReportPanel 
                modelMetadata={modelMetadata}
                batchResults={batchResults}
                datasetResults={datasetResults}
                liveResults={liveResults}
                apiSettings={apiSettings}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSave}
        initialSettings={apiSettings}
      />
    </>
  );
}

export default App;
