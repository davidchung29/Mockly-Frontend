/**
 * Hand Tracking Analyzer - Background Processing Only
 * MERGED VERSION - No visual overlays, proper MediaPipe integration
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DevHelpers } from '../../config/devConfig';

const HandTrackingAnalyzer = React.memo(({ 
  videoRef, 
  isActive, 
  onMetricsUpdate,
  className = '' 
}) => {
  const handsRef = useRef();
  const animationFrameRef = useRef();
  const metricsRef = useRef({
    handVisibleTime: [0, 0],
    totalDistance: [0, 0],
    erraticCount: [0, 0],
    startTime: Date.now(),
    lastPositions: [null, null],
    lastVectors: [null, null],
    totalFrames: 0,
    hasEverDetectedHands: false,
    lastFrameTime: performance.now()
  });

  const [metrics, setMetrics] = useState({
    handMetrics: [],
    feedback: 'Initializing',
    hasEverDetectedHands: false,
    currentlyDetecting: false
  });

  const [modelLoaded, setModelLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Hand landmark indices
  const HAND_LANDMARKS = {
    WRIST: 0,
    THUMB_TIP: 4,
    INDEX_FINGER_TIP: 8,
    MIDDLE_FINGER_TIP: 12,
    RING_FINGER_TIP: 16,
    PINKY_TIP: 20
  };

  // Movement thresholds
  const MOVE_EPS = 2;
  const ANGLE_THR = 1.0;
  const TOO_LITTLE = m => m.speed < 130;
  const TOO_MUCH = m => m.speed > 150;

  // Results handler with proper binding
  const handleHandResults = useCallback((results) => {
    console.log('🤲 handleHandResults called:', {
      hasResults: !!results,
      hasMultiHandLandmarks: !!(results?.multiHandLandmarks),
      landmarkCount: results?.multiHandLandmarks?.length || 0,
      isActive
    });

    if (!results || !isActive) {
      return;
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      console.log('🤲 MediaPipe detected hands:', results.multiHandLandmarks.length);
    }

    try {
      const now = performance.now();
      const deltaTime = now - metricsRef.current.lastFrameTime;
      metricsRef.current.lastFrameTime = now;
      
      analyzeHandMovement(results, deltaTime);
    } catch (error) {
      console.error('Error handling hand results:', error);
    }
  }, [isActive]);

  // Analyze hand movement
  const analyzeHandMovement = useCallback((results, deltaTime) => {
    const current = metricsRef.current;
    const handMetrics = [];
    const seen = [false, false];
    let hasActiveHands = false;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      current.hasEverDetectedHands = true;
      hasActiveHands = true;
      
      results.multiHandLandmarks.forEach((landmarks, handIndex) => {
        seen[handIndex] = true;
        current.handVisibleTime[handIndex] += deltaTime;
        
        const wrist = landmarks[HAND_LANDMARKS.WRIST];
        const indexTip = landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP];
        const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP];
        
        if (!wrist || !indexTip || !middleTip) return;
        
        const centerX = (wrist.x + indexTip.x + middleTip.x) / 3;
        const centerY = (wrist.y + indexTip.y + middleTip.y) / 3;
        
        // Use normalized coordinates (0-1) for analysis
        const x = centerX * 640; // Scale to reference resolution
        const y = centerY * 480;
        
        if (current.lastPositions[handIndex]) {
          const dx = x - current.lastPositions[handIndex].x;
          const dy = y - current.lastPositions[handIndex].y;
          const dist = Math.hypot(dx, dy);
          
          if (dist >= MOVE_EPS) {
            current.totalDistance[handIndex] += dist;
            
            if (current.lastVectors[handIndex]) {
              const lastDx = current.lastVectors[handIndex].dx;
              const lastDy = current.lastVectors[handIndex].dy;
              const curAngle = Math.atan2(dy, dx);
              const lastAngle = Math.atan2(lastDy, lastDx);
              let dA = Math.abs(curAngle - lastAngle);
              if (dA > Math.PI) dA = 2 * Math.PI - dA;
              if (dA > ANGLE_THR) current.erraticCount[handIndex]++;
            }
            current.lastVectors[handIndex] = { dx, dy };
          }
        }
        current.lastPositions[handIndex] = { x, y };
        
        const visibleTime = current.handVisibleTime[handIndex] / 1000;
        const speed = visibleTime > 0 ? current.totalDistance[handIndex] / visibleTime : 0;
        const err = visibleTime > 0 ? current.erraticCount[handIndex] / visibleTime : 0;
        
        handMetrics[handIndex] = {
          hand: handIndex === 0 ? 'Right Hand' : 'Left Hand',
          speed: Math.max(0, Math.round(speed)),
          err: Math.max(0, Math.round(err * 100) / 100),
          visibleTime: Math.round(visibleTime * 10) / 10,
          totalDistance: Math.round(current.totalDistance[handIndex])
        };
      });
    }
    
    let feedback = 'No hands detected';
    if (current.hasEverDetectedHands && !hasActiveHands) {
      feedback = 'Hands were detected but not currently visible';
    } else if (seen[0] && handMetrics[0]) {
      if (TOO_LITTLE(handMetrics[0])) {
        feedback = 'Too little – gesture more';
      } else if (TOO_MUCH(handMetrics[0])) {
        feedback = 'Too much – slow down';
      } else {
        feedback = 'Just right';
      }
    }
    
    const newMetrics = {
      handMetrics: handMetrics.filter(Boolean),
      feedback,
      hasEverDetectedHands: current.hasEverDetectedHands,
      currentlyDetecting: hasActiveHands,
      sessionDuration: Math.round((Date.now() - current.startTime) / 1000),
      totalFrames: current.totalFrames++
    };
    
    setMetrics(newMetrics);
    
    if (onMetricsUpdate && typeof onMetricsUpdate === 'function') {
      onMetricsUpdate(newMetrics);
    }
    
  }, [onMetricsUpdate]);

  // MediaPipe initialization with proper callback binding
  const loadModel = useCallback(async () => {
    try {
      if (!window.Hands) {
        throw new Error('MediaPipe Hands not loaded. Please ensure MediaPipe scripts are included.');
      }
      
      console.log('🤲 Initializing MediaPipe Hands...');

      const hands = new window.Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      // Bind the callback properly
      hands.onResults(handleHandResults);
      
      handsRef.current = hands;
      setModelLoaded(true);
      console.log('✅ MediaPipe Hands model loaded successfully');

    } catch (err) {
      console.error('❌ Failed to load MediaPipe Hands model:', err);
      setError(`Failed to load hand tracking model: ${err.message}`);
    }
  }, [handleHandResults]);

  // Detection loop
  const detectHands = useCallback(async () => {
    if (!handsRef.current || !isActive || !videoRef?.current || !modelLoaded) {
      return;
    }
    
    try {
      const video = videoRef.current;
      
      if (video.readyState >= 2 && 
          video.videoWidth > 0 && 
          video.videoHeight > 0 && 
          !video.paused && 
          !video.ended) {
        
        console.log('📸 Sending frame to MediaPipe...');
        await handsRef.current.send({ image: video });
      }
    } catch (err) {
      console.error('Error in hand detection:', err);
    }
    
    if (isActive && modelLoaded) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
    }
  }, [isActive, videoRef, modelLoaded]);

  // Start detection
  const startDetection = useCallback(async () => {
    if (!videoRef?.current) {
      console.error('❌ Video element not available for hand tracking');
      return;
    }

    console.log('🤲 Starting hand tracking detection...');
    setIsDetecting(true);

    if (isActive && handsRef.current) {
      detectHands();
    }
  }, [isActive, detectHands, videoRef]);

  // Stop detection
  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      console.log('⏹️ Hand detection stopped');
    }
    setIsDetecting(false);
  }, []);

  // Start/stop detection
  useEffect(() => {
    if (isActive && modelLoaded) {
      startDetection();
    } else {
      stopDetection();
    }
  }, [isActive, modelLoaded, startDetection, stopDetection]);

  // Load model on mount
  useEffect(() => {
    if (videoRef?.current) {
      loadModel();
    }
  }, [videoRef, loadModel]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopDetection();
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, [stopDetection]);

  // Reset function
  const resetMetrics = useCallback(() => {
    console.log('🔄 HandTrackingAnalyzer resetMetrics called');
    metricsRef.current = {
      handVisibleTime: [0, 0],
      totalDistance: [0, 0],
      erraticCount: [0, 0],
      startTime: Date.now(),
      lastPositions: [null, null],
      lastVectors: [null, null],
      totalFrames: 0,
      hasEverDetectedHands: false,
      lastFrameTime: performance.now()
    };
    
    const resetData = {
      handMetrics: [],
      feedback: 'Initializing',
      hasEverDetectedHands: false,
      currentlyDetecting: false,
      sessionDuration: 0,
      totalFrames: 0
    };
    
    setMetrics(resetData);
    
    if (onMetricsUpdate && typeof onMetricsUpdate === 'function') {
      onMetricsUpdate(resetData);
    }
  }, [onMetricsUpdate]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Just right': return '#00ff00';
      case 'Too little – gesture more': return '#ff8c00';
      case 'Too much – slow down': return '#ff8c00';
      case 'No hands detected': return '#ff4444';
      case 'Hands were detected but not currently visible': return '#ffa500';
      default: return '#ffffff';
    }
  };

  if (error) {
    return (
      <div className={`hand-tracking-analyzer ${className}`}>
        <div className="hand-tracking-error">
          <i className="fas fa-exclamation-triangle icon-sm icon-error"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`hand-tracking-analyzer ${className}`}>
      <div className="hand-tracking-metrics">
        <div className="hand-tracking-status">
          <h4 className="hand-tracking-title">
            <i className="fas fa-hand-paper icon-sm"></i>
            Hand Tracking Analysis
          </h4>
          <div className="hand-tracking-status-text">
            Status: {modelLoaded && isActive && isDetecting ? 'Active' : 
                    modelLoaded && isActive ? 'Ready' :
                    modelLoaded ? 'Waiting for activation' : 'Loading...'}
            {metrics.hasEverDetectedHands && (
              <span style={{ color: '#00ff00', marginLeft: '8px' }}>
                ✓ Hands Detected
              </span>
            )}
          </div>
        </div>
        
        <div className="hand-tracking-stats">
          {metrics.handMetrics && metrics.handMetrics.length > 0 ? (
            metrics.handMetrics.map((hand, index) => (
              <div key={index} className="hand-tracking-stat">
                <span className="hand-tracking-stat-value">
                  {hand.hand}
                </span>
                <span className="hand-tracking-stat-label">
                  Speed: {hand.speed}px/s | Error: {hand.err}/s
                </span>
              </div>
            ))
          ) : (
            <div className="hand-tracking-stat">
              <span className="hand-tracking-stat-value">
                No Active Hands
              </span>
              <span className="hand-tracking-stat-label">
                {metrics.hasEverDetectedHands ? 'Hands were detected earlier' : 'No hands detected yet'}
              </span>
            </div>
          )}
          
          <div className="hand-tracking-stat">
            <span 
              className="hand-tracking-stat-value"
              style={{ color: getStatusColor(metrics.feedback) }}
            >
              {metrics.feedback}
            </span>
            <span className="hand-tracking-stat-label">Feedback</span>
          </div>
          
          {metrics.sessionDuration > 0 && (
            <div className="hand-tracking-stat">
              <span className="hand-tracking-stat-value">
                {metrics.sessionDuration}s
              </span>
              <span className="hand-tracking-stat-label">Session Time</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

HandTrackingAnalyzer.displayName = 'HandTrackingAnalyzer';

export default HandTrackingAnalyzer;