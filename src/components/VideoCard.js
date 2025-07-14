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
  eyeTrackingCanvasRef // New prop for eye tracking canvas
}) => {
  const interviewerVideoRef = useRef(); // Ref for the interviewer view video

  // Debug logging
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

  // Set up both video elements when stream is available
  useEffect(() => {
    if (mediaStream && hasVideo) {
      // Set up main video element
      if (videoRef?.current) {
        const videoElement = videoRef.current;
        
        DevHelpers.log('Setting up main video element with stream');
        
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

      // Set up interviewer view video element
      if (interviewerVideoRef?.current) {
        const interviewerVideoElement = interviewerVideoRef.current;
        
        DevHelpers.log('Setting up interviewer view video element with stream');
        
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

  // Setup canvas overlay for interviewer view
  useEffect(() => {
    if (eyeTrackingCanvasRef?.current && interviewerVideoRef?.current) {
      const canvas = eyeTrackingCanvasRef.current;
      const video = interviewerVideoRef.current;
      
      const updateCanvasSize = () => {
        // Get the actual rendered size of the video element
        const videoRect = video.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(video);
        
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;
        
        DevHelpers.log('Canvas sized to match interviewer video:', {
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          videoOffsetWidth: video.offsetWidth,
          videoOffsetHeight: video.offsetHeight,
          videoVideoWidth: video.videoWidth,
          videoVideoHeight: video.videoHeight
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

  const renderMainVideo = () => {
    DevHelpers.log('Rendering main video:', { hasVideo, isAudioOnly });
    
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
    
    // Show user's video in interviewer view with landmark overlay
    if (hasVideo) {
      return (
        <div className="video-card__video-container">
          <div className="video-card__video-label">
            <i className="fas fa-user icon-sm"></i>
            Interviewer View
            <small style={{ marginLeft: '8px', opacity: 0.7 }}>with Eye Tracking</small>
          </div>
          <div className="video-card__video-box video-card__interviewer-view">
            <video 
              ref={interviewerVideoRef}
              className="video-card__video-element video-card__interviewer-video"
              autoPlay 
              playsInline 
              muted
              style={{ backgroundColor: '#000' }}
            />
            {/* Canvas overlay for facial landmarks */}
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
                zIndex: 10
              }}
            />
          </div>
        </div>
      );
    }
    
    // Fallback for no video
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
        {/* Main video - always shown */}
        {renderMainVideo()}
        
        {/* Interviewer view - now shows user's video with landmarks */}
        {renderInterviewerView()}
        
        {/* Screen share - placeholder */}
        {renderScreenShare()}
      </div>
    </div>
  );
});

VideoCard.displayName = 'VideoCard';

export default VideoCard;