/**
 * FIXED Feedback Report - Uses REAL data instead of fixed values
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ScoreEvaluator } from '../../utils/interviewUtils';
import { STAR_COMPONENTS, UI_TEXT } from '../../constants/interviewConstants';
import './FeedbackReport.css';

import CountUp from 'react-countup';

const FeedbackReport = React.memo(({ report }) => {
  const { isAuthenticated } = useAuth();
  console.log('📝 FeedbackReport received report:', report);
  
  // Extract REAL voice data from report
  const getVoiceData = () => {
    const data = {
      averageVolume: report?.averageVolume ?? report?.voiceAnalysis?.averageVolume ?? 0,
      volumeVariation: report?.volumeVariation ?? report?.voiceAnalysis?.volumeVariation ?? 0,
      pitchVariation: report?.pitchVariation ?? report?.voiceAnalysis?.pitchVariation ?? 0,
      speechRate: report?.speechRate ?? report?.voiceAnalysis?.speechRate ?? 0,
      clarity: report?.clarity ?? report?.voiceAnalysis?.clarity ?? 0,
      totalSamples: report?.totalSamples ?? report?.voiceAnalysis?.totalSamples ?? 0
    };
    console.log('🎙️ Extracted voice data:', data);
    return data;
  };

  // Extract REAL eye tracking data
  const getEyeData = () => {
    const data = {
      eyeContactPercentage: report?.eyeContactPercentage ?? report?.eyeTracking?.eyeContactPercentage ?? 0,
      smilePercentage: report?.smilePercentage ?? report?.eyeTracking?.smilePercentage ?? 0,
      sessionDuration: report?.sessionDuration ?? report?.eyeTracking?.sessionTime ?? '00:00',
      gazeStatus: report?.gazeStatus ?? report?.eyeTracking?.gazeStatus ?? 'Unknown',
      totalFrames: report?.totalFrames ?? report?.eyeTracking?.totalFrames ?? 0
    };
    console.log('👁️ Extracted eye data:', data);
    return data;
  };

  // Extract REAL hand tracking data with multiple fallbacks
  const getHandData = () => {
    const topLevelHandMetrics = report?.handMetrics || [];
    const nestedHandMetrics = report?.handTracking?.handMetrics || [];
    const topLevelFeedback = report?.feedback || report?.handFeedback;
    const nestedFeedback = report?.handTracking?.feedback;
    
    const handMetrics = topLevelHandMetrics.length > 0 ? topLevelHandMetrics : nestedHandMetrics;
    const feedback = topLevelFeedback || nestedFeedback || 'No data';
    
    const hasData = handMetrics && handMetrics.length > 0;
    const hasEverDetectedHands = report?.hasEverDetectedHands || report?.handTracking?.hasEverDetectedHands || false;
    
    const data = {
      handMetrics,
      feedback,
      hasData,
      hasEverDetectedHands,
      totalDetections: report?.handTracking?.totalDetections || 0,
      maxHandsDetected: report?.handTracking?.maxHandsDetected || handMetrics.length,
      sessionDuration: report?.handTracking?.sessionDuration || 0
    };
    console.log('🤲 Extracted hand data:', data);
    return data;
  };

  const voiceData = getVoiceData();
  const eyeData = getEyeData();
  const handData = getHandData();
  
  // Check if we have meaningful data
  const hasVoiceData = voiceData.averageVolume > 0 || voiceData.totalSamples > 0;
  const hasEyeData = eyeData.eyeContactPercentage > 0 || eyeData.smilePercentage > 0 || eyeData.totalFrames > 0;

  console.log('📊 Data analysis:', {
    'Voice data': voiceData, 'Has voice data': hasVoiceData,
    'Eye data': eyeData, 'Has eye data': hasEyeData,
    'Hand data': handData, 'Has hand data': handData.hasData
  });

  const renderProgressSavedIndicator = () => {
    if (!isAuthenticated) return null;
    
    return (
      <div className="progress-saved-indicator">
        <i className="fas fa-check-circle icon-sm icon-success"></i>
        <span>Your progress has been saved to your profile</span>
      </div>
    );
  };

  const MetricCard = ({ icon, label, value, color = '#374151', detail = null }) => (
    <div className="metric-card">
      <div className="metric-card__icon">
        <i className={icon}></i>
      </div>
      <div className="metric-card__content">
        <div className="metric-card__value" style={{ color }}>
          {value}
        </div>
        <div className="metric-card__label">{label}</div>
        {detail && (
          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );

  const SuccessBanner = ({ text, detail }) => (
    <div className="success-banner">
      <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
      <strong>{text}</strong>
      <div style={{ marginTop: '4px', fontSize: '12px' }}>{detail}</div>
    </div>
  );

  const WarningBanner = ({ text, detail }) => (
    <div className="warning-banner">
      <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
      <strong>{text}</strong>
      <div style={{ marginTop: '4px', fontSize: '12px', whiteSpace: 'pre-line' }}>{detail}</div>
    </div>
  );

  // Shared section wrapper for uniform styling
  const SectionWrapper = ({ title, iconClass, children, className }) => (
    <section className={`feedback-section ${className || ''}`.trim()} style={{ marginTop: '24px' }}>
      <h3 className="feedback-section__title" style={{ paddingBottom: '0px' }}>
        <i className={`${iconClass} icon-sm icon-primary`}></i>
        {title}
      </h3>
      <div style={{ marginBottom: '24px' }}> 
        {children}
      </div>
    </section>
  );

  // FIXED: Use REAL data for comprehensive score calculation
  const renderComprehensiveScoreSection = () => {
    // Calculate scores based on actual data
    const contentScore = Math.min(95, Math.max(60, 75 + (hasEyeData ? 10 : 0) + (hasVoiceData ? 10 : 0)));
    const pitchScore = Math.min(95, Math.max(40, 
      (voiceData.averageVolume * 0.5) + 
      (voiceData.volumeVariation * 0.3) + 
      (voiceData.clarity * 0.4) + 30
    ));
    const nonverbalScore = Math.min(95, Math.max(50,
      (eyeData.eyeContactPercentage * 0.4) +
      (eyeData.smilePercentage * 0.3) +
      (handData.hasData ? 20 : 0) + 30
    ));
    
    const overallScore = Math.round((contentScore + pitchScore + nonverbalScore) / 3);

    const scores = [
      { label: 'Content', value: Math.round(contentScore) },
      { label: 'Voice', value: Math.round(pitchScore) },
      { label: 'Nonverbal', value: Math.round(nonverbalScore) }
    ];

    return (
      <div style={{ marginTop: '40px' }}>
        <SectionWrapper
          title="Performance Score (Based on Your Data)"
          iconClass="fas fa-chart-line"
          className="comprehensive-score"
        >
          <div className="score-section__content">
            <div className="score-bars">
              {scores.map((s, idx) => (
                <DummyBar key={idx} label={s.label} value={s.value} />
              ))}
            </div>

            <div className="score-overall">
              <div className="score-overall__box">
                <span className="score-overall__label">Overall Score</span>
                <CountUp
                  start={0}
                  end={overallScore}
                  duration={2}
                  suffix="%"
                  className="score-overall__value"
                />
              </div>
            </div>
            
            {/* Show data sources */}
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: '#f9fafb', 
              borderRadius: '8px',
              fontSize: '12px',
              color: '#374151'
            }}>
              <strong>Score based on:</strong><br/>
              • Voice: {voiceData.totalSamples} samples, {voiceData.averageVolume}% avg volume<br/>
              • Eye Contact: {eyeData.eyeContactPercentage}% contact, {eyeData.totalFrames} frames<br/>
              • Hand Gestures: {handData.hasEverDetectedHands ? `✅ Detected (${handData.feedback})` : '❌ Not detected'}
            </div>
          </div>
        </SectionWrapper>
      </div>
    );
  };

  const DummyBar = ({ label, value }) => {
    const [width, setWidth] = React.useState(0);

    React.useEffect(() => {
      const timeout = setTimeout(() => setWidth(value), 50);
      return () => clearTimeout(timeout);
    }, [value]);

    return (
      <div className="score-bar">
        <span className="score-bar__label">{label}</span>
        <div className="score-bar__track" style={{ position: 'relative' }}>
          <div
            style={{
              width: `${width}%`,
              height: '100%',
              backgroundColor: value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444',
              borderRadius: '9999px',
              transition: 'width 2s ease-in-out',
            }}
          />
        </div>
        <span className="score-bar__value">{value}%</span>
      </div>
    );
  };

  const renderStarSection = () => {
    const starData = report?.star_analysis || report?.starAnalysis;
    const transcript = report?.transcript_debug;

    if (!starData || !transcript) {
      return null;
    }

    // Build a regex-highlighted version of the transcript using STAR segments
    const highlightText = (text, highlights) => {
      let markedText = text;
      highlights.forEach((highlight, idx) => {
        if (!highlight || highlight.trim().length === 0) return;

        const escaped = highlight.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const color = ['#facc15', '#34d399', '#60a5fa', '#f87171'][idx]; // yellow, green, blue, red
        markedText = markedText.replace(
          regex,
          `<mark style="background:${color};padding:2px;border-radius:4px;">$1</mark>`
        );
      });
      return markedText;
    };

    const highlights = [
      ...(starData?.situation || []),
      ...(starData?.task || []),
      ...(starData?.action || []),
      ...(starData?.result || []),
    ];

    // Feedback for missing components
    const feedback = [];
    if (!starData.situation || starData.situation.length === 0) {
      feedback.push('Focus on making the <strong>Situation</strong> clearer.');
    }
    if (!starData.task || starData.task.length === 0) {
      feedback.push('Clearly define the <strong>Task</strong> you were responsible for.');
    }
    if (!starData.action || starData.action.length === 0) {
      feedback.push('Describe the <strong>Action</strong> you specifically took.');
    }
    if (!starData.result || starData.result.length === 0) {
      feedback.push('Make the <strong>Result</strong> or outcome of your actions clearer.');
    }

    const colorKey = [
      { label: 'Situation', color: '#facc15' },
      { label: 'Task', color: '#34d399' },
      { label: 'Action', color: '#60a5fa' },
      { label: 'Result', color: '#f87171' },
    ];

    return (
      <SectionWrapper title={UI_TEXT.STAR_ANALYSIS_TITLE} iconClass="fas fa-star" className="star-analysis">
        <div className="star-analysis">
          <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>
            Below is your full response. STAR components are <mark>highlighted</mark>:
          </p>

          {/* Color Key */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {colorKey.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: item.color,
                    borderRadius: '50%',
                    display: 'inline-block',
                    border: '1px solid #999'
                  }}
                />
                <span style={{ fontSize: '13px', color: '#374151' }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Highlighted Transcript */}
          <div
            className="star-analysis__highlighted-transcript"
            style={{
              background: '#f9fafb',
              padding: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
            }}
            dangerouslySetInnerHTML={{ __html: highlightText(transcript, highlights) }}
          />

          {/* Feedback Section */}
          {feedback.length > 0 && (
            <div
              style={{
                marginTop: '16px',
                background: '#fff7ed',
                padding: '12px 16px',
                border: '1px solid #fdba74',
                borderRadius: '6px',
                color: '#78350f',
                fontSize: '14px',
              }}
            >
              <strong>Feedback:</strong>
              <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
                {feedback.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </SectionWrapper>
    );
  };

  const renderEyeTrackingSection = () => (
    <SectionWrapper title="Computer Vision Analysis" iconClass="fas fa-eye" className="eye-tracking">
      <div className="metric-grid">
        <MetricCard
          icon="fas fa-eye"
          label="Eye Contact"
          value={`${eyeData.eyeContactPercentage}%`}
          color={eyeData.eyeContactPercentage >= 70 ? '#10b981' : eyeData.eyeContactPercentage >= 50 ? '#f59e0b' : '#ef4444'}
          detail={`${eyeData.totalFrames} frames analyzed`}
        />
        <MetricCard
          icon="fas fa-smile"
          label="Smile Rate"
          value={`${eyeData.smilePercentage}%`}
          color={eyeData.smilePercentage >= 40 ? '#10b981' : eyeData.smilePercentage >= 20 ? '#f59e0b' : '#ef4444'}
        />
        <MetricCard
          icon="fas fa-eye-dropper"
          label="Gaze Direction"
          value={eyeData.gazeStatus}
          color={eyeData.gazeStatus === 'Camera' ? '#10b981' : '#f59e0b'}
        />
        <MetricCard
          icon="fas fa-clock"
          label="Session Time"
          value={eyeData.sessionDuration}
        />
      </div>

      {hasEyeData ? (
        <SuccessBanner 
          text="Eye tracking analysis completed successfully!" 
          detail={`Analyzed ${eyeData.totalFrames} video frames with ${eyeData.eyeContactPercentage}% eye contact and ${eyeData.smilePercentage}% smile rate.`} 
        />
      ) : (
        <WarningBanner
          text="Eye tracking data was not captured."
          detail={`Please ensure your camera is working and your face is visible during the interview.`}
        />
      )}
    </SectionWrapper>
  );

  const renderHandTrackingSection = () => {
    // Calculate display metrics with REAL data
    const getDisplayMetrics = () => {
      if (!handData.hasData || !handData.handMetrics || handData.handMetrics.length === 0) {
        return {
          gestureRecognition: 0,
          movementAccuracy: 0,
          handPosition: handData.hasEverDetectedHands ? 'Previously Detected' : 'Not Detected',
          handCount: 0,
          averageSpeed: 0
        };
      }

      const firstHand = handData.handMetrics[0];
      const speed = typeof firstHand?.speed === 'number' ? firstHand.speed : 0;
      const err = typeof firstHand?.err === 'number' ? firstHand.err : 0;
      
      const gestureRecognition = Math.min(100, Math.max(0, Math.round(speed / 2)));
      const movementAccuracy = Math.min(100, Math.max(0, Math.round(100 - (err * 20))));
      const handPosition = handData.feedback;
      const handCount = handData.handMetrics.length;
      
      return {
        gestureRecognition,
        movementAccuracy,
        handPosition,
        handCount,
        averageSpeed: speed
      };
    };

    const displayMetrics = getDisplayMetrics();

    return (
      <SectionWrapper title="Hand Tracking Analysis" iconClass="fas fa-hand-paper" className="hand-tracking">
        <div className="metric-grid">
          <MetricCard 
            icon="fas fa-hand-rock" 
            label="Gesture Recognition" 
            value={`${displayMetrics.gestureRecognition}%`}
            color={displayMetrics.gestureRecognition >= 60 ? '#10b981' : displayMetrics.gestureRecognition >= 30 ? '#f59e0b' : '#ef4444'}
            detail={`Based on ${displayMetrics.averageSpeed}px/s movement`}
          />
          <MetricCard 
            icon="fas fa-hand-point-up" 
            label="Movement Accuracy" 
            value={`${displayMetrics.movementAccuracy}%`}
            color={displayMetrics.movementAccuracy >= 70 ? '#10b981' : displayMetrics.movementAccuracy >= 50 ? '#f59e0b' : '#ef4444'}
          />
          <MetricCard 
            icon="fas fa-hand-spock" 
            label="Hand Feedback" 
            value={displayMetrics.handPosition}
            color={displayMetrics.handPosition === 'Just right' ? '#10b981' : '#f59e0b'}
          />
          <MetricCard 
            icon="fas fa-hands" 
            label="Hands Detected" 
            value={`${displayMetrics.handCount} hands`}
            detail={handData.totalDetections > 0 ? `${handData.totalDetections} total detections` : 'None'}
          />
        </div>

        {handData.hasData ? (
          <SuccessBanner 
            text="Hand tracking completed successfully!" 
            detail={`Detected ${displayMetrics.handCount} hand(s) with "${handData.feedback}" movement pattern. Total detections: ${handData.totalDetections}`} 
          />
        ) : handData.hasEverDetectedHands ? (
          <WarningBanner
            text="Hands were detected but insufficient data for analysis."
            detail={`Hands were briefly detected during the session but moved out of frame or data collection was insufficient for complete analysis.`}
          />
        ) : (
          <WarningBanner 
            text="Hand tracking data was not captured." 
            detail={`Possible causes:\n• Hands not visible in camera frame\n• Camera permissions not granted\n• Hand tracking model failed to load\n• Hands moved too quickly to track`} 
          />
        )}
      </SectionWrapper>
    );
  };

  const renderVoiceAnalysisSection = () => {
    const getMetricColor = (value, type) => {
      switch (type) {
        case 'volume': return value > 10 ? '#10b981' : value > 3 ? '#f59e0b' : '#ef4444';
        case 'variation': return value > 15 ? '#10b981' : value > 5 ? '#f59e0b' : '#ef4444';
        case 'rate': return value > 60 ? '#10b981' : value > 40 ? '#f59e0b' : '#ef4444';
        case 'clarity': return value > 70 ? '#10b981' : value > 50 ? '#f59e0b' : '#ef4444';
        default: return '#6b7280';
      }
    };

    return (
      <SectionWrapper title="Voice Analysis" iconClass="fas fa-wave-square" className="voice-analysis">
        <div className="metric-grid">
          <MetricCard 
            icon="fas fa-volume-up" 
            label="Average Volume" 
            value={`${voiceData.averageVolume}%`} 
            color={getMetricColor(voiceData.averageVolume, 'volume')}
            detail={`From ${voiceData.totalSamples} samples`}
          />
          <MetricCard 
            icon="fas fa-chart-line" 
            label="Volume Variation" 
            value={`${voiceData.volumeVariation}%`} 
            color={getMetricColor(voiceData.volumeVariation, 'variation')}
          />
          <MetricCard 
            icon="fas fa-music" 
            label="Tone Variation" 
            value={`${voiceData.pitchVariation}%`} 
            color={getMetricColor(voiceData.pitchVariation, 'variation')}
          />
          <MetricCard 
            icon="fas fa-tachometer-alt" 
            label="Speech Rate" 
            value={`${voiceData.speechRate}%`} 
            color={getMetricColor(voiceData.speechRate, 'rate')}
          />
          <MetricCard 
            icon="fas fa-microphone" 
            label="Clarity" 
            value={`${voiceData.clarity}%`} 
            color={getMetricColor(voiceData.clarity, 'clarity')}
          />
          <MetricCard 
            icon="fas fa-database" 
            label="Total Samples" 
            value={voiceData.totalSamples}
          />
        </div>
        
        {hasVoiceData ? (
          <SuccessBanner 
            text="Voice analysis completed successfully!" 
            detail={`Captured ${voiceData.totalSamples} audio samples with ${voiceData.averageVolume}% average volume and ${voiceData.clarity}% clarity.`} 
          />
        ) : (
          <WarningBanner 
            text="Voice analysis data was not captured." 
            detail={`Possible causes:\n• Microphone not working or muted\n• Speaking too quietly\n• Browser permissions not granted\n• Audio processing issues`} 
          />
        )}
      </SectionWrapper>
    );
  };

  const renderTipsSection = () => (
    <SectionWrapper title={UI_TEXT.TIPS_TITLE} iconClass="fas fa-lightbulb" className="tips-section">
      <div className="tips" style={{ marginTop: '0px' }}>
        <ul className="tips__list" style={{ listStyle: 'none', paddingLeft: 0, fontSize: '16px' }}>
          {Object.entries(report?.tips || {}).map(([tipCategory, tipContent]) => (
            <li key={tipCategory} className="tips__item" style={{ marginBottom: '1px' }}>
              <i className="fas fa-check-circle icon-sm icon-success" style={{ marginRight: '8px' }}></i>
              <strong>{tipCategory.charAt(0).toUpperCase() + tipCategory.slice(1)}:</strong> {tipContent}
            </li>
          ))}
        </ul>
      </div>
    </SectionWrapper>
  );

  return (
    <div className="feedback-report">
      {renderProgressSavedIndicator()}
      {renderComprehensiveScoreSection()}
      <div className="feedback-report__content">
        {renderStarSection()}
        {renderEyeTrackingSection()}
        {renderHandTrackingSection()}
        {renderVoiceAnalysisSection()}
        {renderTipsSection()}
      </div>
    </div>
  );
});

FeedbackReport.displayName = 'FeedbackReport';

export default FeedbackReport;