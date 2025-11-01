import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Users } from 'lucide-react';
import CodeEditor from './CodeEditor';
import { windowShareService } from '../lib/windowShare';
import { db } from '../lib/database';
import { collaborationService, type SharedSession } from '../lib/collaboration';

interface QuickAssistWindowProps {
  sessionId: string;
  shareCode: string;
  onClose?: () => void;
}

export default function QuickAssistWindow({ sessionId, shareCode, onClose }: QuickAssistWindowProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set window title
    document.title = `Quick Assist - ${shareCode}`;
    
    // Listen for messages from parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'code-update') {
        setIsConnected(true);
        // Handle code updates if needed
      } else if (event.data.type === 'close') {
        if (onClose) onClose();
        window.close();
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notify parent window that we're ready
    if (window.opener) {
      window.opener.postMessage({ type: 'window-ready', shareCode }, window.location.origin);
      setIsConnected(true);
    } else {
      // If no opener, we're in a direct link (for guest access)
      setIsConnected(true);
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [shareCode, onClose]);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 border border-red-500/30 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-semibold text-white">Connection Error</h2>
          </div>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected && !sharedSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center max-w-md px-6">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 mb-2">Waiting for session to start...</p>
          <p className="text-sm text-slate-400 mb-4">Share Code: <span className="font-mono font-bold text-blue-400">{shareCode}</span></p>
          <p className="text-xs text-slate-500">The host needs to create a Quick Assist session with this code.</p>
          <p className="text-xs text-slate-500 mt-2">This window will connect automatically when ready.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Quick Assist Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Quick Assist Mode</span>
          <span className="text-xs text-slate-400 font-mono">{shareCode}</span>
        </div>
        <button
          onClick={() => window.close()}
          className="text-slate-400 hover:text-white text-sm px-3 py-1 rounded hover:bg-slate-700"
        >
          Close
        </button>
      </div>
      
      {/* Editor - We'll need to fetch the code from the session */}
      <div className="flex-1">
        <QuickAssistEditor sessionId={sessionId} shareCode={shareCode} />
      </div>
    </div>
  );
}

function QuickAssistEditor({ sessionId, shareCode }: { sessionId: string; shareCode: string }) {
  const [code, setCode] = useState<string>('// Waiting for connection...\n// Code will appear here when host shares.');
  const [language, setLanguage] = useState('javascript');
  const [isConnected, setIsConnected] = useState(false);
  const [sharedSession, setSharedSession] = useState<SharedSession | null>(null);
  const [isHost, setIsHost] = useState(false);

  // Try to join or create collaboration session
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let retryInterval: NodeJS.Timeout | undefined;
    
    async function connectToSession() {
      try {
        // Try to join existing session
        const session = await collaborationService.joinSharedSession(shareCode);
        setSharedSession(session);
        setIsHost(false);
        setIsConnected(true);
        
        // Subscribe to real-time updates
        await collaborationService.subscribeToSession(session, {
          onCodeChange: (newCode, userId) => {
            if (userId === collaborationService.getUserId()) return;
            setCode(newCode);
            setIsConnected(true);
          },
          onLanguageChange: (newLanguage, userId) => {
            if (userId === collaborationService.getUserId()) return;
            setLanguage(newLanguage);
          },
          onCursorChange: () => {
            // Could add cursor indicators
          },
          onGuestJoin: () => {
            console.log('Guest joined');
          },
          onGuestLeave: () => {
            console.log('Guest left');
          },
        });
        
        // Clear retry interval if session found
        if (retryInterval) {
          clearInterval(retryInterval);
        }
      } catch (error) {
        console.log('Session not yet available, will keep trying...', error);
        setIsConnected(false);
        
        // Setup local window sync as fallback
        cleanup = setupLocalWindowSync();
        
        // Retry to join session every 2 seconds (session might be created soon)
        if (!retryInterval) {
          retryInterval = setInterval(() => {
            connectToSession();
          }, 2000);
        }
      }
    }

    connectToSession();

    return () => {
      collaborationService.unsubscribe();
      if (cleanup) cleanup();
      if (retryInterval) clearInterval(retryInterval);
    };
  }, [shareCode, sessionId, language]);

  function setupLocalWindowSync(): (() => void) | undefined {
    // Listen for code updates from parent window (local popup)
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'code-update') {
        setCode(event.data.code);
        setIsConnected(true);
      } else if (event.data.type === 'language-update') {
        setLanguage(event.data.language);
      } else if (event.data.type === 'sync-state') {
        setCode(event.data.code || code);
        setLanguage(event.data.language || language);
        setIsConnected(true);
      }
    };

    window.addEventListener('message', handleMessage);

    // Request current code from parent
    if (window.opener) {
      // Poll for code updates every 500ms
      const interval = setInterval(() => {
        window.opener?.postMessage({ type: 'request-code', shareCode }, window.location.origin);
      }, 500);
      
      // Also mark as connected for local windows
      setIsConnected(true);

      return () => {
        clearInterval(interval);
        window.removeEventListener('message', handleMessage);
      };
    } else {
      // No opener - try to load from localStorage (direct link scenario)
      // This allows the window to work standalone while waiting for session
      const storageKey = `editor-code:${sessionId}:${language}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCode(saved);
        setIsConnected(true);
      } else {
        // Set default code so editor is usable
        setCode('// Waiting for host to share code...\n// You can start typing here in the meantime.\n');
        setIsConnected(true);
      }
      return () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }

  function handleCodeChange(newCode: string) {
    setCode(newCode);
    
    // Sync via collaboration service (remote)
    if (sharedSession) {
      collaborationService.syncCode(sharedSession.id, newCode, language);
    }
    
    // Send update back to parent window (local popup)
    if (window.opener && !sharedSession) {
      window.opener.postMessage(
        { type: 'guest-code-update', code: newCode, shareCode },
        window.location.origin
      );
    }
    
    // Also save to localStorage
    const storageKey = `editor-code:${sessionId}:${language}`;
    localStorage.setItem(storageKey, newCode);
  }

  function handleLanguageChange(newLanguage: string) {
    setLanguage(newLanguage);
    
    // Sync via collaboration service (remote)
    if (sharedSession) {
      collaborationService.syncLanguage(sharedSession.id, newLanguage);
    }
    
    // Send to parent window (local popup)
    if (window.opener && !sharedSession) {
      window.opener.postMessage(
        { type: 'language-update', language: newLanguage, shareCode },
        window.location.origin
      );
    }
  }

  return (
    <CodeEditor
      sessionId={sessionId}
      language={language}
      code={code}
      onCodeChange={handleCodeChange}
      onLanguageChange={handleLanguageChange}
      sharedSession={sharedSession}
      isHost={isHost}
    />
  );
}

