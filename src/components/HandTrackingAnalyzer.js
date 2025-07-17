/*
NEEDS TO BE FIXED:
- still slow on CPU - webGL not working
- scaling and benchmarks need to be adapted to new canvas size
- iod display functionality

*/

import React, { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/hand-pose-detection';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

const W = 400, H = 300;
const TRAIL_LEN = 45;
const COLORS = ['yellow', 'orange'];
const MOVE_EPS = 2;
const ANGLE_THR = 1.0;
const CALIBRATION_TIME = 1000;
const HEAD_CIRCLE_RADIUS = 30;
const IOD_RATIO_THRESHOLD = 0.6;
const HEAD_CIRCLE_CENTER_X = W / 2;
const HEAD_CIRCLE_CENTER_Y = H / 3;

const TOO_LITTLE = m => m.speed < 130;
const TOO_MUCH = m => m.speed > 150;

const HandTrackingAnalyzer = React.memo(({ videoRef, canvasRef, isActive, onMetricsUpdate }) => {
  const rafRef = useRef();
  const trails = useRef([[], []]);
  const showOverlay = useRef(true);
  const iodRef = useRef(null);
  const baselineIOD = useRef(null);
  const faceGoodRef = useRef(false);
  const lastEyeLine = useRef(null);
  const lastTimeRef = useRef(0);
  const lastPositionsRef = useRef([null, null]);
  const lastVectorsRef = useRef([null, null]);
  const erraticCountRef = useRef([0, 0]);
  const totalDistanceRef = useRef([0, 0]);
  const handVisibleTimeRef = useRef([0, 0]);
  const handAssignments = useRef([null, null]);
  const lastFeedbackRef = useRef('');
  const feedbackStableCountRef = useRef(0);
  const [calibrated, setCalibrated] = useState(false);
  const calibrationTimerRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) { 
        console.log("Video or canvas reference is not set");
        return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Ensure overlay styling
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10';

    // Get video element's display dimensions
    const getVideoDisplaySize = () => {
      const rect = video.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height
      };
    };

    // Resize canvas to match video display size
    const resizeCanvas = () => {
      const displaySize = getVideoDisplaySize();
      if (displaySize.width > 0 && displaySize.height > 0) {
        canvas.width = displaySize.width;
        canvas.height = displaySize.height;
      }
    };

    // Initial resize and periodic check
    resizeCanvas();
    const resizeInterval = setInterval(resizeCanvas, 500);

    let handDetector, faceDetector;

    const setup = async () => {
      const ctx = canvas.getContext('2d');
      
      // Wait for video to have both actual dimensions and display dimensions
      const waitForVideo = () => {
        return new Promise((resolve) => {
          const checkVideo = () => {
            const displaySize = getVideoDisplaySize();
            if (video.videoWidth > 0 && video.videoHeight > 0 && 
                displaySize.width > 0 && displaySize.height > 0 && 
                video.readyState >= 2) {
              resizeCanvas();
              resolve();
            } else {
              setTimeout(checkVideo, 100);
            }
          };
          checkVideo();
        });
      };

      await waitForVideo();

      // Try CPU backend first to avoid WebGL issues
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        console.log("Using CPU backend:", tf.getBackend());
      } catch (error) {
        console.error("Backend initialization failed:", error);
        throw error;
      }

      // Test TensorFlow with a simple operation
      const testTensor = tf.tensor([1, 2, 3, 4]);
      const testResult = testTensor.add(1);
      testTensor.dispose();
      testResult.dispose();

      handDetector = await handpose.createDetector(handpose.SupportedModels.MediaPipeHands, {
        runtime: 'tfjs',
        modelType: 'lite',
        maxHands: 2,
        detectorModelUrl: undefined,
        landmarkModelUrl: undefined
      });

      faceDetector = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
        runtime: 'tfjs',
        modelType:'lite',
        refineLandmarks: true,
        maxFaces: 1
      });

      console.log("Models loaded successfully");

      let countdown = 5;
      calibrationTimerRef.current = setInterval(() => {
        countdown--;
        if (countdown === 0) {
          clearInterval(calibrationTimerRef.current);
          setCalibrated(true);
          baselineIOD.current = iodRef.current;
          handVisibleTimeRef.current = [0, 0];
          totalDistanceRef.current = [0, 0];
          erraticCountRef.current = [0, 0];
          lastPositionsRef.current = [null, null];
          lastVectorsRef.current = [null, null];
          lastTimeRef.current = performance.now();
        }
      }, 1000);

      const loop = async () => {
        if (!isActive) { return; }
        if (!canvas || !video) return;
        
        const ctx = canvas.getContext('2d');

        // Enhanced video readiness check
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0 || video.paused || video.ended) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        // Check if canvas needs resizing based on video display size
        const displaySize = getVideoDisplaySize();
        if (displaySize.width !== canvas.width || displaySize.height !== canvas.height) {
          resizeCanvas();
        }

        // Calculate scaling factors for coordinate conversion
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;

        const now = performance.now();
        const delta = now - lastTimeRef.current;
        lastTimeRef.current = now;

        // Create a new canvas from video frame to ensure proper format
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, 0, 0);

        const [hands, faces] = await Promise.all([
          handDetector.estimateHands(tempCanvas),
          faceDetector.estimateFaces(tempCanvas)
        ]);

        // Validate keypoints
        hands.forEach((hand, index) => {
          if (hand.keypoints && hand.keypoints.length > 0) {
            const nanKeypoints = hand.keypoints.filter(kpt => isNaN(kpt.x) || isNaN(kpt.y));
            if (nanKeypoints.length > 0) {
              console.error(`Hand ${index} has ${nanKeypoints.length}/${hand.keypoints.length} NaN keypoints`);
            }
          }
        });

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (faces.length > 0) {
            console.log(`Detected ${faces.length} face(s)`);
            const k = faces[0].keypoints;
            const l = k.find(p => p.name === 'leftEye');
            const r = k.find(p => p.name === 'rightEye');
            if (l && r) {
                const iod = Math.hypot(l.x - r.x, l.y - r.y);
                iodRef.current = iod;
                lastEyeLine.current = { lx: l.x, ly: l.y, rx: r.x, ry: r.y };

                const centerX = (l.x + r.x) / 2;
                const centerY = (l.y + r.y) / 2;
                const dx = centerX - HEAD_CIRCLE_CENTER_X;
                const dy = centerY - HEAD_CIRCLE_CENTER_Y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const iodLimit = (HEAD_CIRCLE_RADIUS * 2) * IOD_RATIO_THRESHOLD;
                faceGoodRef.current = iod < iodLimit && dist < HEAD_CIRCLE_RADIUS * 0.8;
            }
            }

            // Overlay drawing
            if (showOverlay.current) {
            ctx.save();
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = faceGoodRef.current ? 'green' : 'red';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(HEAD_CIRCLE_CENTER_X, HEAD_CIRCLE_CENTER_Y, HEAD_CIRCLE_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            }

            // Draw IOD line on top (separate block to ensure priority)
            if (showOverlay.current && lastEyeLine.current) {
            const { lx, ly, rx, ry } = lastEyeLine.current;
            ctx.save();

            // Flip canvas if video is mirrored (most webcams are)
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);

            ctx.beginPath();
            ctx.strokeStyle = 'cyan';
            ctx.lineWidth = 6; // THICK for testing
            ctx.moveTo(lx, ly);
            ctx.lineTo(rx, ry);
            ctx.stroke();

            ctx.restore();
            }


        const iodScale = iodRef.current && baselineIOD.current ? iodRef.current / baselineIOD.current : 1.0;
        const seen = [false, false];
        const metrics = [{ speed: 0, err: 0 }, { speed: 0, err: 0 }];

        for (const h of hands) {
          const kpts = h.keypoints;
          
          // Validate keypoints before processing
          if (!kpts || kpts.length < 13) {
            console.warn("Insufficient keypoints, skipping hand");
            continue;
          }

          // Check if the specific keypoints we need exist and are valid
          if (!kpts[8] || !kpts[9] || !kpts[12] || 
              isNaN(kpts[8].x) || isNaN(kpts[8].y) ||
              isNaN(kpts[9].x) || isNaN(kpts[9].y) ||
              isNaN(kpts[12].x) || isNaN(kpts[12].y)) {
            console.warn("Required keypoints (8,9,12) are invalid");
            continue;
          }
          
          // Scale keypoints to match canvas display size
          const x = ((kpts[8].x + kpts[9].x + kpts[12].x) / 3) * scaleX;
          const y = ((kpts[8].y + kpts[9].y + kpts[12].y) / 3) * scaleY;

          let handIndex = x < canvas.width / 2 ? 0 : 1;
          seen[handIndex] = true;
          handVisibleTimeRef.current[handIndex] += delta;

          const tr = trails.current[handIndex];
          tr.push({ x, y });
          if (tr.length > TRAIL_LEN) tr.shift();

          if (lastPositionsRef.current[handIndex]) {
            const dx = x - lastPositionsRef.current[handIndex].x;
            const dy = y - lastPositionsRef.current[handIndex].y;
            const dist = Math.hypot(dx, dy);
            if (dist >= MOVE_EPS) {
              const normDist = dist / iodScale;
              totalDistanceRef.current[handIndex] += normDist;
              
              if (lastVectorsRef.current[handIndex]) {
                const lastDx = lastVectorsRef.current[handIndex].dx;
                const lastDy = lastVectorsRef.current[handIndex].dy;
                const curAngle = Math.atan2(dy, dx);
                const lastAngle = Math.atan2(lastDy, lastDx);
                let dA = Math.abs(curAngle - lastAngle);
                if (dA > Math.PI) dA = 2 * Math.PI - dA;
                if (dA > ANGLE_THR) erraticCountRef.current[handIndex]++;
              }
              lastVectorsRef.current[handIndex] = { dx, dy };
            }
          }
          lastPositionsRef.current[handIndex] = { x, y };

          if (showOverlay.current) {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            kpts.forEach(pt => {
              if (!isNaN(pt.x) && !isNaN(pt.y)) {
                ctx.beginPath();
                ctx.arc(pt.x * scaleX, pt.y * scaleY, 4, 0, 2 * Math.PI);
                ctx.fillStyle = 'lime';
                ctx.fill();
              }
            });
            ctx.strokeStyle = COLORS[handIndex];
            ctx.beginPath();
            tr.forEach((p, j) => j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
          }

          const visibleTime = handVisibleTimeRef.current[handIndex] / 1000;
          const speed = visibleTime > 0 ? totalDistanceRef.current[handIndex] / visibleTime : 0;
          const err = visibleTime > 0 ? erraticCountRef.current[handIndex] / visibleTime : 0;
          metrics[handIndex] = { speed, err };
        }

        let fb = '';
        if (seen[0]) {
          if (TOO_LITTLE(metrics[0])) fb = 'Too little – gesture more';
          else if (TOO_MUCH(metrics[0])) fb = 'Too much – slow down';
          else fb = 'Just right';
        } else {
          fb = 'No hands detected';
        }

        if (fb === lastFeedbackRef.current) feedbackStableCountRef.current++;
        else {
          feedbackStableCountRef.current = 0;
          lastFeedbackRef.current = fb;
        }
        console.log('🤲 DEBUG: Hand tracking frame data:', {
          feedback: fb,
          lastFeedback: lastFeedbackRef.current,
          stableCount: feedbackStableCountRef.current,
          handsDetected: seen,
          hasCallback: !!onMetricsUpdate,
          callbackType: typeof onMetricsUpdate
        });

        if (feedbackStableCountRef.current >= 1) {
        console.log('🚀 CALLING onMetricsUpdate with data');
        onMetricsUpdate({
          handMetrics: metrics.map((m, i) => ({
            hand: i === 0 ? 'Right Hand' : 'Left Hand',
            speed: m.speed,
            err: m.err
          })),
          feedback: fb
        });
        console.log('✅ onMetricsUpdate call completed');
      }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    };

    setup();

    return () => {
      rafRef.current && cancelAnimationFrame(rafRef.current);
      clearInterval(calibrationTimerRef.current);
      clearInterval(resizeInterval);
    };
  }, [isActive, videoRef, canvasRef, onMetricsUpdate]);

  return null;
});

HandTrackingAnalyzer.displayName = 'HandTrackingAnalyzer';

export default HandTrackingAnalyzer;