/**
 * Zeichnet den Spielzustand auf ein Canvas. Platzhalter-Grafik: Türme und
 * Gegner sind farbige Blöcke. Der Renderer liest nur, er verändert nichts.
 */
import { BALANCE } from '../config/balance';
import { getElementDef } from '../data/elements';
import { getEnemyDef } from '../data/enemies';
import type { MapDef } from '../data/map';
import { cellKey } from '../data/map';
import { getTowerDef } from '../data/towers';
import { statsFor } from '../game/systems/StatsSystem';
import type { Game } from '../game/Game';

export interface RenderOptions {
  hoveredSlot: number | undefined;
  selectedTowerId: number | undefined;
  /** Türme, die als Ziel einer Aktion (Fusion) hervorgehoben werden. */
  highlightTowerIds?: readonly number[];
  /** Freie Plätze hervorheben (Verlegen). */
  highlightFreeSlots?: boolean;
}

const COLORS = {
  background: '#101418',
  grid: '#1b2129',
  path: '#2c3540',
  pathEdge: '#3b4654',
  slot: 'rgba(255,255,255,0.05)',
  slotHoverOk: 'rgba(120,255,160,0.35)',
  slotHoverBad: 'rgba(255,100,100,0.35)',
  hpBack: '#333',
  hpFront: '#66ff66',
  shield: '#40c4ff',
  range: 'rgba(255,255,255,0.12)',
  lock: '#ffd54f',
} as const;

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
  ttl: number;
}

const MAX_FLOATERS = 40;

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cell = BALANCE.map.cellSize;
  private floaters: FloatingText[] = [];
  /** Unterdrückt neue schwebende Texte (z.B. während der Winterruhe). */
  muted = false;

  /** Schwebender Text in Zellenkoordinaten (rein optisch, kein Spielzustand). */
  float(x: number, y: number, text: string, color: string, ttl = 1.2): void {
    if (this.muted) return;
    this.floaters.push({ x, y, text, color, born: performance.now(), ttl: ttl * 1000 });
    if (this.floaters.length > MAX_FLOATERS) this.floaters.shift();
  }

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly map: MapDef,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D nicht verfügbar');
    this.ctx = ctx;
    canvas.width = map.cols * this.cell;
    canvas.height = map.rows * this.cell;
  }

  /** Pixel -> Bauplatz-Index (oder undefined). */
  slotAt(px: number, py: number): number | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const cx = Math.floor(((px - rect.left) * scaleX) / this.cell);
    const cy = Math.floor(((py - rect.top) * scaleY) / this.cell);
    const index = this.map.buildSlots.findIndex((s) => s.x === cx && s.y === cy);
    return index >= 0 ? index : undefined;
  }

  render(game: Game, options: RenderOptions): void {
    const { ctx, cell } = this;
    const { state } = game;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
    this.drawPath();
    this.drawSlots(game, options);

    const selected = state.towers.find((t) => t.id === options.selectedTowerId);
    if (selected) {
      ctx.beginPath();
      ctx.arc(selected.x * cell, selected.y * cell, statsFor(game.ctx, selected).range * cell, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.range;
      ctx.fill();
    }

    for (const tower of state.towers) {
      const def = getTowerDef(tower.defId);
      const size = cell * 0.7;
      const x = tower.x * cell - size / 2;
      const y = tower.y * cell - size / 2;
      ctx.fillStyle = def.color;
      ctx.fillRect(x, y, size, size);
      if (tower.id === options.selectedTowerId) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);
      }
      // Tier als kleine Punkte oben, Level als Zahl unten
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      for (let i = 0; i < def.tier; i++) ctx.fillRect(x + 3 + i * 5, y + 3, 3, 3);
      ctx.fillStyle = '#000';
      ctx.font = `bold ${Math.round(cell * 0.3)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(tower.level), tower.x * cell, y + size - 4);
      if (tower.evolutionLocked) {
        ctx.fillStyle = COLORS.lock;
        ctx.fillRect(x + size - 8, y + 2, 6, 6);
      }
      if (tower.prestige > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(cell * 0.22)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`★${tower.prestige}`, tower.x * cell, y - 3);
      }
      if (tower.id === options.highlightTowerIds?.find((id) => id === tower.id)) {
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x - 3, y - 3, size + 6, size + 6);
        ctx.setLineDash([]);
      }
    }

    for (const enemy of state.enemies) {
      const def = getEnemyDef(enemy.defId);
      const size = cell * def.size;
      const x = enemy.x * cell - size / 2;
      const y = enemy.y * cell - size / 2;
      ctx.fillStyle = def.color;
      ctx.fillRect(x, y, size, size);
      // Element: farbiger Rahmen + Raute oben rechts
      if (enemy.element) {
        const element = getElementDef(enemy.element);
        ctx.strokeStyle = element.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);
        ctx.fillStyle = element.color;
        ctx.beginPath();
        ctx.moveTo(x + size, y - 4);
        ctx.lineTo(x + size + 4, y);
        ctx.lineTo(x + size, y + 4);
        ctx.lineTo(x + size - 4, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.round(size * 0.6)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element.name.charAt(0), enemy.x * cell, enemy.y * cell + 1);
        ctx.textBaseline = 'alphabetic';
      }
      // Statuseffekte als kleine Punkte links unten
      let dot = 0;
      for (const status of enemy.statuses) {
        ctx.fillStyle = status.kind === 'slow' ? '#c58cff' : status.kind === 'poison' ? '#8bc34a' : '#80deea';
        ctx.fillRect(x + 2 + dot * 5, y + size - 5, 3, 3);
        dot++;
      }
      // Lebensbalken, darüber ggf. Schildbalken
      ctx.fillStyle = COLORS.hpBack;
      ctx.fillRect(x, y - 6, size, 3);
      ctx.fillStyle = COLORS.hpFront;
      ctx.fillRect(x, y - 6, size * Math.max(0, enemy.hp / enemy.maxHp), 3);
      if (enemy.shieldMax > 0) {
        ctx.fillStyle = COLORS.hpBack;
        ctx.fillRect(x, y - 10, size, 3);
        ctx.fillStyle = COLORS.shield;
        ctx.fillRect(x, y - 10, size * Math.max(0, enemy.shield / enemy.shieldMax), 3);
      }
      if (enemy.extraLives > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(cell * 0.25)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('×2', enemy.x * cell, y + size + 10);
      }
    }

    this.drawFloaters();

    for (const projectile of state.projectiles) {
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.arc(projectile.x * cell, projectile.y * cell, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFloaters(): void {
    const { ctx, cell } = this;
    const now = performance.now();
    this.floaters = this.floaters.filter((f) => now - f.born < f.ttl);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.round(cell * 0.32)}px system-ui, sans-serif`;
    for (const f of this.floaters) {
      const t = (now - f.born) / f.ttl;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#000';
      ctx.fillText(f.text, f.x * cell + 1, (f.y - t * 0.8) * cell + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x * cell, (f.y - t * 0.8) * cell);
    }
    ctx.globalAlpha = 1;
  }

  private drawGrid(): void {
    const { ctx, cell, map } = this;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= map.cols; x++) {
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, map.rows * cell);
    }
    for (let y = 0; y <= map.rows; y++) {
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(map.cols * cell, y * cell + 0.5);
    }
    ctx.stroke();
  }

  private drawPath(): void {
    const { ctx, cell, map } = this;
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        if (!map.pathCells.has(cellKey(x, y))) continue;
        ctx.fillStyle = COLORS.path;
        ctx.fillRect(x * cell, y * cell, cell, cell);
        ctx.strokeStyle = COLORS.pathEdge;
        ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
      }
    }
    const start = map.waypoints[0];
    const end = map.waypoints[map.waypoints.length - 1];
    if (start && end) {
      ctx.fillStyle = '#ff5252';
      ctx.fillRect(start.x * cell - 6, start.y * cell - 6, 12, 12);
      ctx.fillStyle = '#9be7a0';
      ctx.fillRect(end.x * cell - 6, end.y * cell - 6, 12, 12);
    }
  }

  private drawSlots(game: Game, options: RenderOptions): void {
    const { ctx, cell, map } = this;
    map.buildSlots.forEach((slot, index) => {
      const occupied = game.state.towers.some((t) => t.slot === index);
      if (occupied) return;
      if (index === options.hoveredSlot) {
        const ok = options.highlightFreeSlots ? game.canRelocateTo(index) : game.canBuildAt(index);
        ctx.fillStyle = ok ? COLORS.slotHoverOk : COLORS.slotHoverBad;
      } else if (options.highlightFreeSlots) {
        ctx.fillStyle = 'rgba(255,213,79,0.18)';
      } else {
        ctx.fillStyle = COLORS.slot;
      }
      ctx.fillRect(slot.x * cell + 4, slot.y * cell + 4, cell - 8, cell - 8);
    });
  }
}
