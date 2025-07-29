/**
 * MERGED Feedback Report - Main's base with enhanced hand tracking display
 * Uses main's structure but includes proper hand data extraction and display
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ScoreEvaluator } from '../../utils/interviewUtils';
import { STAR_COMPONENTS, UI_TEXT } from '../../constants/interviewConstants';
import './FeedbackReport.css';

import CountUp from 'react-countup';

const FeedbackReport = React.memo(({ report }) => {
  const { isAuthenticated } = useAuth();
  console.log('📝 FeedbackReport received:', report);
  
  // Extract voice data from report
  const getVoiceData = () => {
    return {
      averageVolume: report?.averageVolume ?? 0,
      volumeVariation: report?.volumeVariation ?? 0,
      pitchVariation: report?.pitchVariation ?? 0,
      speechRate: report?.speechRate ?? 0,
      clarity: report?.clarity ?? 0,
      totalSamples: report?.totalSamples ?? 0
    };
  };

  // Extract eye tracking data
  const getEyeData = () => {
    return {
      eyeContactPercentage: report?.eyeContactPercentage ?? 0,
      smilePercentage: report?.smilePercentage ?? 0,
      sessionDuration: report?.sessionDuration ?? '00:00'
    };
  };

  // Enhanced hand tracking data extraction with multiple fallbacks
  const getHandData = () => {
    // Try multiple locations for hand data
    const topLevelHandMetrics = report?.handMetrics || [];
    const nestedHandMetrics = report?.handTracking?.handMetrics || [];
    const topLevelFeedback = report?.feedback || report?.handFeedback;
    const nestedFeedback = report?.handTracking?.feedback;
    
    // Use the data source that has the most information
    const handMetrics = topLevelHandMetrics.length > 0 ? topLevelHandMetrics : nestedHandMetrics;
    const feedback = topLevelFeedback || nestedFeedback || 'No data';
    
    const hasData = handMetrics && handMetrics.length > 0;
    const hasEverDetectedHands = report?.hasEverDetectedHands || report?.handTracking?.hasEverDetectedHands || false;
    
    return {
      handMetrics,
      feedback,
      hasData,
      hasEverDetectedHands
    };
  };

  const voiceData = getVoiceData();
  const eyeData = getEyeData();
  const handData = getHandData();
  
  // Check if we have meaningful data
  const hasVoiceData = voiceData.averageVolume > 0 || voiceData.totalSamples > 0;
  const hasEyeData = eyeData.eyeContactPercentage > 0 || eyeData.smilePercentage > 0 || eyeData.sessionDuration !== '00:00';

  console.log('🎙️ Voice data:', voiceData, 'Has data:', hasVoiceData);
  console.log('👁️ Eye data:', eyeData, 'Has data:', hasEyeData);
  console.log('🤲 Hand data:', handData, 'Has data:', handData.hasData);

  const renderProgressSavedIndicator = () => {
    if (!isAuthenticated) return null;
    
    return (
      <div className="progress-saved-indicator">
        <i className="fas fa-check-circle icon-sm icon-success"></i>
        <span>Your progress has been saved to your profile</span>
      </div>
    );
  };

  const MetricCard = ({ icon, label, value, color = '#374151' }) => (
    <div className="metric-card">
      <div className="metric-card__icon">
        <i className={icon}></i>
      </div>
      <div className="metric-card__content">
        <div className="metric-card__value" style={{ color }}>
          {value}
        </div>
        <div className="metric-card__label">{label}</div>
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
              backgroundColor: '#10b981',
              borderRadius: '9999px',
              transition: 'width 2s ease-in-out',
            }}
          />
        </div>
        <span className="score-bar__value">{value}%</span>
      </div>
    );
  };

  const renderComprehensiveScoreSection = () => {
    const scores = [
      { label: 'Content', value: 85 },
      { label: 'Pitch', value: 78 },
      { label: 'Nonverbal', value: 92 }
    ];

    return (
      <div style={{ marginTop: '40px' }}>
        <SectionWrapper
          title="Comprehensive Performance Score"
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
                  end={85}
                  duration={2}
                  suffix="%"
                  className="score-overall__value"
                />
              </div>
            </div>
          </div>
        </SectionWrapper>
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
        />
        <MetricCard
          icon="fas fa-smile"
          label="Smile Rate"
          value={`${eyeData.smilePercentage}%`}
        />
        <MetricCard
          icon="fas fa-clock"
          label="Session Time"
          value={eyeData.sessionDuration}
        />
      </div>

      {!hasEyeData && (
        <WarningBanner
          text="Eye tracking data was not captured."
          detail={`Please ensure your camera is working and your face is visible.`}
        />
      )}
    </SectionWrapper>
  );

  const renderHandTrackingSection = () => {
    // Calculate display metrics with fallbacks
    const getDisplayMetrics = () => {
      if (!handData.hasData || !handData.handMetrics || handData.handMetrics.length === 0) {
        return {
          gestureRecognition: 0,
          movementAccuracy: 0,
          handPosition: 'Poor',
          handCount: 0
        };
      }

      const firstHand = handData.handMetrics[0];
      
      // Safely extract metrics with fallbacks
      const speed = typeof firstHand?.speed === 'number' ? firstHand.speed : 0;
      const err = typeof firstHand?.err === 'number' ? firstHand.err : 0;
      
      // Convert to display metrics
      const gestureRecognition = Math.min(100, Math.max(0, Math.round(speed / 2))); // Convert speed to 0-100 scale
      const movementAccuracy = Math.min(100, Math.max(0, Math.round(100 - (err * 20)))); // Convert error to accuracy
      const handPosition = handData.feedback === 'Just right' ? 'Good' : 
                          handData.feedback === 'Too little – gesture more' ? 'Too Static' :
                          handData.feedback === 'Too much – slow down' ? 'Too Active' : 'Variable';
      const handCount = handData.handMetrics.length;
      
      return {
        gestureRecognition,
        movementAccuracy,
        handPosition,
        handCount
      };
    };

    const displayMetrics = getDisplayMetrics();

    return (
      <SectionWrapper title="Hand Tracking Analysis" iconClass="fas fa-hand-paper" className="hand-tracking">
        <div className="metric-grid">
          <MetricCard icon="fas fa-hand-rock" label="Gesture Recognition" value={`${displayMetrics.gestureRecognition}%`} />
          <MetricCard icon="fas fa-hand-point-up" label="Movement Accuracy" value={`${displayMetrics.movementAccuracy}%`} />
          <MetricCard icon="fas fa-hand-spock" label="Hand Position" value={displayMetrics.handPosition} />
        </div>

        {handData.hasData ? (
          <SuccessBanner 
            text="Hand tracking completed successfully!" 
            detail={`Feedback: ${handData.feedback || 'Unknown'} | Detected ${displayMetrics.handCount} hand(s)`} 
          />
        ) : handData.hasEverDetectedHands ? (
          <WarningBanner
            text="Hands were detected but no final data captured."
            detail={`Possible causes:\n• Hands moved out of frame before session ended\n• Brief detection that didn't generate enough data\n• Data processing issue during session completion`}
          />
        ) : (
          <WarningBanner 
            text="Hand tracking data was not captured." 
            detail={`Possible causes:\n• Hands not visible in camera frame\n• Camera permissions not granted\n• Hand tracking model failed to load`} 
          />
        )}
      </SectionWrapper>
    );
  };

  const renderVoiceAnalysisSection = () => {
    const getMetricColor = (value, type) => {
      switch (type) {
        case 'volume': return value > 10 ? '#10b981' : value > 3 ? '#f59e0b' : '#000000';
        case 'variation': return value > 15 ? '#10b981' : value > 5 ? '#f59e0b' : '#000000';
        case 'rate': return value > 60 ? '#10b981' : value > 40 ? '#f59e0b' : '#000000';
        case 'clarity': return value > 70 ? '#10b981' : value > 50 ? '#f59e0b' : '#000000';
        default: return '#6b7280';
      }
    };

    return (
      <SectionWrapper title="Voice Analysis" iconClass="fas fa-wave-square" className="voice-analysis">
        <div className="metric-grid">
          <MetricCard icon="fas fa-volume-up" label="Avg Volume" value={`${voiceData.averageVolume}%`} color={getMetricColor(voiceData.averageVolume, 'volume')} />
          <MetricCard icon="fas fa-chart-line" label="Vol Variation" value={`${voiceData.volumeVariation}%`} color={getMetricColor(voiceData.volumeVariation, 'variation')} />
          <MetricCard icon="fas fa-music" label="Tone Variation" value={`${voiceData.pitchVariation}%`} color={getMetricColor(voiceData.pitchVariation, 'variation')} />
          <MetricCard icon="fas fa-tachometer-alt" label="Speech Rate" value={`${voiceData.speechRate}%`} color={getMetricColor(voiceData.speechRate, 'rate')} />
          <MetricCard icon="fas fa-microphone" label="Clarity" value={`${voiceData.clarity}%`} color={getMetricColor(voiceData.clarity, 'clarity')} />
          <MetricCard icon="fas fa-database" label="Samples" value={voiceData.totalSamples} />
        </div>
        {hasVoiceData ? (
          <SuccessBanner text="Voice analysis completed successfully!" detail={`Captured ${voiceData.totalSamples} samples with ${voiceData.averageVolume}% average volume.`} />
        ) : (
          <WarningBanner text="Voice analysis data was not captured." detail={`Possible causes:\n• Microphone not working or muted\n• Speaking too quietly\n• Browser permissions not granted`} />
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