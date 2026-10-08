/**
 * Cloud-Speicherstand, wenn das Spiel als claude.ai-Artefakt läuft: der
 * Datenspeicher der Seite, im privaten Bereich jeder Person
 * (`data/users/<id>/<key>`). Lokal (npm run dev) gibt es ihn nicht; dann
 * bleibt nur der Browser-Speicher.
 *
 * Regeln des Speichers: höchstens 256 KiB pro Dokument, eine Schreiboperation
 * gleichzeitig pro Dokument, nur bei echten Änderungen schreiben.
 */
import type { SaveFile } from './SaveManager';

interface DocRef {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>): Promise<void>;
}
interface Db {
  doc(path: string): DocRef;
}
interface UserCap {
  id(): Promise<string | null>;
}
interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);
}

interface Slot {
  /** Vergleichswert des zuletzt geschriebenen Stands (ohne flüchtige Felder). */
  lastCompare: string;
  writing: Promise<void> | undefined;
  pending: { payload: string; compare: string; version: number } | undefined;
}

export class CloudSave {
  private readonly slots = new Map<string, Slot>();
  /** Nach einer endgültigen Ablehnung (z.B. nur Leserechte) nicht mehr versuchen. */
  private disabled = false;

  private constructor(
    private readonly db: Db,
    private readonly uid: string,
  ) {}

  /** Verbindet sich mit dem Datenspeicher; undefined außerhalb von claude.ai oder ohne Anmeldung. */
  static async connect(timeoutMs = 4000): Promise<CloudSave | undefined> {
    const runtime = (window as unknown as { claude?: ClaudeRuntime }).claude;
    if (!runtime?.use) return undefined;
    try {
      const [db, user] = await withTimeout(
        Promise.all([runtime.use('db') as Promise<Db | null>, runtime.use('user') as Promise<UserCap | null>]),
        timeoutMs,
      ) ?? [null, null];
      if (!db || !user) return undefined;
      const uid = await withTimeout(user.id(), timeoutMs);
      if (!uid) return undefined;
      return new CloudSave(db, uid);
    } catch (err) {
      console.warn('Cloud-Speicher nicht verfügbar', err);
      return undefined;
    }
  }

  private ref(key: string): DocRef {
    return this.db.doc(`data/users/${this.uid}/${key}`);
  }

  private slot(key: string): Slot {
    let slot = this.slots.get(key);
    if (!slot) {
      slot = { lastCompare: '', writing: undefined, pending: undefined };
      this.slots.set(key, slot);
    }
    return slot;
  }

  async load<T>(key: string, version: number): Promise<SaveFile<T> | undefined> {
    try {
      const snap = await withTimeout(this.ref(key).get(), 4000);
      if (!snap?.exists) return undefined;
      const body = snap.data() as { version?: number; savedAt?: number; payload?: string } | undefined;
      if (!body || body.version !== version || typeof body.payload !== 'string') return undefined;
      return { version, savedAt: body.savedAt ?? 0, data: JSON.parse(body.payload) as T };
    } catch (err) {
      console.warn('Cloud-Laden fehlgeschlagen', err);
      return undefined;
    }
  }

  /**
   * Speichert, wenn sich der Stand geändert hat. `volatile` entfernt Felder,
   * die sich ständig ändern (z.B. Zeitstempel), aus dem Vergleich; mit
   * `force` wird trotzdem geschrieben (z.B. beim Verlassen der Seite).
   */
  save<T>(key: string, version: number, data: T, options: { volatile?: (data: T) => unknown; force?: boolean } = {}): void {
    if (this.disabled) return;
    const payload = JSON.stringify(data);
    const compare = options.volatile ? JSON.stringify(options.volatile(data)) : payload;
    const slot = this.slot(key);
    if (!options.force && compare === slot.lastCompare) return;
    slot.pending = { payload, compare, version };
    if (!slot.writing) slot.writing = this.flush(key, slot);
  }

  /** Schreibt nacheinander, immer nur den neuesten wartenden Stand. */
  private async flush(key: string, slot: Slot): Promise<void> {
    while (slot.pending && !this.disabled) {
      const { payload, compare, version } = slot.pending;
      slot.pending = undefined;
      try {
        await this.ref(key).set({ version, savedAt: Date.now(), payload });
        slot.lastCompare = compare;
      } catch (err) {
        const code = (err as { code?: string }).code;
        console.warn('Cloud-Speichern fehlgeschlagen', err);
        if (code && code !== 'unavailable' && code !== 'resource_exhausted') this.disabled = true;
      }
    }
    slot.writing = undefined;
  }
}

/** Nimmt den neueren von zwei Ständen. */
export function newer<T>(a: SaveFile<T> | undefined, b: SaveFile<T> | undefined): SaveFile<T> | undefined {
  if (!a) return b;
  if (!b) return a;
  return b.savedAt > a.savedAt ? b : a;
}
