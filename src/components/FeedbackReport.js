/**
 * Clean Feedback Report - Production Ready
 * Displays voice analysis data cleanly without excessive debug
 */

import React from 'react';
import { ScoreEvaluator } from '../utils/interviewUtils';
import { STAR_COMPONENTS, UI_TEXT } from '../constants/interviewConstants';

const FeedbackReport = React.memo(({ report }) => {
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

  const voiceData = getVoiceData();
  const eyeData = getEyeData();
  
  // Check if we have meaningful data
  const hasVoiceData = voiceData.averageVolume > 0 || voiceData.totalSamples > 0;
  const hasEyeData = eyeData.eyeContactPercentage > 0 || eyeData.smilePercentage > 0 || eyeData.sessionDuration !== '00:00';

  console.log('🎙️ Voice data:', voiceData, 'Has data:', hasVoiceData);
  console.log('👁️ Eye data:', eyeData, 'Has data:', hasEyeData);

  const renderScoreSection = () => (
    <div className="feedback-report__scores">
      <div className={`score score--${ScoreEvaluator.getScoreVariant(report.content_score)}`}>
        <i className="fas fa-file-text icon-sm icon-primary"></i>
        Content Score: {report.content_score}
      </div>
      <div className={`score score--${ScoreEvaluator.getScoreVariant(report.voice_score)}`}>
        <i className="fas fa-microphone icon-sm icon-primary"></i>
        Voice Score: {report.voice_score}
      </div>
      <div className={`score score--${ScoreEvaluator.getScoreVariant(report.face_score)}`}>
        <i className="fas fa-video icon-sm icon-primary"></i>
        Face Score: {report.face_score}
      </div>
    </div>
  );

  const renderEyeTrackingSection = () => (
    <div className="cv-analysis">
      <h3 className="cv-analysis__title">
        <i className="fas fa-eye icon-sm icon-primary"></i>
        Computer Vision Analysis
        {!hasEyeData && (
          <span style={{ fontSize: '12px', color: '#e74c3c', marginLeft: '8px' }}>
            (No data captured)
          </span>
        )}
      </h3>
      
      <div className="cv-analysis__metrics">
        <div className="cv-metric">
          <div className="cv-metric__icon">
            <i className="fas fa-eye"></i>
          </div>
          <div className="cv-metric__content">
            <div className="cv-metric__value">
              {eyeData.eyeContactPercentage}%
            </div>
            <div className="cv-metric__label">Eye Contact</div>
          </div>
        </div>
        
        <div className="cv-metric">
          <div className="cv-metric__icon">
            <i className="fas fa-smile"></i>
          </div>
          <div className="cv-metric__content">
            <div className="cv-metric__value">
              {eyeData.smilePercentage}%
            </div>
            <div className="cv-metric__label">Smile Rate</div>
          </div>
        </div>
        
        <div className="cv-metric">
          <div className="cv-metric__icon">
            <i className="fas fa-clock"></i>
          </div>
          <div className="cv-metric__content">
            <div className="cv-metric__value">
              {eyeData.sessionDuration}
            </div>
            <div className="cv-metric__label">Session Time</div>
          </div>
        </div>
      </div>
      
      {!hasEyeData && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '8px', 
          fontSize: '14px', 
          color: '#856404' 
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
          Eye tracking data was not captured. Please ensure your camera is working and your face is visible.
        </div>
      )}
    </div>
  );

  const renderVoiceAnalysisSection = () => {
    // Helper function for color coding
    const getMetricColor = (value, type) => {
      switch (type) {
        case 'volume':
          return value > 10 ? '#10b981' : value > 3 ? '#f59e0b' : '#ef4444';
        case 'variation':
          return value > 15 ? '#10b981' : value > 5 ? '#f59e0b' : '#ef4444';
        case 'rate':
          return value > 60 ? '#10b981' : value > 40 ? '#f59e0b' : '#ef4444';
        case 'clarity':
          return value > 70 ? '#10b981' : value > 50 ? '#f59e0b' : '#ef4444';
        default:
          return '#6b7280';
      }
    };

    return (
      <div className="voice-analysis">
        <h3 className="voice-analysis__title">
          <i className="fas fa-waveform-lines icon-sm icon-primary"></i>
          Voice Analysis
          {!hasVoiceData && (
            <span style={{ fontSize: '12px', color: '#e74c3c', marginLeft: '8px' }}>
              (No data captured)
            </span>
          )}
        </h3>
        
        <div className="voice-analysis__metrics">
          <div className="voice-metric">
            <div className="voice-metric__icon">
              <i className="fas fa-volume-up"></i>
            </div>
            <div className="voice-metric__content">
              <div 
                className="voice-metric__value"
                style={{ color: getMetricColor(voiceData.averageVolume, 'volume') }}
              >
                {voiceData.averageVolume}%
              </div>
              <div className="voice-metric__label">Avg Volume</div>
            </div>
          </div>
          
          <div className="voice-metric">
            <div className="voice-metric__icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="voice-metric__content">
              <div 
                className="voice-metric__value"
                style={{ color: getMetricColor(voiceData.volumeVariation, 'variation') }}
              >
                {voiceData.volumeVariation}%
              </div>
              <div className="voice-metric__label">Vol Variation</div>
            </div>
          </div>
          
          <div className="voice-metric">
            <div className="voice-metric__icon">
              <i className="fas fa-music"></i>
            </div>
            <div className="voice-metric__content">
              <div 
                className="voice-metric__value"
                style={{ color: getMetricColor(voiceData.pitchVariation, 'variation') }}
              >
                {voiceData.pitchVariation}%
              </div>
              <div className="voice-metric__label">Tone Variation</div>
            </div>
          </div>
          
          <div className="voice-metric">
            <div className="voice-metric__icon">
              <i className="fas fa-tachometer-alt"></i>
            </div>
            <div className="voice-metric__content">
              <div 
                className="voice-metric__value"
                style={{ color: getMetricColor(voiceData.speechRate, 'rate') }}
              >
                {voiceData.speechRate}%
              </div>
              <div className="voice-metric__label">Speech Rate</div>
            </div>
          </div>
          
          <div className="voice-metric">
            <div className="voice-metric__icon">
              <i className="fas fa-microphone"></i>
            </div>
            <div className="voice-metric__content">
              <div 
                className="voice-metric__value"
                style={{ color: getMetricColor(voiceData.clarity, 'clarity') }}
              >
                {voiceData.clarity}%
              </div>
              <div className="voice-metric__label">Clarity</div>
            </div>
          </div>
          
          <div className="voice-metric">
            <div className="voice-metric__icon">
              <i className="fas fa-database"></i>
            </div>
            <div className="voice-metric__content">
              <div className="voice-metric__value">
                {voiceData.totalSamples}
              </div>
              <div className="voice-metric__label">Samples</div>
            </div>
          </div>
        </div>
        
        {hasVoiceData ? (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#dcfce7', 
            border: '1px solid #16a34a', 
            borderRadius: '8px', 
            fontSize: '14px', 
            color: '#15803d' 
          }}>
            <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
            <strong>Voice analysis completed successfully!</strong>
            <div style={{ marginTop: '4px', fontSize: '12px' }}>
              Captured {voiceData.totalSamples} audio samples with {voiceData.averageVolume}% average volume.
            </div>
          </div>
        ) : (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: '8px', 
            fontSize: '14px', 
            color: '#856404' 
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            <strong>Voice analysis data was not captured.</strong>
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              Possible causes:
              <br />• Microphone not working or muted
              <br />• Speaking too quietly 
              <br />• Browser permissions not granted
            </div>
          </div>
        )}

        {/* Minimal debug info - only show if no data */}
        {!hasVoiceData && process.env.NODE_ENV === 'development' && (
          <details style={{ 
            marginTop: '12px', 
            padding: '8px', 
            background: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '6px', 
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              🔍 Debug Info (Development)
            </summary>
            <div style={{ marginTop: '8px' }}>
              averageVolume: {voiceData.averageVolume} | totalSamples: {voiceData.totalSamples}
              <br />
              Report keys: {report ? Object.keys(report).join(', ') : 'None'}
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderStarSection = () => {
    const starData = report?.star_analysis || report?.starAnalysis;
    if (!starData) return null;

    return (
      <div className="star-analysis">
        <h3 className="star-analysis__title">
          <i className="fas fa-star icon-sm icon-warning"></i>
          {UI_TEXT.STAR_ANALYSIS_TITLE}
        </h3>
        <div className="star-analysis__content-wrapper">
          {STAR_COMPONENTS.map(({ key, title, color }) => (
            <div key={key} className="star-analysis__line">
              <span className="star-analysis__label" style={{ color }}>
                {title}:
              </span>
              <span className="star-analysis__content">
                {starData?.[key] && starData[key].length > 0 
                  ? starData[key].join('. ')
                  : `No ${title.toLowerCase()} identified`
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTipsSection = () => (
    <div className="tips">
      <h3 className="tips__title">
        <i className="fas fa-lightbulb icon-sm icon-warning"></i>
        {UI_TEXT.TIPS_TITLE}
      </h3>
      <ul className="tips__list">
        {Object.entries(report?.tips || {}).map(([tipCategory, tipContent]) => (
          <li key={tipCategory} className="tips__item">
            <i className="fas fa-check-circle icon-sm icon-success"></i>
            <strong>{tipCategory}:</strong> {tipContent}
          </li>
        ))}
      </ul>
    </div>
  );

  const renderTranscriptSection = () => {
    if (!report?.transcript_debug) return null;

    return (
      <div className="transcript">
        <h3 className="transcript__header">
          <i className="fas fa-file-alt icon-sm icon-primary"></i>
          {UI_TEXT.TRANSCRIPT_TITLE_FEEDBACK}
        </h3>
        <div className="transcript__content">
          {report.transcript_debug}
        </div>
      </div>
    );
  };

  return (
    <div className="feedback-report">
      {renderScoreSection()}
      <div className="feedback-report__content">
        {renderStarSection()}
        {renderEyeTrackingSection()}
        {renderVoiceAnalysisSection()}
        {renderTipsSection()}
        {renderTranscriptSection()}
      </div>
    </div>
  );
});

FeedbackReport.displayName = 'FeedbackReport';

export default FeedbackReport;