import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import QuickAssistWindow from './components/QuickAssistWindow';
import { windowShareService } from './lib/windowShare';
import { db } from './lib/database';
import './index.css';

// Check if we're in Quick Assist window mode
const shareCode = windowShareService.getShareCodeFromURL();

if (shareCode) {
  // Quick Assist window mode - show simplified editor view
  async function initQuickAssistWindow() {
    try {
      // Create a temporary session for the Quick Assist window
      // It will try to connect to the actual shared session
      const session = await db.sessions.create('javascript', 'Quick Assist Session');
      
      const root = createRoot(document.getElementById('root')!);
      root.render(
        <StrictMode>
          <QuickAssistWindow sessionId={session.id} shareCode={shareCode} />
        </StrictMode>
      );
    } catch (error) {
      console.error('Error initializing Quick Assist window:', error);
      const root = createRoot(document.getElementById('root')!);
      root.render(
        <div className="h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center max-w-md px-6">
            <div className="text-red-400 mb-4">⚠️ Error initializing Quick Assist window</div>
            <p className="text-slate-300 mb-2">Share Code: <span className="font-mono font-bold text-blue-400">{shareCode}</span></p>
            <p className="text-sm text-slate-400">Please make sure the host has created a Quick Assist session with this code.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
  }
  initQuickAssistWindow();
} else {
  // Normal app mode
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
