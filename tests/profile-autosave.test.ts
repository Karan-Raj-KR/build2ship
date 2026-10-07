import { describe, expect, it } from 'vitest';
import { createAutosave } from '@/lib/autosave';

describe('instant profile autosave', () => {
  it('starts immediately, combines newer fields and only reports saved after draining', async () => {
    const calls: object[] = [], states: string[] = [];
    let finish!: () => void;
    const queue = createAutosave<{ name: string; skills: string[] }>(async updates => {
      calls.push(updates);
      await new Promise<void>(resolve => { finish = resolve; });
    }, state => states.push(state));
    queue.update({ name: 'A' });
    expect(calls).toEqual([{ name: 'A' }]);
    queue.update({ name: 'Alex' });
    queue.update({ skills: ['Python'] });
    finish();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calls).toEqual([{ name: 'A' }, { name: 'Alex', skills: ['Python'] }]);
    expect(states).toEqual(['saving']);
    finish();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(states).toEqual(['saving', 'saved']);
  });

  it('flush waits for the latest step and answers before navigation', async () => {
    let finish!: () => void;
    const persisted: object[] = [];
    const queue = createAutosave<{ name: string; step: number }>(async updates => {
      await new Promise<void>(resolve => { finish = resolve; });
      persisted.push(updates);
    }, () => {});
    queue.update({ name: 'Alex' });
    queue.update({ step: 2 });
    let done = false;
    const flushed = queue.flush().then(() => { done = true; });
    finish();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(done).toBe(false);
    finish();
    await flushed;
    expect(persisted).toEqual([{ name: 'Alex' }, { step: 2 }]);
    expect(queue.hasPending()).toBe(false);
  });

  it('retains failed fields, prefers latest edits and supports retry', async () => {
    const calls: object[] = [], states: string[] = [];
    let fail!: (reason: Error) => void;
    const queue = createAutosave<{ name: string; degree: string }>(async updates => {
      calls.push(updates);
      if (calls.length === 1) await new Promise<void>((_, reject) => { fail = reject; });
    }, state => states.push(state));
    queue.update({ name: 'Old', degree: 'BSc' });
    queue.update({ name: 'Latest' });
    fail(new Error('Offline'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(states.at(-1)).toBe('error');
    queue.retry();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calls[1]).toEqual({ name: 'Latest', degree: 'BSc' });
    expect(states.at(-1)).toBe('saved');
  });
});
