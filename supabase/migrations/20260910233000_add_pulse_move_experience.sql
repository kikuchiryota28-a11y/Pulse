-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  impact_score INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Pulses Table
CREATE TABLE IF NOT EXISTS public.pulses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general' NOT NULL,
  current_state_id UUID,
  is_frozen BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Pulse State Nodes Table
CREATE TABLE IF NOT EXISTS public.pulse_state_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_id UUID NOT NULL REFERENCES public.pulses(id) ON DELETE CASCADE,
  parent_node_id UUID REFERENCES public.pulse_state_nodes(id) ON DELETE SET NULL,
  version_index INT DEFAULT 0 NOT NULL,
  state_data JSONB NOT NULL,
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Pulse Moves Table
CREATE TABLE IF NOT EXISTS public.pulse_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_id UUID NOT NULL REFERENCES public.pulses(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.pulse_state_nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  move_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  resulting_node_id UUID REFERENCES public.pulse_state_nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Foreign Keys & Indexes
ALTER TABLE public.pulses 
  ADD CONSTRAINT fk_pulses_current_state 
  FOREIGN KEY (current_state_id) REFERENCES public.pulse_state_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_state_nodes_pulse_id ON public.pulse_state_nodes(pulse_id);
CREATE INDEX IF NOT EXISTS idx_moves_pulse_id ON public.pulse_moves(pulse_id);
CREATE INDEX IF NOT EXISTS idx_moves_user_id ON public.pulse_moves(user_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_state_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Read Pulses" ON public.pulses FOR SELECT USING (true);
CREATE POLICY "Public Read State Nodes" ON public.pulse_state_nodes FOR SELECT USING (true);
CREATE POLICY "Public Read Moves" ON public.pulse_moves FOR SELECT USING (true);

-- RPC for State Transition
CREATE OR REPLACE FUNCTION public.submit_pulse_move(
  p_pulse_id UUID,
  p_target_node_id UUID,
  p_move_type TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_node RECORD;
  v_new_node_id UUID;
  v_move_id UUID;
  v_next_version INT;
  v_new_state_data JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  SELECT * INTO v_current_node
  FROM public.pulse_state_nodes
  WHERE id = p_target_node_id AND pulse_id = p_pulse_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target state node not found';
  END IF;

  v_next_version := v_current_node.version_index + 1;

  IF p_move_type = 'CHOOSE' THEN
    v_new_state_data := jsonb_build_object(
      'visual_url', v_current_node.state_data->>'visual_url',
      'selected_option', p_payload->>'choice_id',
      'bias_ratio', (COALESCE((v_current_node.state_data->>'bias_ratio')::int, 50) + (p_payload->>'delta')::int)
    );
  ELSE
    v_new_state_data := v_current_node.state_data || p_payload;
  END IF;

  INSERT INTO public.pulse_state_nodes (
    pulse_id, parent_node_id, version_index, state_data, created_by_user_id
  ) VALUES (
    p_pulse_id, p_target_node_id, v_next_version, v_new_state_data, v_user_id
  ) RETURNING id INTO v_new_node_id;

  INSERT INTO public.pulse_moves (
    pulse_id, target_node_id, user_id, move_type, payload, resulting_node_id
  ) VALUES (
    p_pulse_id, p_target_node_id, v_user_id, p_move_type, p_payload, v_new_node_id
  ) RETURNING id INTO v_move_id;

  UPDATE public.pulses
  SET current_state_id = v_new_node_id
  WHERE id = p_pulse_id;

  UPDATE public.profiles
  SET impact_score = impact_score + 10
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_node_id', v_new_node_id,
    'move_id', v_move_id,
    'version', v_next_version
  );
END;
$$;
