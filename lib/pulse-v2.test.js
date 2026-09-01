import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, MAX_STEPS, PEOPLE_PER_PULSE, generateNextTask, starterPayload } from './pulse-v2.js';

test('a pulse is five people long', () => {
  assert.equal(PEOPLE_PER_PULSE, 5);
  assert.equal(MAX_STEPS, 4);
  assert.equal(starterPayload('data').task.actionType, ACTIONS.CHOOSE);
});

test('the next task is derived from the previous action', () => {
  const chosen = generateNextTask({
    previous: { action: ACTIONS.CHOOSE, result: { summary: 'a selected detail' } },
    history: [ACTIONS.CHOOSE],
    seed: 'test',
    step: 2,
  });
  assert.equal(chosen.actionType, ACTIONS.INTERPRET);
  assert.equal(chosen.inputType, 'text');
});

test('the engine changes action families instead of repeating recent moves', () => {
  const next = generateNextTask({
    previous: { action: ACTIONS.FIND, result: { summary: 'a found object' } },
    history: [ACTIONS.CHOOSE, ACTIONS.INTERPRET, ACTIONS.FIND],
    seed: 'test',
    step: 4,
  });
  assert.ok([ACTIONS.CHALLENGE, ACTIONS.COMPARE].includes(next.actionType));
  assert.notEqual(next.actionType, ACTIONS.FIND);
});

test('the fifth person completes the chain', () => {
  const task = generateNextTask({
    previous: { action: ACTIONS.CHALLENGE, result: { summary: 'counter evidence' } },
    history: [ACTIONS.CHOOSE, ACTIONS.INTERPRET, ACTIONS.FIND, ACTIONS.CHALLENGE],
    seed: 'test',
    step: 5,
  });
  assert.equal(task, null);
});
