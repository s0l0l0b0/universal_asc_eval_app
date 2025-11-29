import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Box, Button, Typography, Alert, Paper, Chip, IconButton, Tooltip } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import AudioVisualizer from './AudioVisualizer';

const API_URL = 'http://127.0.0.1:8000';
const USE_FAKE_MIC = false; // Set to false for real microphone

// Helper function to encode raw audio data (PCM) into a WAV file format (Blob)
function bufferToWav(buffer, sampleRate) {
  const numChannels = 1;
  const numSamples = buffer.length;
  const dataView = new DataView(new ArrayBuffer(44 + numSamples * 2));
  
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(dataView, 0, 'RIFF');
  dataView.setUint32(4, 36 + numSamples * 2, true);
  writeString(dataView, 8, 'WAVE');
  writeString(dataView, 12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, 1, true);
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * 2, true);
  dataView.setUint16(32, 2, true);
  dataView.setUint16(34, 16, true);
  writeString(dataView, 36, 'data');
  dataView.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([dataView], { type: 'audio/wav' });
}


const LiveClassifier = ({ modelMetadata, onLivePrediction }) => {
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [isMuted, setIsMuted] = useState(true);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const audioBufferRef = useRef([]);
  const isPredictingRef = useRef(false);
  const oscillatorRef = useRef(null);

  const startListening = async () => {
    setStatusMessage('Requesting microphone permission...');
    try {
      const targetSampleRate = modelMetadata?.sample_rate || 16000;
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: targetSampleRate,
      });

      let source;
      
      if (USE_FAKE_MIC) {
        setStatusMessage('Using demo audio (sine wave).');
        const oscillator = audioContextRef.current.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
        
        // Create frequency modulation for more interesting visualization
        const lfo = audioContextRef.current.createOscillator();
        lfo.frequency.setValueAtTime(0.5, audioContextRef.current.currentTime);
        const lfoGain = audioContextRef.current.createGain();
        lfoGain.gain.setValueAtTime(100, audioContextRef.current.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        lfo.start();
        
        const streamDestination = audioContextRef.current.createMediaStreamDestination();
        oscillator.connect(streamDestination);
        oscillator.start();
        oscillatorRef.current = oscillator;
        
        mediaStreamRef.current = streamDestination.stream;
        source = audioContextRef.current.createMediaStreamSource(streamDestination.stream);
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        source = audioContextRef.current.createMediaStreamSource(stream);
        setStatusMessage('Microphone connected.');
      }

      // Create analyser for visualization
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      setAnalyserNode(analyser);

      // Create gain node for mute control
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : 0.3, audioContextRef.current.currentTime);

      // Connect: source -> analyser -> gain -> destination
      source.connect(analyser);
      analyser.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);

      // Create processor for audio buffering (for prediction)
      const bufferSize = 4096;
      processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioBufferRef.current.push(...inputData);
        
        if (audioBufferRef.current.length >= targetSampleRate) {
          const audioChunk = audioBufferRef.current.slice(0, targetSampleRate);
          audioBufferRef.current = audioBufferRef.current.slice(targetSampleRate);
          predict(audioChunk, targetSampleRate);
        }
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      setIsListening(true);
      setStatusMessage('Listening...');
      setLatestPrediction(null);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      setStatusMessage('Microphone permission denied or not available.');
    }
  };

  const predict = async (audioChunk, sampleRate) => {
    if (isPredictingRef.current) return;
    isPredictingRef.current = true;

    try {
      const wavBlob = bufferToWav(audioChunk, sampleRate);
      const formData = new FormData();
      formData.append('file', wavBlob, 'live_recording.wav');

      const response = await axios.post(`${API_URL}/api/audio/predict`, formData);
      setLatestPrediction(response.data);

      if (onLivePrediction) {
        onLivePrediction(response.data);
      }

    } catch (error) {
      console.error("Prediction error:", error);
    } finally {
      isPredictingRef.current = false;
    }
  };

  const stopListening = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    setIsListening(false);
    setAnalyserNode(null);
    setStatusMessage('Stopped listening.');
    audioBufferRef.current = [];
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        isMuted ? 0.3 : 0, 
        audioContextRef.current.currentTime
      );
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Get color based on confidence
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#22c55e';
    if (confidence >= 0.5) return '#eab308';
    return '#ef4444';
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        Live Classification
      </Typography>
      
      {!modelMetadata ? (
        <Alert severity="warning">Please load a model first.</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Audio Visualizer */}
          <AudioVisualizer analyserNode={analyserNode} isActive={isListening} />

          {/* Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              onClick={isListening ? stopListening : startListening}
              startIcon={isListening ? <StopIcon /> : <MicIcon />}
              sx={{ 
                width: '180px', 
                height: '48px',
                borderRadius: 3,
                background: isListening 
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                boxShadow: isListening
                  ? '0 4px 20px rgba(239, 68, 68, 0.4)'
                  : '0 4px 20px rgba(139, 92, 246, 0.4)',
                '&:hover': {
                  background: isListening 
                    ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                }
              }}
            >
              {isListening ? 'Stop' : 'Start Listening'}
            </Button>
            
            {isListening && (
              <Tooltip title={isMuted ? "Unmute" : "Mute"}>
                <IconButton 
                  onClick={toggleMute}
                  sx={{ 
                    color: isMuted ? 'rgba(255,255,255,0.5)' : '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    '&:hover': {
                      backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    }
                  }}
                >
                  {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Status */}
          <Typography 
            variant="body2" 
            align="center" 
            sx={{ 
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1
            }}
          >
            {isListening && (
              <Box 
                component="span" 
                sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  backgroundColor: '#22c55e',
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.5 }
                  }
                }} 
              />
            )}
            {statusMessage}
          </Typography>

          {/* Prediction Results */}
          {latestPrediction && (
            <Paper 
              elevation={0}
              sx={{ 
                p: 2.5, 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
                borderRadius: 3,
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              {/* Main Prediction */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 2 }}>
                  Detected
                </Typography>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {latestPrediction.predicted_class}
                </Typography>
                <Chip 
                  label={`${(latestPrediction.confidence * 100).toFixed(1)}% confidence`}
                  sx={{ 
                    mt: 1,
                    backgroundColor: getConfidenceColor(latestPrediction.confidence),
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>

              {/* Confidence Bars */}
              <Box sx={{ mt: 2 }}>
                {Object.entries(latestPrediction.all_class_confidences)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5) // Show top 5
                  .map(([label, confidence], index) => (
                    <Box key={label} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: index === 0 ? 600 : 400,
                            color: index === 0 ? 'text.primary' : 'text.secondary'
                          }}
                        >
                          {label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {(confidence * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          backgroundColor: 'rgba(139, 92, 246, 0.1)',
                          overflow: 'hidden'
                        }}
                      >
                        <Box 
                          sx={{ 
                            height: '100%',
                            width: `${confidence * 100}%`,
                            borderRadius: 4,
                            background: index === 0 
                              ? 'linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)'
                              : 'rgba(139, 92, 246, 0.4)',
                            transition: 'width 0.3s ease-out'
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default LiveClassifier;
