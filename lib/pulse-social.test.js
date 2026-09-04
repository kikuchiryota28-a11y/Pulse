import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  ACTION_CATALOG,
  buildMoveContent,
  buildState,
  cleanText,
  compactContent,
  contentPreview,
  deriveTitle,
  directorFor,
  formatRelative,
  initials,
  mediaFromContent,
  normalizeSeed,
  participantCount,
  scorePulse,
  seedFromPulse,
} from './pulse-social.js';

test('social action catalog exposes stable action families', () => {
  assert.deepEqual(Object.keys(ACTION_CATALOG).sort(), Object.values(ACTIONS).sort());
  for (const action of Object.values(ACTIONS)) {
    assert.ok(ACTION_CATALOG[action].label);
    assert.ok(ACTION_CATALOG[action].inputType);
    assert.ok(ACTION_CATALOG[action].prompt);
    assert.ok(ACTION_CATALOG[action].hint);
  }
});

test('cleanText collapses whitespace and respects max length', () => {
  assert.equal(cleanText('  hello\n\nworld  ', 50), 'hello world');
  assert.equal(cleanText('abcdef', 3), 'abc');
});

test('normalizeSeed preserves supported seed modes', () => {
  assert.equal(normalizeSeed({ type: 'text', text: 'hello' }).type, 'text');
  assert.equal(normalizeSeed({ type: 'photo', dataUrl: 'data:image/jpeg;base64,x', text: 'scene' }).type, 'photo');
  assert.equal(normalizeSeed({ type: 'mixed', dataUrl: 'data:image/jpeg;base64,x', text: 'scene' }).type, 'mixed');
  assert.equal(normalizeSeed({ type: 'mixed' }).type, 'text');
});

test('deriveTitle creates short readable titles', () => {
  assert.equal(deriveTitle({ text: 'the street after rain' }), 'street after rain');
  assert.ok(deriveTitle({ text: 'A very long starting thought that keeps going far beyond what should become a title' }).length <= 52);
});

test('seedFromPulse safely handles serialized and object seeds', () => {
  assert.deepEqual(seedFromPulse({ seed: '{"type":"text","text":"hello"}' }), { type: 'text', text: 'hello' });
  assert.deepEqual(seedFromPulse({ seed: { type: 'photo' } }), { type: 'photo' });
  assert.deepEqual(seedFromPulse(null), {});
});

test('content helpers preserve summaries and media', () => {
  const content = buildMoveContent({ inputType: 'photo', photo: 'data:image/jpeg;base64,x', caption: 'A detail' });
  assert.equal(content.type, 'photo');
  assert.equal(contentPreview(content), 'A detail');
  assert.equal(mediaFromContent(content), 'data:image/jpeg;base64,x');
  assert.deepEqual(compactContent(content), content);
});

test('choice moves stay compact and textual', () => {
  const content = buildMoveContent({ inputType: 'choice', choice: 'The detail' });
  assert.equal(content.choice, 'The detail');
  assert.equal(content.summary, 'The detail');
});

test('text moves are trimmed to safe bounds', () => {
  const content = buildMoveContent({ inputType: 'text', text: '  this   changes   the post  ' });
  assert.equal(content.text, 'this changes the post');
  assert.equal(content.summary, 'this changes the post');
});

test('participantCount counts unique actors only', () => {
  const moves = [
    { actor_id: 'a_one' },
    { actor_id: 'a_two' },
    { actor_id: 'a_one' },
    { actor_id: null },
  ];
  assert.equal(participantCount(moves), 2);
});

test('buildState starts from seed when no moves exist', () => {
  const pulse = { id: 'p1', title: 'A place', seed: JSON.stringify({ type: 'text', text: 'A quiet place' }), created_at: '2026-01-01T00:00:00Z' };
  const state = buildState({ pulse, moves: [] });
  assert.equal(state.index, 0);
  assert.equal(state.source, 'seed');
  assert.equal(state.summary, 'A quiet place');
  assert.equal(state.lastAction, null);
});

test('buildState reflects the latest move', () => {
  const pulse = { id: 'p1', title: 'A place', seed: JSON.stringify({ type: 'text', text: 'A quiet place' }) };
  const moves = [
    { action_type: 'interpret', created_at: '2026-01-01T00:00:00Z', content: { text: 'It feels like a memory.' } },
    { action_type: 'find', created_at: '2026-01-01T01:00:00Z', content: { dataUrl: 'photo', summary: 'A matching texture.' } },
  ];
  const state = buildState({ pulse, moves });
  assert.equal(state.index, 2);
  assert.equal(state.source, 'move');
  assert.equal(state.lastAction, 'find');
  assert.equal(state.media, 'photo');
});

test('director opens with a human-sized move', () => {
  const pulse = { id: 'p1', title: 'A scene', intent: 'Make this feel different', seed: { type: 'photo' } };
  const director = directorFor({ pulse, intent: pulse.intent, moves: [] });
  assert.ok(Object.values(ACTIONS).includes(director.actionType));
  assert.ok(['choice', 'text', 'photo', 'mixed'].includes(director.inputType));
  assert.ok(director.prompt.length > 0);
  assert.ok(director.hint.length > 0);
});

test('director adapts after a previous move instead of always repeating it', () => {
  const pulse = { id: 'p2', title: 'A strange station', intent: 'Find another side', seed: { type: 'text', text: 'A strange station' } };
  const moves = [{ id: 'm1', action_type: 'interpret', content: { text: 'It feels abandoned.' }, created_at: '2026-01-01T00:00:00Z' }];
  const director = directorFor({ pulse, intent: pulse.intent, moves });
  assert.notEqual(director.actionType, 'interpret');
  assert.ok(director.context);
});

test('director remains deterministic for the same state', () => {
  const pulse = { id: 'p3', title: 'Same state', intent: 'Keep changing', seed: { type: 'text', text: 'Same state' } };
  const moves = [{ id: 'm1', action_type: 'find', content: { text: 'A clue.' }, created_at: '2026-01-01T00:00:00Z' }];
  const a = directorFor({ pulse, intent: pulse.intent, moves });
  const b = directorFor({ pulse, intent: pulse.intent, moves });
  assert.deepEqual(a, b);
});

test('director returns real contextual prompt after history exists', () => {
  const pulse = { id: 'p4', title: 'Rainy street', intent: 'Make it personal', seed: { type: 'text', text: 'Rainy street' } };
  const moves = [{ id: 'm1', action_type: 'choose', content: { choice: 'The reflection', summary: 'The reflection' }, created_at: '2026-01-01T00:00:00Z' }];
  const director = directorFor({ pulse, intent: pulse.intent, moves });
  assert.match(director.prompt, /reflection|current|Pulse/i);
});

test('scorePulse rewards recent active participation', () => {
  const now = Date.parse('2026-01-01T12:00:00Z');
  const fresh = { status: 'active', updated_at: '2026-01-01T11:59:00Z', participant_count: 4, move_count: 5 };
  const stale = { status: 'active', updated_at: '2025-12-20T12:00:00Z', participant_count: 1, move_count: 1 };
  assert.ok(scorePulse(fresh, [], now) > scorePulse(stale, [], now));
});

test('formatRelative handles common recency buckets', () => {
  const now = Date.parse('2026-01-01T12:00:00Z');
  assert.equal(formatRelative('2026-01-01T11:59:40Z', now), 'just now');
  assert.equal(formatRelative('2026-01-01T11:40:00Z', now), '20m ago');
  assert.equal(formatRelative('2026-01-01T09:00:00Z', now), '3h ago');
  assert.equal(formatRelative('2025-12-29T12:00:00Z', now), '3d ago');
});

test('initials are stable for anonymous actor ids', () => {
  assert.equal(initials('a_abcd1234'), 'AB');
  assert.equal(initials('pulse'), 'PU');
});
