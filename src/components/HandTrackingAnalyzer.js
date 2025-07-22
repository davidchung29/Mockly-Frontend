/**
 * Fixed Hand Tracking Analyzer - Proper MediaPipe Integration
 * Key fixes: Correct MediaPipe setup, proper event handling, and reliable data flow
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DevHelpers } from '../config/devConfig';

const HandTrackingAnalyzer = React.memo(({ 
  videoRef, 
  canvasRef,
  isActive, 
  onMetricsUpdate,
  className = '' 
}) => {
  const handsRef = useRef();
  const animationFrameRef = useRef();
  const cameraRef = useRef();
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

  // Hand landmark indices (MediaPipe Hands provides 21 landmarks per hand)
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

  // ✅ CRITICAL FIX: Proper MediaPipe Hands initialization
  const loadModel = useCallback(async () => {
    try {
      // Check if MediaPipe is available
      if (!window.Hands) {
        throw new Error('MediaPipe Hands not loaded. Please ensure MediaPipe scripts are included.');
      }
      
      // Check if Camera is available (may not be needed for manual processing)
      if (!window.Camera) {
        console.warn('MediaPipe Camera not available, using manual processing');
      }
      
      DevHelpers.log('🤲 Initializing MediaPipe Hands...');

      // Create Hands instance with proper configuration
      const hands = new window.Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      // Configure hand detection settings
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0, // Use fastest model for real-time
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      // ✅ CRITICAL: Set up results callback BEFORE starting detection
      hands.onResults((results) => {
        handleHandResults(results);
      });

      handsRef.current = hands;

      // ✅ ALTERNATIVE: Use manual frame processing instead of Camera API
      if (window.Camera && videoRef?.current) {
        console.log('🎥 MediaPipe Camera API available, setting up camera...');
        // Use Camera API if available - but with better error handling
        try {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (handsRef.current && isActive && videoRef.current) {
                const video = videoRef.current;
                if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                  await handsRef.current.send({ image: video });
                }
              }
            },
            width: 640,
            height: 480
          });
          cameraRef.current = camera;
          console.log('✅ MediaPipe Camera initialized successfully');
        } catch (cameraError) {
          console.warn('⚠️ Camera API failed, will use manual processing:', cameraError);
          cameraRef.current = null;
        }
      } else {
        console.log('📹 Using manual frame processing (Camera API not available)');
      }
      
      setModelLoaded(true);
      DevHelpers.log('✅ MediaPipe Hands model loaded successfully');

    } catch (err) {
      DevHelpers.error('❌ Failed to load MediaPipe Hands model:', err);
      setError(`Failed to load hand tracking model: ${err.message}`);
    }
  }, [videoRef, isActive]);

  // ✅ FIXED: Proper results handler
  const handleHandResults = useCallback((results) => {
    if (!results || !isActive) return;

    try {
      drawLandmarks(results);
      
      const now = performance.now();
      const deltaTime = now - metricsRef.current.lastFrameTime;
      metricsRef.current.lastFrameTime = now;
      
      analyzeHandMovement(results, deltaTime);
    } catch (error) {
      console.error('Error handling hand results:', error);
    }
  }, [isActive]);

  // Draw landmarks on canvas
  const drawLandmarks = useCallback((results) => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const video = videoRef?.current;
    if (!video) return;
    
    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;
    
    // Save context for mirrored drawing
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    if (results.multiHandLandmarks) {
      results.multiHandLandmarks.forEach((landmarks, handIndex) => {
        const color = handIndex === 0 ? '#00ff00' : '#ff8c00';
        
        // Draw hand landmarks
        ctx.fillStyle = color;
        landmarks.forEach((landmark, i) => {
          const x = landmark.x * video.videoWidth * scaleX;
          const y = landmark.y * video.videoHeight * scaleY;
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw key connections
          if (i === HAND_LANDMARKS.WRIST) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            [HAND_LANDMARKS.THUMB_TIP, HAND_LANDMARKS.INDEX_FINGER_TIP, 
             HAND_LANDMARKS.MIDDLE_FINGER_TIP, HAND_LANDMARKS.RING_FINGER_TIP, 
             HAND_LANDMARKS.PINKY_TIP].forEach(tipIndex => {
              const tip = landmarks[tipIndex];
              if (tip) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(tip.x * video.videoWidth * scaleX, tip.y * video.videoHeight * scaleY);
                ctx.stroke();
              }
            });
          }
        });
      });
    }
    
    ctx.restore();
  }, [canvasRef, videoRef]);

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
        
        const canvas = canvasRef?.current;
        const video = videoRef?.current;
        if (!canvas || !video) return;
        
        // Get hand center from key landmarks
        const wrist = landmarks[HAND_LANDMARKS.WRIST];
        const indexTip = landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP];
        const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP];
        
        if (!wrist || !indexTip || !middleTip) return;
        
        // Calculate hand center
        const centerX = (wrist.x + indexTip.x + middleTip.x) / 3;
        const centerY = (wrist.y + indexTip.y + middleTip.y) / 3;
        
        // Convert to canvas coordinates
        const x = centerX * video.videoWidth * (canvas.width / video.videoWidth);
        const y = centerY * video.videoHeight * (canvas.height / video.videoHeight);
        
        // Calculate movement metrics
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
        
        // Calculate speed and error rate
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
    
    // Generate feedback
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
    
    // Update metrics
    const newMetrics = {
      handMetrics: handMetrics.filter(Boolean),
      feedback,
      hasEverDetectedHands: current.hasEverDetectedHands,
      currentlyDetecting: hasActiveHands,
      sessionDuration: Math.round((Date.now() - current.startTime) / 1000),
      totalFrames: current.totalFrames++
    };
    
    setMetrics(newMetrics);
    
    // ✅ CRITICAL: Send metrics to parent
    if (onMetricsUpdate && typeof onMetricsUpdate === 'function') {
      console.log('🤲 Sending hand metrics update:', newMetrics);
      onMetricsUpdate(newMetrics);
    }
    
  }, [canvasRef, videoRef, onMetricsUpdate]);

  // ✅ FIXED: Manual detection loop with proper video validation
  const detectHands = useCallback(async () => {
    if (!handsRef.current || !isActive || !videoRef?.current) {
      return;
    }
    
    try {
      const video = videoRef.current;
      
      // ✅ CRITICAL: Ensure video is fully ready and has dimensions
      if (video.readyState >= 2 && 
          video.videoWidth > 0 && 
          video.videoHeight > 0 && 
          !video.paused && 
          !video.ended) {
        
        // Process hands manually if Camera API not available
        if (!cameraRef.current) {
          // Create canvas to convert video frame to ImageData
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Send ImageData to MediaPipe
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          await handsRef.current.send({ image: imageData });
        }
      }
    } catch (err) {
      DevHelpers.error('Error in hand detection:', err);
    }
    
    if (isActive && !cameraRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
    }
  }, [isActive, videoRef]);

  // ✅ FIXED: Start camera OR manual detection when active
  const startCamera = useCallback(async () => {
    if (!videoRef?.current) {
      console.error('❌ Video element not available for hand tracking');
      return;
    }

    const video = videoRef.current;
    
    // Wait for video to be ready
    const waitForVideo = () => {
      return new Promise((resolve) => {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          resolve();
        } else {
          const checkVideo = () => {
            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
              resolve();
            } else {
              setTimeout(checkVideo, 100);
            }
          };
          checkVideo();
        }
      });
    };

    try {
      await waitForVideo();
      console.log('✅ Video ready for hand tracking:', {
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState
      });

      if (cameraRef.current && isActive) {
        await cameraRef.current.start();
        console.log('✅ Hand tracking camera started');
      } else if (isActive && handsRef.current) {
        // Fallback to manual detection
        console.log('✅ Starting manual hand detection');
        detectHands();
      }
    } catch (error) {
      console.error('❌ Failed to start hand tracking:', error);
    }
  }, [isActive, detectHands, videoRef]);

  // ✅ FIXED: Stop camera OR manual detection when inactive
  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
        console.log('⏹️ Hand tracking camera stopped');
      } catch (error) {
        console.error('❌ Failed to stop hand tracking camera:', error);
      }
    }
    
    // Stop manual detection
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      console.log('⏹️ Manual hand detection stopped');
    }
  }, []);

  // Start/stop detection based on isActive prop
  useEffect(() => {
    if (isActive && modelLoaded) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isActive, modelLoaded, startCamera, stopCamera]);

  // Load model on mount
  useEffect(() => {
    if (videoRef?.current) {
      loadModel();
    }
  }, [videoRef, loadModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, [stopCamera]);

  // Reset metrics function
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

  // Get status colors for display
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
            Status: {modelLoaded ? 'Active' : 'Loading...'}
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