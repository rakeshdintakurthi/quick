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
      // Try to get session from shared session, or create a temporary one
      let sessionId = '';
      try {
        // Check if we can find the session from shared_sessions
        const { collaborationService } = await import('./lib/collaboration');
        const sharedSession = await collaborationService.joinSharedSession(shareCode);
        sessionId = sharedSession.session_id;
      } catch {
        // If not found, create a temporary session
        const session = await db.sessions.create('javascript', 'Quick Assist Session');
        sessionId = session.id;
      }
      
      const root = createRoot(document.getElementById('root')!);
      root.render(
        <StrictMode>
          <QuickAssistWindow sessionId={sessionId} shareCode={shareCode} />
        </StrictMode>
      );
    } catch (error) {
      console.error('Error initializing Quick Assist window:', error);
      const root = createRoot(document.getElementById('root')!);
      root.render(
        <div className="h-screen flex items-center justify-center bg-slate-900 text-red-400">
          Failed to initialize Quick Assist window. Make sure you have the correct share code.
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
