/**
 * Interview Session Component
 * Handles initial question selection and interview start
 */

import React, { useState } from 'react';
import SelectedQuestionDisplay from './SelectedQuestionDisplay';
import { DevHelpers } from '../../config/devConfig';
import { UI_TEXT, DEV_MESSAGES, getAllQuestions, BEHAVIORAL_QUESTIONS, getQuestionsByCategory } from '../../constants/interviewConstants';
import { useCredits } from '../../hooks/useCredits';
import { useAuth } from '../../contexts/AuthContext';

const InterviewSession = React.memo(({ onStart, initialQuestion = '', onShowAuthModal }) => {
  const [selectedQuestion, setSelectedQuestion] = useState(initialQuestion);
  const [validationError, setValidationError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { credits, loading } = useCredits();
  const { isAuthenticated } = useAuth();

  // Update selectedQuestion when initialQuestion prop changes
  React.useEffect(() => {
    setSelectedQuestion(initialQuestion);
  }, [initialQuestion]);

  const handleInterviewStart = () => {
    if (!selectedQuestion) {
      setValidationError('Please select a question before starting the interview.');
      return;
    }
    if (credits <= 0) {
      setValidationError('Out of credits. Cannot start interview.');
      return;
    }
    setValidationError('');
    if (onStart) onStart(selectedQuestion);
  };

  const handleCategoryChange = (event) => {
    const newCategory = event.target.value;
    setSelectedCategory(newCategory);
    // Clear validation and selection if the current question is not in the new category
    setValidationError('');
    if (newCategory) {
      const questionsInCategory = getQuestionsByCategory(newCategory);
      const stillValid = questionsInCategory.some(q => q.id === selectedQuestion);
      if (!stillValid) {
        setSelectedQuestion('');
      }
    }
  };

  const handleRandomQuestion = () => {
    const pool = selectedCategory ? getQuestionsByCategory(selectedCategory) : getAllQuestions();
    if (!pool.length) return;
    const random = pool[Math.floor(Math.random() * pool.length)];
    setSelectedQuestion(random.id);
    setValidationError('');
  };

  const handleQuestionChange = (event) => {
    setSelectedQuestion(event.target.value);
    setValidationError(''); // Clear validation error when user selects a question
  };

  const renderDevModeWarning = () => (
    <div className="interview-session__dev-warning">
      {DEV_MESSAGES.API_DISABLED}
    </div>
  );

  const renderValidationError = () => (
    validationError && (
      <div id="question-error" className="interview-session__validation-error" role="alert" aria-live="assertive">
        <i className="fas fa-exclamation-triangle icon-sm icon-error"></i>
        {validationError}
      </div>
    )
  );

  const renderQuestionSelector = () => {
    const categories = Object.values(BEHAVIORAL_QUESTIONS);
    const hasFilter = Boolean(selectedCategory);

    return (
      <div className="question-selector">
        <div className="question-selector__toolbar">
          <label htmlFor="category-select" className="question-selector__sub-label">Category</label>
          <select
            id="category-select"
            className="question-selector__dropdown question-selector__dropdown--category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            aria-label="Filter questions by category"
          >
            <option value="">All categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <label htmlFor="question-select" className="question-selector__label">
          <i className="fas fa-question-circle icon-sm icon-primary"></i>
          Choose your question:
        </label>
        <div className="question-selector__row">
          <select
            id="question-select"
            className={`question-selector__dropdown ${validationError ? 'question-selector__dropdown--error' : ''}`}
            value={selectedQuestion}
            onChange={handleQuestionChange}
            required
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? 'question-error' : undefined}
          >
            <option value="">Select a behavioral question...</option>
            {hasFilter
              ? getQuestionsByCategory(selectedCategory).map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.text}
                  </option>
                ))
              : categories.map(category => (
                  <optgroup key={category.id} label={category.name}>
                    {category.questions.map(question => (
                      <option key={question.id} value={question.id}>{question.text}</option>
                    ))}
                  </optgroup>
                ))}
          </select>
          <button
            type="button"
            className="button button--small question-selector__random"
            onClick={handleRandomQuestion}
            aria-label="Pick a random question"
          >
            <i className="fas fa-random icon-sm"></i>
            Random
          </button>
        </div>
        {renderValidationError()}
      </div>
    );
  };

  const renderSelectedQuestion = () => (
    <div>
      <SelectedQuestionDisplay 
        questionId={selectedQuestion} 
        variant="preview" 
      />
    </div>
  );

  const renderCreditsInfo = () => {
    if (!isAuthenticated) {
      return (
        <div className="credits-info credits-info--signin">
          <span 
            className="signin-link" 
            onClick={onShowAuthModal}
            style={{ 
              textDecoration: 'underline', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            Sign In
          </span> to Get Started!
        </div>
      );
    }

    return (
      <div className="credits-info">
        Credits Remaining: <span className="credits-info__amount">{loading ? '...' : credits}</span>
      </div>
    );
  };

  return (
    <div className="interview-session">
      <p className="interview-session__message">
        {UI_TEXT.READY_MESSAGE}
      </p>
      
      <div className="interview-session__question-group">
        {renderQuestionSelector()}
        {renderSelectedQuestion()}
      </div>
      
      {DevHelpers.isApiDisabled() && renderDevModeWarning()}
      
      <button 
        className={`button ${!selectedQuestion || credits <= 0 ? 'button--disabled' : ''}`}
        onClick={handleInterviewStart}
        disabled={!selectedQuestion || credits <= 0}
      >
        <i className="fas fa-play icon-sm"></i>
        {credits <= 0 ? 'Out of Credits' : UI_TEXT.START_INTERVIEW}
      </button>
      
      {renderCreditsInfo()}
    </div>
  );
});

InterviewSession.displayName = 'InterviewSession';

export default InterviewSession;
