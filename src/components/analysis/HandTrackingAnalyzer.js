import React, { useRef, useEffect, useState, useCallback } from 'react';

const HandTrackingAnalyzer = React.memo(({ videoRef, isActive, onMetricsUpdate, className = '' }) => {
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
    lastFrameTime: performance.now(),
    lastUpdateTime: Date.now()
  });
  const [metrics, setMetrics] = useState({
    handMetrics: [],
    feedback: 'Initializing',
    hasEverDetectedHands: false,
    currentlyDetecting: false,
    sessionDuration: 0
  });
  const [modelLoaded, setModelLoaded] = useState(false);

  const HAND_LANDMARKS = {
    WRIST: 0, THUMB_TIP: 4, INDEX_FINGER_TIP: 8, MIDDLE_FINGER_TIP: 12
  };
  const MOVE_EPS = 1.5;
  const ANGLE_THR = 0.8;
  const TOO_LITTLE = m => m.speed < 100;
  const TOO_MUCH = m => m.speed > 200;

  // Analyze MediaPipe results
  const analyzeHandMovement = useCallback((results, deltaTime) => {
    const current = metricsRef.current;
    const handMetrics = [];
    let hasActiveHands = false;
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      current.hasEverDetectedHands = true;
      hasActiveHands = true;
      results.multiHandLandmarks.forEach((landmarks, handIndex) => {
        if (handIndex >= 2) return;
        current.handVisibleTime[handIndex] += deltaTime;
        const wrist = landmarks[HAND_LANDMARKS.WRIST];
        const indexTip = landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP];
        const middleTip = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP];
        if (!wrist || !indexTip || !middleTip) return;
        const centerX = (wrist.x + indexTip.x + middleTip.x) / 3;
        const centerY = (wrist.y + indexTip.y + middleTip.y) / 3;
        const video = videoRef?.current;
        const scaleX = video ? video.videoWidth : 640;
        const scaleY = video ? video.videoHeight : 480;
        const x = centerX * scaleX;
        const y = centerY * scaleY;
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
        const errorRate = visibleTime > 0 ? current.erraticCount[handIndex] / visibleTime : 0;
        const handLabel = results.multiHandedness &&
          results.multiHandedness[handIndex]
          ? results.multiHandedness[handIndex].label
          : (handIndex === 0 ? 'Right' : 'Left');
        handMetrics[handIndex] = {
          hand: `${handLabel} Hand`,
          speed: Math.max(0, Math.round(speed)),
          err: Math.max(0, Math.round(errorRate * 100) / 100),
          visibleTime: Math.round(visibleTime * 10) / 10,
          totalDistance: Math.round(current.totalDistance[handIndex]),
          position: { x: centerX, y: centerY }
        };
      });
    }
    let feedback = 'No hands detected';
    if (current.hasEverDetectedHands && !hasActiveHands) {
      feedback = 'Hands were detected but not currently visible';
    } else if (handMetrics.length > 0) {
      const primaryHand = handMetrics[0];
      if (TOO_LITTLE(primaryHand)) feedback = 'Too little – gesture more';
      else if (TOO_MUCH(primaryHand)) feedback = 'Too much – slow down';
      else feedback = 'Just right';
    }
    const sessionDuration = Math.round((Date.now() - current.startTime) / 1000);
    const newMetrics = {
      handMetrics: handMetrics.filter(Boolean),
      feedback,
      hasEverDetectedHands: current.hasEverDetectedHands,
      currentlyDetecting: hasActiveHands,
      sessionDuration,
      totalFrames: current.totalFrames++
    };
    setMetrics(newMetrics);
    const now = Date.now();
    if (now - current.lastUpdateTime > 500) {
      current.lastUpdateTime = now;
      if (onMetricsUpdate) onMetricsUpdate(newMetrics);
    }
  }, [onMetricsUpdate, videoRef]);

  // Handle MediaPipe Hands results
  const handleHandResults = useCallback((results) => {
    const now = performance.now();
    const deltaTime = now - metricsRef.current.lastFrameTime;
    metricsRef.current.lastFrameTime = now;
    analyzeHandMovement(results, deltaTime);
  }, [analyzeHandMovement]);

  // Load MediaPipe Hands model
  const loadModel = useCallback(async () => {
    if (!window.Hands) throw new Error('MediaPipe Hands not found. Include CDN before your bundle.');
    const hands = new window.Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });
    hands.onResults(handleHandResults);
    handsRef.current = hands;
    setModelLoaded(true);
  }, [handleHandResults]);

  const detectHands = useCallback(async () => {
    if (!handsRef.current || !isActive || !videoRef?.current || !modelLoaded) return;
    const video = videoRef.current;
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !video.paused && !video.ended) {
      await handsRef.current.send({ image: video });
    }
    if (isActive && modelLoaded) {
      animationFrameRef.current = setTimeout(() => { requestAnimationFrame(detectHands); }, 100);
    }
  }, [isActive, videoRef, modelLoaded]);

  useEffect(() => { loadModel(); return () => { if (handsRef.current) handsRef.current.close(); }; }, [loadModel]);
  useEffect(() => {
    if (isActive && modelLoaded && videoRef?.current) detectHands();
    else if (animationFrameRef.current) clearTimeout(animationFrameRef.current);
    return () => { if (animationFrameRef.current) clearTimeout(animationFrameRef.current); };
  }, [isActive, modelLoaded, detectHands, videoRef]);

  // Reset function if needed
  useEffect(() => {
    window.handTrackingReset = () => {
      metricsRef.current = {
        handVisibleTime: [0, 0],
        totalDistance: [0, 0],
        erraticCount: [0, 0],
        startTime: Date.now(),
        lastPositions: [null, null],
        lastVectors: [null, null],
        totalFrames: 0,
        hasEverDetectedHands: false,
        lastFrameTime: performance.now(), lastUpdateTime: Date.now()
      };
      setMetrics({
        handMetrics: [],
        feedback: 'Initializing',
        hasEverDetectedHands: false,
        currentlyDetecting: false,
        sessionDuration: 0, totalFrames: 0
      });
      if (onMetricsUpdate) onMetricsUpdate({
        handMetrics: [], feedback: 'Initializing',
        hasEverDetectedHands: false, currentlyDetecting: false,
        sessionDuration: 0, totalFrames: 0
      });
    };
    return () => { delete window.handTrackingReset; };
  }, [onMetricsUpdate]);
  return null;
});

HandTrackingAnalyzer.displayName = 'HandTrackingAnalyzer';
export default HandTrackingAnalyzer;
