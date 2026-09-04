const ALLOWED_ACTIONS = new Set(['react','choose','interpret','find','connect','transform','compare','predict','add','remix']);
const ALLOWED_INPUTS = new Set(['text','photo','video','voice','choice','mixed']);

export function assertMoveShape(move) {
  if (!move || typeof move !== 'object') throw new Error('Move must be an object.');
  if (!move.pulse_id) throw new Error('pulse_id is required.');
  if (!move.actor_id || move.actor_id.length < 8 || move.actor_id.length > 80) throw new Error('Invalid actor identity.');
  if (!ALLOWED_ACTIONS.has(move.action_type)) throw new Error('Unsupported action type.');
  if (!ALLOWED_INPUTS.has(move.input_type)) throw new Error('Unsupported input type.');
  if (!move.content || typeof move.content !== 'object' || Array.isArray(move.content)) throw new Error('Move content must be an object.');
  return true;
}

export function nextDepth(parent) {
  return parent ? Number(parent.depth || 0) + 1 : 1;
}

export function isStaleRevision(expected, actual) {
  return Number(expected) !== Number(actual);
}

export function lineage(moves, parentId = null) {
  const byId = new Map((moves || []).map((m) => [m.id, m]));
  const out = [];
  let id = parentId;
  while (id) {
    const move = byId.get(id);
    if (!move) break;
    out.unshift(move);
    id = move.parent_move_id;
  }
  return out;
}

export function dominantTip(moves) {
  return [...(moves || [])].sort((a, b) => {
    const depth = Number(b.depth || 0) - Number(a.depth || 0);
    if (depth) return depth;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  })[0] || null;
}
