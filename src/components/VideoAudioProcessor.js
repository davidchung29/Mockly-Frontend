/**
 * SIMPLE FIX - Direct Data Transfer
 * Just make sure voice data gets to the feedback - no fancy stuff
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import SelectedQuestionDisplay from './SelectedQuestionDisplay';
import PermissionScreen from './PermissionScreen';
import VideoCard from './VideoCard';
import EyeTrackingAnalyzer from './EyeTrackingAnalyzer';
import PitchAnalyzer from './PitchAnalyzer';
import './PitchAnalyzer.css';
import { useMediaStream } from '../hooks/useMediaStream';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTranscriptSimulation } from '../hooks/useTranscriptSimulation';
import { DevHelpers } from '../config/devConfig';
import { ResourceCleanup } from '../utils/resourceCleanup';
import { DEFAULT_METRICS, TranscriptValidator } from '../utils/interviewUtils';
import { INTERVIEW_CONFIG, UI_TEXT, ERROR_MESSAGES } from '../constants/interviewConstants';

const VideoAudioProcessor = React.memo(({ onFinish, onEnd, selectedQuestion }) => {
  // UI state
  const [listeningDots, setListeningDots] = useState('');
  const [isVideoCardExpanded, setIsVideoCardExpanded] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Analysis state
  const [eyeTrackingMetrics, setEyeTrackingMetrics] = useState({
    eyeContactPercentage: 0,
    smilePercentage: 0,
    gazeStatus: 'Initializing',
    sessionTime: '00:00'
  });
  
  const [voiceMetrics, setVoiceMetrics] = useState({
    volume: 0,
    averageVolume: 0,
    volumeVariation: 0,
    pitchVariation: 60,
    speechRate: 70,
    clarity: 80,
    totalSamples: 0
  });
  
  const [isEyeTrackingActive, setIsEyeTrackingActive] = useState(false);
  const [isVoiceAnalysisActive, setIsVoiceAnalysisActive] = useState(false);
  
  // ✅ SIMPLE: Just use current state values directly
  const latestEyeMetricsRef = useRef(null);
  const latestVoiceMetricsRef = useRef(null);
  
  // Other refs
  const transcriptScrollableRef = useRef();
  const dotIntervalRef = useRef();
  const timeoutRef = useRef();
  const eyeTrackingCanvasRef = useRef();

  // Hooks
  const mediaStream = useMediaStream();
  const speechRecognition = useSpeechRecognition();
  const transcriptSimulation = useTranscriptSimulation();

  // Get current transcript
  const getCurrentTranscript = useCallback(() => {
    if (DevHelpers.isTranscriptSimulationEnabled()) {
      return transcriptSimulation.getFinalTranscript();
    }
    return speechRecognition.getFinalTranscript();
  }, [transcriptSimulation, speechRecognition]);

  // Get live transcript
  const getLiveTranscript = useCallback(() => {
    if (DevHelpers.isTranscriptSimulationEnabled()) {
      return transcriptSimulation.simulatedTranscript;
    }
    return speechRecognition.transcript;
  }, [transcriptSimulation.simulatedTranscript, speechRecognition.transcript]);

  // ✅ SIMPLE: Store metrics directly when received
  const handleEyeTrackingUpdate = useCallback((metrics) => {
    console.log('👁️ Eye tracking update:', metrics);
    setEyeTrackingMetrics(metrics);
    latestEyeMetricsRef.current = metrics; // Store immediately
  }, []);

  const handleVoiceMetricsUpdate = useCallback((metrics) => {
    console.log('🎙️ Voice metrics update:', metrics);
    setVoiceMetrics(metrics);
    latestVoiceMetricsRef.current = metrics; // Store immediately
    
    console.log('🎙️ STORED in ref:', latestVoiceMetricsRef.current);
  }, []);

  // Dots animation
  const setupDotAnimation = useCallback(() => {
    if (dotIntervalRef.current) clearInterval(dotIntervalRef.current);
    dotIntervalRef.current = setInterval(() => {
      setListeningDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
  }, []);

  // ✅ SIMPLE: Session timeout
  const setupSessionTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (isFinished) return;
      
      console.log('⏰ TIMEOUT - Completing interview');
      handleInterviewCompletion();
    }, INTERVIEW_CONFIG.sessionDuration);
  }, [isFinished]);

  // Auto-scroll transcript
  const scrollToBottom = useCallback(() => {
    if (transcriptScrollableRef.current) {
      transcriptScrollableRef.current.scrollTop = transcriptScrollableRef.current.scrollHeight;
    }
  }, []);

  // ✅ SIMPLE: Main completion handler
  const handleInterviewCompletion = useCallback(() => {
    if (isFinished) return;
    
    console.log('🎯 ===== COMPLETING INTERVIEW =====');
    setIsFinished(true);
    setIsEyeTrackingActive(false);
    setIsVoiceAnalysisActive(false);
    
    // Get the LATEST metrics from refs (most recent data)
    const finalEyeMetrics = latestEyeMetricsRef.current || eyeTrackingMetrics;
    const finalVoiceMetrics = latestVoiceMetricsRef.current || voiceMetrics;
    
    console.log('📊 Final eye metrics:', finalEyeMetrics);
    console.log('🎙️ Final voice metrics:', finalVoiceMetrics);
    
    const completeTranscript = getCurrentTranscript();
    
    // ✅ SIMPLE: Build the final object with direct field assignment
    const finalReport = {
      // Default metrics
      ...DEFAULT_METRICS,
      
      // Eye tracking - simple direct assignment
      eyeContactPercentage: finalEyeMetrics?.eyeContactPercentage || 0,
      smilePercentage: finalEyeMetrics?.smilePercentage || 0,
      sessionDuration: finalEyeMetrics?.sessionTime || '00:00',
      
      // Voice analysis - simple direct assignment
      averageVolume: finalVoiceMetrics?.averageVolume || 0,
      volumeVariation: finalVoiceMetrics?.volumeVariation || 0,
      pitchVariation: finalVoiceMetrics?.pitchVariation || 0,
      speechRate: finalVoiceMetrics?.speechRate || 0,
      clarity: finalVoiceMetrics?.clarity || 0,
      totalSamples: finalVoiceMetrics?.totalSamples || 0,
      
      // Also include nested objects for backup
      eyeTracking: finalEyeMetrics || {},
      voiceAnalysis: finalVoiceMetrics || {}
    };
    
    console.log('🚀 FINAL REPORT OBJECT:');
    console.log('averageVolume:', finalReport.averageVolume);
    console.log('volumeVariation:', finalReport.volumeVariation);
    console.log('totalSamples:', finalReport.totalSamples);
    console.log('Full report:', finalReport);
    
    // Call onFinish
    console.log('📞 Calling onFinish...');
    if (TranscriptValidator.isValid(completeTranscript)) {
      onFinish(finalReport, completeTranscript);
    } else {
      onFinish(finalReport, '');
    }
    console.log('📞 onFinish called successfully');
    
    console.log('🎯 ===== COMPLETION DONE =====');
  }, [isFinished, getCurrentTranscript, onFinish, eyeTrackingMetrics, voiceMetrics]);

  // Handle done interview
  const handleDoneInterview = useCallback(() => {
    if (isFinished) return;
    
    const confirmDone = window.confirm(UI_TEXT.SKIP_CONFIRMATION);
    if (!confirmDone) return;
    
    console.log('✋ MANUAL completion');
    handleInterviewCompletion();
  }, [isFinished, handleInterviewCompletion]);

  // Handle end interview
  const handleEndInterview = useCallback(() => {
    if (isFinished) return;
    
    const confirmEnd = window.confirm(UI_TEXT.END_CONFIRMATION);
    if (!confirmEnd) return;
    
    setIsFinished(true);
    setIsEyeTrackingActive(false);
    setIsVoiceAnalysisActive(false);
    if (onEnd) onEnd();
  }, [isFinished, onEnd]);

  // Toggle video card
  const toggleVideoCard = useCallback(() => {
    setIsVideoCardExpanded(prev => !prev);
  }, []);

  // Reset metrics
  const resetAllMetrics = useCallback(() => {
    console.log('🔄 Resetting metrics');
    
    const resetEyeMetrics = {
      eyeContactPercentage: 0,
      smilePercentage: 0,
      gazeStatus: 'Initializing',
      sessionTime: '00:00'
    };
    
    const resetVoiceMetrics = {
      volume: 0,
      averageVolume: 0,
      volumeVariation: 0,
      pitchVariation: 60,
      speechRate: 70,
      clarity: 80,
      totalSamples: 0
    };
    
    setEyeTrackingMetrics(resetEyeMetrics);
    setVoiceMetrics(resetVoiceMetrics);
    latestEyeMetricsRef.current = null;
    latestVoiceMetricsRef.current = null;
    
    // Call reset functions
    if (window.eyeTrackingReset) window.eyeTrackingReset();
    if (window.pitchAnalyzerReset) window.pitchAnalyzerReset();
  }, []);

  // Initialize interview
  const initializeInterview = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      console.log('🚀 Initializing...');
      setIsInitialized(true);
      setupDotAnimation();
      resetAllMetrics();
      
      // Start media capture
      await mediaStream.startCapture();
      
      // Start speech recognition
      if (DevHelpers.isTranscriptSimulationEnabled()) {
        transcriptSimulation.startSimulation();
      } else {
        speechRecognition.startListening();
      }
      
      // Start analyses
      setIsEyeTrackingActive(true);
      setIsVoiceAnalysisActive(true);
      
      // Setup timeout
      setupSessionTimeout();
      
      console.log('✅ Initialization complete');
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      setIsInitialized(false);
    }
  }, [isInitialized, mediaStream, speechRecognition, transcriptSimulation, setupDotAnimation, setupSessionTimeout, resetAllMetrics]);

  // Cleanup
  const cleanupAll = useCallback(() => {
    ResourceCleanup.cleanupAll({
      timeouts: [timeoutRef],
      intervals: [dotIntervalRef],
      mediaStreams: [mediaStream.mediaStream],
      speechRecognition: []
    });
    
    mediaStream.stopCapture();
    speechRecognition.stopListening();
    transcriptSimulation.stopSimulation();
    setIsEyeTrackingActive(false);
    setIsVoiceAnalysisActive(false);
  }, [mediaStream, speechRecognition, transcriptSimulation]);

  // Auto-scroll effect
  useEffect(() => {
    scrollToBottom();
  }, [getLiveTranscript(), scrollToBottom]);

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeInterview();
    }
    
    return () => {
      setIsFinished(true);
      cleanupAll();
    };
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    setIsInitialized(false);
    mediaStream.retryCapture();
  }, [mediaStream]);

  // Show permission screen if needed
  if (mediaStream.permissionState !== 'granted') {
    return (
      <PermissionScreen
        permissionState={mediaStream.permissionState}
        permissionError={mediaStream.permissionError}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="video-processor">
      {/* Question */}
      <div className="video-processor__question-section">
        <SelectedQuestionDisplay 
          questionId={selectedQuestion} 
          variant="interview" 
        />
      </div>
      
      {/* Main content */}
      <div className="interview-content-wrapper">
        {/* Video sidebar */}
        <div className="interview-sidebar">
          <VideoCard
            hasVideo={mediaStream.hasVideo}
            isAudioOnly={mediaStream.isAudioOnly}
            isExpanded={isVideoCardExpanded}
            onToggle={toggleVideoCard}
            videoRef={mediaStream.videoRef}
            mediaStream={mediaStream.mediaStream}
            eyeTrackingCanvasRef={eyeTrackingCanvasRef}
          />
        </div>
        
        {/* Main area */}
        <div className="interview-main">
          {/* Eye tracking */}
          <div className="interview-main__eye-tracking">
            <EyeTrackingAnalyzer
              videoRef={mediaStream.videoRef}
              canvasRef={eyeTrackingCanvasRef}
              isActive={isEyeTrackingActive}
              onMetricsUpdate={handleEyeTrackingUpdate}
              className="interview-eye-tracking"
            />
          </div>
          
          {/* Voice analysis */}
          <div className="interview-main__voice-analysis">
            <PitchAnalyzer
              mediaStream={mediaStream.mediaStream}
              isActive={isVoiceAnalysisActive}
              onMetricsUpdate={handleVoiceMetricsUpdate}
              className="interview-voice-analysis"
            />
          </div>
          
          {/* Simple debug panel */}
          <div style={{
            background: '#e8f5e8',
            border: '2px solid #4ade80',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            <strong>🔍 SIMPLE DEBUG:</strong>
            <br />
            Voice Average: {voiceMetrics.averageVolume}% | Variation: {voiceMetrics.volumeVariation}% | Samples: {voiceMetrics.totalSamples}
            <br />
            Eye Contact: {eyeTrackingMetrics.eyeContactPercentage}% | Smile: {eyeTrackingMetrics.smilePercentage}%
            <br />
            <strong style={{ color: voiceMetrics.averageVolume > 5 ? 'green' : 'red' }}>
              Voice Status: {voiceMetrics.averageVolume > 5 ? '✅ DETECTED' : '❌ NOT DETECTED'}
            </strong>
          </div>
          
          {/* Transcript */}
          <div className="transcript-main">
            <div className="transcript-main__header">
              <h3 className="transcript-main__title">
                <i className="fas fa-file-alt icon-sm"></i>
                Live Transcript
              </h3>
            </div>
            <div className="transcript-main__content" ref={transcriptScrollableRef}>
              <p className="transcript-main__text">
                {getLiveTranscript() || `${speechRecognition.isListening ? 'Listening' : 'Ready to listen'}${listeningDots}`}
              </p>
              {DevHelpers.isTranscriptSimulationEnabled() && (
                <div className="transcript-main__dev-indicator">
                  [DEV] Transcript simulation active
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Control buttons */}
      <div className="interview-layout__button-container">
        <button 
          className="button interview-layout__end-button"
          onClick={handleEndInterview}
        >
          <i className="fas fa-times icon-sm"></i>
          {UI_TEXT.END_INTERVIEW}
        </button>
        <button 
          className="button interview-layout__done-button"
          onClick={handleDoneInterview}
        >
          <i className="fas fa-check icon-sm"></i>
          {UI_TEXT.SKIP_INTERVIEW}
        </button>
      </div>
    </div>
  );
});

VideoAudioProcessor.displayName = 'VideoAudioProcessor';

export default VideoAudioProcessor;