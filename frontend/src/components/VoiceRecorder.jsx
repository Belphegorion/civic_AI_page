import React, { useState, useRef, useEffect } from 'react';
import Button from './ui/Button';

const MAX_DURATION = 120; // 2 minutes maximum recording time

export default function VoiceRecorder({ onRecordingComplete, onError }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Check if browser supports MediaRecorder
    const checkSupport = async () => {
      try {
        if (!navigator.mediaDevices || !window.MediaRecorder) {
          setIsSupported(false);
          onError?.('Voice recording is not supported in this browser');
          return;
        }

        // Check if we can get permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Clean up test stream
        setIsSupported(true);
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setPermissionDenied(true);
          onError?.('Microphone permission was denied');
        } else {
          setIsSupported(false);
          onError?.('Voice recording is not available');
        }
      }
    };

    checkSupport();
  }, [onError]);

  useEffect(() => {
    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const updateTimer = () => {
    setRecordingTime(prev => {
      if (prev >= MAX_DURATION) {
        stopRecording();
        return prev;
      }
      return prev + 1;
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        onRecordingComplete?.(audioBlob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('Recording error:', event.error);
        onError?.('An error occurred while recording');
        stopRecording();
      };

      mediaRecorderRef.current.start(1000); // Capture data every second
      setIsRecording(true);
      setRecordingTime(0);
      setIsPaused(false);

      timerRef.current = setInterval(updateTimer, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      if (err.name === 'NotAllowedError') {
        setPermissionDenied(true);
        onError?.('Microphone permission was denied');
      } else {
        onError?.('Failed to start recording');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(updateTimer, 1000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800" data-testid="voice-recorder-unsupported">
        Voice recording is not supported in your browser.
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800" data-testid="voice-recorder-permission-denied">
        Please allow microphone access to record audio.
        <Button
          onClick={() => navigator.mediaDevices.getUserMedia({ audio: true })}
          className="mt-2"
          variant="secondary"
        >
          Grant Permission
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="voice-recorder">
      <div className="flex items-center space-x-4">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            variant="secondary"
            className="flex items-center space-x-2"
            data-testid="start-recording"
          >
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span>Start Recording</span>
          </Button>
        ) : (
          <>
            {!isPaused ? (
              <Button
                onClick={pauseRecording}
                variant="secondary"
                data-testid="pause-recording"
              >
                Pause
              </Button>
            ) : (
              <Button
                onClick={resumeRecording}
                variant="secondary"
                data-testid="resume-recording"
              >
                Resume
              </Button>
            )}
            <Button
              onClick={stopRecording}
              variant="secondary"
              data-testid="stop-recording"
            >
              Stop Recording
            </Button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="flex items-center space-x-4" data-testid="recording-status">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></span>
            <span className="text-sm text-gray-600">
              {isPaused ? 'Paused' : 'Recording'}
            </span>
          </div>
          <span className="text-sm text-gray-600">
            {formatTime(recordingTime)} / {formatTime(MAX_DURATION)}
          </span>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${(recordingTime / MAX_DURATION) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="mt-4" data-testid="audio-preview">
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}
    </div>
  );
}
