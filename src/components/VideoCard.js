/**
 * Video Card Component
 * Displays video feed with user video in Interviewer View and landmark overlay
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
      mediaStream: !!mediaStream
    });
  }, [hasVideo, isAudioOnly, isExpanded, videoRef, mediaStream]);

  useEffect(() => {
    if (mediaStream && hasVideo) {
      if (videoRef?.current) {
        const videoElement = videoRef.current;
        try {
          videoElement.srcObject = mediaStream;
          videoElement.muted = true;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.onloadedmetadata = () => {
            DevHelpers.log('Main video metadata loaded');
          };
          videoElement.play().catch(error => {
            DevHelpers.error('Error starting main video playback:', error);
          });
        } catch (error) {
          DevHelpers.error('Error setting up main video element:', error);
        }
      }

      if (interviewerVideoRef?.current) {
        const interviewerVideoElement = interviewerVideoRef.current;
        try {
          interviewerVideoElement.srcObject = mediaStream;
          interviewerVideoElement.muted = true;
          interviewerVideoElement.autoplay = true;
          interviewerVideoElement.playsInline = true;
          interviewerVideoElement.onloadedmetadata = () => {
            DevHelpers.log('Interviewer video metadata loaded');
          };
          interviewerVideoElement.play().catch(error => {
            DevHelpers.error('Error starting interviewer video playback:', error);
          });
        } catch (error) {
          DevHelpers.error('Error setting up interviewer video element:', error);
        }
      }
    }
  }, [mediaStream, videoRef, hasVideo]);

  useEffect(() => {
    if (eyeTrackingCanvasRef?.current && interviewerVideoRef?.current) {
      const canvas = eyeTrackingCanvasRef.current;
      const video = interviewerVideoRef.current;

      const updateCanvasSize = () => {
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;
        DevHelpers.log('Eye canvas sized to match interviewer video:', {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });
      };

      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(video);

      if (video.readyState >= 1) {
        updateCanvasSize();
      } else {
        video.addEventListener('loadedmetadata', updateCanvasSize);
      }

      return () => {
        resizeObserver.disconnect();
        video.removeEventListener('loadedmetadata', updateCanvasSize);
      };
    }
  }, [eyeTrackingCanvasRef, hasVideo]);

  useEffect(() => {
    if (handTrackingCanvasRef?.current && interviewerVideoRef?.current) {
      const canvas = handTrackingCanvasRef.current;
      const video = interviewerVideoRef.current;

      const updateCanvasSize = () => {
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;
        DevHelpers.log('Hand canvas sized to match interviewer video:', {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });
      };

      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(video);

      if (video.readyState >= 1) {
        updateCanvasSize();
      } else {
        video.addEventListener('loadedmetadata', updateCanvasSize);
      }

      return () => {
        resizeObserver.disconnect();
        video.removeEventListener('loadedmetadata', updateCanvasSize);
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
                zIndex: 9999, // ensure highest stacking
                border: '3px dashed red', // 👁️ clearly visible outline
                backgroundColor: 'transparent' // prevent covering video
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