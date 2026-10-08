/**
 * Speichert ein JSON-serialisierbares Objekt in localStorage, versioniert.
 * Run-Zustand und Meta-Zustand nutzen je eine eigene Instanz mit eigenem Key.
 */
export interface SaveFile<T> {
  version: number;
  savedAt: number;
  data: T;
}

export class SaveManager<T> {
  constructor(
    private readonly key: string,
    readonly version: number,
    private readonly explicitStorage?: Storage,
  ) {}

  /** Browser-Speicher; kann in eingebetteten Seiten blockiert sein (dann undefined). */
  private get storage(): Storage | undefined {
    if (this.explicitStorage) return this.explicitStorage;
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  }

  save(data: T): void {
    const file: SaveFile<T> = { version: this.version, savedAt: Date.now(), data };
    try {
      this.storage?.setItem(this.key, JSON.stringify(file));
    } catch (err) {
      console.warn('Speichern fehlgeschlagen', err);
    }
  }

  load(): T | undefined {
    return this.loadFile()?.data;
  }

  /** Gespeicherte Datei inkl. Zeitstempel (für den Abgleich mit dem Cloud-Stand). */
  loadFile(): SaveFile<T> | undefined {
    try {
      const raw = this.storage?.getItem(this.key);
      if (!raw) return undefined;
      const file = JSON.parse(raw) as Partial<SaveFile<T>>;
      if (file.version !== this.version || file.data === undefined) return undefined;
      return { version: file.version, savedAt: file.savedAt ?? 0, data: file.data };
    } catch (err) {
      console.warn('Laden fehlgeschlagen', err);
      return undefined;
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      /* ignorieren */
    }
  }
}
