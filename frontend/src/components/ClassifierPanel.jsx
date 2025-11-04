import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import BatchClassifier from './BatchClassifier';
import LiveClassifier from './LiveClassifier';
import DatasetEvaluator from './DatasetEvaluator';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// MODIFIED: Accept and pass down batchResults
const ClassifierPanel = ({ 
  modelMetadata, 
  batchResults, 
  onBatchComplete, 
  onDatasetComplete, 
  onLivePrediction 
}) => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>2. Classifier & Evaluation</Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Live Classification" />
          <Tab label="Batch Processing" />
          <Tab label="Dataset Evaluation (.zip)" />
        </Tabs>
      </Box>
      <TabPanel value={currentTab} index={0}>
        <LiveClassifier 
          modelMetadata={modelMetadata} 
          onLivePrediction={onLivePrediction} 
        />
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        {/* Pass both the results and the handler down */}
        <BatchClassifier 
          modelMetadata={modelMetadata} 
          batchResults={batchResults}
          onBatchComplete={onBatchComplete} 
        />
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        <DatasetEvaluator 
          modelMetadata={modelMetadata} 
          onEvaluationComplete={onDatasetComplete} 
        />
      </TabPanel>
    </Box>
  );
};

export default ClassifierPanel;