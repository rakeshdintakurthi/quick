import { supabase, isMock } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SharedSession {
  id: string;
  session_id: string;
  share_code: string;
  host_user_id: string | null;
  guest_user_id: string | null;
  permissions: 'view' | 'edit';
  is_active: boolean;
  connected_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface CodeSync {
  id: string;
  shared_session_id: string;
  user_id: string;
  code_content: string;
  language: string;
  cursor_line: number | null;
  cursor_column: number | null;
  action: 'edit' | 'cursor' | 'language';
  created_at: string;
}

export interface CollaborationState {
  isHost: boolean;
  isConnected: boolean;
  shareCode: string | null;
  permissions: 'view' | 'edit';
  guestId: string | null;
}

class CollaborationService {
  private channel: RealtimeChannel | null = null;
  private sessionId: string | null = null;
  private userId: string;
  private callbacks: {
    onCodeChange?: (code: string, userId: string) => void;
    onLanguageChange?: (language: string, userId: string) => void;
    onCursorChange?: (line: number, column: number, userId: string) => void;
    onGuestJoin?: (guestId: string) => void;
    onGuestLeave?: (guestId: string) => void;
  } = {};

  constructor() {
    // Generate a unique user ID for this session
    this.userId = this.getOrCreateUserId();
  }

  private getOrCreateUserId(): string {
    let userId = localStorage.getItem('collab_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('collab_user_id', userId);
    }
    return userId;
  }

  // Host: Create a shared session
  async createSharedSession(sessionId: string, permissions: 'view' | 'edit' = 'edit'): Promise<SharedSession> {
    if (isMock) {
      // Mock implementation
      const shareCode = this.generateShareCode();
      const mockSession: SharedSession = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        share_code: shareCode,
        host_user_id: this.userId,
        guest_user_id: null,
        permissions,
        is_active: true,
        connected_at: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(`shared_session_${shareCode}`, JSON.stringify(mockSession));
      return mockSession;
    }

    const { data, error } = await supabase
      .from('shared_sessions')
      .insert({
        session_id: sessionId,
        share_code: this.generateShareCode(),
        host_user_id: this.userId,
        permissions,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Guest: Join a shared session
  async joinSharedSession(shareCode: string): Promise<SharedSession> {
    if (isMock) {
      const sessionKey = `shared_session_${shareCode.toUpperCase()}`;
      const sessionData = localStorage.getItem(sessionKey);
      if (!sessionData) {
        throw new Error('Session not found');
      }
      const session: SharedSession = JSON.parse(sessionData);
      if (!session.is_active) {
        throw new Error('Session is not active');
      }
      session.guest_user_id = this.userId;
      session.connected_at = new Date().toISOString();
      localStorage.setItem(sessionKey, JSON.stringify(session));
      return session;
    }

    const { data, error } = await supabase
      .from('shared_sessions')
      .update({
        guest_user_id: this.userId,
        connected_at: new Date().toISOString(),
        is_active: true,
      })
      .eq('share_code', shareCode.toUpperCase())
      .eq('is_active', true)
      .select()
      .single();

    if (error || !data) {
      throw new Error('Session not found or no longer active');
    }

    return data;
  }

  // Start listening to real-time updates
  async subscribeToSession(
    sharedSession: SharedSession,
    callbacks: {
      onCodeChange?: (code: string, userId: string) => void;
      onLanguageChange?: (language: string, userId: string) => void;
      onCursorChange?: (line: number, column: number, userId: string) => void;
      onGuestJoin?: (guestId: string) => void;
      onGuestLeave?: (guestId: string) => void;
    }
  ): Promise<void> {
    this.callbacks = callbacks;
    this.sessionId = sharedSession.id;

    if (isMock) {
      // Mock: Use polling for mock mode
      this.startMockPolling(sharedSession);
      return;
    }

    // Subscribe to code_sync changes via Supabase Realtime
    this.channel = supabase
      .channel(`collaboration:${sharedSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'code_sync',
          filter: `shared_session_id=eq.${sharedSession.id}`,
        },
        (payload) => {
          const sync = payload.new as CodeSync;
          if (sync.user_id === this.userId) return; // Ignore own changes

          if (sync.action === 'edit') {
            callbacks.onCodeChange?.(sync.code_content, sync.user_id);
          } else if (sync.action === 'language') {
            callbacks.onLanguageChange?.(sync.language, sync.user_id);
          } else if (sync.action === 'cursor') {
            if (sync.cursor_line !== null && sync.cursor_column !== null) {
              callbacks.onCursorChange?.(sync.cursor_line, sync.cursor_column, sync.user_id);
            }
          }
        }
      )
      .subscribe();

    // Notify guest joined
    if (sharedSession.guest_user_id && sharedSession.guest_user_id !== this.userId) {
      callbacks.onGuestJoin?.(sharedSession.guest_user_id);
    }
  }

  private startMockPolling(sharedSession: SharedSession): void {
    let lastSyncId: string | null = null;
    const syncKey = `code_sync_${sharedSession.id}`;

    const poll = setInterval(() => {
      const syncs = JSON.parse(localStorage.getItem(syncKey) || '[]') as CodeSync[];
      const newSyncs = lastSyncId
        ? syncs.filter((s) => s.id > lastSyncId && s.user_id !== this.userId)
        : syncs.filter((s) => s.user_id !== this.userId);

      newSyncs.forEach((sync) => {
        if (sync.action === 'edit') {
          this.callbacks.onCodeChange?.(sync.code_content, sync.user_id);
        } else if (sync.action === 'language') {
          this.callbacks.onLanguageChange?.(sync.language, sync.user_id);
        } else if (sync.action === 'cursor') {
          if (sync.cursor_line !== null && sync.cursor_column !== null) {
            this.callbacks.onCursorChange?.(sync.cursor_line, sync.cursor_column, sync.user_id);
          }
        }
        lastSyncId = sync.id;
      });
    }, 500);

    // Store interval for cleanup
    (this as any).mockInterval = poll;
  }

  // Broadcast code changes
  async syncCode(
    sharedSessionId: string,
    code: string,
    language: string,
    cursorLine?: number,
    cursorColumn?: number
  ): Promise<void> {
    if (isMock) {
      const sync: CodeSync = {
        id: `${Date.now()}_${Math.random()}`,
        shared_session_id: sharedSessionId,
        user_id: this.userId,
        code_content: code,
        language,
        cursor_line: cursorLine ?? null,
        cursor_column: cursorColumn ?? null,
        action: 'edit',
        created_at: new Date().toISOString(),
      };
      const syncKey = `code_sync_${sharedSessionId}`;
      const syncs = JSON.parse(localStorage.getItem(syncKey) || '[]') as CodeSync[];
      syncs.push(sync);
      localStorage.setItem(syncKey, JSON.stringify(syncs.slice(-50))); // Keep last 50
      return;
    }

    await supabase.from('code_sync').insert({
      shared_session_id: sharedSessionId,
      user_id: this.userId,
      code_content: code,
      language,
      cursor_line: cursorLine ?? null,
      cursor_column: cursorColumn ?? null,
      action: 'edit',
    });
  }

  async syncLanguage(sharedSessionId: string, language: string): Promise<void> {
    if (isMock) {
      const sync: CodeSync = {
        id: `${Date.now()}_${Math.random()}`,
        shared_session_id: sharedSessionId,
        user_id: this.userId,
        code_content: '',
        language,
        cursor_line: null,
        cursor_column: null,
        action: 'language',
        created_at: new Date().toISOString(),
      };
      const syncKey = `code_sync_${sharedSessionId}`;
      const syncs = JSON.parse(localStorage.getItem(syncKey) || '[]') as CodeSync[];
      syncs.push(sync);
      localStorage.setItem(syncKey, JSON.stringify(syncs.slice(-50)));
      return;
    }

    await supabase.from('code_sync').insert({
      shared_session_id: sharedSessionId,
      user_id: this.userId,
      language,
      code_content: '',
      action: 'language',
    });
  }

  async syncCursor(sharedSessionId: string, line: number, column: number): Promise<void> {
    if (isMock) {
      const sync: CodeSync = {
        id: `${Date.now()}_${Math.random()}`,
        shared_session_id: sharedSessionId,
        user_id: this.userId,
        code_content: '',
        language: '',
        cursor_line: line,
        cursor_column: column,
        action: 'cursor',
        created_at: new Date().toISOString(),
      };
      const syncKey = `code_sync_${sharedSessionId}`;
      const syncs = JSON.parse(localStorage.getItem(syncKey) || '[]') as CodeSync[];
      syncs.push(sync);
      localStorage.setItem(syncKey, JSON.stringify(syncs.slice(-50)));
      return;
    }

    await supabase.from('code_sync').insert({
      shared_session_id: sharedSessionId,
      user_id: this.userId,
      cursor_line: line,
      cursor_column: column,
      action: 'cursor',
      code_content: '',
      language: '',
    });
  }

  // End collaboration session
  async endSession(sharedSessionId: string, isHost: boolean): Promise<void> {
    if (isMock) {
      // Clean up mock data
      const syncKey = `code_sync_${sharedSessionId}`;
      localStorage.removeItem(syncKey);
      return;
    }

    if (isHost) {
      await supabase.from('shared_sessions').update({ is_active: false }).eq('id', sharedSessionId);
    }
  }

  // Unsubscribe from real-time updates
  unsubscribe(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    if ((this as any).mockInterval) {
      clearInterval((this as any).mockInterval);
      (this as any).mockInterval = null;
    }

    this.sessionId = null;
    this.callbacks = {};
  }

  private generateShareCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  getUserId(): string {
    return this.userId;
  }
}

export const collaborationService = new CollaborationService();

