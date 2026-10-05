/**
 * Messages of Compassion — what a visitor's device keeps.
 *
 *   - a half-written note survives a reload, trimmed to the server's limits;
 *   - a sent note is remembered, newest first, capped, and clears the draft;
 *   - a remembered note reads "Published" only once the wall carries it;
 *   - nothing a visitor typed reaches the page unescaped.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const {
  state, loadState, saveMessageDraft, recordSharedMessage, forgetSharedMessage,
} = await import('../src/state.js');
const { mySharedMessages, screens } = await import('../src/screens.js');

const reload = () => {
  state.messageDraft = { displayName: '', community: '', message: '' };
  state.sharedMessages = [];
  loadState();
};

test('a draft survives a reload and is held to the server limits', () => {
  saveMessageDraft({ displayName: 'Grace', community: 'Columbus', message: 'x'.repeat(900) });
  reload();
  assert.equal(state.messageDraft.displayName, 'Grace');
  assert.equal(state.messageDraft.message.length, 500);
  assert.match(screens.messages(), /value="Grace"/);
});

test('sending remembers the note, clears the draft, and keeps the newest ten', () => {
  for (let i = 0; i < 12; i += 1) {
    recordSharedMessage({ displayName: 'Grace', community: '', message: `Message number ${i} of hope` });
  }
  reload();
  assert.equal(state.sharedMessages.length, 10);
  assert.equal(state.sharedMessages[0].message, 'Message number 11 of hope');
  assert.equal(state.messageDraft.message, '');

  forgetSharedMessage(0);
  reload();
  assert.equal(state.sharedMessages[0].message, 'Message number 10 of hope');
});

test('a remembered note is "Published" only once the wall shows it', () => {
  state.sharedMessages = [{ displayName: 'Grace', community: '', message: 'You are  not alone today.', sentAt: new Date().toISOString() }];
  state.compassionMessages = [];
  assert.match(mySharedMessages(), /Waiting for review/);

  state.compassionMessages = [{ display_name: 'Grace', message: 'You are not alone today.', created_at: new Date().toISOString() }];
  assert.match(mySharedMessages(), /Published/);
});

test('stored values are escaped, and malformed storage is ignored', () => {
  state.sharedMessages = [{ displayName: 'x', community: '', message: '<img src=x onerror=alert(1)>', sentAt: 'nope' }];
  assert.doesNotMatch(mySharedMessages(), /<img/);

  store.set('cup-of-compassion:v1', JSON.stringify({ messageDraft: 'bad', sharedMessages: [null, 4, { message: '' }] }));
  reload();
  assert.deepEqual(state.messageDraft, { displayName: '', community: '', message: '' });
  assert.deepEqual(state.sharedMessages, []);
});
