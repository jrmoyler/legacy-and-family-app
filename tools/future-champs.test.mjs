import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { sidebar } from '../src/components.js';
import { screens } from '../src/screens.js';
import { localAnswer } from '../src/margaret.js';
import { FUTURE_CHAMPS_URL } from '../src/data.js';

const require = createRequire(import.meta.url);
const { upstreamRequest } = require('../api/margaret.js');

test('both entrances link to Future Champs with a safe new tab', () => {
  for (const html of [sidebar(), screens.home()]) {
    assert.match(html, new RegExp(`href="${FUTURE_CHAMPS_URL}" target="_blank" rel="noopener noreferrer"`));
    assert.match(html, /Future Champs/);
  }
});

test('Margaret knows Future Champs offline and supplies it to providers', () => {
  for (const question of ['What is Future Champs?', 'Tell me about the Compassion Kids', 'Do you have children’s books?', 'Where is the coloring book?']) {
    assert.match(localAnswer(question).text, /future-champs-website\.vercel\.app/);
  }
  const request = upstreamRequest({ kind: 'openai', model: 'test' }, []);
  assert.match(request.body.messages[0].content, /future-champs-website\.vercel\.app/);
  assert.match(request.body.messages[0].content, /compassion-estates\.vercel\.app/);
});

test('estate-planning questions about children keep their own answers', () => {
  const answer = localAnswer('How do I talk to my adult children about estate planning?');
  assert.doesNotMatch(answer.text, /future-champs-website\.vercel\.app/);
});

test('message wall closes with the share-your-story tagline', () => {
  const html = screens.messages();
  assert.match(html, /Have a compassion story\? Share it with the world/);
  assert.doesNotMatch(html, /California/i);
});
