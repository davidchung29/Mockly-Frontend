/**
 * Simple Working Voice Analyzer - Back to Basics
 * Just the version that was working + slight transition fix
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

const SimpleVoiceAnalyzer = React.memo(({ 
  mediaStream, 
  isActive, 
  onMetricsUpdate,
  className = '' 
}) => {
  // Simple state
  const [currentVolume, setCurrentVolume] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [stats, setStats] = useState({
    avgLoudness: 0,
    variation: 0,
    pauseCount: 0,
    totalTime: 0,
    speakingPercentage: 0
  });

  // Audio refs
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const sourceRef = useRef(null);
  const animationRef = useRef(null);

  // Data tracking with proper pause detection
  const volumeHistoryRef = useRef([]);
  const pauseThreshold = 1;
  const pauseCountRef = useRef(0);
  const speakingFramesRef = useRef(0);
  const totalFramesRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const wasSpeakingRef = useRef(false); // Track previous speaking state for edge detection

  // FIXED volume detection with stronger noise gate
  const getVolume = useCallback((dataArray) => {
    let sum = 0;
    let max = 0;
    let significantSamples = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const value = Math.abs(dataArray[i] - 128);
      sum += value;
      max = Math.max(max, value);
      
      // Count samples that are significantly above noise floor
      if (value > 2) {
        significantSamples++;
      }
    }
    
    const average = sum / dataArray.length;
    const significantRatio = significantSamples / dataArray.length;
    
    // Much stricter noise gate - need both conditions
    if (average < 1 || significantRatio < 0.02) { // Less than 2% of samples above noise floor = silence
      return 0;
    }
    
    let volume = (average / 128) * 100 * 8; // 8x amplification
    
    // Additional hard cut for borderline volumes
    if (volume < 3) {
      return 0;
    }
    
    return Math.min(100, Math.round(volume));
  }, []);

  // FIXED stats update with proper edge detection for pauses
  const updateStats = useCallback((volume) => {
    const now = Date.now();
    const timeElapsed = (now - startTimeRef.current) / 1000;
    
    // Keep volume history
    volumeHistoryRef.current.push(volume);
    if (volumeHistoryRef.current.length > 100) {
      volumeHistoryRef.current.shift();
    }
    
    // Count frames
    totalFramesRef.current++;
    
    // Check if currently speaking
    const isSpeaking = volume > pauseThreshold;
    
    // Count speaking frames
    if (isSpeaking) {
      speakingFramesRef.current++;
    }
    
    // FIXED: Edge detection for pauses (falling edge = speaking to silence)
    if (wasSpeakingRef.current && !isSpeaking) {
      // Just transitioned from speaking to silence - count this as a pause
      pauseCountRef.current++;
    }
    
    // Update previous state for next frame
    wasSpeakingRef.current = isSpeaking;
    
    // Calculate stats
    const avgLoudness = volumeHistoryRef.current.length > 0 
      ? Math.round(volumeHistoryRef.current.reduce((a, b) => a + b, 0) / volumeHistoryRef.current.length)
      : 0;
    
    // Variation
    let variation = 0;
    if (volumeHistoryRef.current.length > 1) {
      let totalChange = 0;
      for (let i = 1; i < volumeHistoryRef.current.length; i++) {
        totalChange += Math.abs(volumeHistoryRef.current[i] - volumeHistoryRef.current[i-1]);
      }
      variation = Math.round(totalChange / (volumeHistoryRef.current.length - 1));
    }
    
    // Speaking percentage
    const speakingPercentage = totalFramesRef.current > 0 
      ? Math.round((speakingFramesRef.current / totalFramesRef.current) * 100)
      : 0;
    
    const newStats = {
      avgLoudness,
      variation,
      pauseCount: pauseCountRef.current,
      totalTime: Math.round(timeElapsed),
      speakingPercentage
    };
    
    setStats(newStats);
    
    // Send to parent
    if (onMetricsUpdate) {
      onMetricsUpdate({
        averageVolume: avgLoudness,
        volumeVariation: variation,
        pitchVariation: variation,
        speechRate: speakingPercentage,
        clarity: avgLoudness > 5 ? 85 : 60,
        totalSamples: volumeHistoryRef.current.length,
        pauseCount: pauseCountRef.current
      });
    }
  }, [onMetricsUpdate]);

  // Main processing loop
  const processAudio = useCallback(() => {
    if (!analyzerRef.current || !isActive) return;
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteTimeDomainData(dataArray);
    
    const volume = getVolume(dataArray);
    setCurrentVolume(volume);
    updateStats(volume);
    
    if (isActive) {
      animationRef.current = requestAnimationFrame(processAudio);
    }
  }, [isActive, getVolume, updateStats]);

  // SIMPLE audio setup - back to working version
  const setupAudio = useCallback(async () => {
    try {
      console.log('🎤 Setting up simple voice analysis...');
      
      if (!mediaStream) return;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(mediaStream);
      sourceRef.current = source;

      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 512; // Back to 512
      analyzer.smoothingTimeConstant = 0.3; // Back to 0.3
      analyzerRef.current = analyzer;

      source.connect(analyzer);

      console.log('✅ Audio setup complete');
      setIsDetecting(true);
      processAudio();

    } catch (error) {
      console.error('❌ Audio setup failed:', error);
      setIsDetecting(false);
    }
  }, [mediaStream, processAudio]);

  // Cleanup
  const cleanupAudio = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsDetecting(false);
    setCurrentVolume(0);
  }, []);

  // Reset with new state
  const resetAnalyzer = useCallback(() => {
    volumeHistoryRef.current = [];
    pauseCountRef.current = 0;
    speakingFramesRef.current = 0;
    totalFramesRef.current = 0;
    wasSpeakingRef.current = false; // Reset speaking state
    startTimeRef.current = Date.now();
    
    setStats({
      avgLoudness: 0,
      variation: 0,
      pauseCount: 0,
      totalTime: 0,
      speakingPercentage: 0
    });
    setCurrentVolume(0);
  }, []);

  // Effects
  useEffect(() => {
    if (isActive && mediaStream) {
      setupAudio();
    } else {
      cleanupAudio();
    }
    return cleanupAudio;
  }, [isActive, mediaStream, setupAudio, cleanupAudio]);

  useEffect(() => {
    window.voiceAnalyzerReset = resetAnalyzer;
    return () => delete window.voiceAnalyzerReset;
  }, [resetAnalyzer]);

  if (!isActive) return null;

  return (
    <div className={`simple-voice-analyzer ${className}`}>
      <div className="voice-header">
        <h4 className="voice-title">
          <i className="fas fa-microphone"></i>
          Voice Analysis
        </h4>
        <div className="voice-status" style={{
          color: isDetecting ? '#10b981' : '#ef4444',
          fontWeight: 'bold',
          fontSize: '12px',
          padding: '4px 8px',
          background: isDetecting ? '#dcfce7' : '#fef2f2',
          borderRadius: '4px'
        }}>
          {isDetecting ? 'LISTENING' : 'INACTIVE'}
        </div>
      </div>

      {/* Volume bar - SIMPLE with just slight smoothing */}
      <div style={{
        margin: '12px 0',
        padding: '8px',
        background: '#f8fafc',
        borderRadius: '6px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '12px', marginBottom: '4px', color: '#64748b' }}>
          Live Volume: {currentVolume}% | Average: {stats.avgLoudness}%
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: '#e2e8f0',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(100, currentVolume)}%`,
            height: '100%',
            background: currentVolume > pauseThreshold ? '#10b981' : '#ef4444',
            transition: 'width 0.008s linear' // Much faster and linear for more responsive feel
          }} />
        </div>
      </div>

      {/* Stats - SIMPLE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{
          padding: '8px',
          background: '#f8fafc',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: stats.avgLoudness > 5 ? '#10b981' : '#ef4444' }}>
            {stats.avgLoudness}%
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>
            Avg Loudness
          </div>
        </div>

        <div style={{
          padding: '8px',
          background: '#f8fafc',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: stats.variation > 5 ? '#10b981' : '#f59e0b' }}>
            {stats.variation}%
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>
            Variation
          </div>
        </div>

        <div style={{
          padding: '8px',
          background: '#f8fafc',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }}>
            {stats.pauseCount}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>
            Pauses
          </div>
        </div>

        <div style={{
          padding: '8px',
          background: '#f8fafc',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {stats.speakingPercentage}%
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>
            Speaking
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{
        padding: '8px',
        background: stats.avgLoudness > 3 ? '#dcfce7' : '#fef2f2',
        border: `1px solid ${stats.avgLoudness > 3 ? '#16a34a' : '#dc2626'}`,
        borderRadius: '6px',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        {stats.avgLoudness > 3 ? (
          <span style={{ color: '#15803d' }}>
            <strong>✅ Voice detected!</strong>
            <br />Speaking {stats.speakingPercentage}% of the time
          </span>
        ) : (
          <span style={{ color: '#dc2626' }}>
            <strong>💬 Just speak normally</strong>
            <br />Current: {currentVolume}%
          </span>
        )}
      </div>
    </div>
  );
});

SimpleVoiceAnalyzer.displayName = 'SimpleVoiceAnalyzer';

export default SimpleVoiceAnalyzer;