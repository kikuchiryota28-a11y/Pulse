import test from 'node:test';
import assert from 'node:assert/strict';
import { assertMoveShape, dominantTip, isStaleRevision, lineage, nextDepth } from './pulse-integrity.js';

test('nextDepth starts at one and follows parent depth', () => {
  assert.equal(nextDepth(null), 1);
  assert.equal(nextDepth({ depth: 3 }), 4);
});

test('stale revisions are detected', () => {
  assert.equal(isStaleRevision(2, 3), true);
  assert.equal(isStaleRevision(3, 3), false);
});

test('lineage follows parent pointers from root to tip', () => {
  const moves = [
    { id: 'a', parent_move_id: null, depth: 1 },
    { id: 'b', parent_move_id: 'a', depth: 2 },
    { id: 'c', parent_move_id: 'b', depth: 3 },
    { id: 'x', parent_move_id: 'a', depth: 2 },
  ];
  assert.deepEqual(lineage(moves, 'c').map((m) => m.id), ['a', 'b', 'c']);
});

test('dominantTip favors deeper lineage and then recency', () => {
  const moves = [
    { id: 'a', depth: 2, created_at: '2026-01-01T00:00:00Z' },
    { id: 'b', depth: 3, created_at: '2026-01-01T00:00:00Z' },
    { id: 'c', depth: 3, created_at: '2026-02-01T00:00:00Z' },
  ];
  assert.equal(dominantTip(moves).id, 'c');
});

test('assertMoveShape accepts valid social moves', () => {
  assert.equal(assertMoveShape({
    pulse_id: 'p', actor_id: 'actor-123456', action_type: 'find', input_type: 'photo', content: { photo: 'x' }
  }), true);
});

test('assertMoveShape rejects malformed moves', () => {
  assert.throws(() => assertMoveShape({}), /pulse_id/);
  assert.throws(() => assertMoveShape({ pulse_id: 'p', actor_id: 'actor-123456', action_type: 'bad', input_type: 'photo', content: {} }), /Unsupported action/);
  assert.throws(() => assertMoveShape({ pulse_id: 'p', actor_id: 'actor-123456', action_type: 'find', input_type: 'photo', content: null }), /object/);
});
