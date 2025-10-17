import { supabase, Session, Suggestion, Metric } from './supabase';

export const db = {
  sessions: {
    async create(language: string, projectName?: string): Promise<Session> {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          language,
          project_name: projectName,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Partial<Session>): Promise<void> {
      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },

    async get(id: string): Promise<Session | null> {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async incrementSuggestions(id: string, accepted: boolean): Promise<void> {
      const session = await this.get(id);
      if (!session) return;

      await this.update(id, {
        total_suggestions: session.total_suggestions + 1,
        accepted_suggestions: accepted
          ? session.accepted_suggestions + 1
          : session.accepted_suggestions,
      });
    },
  },

  suggestions: {
    async create(suggestion: Omit<Suggestion, 'id' | 'created_at'>): Promise<Suggestion> {
      const { data, error } = await supabase
        .from('suggestions')
        .insert(suggestion)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async markAccepted(id: string): Promise<void> {
      const { error } = await supabase
        .from('suggestions')
        .update({ accepted: true })
        .eq('id', id);

      if (error) throw error;
    },

    async getBySession(sessionId: string): Promise<Suggestion[]> {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async getRecent(limit = 10): Promise<Suggestion[]> {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  },

  metrics: {
    async upsert(metric: Omit<Metric, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
      const { error } = await supabase
        .from('metrics')
        .upsert(
          {
            ...metric,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'date,language' }
        );

      if (error) throw error;
    },

    async getByDateRange(startDate: string, endDate: string): Promise<Metric[]> {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async getByLanguage(language: string, limit = 30): Promise<Metric[]> {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .eq('language', language)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },

    async getAll(limit = 100): Promise<Metric[]> {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  },

  codeContext: {
    async create(sessionId: string, codeContent: string, language: string, filePath?: string): Promise<void> {
      const { error } = await supabase
        .from('code_context')
        .insert({
          session_id: sessionId,
          code_content: codeContent,
          language,
          file_path: filePath,
        });

      if (error) throw error;
    },

    async update(id: string, codeContent: string): Promise<void> {
      const { error } = await supabase
        .from('code_context')
        .update({
          code_content: codeContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
  },
};
