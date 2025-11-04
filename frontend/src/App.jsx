import { useState } from 'react';
import { Box, Grid, CssBaseline, Typography, Paper } from '@mui/material';
import ModelLoader from './components/ModelLoader';
import ClassifierPanel from './components/ClassifierPanel';
import ReportPanel from './components/ReportPanel';

function App() {
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [modelMetadata, setModelMetadata] = useState(null);
  
  const [batchResults, setBatchResults] = useState([]);
  const [datasetResults, setDatasetResults] = useState(null);
  const [liveResults, setLiveResults] = useState([]);

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

  return (
    <>
      <CssBaseline />
      <Box sx={{ p: 3, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
        <Typography variant="h4" gutterBottom align="center">
          Universal Audio Classification & Evaluation App
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            {/* LAYOUT FIX: Added height: '100%' */}
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <ModelLoader 
                onUploadSuccess={handleUploadSuccess} 
                onLoadSuccess={handleLoadSuccess}
                uploadedFilename={uploadedFilename}
                modelMetadata={modelMetadata}
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            {/* LAYOUT FIX: Added height: '100%' */}
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
          <Grid item xs={12} md={4}>
            {/* LAYOUT FIX: Added height: '100%' */}
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <ReportPanel 
                modelMetadata={modelMetadata}
                batchResults={batchResults}
                datasetResults={datasetResults}
                liveResults={liveResults}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

export default App;