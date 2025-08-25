/**
 * Main App Component
 * Handles interview flow and state management
 * WITH DEBUGGING FOR EYE TRACKING DATA FLOW
 */

import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import AuthModal from '../components/auth/AuthModal';
import UserProfile from '../components/profile/UserProfile';
import InterviewSession from '../components/interview/InterviewSession';
import VideoAudioProcessor from '../components/analysis/VideoAudioProcessor';
import LoadingScreen from '../components/interview/LoadingScreen';
import FeedbackReport from '../components/feedback/FeedbackReport';
import ProcessingScreen from '../components/feedback/ProcessingScreen';
import OAuthCallback from '../components/auth/OAuthCallback';
import { DevHelpers } from '../config/devConfig';
import { UI_TEXT } from '../constants/interviewConstants';
import { initializePostHog, trackLearnStartupEvents, identifyUser } from '../config/posthog';
import '../styles/theme.css';

const App = () => {
  // App state
   const [currentView, setCurrentView] = useState('practice'); // 'practice', 'progress', 'video-interview', 'processing', 'feedback'
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackReport, setFeedbackReport] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profileKey, setProfileKey] = useState(0); // Add key for forcing UserProfile re-mount
  const [presetMediaStream, setPresetMediaStream] = useState(null); // for setup page


  // Get authentication state
  const { isAuthenticated, loading, getAuthHeaders, user } = useAuth();

  // Initialize PostHog on app mount
  useEffect(() => {
    initializePostHog();
    console.log('PostHog initialized for lean startup analytics');
  }, []);

  // Track user identification when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      identifyUser(user.id, {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        signup_date: user.created_at,
      });
      console.log('User identified in PostHog:', user.email);
    }
  }, [isAuthenticated, user]);

  // Monitor authentication state and redirect if needed
  useEffect(() => {
    if (!loading && !isAuthenticated && currentView === 'progress') {
      // Redirect to practice page if user is not authenticated and on progress page
      setCurrentView('practice');
    }
  }, [isAuthenticated, loading, currentView]);

  // Enhanced interview finish handler with debugging
  const handleInterviewFinish = useCallback(async (metrics, transcript, questionId) => {
    console.log('STEP 4 - Parent component (App) received onFinish callback');
    console.log('Received metrics:', metrics);
    console.log('Received transcript:', transcript);
    console.log('selectedQuestion in handleInterviewFinish:', selectedQuestion);
    console.log('questionId passed from VideoAudioProcessor:', questionId);
    console.log('Metrics JSON:', JSON.stringify(metrics, null, 2));
    console.log('Metrics keys:', Object.keys(metrics || {}));
    
    // Check API mode
    console.log('DevHelpers.isApiDisabled():', DevHelpers.isApiDisabled());
    console.log('Using mock processing?', DevHelpers.isApiDisabled());
    
    // Check if eye tracking data is still present
    if (metrics.eyeTracking || metrics.eye_tracking) {
      console.log('Eye tracking data is present in parent component');
      console.log('Eye tracking data:', metrics.eyeTracking || metrics.eye_tracking);
    } else {
      console.log('Eye tracking data is MISSING in parent component');
    }

    // Check individual fields
    console.log('Individual eye tracking fields:', {
      eyeContactPercentage: metrics.eyeContactPercentage,
      smilePercentage: metrics.smilePercentage,
      sessionDuration: metrics.sessionDuration
    });

    // Track interview completion for lean startup analytics
    trackLearnStartupEvents.interviewCompleted({
      contentScore: metrics.contentScore,
      voiceScore: metrics.voiceScore,
      faceScore: metrics.faceScore,
      overallScore: metrics.overallScore,
      sessionDuration: metrics.sessionDuration,
      questionType: 'behavioral',
      sessionId: metrics.sessionId || Date.now().toString(),
      eyeContactPercentage: metrics.eyeContactPercentage,
      smilePercentage: metrics.smilePercentage,
      transcriptLength: transcript?.length || 0,
    });
    
    setIsProcessing(true);
    setCurrentView('processing');

    // Simulate processing or make API call
    if (DevHelpers.isApiDisabled()) {
      // Mock processing for development
      console.log('STEP 5 - Mock processing (Dev mode)');
      handleMockProcessing(metrics, transcript, questionId);
    } else {
      // Real API call
      console.log('STEP 5 - Real API processing');
      handleRealProcessing(metrics, transcript, questionId);
    }
  }, []);

  // Save user progress function
  const saveUserProgress = useCallback(async (responseData, metrics, transcript) => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping progress save');
      return;
    }

    console.log('Saving user progress...');
    
    const progressData = {
      question_type: 'behavioral', // Always behavioral for now
      question_text: selectedQuestion, // This should be the question ID
      content_score: responseData.content_score,
      voice_score: responseData.voice_score,
      face_score: responseData.face_score,
      transcript: transcript,
      star_analysis: responseData.star_analysis ? JSON.stringify(responseData.star_analysis) : null,
      tips_provided: responseData.tips ? JSON.stringify(responseData.tips) : null,
      session_duration_seconds: metrics.sessionDuration ? 
        parseInt(metrics.sessionDuration.split(':').reduce((acc, time) => (60 * acc) + parseInt(time), 0)) : 
        null
    };

    console.log('Progress data to save:', progressData);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    
    const response = await fetch(`${API_BASE_URL}/users/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(progressData)
    });

    if (response.ok) {
      const savedProgress = await response.json();
      console.log('User progress saved successfully:', savedProgress);
    } else {
      const errorData = await response.json();
      console.error('Failed to save progress:', errorData);
      throw new Error(`Failed to save progress: ${errorData.detail || 'Unknown error'}`);
    }
  }, [isAuthenticated, selectedQuestion, getAuthHeaders]);

  // Mock processing function with debugging
  const handleMockProcessing = useCallback((metrics, transcript, questionId) => {
    console.log('STEP 5A - Mock processing started');
    console.log('Input metrics to mock processing:', metrics);
    console.log('Input transcript to mock processing:', transcript);
    console.log('Question ID passed to handleMockProcessing:', questionId);
    
    // Check face score in mock response
    console.log('CREATING MOCK RESPONSE - FACE SCORE DEBUG:');
    console.log('Original face score from metrics:', metrics.faceScore || metrics.face_score);
    console.log('Eye contact percentage:', metrics.eyeContactPercentage);
    console.log('Smile percentage:', metrics.smilePercentage);
    
    // Simulate processing delay
    setTimeout(async () => {
      const mockResponse = {
        content_score: 4.2,
        voice_score: 3.8,
        face_score: 4,  // HARDCODED VALUE - THIS MIGHT BE THE PROBLEM!
        star_analysis: {
          situation: ['I was working as a software engineer at a tech startup'],
          task: ['I needed to implement a new feature within a tight deadline'],
          action: ['I broke down the problem, created a detailed plan, and collaborated with the team'],
          result: ['We delivered the feature on time and received positive feedback from users']
        },
        tips: {
          content: 'Excellent STAR method usage. Consider adding more specific metrics.',
          voice: 'Good pace and clarity. Work on reducing filler words.',
          face: 'Strong eye contact and confident posture. Great job!'
        },
        transcript_debug: transcript,
        // IMPORTANT: Include the eye tracking data in the mock response
        eyeTracking: metrics.eyeTracking,
        eye_tracking: metrics.eye_tracking,
        eyeContactPercentage: metrics.eyeContactPercentage,
        smilePercentage: metrics.smilePercentage,
        sessionDuration: metrics.sessionDuration,
        // Also add to metrics object for compatibility
        metrics: {
          eyeTracking: metrics.eyeTracking,
          eye_tracking: metrics.eye_tracking
        }
      };
      
      console.log('MOCK RESPONSE FACE SCORE:', mockResponse.face_score);
      console.log('STEP 5B - Mock response created:', mockResponse);
      console.log('Mock response JSON:', JSON.stringify(mockResponse, null, 2));
      
      // Check if eye tracking data is preserved
      if (mockResponse.eyeTracking || mockResponse.eye_tracking) {
        console.log('Eye tracking data preserved in mock response');
        console.log('Eye tracking in mock response:', mockResponse.eyeTracking || mockResponse.eye_tracking);
      } else {
        console.log('Eye tracking data LOST in mock response');
      }
      
      // Save user progress if authenticated (even in mock mode)
      if (isAuthenticated) {
        try {
          await saveUserProgress(mockResponse, metrics, transcript);
        } catch (progressError) {
          console.error('Failed to save user progress in mock mode:', progressError);
          // Don't fail the entire process if progress saving fails
        }
      }
      
      setFeedbackReport(mockResponse);
      setIsProcessing(false);
      setCurrentView('feedback');
    }, 2000); // 2 second delay
  }, [isAuthenticated, saveUserProgress]);

  // Calculate scores from metrics (FIXED VERSION - exact copy from FeedbackReport)
  const calculateScores = (metrics) => {
    console.log('calculateScores input metrics:', metrics);
    
    // Copy the getPercentScore function from FeedbackReport
    const getPercentScore = (value, {
      min = 0,
      max = 300,
      idealMin = 120,
      idealMax = 200,
      idealCenter = null
    } = {}) => {
      if (value <= min || value >= max) return 0;

      const center = idealCenter ?? (idealMin + idealMax) / 2;

      if (value < idealMin) {
        return Math.max(0, ((value - min) / (center - min)) * 100);
      } else if (value <= idealMax) {
        const distance = Math.abs(value - center);
        const maxDistance = Math.max(center - idealMin, idealMax - center);
        return 100 - (distance / maxDistance) * 100;
      } else {
        return Math.max(0, ((max - value) / (max - center)) * 100);
      }
    };

    // Extract voice data exactly like FeedbackReport
    const getVoiceData = () => {
      const voiceMetrics = metrics?.voiceAnalysis 
      if (voiceMetrics) {
        return{
          averageVolume: voiceMetrics.averageVolume || 0,
          volumeVariation: voiceMetrics.volumeVariation || 0,
          pitchVariation: voiceMetrics.pitchVariation || 0,
          speechRate: voiceMetrics.speechRate || 0,
          clarity: voiceMetrics.clarity || 0,
          totalSamples: voiceMetrics.totalSamples || 0,
          hasData: true
        }
      } else {
        return {
          averageVolume: 0,
          volumeVariation: 0,
          pitchVariation: 0,
          speechRate: 0,
          clarity: 0,
          totalSamples: 0,
          hasData: false
        };
      }
    };

    // Extract eye data exactly like FeedbackReport
    const getEyeData = () => {
      return {
        eyeContactPercentage: metrics?.eyeContactPercentage ?? 0,
        smilePercentage: metrics?.smilePercentage ?? 0,
        sessionDuration: metrics?.sessionDuration ?? '00:00'
      };
    };

    // Extract hand data exactly like FeedbackReport
    const getHandData = () => {
      const handMetrics = metrics?.handMetrics || [];
      
      // Safely get hand data with fallbacks
      const hand0 = handMetrics[0] || {};
      const hand1 = handMetrics[1] || {};
      
      const speed0 = hand0.averageSpeed || 0;
      const speed1 = hand1.averageSpeed || 0;
      const erratic0 = hand0.averageErraticness || 0;
      const erratic1 = hand1.averageErraticness || 0;
      const visible0 = hand0.totalVisibleTime || 0;
      const visible1 = hand1.totalVisibleTime || 0;
      
      return {
        handMetrics: handMetrics,
        averageSpeedBothHands: handMetrics.length >= 2 ? (speed0 + speed1) / 2 : (speed0 || 0),
        averageErraticnessBothHands: handMetrics.length >= 2 ? (erratic0 + erratic1) / 2 : (erratic0 || 0),
        averageHandsVisibleTime: handMetrics.length >= 2 ? (visible0 + visible1) / 2 : (visible0 || 0),
        hasData: handMetrics.length > 0
      };
    };

    const voiceData = getVoiceData();
    const eyeData = getEyeData();
    const handData = getHandData();

    console.log('Voice data extracted:', voiceData);
    console.log('Eye data extracted:', eyeData);
    console.log('Hand data extracted:', handData);

    // Content score calculation - using STAR analysis like FeedbackReport
    let starData = metrics?.star_analysis || metrics?.starAnalysis || {};
    const starComponents = ['situation', 'task', 'action', 'result'];
    const presentCount = starComponents.reduce((count, key) => {
      return count + (Array.isArray(starData[key]) && starData[key].length > 0 ? 1 : 0);
    }, 0);
    const bonus = (presentCount / 4) * 25;
    const baseScore = typeof starData.score === 'number' ? starData.score : 0;
    const contentScore = Math.round(baseScore + bonus);

    // Pitch score calculation - exactly like FeedbackReport
    const pitchScore = Math.round((voiceData.pitchVariation + voiceData.clarity) / 2);
    
    // Nonverbal score calculation - EXACT COPY from FeedbackReport
    const sessionDurationInSeconds = parseInt(eyeData.sessionDuration.split(':')[0]) * 60 + parseInt(eyeData.sessionDuration.split(':')[1]);
    
    const handVisibilityComponent = sessionDurationInSeconds > 0 ? 
      Math.round((handData.averageHandsVisibleTime / sessionDurationInSeconds) * 100) : 0;
      
    const averageSpeedComponent = Math.round(getPercentScore(handData.averageSpeedBothHands, {
      min: 0,
      max: 300,
      idealMin: 120,
      idealMax: 200,
      idealCenter: 160
    }));
    
    const erraticnessComponent = Math.round(getPercentScore(handData.averageErraticnessBothHands, {
      min: 0,
      max: 10,
      idealMin: 0,
      idealMax: 6,
      idealCenter: 3
    }));

    const smileComponent = Math.round(getPercentScore(eyeData.smilePercentage, {
      min: 0,
      max: 100,
      idealMin: 20,
      idealMax: 60,
      idealCenter: 40
    }));

    const nonverbalScore = Math.round((handVisibilityComponent + averageSpeedComponent + erraticnessComponent + eyeData.eyeContactPercentage + smileComponent) / 5);
    
    console.log('Nonverbal calculation components:', {
      handVisibilityComponent,
      averageSpeedComponent,
      erraticnessComponent,
      eyeContactPercentage: eyeData.eyeContactPercentage,
      smileComponent,
      final: nonverbalScore
    });
    console.log('Calculated nonverbal score:', nonverbalScore);

    const result = {
      content_score: contentScore,
      voice_score: pitchScore,
      face_score: nonverbalScore  // This should now be 62, not 67
    };
    
    console.log('Final calculateScores result:', result);
    console.log('FACE SCORE BEING RETURNED:', result.face_score);
    
    return result;
  };

  // Real API processing function with detailed debugging
  const handleRealProcessing = useCallback(async (metrics, transcript, questionId) => {
    console.log('STEP 5A - Real API processing started');
    console.log('Input metrics to API:', metrics);
    console.log('Input transcript to API:', transcript);
    console.log('Question ID passed to handleRealProcessing:', questionId);
    
    // Calculate scores from metrics
    const calculatedScores = calculateScores(metrics);
    console.log('Calculated scores:', calculatedScores);
    console.log('CALCULATED FACE SCORE:', calculatedScores.face_score);
    
    const requestPayload = {
      transcript,
      metrics: {
        ...metrics,
        ...calculatedScores
      },
      // Include eye tracking data explicitly in the payload
      eyeContactPercentage: metrics.eyeContactPercentage,
      smilePercentage: metrics.smilePercentage,
      sessionDuration: metrics.sessionDuration,
      eyeTracking: metrics.eyeTracking,
      eye_tracking: metrics.eye_tracking,
      question_id: questionId
    };
    
    console.log('REQUEST PAYLOAD being sent to backend:', JSON.stringify(requestPayload, null, 2));
    console.log('face_score in payload:', requestPayload.metrics?.face_score);
    console.log('User authenticated:', isAuthenticated);
    console.log('Question ID in payload:', questionId);
    
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/comprehensive-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(requestPayload)
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      console.log('RAW BACKEND RESPONSE:', JSON.stringify(responseData, null, 2));
      console.log('BACKEND RETURNED FACE SCORE:', responseData.face_score);
      console.log('Response keys:', Object.keys(responseData || {}));
      
      // Check if eye tracking data is in the response
      if (responseData.eyeTracking || responseData.eye_tracking) {
        console.log('Eye tracking data preserved in API response');
        console.log('Eye tracking in response:', responseData.eyeTracking || responseData.eye_tracking);
      } else {
        console.log('Eye tracking data LOST in API response');

        // Try to restore eye tracking data if it's missing
        responseData.eyeTracking = metrics.eyeTracking;
        responseData.eye_tracking = metrics.eye_tracking;
        responseData.eyeContactPercentage = metrics.eyeContactPercentage;
        responseData.smilePercentage = metrics.smilePercentage;
        responseData.sessionDuration = metrics.sessionDuration;
        
        console.log('Restored eye tracking data to response:', responseData);
      }

      if (responseData.handMetrics) {
        console.log('Hand tracking data preserved in API response');
        console.log('Hand tracking in response:', responseData.handMetrics);
      } else {
        console.log('Hand tracking data LOST in API response');
        
        // Try to restore hand tracking data if it's missing
        responseData.handMetrics = metrics.handMetrics;
        console.log('Restored hand tracking data to response:', responseData.handMetrics);        
      }

      if (responseData.voiceAnalysis) {
        console.log('Voice tracking data preserved in API response');
        console.log('Voice tracking in response:', responseData.voiceAnalysis);
      } else {
        console.log('Voice tracking data LOST in API response');
        
        // Try to restore voice tracking data if it's missing
        responseData.voiceAnalysis = metrics.voiceAnalysis;
        console.log('Restored voice tracking data to response:', responseData.voiceAnalysis);        
      }
      
      // Save user progress if authenticated
      if (isAuthenticated) {
        try {
          // Progress is automatically saved by the backend in the comprehensive-analysis endpoint
          console.log('Progress automatically saved by backend');
        } catch (progressError) {
          console.error('Failed to save user progress:', progressError);
          // Don't fail the entire process if progress saving fails
        }
      }
      
      setFeedbackReport(responseData);
      setIsProcessing(false);
      setCurrentView('feedback');
      
    } catch (error) {
      console.error('API error:', error);
      
      // Fallback to mock data if API fails
      console.log('API failed, falling back to mock processing');
      handleMockProcessing(metrics, transcript, questionId);
    }
  }, [isAuthenticated, getAuthHeaders, saveUserProgress]);

  // Handle interview start
  const handleInterviewStart = useCallback((questionId) => {
    console.log('Starting interview with question:', questionId);
    setSelectedQuestion(questionId);
    setCurrentView('setup');
    setFeedbackReport(null);
  }, []);

  const handleSetupComplete = useCallback((mediaStream) => {
    console.log('Setup complete, starting interview with preset stream');
    
    // Track interview start for lean startup analytics
    trackLearnStartupEvents.interviewStarted('behavioral', selectedQuestion);
    
    setPresetMediaStream(mediaStream);
    setCurrentView('video-interview');
  }, [selectedQuestion]);

  // Handle interview end (back to question selection)
  const handleInterviewEnd = useCallback(() => {
    console.log('Interview ended, returning to question selection');
    console.log('selectedQuestion before clearing:', selectedQuestion);

    if (presetMediaStream) {
      presetMediaStream.getTracks().forEach(track => track.stop());
      setPresetMediaStream(null);
    }

    setCurrentView('practice');
    setSelectedQuestion('');
    setFeedbackReport(null);
    setIsProcessing(false);
  }, [selectedQuestion, presetMediaStream]);

  const handleStartNewInterview = useCallback(() => {
    console.log('Starting new interview from feedback');

    if (presetMediaStream) {
      presetMediaStream.getTracks().forEach(track => track.stop());
      setPresetMediaStream(null);
    }

    setCurrentView('practice');
    setSelectedQuestion('');
    setFeedbackReport(null);
    setIsProcessing(false);
  }, [presetMediaStream]);

  // Navigation handlers
  const handleNavigateToProfile = useCallback(() => {
    if (currentView === 'video-interview' || currentView === 'setup') {
      const confirmEndInterview = window.confirm(UI_TEXT.NAVIGATION_CONFIRMATION);
      if (!confirmEndInterview) return;
      handleInterviewEnd();
    }

    setProfileKey(prev => prev + 1);
    setCurrentView('progress');
  }, [currentView, handleInterviewEnd]);


  const handleNavigateToInterview = useCallback((questionId = null) => {
    if (presetMediaStream) {
      presetMediaStream.getTracks().forEach(track => track.stop());
      setPresetMediaStream(null);
    }

    setCurrentView('practice');
    setFeedbackReport(null);
    setSelectedQuestion(questionId || '');
  }, [presetMediaStream]);


  const handleShowAuthModal = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'progress':
        return (
          <UserProfile 
            key={profileKey}
            currentView={currentView}
            onNavigateToInterview={handleNavigateToInterview} 
          />
        );
      
      case 'setup':
        return (
          <div className="app__main">
            <div className="app__container">
              <LoadingScreen onDone={handleSetupComplete} selectedQuestion={selectedQuestion} />
            </div>
          </div>
        );

        
      case 'processing':
        return (
          <div className="app__main">
            <div className="app__container">
              <ProcessingScreen />
            </div>
          </div>
        );
        
      case 'feedback':
        return (
          <div className="app__main">
            <div className="app__container">
              <div className="card card--feedback">
                <div className="card__content">
                  <FeedbackReport report={feedbackReport} />
                  <div className="card__footer">
                    <button 
                      className="button button--full-width"
                      onClick={handleStartNewInterview}
                    >
                      <i className="fas fa-plus icon-sm"></i>
                      Start New Interview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'video-interview':
        return (
          <div className="app__main">
            <div className="app__container">
              <div className="card card--interview">
                <div className="card__content card__content--interview">
                  <VideoAudioProcessor
                    onFinish={handleInterviewFinish}
                    onEnd={handleInterviewEnd}
                    selectedQuestion={selectedQuestion}
                    presetMediaStream={presetMediaStream}
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'practice':
      default:
        return (
          <div className="app__main">
            <div className="app__container">
              <div className="card card--dynamic">
                <div className="card__content">
                  <h1 className="app__title">Practice Interview</h1>
                  <InterviewSession 
                    onStart={handleInterviewStart} 
                    initialQuestion={selectedQuestion}
                    onShowAuthModal={handleShowAuthModal}
                  />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app">
      <Header
        currentView={currentView}
        onNavigateToProfile={handleNavigateToProfile}
        onNavigateToInterview={handleNavigateToInterview}
        onShowAuthModal={handleShowAuthModal}
      />
      
      {renderCurrentView()}
      
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={handleCloseAuthModal}
        />
      )}
    </div>
  );
};

// Main App component with AuthProvider and Router
const AppWithProviders = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth/google/callback" element={<OAuthCallback />} />
          <Route path="/auth/linkedin/callback" element={<OAuthCallback />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default AppWithProviders;

