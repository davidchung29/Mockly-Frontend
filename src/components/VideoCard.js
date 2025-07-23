/**
 * FIXED Video Card Component
 * Properly handles preset MediaStream from loading screen
 */

import React, { useEffect, useRef } from 'react';
import { DevHelpers } from '../config/devConfig';

const VideoCard = React.memo(({ 
  hasVideo, 
  isAudioOnly, 
  isExpanded, 
  onToggle, 
  videoRef, 
  mediaStream, 
  presetMediaStream,
  eyeTrackingCanvasRef, 
  handTrackingCanvasRef 
}) => {
  const interviewerVideoRef = useRef();

  useEffect(() => {
    DevHelpers.log('VideoCard props:', {
      hasVideo,
      isAudioOnly,
      isExpanded,
      videoRef: videoRef?.current,
      videoRefExists: !!videoRef?.current,
      mediaStream: !!mediaStream,
      presetMediaStream: !!presetMediaStream
    });
  }, [hasVideo, isAudioOnly, isExpanded, videoRef, mediaStream, presetMediaStream]);

  // ✅ ENHANCED: Properly setup video elements with preset or regular stream
  useEffect(() => {
    const streamToUse = presetMediaStream || mediaStream;
    
    if (streamToUse && hasVideo) {
      console.log('🎥 Setting up video elements with stream:', {
        isPreset: !!presetMediaStream,
        hasVideoTracks: streamToUse.getVideoTracks().length > 0,
        streamId: streamToUse.id
      });

      // Setup main video element
      if (videoRef?.current) {
        const videoElement = videoRef.current;
        try {
          console.log('🎥 Setting up main video element...');
          videoElement.srcObject = streamToUse;
          videoElement.muted = true;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          
          videoElement.onloadedmetadata = () => {
            console.log('✅ Main video metadata loaded:', {
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              readyState: videoElement.readyState
            });
          };
          
          videoElement.oncanplay = () => {
            console.log('✅ Main video can play');
          };
          
          videoElement.onplaying = () => {
            console.log('✅ Main video is playing');
          };
          
          videoElement.play().catch(error => {
            DevHelpers.error('Error starting main video playback:', error);
          });
        } catch (error) {
          DevHelpers.error('Error setting up main video element:', error);
        }
      }

      // Setup interviewer video element
      if (interviewerVideoRef?.current) {
        const interviewerVideoElement = interviewerVideoRef.current;
        try {
          console.log('🎥 Setting up interviewer video element...');
          interviewerVideoElement.srcObject = streamToUse;
          interviewerVideoElement.muted = true;
          interviewerVideoElement.autoplay = true;
          interviewerVideoElement.playsInline = true;
          
          interviewerVideoElement.onloadedmetadata = () => {
            console.log('✅ Interviewer video metadata loaded:', {
              videoWidth: interviewerVideoElement.videoWidth,
              videoHeight: interviewerVideoElement.videoHeight,
              readyState: interviewerVideoElement.readyState
            });
          };
          
          interviewerVideoElement.oncanplay = () => {
            console.log('✅ Interviewer video can play');
          };
          
          interviewerVideoElement.onplaying = () => {
            console.log('✅ Interviewer video is playing');
          };
          
          interviewerVideoElement.play().catch(error => {
            DevHelpers.error('Error starting interviewer video playback:', error);
          });
        } catch (error) {
          DevHelpers.error('Error setting up interviewer video element:', error);
        }
      }
    }
  }, [presetMediaStream, mediaStream, videoRef, hasVideo]);

  // ✅ ENHANCED: Canvas setup for eye tracking
  useEffect(() => {
    if (eyeTrackingCanvasRef?.current && interviewerVideoRef?.current) {
      const canvas = eyeTrackingCanvasRef.current;
      const video = interviewerVideoRef.current;

      const updateCanvasSize = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.offsetWidth;
          canvas.height = video.offsetHeight;
          console.log('✅ Eye canvas sized to match interviewer video:', {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight
          });
        }
      };

      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(video);

      video.addEventListener('loadedmetadata', updateCanvasSize);
      video.addEventListener('canplay', updateCanvasSize);
      video.addEventListener('playing', updateCanvasSize);

      // Update immediately if video is ready
      if (video.readyState >= 2) {
        updateCanvasSize();
      }

      return () => {
        resizeObserver.disconnect();
        video.removeEventListener('loadedmetadata', updateCanvasSize);
        video.removeEventListener('canplay', updateCanvasSize);
        video.removeEventListener('playing', updateCanvasSize);
      };
    }
  }, [eyeTrackingCanvasRef, hasVideo]);

  // ✅ ENHANCED: Canvas setup for hand tracking
  useEffect(() => {
    if (handTrackingCanvasRef?.current && interviewerVideoRef?.current) {
      const canvas = handTrackingCanvasRef.current;
      const video = interviewerVideoRef.current;

      const updateCanvasSize = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.offsetWidth;
          canvas.height = video.offsetHeight;
          console.log('✅ Hand canvas sized to match interviewer video:', {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight
          });
        }
      };

      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(video);

      video.addEventListener('loadedmetadata', updateCanvasSize);
      video.addEventListener('canplay', updateCanvasSize);
      video.addEventListener('playing', updateCanvasSize);

      // Update immediately if video is ready
      if (video.readyState >= 2) {
        updateCanvasSize();
      }

      return () => {
        resizeObserver.disconnect();
        video.removeEventListener('loadedmetadata', updateCanvasSize);
        video.removeEventListener('canplay', updateCanvasSize);
        video.removeEventListener('playing', updateCanvasSize);
      };
    }
  }, [handTrackingCanvasRef, hasVideo]);

  const renderMainVideo = () => {
    if (hasVideo) {
      return (
        <div className="video-card__video-container">
          <div className="video-card__video-label">
            <i className="fas fa-video icon-sm"></i>
            Your Video
            {presetMediaStream && (
              <small style={{ marginLeft: '8px', color: '#10b981' }}>
                (Using preset stream)
              </small>
            )}
          </div>
          <div className="video-card__video-box">
            <video 
              ref={videoRef}
              className="video-card__video-element"
              autoPlay 
              playsInline 
              muted
              style={{ backgroundColor: '#000' }}
            />
          </div>
        </div>
      );
    }
    if (isAudioOnly) {
      return (
        <div className="video-card__video-container">
          <div className="video-card__video-label">
            <i className="fas fa-microphone icon-sm"></i>
            Audio Only
          </div>
          <div className="video-card__video-box video-card__video-box--placeholder">
            <div className="video-card__audio-only-placeholder">
              <i className="fas fa-microphone video-card__audio-only-icon"></i>
              <div className="video-card__audio-only-text">
                <h4>Audio Only Mode</h4>
                <p>Your microphone is active</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="video-card__video-container">
        <div className="video-card__video-label">
          <i className="fas fa-video icon-sm"></i>
          Video
        </div>
        <div className="video-card__video-box video-card__video-box--placeholder">
          <div className="video-card__placeholder">
            <i className="fas fa-video video-card__placeholder-icon"></i>
            <div className="video-card__placeholder-text">
              <span>No video feed</span>
              <small>Setting up camera...</small>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInterviewerView = () => {
    if (!isExpanded) return null;
    if (hasVideo) {
      return (
        <div className="video-card__video-container">
          <div className="video-card__video-label">
            <i className="fas fa-user icon-sm"></i>
            Interviewer View
            <small style={{ marginLeft: '8px', opacity: 0.7 }}>with Eye + Hand Tracking</small>
            {presetMediaStream && (
              <small style={{ marginLeft: '8px', color: '#10b981' }}>
                (Preset)
              </small>
            )}
          </div>
          <div className="video-card__video-box video-card__interviewer-view" style={{ position: 'relative' }}>
            <video 
              ref={interviewerVideoRef}
              className="video-card__video-element video-card__interviewer-video"
              autoPlay 
              playsInline 
              muted
              style={{ backgroundColor: '#000', zIndex: 9 }}
            />
            <canvas 
              ref={eyeTrackingCanvasRef}
              className="video-card__landmark-canvas"
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10,
                background: 'transparent'
              }}
            />
            <canvas
              ref={handTrackingCanvasRef}
              className="video-card__landmark-canvas"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 11,
                backgroundColor: 'transparent'
              }}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="video-card__video-container">
        <div className="video-card__video-label">
          <i className="fas fa-user icon-sm"></i>
          Interviewer View
        </div>
        <div className="video-card__video-box video-card__video-box--placeholder">
          <div className="video-card__placeholder">
            <i className="fas fa-user video-card__placeholder-icon"></i>
            <div className="video-card__placeholder-text">
              <span>Interviewer</span>
              <small>No video available</small>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderScreenShare = () => {
    if (!isExpanded) return null;
    return (
      <div className="video-card__video-container">
        <div className="video-card__video-label">
          <i className="fas fa-desktop icon-sm"></i>
          Screen Share
        </div>
        <div className="video-card__video-box video-card__video-box--placeholder">
          <div className="video-card__placeholder">
            <i className="fas fa-desktop video-card__placeholder-icon"></i>
            <div className="video-card__placeholder-text">
              <span>Screen Share</span>
              <small>Not active</small>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`video-card ${isExpanded ? 'video-card--expanded' : ''}`}>
      <div className="video-card__header">
        <h3 className="video-card__title">
          <i className="fas fa-video icon-sm"></i>
          Video Feed
          {presetMediaStream && (
            <span style={{ fontSize: '12px', color: '#10b981', marginLeft: '8px' }}>
              [Preset Stream]
            </span>
          )}
        </h3>
        <button 
          className="video-card__toggle"
          onClick={onToggle}
          aria-label={isExpanded ? 'Collapse video' : 'Expand video'}
        >
          <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} video-card__arrow`}></i>
        </button>
      </div>
      <div className="video-card__content">
        {renderMainVideo()}
        {renderInterviewerView()}
        {renderScreenShare()}
      </div>
    </div>
  );
});

VideoCard.displayName = 'VideoCard';

export default VideoCard;