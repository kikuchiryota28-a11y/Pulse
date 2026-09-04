import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dzwpljcjwcincudgjvcu.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UL6BrL8Cql9xanuKIG148Q_CduUne6O';

const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Every client-side pulse_moves write is routed through the authoritative
// database transaction. Read/query behavior remains the normal Supabase builder.
const rawFrom = client.from.bind(client);
client.from = (table) => {
  const builder = rawFrom(table);
  if (table !== 'pulse_moves') return builder;

  builder.insert = (values) => {
    const row = Array.isArray(values) ? values[0] : values;
    if (!row || (Array.isArray(values) && values.length !== 1)) {
      return Promise.resolve({ data: null, error: new Error('Pulse moves accept one move per submission.') });
    }

    return client.rpc('submit_pulse_move', {
      p_pulse_id: row.pulse_id,
      p_actor_id: row.actor_id,
      p_parent_move_id: row.parent_move_id ?? null,
      p_action_type: row.action_type,
      p_input_type: row.input_type,
      p_prompt: row.prompt,
      p_content: row.content ?? {},
      p_submission_id: row.submission_id ?? null,
      p_expected_revision: row.revision_before ?? row.state_before?.revision ?? null,
    });
  };

  return builder;
};

export const supabase = client;
