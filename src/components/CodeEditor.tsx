import { useEffect, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { aiService, AIRequest } from '../lib/aiService';
import { db } from '../lib/database';
import { Sparkles, Loader2, Zap } from 'lucide-react';
import QuickAssist from './QuickAssist';
import { collaborationService } from '../lib/collaboration';
import type { SharedSession } from '../lib/collaboration';

interface CodeEditorProps {
  sessionId: string;
  language: string;
  code: string;
  onCodeChange: (code: string) => void;
  onLanguageChange: (lang: string) => void;
  sharedSession?: SharedSession | null;
  isHost?: boolean;
}

export default function CodeEditor({ sessionId, language, code, onCodeChange, onLanguageChange, sharedSession, isHost }: CodeEditorProps) {
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    text: string;
    explanation: string;
    line: number;
    column: number;
    type: string;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState('');
  const [isQuickAssistOpen, setIsQuickAssistOpen] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const codeSyncTimeoutRef = useRef<NodeJS.Timeout>();
  const isApplyingRemoteChange = useRef(false);

  // Collaboration: Subscribe to shared session
  useEffect(() => {
    if (!sharedSession) {
      collaborationService.unsubscribe();
      return;
    }

      collaborationService.subscribeToSession(sharedSession, {
      onCodeChange: (newCode, userId) => {
        if (userId === collaborationService.getUserId()) return;
        isApplyingRemoteChange.current = true;
        onCodeChange(newCode);
        if (editorRef.current) {
          editorRef.current.setValue(newCode);
        }
        setTimeout(() => {
          isApplyingRemoteChange.current = false;
        }, 100);
      },
      onLanguageChange: (newLanguage, userId) => {
        if (userId === collaborationService.getUserId()) return;
        isApplyingRemoteChange.current = true;
        onLanguageChange(newLanguage);
        setTimeout(() => {
          isApplyingRemoteChange.current = false;
        }, 100);
      },
      onCursorChange: (line, column, userId) => {
        // Could add cursor indicators here in the future
      },
      onGuestJoin: (guestId) => {
        console.log('Guest joined:', guestId);
      },
      onGuestLeave: (guestId) => {
        console.log('Guest left:', guestId);
      },
    });

    return () => {
      collaborationService.unsubscribe();
    };
  }, [sharedSession]);

  // Collaboration: Sync code changes
  useEffect(() => {
    if (!sharedSession || isApplyingRemoteChange.current) return;
    
    // Don't sync if guest has view-only permissions
    if (!isHost && sharedSession.permissions === 'view') return;

    if (codeSyncTimeoutRef.current) {
      clearTimeout(codeSyncTimeoutRef.current);
    }

    codeSyncTimeoutRef.current = setTimeout(() => {
      collaborationService.syncCode(sharedSession.id, code, language);
    }, 500); // Debounce sync

    return () => {
      if (codeSyncTimeoutRef.current) {
        clearTimeout(codeSyncTimeoutRef.current);
      }
    };
  }, [code, sharedSession, language, isHost]);

  // Collaboration: Sync language changes
  useEffect(() => {
    if (!sharedSession || isApplyingRemoteChange.current) return;
    
    // Don't sync if guest has view-only permissions
    if (!isHost && sharedSession.permissions === 'view') return;
    
    collaborationService.syncLanguage(sharedSession.id, language);
  }, [language, sharedSession, isHost]);

  // Global keyboard shortcut handler for Ctrl+K
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickAssistOpen(true);
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
  ];

  function handleEditorDidMount(editor: editor.IStandaloneCodeEditor, monaco: Monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      handleManualSuggestion('completion');
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyD, () => {
      handleManualSuggestion('docstring');
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyO, () => {
      handleManualSuggestion('optimization');
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyB, () => {
      handleManualSuggestion('debug');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (suggestion) {
        applySuggestion();
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      setIsQuickAssistOpen(true);
    });
  }

  async function handleManualSuggestion(requestType: AIRequest['requestType']) {
    if (!editorRef.current || isAIProcessing) return;

    const editor = editorRef.current;
    const position = editor.getPosition();
    const code = editor.getValue();

    if (!position) return;

    await getSuggestion(code, position, requestType);
  }

  async function handleQuickAssistAction(requestType: AIRequest['requestType']) {
    if (!editorRef.current || isAIProcessing) return;
    const editor = editorRef.current;
    const position = editor.getPosition();
    const code = editor.getValue();
    if (!position) return;
    await getSuggestion(code, position, requestType);
  }

  async function getSuggestion(
    currentCode: string,
    position: { lineNumber: number; column: number },
    requestType: AIRequest['requestType']
  ) {
    setIsAIProcessing(true);
    const startTime = Date.now();

    try {
      const lines = currentCode.split('\n');
      const currentLine = lines[position.lineNumber - 1] || '';
      const surroundingCode = lines
        .slice(Math.max(0, position.lineNumber - 5), position.lineNumber + 5)
        .join('\n');

      const request: AIRequest = {
        code: surroundingCode,
        language,
        cursorPosition: { line: position.lineNumber, column: position.column },
        requestType,
      };

      const response = await aiService.getSuggestion(request);
      const latency = Date.now() - startTime;

      await db.suggestions.create({
        session_id: sessionId,
        suggestion_type: requestType,
        original_code: currentLine,
        suggested_code: response.suggestion,
        explanation: response.explanation,
        issue_detected: response.issue_detected,
        language,
        line_number: position.lineNumber,
        accepted: false,
        latency_ms: latency,
      });

      await db.sessions.incrementSuggestions(sessionId, false);

      setSuggestion({
        text: response.suggestion,
        explanation: response.explanation,
        line: position.lineNumber,
        column: position.column,
        type: requestType,
      });
    } catch (error) {
      console.error('Error getting suggestion:', error);
    } finally {
      setIsAIProcessing(false);
    }
  }

  function applySuggestion() {
    if (!editorRef.current || !suggestion) return;

    const editor = editorRef.current;
    const position = editor.getPosition();

    if (position) {
      editor.executeEdits('ai-suggestion', [
        {
          range: new monacoRef.current!.Range(
            suggestion.line,
            1,
            suggestion.line,
            suggestion.column + 100
          ),
          text: suggestion.text,
        },
      ]);

      db.sessions.incrementSuggestions(sessionId, true);
      setSuggestion(null);
    }
  }

  function dismissSuggestion() {
    setSuggestion(null);
  }

  function handleEditorChange(value: string | undefined) {
    // Check if user has edit permissions
    if (sharedSession && !isHost && sharedSession.permissions === 'view') {
      return; // Guest with view-only permissions cannot edit
    }

    const newCode = value || '';
    onCodeChange(newCode);
  }

  function stringifyForOutput(value: unknown): string {
    try {
      if (typeof value === 'string') return value;
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  function runCurrentCode() {
    setIsRunning(true);
    setRunOutput('');
    try {
      if (language !== 'javascript') {
        setRunOutput('Run is only supported for JavaScript in this demo.');
        return;
      }

      const logs: string[] = [];
      const originalLog = console.log;
      // Capture console.log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (console as any).log = (...args: unknown[]) => {
        logs.push(args.map(stringifyForOutput).join(' '));
      };
      let returnValue: unknown;
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function(code);
        returnValue = fn();
      } finally {
        console.log = originalLog;
      }
      const output = [] as string[];
      if (logs.length) output.push(logs.join('\n'));
      if (typeof returnValue !== 'undefined') {
        output.push(`[return] ${stringifyForOutput(returnValue)}`);
      }
      setRunOutput(output.join('\n'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setRunOutput(`Error: ${message}`);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold">AI Code Editor</h2>
          </div>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <button
            onClick={runCurrentCode}
            disabled={isRunning}
            className="ml-2 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm"
          >
            {isRunning ? 'Running…' : 'Run'}
          </button>
          <button
            onClick={() => setIsQuickAssistOpen(true)}
            className="ml-2 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center gap-2"
            title="Open Quick Assist (Ctrl+K)"
          >
            <Zap className="w-4 h-4" />
            Quick Assist
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600">Ctrl+K</kbd>
          <span>Quick Assist</span>
          <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600 ml-3">Ctrl+Space</kbd>
          <span>Suggest</span>
        </div>
      </div>

      <div className="flex-1 relative">
        {sharedSession && !isHost && sharedSession.permissions === 'view' && (
          <div className="absolute top-2 left-2 z-10 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <span>👁️ View Only Mode</span>
          </div>
        )}
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: true },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            tabSize: 2,
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            readOnly: sharedSession && !isHost && sharedSession.permissions === 'view',
          }}
        />

        {runOutput && (
          <div className="absolute left-4 right-4 bottom-4 bg-black/70 text-green-300 border border-slate-700 rounded p-3 max-h-40 overflow-auto font-mono text-sm whitespace-pre-wrap">
            {runOutput}
          </div>
        )}

        {isAIProcessing && (
          <div className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">AI Thinking...</span>
          </div>
        )}

        {suggestion && !isAIProcessing && (
          <div className="absolute top-4 right-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 max-w-md">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-white capitalize">
                  {suggestion.type} Suggestion
                </span>
              </div>
              <button
                onClick={dismissSuggestion}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="bg-slate-900 rounded p-3 mb-3 overflow-x-auto">
              <pre className="text-sm text-green-400">{suggestion.text}</pre>
            </div>
            <p className="text-sm text-slate-300 mb-3">{suggestion.explanation}</p>
            <div className="flex gap-2">
              <button
                onClick={applySuggestion}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
              >
                Apply (Ctrl+Enter)
              </button>
              <button
                onClick={dismissSuggestion}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <QuickAssist
          isOpen={isQuickAssistOpen}
          onClose={() => setIsQuickAssistOpen(false)}
          onActionSelect={handleQuickAssistAction}
        />
      </div>
    </div>
  );
}
