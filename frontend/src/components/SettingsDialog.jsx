import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  Chip,
  InputAdornment,
  Divider,
  Link
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { saveApiSettings, STORAGE_KEY } from '../utils/apiSettings';

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o model for high-quality reports',
    keyPrefix: 'sk-',
    docsUrl: 'https://platform.openai.com/api-keys',
    color: '#10a37f'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3 Haiku for fast, efficient summaries',
    keyPrefix: 'sk-ant-',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    color: '#d4a574'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek Chat for cost-effective analysis',
    keyPrefix: 'sk-',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    color: '#6366f1'
  }
];

const SettingsDialog = ({ open, onClose, onSave, initialSettings }) => {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    deepseek: ''
  });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    anthropic: false,
    deepseek: false
  });
  const [savedMessage, setSavedMessage] = useState('');

  // Load settings when dialog opens
  useEffect(() => {
    if (open && initialSettings) {
      setApiKeys({
        openai: initialSettings.openai || '',
        anthropic: initialSettings.anthropic || '',
        deepseek: initialSettings.deepseek || ''
      });
    }
  }, [open, initialSettings]);

  const handleKeyChange = (provider, value) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: value
    }));
    setSavedMessage('');
  };

  const toggleShowKey = (provider) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const handleSave = () => {
    // Save to localStorage using utility
    saveApiSettings(apiKeys);
    
    // Notify parent component
    onSave(apiKeys);
    
    setSavedMessage('Settings saved successfully!');
    setTimeout(() => {
      onClose();
      setSavedMessage('');
    }, 1000);
  };

  const handleClear = (provider) => {
    handleKeyChange(provider, '');
  };

  const isKeyConfigured = (provider) => {
    return apiKeys[provider] && apiKeys[provider].trim().length > 10;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 2
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            AI Provider Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure API keys for AI-powered report generation
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          API keys are stored locally in your browser and sent securely to the backend only when generating reports.
        </Alert>

        {PROVIDERS.map((provider, index) => (
          <Box key={provider.id}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {provider.name}
                </Typography>
                {isKeyConfigured(provider.id) ? (
                  <Chip 
                    icon={<CheckCircleIcon />} 
                    label="Configured" 
                    size="small" 
                    color="success"
                    sx={{ height: 24 }}
                  />
                ) : (
                  <Chip 
                    icon={<ErrorIcon />} 
                    label="Not Set" 
                    size="small" 
                    color="default"
                    sx={{ height: 24 }}
                  />
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {provider.description}.{' '}
                <Link href={provider.docsUrl} target="_blank" rel="noopener">
                  Get API key →
                </Link>
              </Typography>

              <TextField
                fullWidth
                size="small"
                type={showKeys[provider.id] ? 'text' : 'password'}
                placeholder={`Enter your ${provider.name} API key`}
                value={apiKeys[provider.id]}
                onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => toggleShowKey(provider.id)}
                        edge="end"
                        size="small"
                      >
                        {showKeys[provider.id] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                      {apiKeys[provider.id] && (
                        <Button 
                          size="small" 
                          onClick={() => handleClear(provider.id)}
                          sx={{ ml: 1, minWidth: 'auto' }}
                        >
                          Clear
                        </Button>
                      )}
                    </InputAdornment>
                  ),
                  sx: {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: provider.color,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: provider.color,
                    },
                  },
                }}
              />
            </Box>
            
            {index < PROVIDERS.length - 1 && <Divider sx={{ mb: 3 }} />}
          </Box>
        ))}

        {savedMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {savedMessage}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
            }
          }}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;

