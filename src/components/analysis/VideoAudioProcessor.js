import React, { useState, useRef, useEffect, useCallback } from 'react';
import SelectedQuestionDisplay from '../interview/SelectedQuestionDisplay';
import PermissionScreen from '../interview/PermissionScreen';
import VideoCard from '../layout/VideoCard';
import EyeTrackingAnalyzer from './EyeTrackingAnalyzer';
import HandTrackingAnalyzer from './HandTrackingAnalyzer';
import './Transcript.css';
import { useMediaStream } from '../../hooks/useMediaStream';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useTranscriptSimulation } from '../../hooks/useTranscriptSimulation';
import { DevHelpers } from '../../config/devConfig';
import { ResourceCleanup } from '../../utils/resourceCleanup';
import { DEFAULT_METRICS, TranscriptValidator } from '../../utils/interviewUtils';
import { INTERVIEW_CONFIG, UI_TEXT, ERROR_MESSAGES } from '../../constants/interviewConstants';

const VideoAudioProcessor = React.memo(({ onFinish, onEnd, selectedQuestion, presetMediaStream }) => {
  const [listeningDots, setListeningDots] = useState('');
  const [isVideoCardExpanded, setIsVideoCardExpanded] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // NEW STATE for editable transcript feature
  const [editableTranscript, setEditableTranscript] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingEnd, setPendingEnd] = useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

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

  const latestEyeMetricsRef = useRef(null);
  const latestVoiceMetricsRef = useRef(null);
  const latestHandMetricsRef = useRef(null);

  const transcriptScrollableRef = useRef();
  const dotIntervalRef = useRef();
  const timeoutRef = useRef();

  const mediaStream = useMediaStream(presetMediaStream);
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

  // NEW: Update editable transcript when live transcript changes
  useEffect(() => {
    const liveText = getLiveTranscript();
    if (liveText && !showConfirmationModal) {
      setEditableTranscript(liveText);
    }
  }, [getLiveTranscript(), showConfirmationModal]);

  const handleEyeTrackingUpdate = useCallback((metrics) => {
    setEyeTrackingMetrics(metrics);
    latestEyeMetricsRef.current = metrics;
  }, []);

  const handleVoiceMetricsUpdate = useCallback((metrics) => {
    setVoiceMetrics(metrics);
    latestVoiceMetricsRef.current = metrics;
  }, []);

  const handleHandTrackingUpdate = useCallback((metrics) => {
    setHandTrackingMetrics(metrics);
    latestHandMetricsRef.current = metrics;
    setHandTrackingMetrics(metrics);
    latestHandMetricsRef.current = metrics;
  }, []);

  const performVoiceAnalysis = useCallback(() => {
    if (!isVoiceAnalysisActive || !mediaStream.mediaStream) return;
    
    const mockVoiceMetrics = {
      volume: Math.floor(Math.random() * 100),
      averageVolume: Math.floor(Math.random() * 100),
      volumeVariation: Math.floor(Math.random() * 50),
      pitchVariation: 60 + Math.floor(Math.random() * 40),
      speechRate: 70 + Math.floor(Math.random() * 30),
      clarity: 80 + Math.floor(Math.random() * 20),
      totalSamples: voiceMetrics.totalSamples + 1
    };
    
    setVoiceMetrics(mockVoiceMetrics);
    latestVoiceMetricsRef.current = mockVoiceMetrics;
  }, [isVoiceAnalysisActive, mediaStream.mediaStream, voiceMetrics.totalSamples]);

  const performHandTrackingAnalysis = useCallback(() => {
    if (!isHandTrackingActive || !mediaStream.videoRef.current) return;
    
    const mockHandMetrics = {
      handMetrics: [
        {
          hand: 'Left',
          speed: Math.floor(Math.random() * 100),
          err: Math.random() * 10
        },
        {
          hand: 'Right', 
          speed: Math.floor(Math.random() * 100),
          err: Math.random() * 10
        }
      ],
      feedback: 'Hands detected and analyzed'
    };
    
    setHandTrackingMetrics(mockHandMetrics);
    latestHandMetricsRef.current = mockHandMetrics;
  }, [isHandTrackingActive, mediaStream.videoRef]);

  const setupDotAnimation = useCallback(() => {
    clearInterval(dotIntervalRef.current);
    dotIntervalRef.current = setInterval(() => {
      setListeningDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
  }, []);

  const setupSessionTimeout = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!isFinished) {
        // STOP EVERYTHING when timeout occurs
        setIsEyeTrackingActive(false);
        setIsVoiceAnalysisActive(false);
        setIsHandTrackingActive(false);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        if (dotIntervalRef.current) {
          clearInterval(dotIntervalRef.current);
        }
        
        setShowConfirmationModal(true);
        setPendingEnd(false);
      }
    }, INTERVIEW_CONFIG.sessionDuration);
  }, [isFinished]);

  const scrollToBottom = useCallback(() => {
    if (transcriptScrollableRef.current) {
      transcriptScrollableRef.current.scrollTop = transcriptScrollableRef.current.scrollHeight;
    }
  }, []);

  // NEW: Handle transcript confirmation
  const handleConfirmTranscript = useCallback(() => {
    const finalEyeMetrics = latestEyeMetricsRef.current || eyeTrackingMetrics;
    const finalVoiceMetrics = latestVoiceMetricsRef.current || voiceMetrics;
    const finalHandMetrics = latestHandMetricsRef.current || handTrackingMetrics;
    
    // Use the edited transcript instead of the original
    const finalTranscript = editableTranscript.trim();

    console.log('🎯 STEP 3A - VideoAudioProcessor creating final report with edited transcript');
    console.log('👁️ Final eye metrics:', finalEyeMetrics);
    console.log('🎙️ Final voice metrics:', finalVoiceMetrics);
    console.log('🤲 Final hand metrics:', finalHandMetrics);
    console.log('📝 Final edited transcript:', finalTranscript);

    const finalReport = {
      ...DEFAULT_METRICS,
      eyeContactPercentage: finalEyeMetrics?.eyeContactPercentage || 0,
      smilePercentage: finalEyeMetrics?.smilePercentage || 0,
      sessionDuration: finalEyeMetrics?.sessionTime || '00:00',
      
      averageVolume: finalVoiceMetrics?.averageVolume || 0,
      volumeVariation: finalVoiceMetrics?.volumeVariation || 0,
      pitchVariation: finalVoiceMetrics?.pitchVariation || 0,
      speechRate: finalVoiceMetrics?.speechRate || 0,
      clarity: finalVoiceMetrics?.clarity || 0,
      totalSamples: finalVoiceMetrics?.totalSamples || 0,
      
      handMetrics: finalHandMetrics?.handMetrics || [],
      feedback: finalHandMetrics?.feedback || 'No data',
      handFeedback: finalHandMetrics?.feedback || 'No data',
      
      eyeTracking: finalEyeMetrics || {},
      voiceAnalysis: finalVoiceMetrics || {},
      handTracking: finalHandMetrics || {}
    };

    console.log('📊 STEP 3B - Final report created with edited transcript:', finalReport);

    // Close modal and proceed with normal flow (analysis already stopped)
    setShowConfirmationModal(false);
    setIsFinished(true);

    if (TranscriptValidator.isValid(finalTranscript)) {
      console.log('📝 STEP 3C - Calling onFinish with edited transcript');
      onFinish(finalReport, finalTranscript, selectedQuestion);
    } else {
      console.log('📝 STEP 3C - Calling onFinish with empty transcript');
      onFinish(finalReport, '', selectedQuestion);
    }
  }, [editableTranscript, onFinish, eyeTrackingMetrics, voiceMetrics, handTrackingMetrics, selectedQuestion]);

  const handleInterviewCompletion = useCallback(() => {
    if (isFinished || showConfirmationModal) return;
    
    // STOP SPEECH RECOGNITION FIRST
    speechRecognition.stopListening();
    transcriptSimulation.stopSimulation();
    
    // NEW: Stop everything when completing interview (Skip button)
    setIsEyeTrackingActive(false);
    setIsVoiceAnalysisActive(false);
    setIsHandTrackingActive(false);
    
    // Stop timer and other resources
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (dotIntervalRef.current) {
      clearInterval(dotIntervalRef.current);
    }
    
    console.log('Setting modal to show...');
    
    // Use setTimeout to ensure speech recognition stops before modal shows
    setTimeout(() => {
      setShowConfirmationModal(true);
      setPendingEnd(false);
    }, 100);
  }, [isFinished, showConfirmationModal, speechRecognition, transcriptSimulation]);

  // NEW: Handle interview end button click
  const handleEndClick = useCallback(() => {
    if (!isFinished && window.confirm(UI_TEXT.END_CONFIRMATION)) {
      // STOP EVERYTHING IMMEDIATELY when user presses end
      setIsEyeTrackingActive(false);
      setIsVoiceAnalysisActive(false);
      setIsHandTrackingActive(false);
      
      // Stop timer and other resources
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (dotIntervalRef.current) {
        clearInterval(dotIntervalRef.current);
      }
      
      setPendingEnd(true);
      setShowConfirmationModal(true);
    }
  }, [isFinished]);

  // NEW: Handle actual end after confirmation
  const handleConfirmEnd = useCallback(() => {
    setShowConfirmationModal(false);
    setIsFinished(true);
    setIsEyeTrackingActive(false);
    setIsVoiceAnalysisActive(false);
    setIsHandTrackingActive(false);
    if (onEnd) onEnd();
  }, [onEnd]);

  const resetAllMetrics = useCallback(() => {
    setEyeTrackingMetrics(DEFAULT_METRICS);
    setVoiceMetrics(DEFAULT_METRICS);
    setHandTrackingMetrics({ handMetrics: [], feedback: 'Initializing' });
    latestEyeMetricsRef.current = null;
    latestVoiceMetricsRef.current = null;
    latestHandMetricsRef.current = null;
    if (window.eyeTrackingReset) window.eyeTrackingReset();
    if (window.pitchAnalyzerReset) window.pitchAnalyzerReset();
  }, []);

  const initializeInterview = useCallback(async () => {
    if (isInitialized) return;
    try {
      setIsInitialized(true);
      setupDotAnimation();
      resetAllMetrics();
      
      if (DevHelpers.isApiDisabled()) {
        console.log('🔍 Running transcription diagnostic...');
      }
      
      if (presetMediaStream) {
        mediaStream.setFromPreset(presetMediaStream);
      } else {
        await mediaStream.startCapture();
      }

      if (DevHelpers.isTranscriptSimulationEnabled()) {
        transcriptSimulation.startSimulation();
      } else {
        speechRecognition.startListening();
      }
      
      setIsEyeTrackingActive(true);
      setIsVoiceAnalysisActive(true);
      setIsHandTrackingActive(true);
      console.log('Eye tracking activated');
      console.log('Hand tracking activated');
      setupSessionTimeout();

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      setIsInitialized(false);
    }
  }, [isInitialized, mediaStream, speechRecognition, transcriptSimulation, setupDotAnimation, setupSessionTimeout, resetAllMetrics]);

  useEffect(() => {
    scrollToBottom();
  }, [editableTranscript, scrollToBottom]);

  useEffect(() => {
    if (!isInitialized) return;
    
    const analysisInterval = setInterval(() => {
      performVoiceAnalysis();
    }, 1000);
    
    return () => clearInterval(analysisInterval);
  }, [isInitialized, performVoiceAnalysis, performHandTrackingAnalysis]);

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

  useEffect(() => {
    let timerInterval;

    if (isInitialized && !showConfirmationModal) {
      timerInterval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      clearInterval(timerInterval);
    };
  }, [isInitialized, showConfirmationModal]);

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
          
          <div className="session-timer">
            {formatTime(elapsedTime)}
          </div>
        </div>

        <div className="interview-main">
          <EyeTrackingAnalyzer
            videoRef={mediaStream.videoRef}
            isActive={isEyeTrackingActive}
            onMetricsUpdate={handleEyeTrackingUpdate}
            className="eye-tracking-overlay"
            hideUI={true}
          />

          <HandTrackingAnalyzer
            videoRef={mediaStream.videoRef}
            isActive={isHandTrackingActive}
            onMetricsUpdate={handleHandTrackingUpdate}
          />

          <div className="transcript-main">
            <div className="transcript-main__header">
              <h3 className="transcript-main__title">
                <i className="fas fa-file-alt icon-sm"></i>
                Live Transcript (Editable)
              </h3>
            </div>
            <div className="transcript-main__content" ref={transcriptScrollableRef}>
              {/* NEW: Editable textarea instead of read-only paragraph */}
              <textarea
                className="transcript-main__editable"
                value={editableTranscript || `${speechRecognition.isListening ? 'Listening' : 'Ready to listen'}${listeningDots}`}
                onChange={(e) => setEditableTranscript(e.target.value)}
                placeholder="Your transcript will appear here. You can edit it while speaking..."
                aria-label="Editable interview transcript"
              />
              {DevHelpers.isTranscriptSimulationEnabled() && (
                <div className="transcript-main__dev-indicator">
                  [DEV] Transcript simulation active
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Confirmation Modal */}
      {showConfirmationModal && (
        <div className="transcript-confirmation-modal">
          <div className="transcript-confirmation-modal__content">
            <h3 className="transcript-confirmation-modal__title">
              {pendingEnd ? 'Confirm End Interview' : 'Review Your Transcript'}
            </h3>
            <p className="transcript-confirmation-modal__description">
              {pendingEnd 
                ? 'Please review and edit your transcript before ending the interview:'
                : 'Please review and edit your transcript before proceeding:'
              }
            </p>
            
            <textarea
              className="transcript-confirmation-modal__textarea"
              value={editableTranscript}
              onChange={(e) => setEditableTranscript(e.target.value)}
              placeholder="Edit your transcript here..."
            />
            
            <div className="transcript-confirmation-modal__actions">
              <button
                className="transcript-confirmation-modal__button transcript-confirmation-modal__button--cancel"
                onClick={() => setShowConfirmationModal(false)}
              >
                Cancel
              </button>
              <button
                className={`transcript-confirmation-modal__button ${
                  pendingEnd 
                    ? 'transcript-confirmation-modal__button--danger' 
                    : 'transcript-confirmation-modal__button--primary'
                }`}
                onClick={pendingEnd ? handleConfirmEnd : handleConfirmTranscript}
              >
                {pendingEnd ? 'End Interview' : 'Confirm & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="interview-layout__button-container">
        <button className="button interview-layout__end-button" onClick={handleEndClick}>
          <i className="fas fa-times icon-sm"></i>
          {UI_TEXT.END_INTERVIEW}
        </button>

        <button className="button interview-layout__done-button" onClick={() => {
          if (!isFinished && !showConfirmationModal && window.confirm(UI_TEXT.SKIP_CONFIRMATION)) {
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