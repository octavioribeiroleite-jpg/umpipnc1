import { useCallback, useEffect, useRef, useState } from 'react';

/** Keeps the draft separate from the last confirmed server value. Saves are serialized. */
export function usePersistedTextDraft({ initialValue, persist, onSaved, enabled = true, delay = 1500 }: {
  initialValue: string;
  persist: (value: string) => Promise<void>;
  onSaved?: (value: string) => void;
  enabled?: boolean;
  delay?: number;
}) {
  const [value, setDraft] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const draft = useRef(initialValue);
  const saved = useRef(initialValue);
  const mounted = useRef(true);
  const pending = useRef<Promise<boolean> | null>(null);
  const options = useRef({ persist, onSaved, enabled });
  options.current = { persist, onSaved, enabled };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // A refresh may update a pristine editor, but must not replace a local draft.
    if (draft.current === saved.current) {
      draft.current = initialValue;
      setDraft(initialValue);
    }
    saved.current = initialValue;
    setSavedValue(initialValue);
  }, [initialValue]);

  const setValue = useCallback((next: string) => {
    draft.current = next;
    setDraft(next);
    setError('');
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!options.current.enabled || !mounted.current) return false;
    if (pending.current) return pending.current;
    if (draft.current === saved.current) return true;
    setSaving(true);
    setError('');
    const operation = (async () => {
      try {
        // A change made while saving becomes the next request, never an older overwrite.
        while (mounted.current && options.current.enabled && draft.current !== saved.current) {
          const snapshot = draft.current;
          await options.current.persist(snapshot);
          if (!mounted.current) return false;
          saved.current = snapshot;
          setSavedValue(snapshot);
          setLastSaved(new Date());
          options.current.onSaved?.(snapshot);
        }
        return mounted.current && draft.current === saved.current;
      } catch {
        if (mounted.current) setError('Não foi possível salvar. Seu texto foi preservado; tente salvar novamente.');
        return false;
      } finally {
        pending.current = null;
        if (mounted.current) setSaving(false);
      }
    })();
    pending.current = operation;
    return operation;
  }, []);

  const dirty = value !== savedValue;
  useEffect(() => {
    if (!enabled || !dirty || saving || error) return;
    const timer = window.setTimeout(() => { void save(); }, delay);
    return () => window.clearTimeout(timer);
  }, [value, dirty, saving, error, enabled, delay, save]);

  return { value, setValue, savedValue, dirty, saving, error, lastSaved, save };
}
