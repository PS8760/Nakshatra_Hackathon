"use client";

import { useState, useEffect } from 'react';

export default function TestVoicePage() {
  const [status, setStatus] = useState<string[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setStatus(prev => [...prev, `[${timestamp}] ${emoji} ${message}`]);
  };

  useEffect(() => {
    // Check if Speech Synthesis is available
    if (typeof window === 'undefined') {
      log('Running on server side', 'info');
      return;
    }

    if (!window.speechSynthesis) {
      log('Speech Synthesis API NOT available in this browser', 'error');
      return;
    }

    log('Speech Synthesis API is available', 'success');

    // Load voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      if (availableVoices.length > 0) {
        log(`Loaded ${availableVoices.length} voices`, 'success');
      } else {
        log('No voices loaded yet, waiting...', 'info');
      }
    };

    // Voices load asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    loadVoices();

    // Check speaking status every second
    const interval = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        setIsSpeaking(true);
      } else {
        setIsSpeaking(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const testBasicSpeech = () => {
    log('Testing basic speech...', 'info');

    if (!window.speechSynthesis) {
      log('Speech Synthesis not available', 'error');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance('Hello! This is a test. Can you hear me?');
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      log('Speech STARTED successfully!', 'success');
    };

    utterance.onend = () => {
      log('Speech COMPLETED successfully!', 'success');
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      log(`Speech ERROR: ${event.error} - ${event.message}`, 'error');
    };

    window.speechSynthesis.speak(utterance);
    log('Speech command sent to browser', 'info');
  };

  const testWithVoice = () => {
    if (voices.length === 0) {
      log('No voices available yet', 'error');
      return;
    }

    log('Testing with specific voice...', 'info');

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance('Testing with a specific voice. Can you hear this?');
    utterance.voice = voices[0];
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      log(`Speaking with voice: ${voices[0].name}`, 'success');
    };

    utterance.onend = () => {
      log('Speech completed', 'success');
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      log(`Error: ${event.error}`, 'error');
    };

    window.speechSynthesis.speak(utterance);
  };

  const testVoiceGuidance = async () => {
    log('Testing voice guidance library...', 'info');

    try {
      const { voiceEngine } = await import('@/lib/voiceGuidance');

      voiceEngine.speak({
        text: 'Testing voice guidance system. This should work if everything is set up correctly.',
        priority: 'normal',
        emotion: 'neutral',
        onStart: () => log('Voice guidance started', 'success'),
        onEnd: () => log('Voice guidance completed', 'success'),
        onError: (error) => log(`Voice guidance error: ${error}`, 'error'),
      });
    } catch (error) {
      log(`Failed to load voice guidance: ${error}`, 'error');
    }
  };

  const clearLog = () => {
    setStatus([]);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B1F2E',
      color: '#e8f4f0',
      padding: '40px 20px',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '32px',
          marginBottom: '10px',
          color: '#6B9EFF',
        }}>
          🔊 Voice System Diagnostic
        </h1>
        <p style={{
          color: 'rgba(232,244,240,0.7)',
          marginBottom: '30px',
        }}>
          Test if voice features are working in your browser
        </p>

        {/* Status */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(15,255,197,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>System Status</h3>
            {isSpeaking && (
              <span style={{
                background: '#6B9EFF',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}>
                🔊 SPEAKING
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <span style={{ color: 'rgba(232,244,240,0.6)', fontSize: '14px' }}>API Available:</span>
              <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                {typeof window !== 'undefined' && window.speechSynthesis ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div>
              <span style={{ color: 'rgba(232,244,240,0.6)', fontSize: '14px' }}>Voices Loaded:</span>
              <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                {voices.length > 0 ? `✅ ${voices.length}` : '⏳ Loading...'}
              </span>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(15,255,197,0.2)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Quick Tests</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={testBasicSpeech}
              style={{
                padding: '12px 20px',
                fontSize: '16px',
                background: '#6B9EFF',
                color: '#0B1F2E',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0dd9a8'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#6B9EFF'}
            >
              🔊 Test Basic Speech
            </button>

            <button
              onClick={testWithVoice}
              disabled={voices.length === 0}
              style={{
                padding: '12px 20px',
                fontSize: '16px',
                background: voices.length > 0 ? '#7BAAFF' : '#666',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: voices.length > 0 ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                transition: 'all 0.2s',
              }}
            >
              🎤 Test With Specific Voice
            </button>

            <button
              onClick={testVoiceGuidance}
              style={{
                padding: '12px 20px',
                fontSize: '16px',
                background: '#8B5CF6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s',
              }}
            >
              🎯 Test Voice Guidance Library
            </button>

            <button
              onClick={clearLog}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(232,244,240,0.7)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              🗑️ Clear Log
            </button>
          </div>
        </div>

        {/* Log */}
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '15px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '13px',
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px', fontFamily: 'Arial' }}>Console Log</h3>
          {status.length === 0 ? (
            <p style={{ color: 'rgba(232,244,240,0.5)' }}>Click a test button to start...</p>
          ) : (
            status.map((msg, i) => (
              <div key={i} style={{ marginBottom: '5px', color: 'rgba(232,244,240,0.9)' }}>
                {msg}
              </div>
            ))
          )}
        </div>

        {/* Available Voices */}
        {voices.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(15,255,197,0.2)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Available Voices ({voices.length})</h3>
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              fontSize: '13px',
            }}>
              {voices.slice(0, 10).map((voice, i) => (
                <div key={i} style={{
                  padding: '8px',
                  marginBottom: '5px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span>{voice.name}</span>
                  <span style={{ color: 'rgba(232,244,240,0.5)' }}>{voice.lang}</span>
                </div>
              ))}
              {voices.length > 10 && (
                <p style={{ color: 'rgba(232,244,240,0.5)', fontSize: '12px', marginTop: '10px' }}>
                  ... and {voices.length - 10} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div style={{
          background: 'rgba(15,255,197,0.1)',
          border: '1px solid rgba(15,255,197,0.3)',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '20px',
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Troubleshooting</h3>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
            <li>Check system volume is not muted</li>
            <li>Check browser tab is not muted (look for 🔇 icon)</li>
            <li>Try Chrome or Edge (best support)</li>
            <li>Check browser console (F12) for errors</li>
            <li>Try incognito mode (rules out extensions)</li>
            <li>Restart browser if needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
