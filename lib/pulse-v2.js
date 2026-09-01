export const PULSE_V2 = 4;
export const MAX_STEPS = 3;

export const START_TASK = {
  kind: 'capture',
  title: 'Find the ordinary thing worth noticing.',
  prompt: 'Take a photo of something in your town that most people would walk past.',
  hint: 'No landmarks. No selfies. Just something you noticed.',
};

export const TASKS = {
  mark: {
    kind: 'mark',
    title: 'Find the detail.',
    prompt: 'Find one detail in this photo that most people would miss. Tap it.',
    hint: 'One point is enough. Trust your eye.',
  },
  title: {
    kind: 'title',
    title: 'Change what it means.',
    prompt: 'Give the marked detail a new meaning. Name the photo in 5 words or less.',
    hint: 'Do not explain it. Rename it.',
  },
  response: {
    kind: 'capture',
    title: 'Answer with a photo.',
    prompt: 'Take a new photo that answers that title without explaining it.',
    hint: 'Your photo should feel like a reply.',
  },
};

export function starterPayload(photoData) {
  return {
    v: PULSE_V2,
    artifact: { type: 'photo', dataUrl: photoData },
    task: START_TASK,
    step: 0,
  };
}

export function nextTaskForStep(step) {
  if (step === 1) return TASKS.mark;
  if (step === 2) return TASKS.title;
  if (step === 3) return TASKS.response;
  return null;
}

export function parsePayload(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (parsed?.artifact?.type) return parsed;
  } catch {}
  return null;
}

export function latestPayload(relay) {
  const steps = Array.isArray(relay?.steps) ? relay.steps : [];
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const payload = parsePayload(steps[index]?.output);
    if (payload) return payload;
  }
  return parsePayload(relay?.seed);
}

export function previousPayload(relay) {
  return latestPayload(relay);
}

export function serializeStep({ artifact, action, result, step, title }) {
  return JSON.stringify({
    v: PULSE_V2,
    artifact,
    action,
    result,
    title: title || null,
    step,
    task: nextTaskForStep(step + 1),
  });
}
