/**
 * Interview Constants
 * Centralized configuration values for the interview system
 */

// Interview session configuration
export const INTERVIEW_CONFIG = {
  sessionDuration: 60000, // 60 seconds
  processingDelay: 200,
  fallbackTimeout: 3000,
  dotAnimationInterval: 500,
  transcriptUpdateDelay: 100,
  maxDots: 3
};

// Audio constraints for better quality
export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

// Speech recognition configuration
export const SPEECH_CONFIG = {
  continuous: true,
  interimResults: true,
  language: 'en-US',
  maxAlternatives: 1
};

// STAR component configuration
export const STAR_COMPONENTS = [
  { key: 'situation', title: 'Situation', color: '#3BA676' },
  { key: 'task', title: 'Task', color: '#FACC15' },
  { key: 'action', title: 'Action', color: '#EF4444' },
  { key: 'result', title: 'Result', color: '#8B5CF6' }
];

// Application states
export const APP_STATES = {
  INITIAL: 'initial',
  INTERVIEWING: 'interviewing',
  PROCESSING: 'processing',
  FEEDBACK: 'feedback'
};

// Error messages
export const ERROR_MESSAGES = {
  NO_SPEECH_DETECTED: "No speech was detected during the interview. Please try again and speak clearly.",
  SPEECH_RECOGNITION_NOT_SUPPORTED: "Speech Recognition API not supported in this browser.",
  MEDIA_ACCESS_FAILED: "Failed to access camera/microphone. Please check permissions.",
  API_REQUEST_FAILED: "API request failed. Please try again.",
  UNKNOWN_ERROR: "Unknown error occurred"
};

// Success messages
export const SUCCESS_MESSAGES = {
  INTERVIEW_COMPLETED: "Interview completed successfully",
  ANALYSIS_COMPLETE: "Analysis completed successfully"
};

// Development mode messages
export const DEV_MESSAGES = {
  API_DISABLED: "🔧 DEV MODE: API calls disabled - using mock data",
  SIMULATION_ACTIVE: "🔧 DEV MODE: Transcript simulation active",
  SIMULATION_ENABLED: "Simulation enabled - waiting for transcript...",
  SKIPPING_SPEECH_RECOGNITION: "🔧 Skipping speech recognition in simulation mode",
  IGNORING_NO_SPEECH: "Ignoring no-speech error in simulation mode",
  NOT_AUTO_FINISHING: "In simulation mode, not auto-finishing on speech end"
};

// UI text constants
export const UI_TEXT = {
  APP_TITLE: "Mockly",
  FEEDBACK_TITLE: "Your Interview Feedback",
  INITIAL_TITLE: "Welcome to Mockly",
  START_INTERVIEW: "Start Interview",
  START_NEW_INTERVIEW: "Start New Interview",
  READY_MESSAGE: "When you're ready, click below to start your interview.",
  PROCESSING_TITLE: "Processing Your Interview",
  PROCESSING_MESSAGE: "Analyzing your response with AI-powered STAR method evaluation...",
  TRANSCRIPT_TITLE: "Transcript (live)",
  STAR_ANALYSIS_TITLE: "STAR Method Analysis",
  TIPS_TITLE: "Tips",
  TRANSCRIPT_TITLE_FEEDBACK: "Transcript",
  LISTENING: "Listening",
  NO_SITUATION: "No situation identified",
  NO_TASK: "No task identified",
  NO_ACTION: "No action identified",
  NO_RESULT: "No result identified",
  SKIP_INTERVIEW: "Done",
  SKIP_CONFIRMATION: "Are you sure you want to finish the interview with your current response?",
  END_INTERVIEW: "End",
  END_CONFIRMATION: "Are you sure you want to end the interview early and return to question selection?",
  NAVIGATION_CONFIRMATION: "You're currently in an interview session. Navigating away will end your current interview. Are you sure you want to continue?"
};

// Default response messages
export const DEFAULT_TIPS = {
  content: "Unable to analyze content at this time.",
  voice: "Reduce pauses and maintain consistent pace.",
  face: "Improve eye contact and maintain confident posture."
};




// Predefined behavioral interview questions
export const INTERVIEW_QUESTIONS = [
  {
    id: 'leadership',
    text: 'Tell me about a time when you had to lead a team through a difficult situation.',
    category: 'Leadership'
  },
  {
    id: 'conflict',
    text: 'Describe a situation where you had to resolve a conflict with a colleague.',
    category: 'Conflict Resolution'
  },
  {
    id: 'challenge',
    text: 'Give me an example of a challenging project you worked on and how you overcame obstacles.',
    category: 'Problem Solving'
  },
  {
    id: 'failure',
    text: 'Tell me about a time when you failed at something and what you learned from it.',
    category: 'Learning & Growth'
  },
  {
    id: 'innovation',
    text: 'Describe a time when you had to think outside the box to solve a problem.',
    category: 'Innovation'
  },
  {
    id: 'teamwork',
    text: 'Tell me about a time when you had to work with a difficult team member.',
    category: 'Teamwork'
  },
  {
    id: 'deadline',
    text: 'Give me an example of a time when you had to meet a tight deadline.',
    category: 'Time Management'
  },
  {
    id: 'change',
    text: 'Describe a situation where you had to adapt to a significant change at work.',
    category: 'Adaptability'
  }
]; 
