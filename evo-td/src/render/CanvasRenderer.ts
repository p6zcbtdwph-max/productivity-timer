/**
 * Zeichnet den Spielzustand auf ein Canvas. Platzhalter-Grafik: Türme und
 * Gegner sind farbige Blöcke. Der Renderer liest nur, er verändert nichts.
 */
import { BALANCE } from '../config/balance';
import { getEnemyDef } from '../data/enemies';
import type { MapDef } from '../data/map';
import { cellKey } from '../data/map';
import { getTowerDef } from '../data/towers';
import type { Game } from '../game/Game';

export interface RenderOptions {
  hoveredSlot: number | undefined;
  selectedTowerId: number | undefined;
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
  range: 'rgba(255,255,255,0.12)',
  lock: '#ffd54f',
} as const;

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cell = BALANCE.map.cellSize;

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
      const def = getTowerDef(selected.defId);
      ctx.beginPath();
      ctx.arc(selected.x * cell, selected.y * cell, def.stats.range * cell, 0, Math.PI * 2);
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
    }

    for (const enemy of state.enemies) {
      const def = getEnemyDef(enemy.defId);
      const size = cell * def.size;
      const x = enemy.x * cell - size / 2;
      const y = enemy.y * cell - size / 2;
      ctx.fillStyle = def.color;
      ctx.fillRect(x, y, size, size);
      const slowed = enemy.statuses.some((s) => s.kind === 'slow');
      const poisoned = enemy.statuses.some((s) => s.kind === 'poison');
      if (slowed || poisoned) {
        ctx.strokeStyle = slowed ? '#c58cff' : '#8bc34a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);
      }
      const hpW = size;
      ctx.fillStyle = COLORS.hpBack;
      ctx.fillRect(x, y - 6, hpW, 3);
      ctx.fillStyle = COLORS.hpFront;
      ctx.fillRect(x, y - 6, hpW * Math.max(0, enemy.hp / enemy.maxHp), 3);
    }

    for (const projectile of state.projectiles) {
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.arc(projectile.x * cell, projectile.y * cell, 3, 0, Math.PI * 2);
      ctx.fill();
    }
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
        ctx.fillStyle = game.canBuildAt(index) ? COLORS.slotHoverOk : COLORS.slotHoverBad;
      } else {
        ctx.fillStyle = COLORS.slot;
      }
      ctx.fillRect(slot.x * cell + 4, slot.y * cell + 4, cell - 8, cell - 8);
    });
  }
}
