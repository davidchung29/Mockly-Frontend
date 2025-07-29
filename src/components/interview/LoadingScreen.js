import React, { useEffect, useRef, useState, useCallback } from 'react';

const LoadingScreen = ({ onDone }) => {
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
                direction = deltaX > 0 ? 'Move a bit to the left' : 'Move a bit to the right';
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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh', 
      background: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#2d3748'
    }}>
      {/* Mockly Logo/Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#48bb78',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'white'
        }}>
          M
        </div>
        <h1 style={{ 
          fontSize: '2.5rem', 
          margin: 0,
          color: '#48bb78',
          fontWeight: '600'
        }}>
          Mockly
        </h1>
      </div>
      
      <h2 style={{
        fontSize: '1.8rem',
        marginBottom: '1rem',
        textAlign: 'center',
        color: '#2d3748',
        fontWeight: '500'
      }}>
        Interview Setup
      </h2>
      
      <p style={{ 
        fontSize: '1.1rem', 
        marginBottom: '2rem', 
        textAlign: 'center',
        maxWidth: '600px',
        lineHeight: '1.6',
        color: '#4a5568'
      }}>
        We need access to your camera and microphone for the interview. 
        Position yourself in the green circle below.
      </p>

      {/* Video Preview Container */}
      <div style={{ 
        position: 'relative', 
        width: 480, 
        height: 360,
        marginBottom: '1rem',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(72, 187, 120, 0.15)',
        border: '3px solid #48bb78'
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            background: '#000',
            transform: 'scaleX(-1)'
          }}
        />
        
        {/* Face position guidance circle */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 150,
          height: 150,
          background: faceInPosition ? 'rgba(72, 187, 120, 0.2)' : 'rgba(72, 187, 120, 0.1)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          border: `3px solid ${faceInPosition ? '#48bb78' : '#68d391'}`,
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {faceInPosition && (
            <div style={{
              fontSize: '2rem',
              color: '#48bb78'
            }}>
              ✓
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {permissionStatus === 'pending' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            color: 'white'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                border: '4px solid #333',
                borderTop: '4px solid #48bb78',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }} />
              Requesting camera access...
            </div>
          </div>
        )}

        {/* Error overlay */}
        {permissionStatus === 'denied' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
              <div style={{ color: '#e53e3e', marginBottom: '1rem' }}>
                Camera access denied
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, color: 'white' }}>
                Please allow camera and microphone access to continue
              </div>
            </div>
          </div>
        )}

        {/* Hidden canvas for face detection */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
          width={640}
          height={480}
        />
      </div>

      {/* Face positioning feedback */}
      {permissionStatus === 'granted' && (
        <div style={{
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontSize: '1rem',
          padding: '12px 24px',
          borderRadius: '8px',
          backgroundColor: faceInPosition ? '#f0fff4' : '#fffdf7',
          border: `2px solid ${faceInPosition ? '#48bb78' : '#ed8936'}`,
          color: faceInPosition ? '#2f855a' : '#c05621',
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '400px'
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

      {/* Status Message */}
      <div style={{ 
        marginBottom: '2rem', 
        textAlign: 'center',
        fontSize: '1.1rem',
        minHeight: '2rem'
      }}>
        {permissionStatus === 'pending' && (
          <span style={{ color: '#48bb78' }}>
            Requesting camera and microphone access...
          </span>
        )}
        {permissionStatus === 'granted' && (
          <span style={{ color: '#48bb78' }}>
            ✅ Camera and microphone ready!
          </span>
        )}
        {permissionStatus === 'denied' && (
          <span style={{ color: '#e53e3e' }}>
            ❌ Permission denied. Please allow access to continue.
          </span>
        )}
        {error && (
          <div style={{ color: '#e53e3e', marginTop: '0.5rem', fontSize: '0.95rem' }}>
            {error}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        {permissionStatus === 'denied' && (
          <button
            style={{
              padding: '12px 24px',
              fontSize: '1.1rem',
              background: '#a0aec0',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#718096'}
            onMouseOut={(e) => e.target.style.background = '#a0aec0'}
            onClick={handleRetry}
          >
            Try Again
          </button>
        )}
        
        <button
          style={{
            padding: '12px 36px',
            fontSize: '1.1rem',
            background: permissionStatus === 'granted' ? '#48bb78' : '#a0aec0',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: permissionStatus === 'granted' ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            opacity: permissionStatus === 'granted' ? 1 : 0.6,
            fontWeight: '500'
          }}
          disabled={permissionStatus !== 'granted'}
          onMouseOver={(e) => {
            if (permissionStatus === 'granted') {
              e.target.style.background = '#38a169';
            }
          }}
          onMouseOut={(e) => {
            if (permissionStatus === 'granted') {
              e.target.style.background = '#48bb78';
            }
          }}
          onClick={handleDone}
        >
          {permissionStatus === 'granted' ? 'Start Interview' : 'Waiting for Access'}
        </button>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
