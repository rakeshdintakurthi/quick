import { useState, useEffect } from 'react';
import { Code, BarChart3, Settings as SettingsIcon, Users } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import QuickAssistPanel from './components/QuickAssistPanel';
import { db } from './lib/database';
import { isMock } from './lib/supabase';
import { windowShareService } from './lib/windowShare';
import type { SharedSession } from './lib/collaboration';

type View = 'editor' | 'dashboard' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('editor');
  const [sessionId, setSessionId] = useState<string>('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState<string>('// Start typing your code here...\n');
  const [isQuickAssistPanelOpen, setIsQuickAssistPanelOpen] = useState(false);
  const [sharedSession, setSharedSession] = useState<SharedSession | null>(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    initializeSession();
  }, []);

  async function initializeSession() {
    try {
      const session = await db.sessions.create(language, 'AI Code Editor Demo');
      setSessionId(session.id);
      // try load from localStorage
      const saved = localStorage.getItem(getStorageKey(session.id, language));
      if (saved != null) setCode(saved);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  }

  async function handleLanguageChange(newLanguage: string) {
    setLanguage(newLanguage);
    if (sessionId) {
      await db.sessions.update(sessionId, { language: newLanguage });
    }
    const saved = sessionId ? localStorage.getItem(getStorageKey(sessionId, newLanguage)) : null;
    if (saved != null) setCode(saved);
    
    // Send language updates to Quick Assist windows
    if (sharedSession) {
      const shareCode = sharedSession.share_code;
      windowShareService.postMessageToWindow(shareCode, {
        type: 'language-update',
        language: newLanguage,
        shareCode,
      });
    }
  }

  function handleCodeChange(newCode: string) {
    setCode(newCode);
    if (sessionId) {
      localStorage.setItem(getStorageKey(sessionId, language), newCode);
      // optional: mirror to mock DB for analytics if desired
      db.codeContext.create(sessionId, newCode, language);
      
      // Send code updates to Quick Assist windows
      if (sharedSession) {
        const shareCode = sharedSession.share_code;
        windowShareService.postMessageToWindow(shareCode, {
          type: 'code-update',
          code: newCode,
          shareCode,
        });
      }
    }
  }
  
  // Listen for code updates from Quick Assist windows (guest edits)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'guest-code-update' && sharedSession) {
        setCode(event.data.code);
        const storageKey = getStorageKey(sessionId, language);
        localStorage.setItem(storageKey, event.data.code);
      } else if (event.data.type === 'request-code' && sharedSession) {
        // Respond to code requests from Quick Assist windows
        const shareCode = event.data.shareCode;
        windowShareService.postMessageToWindow(shareCode, {
          type: 'sync-state',
          code,
          language,
          shareCode,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [code, language, sharedSession, sessionId]);

  function getStorageKey(sessId: string, lang: string) {
    return `editor-code:${sessId}:${lang}`;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {isMock && (
        <div className="bg-amber-500 text-black text-center text-sm py-1">
          Running with in-memory mock database (no Supabase env vars)
        </div>
      )}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Code Editor</h1>
              <p className="text-xs text-slate-400">Context-aware coding assistant</p>
            </div>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setCurrentView('editor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'editor'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Code className="w-4 h-4" />
              Editor
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'settings'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>
            {currentView === 'editor' && sessionId && (
              <button
                onClick={() => setIsQuickAssistPanelOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  sharedSession
                    ? 'bg-green-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title="Quick Assist - Share or Join Session"
              >
                <Users className="w-4 h-4" />
                {sharedSession ? 'Collaborating' : 'Quick Assist'}
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {currentView === 'editor' && sessionId && (
          <CodeEditor
            sessionId={sessionId}
            language={language}
            code={code}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
            sharedSession={sharedSession}
            isHost={isHost}
          />
        )}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'settings' && <Settings />}
      </main>

      {sessionId && (
        <QuickAssistPanel
          isOpen={isQuickAssistPanelOpen}
          onClose={() => setIsQuickAssistPanelOpen(false)}
          sessionId={sessionId}
          onSessionStart={(session, host) => {
            setSharedSession(session);
            setIsHost(host);
          }}
          onSessionEnd={() => {
            setSharedSession(null);
            setIsHost(false);
          }}
          currentSharedSession={sharedSession}
          isHost={isHost}
        />
      )}
    </div>
  );
}

export default App;
