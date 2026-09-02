export const PULSE_V3 = 5;
export const PEOPLE_PER_PULSE = 5;
export const MAX_STEPS = PEOPLE_PER_PULSE - 1;

export const ACTIONS = Object.freeze({
  CAPTURE: 'CAPTURE', FIND: 'FIND', CHOOSE: 'CHOOSE', INTERPRET: 'INTERPRET',
  COMPARE: 'COMPARE', CHALLENGE: 'CHALLENGE', PREDICT: 'PREDICT',
});

const META = Object.freeze({
  CAPTURE: { label: '撮る', inputType: 'photo' }, FIND: { label: '探す', inputType: 'photo' },
  CHOOSE: { label: '選ぶ', inputType: 'tap' }, INTERPRET: { label: '解釈する', inputType: 'text' },
  COMPARE: { label: '比べる', inputType: 'photo' }, CHALLENGE: { label: '疑う', inputType: 'photo' },
  PREDICT: { label: '予測する', inputType: 'text' },
});

export const START_TASK = Object.freeze({ version: PULSE_V3, actionType: ACTIONS.CAPTURE, inputType: 'photo', title: '最初の一手。', prompt: '今いる場所で、誰も気にしていなさそうなものを1つ撮ってください。', hint: '人・自撮り・危険な場所は避けてください。' });

const TRANSITIONS = Object.freeze({
  CAPTURE: [ACTIONS.CHOOSE, ACTIONS.INTERPRET], CHOOSE: [ACTIONS.INTERPRET],
  INTERPRET: [ACTIONS.FIND, ACTIONS.PREDICT], FIND: [ACTIONS.CHALLENGE, ACTIONS.COMPARE],
  CHALLENGE: [ACTIONS.CAPTURE, ACTIONS.COMPARE], COMPARE: [ACTIONS.INTERPRET, ACTIONS.CHALLENGE],
  PREDICT: [ACTIONS.FIND, ACTIONS.CAPTURE],
});

function clip(value, max = 55) { const s = String(value || '').replace(/\s+/g, ' ').trim(); return s.length > max ? `${s.slice(0, max)}…` : s; }
function stableChoice(items, seed) { let h = 0; for (const c of String(seed || 'pulse')) h = (h * 31 + c.charCodeAt(0)) | 0; return items[Math.abs(h) % items.length]; }

export function taskForAction(actionType, { previous } = {}) {
  const action = META[actionType] ? actionType : ACTIONS.CHOOSE;
  const context = previous?.result?.summary || previous?.result?.text || '';
  const tasks = {
    CHOOSE: ['この写真の中で、次の人に残したいと思う部分を1つタップしてください。', '写真の中で、なぜか目に入る場所を1つ選んでください。'],
    INTERPRET: ['前の人が選んだ場所は、なぜ気になるのでしょう？あなたの仮説を一文で書いてください。'],
    FIND: [`「${clip(context || 'この見方')}」を裏付けるものを、今いる場所から1つ探して撮ってください。`],
    CHALLENGE: ['前の人が残した証拠だけでは説明できないものを1つ探して撮ってください。'],
    COMPARE: ['前の人の証拠と対比できる、別のものを1つ撮ってください。'],
    PREDICT: ['ここまでの流れを見て、次の人は何を見つけそうですか？一文で予測してください。'],
    CAPTURE: ['ここまでの流れを受けて、あなたなら残したい一枚を撮ってください。'],
  };
  const titles = { CHOOSE: 'この写真の中で、気になる場所を選ぶ。', INTERPRET: '意味を与える。', FIND: 'その仮説を、現実で探す。', CHALLENGE: '本当にそうなのか、疑う。', COMPARE: '違うものを並べる。', PREDICT: '次に起きそうなことを予測する。', CAPTURE: '最後の一手を残す。' };
  return { version: PULSE_V3, actionType: action, inputType: META[action].inputType, title: titles[action], prompt: stableChoice(tasks[action], `${context}:${action}`), hint: action === 'INTERPRET' || action === 'PREDICT' ? '短い一文で十分です。' : '前の人の行動につながっていることを意識してください。', actionLabel: META[action].label, context: context || null, maxLength: 90 };
}

export function starterPayload(photoData) { return { v: PULSE_V3, artifact: { type: 'photo', dataUrl: photoData }, action: ACTIONS.CAPTURE, result: { dataUrl: photoData, summary: '最初の写真' }, task: taskForAction(ACTIONS.CHOOSE), step: 0 }; }
export function parsePayload(value) { try { const p = typeof value === 'string' ? JSON.parse(value) : value; return p?.task || p?.artifact ? p : null; } catch { return null; } }
export function payloadsOf(relay) { return (Array.isArray(relay?.steps) ? relay.steps : []).map(s => parsePayload(s?.output)).filter(Boolean); }
export function latestPayload(relay) { const steps = payloadsOf(relay); return steps.at(-1) || parsePayload(relay?.seed); }
export function chainState(relay) { return payloadsOf(relay); }

export function selectNextAction(previous, history = [], seed = '') {
  const current = previous?.action || previous?.task?.actionType || ACTIONS.CAPTURE;
  const candidates = (TRANSITIONS[current] || [ACTIONS.CHOOSE]).filter(a => !history.slice(-2).includes(a));
  return stableChoice(candidates.length ? candidates : (TRANSITIONS[current] || [ACTIONS.CHOOSE]), `${seed}:${history.length}:${current}`);
}
export function generateNextTask({ previous, history = [], seed = '', step = 1 }) {
  if (step > MAX_STEPS) return null;
  const action = step === 1 ? ACTIONS.CHOOSE : selectNextAction(previous, history, seed);
  return { ...taskForAction(action, { previous }), step, remaining: MAX_STEPS - step + 1 };
}
export function serializeStep({ artifact, action, result, step, task }) { return JSON.stringify({ v: PULSE_V3, artifact, action, result, title: result?.text || result?.summary || null, step, task: task || null }); }
