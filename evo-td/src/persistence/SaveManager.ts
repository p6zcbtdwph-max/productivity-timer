/**
 * Speichert ein JSON-serialisierbares Objekt in localStorage, versioniert.
 * Run-Zustand und Meta-Zustand nutzen je eine eigene Instanz mit eigenem Key.
 */
interface SaveFile<T> {
  version: number;
  savedAt: number;
  data: T;
}

export class SaveManager<T> {
  constructor(
    private readonly key: string,
    private readonly version: number,
    private readonly storage: Storage = localStorage,
  ) {}

  save(data: T): void {
    const file: SaveFile<T> = { version: this.version, savedAt: Date.now(), data };
    try {
      this.storage.setItem(this.key, JSON.stringify(file));
    } catch (err) {
      console.warn('Speichern fehlgeschlagen', err);
    }
  }

  load(): T | undefined {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return undefined;
      const file = JSON.parse(raw) as Partial<SaveFile<T>>;
      if (file.version !== this.version || file.data === undefined) return undefined;
      return file.data;
    } catch (err) {
      console.warn('Laden fehlgeschlagen', err);
      return undefined;
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch {
      /* ignorieren */
    }
  }
}
