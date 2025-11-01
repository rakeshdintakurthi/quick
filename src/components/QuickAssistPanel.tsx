import { useState, useEffect } from 'react';
import {
  Users,
  Share2,
  Copy,
  Check,
  X,
  Eye,
  Edit3,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { collaborationService, type SharedSession } from '../lib/collaboration';
import { windowShareService } from '../lib/windowShare';

interface QuickAssistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onSessionStart: (sharedSession: SharedSession, isHost: boolean) => void;
  onSessionEnd: () => void;
  currentSharedSession: SharedSession | null;
  isHost: boolean;
}

export default function QuickAssistPanel({
  isOpen,
  onClose,
  sessionId,
  onSessionStart,
  onSessionEnd,
  currentSharedSession,
  isHost,
}: QuickAssistPanelProps) {
  const [mode, setMode] = useState<'menu' | 'host' | 'guest'>('menu');
  const [shareCode, setShareCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [permissions, setPermissions] = useState<'view' | 'edit'>('edit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMode('menu');
      setShareCode('');
      setError(null);
    }
  }, [isOpen]);

  async function handleCreateSession() {
    setLoading(true);
    setError(null);

    try {
      const sharedSession = await collaborationService.createSharedSession(sessionId, permissions);
      onSessionStart(sharedSession, true);
      setShareCode(sharedSession.share_code);
      setMode('host');
      
      // Open new window for Quick Assist
      const openedWindow = windowShareService.openEditorWindow(sharedSession.share_code);
      if (!openedWindow) {
        setError('Failed to open window. Please allow popups for this site.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinSession() {
    if (!shareCode.trim()) {
      setError('Please enter a share code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sharedSession = await collaborationService.joinSharedSession(shareCode.trim());
      onSessionStart(sharedSession, false);
      setMode('guest');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Session not found or expired');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCode() {
    if (!currentSharedSession) return;

    try {
      await navigator.clipboard.writeText(currentSharedSession.share_code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError('Failed to copy code');
    }
  }

  async function handleEndSession() {
    if (currentSharedSession) {
      await collaborationService.endSession(currentSharedSession.id, isHost);
      collaborationService.unsubscribe();
    }
    onSessionEnd();
    setMode('menu');
    setShareCode('');
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-750 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Quick Assist</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {currentSharedSession && mode !== 'menu' ? (
              // Active session view
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-green-400">
                      Session Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    {isHost
                      ? 'Quick Assist window is open. Share the code below for someone to join.'
                      : 'You are connected as a guest.'}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 bg-slate-900 rounded px-4 py-3 border border-slate-700">
                      <div className="text-xs text-slate-500 mb-1">Share Code</div>
                      <div className="text-2xl font-bold text-white font-mono tracking-wider">
                        {currentSharedSession.share_code}
                      </div>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded border border-slate-600 text-white transition-colors"
                    >
                      {copySuccess ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {isHost && (
                    <button
                      onClick={() => {
                        windowShareService.openEditorWindow(currentSharedSession.share_code);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Quick Assist Window
                    </button>
                  )}
                  {isHost && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>Guest Permissions:</span>
                        <span
                          className={`px-2 py-1 rounded ${
                            currentSharedSession.permissions === 'edit'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {currentSharedSession.permissions === 'edit' ? 'Edit' : 'View Only'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleEndSession}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium transition-colors"
                >
                  End Session
                </button>
              </div>
            ) : mode === 'menu' ? (
              // Main menu
              <div className="space-y-3">
                <button
                  onClick={() => setMode('host')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors text-left"
                >
                  <Share2 className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="font-medium text-white">Share Your Session</div>
                    <div className="text-xs text-slate-400">Let someone assist you</div>
                  </div>
                </button>

                <button
                  onClick={() => setMode('guest')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 transition-colors text-left"
                >
                  <Users className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="font-medium text-white">Join Session</div>
                    <div className="text-xs text-slate-400">Connect to assist someone</div>
                  </div>
                </button>
              </div>
            ) : mode === 'host' ? (
              // Host setup
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Guest Permissions
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPermissions('view')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        permissions === 'view'
                          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                          : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="font-medium">View Only</span>
                    </button>
                    <button
                      onClick={() => setPermissions('edit')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                        permissions === 'edit'
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="font-medium">Can Edit</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleCreateSession}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Session...
                    </>
                  ) : (
                    'Create Session'
                  )}
                </button>
              </div>
            ) : (
              // Guest join
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Enter Share Code
                  </label>
                  <input
                    type="text"
                    value={shareCode}
                    onChange={(e) => {
                      setShareCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                      setError(null);
                    }}
                    placeholder="ABC123"
                    maxLength={6}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-center text-2xl font-bold font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleJoinSession}
                  disabled={loading || shareCode.length !== 6}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Join Session'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

