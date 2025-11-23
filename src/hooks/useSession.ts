import { useState, useEffect } from 'react';

const SESSION_KEY = 'voice_ai_session';

const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useSession = () => {
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Try to get existing session from localStorage
    let existingSession = localStorage.getItem(SESSION_KEY);
    
    if (!existingSession) {
      // Create new session if none exists
      existingSession = generateSessionId();
      localStorage.setItem(SESSION_KEY, existingSession);
    }
    
    setSessionId(existingSession);
  }, []);

  const resetSession = () => {
    const newSession = generateSessionId();
    localStorage.setItem(SESSION_KEY, newSession);
    setSessionId(newSession);
  };

  return {
    sessionId,
    resetSession,
  };
};
