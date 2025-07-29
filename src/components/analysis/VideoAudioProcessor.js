/**
 * MERGED VideoAudioProcessor - Main flow with background analysis
 * Keeps main's structure while integrating proper hand tracking and analysis
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import SelectedQuestionDisplay from '../interview/SelectedQuestionDisplay';
import PermissionScreen from '../interview/PermissionScreen';
import VideoCard from '../layout/VideoCard';
import EyeTrackingAnalyzer from '../analysis/EyeTrackingAnalyzer';
import HandTrackingAnalyzer from '../analysis/HandTrackingAnalyzer';
import PitchAnalyzer from '../analysis/PitchAnalyzer';

import { useMediaStream } from '../../hooks/useMediaStream';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useTranscriptSimulation } from '../../hooks/useTranscriptSimulation';
import { DevHelpers } from '../../config/devConfig';
import { ResourceCleanup } from '../../utils/resourceCleanup';
import { DEFAULT_METRICS, TranscriptValidator } from '../../utils/interviewUtils';
import { INTERVIEW_CONFIG, UI_TEXT, ERROR_MESSAGES } from '../../constants/interviewConstants';

const VideoAudioProcessor = React.memo(({ onFinish, onEnd, selectedQuestion }) => {
  const [listeningDots, setListeningDots] = useState('');
  const [isVideoCardExpanded, setIsVideoCardExpanded] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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

  const [handTrackingMetrics, setHandTrackingMetrics] = useState({
    handMetrics: [],
    feedback: 'Initializing'
  });

  const [isEyeTrackingActive, setIsEyeTrackingActive] = useState(false);
  const [isVoiceAnalysisActive, setIsVoiceAnalysisActive] = useState(false);
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);

  // Store cumulative hand tracking data
  const cumulativeHandDataRef = useRef({
    totalHandDetections: 0,
    maxHandsDetected: 0,
    lastKnownHandMetrics: [],
    lastKnownFeedback: 'Initializing',
    hasEverDetectedHands: false,
    sessionStartTime: Date.now(),
    bestHandMetrics: null
  });

  const latestEyeMetricsRef = useRef(null);
  const latestVoiceMetricsRef = useRef(null);
  const latestHandMetricsRef = useRef(null);

  const transcriptScrollableRef = useRef();
  const dotIntervalRef = useRef();
  const timeoutRef = useRef();

  const mediaStream = useMediaStream();
  const speechRecognition = useSpeechRecognition();
  const transcriptSimulation = useTranscriptSimulation();

  const getCurrentTranscript = useCallback(() => {
    return DevHelpers.isTranscriptSimulationEnabled()
      ? transcriptSimulation.getFinalTranscript()
      : speechRecognition.getFinalTranscript();
  }, [transcriptSimulation, speechRecognition]);

  const getLiveTranscript = useCallback(() => {
    return DevHelpers.isTranscriptSimulationEnabled()
      ? transcriptSimulation.simulatedTranscript
      : speechRecognition.transcript;
  }, [transcriptSimulation.simulatedTranscript, speechRecognition.transcript]);

  const handleEyeTrackingUpdate = useCallback((metrics) => {
    setEyeTrackingMetrics(metrics);
    latestEyeMetricsRef.current = metrics;
  }, []);

  const handleVoiceMetricsUpdate = useCallback((metrics) => {
    setVoiceMetrics(metrics);
    latestVoiceMetricsRef.current = metrics;
  }, []);

  // Enhanced hand tracking update with cumulative data storage
  const handleHandTrackingUpdate = useCallback((metrics) => {
    console.log('📨 VideoAudioProcessor RECEIVED hand tracking update:', metrics);
    
    if (metrics && typeof metrics === 'object') {
      setHandTrackingMetrics(metrics);
      latestHandMetricsRef.current = metrics;
      
      // Store cumulative data for final report
      const cumulative = cumulativeHandDataRef.current;
      
      if (metrics.handMetrics && metrics.handMetrics.length > 0) {
        cumulative.totalHandDetections++;
        cumulative.maxHandsDetected = Math.max(cumulative.maxHandsDetected, metrics.handMetrics.length);
        cumulative.lastKnownHandMetrics = [...metrics.handMetrics];
        cumulative.hasEverDetectedHands = true;
        
        // Store the best metrics we've seen
        if (!cumulative.bestHandMetrics || 
            (metrics.handMetrics[0]?.speed > cumulative.bestHandMetrics[0]?.speed)) {
          cumulative.bestHandMetrics = [...metrics.handMetrics];
        }
      }
      
      if (metrics.feedback) {
        cumulative.lastKnownFeedback = metrics.feedback;
      }
      
      if (metrics.hasEverDetectedHands) {
        cumulative.hasEverDetectedHands = true;
      }
    }
  }, []);

  const setupDotAnimation = useCallback(() => {
    clearInterval(dotIntervalRef.current);
    dotIntervalRef.current = setInterval(() => {
      setListeningDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
  }, []);

  const setupSessionTimeout = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!isFinished) handleInterviewCompletion();
    }, INTERVIEW_CONFIG.sessionDuration);
  }, [isFinished]);

  const scrollToBottom = useCallback(() => {
    if (transcriptScrollableRef.current) {
      transcriptScrollableRef.current.scrollTop = transcriptScrollableRef.current.scrollHeight;
    }
  }, []);

  // Enhanced interview completion with cumulative hand data
  const handleInterviewCompletion = useCallback(() => {
    if (isFinished) return;
    
    console.log('🎯 STEP 3A - VideoAudioProcessor creating final report');
    setIsFinished(true);
    setIsEyeTrackingActive(false);
    setIsVoiceAnalysisActive(false);
    setIsHandTrackingActive(false);

    const finalEyeMetrics = latestEyeMetricsRef.current || eyeTrackingMetrics;
    const finalVoiceMetrics = latestVoiceMetricsRef.current || voiceMetrics;
    const latestHandMetrics = latestHandMetricsRef.current || handTrackingMetrics;
    const completeTranscript = getCurrentTranscript();

    // Use cumulative hand data for final report
    const cumulativeHand = cumulativeHandDataRef.current;
    const sessionDuration = Math.round((Date.now() - cumulativeHand.sessionStartTime) / 1000);
    
    const finalHandData = {
      handMetrics: cumulativeHand.bestHandMetrics || cumulativeHand.lastKnownHandMetrics || [],
      feedback: cumulativeHand.lastKnownFeedback || 'No data',
      hasEverDetectedHands: cumulativeHand.hasEverDetectedHands,
      totalDetections: cumulativeHand.totalHandDetections,
      maxHandsDetected: cumulativeHand.maxHandsDetected,
      sessionDuration: sessionDuration
    };

    console.log('📊 FINAL HAND DATA FOR REPORT:', finalHandData);

    const finalReport = {
      ...DEFAULT_METRICS,
      
      // Eye tracking data (top level)
      eyeContactPercentage: finalEyeMetrics?.eyeContactPercentage || 0,
      smilePercentage: finalEyeMetrics?.smilePercentage || 0,
      sessionDuration: finalEyeMetrics?.sessionTime || '00:00',
      
      // Voice analysis data (top level)
      averageVolume: finalVoiceMetrics?.averageVolume || 0,
      volumeVariation: finalVoiceMetrics?.volumeVariation || 0,
      pitchVariation: finalVoiceMetrics?.pitchVariation || 0,
      speechRate: finalVoiceMetrics?.speechRate || 0,
      clarity: finalVoiceMetrics?.clarity || 0,
      totalSamples: finalVoiceMetrics?.totalSamples || 0,
      
      // Hand tracking data (flattened to top level)
      handMetrics: finalHandData.handMetrics,
      feedback: finalHandData.feedback,
      handFeedback: finalHandData.feedback,
      hasEverDetectedHands: finalHandData.hasEverDetectedHands,
      
      // Keep nested versions for compatibility
      eyeTracking: finalEyeMetrics || {},
      voiceAnalysis: finalVoiceMetrics || {},
      handTracking: finalHandData
    };

    console.log('📊 STEP 3B - Final report created:', finalReport);

    if (TranscriptValidator.isValid(completeTranscript)) {
      console.log('📝 STEP 3C - Calling onFinish with valid transcript');
      onFinish(finalReport, completeTranscript, selectedQuestion);
    } else {
      console.log('📝 STEP 3C - Calling onFinish with empty transcript');
      onFinish(finalReport, '', selectedQuestion);
    }
  }, [isFinished, getCurrentTranscript, onFinish, eyeTrackingMetrics, voiceMetrics, handTrackingMetrics]);

  const resetAllMetrics = useCallback(() => {
    setEyeTrackingMetrics(DEFAULT_METRICS);
    setVoiceMetrics(DEFAULT_METRICS);
    setHandTrackingMetrics({ handMetrics: [], feedback: 'Initializing' });
    latestEyeMetricsRef.current = null;
    latestVoiceMetricsRef.current = null;
    latestHandMetricsRef.current = null;
    
    // Reset cumulative hand data
    cumulativeHandDataRef.current = {
      totalHandDetections: 0,
      maxHandsDetected: 0,
      lastKnownHandMetrics: [],
      lastKnownFeedback: 'Initializing',
      hasEverDetectedHands: false,
      sessionStartTime: Date.now(),
      bestHandMetrics: null
    };
    
    if (window.eyeTrackingReset) window.eyeTrackingReset();
    if (window.pitchAnalyzerReset) window.pitchAnalyzerReset();
  }, []);

  const initializeInterview = useCallback(async () => {
    if (isInitialized) return;
    try {
      setIsInitialized(true);
      setupDotAnimation();
      resetAllMetrics();
      
      // Run transcription diagnostic in development mode
      if (DevHelpers.isApiDisabled()) {
        console.log('🔍 Running transcription diagnostic...');
      }
      
      await mediaStream.startCapture();
      if (DevHelpers.isTranscriptSimulationEnabled()) {
        transcriptSimulation.startSimulation();
      } else {
        speechRecognition.startListening();
      }
      
      setIsEyeTrackingActive(true);
      setIsVoiceAnalysisActive(true);
      setIsHandTrackingActive(true);
      console.log('✅ Hand tracking activated');
      setupSessionTimeout();

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      setIsInitialized(false);
    }
  }, [isInitialized, mediaStream, speechRecognition, transcriptSimulation, setupDotAnimation, setupSessionTimeout, resetAllMetrics]);

  useEffect(() => {
    scrollToBottom();
  }, [getLiveTranscript(), scrollToBottom]);

  useEffect(() => {
    if (!isInitialized) initializeInterview();
    return () => {
      setIsFinished(true);
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
      setIsHandTrackingActive(false);
    };
  }, []);

  if (mediaStream.permissionState !== 'granted') {
    return (
      <PermissionScreen
        permissionState={mediaStream.permissionState}
        permissionError={mediaStream.permissionError}
        onRetry={() => {
          setIsInitialized(false);
          mediaStream.retryCapture();
        }}
      />
    );
  }

  return (
    <div className="video-processor">
      <div className="video-processor__question-section">
        <SelectedQuestionDisplay questionId={selectedQuestion} variant="interview" />
      </div>

      <div className="interview-content-wrapper">
        <div className="interview-sidebar">
          <VideoCard
            hasVideo={mediaStream.hasVideo}
            isAudioOnly={mediaStream.isAudioOnly}
            isExpanded={isVideoCardExpanded}
            onToggle={() => setIsVideoCardExpanded(prev => !prev)}
            videoRef={mediaStream.videoRef}
            mediaStream={mediaStream.mediaStream}
          />
        </div>

        <div className="interview-main">
          {/* Background Analysis Components - No visual display */}
          <div style={{ display: 'none' }}>
            <EyeTrackingAnalyzer
              videoRef={mediaStream.videoRef}
              isActive={isEyeTrackingActive}
              onMetricsUpdate={handleEyeTrackingUpdate}
            />
            
            <HandTrackingAnalyzer
              videoRef={mediaStream.videoRef}
              isActive={isHandTrackingActive}
              onMetricsUpdate={handleHandTrackingUpdate}
            />
            
            <PitchAnalyzer
              mediaStream={mediaStream.mediaStream}
              isActive={isVoiceAnalysisActive}
              onMetricsUpdate={handleVoiceMetricsUpdate}
            />
          </div>

          <div style={{ background: '#e8f5e8', border: '2px solid #4ade80', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '14px' }}>
            <strong>🔍 SIMPLE DEBUG:</strong>
            <br />
            Voice Average: {voiceMetrics.averageVolume}% | Variation: {voiceMetrics.volumeVariation}% | Samples: {voiceMetrics.totalSamples}
            <br />
            Eye Contact: {eyeTrackingMetrics.eyeContactPercentage}% | Smile: {eyeTrackingMetrics.smilePercentage}%
            <br />
            Hand Feedback: {handTrackingMetrics.feedback}
            <br />
            <strong style={{ color: voiceMetrics.averageVolume > 5 ? 'green' : 'red' }}>
              Voice Status: {voiceMetrics.averageVolume > 5 ? '✅ DETECTED' : '❌ NOT DETECTED'}
            </strong>
          </div>

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

      <div className="interview-layout__button-container">
        <button className="button interview-layout__end-button" onClick={() => {
          if (!isFinished && window.confirm(UI_TEXT.END_CONFIRMATION)) {
            setIsFinished(true);
            setIsEyeTrackingActive(false);
            setIsVoiceAnalysisActive(false);
            setIsHandTrackingActive(false);
            if (onEnd) onEnd();
          }
        }}>
          <i className="fas fa-times icon-sm"></i>
          {UI_TEXT.END_INTERVIEW}
        </button>

        <button className="button interview-layout__done-button" onClick={() => {
          if (!isFinished && window.confirm(UI_TEXT.SKIP_CONFIRMATION)) {
            handleInterviewCompletion();
          }
        }}>
          <i className="fas fa-check icon-sm"></i>
          {UI_TEXT.SKIP_INTERVIEW}
        </button>
      </div>
    </div>
  );
});

VideoAudioProcessor.displayName = 'VideoAudioProcessor';

export default VideoAudioProcessor;