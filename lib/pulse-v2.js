export const PULSE_V3 = 5;
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

const ACTION_META = Object.freeze({
  [ACTIONS.CAPTURE]: { label: '撮る', inputType: 'photo' },
  [ACTIONS.FIND]: { label: '探す', inputType: 'photo' },
  [ACTIONS.CHOOSE]: { label: '選ぶ', inputType: 'tap' },
  [ACTIONS.INTERPRET]: { label: '解釈する', inputType: 'text' },
  [ACTIONS.COMPARE]: { label: '比べる', inputType: 'photo' },
  [ACTIONS.CHALLENGE]: { label: '疑う', inputType: 'photo' },
  [ACTIONS.PREDICT]: { label: '予測する', inputType: 'text' },
});

export const START_TASK = Object.freeze({
  version: PULSE_V3,
  actionType: ACTIONS.CAPTURE,
  inputType: 'photo',
  title: '最初の一手。',
  prompt: '今いる場所で、誰も気にしていなさそうなものを1つ撮ってください。',
  hint: '人・自撮り・危険な場所は避けてください。',
});

const FIRST_TASK = Object.freeze({
  version: PULSE_V3,
  actionType: ACTIONS.CHOOSE,
  inputType: 'tap',
  title: 'この写真の中で、気になる場所を選ぶ。',
  prompt: '前の人は、ここを選びました。あなたが次に残す一手の起点になる部分を1つタップしてください。',
  hint: '「なぜか目に入る」場所で十分です。',
});

const TASK_BUILDERS = {
  [ACTIONS.CHOOSE]: ({ previous }) => ({
    version: PULSE_V3,
    actionType: ACTIONS.CHOOSE,
    inputType: 'tap',
    title: 'この写真の中で、気になる場所を選ぶ。',
    prompt: '写真を見て、次の人に残したいと思う部分を1つタップしてください。',
    hint: '説明はまだいりません。まず選ぶ。',
    context: previous?.result?.summary || null,
  }),
  [ACTIONS.INTERPRET]: ({ previous }) => ({
    version: PULSE_V3,
    actionType: ACTIONS.INTERPRET,
    inputType: 'text',
    title: '意味を与える。',
    prompt: '前の人が選んだ場所は、なぜ気になるのでしょう？あなたの仮説を一文で書いてください。',
    hint: '正解はありません。あなたの見方を残してください。',
    context: previous?.result?.summary || null,
    maxLength: 90,
  }),
  [ACTIONS.FIND]: ({ previous }) => ({
    version: PULSE_V3,
    actionType: ACTIONS.FIND,
    inputType: 'photo',
    title: 'その仮説を、現実で探す。',
    prompt: `「${clip(previous?.result?.text || 'この見方')}」を裏付けるものを、今いる場所から1つ探して撮ってください。`,
    hint: '答えそのものではなく、証拠になるもの。',
  }),
  [ACTIONS.CHALLENGE]: ({ previous }) => ({
    version: PULSE_V3,
    actionType: ACTIONS.CHALLENGE,
    inputType: 'photo',
    title: '本当にそうなのか、疑う。',
    prompt: `前の人が残した証拠だけでは説明できないものを1つ探して撮ってください。`,
    hint: '反対意見ではなく、現実にある「別の証拠」を探してください。',
    context: previous?.result?.summary || null,
  }),
  [ACTIONS.COMPARE]: ({ previous }) => ({
    version: PULSE_V3,
    actionType: ACTIONS.COMPARE,
    inputType: 'photo',
    title: '違うものを並べる。',
    prompt: '前の人の証拠と対比できる、別のものを1つ撮ってください。',
    hint: '似たものではなく、違いが見えるもの。',
    context: previous?.result?.summary || null,
  }),
  [ACTIONS.PREDICT]: ({ previous }) => ({
    version: PULSE_V3,
    actionType: ACTIONS.PREDICT,
    inputType: 'text',
    title: '次に起きそうなことを予測する。',
    prompt: 'ここまでの流れを見て、次の人は何を見つけそうですか？一文で予測してください。',
    hint: '大胆でOK。ただし、前の行動につながっていること。',
    context: previous?.result?.summary || null,
    maxLength: 90,
  }),
  [ACTIONS.CAPTURE]: ({ previous }) => ({
    version: PULSE_V3,
    actionType: ACTIONS.CAPTURE,
    inputType: 'photo',
    title: '最後の一手を残す。',
    prompt: 'ここまでの流れを受けて、あなたなら残したい一枚を撮ってください。',
    hint: '最初の写真とは違う景色になっていて大丈夫です。',
    context: previous?.result?.summary || null,
  }),
};

const TRANSITIONS = Object.freeze({
  [ACTIONS.CHOOSE]: [ACTIONS.INTERPRET],
  [ACTIONS.INTERPRET]: [ACTIONS.FIND, ACTIONS.PREDICT],
  [ACTIONS.FIND]: [ACTIONS.CHALLENGE, ACTIONS.COMPARE],
  [ACTIONS.CHALLENGE]: [ACTIONS.CAPTURE, ACTIONS.COMPARE],
  [ACTIONS.COMPARE]: [ACTIONS.INTERPRET, ACTIONS.CHALLENGE],
  [ACTIONS.PREDICT]: [ACTIONS.FIND, ACTIONS.CAPTURE],
  [ACTIONS.CAPTURE]: [ACTIONS.CHOOSE, ACTIONS.INTERPRET],
});

function clip(value, max = 48) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function stableChoice(items, seed) {
  if (!items.length) return null;
  let hash = 0;
  for (const char of String(seed || 'pulse')) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return items[Math.abs(hash) % items.length];
}

function normalizeAction(action) {
  return ACTION_META[action] ? action : null;
}

export function taskForAction(actionType, context = {}) {
  const action = normalizeAction(actionType) || ACTIONS.CHOOSE;
  const task = TASK_BUILDERS[action](context);
  return { ...task, actionLabel: ACTION_META[action].label };
}

export function starterPayload(photoData) {
  return {
    v: PULSE_V3,
    artifact: { type: 'photo', dataUrl: photoData },
    action: ACTIONS.CAPTURE,
    result: { dataUrl: photoData, summary: '最初の写真' },
    task: FIRST_TASK,
    step: 0,
  };
}

export function nextTaskForStep(step) {
  return step === 0 ? FIRST_TASK : null;
}

export function parsePayload(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (parsed?.artifact?.type || parsed?.task?.actionType) return parsed;
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
  const steps = Array.isArray(relay?.steps) ? relay.steps : [];
  if (steps.length < 2) return parsePayload(relay?.seed);
  return parsePayload(steps[steps.length - 2]?.output) || parsePayload(relay?.seed);
}

export function chainState(relay) {
  const steps = Array.isArray(relay?.steps) ? relay.steps : [];
  return steps.map((step) => parsePayload(step?.output)).filter(Boolean);
}

export function selectNextAction(previous, history = [], seed = '') {
  const current = normalizeAction(previous?.action) || normalizeAction(previous?.task?.actionType) || ACTIONS.CAPTURE;
  const candidates = (TRANSITIONS[current] || [ACTIONS.CHOOSE]).filter((action) => {
    const recent = history.slice(-2);
    return !recent.includes(action);
  });
  const pool = candidates.length ? candidates : (TRANSITIONS[current] || [ACTIONS.CHOOSE]);
  return stableChoice(pool, `${seed}:${history.length}:${current}`);
}

export function generateNextTask({ previous, history = [], seed = '', step = 1 }) {
  if (step > MAX_STEPS) return null;
  const normalizedPrevious = previous || {};
  const nextAction = step === 1
    ? ACTIONS.CHOOSE
    : selectNextAction(normalizedPrevious, history, seed);

  const nextTask = taskForAction(nextAction, { previous: normalizedPrevious });
  return {
    ...nextTask,
    step,
    remaining: Math.max(0, MAX_STEPS - step + 1),
  };
}

export function serializeStep({ artifact, action, result, step, task, title = null }) {
  return JSON.stringify({
    v: PULSE_V3,
    artifact,
    action,
    result,
    title: title || null,
    step,
    task: task || null,
  });
}
