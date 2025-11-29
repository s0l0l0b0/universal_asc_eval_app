import React, { useRef, useEffect, useState } from 'react';
import { Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import TimelineIcon from '@mui/icons-material/Timeline';
import BlurOnIcon from '@mui/icons-material/BlurOn';

const AudioVisualizer = ({ analyserNode, isActive }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [visualMode, setVisualMode] = useState('spectrum');
  
  // Smoothed frequency data for elegant transitions
  const smoothedDataRef = useRef(null);
  const peakDataRef = useRef(null);

  useEffect(() => {
    if (!analyserNode || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(bufferLength);

    // Initialize smoothed data arrays
    if (!smoothedDataRef.current || smoothedDataRef.current.length !== bufferLength) {
      smoothedDataRef.current = new Float32Array(bufferLength).fill(0);
      peakDataRef.current = new Float32Array(bufferLength).fill(0);
    }

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      // Get frequency and time domain data
      analyserNode.getByteFrequencyData(dataArray);
      analyserNode.getByteTimeDomainData(timeDataArray);

      // Clear canvas with dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0f0f23');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw based on visual mode
      if (visualMode === 'spectrum') {
        drawSpectrum(ctx, canvas, dataArray, bufferLength);
      } else if (visualMode === 'waveform') {
        drawWaveform(ctx, canvas, timeDataArray, bufferLength);
      } else if (visualMode === 'circular') {
        drawCircular(ctx, canvas, dataArray, bufferLength);
      }
    };

    const drawSpectrum = (ctx, canvas, dataArray, bufferLength) => {
      // Use only the first half of frequency data (more relevant frequencies)
      const usableBins = Math.floor(bufferLength * 0.6);
      const barCount = 64;
      const barWidth = (canvas.width / barCount) - 2;
      const binsPerBar = Math.floor(usableBins / barCount);

      for (let i = 0; i < barCount; i++) {
        // Average the frequency bins for this bar
        let sum = 0;
        for (let j = 0; j < binsPerBar; j++) {
          sum += dataArray[i * binsPerBar + j];
        }
        const average = sum / binsPerBar;

        // Smooth the data
        const smoothingFactor = 0.85;
        smoothedDataRef.current[i] = smoothedDataRef.current[i] * smoothingFactor + average * (1 - smoothingFactor);
        
        // Update peaks with slow decay
        if (smoothedDataRef.current[i] > peakDataRef.current[i]) {
          peakDataRef.current[i] = smoothedDataRef.current[i];
        } else {
          peakDataRef.current[i] *= 0.98; // Slow decay
        }

        const barHeight = (smoothedDataRef.current[i] / 255) * canvas.height * 0.85;
        const peakHeight = (peakDataRef.current[i] / 255) * canvas.height * 0.85;
        const x = i * (barWidth + 2) + 1;
        const y = canvas.height - barHeight;

        // Create gradient for bars
        const barGradient = ctx.createLinearGradient(0, canvas.height, 0, y);
        const hue = 220 + (i / barCount) * 60; // Blue to purple gradient
        barGradient.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.9)`);
        barGradient.addColorStop(0.5, `hsla(${hue + 20}, 90%, 60%, 0.95)`);
        barGradient.addColorStop(1, `hsla(${hue + 40}, 100%, 70%, 1)`);

        // Draw bar with rounded top
        ctx.fillStyle = barGradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2, barWidth / 2, 0, 0]);
        ctx.fill();

        // Draw peak indicator
        ctx.fillStyle = `hsla(${hue + 40}, 100%, 80%, 0.8)`;
        ctx.fillRect(x, canvas.height - peakHeight - 3, barWidth, 3);

        // Add glow effect
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.5)`;
        ctx.shadowBlur = 10;
      }
      ctx.shadowBlur = 0;
    };

    const drawWaveform = (ctx, canvas, timeDataArray, bufferLength) => {
      ctx.lineWidth = 3;
      
      // Create gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#06b6d4');
      gradient.addColorStop(0.5, '#8b5cf6');
      gradient.addColorStop(1, '#ec4899');
      ctx.strokeStyle = gradient;

      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = timeDataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Draw center line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Add glow effect by drawing again with blur
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = timeDataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawCircular = (ctx, canvas, dataArray, bufferLength) => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.3;
      const bars = 128;
      const binsPerBar = Math.floor(bufferLength / bars);

      // Draw circular spectrum
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < binsPerBar; j++) {
          sum += dataArray[i * binsPerBar + j];
        }
        const average = sum / binsPerBar;
        
        // Smooth
        smoothedDataRef.current[i] = smoothedDataRef.current[i] * 0.8 + average * 0.2;
        
        const barHeight = (smoothedDataRef.current[i] / 255) * radius * 0.8;
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;

        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        const hue = (i / bars) * 360;
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.9)`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Draw center circle
      const innerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.6);
      innerGradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
      innerGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.2)');
      innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing inner circle
      const pulseRadius = radius * 0.4 + (smoothedDataRef.current[0] / 255) * 20;
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isActive, visualMode]);

  // Draw idle state when not active
  useEffect(() => {
    if (!isActive && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0f0f23');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw idle message
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Start listening to see audio visualization', canvas.width / 2, canvas.height / 2);
    }
  }, [isActive]);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mb: 2 
      }}>
        <ToggleButtonGroup
          value={visualMode}
          exclusive
          onChange={(e, newMode) => newMode && setVisualMode(newMode)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: 'rgba(255,255,255,0.6)',
              borderColor: 'rgba(139, 92, 246, 0.3)',
              '&.Mui-selected': {
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                color: '#8b5cf6',
                '&:hover': {
                  backgroundColor: 'rgba(139, 92, 246, 0.3)',
                }
              }
            }
          }}
        >
          <ToggleButton value="spectrum" aria-label="spectrum">
            <GraphicEqIcon sx={{ mr: 0.5 }} /> Spectrum
          </ToggleButton>
          <ToggleButton value="waveform" aria-label="waveform">
            <TimelineIcon sx={{ mr: 0.5 }} /> Waveform
          </ToggleButton>
          <ToggleButton value="circular" aria-label="circular">
            <BlurOnIcon sx={{ mr: 0.5 }} /> Circular
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box sx={{ 
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(139, 92, 246, 0.2)',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)',
      }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={200}
          style={{
            width: '100%',
            height: '200px',
            display: 'block',
          }}
        />
      </Box>
    </Box>
  );
};

export default AudioVisualizer;

