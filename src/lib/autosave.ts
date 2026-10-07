// Send the first edit immediately, then merge edits made during that request.
// One request at a time keeps older values from overwriting newer ones.
export function createAutosave<T extends object>(
  persist: (updates: Partial<T>) => Promise<void>,
  status: (value: 'saving' | 'saved' | 'error') => void,
) {
  let pending: Partial<T> = {};
  let saving = false;
  let running: Promise<void> | undefined;
  function flush(): Promise<void> {
    if (!running) running = drain().finally(() => { running = undefined; });
    return running;
  }
  async function drain() {
    if (saving || !Object.keys(pending).length) return;
    saving = true;
    status('saving');
    while (Object.keys(pending).length) {
      const updates = pending;
      pending = {};
      try {
        await persist(updates);
      } catch {
        pending = { ...updates, ...pending };
        saving = false;
        status('error');
        return;
      }
    }
    saving = false;
    status('saved');
  }
  return {
    update(updates: Partial<T>) {
      pending = { ...pending, ...updates };
      void flush();
    },
    flush,
    retry() { void flush(); },
    hasPending() { return saving || Object.keys(pending).length > 0; },
  };
}
