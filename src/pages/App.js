/**
 * Main App Component
 * Handles interview flow and state management
 * WITH DEBUGGING FOR EYE TRACKING DATA FLOW AND LOADING SCREEN INTEGRATION
 */

import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import AuthModal from '../components/auth/AuthModal';
import UserProfile from '../components/profile/UserProfile';
import InterviewSession from '../components/interview/InterviewSession';
import LoadingScreen from '../components/interview/LoadingScreen';
import VideoAudioProcessor from '../components/analysis/VideoAudioProcessor';
import FeedbackReport from '../components/feedback/FeedbackReport';
import ProcessingScreen from '../components/feedback/ProcessingScreen';
import OAuthCallback from '../components/auth/OAuthCallback';
import { DevHelpers } from '../config/devConfig';
import { UI_TEXT } from '../constants/interviewConstants';
import '../styles/theme.css';

const App = () => {
  // App state
  const [currentView, setCurrentView] = useState('interview'); // 'interview', 'setup', 'video-interview', 'processing', 'feedback', 'profile'
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackReport, setFeedbackReport] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profileKey, setProfileKey] = useState(0); // Add key for forcing UserProfile re-mount
  const [presetMediaStream, setPresetMediaStream] = useState(null); // New: for LoadingScreen integration

  // Get authentication state
  const { isAuthenticated, loading, getAuthHeaders } = useAuth();

  // Monitor authentication state and redirect if needed
  useEffect(() => {
    if (!loading && !isAuthenticated && currentView === 'profile') {
      // Redirect to home page if user is not authenticated and on profile page
      setCurrentView('interview');
    }
  }, [isAuthenticated, loading, currentView]);

  // Enhanced interview finish handler with debugging
  const handleInterviewFinish = useCallback(async (metrics, transcript, questionId) => {
    console.log('🎯 STEP 4 - Parent component (App) received onFinish callback');
    console.log('📊 Received metrics:', metrics);
    console.log('📝 Received transcript:', transcript);
    console.log('🔍 selectedQuestion in handleInterviewFinish:', selectedQuestion);
    console.log('🔍 questionId passed from VideoAudioProcessor:', questionId);
    console.log('🔍 Metrics JSON:', JSON.stringify(metrics, null, 2));
    console.log('🔍 Metrics keys:', Object.keys(metrics || {}));
    
    // Check if eye tracking data is still present
    if (metrics.eyeTracking || metrics.eye_tracking) {
      console.log('✅ Eye tracking data is present in parent component');
      console.log('👁️ Eye tracking data:', metrics.eyeTracking || metrics.eye_tracking);
    } else {
      console.log('❌ Eye tracking data is MISSING in parent component');
    }

    // Check individual fields
    console.log('👁️ Individual eye tracking fields:', {
      eyeContactPercentage: metrics.eyeContactPercentage,
      smilePercentage: metrics.smilePercentage,
      sessionDuration: metrics.sessionDuration
    });
    
    setIsProcessing(true);
    setCurrentView('processing');

    // Simulate processing or make API call
    if (DevHelpers.isApiDisabled()) {
      // Mock processing for development
      console.log('🔧 STEP 5 - Mock processing (Dev mode)');
      handleMockProcessing(metrics, transcript, questionId);
    } else {
      // Real API call
      console.log('🌐 STEP 5 - Real API processing');
      handleRealProcessing(metrics, transcript, questionId);
    }
  }, []);

  // Save user progress function
  const saveUserProgress = useCallback(async (responseData, metrics, transcript) => {
    if (!isAuthenticated) {
      console.log('👤 User not authenticated, skipping progress save');
      return;
    }

    console.log('💾 Saving user progress...');
    
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

    console.log('📊 Progress data to save:', progressData);

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
      console.log('✅ User progress saved successfully:', savedProgress);
    } else {
      const errorData = await response.json();
      console.error('❌ Failed to save progress:', errorData);
      throw new Error(`Failed to save progress: ${errorData.detail || 'Unknown error'}`);
    }
  }, [isAuthenticated, selectedQuestion, getAuthHeaders]);

  // Mock processing function with debugging
  const handleMockProcessing = useCallback((metrics, transcript, questionId) => {
    console.log('🔧 STEP 5A - Mock processing started');
    console.log('📤 Input metrics to mock processing:', metrics);
    console.log('📝 Input transcript to mock processing:', transcript);
    console.log('🎯 Question ID passed to handleMockProcessing:', questionId);
    
    // Simulate processing delay
    setTimeout(async () => {
      const mockResponse = {
        content_score: 4.2,
        voice_score: 3.8,
        face_score: 4,
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
        // Also add hand tracking data
        handMetrics: metrics.handMetrics,
        feedback: metrics.feedback,
        handFeedback: metrics.handFeedback,
        hasEverDetectedHands: metrics.hasEverDetectedHands,
        // Voice analysis data
        averageVolume: metrics.averageVolume,
        volumeVariation: metrics.volumeVariation,
        pitchVariation: metrics.pitchVariation,
        speechRate: metrics.speechRate,
        clarity: metrics.clarity,
        totalSamples: metrics.totalSamples,
        // Also add to metrics object for compatibility
        metrics: {
          eyeTracking: metrics.eyeTracking,
          eye_tracking: metrics.eye_tracking,
          handTracking: metrics.handTracking,
          voiceAnalysis: metrics.voiceAnalysis
        }
      };
      
      console.log('📥 STEP 5B - Mock response created:', mockResponse);
      console.log('🔍 Mock response JSON:', JSON.stringify(mockResponse, null, 2));
      
      // Check if eye tracking data is preserved
      if (mockResponse.eyeTracking || mockResponse.eye_tracking) {
        console.log('✅ Eye tracking data preserved in mock response');
        console.log('👁️ Eye tracking in mock response:', mockResponse.eyeTracking || mockResponse.eye_tracking);
      } else {
        console.log('❌ Eye tracking data LOST in mock response');
      }
      
      // Save user progress if authenticated (even in mock mode)
      if (isAuthenticated) {
        try {
          await saveUserProgress(mockResponse, metrics, transcript);
        } catch (progressError) {
          console.error('❌ Failed to save user progress in mock mode:', progressError);
          // Don't fail the entire process if progress saving fails
        }
      }
      
      setFeedbackReport(mockResponse);
      setIsProcessing(false);
      setCurrentView('feedback');
    }, 2000); // 2 second delay
  }, [isAuthenticated, saveUserProgress]);

  // Real API processing function with debugging
  const handleRealProcessing = useCallback(async (metrics, transcript, questionId) => {
    console.log('🌐 STEP 5A - Real API processing started');
    console.log('📤 Input metrics to API:', metrics);
    console.log('📝 Input transcript to API:', transcript);
    console.log('🎯 Question ID passed to handleRealProcessing:', questionId);
    
    const requestPayload = {
      transcript,
      metrics,
      // Include eye tracking data explicitly in the payload
      eyeContactPercentage: metrics.eyeContactPercentage,
      smilePercentage: metrics.smilePercentage,
      sessionDuration: metrics.sessionDuration,
      eyeTracking: metrics.eyeTracking,
      eye_tracking: metrics.eye_tracking,
      // Include hand tracking data
      handMetrics: metrics.handMetrics,
      feedback: metrics.feedback,
      handFeedback: metrics.handFeedback,
      hasEverDetectedHands: metrics.hasEverDetectedHands,
      // Include voice analysis data
      averageVolume: metrics.averageVolume,
      volumeVariation: metrics.volumeVariation,
      pitchVariation: metrics.pitchVariation,
      speechRate: metrics.speechRate,
      clarity: metrics.clarity,
      totalSamples: metrics.totalSamples,
      question_id: questionId
    };
    
    console.log('📤 STEP 5B - Final API request payload:', requestPayload);
    console.log('🔍 Payload JSON:', JSON.stringify(requestPayload, null, 2));
    console.log('👤 User authenticated:', isAuthenticated);
    console.log('🎯 Question ID in payload:', questionId);
    
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
      
      console.log('📥 STEP 5C - API response received:', responseData);
      console.log('🔍 Response JSON:', JSON.stringify(responseData, null, 2));
      console.log('📊 Response keys:', Object.keys(responseData || {}));
      
      // Check if eye tracking data is in the response
      if (responseData.eyeTracking || responseData.eye_tracking) {
        console.log('✅ Eye tracking data preserved in API response');
        console.log('👁️ Eye tracking in response:', responseData.eyeTracking || responseData.eye_tracking);
      } else {
        console.log('❌ Eye tracking data LOST in API response');
        console.log('🔍 Available fields in response:', Object.keys(responseData));
        
        // Try to restore eye tracking data if it's missing
        responseData.eyeTracking = metrics.eyeTracking;
        responseData.eye_tracking = metrics.eye_tracking;
        responseData.eyeContactPercentage = metrics.eyeContactPercentage;
        responseData.smilePercentage = metrics.smilePercentage;
        responseData.sessionDuration = metrics.sessionDuration;
        
        console.log('🔧 Restored eye tracking data to response:', responseData);
      }
      
      // Save user progress if authenticated
      if (isAuthenticated) {
        try {
          // Progress is automatically saved by the backend in the comprehensive-analysis endpoint
          console.log('✅ Progress automatically saved by backend');
        } catch (progressError) {
          console.error('❌ Failed to save user progress:', progressError);
          // Don't fail the entire process if progress saving fails
        }
      }
      
      setFeedbackReport(responseData);
      setIsProcessing(false);
      setCurrentView('feedback');
      
    } catch (error) {
      console.error('❌ API error:', error);
      
      // Fallback to mock data if API fails
      console.log('🔧 API failed, falling back to mock processing');
      handleMockProcessing(metrics, transcript, questionId);
    }
  }, [isAuthenticated, getAuthHeaders, saveUserProgress, handleMockProcessing]);

  // Handle interview start - go to setup first
  const handleInterviewStart = useCallback((questionId) => {
    console.log('🎬 Starting interview setup with question:', questionId);
    setSelectedQuestion(questionId);
    setCurrentView('setup'); // Changed from 'video-interview' to 'setup'
    setFeedbackReport(null);
  }, []);

  // Handle setup completion - go to actual interview
  const handleSetupComplete = useCallback((mediaStream) => {
    console.log('✅ Setup complete, starting interview with preset stream');
    setPresetMediaStream(mediaStream);
    setCurrentView('video-interview');
  }, []);

  // Handle interview end (back to question selection)
  const handleInterviewEnd = useCallback(() => {
    console.log('🛑 Interview ended, returning to question selection');
    console.log('🔍 selectedQuestion before clearing:', selectedQuestion);
    
    // Stop preset media stream if it exists
    if (presetMediaStream) {
      presetMediaStream.getTracks().forEach(track => track.stop());
      setPresetMediaStream(null);
    }
    
    setCurrentView('interview');
    setSelectedQuestion('');
    setFeedbackReport(null);
    setIsProcessing(false);
  }, [selectedQuestion, presetMediaStream]);

  // Handle start new interview from feedback
  const handleStartNewInterview = useCallback(() => {
    console.log('🔄 Starting new interview from feedback');
    
    // Stop preset media stream if it exists
    if (presetMediaStream) {
      presetMediaStream.getTracks().forEach(track => track.stop());
      setPresetMediaStream(null);
    }
    
    setCurrentView('interview');
    setSelectedQuestion('');
    setFeedbackReport(null);
    setIsProcessing(false);
  }, [presetMediaStream]);

  // Navigation handlers
  const handleNavigateToProfile = useCallback(() => {
    // Check if user is currently in an interview session
    if (currentView === 'video-interview' || currentView === 'setup') {
      const confirmEndInterview = window.confirm(UI_TEXT.NAVIGATION_CONFIRMATION);
      if (!confirmEndInterview) {
        return; // User cancelled, stay in interview
      }
      // User confirmed, end the interview and go to profile
      handleInterviewEnd();
    }
    setProfileKey(prev => prev + 1); // Force UserProfile re-mount
    setCurrentView('profile');
  }, [currentView, handleInterviewEnd]);

  const handleNavigateToInterview = useCallback((questionId = null) => {
    // Stop preset media stream if it exists
    if (presetMediaStream) {
      presetMediaStream.getTracks().forEach(track => track.stop());
      setPresetMediaStream(null);
    }
    
    setCurrentView('interview');
    setFeedbackReport(null);
    
    // Set the selected question ID
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
      case 'profile':
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
              <LoadingScreen onDone={handleSetupComplete} />
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
        
      case 'interview':
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