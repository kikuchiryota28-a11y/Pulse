export const SOCIAL_VERSION = 2;

export const ACTIONS = Object.freeze({
  REACT: 'react',
  CHOOSE: 'choose',
  INTERPRET: 'interpret',
  FIND: 'find',
  CONNECT: 'connect',
  TRANSFORM: 'transform',
  COMPARE: 'compare',
  PREDICT: 'predict',
  ADD: 'add',
  REMIX: 'remix',
});

export const ACTION_CATALOG = Object.freeze({
  react: {
    label: 'React',
    inputType: 'choice',
    title: 'Leave a reaction.',
    prompt: 'Choose the part that catches you first.',
    hint: 'Your instinct becomes part of the Pulse. There is no wrong answer.',
    choices: ['This matters', 'This is strange', 'This is beautiful', 'This is easy to miss'],
    stateEffect: 'signal',
    outputLabel: 'A new signal was added.',
  },
  choose: {
    label: 'Choose',
    inputType: 'choice',
    title: 'What stands out?',
    prompt: 'Pick one part of the Pulse that deserves to move forward.',
    hint: 'You are choosing the direction, not solving the Pulse.',
    choices: ['The detail', 'The whole scene', 'The feeling', 'The question'],
    stateEffect: 'focus',
    outputLabel: 'The Pulse now has a stronger focus.',
  },
  interpret: {
    label: 'Interpret',
    inputType: 'text',
    title: 'Give it another meaning.',
    prompt: 'What could this mean if you looked at it differently?',
    hint: 'Add one perspective. You do not need to explain everything.',
    stateEffect: 'meaning',
    outputLabel: 'A new interpretation entered the trace.',
  },
  find: {
    label: 'Find',
    inputType: 'photo',
    title: 'Find something that connects.',
    prompt: 'Use the current state as a clue and bring one real thing from your surroundings into this Pulse.',
    hint: 'A place, object, texture, color, or detail is enough. Keep other people out of frame.',
    stateEffect: 'evidence',
    outputLabel: 'New evidence was brought into the Pulse.',
  },
  connect: {
    label: 'Connect',
    inputType: 'text',
    title: 'Connect two things.',
    prompt: 'Connect the current Pulse to one thing outside it.',
    hint: 'It can be visual, literal, emotional, cultural, or unexpected.',
    stateEffect: 'relationship',
    outputLabel: 'A new connection changed the context.',
  },
  transform: {
    label: 'Transform',
    inputType: 'mixed',
    title: 'Change the meaning.',
    prompt: 'Keep the current evidence visible, then change what it makes you think about.',
    hint: 'Build on the source. Do not erase it. Add a short note and, when useful, a new image.',
    stateEffect: 'meaning',
    outputLabel: 'The same evidence now points somewhere new.',
  },
  compare: {
    label: 'Compare',
    inputType: 'mixed',
    title: 'Show the contrast.',
    prompt: 'Add a second real scene that makes the current one feel different.',
    hint: 'Compare places, objects, scenes, or ideas. Do not compare people.',
    stateEffect: 'contrast',
    outputLabel: 'A contrast was added to the state.',
  },
  predict: {
    label: 'Predict',
    inputType: 'text',
    title: 'Make a prediction.',
    prompt: 'Based on what is here now, what could happen next?',
    hint: 'Make it concrete enough that another person could prove you right or wrong.',
    stateEffect: 'tension',
    outputLabel: 'A possible future was added.',
  },
  add: {
    label: 'Add',
    inputType: 'text',
    title: 'Add one thing.',
    prompt: 'Add the smallest useful piece that this Pulse is missing.',
    hint: 'A sentence, fact, question, observation, or detail can change the direction.',
    stateEffect: 'detail',
    outputLabel: 'The state gained a new detail.',
  },
  remix: {
    label: 'Remix',
    inputType: 'mixed',
    title: 'Remix what is here.',
    prompt: 'Keep the original trace visible, then make it yours.',
    hint: 'Preserve the source and add a new visual or note that changes the reading.',
    stateEffect: 'reframe',
    outputLabel: 'The source was reframed without disappearing.',
  },
});

const STOP_WORDS = new Set(['the', 'and', 'that', 'this', 'with', 'from', 'into', 'just', 'your', 'have', 'what', 'when', 'where', 'there', 'will', 'they', 'then', 'about', 'something']);

export function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function actorId() {
  if (typeof window === 'undefined') return '';
  const key = 'pulse:social:actor';
  let value = window.localStorage.getItem(key);
  if (!value) {
    value = `a_${crypto.randomUUID()}`;
    window.localStorage.setItem(key, value);
  }
  return value;
}

export function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

export function compactContent(value) {
  const parsed = parseJson(value, value);
  if (!parsed || typeof parsed !== 'object') return { type: 'text', text: cleanText(parsed, 500) };
  if (parsed.dataUrl && String(parsed.dataUrl).length > 2200000) {
    return { ...parsed, dataUrl: '' };
  }
  return parsed;
}

export function seedFromPulse(pulse) {
  return parseJson(pulse?.seed, {});
}

export function contentFromMove(move) {
  return parseJson(move?.content, {});
}

export function contentPreview(content, max = 120) {
  const c = parseJson(content, content) || {};
  if (c.text) return cleanText(c.text, max);
  if (c.note) return cleanText(c.note, max);
  if (c.summary) return cleanText(c.summary, max);
  if (c.choice) return cleanText(c.choice, max);
  if (c.caption) return cleanText(c.caption, max);
  if (c.type === 'photo' || c.type === 'mixed' || c.dataUrl) return c.caption ? cleanText(c.caption, max) : 'A new scene was added.';
  return 'A new move changed the Pulse.';
}

export function mediaFromContent(content) {
  const c = parseJson(content, content) || {};
  return c.dataUrl || c.imageUrl || c.mediaUrl || null;
}

export function normalizeSeed({ type = 'text', dataUrl = '', text = '' } = {}) {
  const clean = cleanText(text, 280);
  if (type === 'photo' && dataUrl) return { type: 'photo', dataUrl, text: clean };
  if (type === 'mixed' && (dataUrl || clean)) return { type: 'mixed', dataUrl: dataUrl || '', text: clean };
  return { type: 'text', text: clean };
}

export function deriveTitle({ text = '', intent = '', seedType = 'text' } = {}) {
  const source = cleanText(text || intent, 80);
  if (!source) return seedType === 'photo' ? 'A scene to change.' : 'A thought to change.';
  const words = source.split(' ').filter(Boolean).filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  const chosen = words.slice(0, 6).join(' ');
  return cleanText(chosen || source, 52).replace(/[.!?]+$/, '');
}

export function latestMove(moves = []) {
  return [...(moves || [])].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()).at(-1) || null;
}

export function participantCount(moves = []) {
  return new Set((moves || []).map((move) => move.actor_id).filter(Boolean)).size;
}

export function moveMedia(moves = []) {
  return [...(moves || [])].reverse().map((move) => mediaFromContent(move.content)).find(Boolean) || null;
}

function hash(value) {
  let h = 2166136261;
  for (const ch of String(value || 'pulse')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function choose(values, seed) {
  if (!values.length) return null;
  return values[hash(seed) % values.length];
}

function lexicalSignals(text) {
  const s = String(text || '').toLowerCase();
  return {
    place: /(street|city|town|park|room|home|station|shop|building|町|街|駅|公園|店|部屋)/.test(s),
    memory: /(remember|memory|past|childhood|思い出|記憶|昔)/.test(s),
    visual: /(photo|image|color|light|shadow|写真|色|光|影)/.test(s),
    people: /(friend|people|someone|person|友達|人|誰か)/.test(s),
    mystery: /(why|strange|unknown|mystery|weird|なぜ|不思議|知らない)/.test(s),
    contrast: /(different|opposite|before|after|contrast|違い|反対|前|後)/.test(s),
  };
}

const ACTION_ORDER = [ACTIONS.REACT, ACTIONS.CHOOSE, ACTIONS.INTERPRET, ACTIONS.FIND, ACTIONS.CONNECT, ACTIONS.TRANSFORM, ACTIONS.COMPARE, ACTIONS.PREDICT, ACTIONS.ADD, ACTIONS.REMIX];

function contextForAction(action, previousText) {
  const contextual = {
    react: `Look at “${previousText}” and follow your first instinct.`,
    choose: `From “${previousText}”, choose the piece you think should survive.`,
    interpret: `Look at “${previousText}” and give it a meaning the previous person did not state.`,
    find: `Use “${previousText}” as a clue and bring back one real thing that connects to it.`,
    connect: `Take “${previousText}” and connect it to one thing outside this Pulse.`,
    transform: `Keep “${previousText}” visible, but change what it means to you.`,
    compare: `Add a second scene that makes “${previousText}” feel different.`,
    predict: `Based on “${previousText}”, make one concrete prediction about what could happen next.`,
    add: `The Pulse has “${previousText}”. Add one detail it is missing.`,
    remix: `Remix “${previousText}” without erasing its source.`,
  };
  return contextual[action];
}

export function directorFor({ intent = '', pulse, moves = [] } = {}) {
  const seed = seedFromPulse(pulse);
  const latest = latestMove(moves);
  const latestContent = contentFromMove(latest);
  const previousText = contentPreview(latestContent, 110);
  const context = [pulse?.title, intent, seed?.text, previousText].filter(Boolean).join(' · ');
  const signals = lexicalSignals(context);
  const previous = latest?.action_type;

  const candidates = moves.length === 0
    ? [signals.visual ? ACTIONS.CHOOSE : ACTIONS.INTERPRET, ACTIONS.REACT, ACTIONS.ADD]
    : [...ACTION_ORDER];

  if (signals.place || signals.visual) candidates.push(ACTIONS.FIND);
  if (signals.memory || signals.mystery) candidates.push(ACTIONS.CONNECT, ACTIONS.INTERPRET);
  if (signals.contrast) candidates.push(ACTIONS.COMPARE, ACTIONS.TRANSFORM);
  if (signals.people) candidates.push(ACTIONS.CONNECT, ACTIONS.REACT);

  // Avoid repeating the same action while the chain is short. Once a Pulse has
  // enough history, repetition is allowed because the state may legitimately loop.
  let filtered = [...new Set(candidates)].filter((action) => action !== previous || moves.length >= 5);
  if (!filtered.length) filtered = [...ACTION_ORDER];

  // Prefer a different action family than the previous move. This gives short
  // chains an emergent rhythm instead of turning into repeated text prompts.
  const previousMeta = ACTION_CATALOG[previous];
  if (previousMeta && moves.length < 5) {
    const diverse = filtered.filter((action) => ACTION_CATALOG[action]?.inputType !== previousMeta.inputType || action === ACTIONS.FIND);
    if (diverse.length) filtered = diverse;
  }

  const action = choose(filtered, `${pulse?.id}:${moves.length}:${intent}:${latest?.id || ''}`) || ACTIONS.INTERPRET;
  const meta = ACTION_CATALOG[action];
  const prompt = moves.length > 0 ? (contextForAction(action, previousText) || meta.prompt) : meta.prompt;

  return {
    version: SOCIAL_VERSION,
    actionType: action,
    inputType: meta.inputType,
    title: meta.title,
    prompt,
    hint: meta.hint,
    choices: meta.choices || [],
    stateEffect: meta.stateEffect,
    outputLabel: meta.outputLabel,
    reason: `The current state suggests ${meta.label.toLowerCase()} because the next contribution should create a new ${meta.stateEffect || 'state'} rather than repeat the last move.`,
    context: previousText || null,
  };
}

export function buildState({ pulse, moves = [] } = {}) {
  const seed = seedFromPulse(pulse);
  const latest = latestMove(moves);
  const latestContent = contentFromMove(latest);
  const media = moveMedia(moves) || seed?.dataUrl || null;
  const latestAction = latest?.action_type || null;
  const latestMeta = latestAction ? ACTION_CATALOG[latestAction] : null;
  const history = (moves || []).slice(-4).map((move) => move.action_type).filter(Boolean);
  return {
    index: moves.length,
    title: pulse?.title || deriveTitle({ text: seed?.text, seedType: seed?.type }),
    summary: contentPreview(latestContent, 220) || seed?.text || 'A Pulse is waiting for its first change.',
    media,
    source: moves.length ? 'move' : 'seed',
    lastAction: latestAction,
    lastEffect: latestMeta?.stateEffect || null,
    lastOutput: latestMeta?.outputLabel || null,
    actionHistory: history,
    changedAt: latest?.created_at || pulse?.updated_at || pulse?.created_at || null,
  };
}

export function buildMoveContent({ inputType, text, photo, choice, caption } = {}) {
  const type = inputType || 'text';
  const base = { type };
  if (choice) return { ...base, choice: cleanText(choice, 100), summary: cleanText(choice, 100) };
  if (photo) {
    return { ...base, dataUrl: photo, caption: cleanText(caption, 160), summary: cleanText(caption, 160) || 'A new scene was added.' };
  }
  return { ...base, text: cleanText(text, 500), summary: cleanText(text, 500) };
}

export function scorePulse(pulse, moves = [], now = Date.now()) {
  const ageMinutes = Math.max(0, (now - new Date(pulse?.updated_at || pulse?.created_at || now).getTime()) / 60000);
  const freshness = Math.max(0, 80 - ageMinutes * 0.9);
  const participation = Math.min(60, Number(pulse?.participant_count || participantCount(moves)) * 14);
  const activity = Math.min(40, Number(pulse?.move_count || moves.length) * 4);
  const diversity = Math.min(30, new Set((moves || []).map((move) => move.action_type).filter(Boolean)).size * 5);
  const activeBonus = pulse?.status === 'active' ? 20 : 0;
  return Math.round(freshness + participation + activity + diversity + activeBonus);
}

export function formatRelative(value, now = Date.now()) {
  const t = new Date(value || now).getTime();
  const delta = Math.max(0, now - t);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return 'just now';
  if (delta < hour) return `${Math.floor(delta / minute)}m ago`;
  if (delta < day) return `${Math.floor(delta / hour)}h ago`;
  if (delta < 7 * day) return `${Math.floor(delta / day)}d ago`;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(t);
}

export function initials(actor) {
  const raw = String(actor || 'pulse').replace(/^a_/, '');
  return raw.slice(0, 2).toUpperCase();
}
