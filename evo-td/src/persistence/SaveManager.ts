/**
 * Speichert den GameState in localStorage. Der Zustand ist reines JSON,
 * deshalb reicht JSON.stringify. `version` erlaubt spätere Migrationen.
 */
import { BALANCE } from '../config/balance';
import type { GameState } from '../game/GameState';

const SAVE_VERSION = 3;

interface SaveFile {
  version: number;
  savedAt: number;
  state: GameState;
}

export class SaveManager {
  constructor(private readonly storage: Storage = localStorage) {}

  save(state: GameState): void {
    const file: SaveFile = { version: SAVE_VERSION, savedAt: Date.now(), state };
    try {
      this.storage.setItem(BALANCE.persistence.storageKey, JSON.stringify(file));
    } catch (err) {
      console.warn('Speichern fehlgeschlagen', err);
    }
  }

  load(): GameState | undefined {
    try {
      const raw = this.storage.getItem(BALANCE.persistence.storageKey);
      if (!raw) return undefined;
      const file = JSON.parse(raw) as Partial<SaveFile>;
      if (file.version !== SAVE_VERSION || !file.state) return undefined;
      return file.state;
    } catch (err) {
      console.warn('Laden fehlgeschlagen', err);
      return undefined;
    }
  }

  clear(): void {
    try {
      this.storage.removeItem(BALANCE.persistence.storageKey);
    } catch {
      /* ignorieren */
    }
  }
}
