/**
 * Processing Screen Component
 * Shows loading state while interview is being processed
 */

import React from 'react';

const ProcessingScreen = React.memo(() => {
  return (
    <div className="processing-screen">
      <div className="card card--processing">
        <div className="processing-screen__content">
          <h2 className="processing-screen__title">
            <i className="fas fa-brain icon-sm icon-primary"></i>
            Analyzing Your Interview
          </h2>
          <p className="processing-screen__message">
            Our AI is reviewing your responses and analyzing your performance. 
            This includes STAR method evaluation, voice analysis, and computer vision assessment.
          </p>
          <div className="processing-screen__spinner">
            <div className="processing-screen__spinner-element"></div>
          </div>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '16px' }}>
            Processing typically takes 30-60 seconds...
          </p>
        </div>
      </div>
    </div>
  );
});

ProcessingScreen.displayName = 'ProcessingScreen';

export default ProcessingScreen;