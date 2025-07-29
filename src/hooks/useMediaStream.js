/**
 * MERGED Media Stream Hook
 * Keeps main's flow but adds support for setup page flow
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { DevHelpers } from '../config/devConfig';
import { MediaStreamUtils, ErrorHandler } from '../utils/interviewUtils';
import { AUDIO_CONSTRAINTS } from '../constants/interviewConstants';

export const useMediaStream = () => {
  const [mediaStream, setMediaStream] = useState(null);
  const [permissionState, setPermissionState] = useState('requesting');
  const [permissionError, setPermissionError] = useState('');
  const [hasVideo, setHasVideo] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  
  const videoRef = useRef();
  const mediaStreamRef = useRef(null);

  const setupVideo = useCallback((stream) => {
    DevHelpers.log('setupVideo called with:', { stream, videoRef: videoRef.current });
    
    // Just check if we have video tracks and set the hasVideo flag
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      DevHelpers.log('Video tracks found, setting hasVideo to true');
      setHasVideo(true);
      setIsAudioOnly(false);
      return true;
    } else {
      DevHelpers.log('No video tracks found, setting audio-only mode');
      setHasVideo(false);
      setIsAudioOnly(true);
      return false;
    }
  }, []);

  // Effect to set up video when stream is available
  useEffect(() => {
    if (mediaStreamRef.current && videoRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      DevHelpers.log('Video tracks available:', {
        count: videoTracks.length,
        track: videoTracks[0]
      });
      
      if (videoTracks.length > 0) {
        DevHelpers.log('Setting up video element with existing stream');
        setupVideo(mediaStreamRef.current);
      } else {
        DevHelpers.log('No video tracks in stream, setting audio-only mode');
        setIsAudioOnly(true);
        setHasVideo(false);
      }
    }
  }, [mediaStreamRef.current, setupVideo]);

  const startCapture = useCallback(async () => {
    try {
      DevHelpers.log('Starting media capture...');
      setPermissionState('requesting');
      setPermissionError('');
      
      // Stop any existing stream first
      if (mediaStreamRef.current) {
        MediaStreamUtils.stopTracks(mediaStreamRef.current);
        mediaStreamRef.current = null;
      }
      
      // Try with video first
      let stream = null;
      try {
        stream = await MediaStreamUtils.getUserMedia({
          video: {
            width: { min: 480, ideal: 1280, max: 1920 },
            height: { min: 360, ideal: 720, max: 1080 },
            frameRate: { min: 15, ideal: 30, max: 60 }
          },
          audio: AUDIO_CONSTRAINTS
        });
        
        DevHelpers.log('Video + Audio stream obtained successfully');
        setupVideo(stream);
      } catch (videoError) {
        DevHelpers.warn('Video capture failed, trying audio only:', videoError);
        
        // Fallback to audio only
        try {
          stream = await MediaStreamUtils.getUserMedia({
            audio: AUDIO_CONSTRAINTS
          });
          
          DevHelpers.log('Audio-only stream obtained successfully');
          setIsAudioOnly(true);
          setHasVideo(false);
        } catch (audioError) {
          throw new Error('Failed to access both video and audio');
        }
      }
      
      mediaStreamRef.current = stream;
      setMediaStream(stream);
      setPermissionState('granted');
      DevHelpers.log('Media capture setup complete');
      
      return stream;
    } catch (error) {
      DevHelpers.error('Media capture error:', error);
      setPermissionState('denied');
      setPermissionError(error.message);
      throw error;
    }
  }, [setupVideo]);

  const stopCapture = useCallback(() => {
    if (mediaStreamRef.current) {
      MediaStreamUtils.stopTracks(mediaStreamRef.current);
      mediaStreamRef.current = null;
      setMediaStream(null);
      setHasVideo(false);
      setIsAudioOnly(false);
      DevHelpers.log('Media capture stopped');
    }
  }, []);

  const retryCapture = useCallback(() => {
    setPermissionState('requesting');
    setPermissionError('');
    return startCapture();
  }, [startCapture]);

  const resetState = useCallback(() => {
    setPermissionState('requesting');
    setPermissionError('');
    setHasVideo(false);
    setIsAudioOnly(false);
  }, []);

  return {
    // State
    mediaStream,
    permissionState,
    permissionError,
    hasVideo,
    isAudioOnly,
    videoRef,
    
    // Actions
    startCapture,
    stopCapture,
    retryCapture,
    resetState
  };
};