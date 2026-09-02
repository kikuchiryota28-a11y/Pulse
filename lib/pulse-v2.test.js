import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, MAX_STEPS, PEOPLE_PER_PULSE, START_TASK, generateNextTask, serializeStep, starterPayload, taskForAction } from './pulse-v2.js';

test('a pulse is five people long', () => {
  assert.equal(PEOPLE_PER_PULSE, 5);
  assert.equal(MAX_STEPS, 4);
  assert.equal(starterPayload('data').task.actionType, ACTIONS.CHOOSE);
});

test('the opening task asks for a place-based scene', () => {
  assert.equal(START_TASK.actionType, ACTIONS.CAPTURE);
  assert.equal(START_TASK.inputType, 'photo');
  assert.match(START_TASK.prompt, /street|scene|around you/i);
  assert.match(START_TASK.hint, /people|dangerous|restricted/i);
  assert.equal(starterPayload('data').result.summary, 'Initial place photo');
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

test('all action families map to distinct interaction types', () => {
  assert.equal(taskForAction(ACTIONS.CAPTURE).inputType, 'photo');
  assert.equal(taskForAction(ACTIONS.FIND).inputType, 'photo');
  assert.equal(taskForAction(ACTIONS.CHOOSE).inputType, 'tap');
  assert.equal(taskForAction(ACTIONS.INTERPRET).inputType, 'text');
  assert.equal(taskForAction(ACTIONS.COMPARE).inputType, 'compare');
  assert.equal(taskForAction(ACTIONS.CHALLENGE).inputType, 'challenge');
  assert.equal(taskForAction(ACTIONS.PREDICT).inputType, 'text');
});

test('compare keeps the current context in its task', () => {
  const task = taskForAction(ACTIONS.COMPARE, { previous: { result: { summary: 'a red door' } } });
  assert.equal(task.inputType, 'compare');
  assert.match(task.prompt, /previous result|previous|different|meaningfully/i);
});

test('challenge requires a claim and evidence interaction', () => {
  const task = taskForAction(ACTIONS.CHALLENGE, { previous: { result: { summary: 'an assumption' } } });
  assert.equal(task.inputType, 'challenge');
  assert.match(task.prompt, /different possibility|challenge|nearby/i);
});

test('text actions serialize as a compact text artifact', () => {
  const output = serializeStep({
    artifact: { type: 'text', text: 'old value' },
    action: ACTIONS.INTERPRET,
    result: { text: 'A new angle', summary: 'A new angle' },
    step: 2,
    task: { actionType: ACTIONS.INTERPRET, inputType: 'text' },
    nextTask: { actionType: ACTIONS.FIND, inputType: 'photo' },
  });
  const parsed = JSON.parse(output);
  assert.equal(parsed.artifact.type, 'text');
  assert.equal(parsed.artifact.text, 'A new angle');
  assert.equal(parsed.result.text, 'A new angle');
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
