/**
 * Feedback Report Component
 * Displays comprehensive interview feedback with STAR analysis and eye tracking metrics
 * WITH DEBUGGING FOR EYE TRACKING DATA FLOW
 */

import React from 'react';
import { ScoreEvaluator } from '../utils/interviewUtils';
import { STAR_COMPONENTS, UI_TEXT } from '../constants/interviewConstants';

const FeedbackReport = React.memo(({ report }) => {
  // Enhanced debug logging
  console.log('📝 STEP 7 - FeedbackReport received report:');
  console.log('🔍 Full report object:', report);
  console.log('🔍 Report JSON:', JSON.stringify(report, null, 2));
  console.log('📊 Available top-level keys:', Object.keys(report || {}));
  
  // Check all possible locations for eye tracking data
  const eyeTrackingLocations = {
    'report.eyeTracking': report?.eyeTracking,
    'report.eye_tracking': report?.eye_tracking,
    'report.metrics?.eyeTracking': report?.metrics?.eyeTracking,
    'report.metrics?.eye_tracking': report?.metrics?.eye_tracking,
    'report.eyeContactPercentage': report?.eyeContactPercentage,
    'report.smilePercentage': report?.smilePercentage,
    'report.sessionDuration': report?.sessionDuration
  };
  
  console.log('👁️ Eye tracking data locations check:', eyeTrackingLocations);
  
  // Find which locations have data
  const foundLocations = Object.entries(eyeTrackingLocations)
    .filter(([key, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({ location: key, value }));
    
  if (foundLocations.length > 0) {
    console.log('✅ Found eye tracking data in these locations:', foundLocations);
  } else {
    console.log('❌ No eye tracking data found in any expected location');
  }

  // Enhanced StarDataAccessor with debugging
  const StarDataAccessor = {
    getStarData(report) {
      const data = report.star_analysis || report.starAnalysis;
      console.log('🌟 StarDataAccessor.getStarData:', data);
      return data;
    },

    hasStarData(report) {
      const result = !!this.getStarData(report);
      console.log('🌟 StarDataAccessor.hasStarData:', result);
      return result;
    },

    hasTranscript(report) {
      const result = !!report.transcript_debug;
      console.log('📝 StarDataAccessor.hasTranscript:', result);
      return result;
    },

    hasEyeTrackingData(report) {
      const hasData = !!(
        report.eyeTracking || 
        report.eye_tracking || 
        report.metrics?.eyeTracking ||
        report.metrics?.eye_tracking ||
        (report.eyeContactPercentage !== undefined) ||
        (report.smilePercentage !== undefined)
      );
      
      console.log('👁️ StarDataAccessor.hasEyeTrackingData check:', {
        report,
        hasEyeTracking: !!report.eyeTracking,
        hasEyeTrackingUnderscore: !!report.eye_tracking,
        hasMetricsEyeTracking: !!report.metrics?.eyeTracking,
        hasIndividualFields: report.eyeContactPercentage !== undefined,
        finalResult: hasData
      });
      
      return hasData;
    },

    getEyeTrackingData(report) {
      let data = report.eyeTracking || 
                 report.eye_tracking || 
                 report.metrics?.eyeTracking ||
                 report.metrics?.eye_tracking;
      
      // If no nested data found, try to construct from individual fields
      if (!data && (report.eyeContactPercentage !== undefined || report.smilePercentage !== undefined)) {
        data = {
          eyeContactPercentage: report.eyeContactPercentage || 0,
          smilePercentage: report.smilePercentage || 0,
          sessionDuration: report.sessionDuration || '00:00'
        };
        console.log('👁️ StarDataAccessor.getEyeTrackingData - constructed from individual fields:', data);
      } else {
        console.log('👁️ StarDataAccessor.getEyeTrackingData - found nested data:', data);
      }
      
      return data;
    }
  };

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

  // Enhanced renderEyeTrackingSection with debugging
  const renderEyeTrackingSection = () => {
    console.log('🎨 STEP 8 - Rendering eye tracking section');
    
    const hasData = StarDataAccessor.hasEyeTrackingData(report);
    const eyeTrackingData = StarDataAccessor.getEyeTrackingData(report);

    const displayData = {
      eyeContactPercentage: eyeTrackingData?.eyeContactPercentage ?? 0,
      smilePercentage: eyeTrackingData?.smilePercentage ?? 0,
      sessionDuration: eyeTrackingData?.sessionDuration ?? '00:00'
    };

    const showNoDataWarning = !hasData || (
      displayData.eyeContactPercentage === 0 && 
      displayData.smilePercentage === 0 && 
      displayData.sessionDuration === '00:00'
    );

    console.log('🎨 Rendering eye tracking section with:', {
      hasData,
      eyeTrackingData,
      displayData,
      showNoDataWarning
    });

    return (
      <div className="cv-analysis">
        <h3 className="cv-analysis__title">
          <i className="fas fa-eye icon-sm icon-primary"></i>
          Computer Vision Analysis
          {showNoDataWarning && (
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
                {displayData.eyeContactPercentage}%
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
                {displayData.smilePercentage}%
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
                {displayData.sessionDuration}
              </div>
              <div className="cv-metric__label">Session Time</div>
            </div>
          </div>
        </div>
        
        {showNoDataWarning && (
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
            Eye tracking data was not captured during this session. Please ensure camera permissions are granted and your face is visible.
          </div>
        )}
        
        {/* Debug information (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#f0f0f0', 
            border: '1px solid #ccc', 
            borderRadius: '8px', 
            fontSize: '12px', 
            color: '#666' 
          }}>
            <details>
              <summary>🔍 Debug Info (Dev Only)</summary>
              <pre style={{ marginTop: '8px', fontSize: '11px' }}>
                {JSON.stringify({
                  hasData,
                  eyeTrackingData,
                  displayData,
                  foundLocations: foundLocations.map(loc => loc.location)
                }, null, 2)}
              </pre>
            </details>
          </div>
        )}
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
        {Object.entries(report.tips).map(([tipCategory, tipContent]) => (
          <li key={tipCategory} className="tips__item">
            <i className="fas fa-check-circle icon-sm icon-success"></i>
            <strong>{tipCategory}:</strong> {tipContent}
          </li>
        ))}
      </ul>
    </div>
  );

  const renderStarComponent = ({ key, title, color }) => {
    const starData = StarDataAccessor.getStarData(report);
    const componentData = starData?.[key];
    
    return (
      <div key={key} className="star-analysis__line">
        <span className="star-analysis__label" style={{ color }}>
          {title}:
        </span>
        <span className="star-analysis__content">
          {componentData && componentData.length > 0 
            ? componentData.join('. ')
            : `No ${title.toLowerCase()} identified`
          }
        </span>
      </div>
    );
  };

  const renderStarSection = () => {
    if (!StarDataAccessor.hasStarData(report)) {
      return null;
    }

    return (
      <div className="star-analysis">
        <h3 className="star-analysis__title">
          <i className="fas fa-star icon-sm icon-warning"></i>
          {UI_TEXT.STAR_ANALYSIS_TITLE}
        </h3>
        <div className="star-analysis__content-wrapper">
          {STAR_COMPONENTS.map(renderStarComponent)}
        </div>
      </div>
    );
  };

  const renderTranscriptSection = () => {
    if (!StarDataAccessor.hasTranscript(report)) {
      return null;
    }

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

  console.log('🎨 STEP 9 - About to render FeedbackReport components');

  return (
    <div className="feedback-report">
      {renderScoreSection()}
      <div className="feedback-report__content">
        {renderStarSection()}
        {renderEyeTrackingSection()}
        {renderTipsSection()}
        {renderTranscriptSection()}
      </div>
    </div>
  );
});

FeedbackReport.displayName = 'FeedbackReport';

export default FeedbackReport;