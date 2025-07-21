import { useEffect, useRef, useState, useCallback } from 'react';

const getSpeechRecognition = () => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
};

export const useVoiceCommands = (onCommand: (cmd: string) => void) => {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError('Speech Recognition not supported');
      return;
    }
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // TODO: make dynamic
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      setLastCommand(transcript);
      onCommand(transcript);
    };
    recognition.onerror = (e: any) => setError(e.error);
    recognition.onend = () => setListening(false);
  }, [onCommand]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setListening(true);
      recognitionRef.current.start();
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }, []);

  return { listening, lastCommand, error, startListening, stopListening };
};