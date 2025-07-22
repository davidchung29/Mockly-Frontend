/**
 * FIXED VideoAudioProcessor - Ensures Hand Tracking Data Flows to Final Report
 * Key Fix: Properly collect and format hand tracking data for feedback report
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import SelectedQuestionDisplay from './SelectedQuestionDisplay';
import PermissionScreen from './PermissionScreen';
import VideoCard from './VideoCard';
import EyeTrackingAnalyzer from './EyeTrackingAnalyzer';
import HandTrackingAnalyzer from './HandTrackingAnalyzer';
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

  // ✅ CRITICAL: Store cumulative hand tracking data
  const cumulativeHandDataRef = useRef({
    totalHandDetections: 0,
    maxHandsDetected: 0,
    lastKnownHandMetrics: [],
    lastKnownFeedback: 'Initializing',
    hasEverDetectedHands: false,
    sessionStartTime: Date.now(),
    bestHandMetrics: null // Store the best hand metrics we've seen
  });

  const latestEyeMetricsRef = useRef(null);
  const latestVoiceMetricsRef = useRef(null);
  const latestHandMetricsRef = useRef(null);

  const transcriptScrollableRef = useRef();
  const dotIntervalRef = useRef();
  const timeoutRef = useRef();
  const eyeTrackingCanvasRef = useRef();
  const handTrackingCanvasRef = useRef();

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

  // ✅ ENHANCED: Collect and store ALL hand tracking data
  const handleHandTrackingUpdate = useCallback((metrics) => {
    console.log('📨 HAND TRACKING UPDATE RECEIVED:', metrics);
    
    if (metrics && typeof metrics === 'object') {
      // Update display state
      setHandTrackingMetrics(metrics);
      latestHandMetricsRef.current = metrics;
      
      // ✅ CRITICAL: Store cumulative data for final report
      const cumulative = cumulativeHandDataRef.current;
      
      if (metrics.handMetrics && metrics.handMetrics.length > 0) {
        cumulative.totalHandDetections++;
        cumulative.maxHandsDetected = Math.max(cumulative.maxHandsDetected, metrics.handMetrics.length);
        cumulative.lastKnownHandMetrics = [...metrics.handMetrics]; // Deep copy
        cumulative.hasEverDetectedHands = true;
        
        // Store the best metrics we've seen (highest speed/activity)
        if (!cumulative.bestHandMetrics || 
            (metrics.handMetrics[0]?.speed > cumulative.bestHandMetrics[0]?.speed)) {
          cumulative.bestHandMetrics = [...metrics.handMetrics];
        }
        
        console.log('✅ Hand data stored in cumulative:', {
          totalDetections: cumulative.totalHandDetections,
          maxHands: cumulative.maxHandsDetected,
          currentMetrics: cumulative.lastKnownHandMetrics,
          bestMetrics: cumulative.bestHandMetrics
        });
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

  // ✅ FIXED: Use cumulative hand data for final report
  const handleInterviewCompletion = useCallback(() => {
    if (isFinished) return;
    
    console.log('🎯 INTERVIEW COMPLETION STARTED');
    
    setIsFinished(true);
    setIsEyeTrackingActive(false);
    setIsVoiceAnalysisActive(false);
    setIsHandTrackingActive(false);

    // Get the latest metrics from refs
    const finalEyeMetrics = latestEyeMetricsRef.current || eyeTrackingMetrics;
    const finalVoiceMetrics = latestVoiceMetricsRef.current || voiceMetrics;
    const latestHandMetrics = latestHandMetricsRef.current || handTrackingMetrics;
    const completeTranscript = getCurrentTranscript();

    // ✅ CRITICAL: Use cumulative hand data for final report
    const cumulativeHand = cumulativeHandDataRef.current;
    const sessionDuration = Math.round((Date.now() - cumulativeHand.sessionStartTime) / 1000);
    
    // Create comprehensive hand data for final report
    const finalHandData = {
      handMetrics: cumulativeHand.bestHandMetrics || cumulativeHand.lastKnownHandMetrics || [],
      feedback: cumulativeHand.lastKnownFeedback || 'No data',
      hasEverDetectedHands: cumulativeHand.hasEverDetectedHands,
      totalDetections: cumulativeHand.totalHandDetections,
      maxHandsDetected: cumulativeHand.maxHandsDetected,
      sessionDuration: sessionDuration,
      // Also include latest real-time data
      currentlyDetecting: latestHandMetrics?.currentlyDetecting || false,
      totalFrames: latestHandMetrics?.totalFrames || 0
    };

    console.log('📊 FINAL HAND DATA FOR REPORT:');
    console.log('🤲 Cumulative data:', cumulativeHand);
    console.log('🤲 Final hand data:', finalHandData);
    console.log('🤲 Has hand metrics:', finalHandData.handMetrics.length > 0);

    // ✅ ENHANCED: Create comprehensive final report
    const finalReport = {
      ...DEFAULT_METRICS,
      
      // Eye tracking data
      eyeContactPercentage: finalEyeMetrics?.eyeContactPercentage || 0,
      smilePercentage: finalEyeMetrics?.smilePercentage || 0,
      sessionDuration: finalEyeMetrics?.sessionTime || finalEyeMetrics?.sessionDuration || '00:00',
      
      // Voice analysis data
      averageVolume: finalVoiceMetrics?.averageVolume || 0,
      volumeVariation: finalVoiceMetrics?.volumeVariation || 0,
      pitchVariation: finalVoiceMetrics?.pitchVariation || 0,
      speechRate: finalVoiceMetrics?.speechRate || 0,
      clarity: finalVoiceMetrics?.clarity || 0,
      totalSamples: finalVoiceMetrics?.totalSamples || 0,
      
      // ✅ FIXED: Use comprehensive hand data
      handMetrics: finalHandData.handMetrics,
      feedback: finalHandData.feedback,
      handFeedback: finalHandData.feedback,
      hasEverDetectedHands: finalHandData.hasEverDetectedHands,
      handTrackingActive: true,
      totalHandDetections: finalHandData.totalDetections,
      maxHandsDetected: finalHandData.maxHandsDetected,
      
      // Keep nested versions for compatibility
      eyeTracking: finalEyeMetrics || {},
      voiceAnalysis: finalVoiceMetrics || {},
      handTracking: {
        ...finalHandData,
        hasData: finalHandData.handMetrics && finalHandData.handMetrics.length > 0
      }
    };

    console.log('📋 FINAL REPORT WITH HAND DATA:');
    console.log('🔍 Report keys:', Object.keys(finalReport));
    console.log('🤲 Hand data in final report:', {
      topLevel_handMetrics: finalReport.handMetrics,
      topLevel_feedback: finalReport.feedback,
      hasEverDetectedHands: finalReport.hasEverDetectedHands,
      totalDetections: finalReport.totalHandDetections,
      nested_handTracking: finalReport.handTracking,
      hasHandData: finalReport.handMetrics && finalReport.handMetrics.length > 0
    });

    // Validate hand data before sending
    if (finalReport.handMetrics && finalReport.handMetrics.length > 0) {
      console.log('✅ Hand tracking data successfully included in report');
      finalReport.handMetrics.forEach((hand, index) => {
        console.log(`🤲 Hand ${index + 1}:`, hand);
      });
    } else if (finalReport.hasEverDetectedHands) {
      console.log('⚠️ Hands were detected during session but no final metrics available');
    } else {
      console.log('ℹ️ No hand tracking data detected during session');
    }

    if (TranscriptValidator.isValid(completeTranscript)) {
      console.log('📝 Calling onFinish with valid transcript and hand data');
      onFinish(finalReport, completeTranscript);
    } else {
      console.log('📝 Calling onFinish with empty transcript but with hand data');
      onFinish(finalReport, '');
    }
  }, [isFinished, getCurrentTranscript, onFinish, eyeTrackingMetrics, voiceMetrics, handTrackingMetrics]);

  const resetAllMetrics = useCallback(() => {
    setEyeTrackingMetrics(DEFAULT_METRICS);
    setVoiceMetrics(DEFAULT_METRICS);
    setHandTrackingMetrics({ handMetrics: [], feedback: 'Initializing' });
    latestEyeMetricsRef.current = null;
    latestVoiceMetricsRef.current = null;
    latestHandMetricsRef.current = null;
    
    // ✅ Reset cumulative hand data
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

      // Ensure canvas is overlaid on video element
      if (mediaStream.videoRef?.current && handTrackingCanvasRef.current) {
        const parent = mediaStream.videoRef.current.parentNode;
        if (parent && !parent.contains(handTrackingCanvasRef.current)) {
          parent.appendChild(handTrackingCanvasRef.current);
        }
      }
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
            eyeTrackingCanvasRef={eyeTrackingCanvasRef}
            handTrackingCanvasRef={handTrackingCanvasRef}
          />
        </div>

        <div className="interview-main">
          <div className="interview-main__eye-tracking">
            <EyeTrackingAnalyzer
              videoRef={mediaStream.videoRef}
              canvasRef={eyeTrackingCanvasRef}
              isActive={isEyeTrackingActive}
              onMetricsUpdate={handleEyeTrackingUpdate}
              className="interview-eye-tracking"
            />
          </div>

          <div className="interview-main__voice-analysis">
            <PitchAnalyzer
              mediaStream={mediaStream.mediaStream}
              isActive={isVoiceAnalysisActive}
              onMetricsUpdate={handleVoiceMetricsUpdate}
              className="interview-voice-analysis"
            />
          </div>

          <HandTrackingAnalyzer
            videoRef={mediaStream.videoRef}
            canvasRef={handTrackingCanvasRef}
            isActive={isHandTrackingActive}
            onMetricsUpdate={handleHandTrackingUpdate}
          />

          <div style={{ background: '#e8f5e8', border: '2px solid #4ade80', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '14px' }}>
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

          <div style={{ background: '#fff3e0', border: '2px solid #ff9800', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            <strong>🖐️ Hand Tracking (Live):</strong><br />
            {handTrackingMetrics.handMetrics.map((h, i) => (
              <div key={i}>
                {h.hand}: Speed {h.speed.toFixed(0)}px/s | Erratic {h.err.toFixed(1)}/s
              </div>
            ))}
            <div><strong>Feedback:</strong> {handTrackingMetrics.feedback}</div>
            <div><strong>Total Detections:</strong> {cumulativeHandDataRef.current.totalHandDetections}</div>
            <div><strong>Ever Detected:</strong> {cumulativeHandDataRef.current.hasEverDetectedHands ? 'YES' : 'NO'}</div>
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
