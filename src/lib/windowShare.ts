// Service for opening and managing shared editor windows (Quick Assist)

export interface WindowShareConfig {
  sessionId: string;
  shareCode: string;
  isHost: boolean;
  permissions: 'view' | 'edit';
}

class WindowShareService {
  private sharedWindows: Map<string, Window | null> = new Map();
  private shareConfig: WindowShareConfig | null = null;

  // Open a new window with the editor
  openEditorWindow(shareCode: string): Window | null {
    try {
      // Close existing window if any
      const existing = this.sharedWindows.get(shareCode);
      if (existing && !existing.closed) {
        existing.close();
      }

      // Calculate window position (center on screen)
      const width = 1200;
      const height = 800;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;

      // Open new window with editor
      const newWindow = window.open(
        `${window.location.origin}${window.location.pathname}?quickAssist=${shareCode}`,
        `QuickAssist-${shareCode}`,
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no`
      );

      if (newWindow) {
        this.sharedWindows.set(shareCode, newWindow);
        // Monitor window close
        const checkClosed = setInterval(() => {
          if (newWindow.closed) {
            this.sharedWindows.delete(shareCode);
            clearInterval(checkClosed);
          }
        }, 1000);
      }

      return newWindow;
    } catch (error) {
      console.error('Failed to open window:', error);
      return null;
    }
  }

  // Check if we're in a Quick Assist window
  isQuickAssistWindow(): boolean {
    const params = new URLSearchParams(window.location.search);
    return params.has('quickAssist');
  }

  // Get share code from URL
  getShareCodeFromURL(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('quickAssist');
  }

  // Close all shared windows
  closeAllWindows(): void {
    this.sharedWindows.forEach((win) => {
      if (win && !win.closed) {
        win.close();
      }
    });
    this.sharedWindows.clear();
  }

  // Close specific window
  closeWindow(shareCode: string): void {
    const win = this.sharedWindows.get(shareCode);
    if (win && !win.closed) {
      win.close();
    }
    this.sharedWindows.delete(shareCode);
  }

  // Post message to shared window
  postMessageToWindow(shareCode: string, message: any): void {
    const win = this.sharedWindows.get(shareCode);
    if (win && !win.closed) {
      win.postMessage(message, window.location.origin);
    }
  }

  setShareConfig(config: WindowShareConfig): void {
    this.shareConfig = config;
  }

  getShareConfig(): WindowShareConfig | null {
    return this.shareConfig;
  }
}

export const windowShareService = new WindowShareService();

