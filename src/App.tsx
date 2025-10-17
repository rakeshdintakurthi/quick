import { useState, useEffect } from 'react';
import { Code, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { db } from './lib/database';
import { isMock } from './lib/supabase';

type View = 'editor' | 'dashboard' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('editor');
  const [sessionId, setSessionId] = useState<string>('');
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState<string>('// Start typing your code here...\n');

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
  }

  function handleCodeChange(newCode: string) {
    setCode(newCode);
    if (sessionId) {
      localStorage.setItem(getStorageKey(sessionId, language), newCode);
      // optional: mirror to mock DB for analytics if desired
      db.codeContext.create(sessionId, newCode, language);
    }
  }

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
          />
        )}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  );
}

export default App;
