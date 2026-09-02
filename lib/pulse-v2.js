export const PULSE_V3 = 8;
export const PEOPLE_PER_PULSE = 5;
export const MAX_STEPS = PEOPLE_PER_PULSE - 1;

export const ACTIONS = Object.freeze({
  CAPTURE: 'CAPTURE',
  FIND: 'FIND',
  CHOOSE: 'CHOOSE',
  INTERPRET: 'INTERPRET',
  COMPARE: 'COMPARE',
  CHALLENGE: 'CHALLENGE',
  PREDICT: 'PREDICT',
});

const META = Object.freeze({
  CAPTURE: { label: 'Capture', inputType: 'photo' },
  FIND: { label: 'Find', inputType: 'photo' },
  CHOOSE: { label: 'Choose', inputType: 'tap' },
  INTERPRET: { label: 'New Angle', inputType: 'text' },
  COMPARE: { label: 'Compare', inputType: 'compare' },
  CHALLENGE: { label: 'Challenge', inputType: 'challenge' },
  PREDICT: { label: 'Predict', inputType: 'text' },
});

export const START_TASK = Object.freeze({
  version: PULSE_V3,
  actionType: ACTIONS.CAPTURE,
  inputType: 'photo',
  title: 'Start the chain.',
  prompt: 'Take a photo of one thing around you that most people are overlooking.',
  hint: 'Avoid people, selfies, and dangerous places.',
});

const TRANSITIONS = Object.freeze({
  CAPTURE: [ACTIONS.CHOOSE, ACTIONS.INTERPRET],
  CHOOSE: [ACTIONS.INTERPRET, ACTIONS.PREDICT],
  INTERPRET: [ACTIONS.FIND, ACTIONS.PREDICT],
  FIND: [ACTIONS.CHALLENGE, ACTIONS.COMPARE],
  CHALLENGE: [ACTIONS.CAPTURE, ACTIONS.COMPARE],
  COMPARE: [ACTIONS.INTERPRET, ACTIONS.CHALLENGE],
  PREDICT: [ACTIONS.FIND, ACTIONS.CAPTURE],
});

function clip(value, max = 90) {
  const s = String(value || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function stableChoice(items, seed) {
  let h = 0;
  for (const c of String(seed || 'pulse')) h = (h * 31 + c.charCodeAt(0)) | 0;
  return items[Math.abs(h) % items.length];
}

export function taskForAction(actionType, { previous } = {}) {
  const action = META[actionType] ? actionType : ACTIONS.CHOOSE;
  const previousTask = previous?.performedTask || previous?.task || null;
  const context = previous?.result?.summary || previous?.result?.text || previous?.result?.claim || '';
  const instruction = clip(previousTask?.prompt || 'the previous move');
  const result = clip(context || 'the result the previous person left');

  const tasks = {
    CHOOSE: [
      `Look at what the previous person left after “${instruction}” and tap one place to carry forward.`,
      'Choose one part of the previous result to pass into the next move.',
    ],
    INTERPRET: [
      `Use the previous result “${result}” to create one new way of seeing it.`,
      'Describe one feature of the previous result that has not been noticed yet.',
    ],
    FIND: [
      `Find and photograph one thing around you connected to “${result}”.`,
      'Use the previous result as a clue and find one thing in another place that shares its feature.',
    ],
    CHALLENGE: [
      `Show one nearby thing that suggests a different possibility from “${result}”. Leave a photo and one sentence.`,
    ],
    COMPARE: [
      'Photograph one thing that makes the previous result look meaningfully different. Add one sentence explaining the difference.',
    ],
    PREDICT: [
      'Based on the chain so far, predict one thing or feature that might appear next.',
      `From “${result}”, predict in one sentence how the chain might change next.`,
    ],
    CAPTURE: [
      'Respond to the chain so far by photographing one image that would be interesting to pass to the next person.',
    ],
  };

  const titles = {
    CHOOSE: 'What should stay?',
    INTERPRET: 'Create a new angle.',
    FIND: 'Find a connection.',
    CHALLENGE: 'Add another possibility.',
    COMPARE: 'Put the other side next to it.',
    PREDICT: 'What appears next?',
    CAPTURE: 'Leave something for the next person.',
  };

  const hints = {
    CHOOSE: 'There is no correct answer. Trust your first instinct.',
    INTERPRET: 'You do not need to guess why they chose it. Leave your own view.',
    FIND: 'Avoid people, dangerous places, and restricted areas.',
    CHALLENGE: 'Use a difference in an object or place, not a person.',
    COMPARE: 'Compare places, objects, or scenes—not people.',
    PREDICT: 'Predict what appears next, not what another person is thinking.',
    CAPTURE: 'Use a place, object, or scene—not a person.',
  };

  return {
    version: PULSE_V3,
    actionType: action,
    inputType: META[action].inputType,
    title: titles[action],
    prompt: stableChoice(tasks[action], `${context}:${instruction}:${action}:${previous?.step || 0}`),
    hint: hints[action],
    actionLabel: META[action].label,
    context: context || null,
    maxLength: 120,
  };
}

export function starterPayload(photoData, creatorId = null) {
  return {
    v: PULSE_V3,
    creatorId: creatorId || null,
    artifact: { type: 'photo', dataUrl: photoData },
    action: ACTIONS.CAPTURE,
    result: { dataUrl: photoData, summary: 'Initial photo' },
    performedTask: START_TASK,
    task: taskForAction(ACTIONS.CHOOSE),
    step: 0,
  };
}

export function parsePayload(value) {
  try {
    const p = typeof value === 'string' ? JSON.parse(value) : value;
    return p?.task || p?.artifact ? p : null;
  } catch {
    return null;
  }
}

export function payloadsOf(relay) {
  return (Array.isArray(relay?.steps) ? relay.steps : [])
    .map((s) => parsePayload(s?.output))
    .filter(Boolean);
}

export function latestPayload(relay) {
  const steps = payloadsOf(relay);
  return steps.at(-1) || parsePayload(relay?.seed);
}

export function chainState(relay) {
  return payloadsOf(relay);
}

export function selectNextAction(previous, history = [], seed = '') {
  const current = previous?.action || previous?.task?.actionType || ACTIONS.CAPTURE;
  const candidates = (TRANSITIONS[current] || [ACTIONS.CHOOSE]).filter((a) => !history.slice(-2).includes(a));
  return stableChoice(
    candidates.length ? candidates : (TRANSITIONS[current] || [ACTIONS.CHOOSE]),
    `${seed}:${history.length}:${current}`,
  );
}

export function generateNextTask({ previous, history = [], seed = '', step = 1 }) {
  if (step > MAX_STEPS) return null;
  const action = step === 1 ? ACTIONS.CHOOSE : selectNextAction(previous, history, seed);
  return { ...taskForAction(action, { previous }), step, remaining: MAX_STEPS - step + 1 };
}

export function serializeStep({ artifact, action, result, step, task, nextTask }) {
  const safeResult = result && typeof result === 'object' ? result : {};
  const compactArtifact = ['INTERPRET', 'PREDICT'].includes(action)
    ? { type: 'text', text: String(safeResult.text || safeResult.summary || '').trim() }
    : artifact;

  return JSON.stringify({
    v: PULSE_V3,
    artifact: compactArtifact,
    action,
    result: safeResult,
    title: String(safeResult.text || safeResult.summary || '').trim() || null,
    step,
    performedTask: task || null,
    task: nextTask || null,
  });
}