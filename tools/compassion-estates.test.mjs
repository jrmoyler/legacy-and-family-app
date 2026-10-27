import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { sidebar } from '../src/components.js';
import { screens } from '../src/screens.js';
import { localAnswer } from '../src/margaret.js';
import { COMPASSION_ESTATES_URL } from '../src/data.js';

const require = createRequire(import.meta.url);
const { upstreamRequest } = require('../api/margaret.js');

test('both entrances link to Compassion Estates with a safe new tab', () => {
  for (const html of [sidebar(), screens.home()]) {
    assert.match(html, new RegExp(`href="${COMPASSION_ESTATES_URL}" target="_blank" rel="noopener noreferrer"`));
    assert.match(html, /Compassion Estates/);
  }
});

test('Margaret handles property questions offline and supplies knowledge to providers', () => {
  for (const question of ['Where can I book a property?', 'Tell me about Compassion Estates', 'Where are the vacation rentals?', 'Where can I browse properties?']) {
    assert.match(localAnswer(question).text, /compassion-estates\.vercel\.app/);
  }
  const request = upstreamRequest({ kind: 'openai', model: 'test' }, []);
  assert.match(request.body.messages[0].content, /compassion-estates\.vercel\.app/);
  assert.match(request.body.messages[0].content, /never invent/i);
});

test('property in the Legacy Inventory keeps the worksheet answer', () => {
  for (const question of ['How do I record property in the inventory?', 'How do I gather property details for my family inventory?', 'Where do I print the property worksheet?']) {
    const answer = localAnswer(question);
    assert.match(answer.text, /Legacy Inventory/);
    assert.ok(answer.links.includes('legacy'));
    assert.doesNotMatch(answer.text, /compassion-estates\.vercel\.app/);
  }
});
