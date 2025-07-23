import { useState, useRef, useCallback, useEffect } from 'react';
import { DevHelpers } from '../config/devConfig';
import { MediaStreamUtils, ErrorHandler } from '../utils/interviewUtils';
import { AUDIO_CONSTRAINTS } from '../constants/interviewConstants';

export const useMediaStream = (presetStream = null) => {
  const [mediaStream, setMediaStream] = useState(presetStream);
  const [permissionState, setPermissionState] = useState(presetStream ? 'granted' : 'requesting');
  const [permissionError, setPermissionError] = useState('');
  const [hasVideo, setHasVideo] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const videoRef = useRef();
  const mediaStreamRef = useRef(presetStream);

  const setupVideo = useCallback((stream) => {
    DevHelpers.log('setupVideo called with:', { stream, videoRef: videoRef.current });
    
    // ✅ CRITICAL FIX: Set up video element immediately if available
    if (videoRef.current && stream) {
      try {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        
        videoRef.current.onloadedmetadata = () => {
          DevHelpers.log('✅ Video metadata loaded for preset stream:', {
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight,
            readyState: videoRef.current.readyState
          });
        };
        
        videoRef.current.play().catch(error => {
          DevHelpers.error('Error starting video playback:', error);
        });
      } catch (error) {
        DevHelpers.error('Error setting up video element:', error);
      }
    }
    
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

  // ✅ ENHANCED: Initialize with preset stream immediately
  useEffect(() => {
    if (presetStream) {
      console.log('🎬 Initializing with preset stream from LoadingScreen');
      mediaStreamRef.current = presetStream;
      setMediaStream(presetStream);
      setPermissionState('granted');
      
      // Check video tracks and set states immediately
      const videoTracks = presetStream.getVideoTracks();
      if (videoTracks.length > 0) {
        console.log('✅ Preset stream has video tracks, setting hasVideo=true');
        setHasVideo(true);
        setIsAudioOnly(false);
      } else {
        console.log('⚠️ Preset stream has no video tracks, setting audio-only');
        setHasVideo(false);
        setIsAudioOnly(true);
      }
    }
  }, [presetStream]);

  // ✅ ENHANCED: Setup video element when videoRef becomes available
  useEffect(() => {
    if (mediaStreamRef.current && videoRef.current) {
      const stream = mediaStreamRef.current;
      const video = videoRef.current;
      
      DevHelpers.log('🎥 Setting up video element with stream:', {
        hasStream: !!stream,
        hasVideo: !!video,
        videoTracks: stream?.getVideoTracks()?.length || 0
      });

      if (stream.getVideoTracks().length > 0) {
        try {
          video.srcObject = stream;
          video.muted = true;
          video.autoplay = true;
          video.playsInline = true;
          
          video.onloadedmetadata = () => {
            DevHelpers.log('✅ Video element ready:', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              readyState: video.readyState
            });
          };
          
          video.play().catch(error => {
            DevHelpers.error('Error playing video:', error);
          });
          
          setHasVideo(true);
          setIsAudioOnly(false);
        } catch (error) {
          DevHelpers.error('Error setting up video element:', error);
        }
      } else {
        DevHelpers.log('No video tracks in stream, setting audio-only mode');
        setIsAudioOnly(true);
        setHasVideo(false);
      }
    }
  }, [videoRef.current, mediaStreamRef.current]);

  const startCapture = useCallback(async () => {
    // ✅ ENHANCED: If we have a preset stream from LoadingScreen, use it
    if (presetStream && !mediaStreamRef.current) {
      console.log('✅ Using preset MediaStream from LoadingScreen');
      mediaStreamRef.current = presetStream;
      setMediaStream(presetStream);
      setPermissionState('granted');
      setupVideo(presetStream);
      return presetStream;
    }

    // ✅ If we already have the preset stream set up, just return it
    if (presetStream && mediaStreamRef.current === presetStream) {
      console.log('✅ Preset stream already active');
      return presetStream;
    }

    try {
      DevHelpers.log('Starting media capture...');
      setPermissionState('requesting');
      setPermissionError('');

      if (mediaStreamRef.current && mediaStreamRef.current !== presetStream) {
        MediaStreamUtils.stopTracks(mediaStreamRef.current);
        mediaStreamRef.current = null;
      }

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
  }, [presetStream, setupVideo]);

  const stopCapture = useCallback(() => {
    if (mediaStreamRef.current && !presetStream) {
      MediaStreamUtils.stopTracks(mediaStreamRef.current);
      mediaStreamRef.current = null;
      setMediaStream(null);
      setHasVideo(false);
      setIsAudioOnly(false);
      DevHelpers.log('Media capture stopped');
    }
  }, [presetStream]);

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
    mediaStream,
    permissionState,
    permissionError,
    hasVideo,
    isAudioOnly,
    videoRef,
    startCapture,
    stopCapture,
    retryCapture,
    resetState
  };
};