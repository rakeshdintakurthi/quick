import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Provide a safe mock when env vars are missing so the UI can render in dev
type Row = Record<string, any>;
type TableName = 'sessions' | 'suggestions' | 'metrics' | 'code_context';

function createMockSupabase() {
  const store: Record<TableName, Row[]> = {
    sessions: [],
    suggestions: [],
    metrics: [],
    code_context: [],
  };

  function withQueryResult<T extends Row | Row | null>(data: T, ok = true) {
    return Promise.resolve({ data, error: ok ? null : new Error('Mock error') });
  }

  return {
    from(tableName: TableName) {
      let chain: any = {
        _table: tableName,
        _rows: store[tableName],
        _result: null as any,
        insert(payload: Row | Row[]) {
          const rows = Array.isArray(payload) ? payload : [payload];
          const inserted = rows.map((r) => ({
            id: cryptoRandomId(),
            created_at: new Date().toISOString(),
            total_suggestions: r.total_suggestions ?? 0,
            accepted_suggestions: r.accepted_suggestions ?? 0,
            ...r,
          }));
          store[tableName].push(...inserted);
          this._result = inserted;
          return this;
        },
        update(updates: Row) {
          this._updates = updates;
          return this;
        },
        upsert(payload: Row | Row[], _opts?: any) {
          const rows = Array.isArray(payload) ? payload : [payload];
          rows.forEach((r) => {
            const idx = store[tableName].findIndex((x) => matchCompositeKey(x, r));
            if (idx >= 0) {
              store[tableName][idx] = { ...store[tableName][idx], ...r };
            } else {
              store[tableName].push({ id: cryptoRandomId(), created_at: new Date().toISOString(), ...r });
            }
          });
          this._result = rows;
          return this;
        },
        select(_cols?: string) {
          this._result = [...store[tableName]];
          return this;
        },
        eq(col: string, val: any) {
          if (this._result == null) this._result = [...store[tableName]];
          this._result = this._result.filter((r: Row) => r[col] === val);
          // For update chains
          if (this._updates) {
            this._result.forEach((r: Row) => Object.assign(r, this._updates));
            this._updates = undefined;
          }
          return this;
        },
        order(_col: string, _opts?: any) {
          return this; // no-op for mock
        },
        limit(_n: number) {
          return this; // no-op for mock
        },
        single() {
          const first = Array.isArray(this._result) ? this._result[0] ?? null : this._result;
          return withQueryResult(first);
        },
        maybeSingle() {
          const first = Array.isArray(this._result) ? this._result[0] ?? null : this._result;
          return withQueryResult(first);
        },
      };
      return chain;
    },
  } as const;
}

function cryptoRandomId(): string {
  // Simple, sufficient for dev mock
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function matchCompositeKey(a: Row, b: Row): boolean {
  // Basic heuristic for metrics upsert on (date, language)
  if ('date' in a && 'language' in a && 'date' in b && 'language' in b) {
    return a.date === b.date && a.language === b.language;
  }
  return false;
}

export const isMock = !(supabaseUrl && supabaseKey);

export const supabase = !isMock
  ? createClient(supabaseUrl, supabaseKey)
  : (console.warn('[DEV] Missing Supabase env vars; using in-memory mock.'), createMockSupabase());

export interface Session {
  id: string;
  user_id?: string;
  language: string;
  project_name?: string;
  started_at: string;
  ended_at?: string;
  total_suggestions: number;
  accepted_suggestions: number;
  created_at: string;
}

export interface Suggestion {
  id: string;
  session_id: string;
  suggestion_type: 'completion' | 'optimization' | 'debug' | 'docstring';
  original_code: string;
  suggested_code: string;
  explanation: string;
  issue_detected?: string;
  language: string;
  line_number?: number;
  accepted: boolean;
  latency_ms: number;
  created_at: string;
}

export interface CodeContext {
  id: string;
  session_id: string;
  file_path?: string;
  code_content: string;
  language: string;
  dependencies?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Metric {
  id: string;
  date: string;
  language: string;
  total_suggestions: number;
  accepted_suggestions: number;
  avg_latency_ms: number;
  optimization_count: number;
  debug_count: number;
  docstring_count: number;
  created_at: string;
  updated_at: string;
}
