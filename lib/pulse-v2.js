export const PULSE_V3 = 7;
export const PEOPLE_PER_PULSE = 5;
export const MAX_STEPS = PEOPLE_PER_PULSE - 1;

export const ACTIONS = Object.freeze({
  CAPTURE: 'CAPTURE', FIND: 'FIND', CHOOSE: 'CHOOSE', INTERPRET: 'INTERPRET',
  COMPARE: 'COMPARE', CHALLENGE: 'CHALLENGE', PREDICT: 'PREDICT',
});

const META = Object.freeze({
  CAPTURE: { label: '撮る', inputType: 'photo' }, FIND: { label: '探す', inputType: 'photo' },
  CHOOSE: { label: '選ぶ', inputType: 'tap' }, INTERPRET: { label: '解釈する', inputType: 'text' },
  COMPARE: { label: '比べる', inputType: 'compare' }, CHALLENGE: { label: '疑う', inputType: 'challenge' },
  PREDICT: { label: '予測する', inputType: 'text' },
});

export const START_TASK = Object.freeze({
  version: PULSE_V3, actionType: ACTIONS.CAPTURE, inputType: 'photo', title: '最初の一手。',
  prompt: '今いる場所で、誰も気にしていなさそうなものを1つ撮ってください。',
  hint: '人・自撮り・危険な場所は避けてください。',
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
  const instruction = clip(previousTask?.prompt || '前の人の一手');
  const result = clip(context || '前の人が残した結果');
  const tasks = {
    CHOOSE: [
      `前の人への指示「${instruction}」で残ったものを見て、次の流れに残す場所を1つタップしてください。`,
      `前の人が残したものから、次の人へ渡したい部分を1つ選んでください。`,
    ],
    INTERPRET: [
      `前の人の結果「${result}」を材料に、別の見方を1つ作ってください。`,
      `前の人が残したものから、まだ見えていない特徴を1つ言葉にしてください。`,
    ],
    FIND: [
      `前の人が残した「${result}」につながるものを、今いる場所から1つ探して撮ってください。`,
      `前の人の結果を手がかりに、別の場所・物で同じ特徴が見えるものを1つ探してください。`,
    ],
    CHALLENGE: [
      `前の人の結果「${result}」とは違う可能性を、身近なもの1つで示してください。写真と一文を残します。`,
    ],
    COMPARE: [
      `前の人が残したものと、見え方が変わるくらい違うものを1つ撮ってください。違いを一文で。`,
    ],
    PREDICT: [
      `ここまでの流れから、次に現れそうな「もの・特徴」を1つ予測してください。`,
      `前の人の結果「${result}」から、この先どう変化しそうか一文で予測してください。`,
    ],
    CAPTURE: [
      `ここまでの流れを受けて、次の人に渡すと面白そうな一枚を撮ってください。`,
    ],
  };
  const titles = { CHOOSE: '何を残す？', INTERPRET: '別の見方を作る。', FIND: 'つながるものを探す。', CHALLENGE: '別の可能性を置く。', COMPARE: '反対側を置いてみる。', PREDICT: '次に何が現れる？', CAPTURE: '次の人へ、ひとつ残す。' };
  const hints = { CHOOSE: '正解はありません。直感で1か所。', INTERPRET: '「なぜ？」を当てる必要はありません。自分の見方を1つ残します。', FIND: '人・危険な場所・立入禁止区域は避けてください。', CHALLENGE: '人ではなく、物や場所の違いで別の可能性を作ります。', COMPARE: '人ではなく、場所・物・風景を比べてください。', PREDICT: '人の心理ではなく、次に現れるものを予想します。', CAPTURE: '人ではなく、場所・物・風景を対象にしてください。' };
  return {
    version: PULSE_V3, actionType: action, inputType: META[action].inputType, title: titles[action],
    prompt: stableChoice(tasks[action], `${context}:${instruction}:${action}:${previous?.step || 0}`), hint: hints[action],
    actionLabel: META[action].label, context: context || null, maxLength: 120,
  };
}

export function starterPayload(photoData) {
  return { v: PULSE_V3, artifact: { type: 'photo', dataUrl: photoData }, action: ACTIONS.CAPTURE,
    result: { dataUrl: photoData, summary: '最初の写真' }, performedTask: START_TASK,
    task: taskForAction(ACTIONS.CHOOSE), step: 0 };
}
export function parsePayload(value) {
  try { const p = typeof value === 'string' ? JSON.parse(value) : value; return p?.task || p?.artifact ? p : null; }
  catch { return null; }
}
export function payloadsOf(relay) { return (Array.isArray(relay?.steps) ? relay.steps : []).map((s) => parsePayload(s?.output)).filter(Boolean); }
export function latestPayload(relay) { const steps = payloadsOf(relay); return steps.at(-1) || parsePayload(relay?.seed); }
export function chainState(relay) { return payloadsOf(relay); }
export function selectNextAction(previous, history = [], seed = '') {
  const current = previous?.action || previous?.task?.actionType || ACTIONS.CAPTURE;
  const candidates = (TRANSITIONS[current] || [ACTIONS.CHOOSE]).filter((a) => !history.slice(-2).includes(a));
  return stableChoice(candidates.length ? candidates : (TRANSITIONS[current] || [ACTIONS.CHOOSE]), `${seed}:${history.length}:${current}`);
}
export function generateNextTask({ previous, history = [], seed = '', step = 1 }) {
  if (step > MAX_STEPS) return null;
  const action = step === 1 ? ACTIONS.CHOOSE : selectNextAction(previous, history, seed);
  return { ...taskForAction(action, { previous }), step, remaining: MAX_STEPS - step + 1 };
}
export function serializeStep({ artifact, action, result, step, task, nextTask }) {
  const compactArtifact = ['INTERPRET', 'PREDICT'].includes(action)
    ? { type: 'text', text: result?.text || result?.summary || '' }
    : artifact;
  return JSON.stringify({ v: PULSE_V3, artifact: compactArtifact, action, result,
    title: result?.text || result?.summary || null, step,
    performedTask: task || null, task: nextTask || null });
}
