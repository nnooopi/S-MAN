import React, { useState, useEffect } from 'react';

const TypewriterText = ({ text, className, speed = 50, onComplete }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (!isComplete && text.length > 0) {
      setIsComplete(true);
      if (onComplete) {
        setTimeout(onComplete, 500); // Small delay before callback
      }
    }
  }, [currentIndex, text, speed, onComplete, isComplete]);

  return (
    <span className={`${className} typewriter-text`} style={{
      borderRight: isComplete ? 'none' : `3px solid var(--sage-green)`,
      animation: isComplete ? 'none' : 'blink-caret 1s step-end infinite'
    }}>
      {displayText}
    </span>
  );
};

export default TypewriterText;