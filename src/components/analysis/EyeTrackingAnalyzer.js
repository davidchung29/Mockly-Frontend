/**
 * FIXED Eye Tracking Analyzer - MediaPipe FaceMesh v0.10.7 (Pinned Version)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

const EyeTrackingAnalyzer = React.memo(({ 
  videoRef, 
  isActive, 
  onMetricsUpdate,
  className = '' 
}) => {
  const faceMeshRef = useRef();
  const animationFrameRef = useRef();
  const metricsRef = useRef({
    eyeContactFrames: 0,
    smileFrames: 0,
    totalFrames: 0,
    startTime: Date.now(),
    lastUpdateTime: Date.now()
  });

  const [metrics, setMetrics] = useState({
    eyeContactPercentage: 0,
    smilePercentage: 0,
    gazeStatus: 'Initializing',
    sessionTime: '00:00',
    totalFrames: 0,
    currentlyDetecting: false
  });

  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // MediaPipe FaceMesh results handler
  const handleFaceMeshResults = useCallback((results) => {
    if (!results || !isActive) return;

    try {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        console.log('👁️ MediaPipe v0.10.7 face detected with', landmarks.length, 'landmarks');
        setIsDetecting(true);
        
        const eyeContactResult = analyzeEyeContact(landmarks);
        const isSmiling = analyzeSmile(landmarks);
        
        updateMetrics(eyeContactResult, isSmiling);
      } else {
        console.log('👁️ No face detected by MediaPipe v0.10.7');
        setIsDetecting(false);
        updateMetrics({ isLooking: false, gazeStatus: 'No face detected' }, false);
      }
    } catch (error) {
      console.error('❌ Error processing MediaPipe v0.10.7 face results:', error);
    }
  }, [isActive]);

  // Load MediaPipe FaceMesh model with pinned version
  const loadModel = useCallback(async () => {
    try {
      console.log('👁️ Loading MediaPipe FaceMesh v0.10.7 for interview...');
      
      if (!window.FaceMesh) {
        throw new Error('MediaPipe FaceMesh v0.10.7 not found. Check if scripts loaded properly.');
      }
      
      const faceMesh = new window.FaceMesh({
        locateFile: (file) => {
          console.log('📁 FaceMesh v0.10.7 requesting file:', file);
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.10.7/${file}`;
        }
      });

      // Updated options for v0.10.7 compatibility
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      faceMesh.onResults(handleFaceMeshResults);
      
      faceMeshRef.current = faceMesh;
      setModelLoaded(true);
      console.log('✅ MediaPipe FaceMesh v0.10.7 loaded successfully for interview');
      
    } catch (err) {
      console.error('❌ Failed to load MediaPipe FaceMesh v0.10.7 for interview:', err);
      setError(`Failed to load face tracking v0.10.7: ${err.message}`);
    }
  }, [handleFaceMeshResults]);

  // Analyze smile from MediaPipe landmarks
  const analyzeSmile = useCallback((landmarks) => {
    try {
      if (!landmarks || landmarks.length < 468) return false;
      
      // MediaPipe landmarks (normalized coordinates 0-1)
      const leftCorner = landmarks[61];   // Left mouth corner
      const rightCorner = landmarks[291]; // Right mouth corner
      const upperLip = landmarks[13];     // Upper lip center
      const lowerLip = landmarks[14];     // Lower lip center
      
      if (!leftCorner || !rightCorner || !upperLip || !lowerLip) {
        return false;
      }
      
      // Calculate mouth width and height
      const mouthWidth = Math.sqrt(
        Math.pow(rightCorner.x - leftCorner.x, 2) + 
        Math.pow(rightCorner.y - leftCorner.y, 2)
      );
      
      const mouthHeight = Math.sqrt(
        Math.pow(upperLip.x - lowerLip.x, 2) + 
        Math.pow(upperLip.y - lowerLip.y, 2)
      );
      
      // Calculate smile indicators
      const smileRatio = mouthWidth / (mouthHeight + 0.001);
      const mouthCenterY = (upperLip.y + lowerLip.y) / 2;
      const cornerElevation = mouthCenterY - ((leftCorner.y + rightCorner.y) / 2);
      
      // Adjusted thresholds for MediaPipe normalized coordinates
      const isSmiling = smileRatio > 6 && cornerElevation > 0.003;
      
      return isSmiling;
    } catch (err) {
      console.error('Error analyzing smile:', err);
      return false;
    }
  }, []);

  // Analyze eye contact from MediaPipe landmarks
  const analyzeEyeContact = useCallback((landmarks) => {
    try {
      if (!landmarks || landmarks.length < 468) {
        return { isLooking: false, gazeStatus: 'No landmarks' };
      }
      
      // MediaPipe landmarks for eyes (normalized coordinates)
      const leftEye = landmarks[33];   // Left eye center
      const rightEye = landmarks[362]; // Right eye center
      const noseTip = landmarks[1];    // Nose tip
      
      if (!leftEye || !rightEye || !noseTip) {
        return { isLooking: false, gazeStatus: 'Landmarks missing' };
      }
      
      const video = videoRef?.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return { isLooking: false, gazeStatus: 'Video not ready' };
      }
      
      // Calculate eye center (MediaPipe uses normalized 0-1 coordinates)
      const eyeCenterX = (leftEye.x + rightEye.x) / 2;
      const eyeCenterY = (leftEye.y + rightEye.y) / 2;
      
      // Video center in normalized coordinates
      const videoCenterX = 0.5;
      const videoCenterY = 0.5;
      
      // Calculate distance from eye center to video center
      const distanceX = Math.abs(eyeCenterX - videoCenterX);
      const distanceY = Math.abs(eyeCenterY - videoCenterY);
      const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      // Eye contact threshold (in normalized coordinates)
      const maxDistance = 0.12; // 12% of the frame
      const isLooking = totalDistance < maxDistance;
      
      // Determine gaze direction
      let gazeStatus = 'Camera';
      if (!isLooking) {
        if (distanceX > distanceY) {
          gazeStatus = eyeCenterX < videoCenterX ? 'Left' : 'Right';
        } else {
          gazeStatus = eyeCenterY < videoCenterY ? 'Up' : 'Down';
        }
      }
      
      return { isLooking, gazeStatus };
    } catch (err) {
      console.error('Error analyzing eye contact:', err);
      return { isLooking: false, gazeStatus: 'Analysis error' };
    }
  }, [videoRef]);

  // Update metrics with real-time calculations
  const updateMetrics = useCallback((eyeContactResult, isSmiling) => {
    const current = metricsRef.current;
    const now = Date.now();
    
    // Update counters
    if (eyeContactResult.isLooking) current.eyeContactFrames++;
    if (isSmiling) current.smileFrames++;
    current.totalFrames++;
    
    // Calculate percentages
    const eyeContactPercentage = current.totalFrames > 0 
      ? Math.round((current.eyeContactFrames / current.totalFrames) * 100)
      : 0;
    
    const smilePercentage = current.totalFrames > 0
      ? Math.round((current.smileFrames / current.totalFrames) * 100)
      : 0;
    
    // Calculate session time
    const elapsed = Math.floor((now - current.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    const sessionTime = `${minutes}:${seconds}`;
    
    const newMetrics = {
      eyeContactPercentage,
      smilePercentage,
      gazeStatus: eyeContactResult.gazeStatus,
      sessionTime,
      totalFrames: current.totalFrames,
      eyeContactFrames: current.eyeContactFrames,
      smileFrames: current.smileFrames,
      currentlyDetecting: true
    };
    
    // Update local state
    setMetrics(newMetrics);
    
    // Throttle updates to parent (every 500ms)
    if (now - current.lastUpdateTime > 500) {
      current.lastUpdateTime = now;
      if (onMetricsUpdate && typeof onMetricsUpdate === 'function') {
        console.log('👁️ Sending MediaPipe v0.10.7 eye metrics update:', newMetrics);
        onMetricsUpdate(newMetrics);
      }
    }
  }, [onMetricsUpdate]);

  // Detection loop with enhanced error handling for v0.10.7
  const detectFaces = useCallback(async () => {
    if (!faceMeshRef.current || !isActive || !videoRef?.current) {
      return;
    }
    
    try {
      const video = videoRef.current;
      
      if (video.readyState >= 2 && 
          video.videoWidth > 0 && 
          video.videoHeight > 0 && 
          !video.paused) {
        
        console.log('👁️ Processing video frame with MediaPipe v0.10.7...');
        
        // Enhanced error handling for v0.10.7
        try {
          await faceMeshRef.current.send({ image: video });
        } catch (sendError) {
          console.error('❌ MediaPipe v0.10.7 send error:', sendError);
          // Don't throw, just log and continue
        }
      }
    } catch (err) {
      console.error('❌ Error in MediaPipe v0.10.7 face detection:', err);
    }
    
    // Continue detection with proper timing
    if (isActive && faceMeshRef.current) {
      animationFrameRef.current = setTimeout(() => {
        requestAnimationFrame(detectFaces);
      }, 100); // Process at ~10 FPS
    }
  }, [isActive, videoRef]);

  // Start/stop detection
  useEffect(() => {
    if (isActive && modelLoaded && videoRef?.current) {
      console.log('👁️ Starting MediaPipe v0.10.7 eye tracking detection...');
      detectFaces();
    } else {
      if (animationFrameRef.current) {
        clearTimeout(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsDetecting(false);
      console.log('👁️ MediaPipe v0.10.7 eye tracking detection stopped');
    }
    
    return () => {
      if (animationFrameRef.current) {
        clearTimeout(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive, modelLoaded, detectFaces]);

  // Load model on mount
  useEffect(() => {
    loadModel();
    
    return () => {
      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close();
        } catch (e) {
          console.warn('⚠️ Error closing MediaPipe v0.10.7 FaceMesh:', e);
        }
      }
    };
  }, [loadModel]);

  // Reset metrics function
  const resetMetrics = useCallback(() => {
    console.log('🔄 MediaPipe v0.10.7 EyeTrackingAnalyzer resetMetrics called');
    metricsRef.current = {
      eyeContactFrames: 0,
      smileFrames: 0,
      totalFrames: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    };
    
    const resetData = {
      eyeContactPercentage: 0,
      smilePercentage: 0,
      gazeStatus: 'Initializing',
      sessionTime: '00:00',
      totalFrames: 0,
      currentlyDetecting: false
    };
    
    setMetrics(resetData);
    setIsDetecting(false);
    
    if (onMetricsUpdate && typeof onMetricsUpdate === 'function') {
      onMetricsUpdate(resetData);
    }
  }, [onMetricsUpdate]);

  // Expose reset function globally
  useEffect(() => {
    window.eyeTrackingReset = resetMetrics;
    return () => {
      delete window.eyeTrackingReset;
    };
  }, [resetMetrics]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Camera': return '#00ff00';
      case 'Left':
      case 'Right':
      case 'Up':
      case 'Down': return '#ffaa00';
      case 'No face detected': return '#ff4444';
      default: return '#ffffff';
    }
  };

  const getPercentageColor = (percentage, type) => {
    if (type === 'eyeContact') {
      return percentage >= 70 ? '#00ff00' : percentage >= 50 ? '#ffaa00' : '#ff4444';
    } else if (type === 'smile') {
      return percentage >= 40 ? '#00ff00' : percentage >= 20 ? '#ffaa00' : '#ff4444';
    }
    return '#ffffff';
  };

  if (error) {
    return (
      <div className={`eye-tracking-analyzer ${className}`}>
        <div className="eye-tracking-error">
          <i className="fas fa-exclamation-triangle icon-sm icon-error"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`eye-tracking-analyzer ${className}`}>
      <div className="eye-tracking-metrics">
        <div className="eye-tracking-status">
          <h4 className="eye-tracking-title">
            <i className="fas fa-eye icon-sm"></i>
            Eye Contact Analysis (MediaPipe v0.10.7)
          </h4>
          <div className="eye-tracking-status-text">
            Status: {modelLoaded && isActive ? (isDetecting ? 'Detecting' : 'Ready') : 'Loading...'}
            {isDetecting && (
              <span style={{ color: '#00ff00', marginLeft: '8px' }}>
                ✓ Face Detected
              </span>
            )}
          </div>
        </div>
        
        <div className="eye-tracking-stats">
          <div className="eye-tracking-stat">
            <span 
              className="eye-tracking-stat-value"
              style={{ color: getPercentageColor(metrics.eyeContactPercentage, 'eyeContact') }}
            >
              {metrics.eyeContactPercentage}%
            </span>
            <span className="eye-tracking-stat-label">Eye Contact</span>
          </div>
          
          <div className="eye-tracking-stat">
            <span 
              className="eye-tracking-stat-value"
              style={{ color: getPercentageColor(metrics.smilePercentage, 'smile') }}
            >
              {metrics.smilePercentage}%
            </span>
            <span className="eye-tracking-stat-label">Smile Rate</span>
          </div>
          
          <div className="eye-tracking-stat">
            <span 
              className="eye-tracking-stat-value"
              style={{ color: getStatusColor(metrics.gazeStatus) }}
            >
              {metrics.gazeStatus}
            </span>
            <span className="eye-tracking-stat-label">Gaze Direction</span>
          </div>
          
          <div className="eye-tracking-stat">
            <span className="eye-tracking-stat-value">
              {metrics.sessionTime}
            </span>
            <span className="eye-tracking-stat-label">Session Time</span>
          </div>
          
          <div className="eye-tracking-stat">
            <span className="eye-tracking-stat-value">
              {metrics.totalFrames}
            </span>
            <span className="eye-tracking-stat-label">Total Frames</span>
          </div>
        </div>

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: '12px', 
            padding: '8px', 
            background: '#f0f0f0', 
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace'
          }}>
            <strong>MediaPipe v0.10.7 Debug:</strong><br/>
            Model: {modelLoaded ? '✅' : '❌'}<br/>
            Active: {isActive ? '✅' : '❌'}<br/>
            Detecting: {isDetecting ? '✅' : '❌'}<br/>
            FaceMesh Available: {typeof window.FaceMesh !== 'undefined' ? '✅' : '❌'}<br/>
            Frames: {metrics.totalFrames}<br/>
            Eye Contact Frames: {metrics.eyeContactFrames}<br/>
            Smile Frames: {metrics.smileFrames}
          </div>
        )}
      </div>
    </div>
  );
});

EyeTrackingAnalyzer.displayName = 'EyeTrackingAnalyzer';

export default EyeTrackingAnalyzer;