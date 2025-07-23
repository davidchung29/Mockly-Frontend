/**
 * Main App Component
 * Handles interview flow and state management
 * WITH LOADING SCREEN INTEGRATION
 */

import React, { useState, useCallback } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';
import InterviewSession from './components/InterviewSession';
import VideoAudioProcessor from './components/VideoAudioProcessor';
import FeedbackReport from './components/FeedbackReport';
import ProcessingScreen from './components/ProcessingScreen';
import LoadingScreen from './components/LoadingScreen'; // NEW IMPORT
import { DevHelpers } from './config/devConfig';
import './theme.css';

const App = () => {
  // App state
  const [currentView, setCurrentView] = useState('interview'); // 'loading', 'interview', 'processing', 'feedback', 'profile'
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackReport, setFeedbackReport] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [presetMediaStream, setPresetMediaStream] = useState(null); // NEW STATE

  // Enhanced interview finish handler with debugging
  const handleInterviewFinish = useCallback((metrics, transcript) => {
    console.log('🎯 STEP 4 - Parent component (App) received onFinish callback');
    console.log('📊 Received metrics:', metrics);
    console.log('📝 Received transcript:', transcript);
    console.log('🔍 Metrics JSON:', JSON.stringify(metrics, null, 2));
    console.log('🔍 Metrics keys:', Object.keys(metrics || {}));

    // Check if eye tracking data is still present
    if (metrics.eyeTracking || metrics.eye_tracking) {
      console.log('✅ Eye tracking data is present in parent component');
      console.log('👁️ Eye tracking data:', metrics.eyeTracking || metrics.eye_tracking);
    } else {
      console.log('❌ Eye tracking data is MISSING in parent component');

      // Check individual fields
      console.log('👁️ Individual eye tracking fields:', {
        eyeContactPercentage: metrics.eyeContactPercentage,
        smilePercentage: metrics.smilePercentage,
        sessionDuration: metrics.sessionDuration
      });
    }

    setIsProcessing(true);
    setCurrentView('processing');

    // Simulate processing or make API call
    if (DevHelpers.isApiDisabled()) {
      // Mock processing for development
      console.log('🔧 STEP 5 - Mock processing (Dev mode)');
      handleMockProcessing(metrics, transcript);
    } else {
      // Real API call
      console.log('🌐 STEP 5 - Real API processing');
      handleRealProcessing(metrics, transcript);
    }
  }, []);

  // Mock processing function with debugging
  const handleMockProcessing = useCallback((metrics, transcript) => {
    console.log('🔧 STEP 5A - Mock processing started');
    console.log('📤 Input metrics to mock processing:', metrics);
    console.log('📝 Input transcript to mock processing:', transcript);

    // Simulate processing delay
    setTimeout(() => {
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
        // Also add to metrics object for compatibility
        metrics: {
          eyeTracking: metrics.eyeTracking,
          eye_tracking: metrics.eye_tracking,
          ...metrics
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

      setFeedbackReport(mockResponse);
      setIsProcessing(false);
      setCurrentView('feedback');
    }, 2000); // 2 second delay
  }, []);

  // Real API processing function with debugging
  const handleRealProcessing = useCallback(async (metrics, transcript) => {
    console.log('🌐 STEP 5A - Real API processing started');
    console.log('📤 Input metrics to API:', metrics);
    console.log('📝 Input transcript to API:', transcript);

    const requestPayload = {
      transcript,
      metrics,
      // Include eye tracking data explicitly in the payload
      eyeContactPercentage: metrics.eyeContactPercentage,
      smilePercentage: metrics.smilePercentage,
      sessionDuration: metrics.sessionDuration,
      eyeTracking: metrics.eyeTracking,
      eye_tracking: metrics.eye_tracking,
      selectedQuestion: selectedQuestion
    };

    console.log('📤 STEP 5B - Final API request payload:', requestPayload);
    console.log('🔍 Payload JSON:', JSON.stringify(requestPayload, null, 2));

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/analyze-interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any auth headers you need
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

      setFeedbackReport(responseData);
      setIsProcessing(false);
      setCurrentView('feedback');

    } catch (error) {
      console.error('❌ API error:', error);
      // Fallback to mock data if API fails
      console.log('🔧 API failed, falling back to mock processing');
      handleMockProcessing(metrics, transcript);
    }
  }, [selectedQuestion, handleMockProcessing]);

  // NEW: Handle loading screen completion
  const handleLoadingDone = useCallback((mediaStream) => {
    console.log('✅ Loading screen completed, received MediaStream:', mediaStream);
    setPresetMediaStream(mediaStream);
    setCurrentView('interview');
  }, []);

  // Handle interview start
  const handleInterviewStart = useCallback((questionId) => {
    console.log('🎬 Starting interview with question:', questionId);
    setSelectedQuestion(questionId);
    setCurrentView('loading'); // CHANGED: Go to loading first
    setFeedbackReport(null);
  }, []);

  // Handle interview end (back to question selection)
  const handleInterviewEnd = useCallback(() => {
    console.log('🛑 Interview ended, returning to question selection');
    
    // Clean up the preset media stream
    if (presetMediaStream) {
      presetMediaStream.getTracks().forEach(track => track.stop());
      setPresetMediaStream(null);
    }
    
    setCurrentView('interview');
    setSelectedQuestion('');
    setFeedbackReport(null);
    setIsProcessing(false);
  }, [presetMediaStream]);

  // Handle start new interview from feedback
  const handleStartNewInterview = useCallback(() => {
    console.log('🔄 Starting new interview from feedback');
    
    // Clean up the preset media stream
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
    setCurrentView('profile');
  }, []);

  const handleNavigateToInterview = useCallback(() => {
    setCurrentView('interview');
    setSelectedQuestion('');
    setFeedbackReport(null);
  }, []);

  const handleShowAuthModal = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case 'loading':
        return <LoadingScreen onDone={handleLoadingDone} />;
      
      case 'profile':
        return (
          <UserProfile
            onNavigateToInterview={handleNavigateToInterview}
          />
        );

      case 'processing':
        return <ProcessingScreen />;

      case 'feedback':
        return (
          <FeedbackReport
            report={feedbackReport}
            onStartNewInterview={handleStartNewInterview}
          />
        );

      case 'interview':
      default:
        return (
          <>
            {selectedQuestion ? (
              <VideoAudioProcessor
                selectedQuestion={selectedQuestion}
                onFinish={handleInterviewFinish}
                onEnd={handleInterviewEnd}
                presetMediaStream={presetMediaStream} // PASS PRESET STREAM
              />
            ) : (
              <InterviewSession
                onStart={handleInterviewStart}
                onNavigateToProfile={handleNavigateToProfile}
                onShowAuthModal={handleShowAuthModal}
              />
            )}
          </>
        );
    }
  };

  return (
    <AuthProvider>
      <div className="app">
        {currentView !== 'loading' && ( // Hide header during loading
          <Header 
            onNavigateToInterview={handleNavigateToInterview}
            onNavigateToProfile={handleNavigateToProfile}
            onShowAuthModal={handleShowAuthModal}
          />
        )}
        
        {renderCurrentView()}

        {showAuthModal && (
          <AuthModal onClose={handleCloseAuthModal} />
        )}
      </div>
    </AuthProvider>
  );
};

export default App;
