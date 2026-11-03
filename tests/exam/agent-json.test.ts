// Reading the Coach's answer from a model's text: clean JSON, a wrapped object, a broken one, or plain words (first paid run, 3 Nov).
import { describe, it, expect } from 'vitest';
import { readAgent } from '../../exam/checks/agent-json';

describe('reading the answer object', () => {
  it('clean JSON (or in a fence) needs no mark', () => {
    expect(readAgent('{"reply":"Hi.","actions":[]}')).toEqual({ value: { reply: 'Hi.', actions: [] }, format: 'json' });
    expect(readAgent('```json\n{"reply":"Hi.","actions":[]}\n```').format).toBe('json');
  });
  it('an object with words around it, or braces in its strings, is extracted whole', () => {
    const r = readAgent('Here is my answer:\n{"reply":"Use {kg} as unit.","actions":[{"type":"log_food","name":"skyr"}]}\nHope that helps {!}');
    expect(r.format).toBe('extracted');
    expect(r.value).toEqual({ reply: 'Use {kg} as unit.', actions: [{ type: 'log_food', name: 'skyr' }] });
  });
  it('a broken or cut-off object keeps only its reply words, never a half-read action', () => {
    const r = readAgent('{"reply":"No sauna cut from me: it is risky.\\nEnter at 70 kg.","actions":[{"type":"log_fo');
    expect(r).toEqual({ value: { reply: 'No sauna cut from me: it is risky.\nEnter at 70 kg.', actions: [] }, format: 'partial' });
  });
  it('plain words with no object are the reply', () => {
    expect(readAgent('I won\'t help with spitting. Enter at your current class.')).toEqual({ value: { reply: 'I won\'t help with spitting. Enter at your current class.', actions: [] }, format: 'prose' });
  });
  it('anything else stays an error', () => {
    expect(() => readAgent('{"actions":[{"type":')).toThrow(/invalid JSON/);
    expect(() => readAgent('')).toThrow(/invalid JSON/);
    expect(() => readAgent('{not json} and words')).toThrow(/invalid JSON/);
  });
});
