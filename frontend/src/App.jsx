import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import ModelLoader from './components/ModelLoader';
import ClassifierPanel from './components/ClassifierPanel';
import ReportPanel from './components/ReportPanel';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [modelMetadata, setModelMetadata] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [datasetResults, setDatasetResults] = useState(null);

  const handleModelUploadSuccess = (filename) => {
    setUploadedFilename(filename);
    setModelMetadata(null);
    setBatchResults(null);
    setDatasetResults(null);
  };

  const handleModelLoadSuccess = (metadata) => {
    setModelMetadata(metadata);
  };

  const handleBatchComplete = (results) => {
    setBatchResults(results);
    setDatasetResults(null);
  };

  const handleDatasetComplete = (results) => {
    setDatasetResults(results);
    setBatchResults(null);
  };

  const cardStyles = {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'background.paper',
    borderRadius: 2,
    boxShadow: 3,
    padding: 2,
    overflowY: 'auto',
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        
        <Box sx={{ p: 2, borderBottom: '1px solid #444', textAlign: 'center' }}>
          <Typography variant="h5" component="h1">
            Universal Audio Scene Classification Model Evaluator
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexGrow: 1, p: 2, gap: 2, overflow: 'hidden' }}>
          
          <Box sx={{ ...cardStyles, width: '30%' }}>
            <ModelLoader 
              onUploadSuccess={handleModelUploadSuccess}
              onLoadSuccess={handleModelLoadSuccess}
              uploadedFilename={uploadedFilename}
              modelMetadata={modelMetadata}
            />
          </Box>

          <Box sx={{ ...cardStyles, width: '40%' }}>
            <ClassifierPanel 
              modelMetadata={modelMetadata}
              onBatchComplete={handleBatchComplete}
              onDatasetComplete={handleDatasetComplete}
            />
          </Box>

          <Box sx={{ ...cardStyles, width: '30%' }}>
            <ReportPanel 
              modelMetadata={modelMetadata}
              batchResults={batchResults}
              datasetResults={datasetResults}
            />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;