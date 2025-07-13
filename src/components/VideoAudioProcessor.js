/**
 * Video Audio Processor Component
 * Handles video/audio capture, speech recognition, transcript processing, and eye tracking
 * Enhanced with facial recognition and eye contact analysis in interviewer view
 * WITH DEBUGGING FOR EYE TRACKING DATA FLOW
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import SelectedQuestionDisplay from './SelectedQuestionDisplay';
import PermissionScreen from './PermissionScreen';
import VideoCard from './VideoCard';
import TranscriptDisplay from './TranscriptDisplay';
import EyeTrackingAnalyzer from './EyeTrackingAnalyzer';
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
  
  // Eye tracking state
  const [eyeTrackingMetrics, setEyeTrackingMetrics] = useState({
    eyeContactPercentage: 0,
    smilePercentage: 0,
    gazeStatus: 'Initializing',
    sessionTime: '00:00',
    totalFrames: 0,
    eyeContactFrames: 0,
    smileFrames: 0
  });
  const [isEyeTrackingActive, setIsEyeTrackingActive] = useState(false);
  
  // Refs for cleanup and scrolling
  const transcriptScrollableRef = useRef();
  const dotIntervalRef = useRef();
  const timeoutRef = useRef();
  const eyeTrackingResetRef = useRef();
  const eyeTrackingCanvasRef = useRef(); // Ref for the landmark canvas

  // Custom hooks
  const mediaStream = useMediaStream();
  const speechRecognition = useSpeechRecognition();
  const transcriptSimulation = useTranscriptSimulation();

  // Get the current transcript from appropriate source
  const getCurrentTranscript = useCallback(() => {
    if (DevHelpers.isTranscriptSimulationEnabled()) {
      return transcriptSimulation.getFinalTranscript();
    }
    return speechRecognition.getFinalTranscript();
  }, [transcriptSimulation, speechRecognition]);

  // Get the live transcript for display
  const getLiveTranscript = useCallback(() => {
    if (DevHelpers.isTranscriptSimulationEnabled()) {
      return transcriptSimulation.simulatedTranscript;
    }
    return speechRecognition.transcript;
  }, [transcriptSimulation.simulatedTranscript, speechRecognition.transcript]);

  // Handle eye tracking metrics updates
  const handleEyeTrackingUpdate = useCallback((metrics) => {
    setEyeTrackingMetrics(metrics);
    DevHelpers.log('Eye tracking metrics updated:', metrics);
  }, []);

  // Listening dots animation
  const setupDotAnimation = useCallback(() => {
    if (dotIntervalRef.current) {
      clearInterval(dotIntervalRef.current);
    }
    dotIntervalRef.current = setInterval(() => {
      setListeningDots(prev => (prev.length >= INTERVIEW_CONFIG.maxDots ? '' : prev + '.'));
    }, INTERVIEW_CONFIG.dotAnimationInterval);
  }, []);

  // Session timeout
  const setupSessionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (isFinished) return;
      
      DevHelpers.log('Session timeout reached, finishing interview');
      handleInterviewCompletion();
    }, INTERVIEW_CONFIG.sessionDuration);
  }, [isFinished]);

  // Auto-scroll transcript
  const scrollToBottom = useCallback(() => {
    if (transcriptScrollableRef.current) {
      transcriptScrollableRef.current.scrollTop = transcriptScrollableRef.current.scrollHeight;
    }
  }, []);

  // ENHANCED Handle interview completion with eye tracking data AND DEBUGGING
  const handleInterviewCompletion = useCallback(() => {
    if (isFinished) return;
    
    setIsFinished(true);
    setIsEyeTrackingActive(false);
    
    const completeTranscript = getCurrentTranscript();
    
    // DEBUG: Enhanced logging
    console.log('🎯 STEP 1 - VideoAudioProcessor handleInterviewCompletion');
    console.log('📊 Raw eyeTrackingMetrics:', eyeTrackingMetrics);
    console.log('📝 Complete transcript:', completeTranscript);
    console.log('🔍 eyeTrackingMetrics keys:', Object.keys(eyeTrackingMetrics));
    console.log('📈 Individual metric values:', {
      eyeContactPercentage: eyeTrackingMetrics.eyeContactPercentage,
      smilePercentage: eyeTrackingMetrics.smilePercentage,
      sessionTime: eyeTrackingMetrics.sessionTime,
      totalFrames: eyeTrackingMetrics.totalFrames
    });
    
    // Ensure we have valid data before sending
    const eyeTrackingData = {
      eyeContactPercentage: eyeTrackingMetrics.eyeContactPercentage || 0,
      smilePercentage: eyeTrackingMetrics.smilePercentage || 0,
      totalFrames: eyeTrackingMetrics.totalFrames || 0,
      eyeContactFrames: eyeTrackingMetrics.eyeContactFrames || 0,
      smileFrames: eyeTrackingMetrics.smileFrames || 0,
      sessionDuration: eyeTrackingMetrics.sessionTime || '00:00'
    };
    
    console.log('📦 Processed eyeTrackingData:', eyeTrackingData);
    
    // Combine default metrics with eye tracking data
    const enhancedMetrics = {
      ...DEFAULT_METRICS,
      eyeTracking: eyeTrackingData,
      eye_tracking: eyeTrackingData, // Also add underscore version
      // Add individual fields for direct access
      eyeContactPercentage: eyeTrackingData.eyeContactPercentage,
      smilePercentage: eyeTrackingData.smilePercentage,
      sessionDuration: eyeTrackingData.sessionDuration
    };
    
    console.log('🚀 STEP 2 - About to call onFinish with enhancedMetrics:', enhancedMetrics);
    console.log('🔍 Enhanced metrics JSON:', JSON.stringify(enhancedMetrics, null, 2));
    console.log('🔍 Enhanced metrics keys:', Object.keys(enhancedMetrics));
    
    if (TranscriptValidator.isValid(completeTranscript)) {
      console.log('✅ Transcript is valid, calling onFinish...');
      onFinish(enhancedMetrics, completeTranscript);
    } else {
      console.log('⚠️ Transcript is not valid, calling onFinish with empty transcript...');
      DevHelpers.error(ERROR_MESSAGES.NO_SPEECH_DETECTED);
      onFinish(enhancedMetrics, '');
    }
    
    console.log('🎯 STEP 3 - onFinish called successfully');
  }, [isFinished, getCurrentTranscript, onFinish, eyeTrackingMetrics]);

  // Handle done interview (user wants to finish with current response)
  const handleDoneInterview = useCallback(() => {
    if (isFinished) return;
    
    // TODO: Replace with custom modal component
    const confirmDone = window.confirm(UI_TEXT.SKIP_CONFIRMATION);
    if (!confirmDone) return;
    
    handleInterviewCompletion();
  }, [isFinished, handleInterviewCompletion]);

  // Handle end interview (user wants to go back to question selection)
  const handleEndInterview = useCallback(() => {
    if (isFinished) return;
    
    // TODO: Replace with custom modal component
    const confirmEnd = window.confirm(UI_TEXT.END_CONFIRMATION);
    if (!confirmEnd) return;
    
    setIsFinished(true);
    setIsEyeTrackingActive(false);
    if (onEnd) onEnd();
  }, [isFinished, onEnd]);

  // Toggle video card expansion
  const toggleVideoCard = useCallback(() => {
    setIsVideoCardExpanded(prev => !prev);
  }, []);

  // Reset eye tracking metrics
  const resetEyeTrackingMetrics = useCallback(() => {
    setEyeTrackingMetrics({
      eyeContactPercentage: 0,
      smilePercentage: 0,
      gazeStatus: 'Initializing',
      sessionTime: '00:00',
      totalFrames: 0,
      eyeContactFrames: 0,
      smileFrames: 0
    });
    
    if (eyeTrackingResetRef.current) {
      eyeTrackingResetRef.current();
    }
  }, []);

  // Initialize everything
  const initializeInterview = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setIsInitialized(true);
      setupDotAnimation();
      
      // Reset eye tracking metrics
      resetEyeTrackingMetrics();
      
      // Start media capture
      const stream = await mediaStream.startCapture();
      
      // Start speech recognition or simulation
      if (DevHelpers.isTranscriptSimulationEnabled()) {
        transcriptSimulation.startSimulation();
      } else {
        speechRecognition.startListening();
      }
      
      // Start eye tracking
      setIsEyeTrackingActive(true);
      
      // Setup session timeout
      setupSessionTimeout();
      
      DevHelpers.log('Interview initialized successfully with eye tracking');
    } catch (error) {
      DevHelpers.error('Failed to initialize interview:', error);
      setIsInitialized(false);
    }
  }, [isInitialized, mediaStream, speechRecognition, transcriptSimulation, setupDotAnimation, setupSessionTimeout, resetEyeTrackingMetrics]);

  // Cleanup all resources
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
  }, [mediaStream, speechRecognition, transcriptSimulation]);

  // Auto-scroll effect
  useEffect(() => {
    scrollToBottom();
  }, [getLiveTranscript(), scrollToBottom]);

  // Initialize on mount - only run once
  useEffect(() => {
    if (!isInitialized) {
      initializeInterview();
    }
    
    return () => {
      setIsFinished(true);
      cleanupAll();
    };
  }, []); // Empty dependency array to run only once

  // Handle permission retry
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

  // Main interview interface
  return (
    <div className="video-processor">
      {/* Question display */}
      <div className="video-processor__question-section">
        <SelectedQuestionDisplay 
          questionId={selectedQuestion} 
          variant="interview" 
        />
      </div>
      
      {/* Main content */}
      <div className="interview-content-wrapper">
        {/* Video sidebar with interviewer view */}
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
        
        {/* Main content area with eye tracking metrics and transcript */}
        <div className="interview-main">
          {/* Eye Tracking Analysis - positioned in the middle */}
          <div className="interview-main__eye-tracking">
            <EyeTrackingAnalyzer
              videoRef={mediaStream.videoRef}
              canvasRef={eyeTrackingCanvasRef}
              isActive={isEyeTrackingActive}
              onMetricsUpdate={handleEyeTrackingUpdate}
              className="interview-eye-tracking"
            />
          </div>
          
          {/* Transcript section */}
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
          aria-label="End interview and return to selection"
        >
          <i className="fas fa-times icon-sm"></i>
          {UI_TEXT.END_INTERVIEW}
        </button>
        <button 
          className="button interview-layout__done-button"
          onClick={handleDoneInterview}
          aria-label="Finish interview with current response"
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