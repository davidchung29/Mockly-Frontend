import React, { useEffect, useRef, useState, useCallback } from 'react';
import SelectedQuestionDisplay from './SelectedQuestionDisplay';

const LoadingScreen = ({ onDone, selectedQuestion }) => {
  const [permissionStatus, setPermissionStatus] = useState('pending');
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [mediaStream, setMediaStream] = useState(null);

  // Face detection state
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceInPosition, setFaceInPosition] = useState(false);
  const [faceModel, setFaceModel] = useState(null);
  const [faceMessage, setFaceMessage] = useState('Initializing...');

  const animationFrameRef = useRef();

  // Load FaceMesh model for face detection
  const loadFaceModel = useCallback(async () => {
    try {
      if (!window.facemesh) {
        console.warn('FaceMesh library not available');
        return;
      }
      const model = await window.facemesh.load();
      setFaceModel(model);
      console.log('✅ FaceMesh model loaded for setup screen');
    } catch (err) {
      console.warn('Failed to load FaceMesh for setup screen:', err);
    }
  }, []);

  // Face detection and positioning analysis
  const detectFacePosition = useCallback(async () => {
    if (!faceModel || !videoRef.current || !canvasRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState >= 2) {
        const predictions = await faceModel.estimateFaces(video);

        if (predictions.length > 0) {
          setFaceDetected(true);

          // Get face landmarks
          const landmarks = predictions[0].scaledMesh;

          // Calculate face center (using nose tip and between eyes)
          const noseTip = landmarks[1]; // Nose tip landmark
          const leftEye = landmarks[33];
          const rightEye = landmarks[362];

          if (noseTip && leftEye && rightEye) {
            const faceCenterX = (leftEye[0] + rightEye[0]) / 2;
            const faceCenterY = (leftEye[1] + rightEye[1] + noseTip[1]) / 3;

            // Calculate video center
            const videoCenterX = video.videoWidth / 2;
            const videoCenterY = video.videoHeight / 2;

            // Calculate distance from center
            const distance = Math.sqrt(
              Math.pow(faceCenterX - videoCenterX, 2) + 
              Math.pow(faceCenterY - videoCenterY, 2)
            );

            // Check if face is in the center circle (adjust threshold as needed)
            const threshold = 80; // pixels
            const inPosition = distance < threshold;

            setFaceInPosition(inPosition);

            if (inPosition) {
              setFaceMessage('Perfect! You\'re positioned correctly');
            } else {
              // Determine direction to guide user
              const deltaX = faceCenterX - videoCenterX;
              const deltaY = faceCenterY - videoCenterY;

              let direction = '';
              if (Math.abs(deltaX) > Math.abs(deltaY)) {
                direction = deltaX > 0 ? 'Move a bit to the right' : 'Move a bit to the left';
              } else {
                direction = deltaY > 0 ? 'Move up slightly' : 'Move down slightly';
              }

              setFaceMessage(direction);
            }
          }
        } else {
          setFaceDetected(false);
          setFaceInPosition(false);
          setFaceMessage('Please position your face in the circle');
        }
      }
    } catch (err) {
      console.error('Face detection error:', err);
      setFaceMessage('Face detection active');
    }

    if (permissionStatus === 'granted') {
      animationFrameRef.current = requestAnimationFrame(detectFacePosition);
    }
  }, [faceModel, permissionStatus]);

  // Start face detection when video is ready
  useEffect(() => {
    if (faceModel && mediaStream && permissionStatus === 'granted') {
      detectFacePosition();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [faceModel, mediaStream, permissionStatus, detectFacePosition]);

  useEffect(() => {
    let active = true;
    async function requestMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user'
          }, 
          audio: true 
        });
        if (!active) return;
        setMediaStream(stream);
        setPermissionStatus('granted');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera/microphone access denied:', err);
        setError('Camera and microphone access is required for the interview.');
        setPermissionStatus('denied');
      }
    }
    requestMedia();
    loadFaceModel();

    return () => {
      active = false;
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [loadFaceModel]);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  const handleDone = () => {
    if (permissionStatus === 'granted' && typeof onDone === 'function') {
      onDone(mediaStream);
    }
  };

  const handleRetry = async () => {
    setError('');
    setPermissionStatus('pending');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      setMediaStream(stream);
      setPermissionStatus('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Retry failed:', err);
      setError('Camera and microphone access is still required.');
      setPermissionStatus('denied');
    }
  };

  const circleClassName = `setup-screen__guidance-circle ${faceInPosition ? 'setup-screen__guidance-circle--ok' : 'setup-screen__guidance-circle--warn'}`;

 return (
  <div className="setup-screen" style={{ 
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    margin: '0',
    padding: '0'
  }}>
    <div className="card card--processing" style={{ 
      maxHeight: '85vh', 
      maxWidth: '90vw',
      width: '600px',
      padding: '20px',
      overflow: 'auto',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <div className="setup-screen__content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 className="setup-screen__title" style={{ margin: '0 0 8px 0', textAlign: 'center' }}>Interview Setup</h2>
        <p className="setup-screen__subtitle" style={{ margin: '0 0 12px 0', textAlign: 'center', fontSize: '14px', lineHeight: '1.4' }}>
          We need access to your camera and microphone for the interview. Position yourself in the circle below.
        </p>

        {selectedQuestion && (
          <SelectedQuestionDisplay 
            questionId={selectedQuestion} 
            variant="minimal" 
            className="setup-screen__question"
            style={{ 
              background: '#f8fafc', 
              borderRadius: '8px', 
              padding: '12px 16px', 
              borderLeft: '3px solid #3BA676', 
              fontSize: '14px', 
              lineHeight: '1.4',
              margin: '0 0 12px 0'
            }}
          />
        )}

        <div className="setup-screen__video-container" style={{ 
          position: 'relative', 
          maxWidth: '400px', 
          height: '300px', 
          margin: '0 auto 12px auto',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="setup-screen__video"
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              display: 'block'
            }}
          />

          <div className={circleClassName} aria-hidden="true" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '160px',
            height: '160px',
            border: `3px solid ${faceInPosition ? '#3BA676' : '#f59e0b'}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#3BA676'
          }}>
            {faceInPosition && <span className="setup-screen__check">✓</span>}
          </div>

          {permissionStatus === 'pending' && (
            <div className="setup-screen__overlay" role="status" aria-live="polite" style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px'
            }}>
              <div className="setup-screen__spinner" style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '12px'
              }} />
              <div className="setup-screen__overlay-text">Requesting camera access...</div>
            </div>
          )}

          {permissionStatus === 'denied' && (
            <div className="setup-screen__overlay setup-screen__overlay--error" role="alert" style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'rgba(239, 68, 68, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              textAlign: 'center',
              padding: '20px'
            }}>
              <div className="setup-screen__overlay-icon" style={{ fontSize: '32px', marginBottom: '12px' }}>📷</div>
              <div className="setup-screen__overlay-title" style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Camera access denied</div>
              <div className="setup-screen__overlay-text" style={{ fontSize: '14px' }}>Please allow camera and microphone access to continue</div>
            </div>
          )}

          <canvas ref={canvasRef} className="setup-screen__canvas" width={640} height={480} style={{ display: 'none' }} />
        </div>

        {permissionStatus === 'granted' && (
          <div className={`setup-screen__feedback ${faceInPosition ? 'setup-screen__feedback--ok' : 'setup-screen__feedback--warn'}`} 
               aria-live="polite" 
               style={{ 
                 textAlign: 'center', 
                 padding: '8px 12px', 
                 borderRadius: '6px',
                 fontSize: '14px',
                 background: faceInPosition ? '#ecfdf5' : '#fef3c7',
                 color: faceInPosition ? '#065f46' : '#92400e',
                 border: `1px solid ${faceInPosition ? '#d1fae5' : '#fde68a'}`
               }}>
            {faceDetected ? (
              <span>
                {faceInPosition ? '✅ ' : '👤 '}
                {faceMessage}
              </span>
            ) : (
              <span>👤 {faceMessage}</span>
            )}
          </div>
        )}

        <div className="setup-screen__actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
          {permissionStatus === 'denied' && (
            <button className="button" onClick={handleRetry} style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: '#6b7280',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}>Try Again</button>
          )}

          <button
            className={`button ${permissionStatus !== 'granted' ? 'button--disabled' : ''}`}
            disabled={permissionStatus !== 'granted'}
            onClick={handleDone}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              background: permissionStatus === 'granted' ? '#3BA676' : '#94a3b8',
              color: 'white',
              cursor: permissionStatus === 'granted' ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            {permissionStatus === 'granted' ? 'Start Interview' : 'Waiting for Access'}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

export default LoadingScreen;