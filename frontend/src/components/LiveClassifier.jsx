import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Box, Button, Typography, Alert, LinearProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';

const API_URL = 'http://127.0.0.1:8000';
const USE_FAKE_MIC = true;

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

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const audioBufferRef = useRef([]); // To accumulate audio data
  const isPredictingRef = useRef(false); // To prevent overlapping predictions

  const startListening = async () => {
    setStatusMessage('Requesting microphone permission...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const targetSampleRate = modelMetadata.sample_rate || 16000;
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: targetSampleRate,
      });

      // --- NEW LOGIC: FAKE vs REAL MIC ---
      if (USE_FAKE_MIC) {
        setStatusMessage('Using fake microphone (sine wave).');
        const oscillator = audioContextRef.current.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime); // A4 pitch
        
        const streamDestination = audioContextRef.current.createMediaStreamDestination();
        oscillator.connect(streamDestination);
        oscillator.start();
        
        mediaStreamRef.current = streamDestination.stream;
      } else {
        setStatusMessage('Requesting microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }
      // --- END NEW LOGIC ---

      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // REQ-002-2: Process audio in real-time
      const bufferSize = 4096; // A common buffer size
      processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        audioBufferRef.current.push(...inputData);
        
        // REQ-002-2: Perform inference every 1 second
        if (audioBufferRef.current.length >= targetSampleRate) {
          const audioChunk = audioBufferRef.current.slice(0, targetSampleRate);
          audioBufferRef.current = audioBufferRef.current.slice(targetSampleRate); // Keep the rest
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
    if (isPredictingRef.current) return; // Don't send a new request if one is in flight
    isPredictingRef.current = true;

    try {
      const wavBlob = bufferToWav(audioChunk, sampleRate);
      const formData = new FormData();
      formData.append('file', wavBlob, 'live_recording.wav');

      const response = await axios.post(`${API_URL}/api/audio/predict`, formData);
      setLatestPrediction(response.data);

      // --- NEW: Report the prediction to the parent component ---
      if (onLivePrediction) {
        onLivePrediction(response.data);
      }

    } catch (error) {
      console.error("Prediction error:", error);
      // Don't show an error message for every failed prediction to avoid spamming the UI
    } finally {
      isPredictingRef.current = false;
    }
  };

  const stopListening = () => {
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
    setStatusMessage('Stopped listening.');
    audioBufferRef.current = [];
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <Box>
       <Typography variant="subtitle1" gutterBottom>Live Classification</Typography>
      {!modelMetadata ? (
        <Alert severity="warning">Please load a model first.</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color={isListening ? 'error' : 'primary'}
            onClick={isListening ? stopListening : startListening}
            startIcon={isListening ? <StopIcon /> : <MicIcon />}
            sx={{ width: '200px', height: '50px' }}
          >
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </Button>

          <Typography>{statusMessage}</Typography>

          {/* REQ-002-3: Visual Feedback Interface */}
          {isListening && latestPrediction && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Typography variant="h5" align="center">
                {latestPrediction.predicted_class}
              </Typography>
              <Typography variant="h6" align="center" color="text.secondary">
                Confidence: {(latestPrediction.confidence * 100).toFixed(1)}%
              </Typography>
              <Box sx={{ mt: 2 }}>
                {Object.entries(latestPrediction.all_class_confidences)
                  .sort(([, a], [, b]) => b - a) // Sort by confidence
                  .map(([label, confidence]) => (
                    <Box key={label} sx={{ mb: 1 }}>
                      <Typography variant="body2">{label}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={confidence * 100}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                  ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default LiveClassifier;