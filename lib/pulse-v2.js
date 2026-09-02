export const PULSE_V3 = 6;
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

function clip(value, max = 70) {
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
  const context = previous?.result?.summary || previous?.result?.text || previous?.result?.claim || '';
  const tasks = {
    CHOOSE: ['この写真の中で、次の人に残したいと思う部分を1つタップしてください。', '写真の中で、なぜか目に入る場所を1つ選んでください。'],
    INTERPRET: [`前の人が選んだ場所には、どんな意味があると思いますか？理由を一文で残してください。`, 'ここまでの行動から、まだ誰も言っていない仮説を1つ作ってください。'],
    FIND: [`「${clip(context || 'この仮説')}」が本当だとしたら、今いる場所のどこに痕跡がある？1つ探して撮ってください。`, '前の人の考えを支持するものを、今いる場所から1つ探して撮ってください。'],
    CHALLENGE: ['前の人の主張を少しだけ疑ってください。反対の可能性を示せそうなものを1つ撮り、理由を短く書いてください。'],
    COMPARE: ['前の人が残したものと、意味が反対になりそうな別のものを1つ撮ってください。違いを一文で書いてください。'],
    PREDICT: ['次の人は、ここまでの流れを見て何を選ぶと思いますか？一文で予測してください。', 'あなたの一手で、次の人の見方はどう変わると思いますか？一文で予測してください。'],
    CAPTURE: ['ここまでの流れを受けて、あなたなら次の人に見せたい一枚を撮ってください。'],
  };
  const titles = { CHOOSE: '何を残す？', INTERPRET: '意味をひとつ作る。', FIND: 'その仮説を現実で探す。', CHALLENGE: '本当にそう？', COMPARE: '反対側を置いてみる。', PREDICT: '次の一手を読む。', CAPTURE: '次の人へ、ひとつ残す。' };
  const hints = { CHOOSE: '正解はありません。直感で1か所。', INTERPRET: '短い一文で十分です。あなたの解釈が次を変えます。', FIND: '人・危険な場所・立入禁止区域は避けてください。', CHALLENGE: '「本当に？」を起点に、別の可能性を探します。', COMPARE: '似たものではなく、意味が変わるくらい違うものを。', PREDICT: '当てるゲームではありません。あなたの読みを残します。', CAPTURE: '人ではなく、場所・物・風景を対象にしてください。' };
  return {
    version: PULSE_V3, actionType: action, inputType: META[action].inputType, title: titles[action],
    prompt: stableChoice(tasks[action], `${context}:${action}:${previous?.step || 0}`), hint: hints[action],
    actionLabel: META[action].label, context: context || null, maxLength: 120,
  };
}

export function starterPayload(photoData) {
  return { v: PULSE_V3, artifact: { type: 'photo', dataUrl: photoData }, action: ACTIONS.CAPTURE,
    result: { dataUrl: photoData, summary: '最初の写真' }, task: taskForAction(ACTIONS.CHOOSE), step: 0 };
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
export function serializeStep({ artifact, action, result, step, task }) {
  // Text actions do not need to carry the previous photo. Keep the photo in its
  // original step/result so Reveal still has it, while keeping this payload small.
  const compactArtifact = ['INTERPRET', 'PREDICT'].includes(action)
    ? { type: 'text', text: result?.text || result?.summary || '' }
    : artifact;
  return JSON.stringify({ v: PULSE_V3, artifact: compactArtifact, action, result,
    title: result?.text || result?.summary || null, step, task: task || null });
}
