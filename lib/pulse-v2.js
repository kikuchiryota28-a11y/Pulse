export const PULSE_V4 = 9;
export const PEOPLE_PER_PULSE = 5;
export const MAX_STEPS = PEOPLE_PER_PULSE - 1;

export const ACTIONS = Object.freeze({
  OBSERVE: 'OBSERVE',
  CHOOSE: 'CHOOSE',
  FIND: 'FIND',
  CONNECT: 'CONNECT',
  INTERPRET: 'INTERPRET',
  COMPARE: 'COMPARE',
  PREDICT: 'PREDICT',
  CHALLENGE: 'CHALLENGE',
  TRANSFORM: 'TRANSFORM',
});

const META = Object.freeze({
  OBSERVE: { label: 'Observe', inputType: 'photo' },
  CHOOSE: { label: 'Choose', inputType: 'tap' },
  FIND: { label: 'Find', inputType: 'photo' },
  CONNECT: { label: 'Connect', inputType: 'text' },
  INTERPRET: { label: 'Interpret', inputType: 'text' },
  COMPARE: { label: 'Compare', inputType: 'compare' },
  PREDICT: { label: 'Predict', inputType: 'text' },
  CHALLENGE: { label: 'Challenge', inputType: 'challenge' },
  TRANSFORM: { label: 'Transform', inputType: 'text' },
});

export const START_TASK = Object.freeze({
  version: PULSE_V4,
  actionType: ACTIONS.OBSERVE,
  inputType: 'photo',
  title: 'Leave a starting point.',
  prompt: 'Capture one ordinary place or scene around you. The next person will decide what it becomes.',
  hint: 'No faces, private information, dangerous or restricted places.',
});

const TRANSITIONS = Object.freeze({
  OBSERVE: [ACTIONS.CHOOSE, ACTIONS.INTERPRET, ACTIONS.FIND],
  CHOOSE: [ACTIONS.INTERPRET, ACTIONS.FIND, ACTIONS.PREDICT],
  FIND: [ACTIONS.CONNECT, ACTIONS.COMPARE, ACTIONS.CHALLENGE],
  CONNECT: [ACTIONS.FIND, ACTIONS.INTERPRET, ACTIONS.TRANSFORM],
  INTERPRET: [ACTIONS.FIND, ACTIONS.PREDICT, ACTIONS.CHALLENGE],
  COMPARE: [ACTIONS.INTERPRET, ACTIONS.TRANSFORM, ACTIONS.CHALLENGE],
  PREDICT: [ACTIONS.FIND, ACTIONS.CHALLENGE, ACTIONS.TRANSFORM],
  CHALLENGE: [ACTIONS.FIND, ACTIONS.COMPARE, ACTIONS.TRANSFORM],
  TRANSFORM: [ACTIONS.INTERPRET, ACTIONS.FIND, ACTIONS.PREDICT],
});

const clip = (value, max = 100) => {
  const s = String(value || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

function stableChoice(items, seed) {
  if (!items.length) return ACTIONS.INTERPRET;
  let h = 0;
  for (const c of String(seed || 'pulse')) h = (h * 31 + c.charCodeAt(0)) | 0;
  return items[Math.abs(h) % items.length];
}

export function taskForAction(actionType, { state, previous } = {}) {
  const action = META[actionType] ? actionType : ACTIONS.INTERPRET;
  const previousTask = previous?.performedTask || previous?.task || null;
  const result = previous?.result || {};
  const context = clip(result.summary || result.text || result.note || result.claim || state?.summary || 'what the previous person left');
  const prompts = {
    OBSERVE: ['Leave one new scene for the chain to react to.'],
    CHOOSE: ['Choose one part of the current state that should survive into the next move.'],
    FIND: [`Use “${context}” as a clue and find one real thing around you that connects to it.`],
    CONNECT: [`Connect “${context}” to one different thing, place, memory, or idea. Say why in one sentence.`],
    INTERPRET: [`Give “${context}” a new meaning or angle that the previous person did not state.`],
    COMPARE: ['Add a second scene or object that makes the current result look different. Explain the difference.'],
    PREDICT: [`Based on “${context}”, predict one concrete thing the next person may encounter.`],
    CHALLENGE: [`Find one piece of evidence that pushes against “${context}”. Keep the challenge about a place, object, or idea.`],
    TRANSFORM: [`Change the meaning of “${context}” without changing the original evidence. One sentence.`],
  };
  const titles = {
    OBSERVE: 'Leave something behind.', CHOOSE: 'What survives?', FIND: 'Find the connection.',
    CONNECT: 'Make a connection.', INTERPRET: 'Change the meaning.', COMPARE: 'Show the contrast.',
    PREDICT: 'What comes next?', CHALLENGE: 'Push against it.', TRANSFORM: 'Turn it into something else.',
  };
  const hints = {
    OBSERVE: START_TASK.hint, CHOOSE: 'There is no correct choice. Pick what gives you the strongest instinct.',
    FIND: 'Use a place or object. Do not approach strangers.', CONNECT: 'The connection can be literal, visual, emotional, or conceptual.',
    INTERPRET: 'You are adding your perspective, not guessing another person’s mind.', COMPARE: 'Compare places, objects, scenes, or ideas—not people.',
    PREDICT: 'Make a concrete prediction that can be checked.', CHALLENGE: 'Disagree with the idea, not a person.', TRANSFORM: 'The goal is a meaningful change, not random nonsense.',
  };
  const task = previousTask?.actionType === action ? prompts[action][0] : stableChoice(prompts[action], `${context}:${action}:${state?.step || 0}`);
  return {
    version: PULSE_V4,
    actionType: action,
    inputType: META[action].inputType,
    title: titles[action],
    prompt: task,
    hint: hints[action],
    actionLabel: META[action].label,
    context: context || null,
    maxLength: 160,
  };
}

export function starterPayload({ artifact = null, text = '', creatorId = null } = {}) {
  const seedArtifact = artifact || (text ? { type: 'text', text: clip(text, 240) } : null);
  const seedSummary = text || (artifact ? 'Initial scene' : 'Initial state');
  return {
    v: PULSE_V4,
    creatorId: creatorId || null,
    state: { step: 0, summary: seedSummary, artifact: seedArtifact },
    artifact: seedArtifact,
    action: null,
    result: { summary: seedSummary, ...(text ? { text } : {}), ...(artifact ? { dataUrl: artifact.dataUrl } : {}) },
    performedTask: null,
    task: taskForAction(ACTIONS.CHOOSE, { state: { step: 0, summary: seedSummary } }),
    step: 0,
  };
}

export function parsePayload(value) {
  try {
    const p = typeof value === 'string' ? JSON.parse(value) : value;
    return p && (p.task || p.state || p.artifact || p.result) ? p : null;
  } catch { return null; }
}

export function payloadsOf(relay) {
  return (Array.isArray(relay?.steps) ? relay.steps : []).map(s => parsePayload(s?.output)).filter(Boolean);
}

export function latestPayload(relay) {
  const steps = payloadsOf(relay);
  return steps.at(-1) || parsePayload(relay?.seed) || null;
}

export function chainState(relay) {
  const seed = parsePayload(relay?.seed);
  return [seed, ...payloadsOf(relay)].filter(Boolean);
}

export function selectNextAction(previous, history = [], seed = '') {
  const current = previous?.action || previous?.task?.actionType || ACTIONS.OBSERVE;
  const recent = history.slice(-3);
  const candidates = (TRANSITIONS[current] || Object.values(ACTIONS)).filter(a => !recent.includes(a));
  return stableChoice(candidates.length ? candidates : (TRANSITIONS[current] || [ACTIONS.INTERPRET]), `${seed}:${history.length}:${current}`);
}

export function generateNextTask({ previous, history = [], seed = '', step = 1, state } = {}) {
  if (step > MAX_STEPS) return null;
  const action = step === 1 ? ACTIONS.CHOOSE : selectNextAction(previous, history, seed);
  return { ...taskForAction(action, { previous, state }), step, remaining: MAX_STEPS - step + 1 };
}

export function serializeStep({ artifact, action, result, step, task, nextTask, state } = {}) {
  const safeResult = result && typeof result === 'object' ? result : {};
  const nextState = {
    step,
    summary: clip(safeResult.summary || safeResult.text || safeResult.note || safeResult.claim || state?.summary || 'The state changed.'),
    artifact: artifact || null,
  };
  return JSON.stringify({
    v: PULSE_V4,
    state: nextState,
    artifact: artifact || null,
    action,
    result: safeResult,
    title: clip(safeResult.text || safeResult.summary || safeResult.note || safeResult.evidence || ''),
    step,
    performedTask: task || null,
    task: nextTask || null,
  });
}
