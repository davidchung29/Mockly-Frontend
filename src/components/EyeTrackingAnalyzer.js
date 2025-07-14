/**
 * Eye Tracking Analyzer Component
 * Integrates facial recognition and eye contact analysis into Mockly
 * FIXED VERSION - Ensures state updates are properly passed to parent
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DevHelpers } from '../config/devConfig';

const EyeTrackingAnalyzer = React.memo(({ 
  videoRef, 
  canvasRef, // External canvas ref for overlay
  isActive, 
  onMetricsUpdate,
  className = '' 
}) => {
  const modelRef = useRef();
  const animationFrameRef = useRef();
  const metricsRef = useRef({
    eyeContactFrames: 0,
    smileFrames: 0,
    totalFrames: 0,
    startTime: Date.now()
  });

  const [metrics, setMetrics] = useState({
    eyeContactPercentage: 0,
    smilePercentage: 0,
    gazeStatus: 'Initializing',
    sessionTime: '00:00'
  });

  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Eye and mouth landmark indices from the FaceMesh model
  const leftEyeIndices = [33, 133, 160, 144, 145, 153, 154, 155];
  const rightEyeIndices = [362, 263, 387, 373, 374, 380, 381, 382];
  const mouthIndices = [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318];
  const lipCornerIndices = [61, 291]; // Left and right mouth corners

  // Load the FaceMesh model
  const loadModel = useCallback(async () => {
    try {
      if (!window.facemesh) {
        throw new Error('FaceMesh library not loaded. Please ensure TensorFlow.js and FaceMesh are included.');
      }
      
      DevHelpers.log('Loading FaceMesh model...');
      modelRef.current = await window.facemesh.load();
      setModelLoaded(true);
      DevHelpers.log('✅ FaceMesh model loaded successfully');
    } catch (err) {
      DevHelpers.error('❌ Failed to load FaceMesh model:', err);
      setError('Failed to load facial recognition model');
    }
  }, []);

  // Draw landmarks on external canvas
  const drawLandmarks = useCallback((landmarks) => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scale factors based on video vs canvas size
    const video = videoRef?.current;
    if (!video) return;
    
    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;
    
    // Save context for mirrored drawing to match video
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    // Draw eye landmarks in green
    ctx.fillStyle = '#00ff00';
    [...leftEyeIndices, ...rightEyeIndices].forEach(i => {
      if (landmarks[i]) {
        const [x, y] = landmarks[i];
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        ctx.beginPath();
        ctx.arc(scaledX, scaledY, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Draw mouth landmarks in cyan
    ctx.fillStyle = '#00ffff';
    mouthIndices.forEach(i => {
      if (landmarks[i]) {
        const [x, y] = landmarks[i];
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        ctx.beginPath();
        ctx.arc(scaledX, scaledY, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Draw lip corners in yellow
    ctx.fillStyle = '#ffff00';
    lipCornerIndices.forEach(i => {
      if (landmarks[i]) {
        const [x, y] = landmarks[i];
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        ctx.beginPath();
        ctx.arc(scaledX, scaledY, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    ctx.restore();
  }, [canvasRef, videoRef, leftEyeIndices, rightEyeIndices, mouthIndices, lipCornerIndices]);

  // Analyze smile from facial landmarks
  const analyzeSmile = useCallback((landmarks) => {
    try {
      const leftCorner = landmarks[61];
      const rightCorner = landmarks[291];
      const upperLipCenter = landmarks[13];
      const lowerLipCenter = landmarks[14];
      
      if (!leftCorner || !rightCorner || !upperLipCenter || !lowerLipCenter) {
        return false;
      }
      
      // Calculate mouth width
      const mouthWidth = Math.sqrt(
        Math.pow(rightCorner[0] - leftCorner[0], 2) + 
        Math.pow(rightCorner[1] - leftCorner[1], 2)
      );
      
      // Calculate mouth height
      const mouthHeight = Math.sqrt(
        Math.pow(upperLipCenter[0] - lowerLipCenter[0], 2) + 
        Math.pow(upperLipCenter[1] - lowerLipCenter[1], 2)
      );
      
      // Calculate smile ratio and corner elevation
      const smileRatio = mouthWidth / mouthHeight;
      const mouthCenterY = (upperLipCenter[1] + lowerLipCenter[1]) / 2;
      const cornerElevation = mouthCenterY - ((leftCorner[1] + rightCorner[1]) / 2);
      
      return smileRatio > 3.2 && cornerElevation > 2;
    } catch (err) {
      DevHelpers.error('Error analyzing smile:', err);
      return false;
    }
  }, []);

  // Analyze eye contact from facial landmarks
  const analyzeEyeContact = useCallback((landmarks) => {
    try {
      const leftEye = landmarks[33];
      const rightEye = landmarks[362];
      
      if (!leftEye || !rightEye) {
        return { isLooking: false, gazeStatus: 'Eyes not detected' };
      }
      
      const video = videoRef?.current;
      if (!video) return { isLooking: false, gazeStatus: 'Video not ready' };
      
      const centerX = (leftEye[0] + rightEye[0]) / 2;
      const centerY = (leftEye[1] + rightEye[1]) / 2;
      const videoCenter = { x: video.videoWidth / 2, y: video.videoHeight / 2 };
      const distance = Math.sqrt((centerX - videoCenter.x) ** 2 + (centerY - videoCenter.y) ** 2);
      
      const isLooking = distance < 100;
      const gazeStatus = isLooking ? 'Camera' : 'Away';
      
      return { isLooking, gazeStatus };
    } catch (err) {
      DevHelpers.error('Error analyzing eye contact:', err);
      return { isLooking: false, gazeStatus: 'Analysis error' };
    }
  }, [videoRef]);

  // FIXED: Update metrics and notify parent component
  const updateMetrics = useCallback((eyeContactResult, isSmiling) => {
    const current = metricsRef.current;
    
    if (eyeContactResult.isLooking) current.eyeContactFrames++;
    if (isSmiling) current.smileFrames++;
    current.totalFrames++;
    
    const eyeContactPercentage = current.totalFrames > 0 
      ? Math.round((current.eyeContactFrames / current.totalFrames) * 100)
      : 0;
    
    const smilePercentage = current.totalFrames > 0
      ? Math.round((current.smileFrames / current.totalFrames) * 100)
      : 0;
    
    const elapsed = Math.floor((Date.now() - current.startTime) / 1000);
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
      smileFrames: current.smileFrames
    };
    
    // Enhanced logging for debugging
    if (current.totalFrames % 30 === 0) { // Log every 30 frames
      console.log('👁️ EyeTrackingAnalyzer metrics update:', {
        newMetrics,
        currentState: current,
        hasCallback: !!onMetricsUpdate,
        callbackType: typeof onMetricsUpdate
      });
    }
    
    // Update local state for display
    setMetrics(newMetrics);
    
    // ✅ CRITICAL FIX: Always notify parent component of metrics update
    if (onMetricsUpdate && typeof onMetricsUpdate === 'function') {
      console.log('✅ Calling onMetricsUpdate with:', newMetrics);
      onMetricsUpdate(newMetrics);
    } else {
      console.warn('❌ onMetricsUpdate callback is missing or not a function:', {
        onMetricsUpdate,
        type: typeof onMetricsUpdate
      });
    }
  }, [onMetricsUpdate]);

  // Main detection loop
  const detectFaces = useCallback(async () => {
    if (!modelRef.current || !isActive || !videoRef?.current) {
      return;
    }
    
    try {
      const video = videoRef.current;
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        
        const predictions = await modelRef.current.estimateFaces(video);
        
        if (predictions.length > 0) {
          const landmarks = predictions[0].scaledMesh;
          drawLandmarks(landmarks);
          
          const eyeContactResult = analyzeEyeContact(landmarks);
          const isSmiling = analyzeSmile(landmarks);
          
          updateMetrics(eyeContactResult, isSmiling);
        } else {
          // No face detected
          const canvas = canvasRef?.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          
          updateMetrics({ isLooking: false, gazeStatus: 'No face detected' }, false);
        }
      }
    } catch (err) {
      DevHelpers.error('Error in face detection:', err);
      updateMetrics({ isLooking: false, gazeStatus: 'Detection error' }, false);
    }
    
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
    }
  }, [isActive, videoRef, canvasRef, drawLandmarks, analyzeEyeContact, analyzeSmile, updateMetrics]);

  // Start/stop detection based on isActive prop
  useEffect(() => {
    if (isActive && modelLoaded) {
      DevHelpers.log('🎯 Starting eye tracking detection...');
      detectFaces();
    } else {
      if (animationFrameRef.current) {
        DevHelpers.log('⏹️ Stopping eye tracking detection...');
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, modelLoaded, detectFaces]);

  // Load model on mount
  useEffect(() => {
    loadModel();
  }, [loadModel]);

  // Reset metrics when starting new session
  const resetMetrics = useCallback(() => {
    console.log('🔄 EyeTrackingAnalyzer resetMetrics called');
    metricsRef.current = {
      eyeContactFrames: 0,
      smileFrames: 0,
      totalFrames: 0,
      startTime: Date.now()
    };
    setMetrics({
      eyeContactPercentage: 0,
      smilePercentage: 0,
      gazeStatus: 'Initializing',
      sessionTime: '00:00'
    });
    
    // ✅ Also notify parent of reset
    if (onMetricsUpdate && typeof onMetricsUpdate === 'function') {
      onMetricsUpdate({
        eyeContactPercentage: 0,
        smilePercentage: 0,
        gazeStatus: 'Initializing',
        sessionTime: '00:00',
        totalFrames: 0,
        eyeContactFrames: 0,
        smileFrames: 0
      });
    }
  }, [onMetricsUpdate]);

  // DEBUG: Log when component receives new props
  useEffect(() => {
    console.log('👁️ EyeTrackingAnalyzer props changed:', {
      isActive,
      hasVideoRef: !!videoRef?.current,
      hasCanvasRef: !!canvasRef?.current,
      hasCallback: !!onMetricsUpdate,
      callbackType: typeof onMetricsUpdate
    });
  }, [isActive, videoRef, canvasRef, onMetricsUpdate]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Camera': return '#00ff00';
      case 'Away': return '#ff4444';
      case 'No face detected': return '#ff0000';
      default: return '#ffffff';
    }
  };

  const getPercentageColor = (percentage, type) => {
    if (type === 'eyeContact') {
      return percentage >= 70 ? '#00ff00' : percentage >= 50 ? '#ffaa00' : '#ff4444';
    } else if (type === 'smile') {
      return percentage >= 60 ? '#00ff00' : percentage >= 30 ? '#ffaa00' : '#ff4444';
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
            Eye Contact Analysis
          </h4>
          <div className="eye-tracking-status-text">
            Status: {modelLoaded ? 'Active' : 'Loading...'}
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
        </div>
      </div>
    </div>
  );
});

EyeTrackingAnalyzer.displayName = 'EyeTrackingAnalyzer';

export default EyeTrackingAnalyzer;