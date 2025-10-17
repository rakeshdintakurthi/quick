import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Save, AlertCircle } from 'lucide-react';
import { aiService } from '../lib/aiService';

export default function Settings() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('openai_api_key');
    if (stored) {
      setApiKey(stored);
      setHasKey(true);
      aiService.setApiKey(stored);
    }
  }, []);

  function handleSave() {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      aiService.setApiKey(apiKey.trim());
      setHasKey(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  function handleClear() {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setHasKey(false);
  }

  return (
    <div className="h-full overflow-auto bg-slate-900">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-400" />
            Settings
          </h1>
          <p className="text-slate-400">Configure your AI-powered code editor</p>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Key className="w-5 h-5 text-blue-400 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-2">OpenAI API Key</h2>
              <p className="text-slate-400 text-sm mb-4">
                Enter your OpenAI API key to enable AI-powered suggestions. Without an API key,
                the editor will use mock responses for demonstration purposes.
              </p>
            </div>
          </div>

          {!hasKey && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-yellow-200 text-sm font-medium mb-1">
                  No API Key Configured
                </p>
                <p className="text-yellow-200/80 text-sm">
                  The editor is currently using mock AI responses. Add your OpenAI API key below to
                  enable real AI suggestions.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-slate-500 text-xs mt-2">
                Your API key is stored locally in your browser and never sent to our servers.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Save API Key
              </button>
              {hasKey && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {saved && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-green-200 text-sm">API key saved successfully!</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">How to Get an API Key</h2>
          <ol className="space-y-3 text-slate-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </span>
              <div>
                <p>
                  Visit{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    OpenAI API Keys
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                2
              </span>
              <div>
                <p>Sign in or create an OpenAI account</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                3
              </span>
              <div>
                <p>Click "Create new secret key" and copy the generated key</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                4
              </span>
              <div>
                <p>Paste the key in the field above and save</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-200 text-sm">
            <strong>Note:</strong> API usage may incur costs based on your OpenAI plan. The editor
            uses GPT-3.5-turbo by default for optimal performance and cost efficiency.
          </p>
        </div>
      </div>
    </div>
  );
}
